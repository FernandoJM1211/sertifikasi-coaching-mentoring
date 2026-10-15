
import {
  getSheetValues,
} from '../utils/google-sheets'

const SHEET_NAME = 'certification_types'

export interface CertificationType {
  certification_type_id: string
  type_name: string
  created_at: string
  updated_at: string
}

export async function findAllCertificationTypes(): Promise<CertificationType[]> {
  const rows = await getSheetValues(SHEET_NAME)

  if (!rows || rows.length <= 1) {
    return []
  }

  return rows.slice(1).map((row) => ({
    certification_type_id: row[0] || '',
    type_name: row[1] || '',
    created_at: row[2] || '',
    updated_at: row[3] || '',
  }))
}
