/**
 * Mengenali jenis link evidence CMSP-02 untuk keperluan preview.
 * - YouTube & file Google Drive → dapat ditampilkan sebagai embed.
 * - Folder Google Drive & website lain → dibuka di tab baru.
 */
export type EvidenceLinkKind = 'YOUTUBE' | 'DRIVE_FILE' | 'DRIVE_FOLDER' | 'OTHER'

export type EvidenceLinkInfo = {
  kind: EvidenceLinkKind
  /** URL embed (hanya untuk YOUTUBE dan DRIVE_FILE). */
  embedUrl: string
  /** URL asli yang aman dibuka (http/https). */
  url: string
}

const ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/

function safeId(value: string | null | undefined): string {
  return value && ID_PATTERN.test(value) ? value : ''
}

function getYoutubeId(url: URL): string {
  const host = url.hostname.replace(/^www\.|^m\./, '')

  if (host === 'youtu.be') {
    return safeId(url.pathname.split('/')[1])
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') return safeId(url.searchParams.get('v'))

    const [, section, id] = url.pathname.split('/')
    if (section && ['embed', 'shorts', 'live', 'v'].includes(section)) return safeId(id)
  }

  return ''
}

function getDriveInfo(url: URL): { kind: 'DRIVE_FILE' | 'DRIVE_FOLDER', id: string } | null {
  if (url.hostname !== 'drive.google.com' && url.hostname !== 'docs.google.com') return null

  const parts = url.pathname.split('/').filter(Boolean)

  // drive.google.com/drive/folders/<id> (juga /drive/u/0/folders/<id>)
  const folderIndex = parts.indexOf('folders')
  if (folderIndex >= 0) {
    const id = safeId(parts[folderIndex + 1])
    return id ? { kind: 'DRIVE_FOLDER', id } : null
  }

  // drive.google.com/file/d/<id>/view
  const dIndex = parts.indexOf('d')
  if (parts[0] === 'file' && dIndex >= 0) {
    const id = safeId(parts[dIndex + 1])
    return id ? { kind: 'DRIVE_FILE', id } : null
  }

  // drive.google.com/open?id=<id>
  if (parts[0] === 'open') {
    const id = safeId(url.searchParams.get('id'))
    return id ? { kind: 'DRIVE_FILE', id } : null
  }

  return null
}

/** Mengembalikan null jika bukan URL http/https yang valid. */
export function parseEvidenceLink(value: string): EvidenceLinkInfo | null {
  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const youtubeId = getYoutubeId(url)
  if (youtubeId) {
    return {
      kind: 'YOUTUBE',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      url: url.href,
    }
  }

  const drive = getDriveInfo(url)
  if (drive?.kind === 'DRIVE_FILE') {
    return {
      kind: 'DRIVE_FILE',
      embedUrl: `https://drive.google.com/file/d/${drive.id}/preview`,
      url: url.href,
    }
  }

  return {
    kind: drive ? 'DRIVE_FOLDER' : 'OTHER',
    embedUrl: '',
    url: url.href,
  }
}
