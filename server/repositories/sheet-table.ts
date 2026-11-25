import { createError } from 'h3'
import {
  appendSheetRowsWithIds,
  getSheetValues,
  updateSheetRows,
} from '../utils/google-sheets'

/** Satu baris sheet sebagai objek { kolom: nilai }. */
export type SheetRecord<C extends readonly string[]> = { [K in C[number]]: string }

/**
 * Pembaca/penulis generik satu sheet (spreadsheet Data) dengan kolom ID di kolom A.
 * Urutan `columns` HARUS sama dengan header di Google Sheets (dibaca per posisi).
 */
export function createTable<C extends readonly string[]>(sheetName: string, columns: C, idPrefix: string) {
  type Row = SheetRecord<C>

  const toRecord = (row: string[]): Row =>
    Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ''])) as Row

  const toRow = (record: Row): string[] =>
    columns.map((column) => (record as Record<string, string>)[column] ?? '')

  async function readAll() {
    let rows: string[][]

    try {
      rows = await getSheetValues(sheetName)
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage: `Sheet ${sheetName} belum tersedia. Hubungi Super Admin.`,
      })
    }

    return {
      rows,
      records: rows
        .map((row, index) => ({ rowNumber: index + 1, record: toRecord(row) }))
        .slice(1)
        .filter((item) => item.record[columns[0] as C[number]]),
    }
  }

  return {
    async findAll(): Promise<Row[]> {
      return (await readAll()).records.map((item) => item.record)
    },

    async findWhere(predicate: (record: Row) => boolean): Promise<Row[]> {
      return (await readAll()).records.map((item) => item.record).filter(predicate)
    },

    /** Menambah satu baris; ID unik dibuat otomatis. */
    async create(record: Omit<Row, C[0]>): Promise<Row> {
      await readAll()
      const [created] = await appendSheetRowsWithIds(sheetName, idPrefix, 1, (id) => ({ ...record, [columns[0] as string]: id }) as Row, toRow)
      return created as Row
    },

    /** Menambah banyak baris sekaligus (satu kali tulis); ID unik dibuat otomatis. */
    async createMany(records: Omit<Row, C[0]>[]): Promise<Row[]> {
      if (records.length === 0) return []

      // Memastikan sheet ada (pesan error yang jelas bila belum dibuat).
      await readAll()

      return appendSheetRowsWithIds(
        sheetName,
        idPrefix,
        records.length,
        (id, index) => ({ ...records[index], [columns[0] as string]: id }) as Row,
        toRow,
      )
    },

    /** Memperbarui baris berdasarkan ID (kolom A). Mengembalikan null bila tidak ada. */
    async update(id: string, patch: Partial<Row>): Promise<Row | null> {
      const { records } = await readAll()
      const found = records.find((item) => item.record[columns[0] as C[number]] === id)
      if (!found) return null

      const updated = { ...found.record, ...patch, [columns[0] as string]: id } as Row
      await updateSheetRows(sheetName, [{ rowNumber: found.rowNumber, values: toRow(updated) }])

      return updated
    },

    /** Memperbarui banyak baris sekaligus (satu kali tulis). ID yang tidak ada diabaikan. */
    async updateMany(changes: { id: string, patch: Partial<Row> }[]): Promise<number> {
      if (changes.length === 0) return 0

      const { records } = await readAll()
      const byId = new Map(records.map((item) => [item.record[columns[0] as C[number]], item]))
      const updates = changes.flatMap(({ id, patch }) => {
        const found = byId.get(id)
        if (!found) return []
        return [{ rowNumber: found.rowNumber, values: toRow({ ...found.record, ...patch, [columns[0] as string]: id } as Row) }]
      })

      if (updates.length > 0) await updateSheetRows(sheetName, updates)

      return updates.length
    },
  }
}
