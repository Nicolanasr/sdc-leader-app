import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { google } from 'googleapis'
import { Readable } from 'stream'

async function getOrCreateSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
  const sanitized = folderName.replace(/['\\]/g, '').trim()
  const query = `'${parentId}' in parents and name = '${sanitized}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  try {
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
    })
    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
      return res.data.files[0].id
    }

    const createRes = await drive.files.create({
      requestBody: {
        name: sanitized,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    })
    return createRes.data.id || parentId
  } catch (err) {
    console.warn(`[GoogleDrive Progression] Subfolder creation notice for "${sanitized}":`, err)
    return parentId
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentRole = user.app_metadata?.role
    const groupId = user.app_metadata?.group_id
    const userTroopId = user.app_metadata?.troop_id

    const formData = await req.formData()
    const memberId = (formData.get('memberId') as string)?.trim()
    const requirementId = (formData.get('requirementId') as string)?.trim()
    const notes = (formData.get('notes') as string)?.trim() || null
    const groupName = (formData.get('groupName') as string)?.trim() || 'Scout Group'
    const scoutName = (formData.get('scoutName') as string)?.trim() || 'Scout'
    const file = formData.get('file') as File | null

    if (!memberId || !requirementId) {
      return NextResponse.json(
        { error: 'Member ID and Requirement ID are required.' },
        { status: 400 }
      )
    }

    const adminDb = createAdminClient()

    // Verify member permissions
    const { data: memberData, error: memErr } = await adminDb
      .from('members')
      .select('id, group_id, troop_id, first_name, last_name')
      .eq('id', memberId)
      .single()

    if (memErr || !memberData || (currentRole !== 'configurator' && memberData.group_id !== groupId)) {
      return NextResponse.json({ error: 'Member not found or access denied.' }, { status: 404 })
    }

    if (currentRole === 'chef_troupe' && userTroopId && memberData.troop_id !== userTroopId) {
      return NextResponse.json({ error: 'Access restricted to your troop members.' }, { status: 403 })
    }

    let evidenceFileUrl: string | null = null
    let evidenceDriveFileId: string | null = null

    // Upload file to Google Drive if provided
    if (file && file.size > 0) {
      const clientId = process.env.GDRIVE_CLIENT_ID
      const clientSecret = process.env.GDRIVE_CLIENT_SECRET
      const refreshToken = process.env.GDRIVE_REFRESH_TOKEN
      const rootFolderId = process.env.GDRIVE_FOLDER_ID || '1ZDlCSNCqNsszLEl4KEYTkDs8maM0s93R'

      if (clientId && clientSecret && refreshToken) {
        const auth = new google.auth.OAuth2(clientId, clientSecret)
        auth.setCredentials({ refresh_token: refreshToken })
        const drive = google.drive({ version: 'v3', auth })

        const groupFolderId = await getOrCreateSubfolder(drive, rootFolderId, groupName)
        const progressionFolderId = await getOrCreateSubfolder(drive, groupFolderId, 'Progression Evidence')
        const scoutFolderId = await getOrCreateSubfolder(drive, progressionFolderId, scoutName)

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)

        const response = await drive.files.create({
          requestBody: {
            name: `${Date.now()}_${file.name}`,
            parents: [scoutFolderId],
          },
          media: {
            mimeType: file.type || 'application/octet-stream',
            body: stream,
          },
          fields: 'id, name, webViewLink, webContentLink',
        })

        evidenceDriveFileId = response.data.id || null
        evidenceFileUrl = response.data.webViewLink || response.data.webContentLink || null

        if (evidenceDriveFileId) {
          try {
            await drive.permissions.create({
              fileId: evidenceDriveFileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            })
          } catch (permErr: any) {
            console.warn('[GoogleDrive Progression] Permission warning:', permErr?.message)
          }
        }
      }
    }

    // Upsert record with evidence and notes
    const updatePayload: any = {
      member_id: memberId,
      requirement_id: requirementId,
      notes: notes,
      completed_at: new Date().toISOString(),
      validated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (evidenceFileUrl) {
      updatePayload.evidence_file_url = evidenceFileUrl
      updatePayload.evidence_drive_file_id = evidenceDriveFileId
    }

    const { data: record, error: recordErr } = await adminDb
      .from('member_progression_records')
      .upsert(updatePayload, { onConflict: 'member_id,requirement_id' })
      .select(`
        id,
        member_id,
        requirement_id,
        completed_at,
        validated_by,
        notes,
        evidence_file_url,
        evidence_drive_file_id,
        profiles:validated_by (full_name)
      `)
      .single()

    if (recordErr) {
      return NextResponse.json({ error: recordErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, record })
  } catch (err: any) {
    console.error('[Progression Evidence API Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
