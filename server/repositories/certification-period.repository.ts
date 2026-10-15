import {
  getSheetValues,
  appendSheetValues,
  updateSheetRow,
} from "../utils/google-sheets";

const SHEET_NAME = "certification_periods";

export interface CertificationPeriod {
  period_id: string;
  certification_type_id: string;
  category_id: string;
  period_name: string;
  period_status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function generatePeriodId(rows: string[][]): string {
  let maxNumber = 0;

  for (const row of rows) {
    const periodId = row[0];

    if (!periodId) continue;

    const match = periodId.match(/^PER-(\d+)$/);

    if (match) {
      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }

  return `PER-${String(maxNumber + 1).padStart(6, "0")}`;
}

export async function findCertificationPeriodById(
  periodId: string,
): Promise<CertificationPeriod | null> {
  const rows = await getSheetValues(SHEET_NAME);

  if (!rows || rows.length <= 1) {
    return null;
  }

  for (const row of rows.slice(1)) {
    if (row[0] === periodId) {
      return {
        period_id: row[0] || "",
        certification_type_id: row[1] || "",
        category_id: row[2] || "",
        period_name: row[3] || "",
        period_status: row[4] || "",
        created_by: row[5] || "",
        created_at: row[6] || "",
        updated_at: row[7] || "",
      };
    }
  }

  return null;
}


export async function findAllCertificationPeriods(): Promise<CertificationPeriod[]> {
  const rows = await getSheetValues(SHEET_NAME)

  if (!rows || rows.length <= 1) {
    return []
  }

  return rows.slice(1).map((row) => ({
    period_id: row[0] || '',
    certification_type_id: row[1] || '',
    category_id: row[2] || '',
    period_name: row[3] || '',
    period_status: row[4] || '',
    created_by: row[5] || '',
    created_at: row[6] || '',
    updated_at: row[7] || '',
  }))
}


export async function createCertificationPeriod(
  data: Omit<
    CertificationPeriod,
    "period_id" | "created_at" | "updated_at"
  >,
): Promise<CertificationPeriod> {
  const rows = await getSheetValues(SHEET_NAME);

  const periodId = generatePeriodId(rows);

  const now = new Date().toISOString();

  const period: CertificationPeriod = {
    period_id: periodId,
    certification_type_id: data.certification_type_id,
    category_id: data.category_id,
    period_name: data.period_name,
    period_status: data.period_status,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };

  await appendSheetValues(SHEET_NAME, [

      period.period_id,
      period.certification_type_id,
      period.category_id,
      period.period_name,
      period.period_status,
      period.created_by,
      period.created_at,
      period.updated_at,

  ]);

  return period;
}


export async function updateCertificationPeriod(
  periodId: string,
  data: Omit<
    CertificationPeriod,
    "period_id" | "created_at" | "updated_at"
  >,
): Promise<CertificationPeriod | null> {
  const rows = await getSheetValues(SHEET_NAME);

  if (!rows || rows.length <= 1) {
    return null;
  }

  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && row[0] === periodId,
  );

  if (rowIndex === -1) {
    return null;
  }

  const existing = rows[rowIndex];

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();

  const period: CertificationPeriod = {
    period_id: existing[0] || "",
    certification_type_id: data.certification_type_id,
    category_id: data.category_id,
    period_name: data.period_name,
    period_status: data.period_status,
    created_by: existing[5] || "",
    created_at: existing[6] || "",
    updated_at: now,
  };

  await updateSheetRow(SHEET_NAME, rowIndex + 1, [
    period.period_id,
    period.certification_type_id,
    period.category_id,
    period.period_name,
    period.period_status,
    period.created_by,
    period.created_at,
    period.updated_at,
  ]);

  return period;
}
