import { getSheetValues } from '../../utils/google-sheets'

export default defineEventHandler(async () => {
  const values = await getSheetValues('persons')

  return {
    success: true,
    sheet: 'persons',
    rows: values,
  }
})