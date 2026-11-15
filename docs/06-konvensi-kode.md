# 06 — Konvensi Kode

## Penamaan

| Hal | Aturan | Contoh |
| --- | --- | --- |
| Folder & file | kebab-case | `certification-period.service.ts` |
| Komponen Vue | PascalCase | `DashboardShell.vue` |
| Route role | Bahasa Indonesia sesuai role | `/super-admin`, `/verifikator`, `/peserta` |
| Sub-route | Bahasa Inggris, konsisten dengan yang ada | `periods`, `applications`, `profile`, `change-password` |
| Nilai role | konstanta di `shared/utils/roles.ts` | `VERIFIKATOR`, `PESERTA` |
| Kolom sheet & field API | snake_case | `application_status` |
| Body request dari frontend | camelCase (pola yang sudah ada) | `{ periodId, verificationStatus }` |
| Variabel/fungsi TS | camelCase | `findApplicationById` |
| Repository | `find*`, `create*`, `update*` | `findUserByEmail` |
| Service | kata kerja bisnis | `createCertificationPeriod`, `activatePesertaAccount` |
| Teks UI, error, komentar | Bahasa Indonesia | `'Periode sertifikasi tidak ditemukan.'` |

## Arsitektur Backend

```
server/api/xxx.get.ts         ← 1. otorisasi (requireUser)
                                 2. ambil & validasi input (tipe, wajib, panjang)
                                 3. panggil service
                                 4. bentuk respons
server/services/xxx.service.ts ← aturan bisnis, gabungan beberapa repository,
                                 lempar createError dengan pesan yang jelas
server/repositories/xxx.repository.ts ← baca/tulis satu sheet, mapping row ↔ object
```

- Endpoint **tidak** memanggil `server/utils/google-sheets.ts` langsung.
- Repository **tidak** memeriksa role/sesi.
- Repository yang dipakai oleh script CLI harus meng-import `createError` dari `'h3'`
  secara eksplisit (auto-import Nitro tidak tersedia di luar Nuxt).

### Template endpoint

```ts
// server/api/contoh/[id].patch.ts
import { updateSesuatu } from '../../services/contoh.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPER_ADMIN'])
  const id = requireRouterParam(event, 'id', 'ID contoh')

  const body = await readBody<{ name?: unknown }>(event)

  if (typeof body?.name !== 'string' || !body.name.trim() || body.name.length > 200) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama wajib diisi (maksimal 200 karakter).',
    })
  }

  const result = await updateSesuatu(id, body.name.trim(), user.user_id)

  return {
    success: true,
    message: 'Data berhasil diperbarui.',
    data: result,
  }
})
```

### Format respons

```jsonc
// sukses
{ "success": true, "message": "...", "data": { ... } }

// gagal (otomatis dari createError)
{ "statusCode": 400, "statusMessage": "Pesan untuk pengguna", "data": { "errors": { "field": "..." } } }
```

### Kode status HTTP

| Kode | Kapan |
| --- | --- |
| 400 | Input tidak valid |
| 401 | Belum login / sesi tidak valid |
| 403 | Login tapi role tidak berhak, atau origin request ditolak |
| 404 | Data tidak ditemukan |
| 409 | Bentrok dengan kondisi data (status tidak sesuai, duplikat, periode lain masih aktif) |
| 410 | Token kedaluwarsa |
| 413 | Berkas/request terlalu besar |
| 429 | Terlalu banyak percobaan |
| 500 | Kesalahan server/konfigurasi |

### Tahapan yang dijaga timeline

Fitur yang terikat tahapan (self assessment, penilaian asesor, dst.) **wajib** mengecek di
server bahwa tahapnya sedang dibuka: jadwal `start_at`–`end_at`, dengan override
`OPEN`/`CLOSED`. Contoh implementasi: `getOpenRegistrationPeriod()` di
`application.service.ts`. Sebaiknya dijadikan helper umum `assertStageOpen(periodId, stageCode)`
saat fitur kedua membutuhkannya.

### Operasi multi-langkah

Google Sheets tidak punya transaksi. Untuk proses dengan beberapa penulisan:
- Lakukan semua **validasi sebelum** menulis apa pun (dan sebelum unggah ke Drive).
- Buat proses **aman diulang** (cek apakah langkah sudah pernah dilakukan).
  Contoh: `application-verification.service.ts`.

## Frontend

- `<script setup lang="ts">`, Composition API.
- Data awal halaman: `await useFetch(...)` (ikut SSR). Aksi pengguna: `$fetch(...)`.
- Data pengguna login: `const { user } = await useAuthUser()`.
- Setiap halaman di area role memanggil `definePageMeta({ layout: '<role>' })`.
- Komponen bersama antar-role taruh di `app/components/<domain>/`, jangan menyalin halaman.
- **Nama komponen otomatis = nama folder + nama file.** `components/certification/SelfAssessmentDraftBar.vue`
  dipanggil `<CertificationSelfAssessmentDraftBar>`, bukan `<SelfAssessmentDraftBar>`. Nama yang salah
  tidak memunculkan error typecheck, komponennya hanya tidak tampil. Cek `.nuxt/components.d.ts` jika ragu.
- Tipe respons API ditulis sebagai `type` di halaman (belum ada folder tipe bersama).
  Jika satu tipe dipakai ≥ 2 tempat, pindahkan ke `shared/types/`.
- Label role/status → helper di `shared/utils/roles.ts`, jangan membuat map label sendiri.

## Checklist Keamanan (setiap endpoint/fitur baru)

- [ ] `requireUser(event, [...roles])` dengan role **paling sempit** yang dibutuhkan.
- [ ] Peserta hanya boleh mengakses data **miliknya** (cek `person_id`/`user_id` di server,
      jangan percaya ID dari URL/body).
- [ ] Semua input dicek tipe dan panjang maksimumnya; `readBody` diperlakukan `unknown`.
- [ ] Tidak ada `password_hash`, token, atau kredensial dalam respons maupun log.
- [ ] Unggahan berkas: cek ukuran, MIME, **dan** signature isi file (lihat `registration.service.ts`).
- [ ] Berkas disajikan lewat backend dengan `Content-Disposition` aman; hanya PDF yang `inline`.
- [ ] Endpoint publik yang mahal (unggah, kirim email) diberi `assertRateLimit`.
- [ ] Tidak memakai `v-html` dengan data dari pengguna.
- [ ] Request yang mengubah data memakai method POST/PUT/PATCH/DELETE (dilindungi CSRF middleware), bukan GET.

## Git

- Branch fitur dari `main`: `feat/self-assessment`, `fix/...`.
- Pesan commit singkat, jelas, boleh Bahasa Indonesia: `feat: simpan jawaban CMSP-01 ke sheet`.
- Jangan commit `.env`, kredensial Google, token OAuth, berkas uji (PDF dummy), atau arsip `.zip`.
