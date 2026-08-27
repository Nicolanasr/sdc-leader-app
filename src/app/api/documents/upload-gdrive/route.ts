import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

async function getOrCreateSubfolder(drive: any, parentId: string, folderName: string): Promise<string> {
  const sanitized = folderName.replace(/['\\]/g, '')
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
    console.warn(`Subfolder creation notice for "${sanitized}":`, err)
    return parentId
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const groupName = (formData.get('groupName') as string) || 'Scout Group'
    const troopName = (formData.get('troopName') as string) || 'Group Wide Events'
    const eventTitle = (formData.get('eventTitle') as string) || (formData.get('folderName') as string) || 'General Documents'

    if (!file) {
      return NextResponse.json({ error: 'No file selected. Please choose a file to upload.' }, { status: 400 })
    }

    const clientId = process.env.GDRIVE_CLIENT_ID
    const clientSecret = process.env.GDRIVE_CLIENT_SECRET
    const refreshToken = process.env.GDRIVE_REFRESH_TOKEN
    const rootFolderId = process.env.GDRIVE_FOLDER_ID || '1ZDlCSNCqNsszLEl4KEYTkDs8maM0s93R'

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        { error: 'Google Drive OAuth credentials are missing.' },
        { status: 500 }
      )
    }

    // Authenticate with Google Drive API via OAuth 2.0 (User Context)
    const auth = new google.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: refreshToken })

    const drive = google.drive({ version: 'v3', auth })

    // Nested folder structure: Root -> Group Name -> Troop Name -> Event Title
    const groupFolderId = await getOrCreateSubfolder(drive, rootFolderId, groupName)
    const troopFolderId = await getOrCreateSubfolder(drive, groupFolderId, troopName)
    const targetFolderId = await getOrCreateSubfolder(drive, troopFolderId, eventTitle)

    // Convert Web File stream to Readable Stream for googleapis
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const stream = new Readable()
    stream.push(buffer)
    stream.push(null)

    // Upload file to Google Drive folder
    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    })

    const fileId = response.data.id

    if (fileId) {
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        })
      } catch (permErr: any) {
        console.warn('Google Drive permission warning:', permErr?.message || permErr)
      }

      const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

      return NextResponse.json({
        success: true,
        storage: 'gdrive',
        fileId: fileId,
        fileName: response.data.name,
        webViewLink: webViewLink,
        webContentLink: response.data.webContentLink,
      })
    } else {
      return NextResponse.json({ error: 'Failed to upload file to Google Drive' }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Document Upload API Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to upload document' },
      { status: 500 }
    )
  }
}
