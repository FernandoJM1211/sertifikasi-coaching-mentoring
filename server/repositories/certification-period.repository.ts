
import {
  getSheetValues,
  appendSheetRowsWithIds,
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

function rowToCertificationPeriod(
  row: string[],
): CertificationPeriod {
  return {
    period_id: row[0] ?? "",
    certification_type_id: row[1] ?? "",
    category_id: row[2] ?? "",
    period_name: row[3] ?? "",
    period_status: row[4] ?? "",
    created_by: row[5] ?? "",
    created_at: row[6] ?? "",
    updated_at: row[7] ?? "",
  };
}

export async function findCertificationPeriodById(
  periodId: string,
): Promise<CertificationPeriod | null> {
  const normalizedId = periodId.trim().toUpperCase();
  if (!normalizedId) return null;

  const rows = await getSheetValues(SHEET_NAME);

  if (!rows || rows.length <= 1) {
    return null;
  }

  const foundRow = rows
    .slice(1)
    .find(
      (row) =>
        (row[0] ?? "").trim().toUpperCase() === normalizedId,
    );

  return foundRow
    ? rowToCertificationPeriod(foundRow)
    : null;
}

export async function findAllCertificationPeriods(): Promise<
  CertificationPeriod[]
> {
  const rows = await getSheetValues(SHEET_NAME);

  if (!rows || rows.length <= 1) {
    return [];
  }

  return rows
    .slice(1)
    .filter((row) => (row[0] ?? "").trim() !== "")
    .map(rowToCertificationPeriod);
}

export async function createCertificationPeriod(
  data: Omit<
    CertificationPeriod,
    "period_id" | "created_at" | "updated_at"
  >,
): Promise<CertificationPeriod> {
  const now = new Date().toISOString();

  const period: CertificationPeriod = {
    period_id: '', // ditetapkan saat baris ditulis
    certification_type_id: data.certification_type_id,
    category_id: data.category_id,
    period_name: data.period_name,
    period_status: data.period_status,
    created_by: data.created_by,
    created_at: now,
    updated_at: now,
  };

  const [created] = await appendSheetRowsWithIds(
    SHEET_NAME,
    'PER',
    1,
    (id) => ({ ...period, period_id: id }),
    (period) => [
      period.period_id,
      period.certification_type_id,
      period.category_id,
      period.period_name,
      period.period_status,
      period.created_by,
      period.created_at,
      period.updated_at,
    ],
  );

  return created!;
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

  const normalizedId = periodId.trim().toUpperCase();

  const rowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      (row[0] ?? "").trim().toUpperCase() === normalizedId,
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
    period_id: existing[0] ?? "",
    certification_type_id: data.certification_type_id,
    category_id: data.category_id,
    period_name: data.period_name,
    period_status: data.period_status,
    created_by: existing[5] ?? "",
    created_at: existing[6] ?? "",
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
