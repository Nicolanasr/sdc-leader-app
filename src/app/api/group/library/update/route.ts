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
    console.warn(`[GoogleDrive Library] Subfolder creation notice for "${sanitized}":`, err)
    return parentId
  }
}

const CATEGORY_NAMES: Record<string, string> = {
  books_manuals: 'Scout Books & Handbooks',
  training_materials: 'Training & Technical Sheets',
  songs_chansonnier: 'Songbook & Chants',
  ceremonials_prayers: 'Ceremonials & Prayers',
  brand_assets: 'Brand Assets & Insignia',
  maps_blueprints: 'Camp Blueprints & Maps',
  safety_protocols: 'Safety & Medical Protocols',
  admin_archives: 'Administrative Archives',
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

    const allowedRoles = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator']
    if (!allowedRoles.includes(currentRole)) {
      return NextResponse.json(
        { error: 'Forbidden. Edit access is restricted to Group Leaders and Secretary.' },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const itemId = (formData.get('itemId') as string)?.trim()
    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || null
    const category = (formData.get('category') as string)?.trim() || 'books_manuals'
    const branchScope = (formData.get('branchScope') as string)?.trim() || 'all'
    const authorComposer = (formData.get('authorComposer') as string)?.trim() || null
    const lyricsText = (formData.get('lyricsText') as string)?.trim() || null
    const chordsText = (formData.get('chordsText') as string)?.trim() || null
    const youtubeUrl = (formData.get('youtubeUrl') as string)?.trim() || null
    const rawTags = (formData.get('tags') as string)?.trim() || ''
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const groupName = (formData.get('groupName') as string)?.trim() || 'Scout Group'
    const file = formData.get('file') as File | null

    if (!itemId || !title) {
      return NextResponse.json({ error: 'Item ID and title are required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()

    // Fetch current item
    const { data: existingItem, error: fetchErr } = await adminDb
      .from('group_archive_items')
      .select('*')
      .eq('id', itemId)
      .eq('group_id', groupId)
      .single()

    if (fetchErr || !existingItem) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 })
    }

    let mediaType = existingItem.media_type
    let fileUrl = existingItem.file_url
    let driveFileId = existingItem.drive_file_id
    let fileSizeBytes = existingItem.file_size_bytes
    let mimeType = existingItem.mime_type

    // If new file is uploaded to replace existing
    if (file && file.size > 0) {
      const ft = file.type?.toLowerCase() || ''
      const fn = file.name?.toLowerCase() || ''

      if (ft.includes('audio') || fn.endsWith('.mp3') || fn.endsWith('.m4a') || fn.endsWith('.wav')) {
        mediaType = 'audio'
      } else if (ft.includes('image') || fn.endsWith('.png') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.svg')) {
        mediaType = 'image'
      } else if (ft.includes('word') || fn.endsWith('.doc') || fn.endsWith('.docx')) {
        mediaType = 'doc'
      } else {
        mediaType = 'pdf'
      }

      fileSizeBytes = file.size
      mimeType = file.type || 'application/octet-stream'

      const clientId = process.env.GDRIVE_CLIENT_ID
      const clientSecret = process.env.GDRIVE_CLIENT_SECRET
      const refreshToken = process.env.GDRIVE_REFRESH_TOKEN
      const rootFolderId = process.env.GDRIVE_FOLDER_ID || '1ZDlCSNCqNsszLEl4KEYTkDs8maM0s93R'

      if (clientId && clientSecret && refreshToken) {
        const auth = new google.auth.OAuth2(clientId, clientSecret)
        auth.setCredentials({ refresh_token: refreshToken })
        const drive = google.drive({ version: 'v3', auth })

        const groupFolderId = await getOrCreateSubfolder(drive, rootFolderId, groupName)
        const libraryFolderId = await getOrCreateSubfolder(drive, groupFolderId, 'Scout Library & Archive')
        const categoryFolderName = CATEGORY_NAMES[category] || 'General Resources'
        const targetFolderId = await getOrCreateSubfolder(drive, libraryFolderId, categoryFolderName)

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)

        const response = await drive.files.create({
          requestBody: {
            name: file.name,
            parents: [targetFolderId],
          },
          media: {
            mimeType: mimeType,
            body: stream,
          },
          fields: 'id, name, webViewLink, webContentLink',
        })

        driveFileId = response.data.id || null
        fileUrl = response.data.webViewLink || response.data.webContentLink || null

        if (driveFileId) {
          try {
            await drive.permissions.create({
              fileId: driveFileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            })
          } catch (permErr: any) {
            console.warn('[GoogleDrive Library] Permission set warning:', permErr?.message)
          }
        }
      }
    } else if (youtubeUrl) {
      mediaType = 'youtube'
    }

    // Update in Supabase
    let { data: updatedItem, error: updateErr } = await adminDb
      .from('group_archive_items')
      .update({
        title,
        description,
        category,
        branch_scope: branchScope,
        media_type: mediaType,
        file_url: fileUrl,
        drive_file_id: driveFileId,
        youtube_url: youtubeUrl,
        lyrics_text: lyricsText,
        chords_text: chordsText,
        author_composer: authorComposer,
        tags,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('group_id', groupId)
      .select()
      .single()

    if (updateErr && updateErr.message?.includes('branch_scope_check')) {
      const safeTags = Array.from(new Set([...tags, branchScope]))
      const retry = await adminDb
        .from('group_archive_items')
        .update({
          title,
          description,
          category,
          branch_scope: 'all',
          media_type: mediaType,
          file_url: fileUrl,
          drive_file_id: driveFileId,
          youtube_url: youtubeUrl,
          lyrics_text: lyricsText,
          chords_text: chordsText,
          author_composer: authorComposer,
          tags: safeTags,
          file_size_bytes: fileSizeBytes,
          mime_type: mimeType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('group_id', groupId)
        .select()
        .single()

      if (!retry.error) {
        updatedItem = retry.data
        updateErr = null
      }
    }

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: updatedItem })
  } catch (err: any) {
    console.error('[Library Update API] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update item.' }, { status: 500 })
  }
}
