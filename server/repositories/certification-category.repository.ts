
import {
  getSheetValues,
} from '../utils/google-sheets'

const SHEET_NAME = 'certification_categories'

export interface CertificationCategory {
  category_id: string
  certification_type_id: string
  category_name: string
  created_at: string
  updated_at: string
}

export async function findAllCertificationCategories(): Promise<CertificationCategory[]> {
  const rows = await getSheetValues(SHEET_NAME)

  if (!rows || rows.length <= 1) {
    return []
  }

  return rows.slice(1).map((row) => ({
    category_id: row[0] || '',
    certification_type_id: row[1] || '',
    category_name: row[2] || '',
    created_at: row[3] || '',
    updated_at: row[4] || '',
  }))
}
