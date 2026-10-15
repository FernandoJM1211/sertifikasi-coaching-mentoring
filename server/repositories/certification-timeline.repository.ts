import {
  getSheetValues,
  appendSheetValues,
  updateSheetRow,
} from "../utils/google-sheets";

const SHEET_NAME = "certification_timelines";

export interface CertificationTimeline {
  timeline_id: string;
  period_id: string;
  stage_order: string;
  stage_code: string;
  stage_name: string;
  start_at: string;
  end_at: string;
  is_override_open: string;
  override_by: string;
  override_at: string;
  created_at: string;
  updated_at: string;
}

function generateTimelineId(rows: string[][]): string {
  let maxNumber = 0;

  for (const row of rows) {
    const timelineId = row[0];

    if (!timelineId) continue;

    const match = timelineId.match(/^TL-(\d+)$/);

    if (match) {
      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }

  return `TL-${String(maxNumber + 1).padStart(6, "0")}`;
}

export async function findCertificationTimelineById(
  timelineId: string,
): Promise<CertificationTimeline | null> {
  const rows = await getSheetValues(SHEET_NAME);

  if (!rows || rows.length <= 1) {
    return null;
  }

  for (const row of rows.slice(1)) {
    if (row[0] === timelineId) {
      return {
        timeline_id: row[0] || "",
        period_id: row[1] || "",
        stage_order: row[2] || "",
        stage_code: row[3] || "",
        stage_name: row[4] || "",
        start_at: row[5] || "",
        end_at: row[6] || "",
        is_override_open: row[7] || "",
        override_by: row[8] || "",
        override_at: row[9] || "",
        created_at: row[10] || "",
        updated_at: row[11] || "",
      };
    }
  }

  return null;
}

export async function findCertificationTimelinesByPeriodId(
  periodId: string,
): Promise<CertificationTimeline[]> {
  const rows = await getSheetValues(SHEET_NAME)

  if (!rows || rows.length <= 1) {
    return []
  }

  return rows
    .slice(1)
    .filter((row) => row[1] === periodId)
    .map((row) => ({
      timeline_id: row[0] || '',
      period_id: row[1] || '',
      stage_order: row[2] || '',
      stage_code: row[3] || '',
      stage_name: row[4] || '',
      start_at: row[5] || '',
      end_at: row[6] || '',
      is_override_open: row[7] || '',
      override_by: row[8] || '',
      override_at: row[9] || '',
      created_at: row[10] || '',
      updated_at: row[11] || '',
    }))
}

export async function createCertificationTimeline(
  data: Omit<
    CertificationTimeline,
    "timeline_id" | "created_at" | "updated_at"
  >,
): Promise<CertificationTimeline> {
  const rows = await getSheetValues(SHEET_NAME);

  const timelineId = generateTimelineId(rows);

  const now = new Date().toISOString();

  const timeline: CertificationTimeline = {
    timeline_id: timelineId,
    period_id: data.period_id,
    stage_order: data.stage_order,
    stage_code: data.stage_code,
    stage_name: data.stage_name,
    start_at: data.start_at,
    end_at: data.end_at,
    is_override_open: data.is_override_open,
    override_by: data.override_by,
    override_at: data.override_at,
    created_at: now,
    updated_at: now,
  };

  await appendSheetValues(SHEET_NAME, [
    timeline.timeline_id,
    timeline.period_id,
    timeline.stage_order,
    timeline.stage_code,
    timeline.stage_name,
    timeline.start_at,
    timeline.end_at,
    timeline.is_override_open,
    timeline.override_by,
    timeline.override_at,
    timeline.created_at,
    timeline.updated_at,
  ]);

  return timeline;
}


export async function updateCertificationTimeline(
  timelineId: string,
  data: Omit<
    CertificationTimeline,
    "timeline_id" | "created_at" | "updated_at"
  >,
): Promise<CertificationTimeline | null> {
  const rows = await getSheetValues(SHEET_NAME);

  if (!rows || rows.length <= 1) {
    return null;
  }

  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && row[0] === timelineId,
  );

  if (rowIndex === -1) {
    return null;
  }


const existing = rows[rowIndex];

if (!existing) {
  return null;
}

const now = new Date().toISOString();


  const timeline: CertificationTimeline = {
    timeline_id: existing[0] || "",
    period_id: data.period_id,
    stage_order: data.stage_order,
    stage_code: data.stage_code,
    stage_name: data.stage_name,
    start_at: data.start_at,
    end_at: data.end_at,
    is_override_open: existing[7] || "FALSE",
    override_by: existing[8] || "",
    override_at: existing[9] || "",
    created_at: existing[10] || "",
    updated_at: now,
  };

  // Google Sheets menggunakan baris pertama sebagai header.
  const sheetRowNumber = rowIndex + 1;

  await updateSheetRow(SHEET_NAME, sheetRowNumber, [
    timeline.timeline_id,
    timeline.period_id,
    timeline.stage_order,
    timeline.stage_code,
    timeline.stage_name,
    timeline.start_at,
    timeline.end_at,
    timeline.is_override_open,
    timeline.override_by,
    timeline.override_at,
    timeline.created_at,
    timeline.updated_at,
  ]);

  return timeline;
}
