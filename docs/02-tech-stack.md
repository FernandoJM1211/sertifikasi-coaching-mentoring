# 02 — Tech Stack

## Ringkasan

| Lapisan | Teknologi | Versi terpasang | Catatan |
| --- | --- | --- | --- |
| Framework | **Nuxt** | 4.5 | Full-stack: frontend (Vue) + backend (Nitro) dalam satu proyek |
| UI library | **Nuxt UI** | 4.11 | Komponen `U*` (UButton, UCard, UModal, UInput, ...) |
| CSS | **Tailwind CSS** | 4.3 | Diimpor lewat `app/assets/css/main.css` |
| Bahasa | **TypeScript** | 5.9 | Dipakai di `.ts` dan `<script setup lang="ts">` |
| Ikon | **Lucide** via Nuxt UI | — | Format `i-lucide-<nama>`, cari di <https://lucide.dev> |
| Database | **Google Sheets API** | `googleapis` 183 | Lewat Service Account |
| Penyimpanan berkas | **Google Drive API** | `googleapis` 183 | Lewat OAuth (akun Drive milik aplikasi) |
| Email | **Nodemailer** + Gmail | 10.1 | Pakai Gmail App Password |
| Hash kata sandi | **bcryptjs** | 3.0 | 12 salt rounds |
| Baca Excel (import soal) | **read-excel-file** | 9.3.14 (versi dikunci) | Dimuat dinamis di browser (`read-excel-file/browser`) hanya saat import soal |
| Script CLI | **tsx** | — | Menjalankan script TypeScript di `scripts/` |
| Runtime | **Node.js** | ≥ 20.6 (dev: 24) | Perlu `--env-file` untuk script |

## Kenapa Google Sheets?

Dipilih agar data mudah dilihat dan diolah oleh tim non-teknis tanpa server database.
Konsekuensinya (perlu diingat saat mengembangkan):

- **Tidak ada transaksi.** Operasi multi-langkah bisa gagal di tengah. Service yang penting
  (mis. verifikasi pengajuan) dibuat agar **aman diulang** (idempotent).
- **Tidak ada index.** Setiap pencarian membaca seluruh sheet. Hindari memanggil repository
  di dalam loop besar; ambil sekali lalu olah di memori.
- **Kuota API** Google Sheets ±60 request baca/menit/user. Kurangi pemanggilan berulang.
- **ID dibuat oleh aplikasi** (mis. `APP-000001`) dengan membaca nomor terbesar, sehingga
  dua penulisan bersamaan berpotensi menghasilkan ID kembar.
- Semua nilai disimpan sebagai **string**. Boolean = `'TRUE'`/`'FALSE'`, tanggal = ISO 8601 UTC.
- Ada **dua spreadsheet**: data operasional dan data autentikasi (lihat [04-database.md](04-database.md)).

Jika suatu saat data bertambah besar, pola repository memudahkan migrasi ke database
sungguhan (cukup ganti isi `server/repositories/`).

## Fitur Nuxt yang Dipakai

- **File-based routing** di `app/pages/` dan `server/api/`.
- **Layouts** (`definePageMeta({ layout: '...' })`).
- **Global route middleware** `app/middleware/auth.global.ts`.
- **Auto-import**:
  - `app/components/**` → komponen; nama = path folder + nama file
    (mis. `components/layout/DashboardShell.vue` → `<LayoutDashboardShell>`,
    `components/account/AccountProfile.vue` → `<AccountProfile>`).
  - `app/composables/*` → `useAuthUser()`, `logout()`.
  - `server/utils/*` → `requireUser()`, `assertRateLimit()`, `hashPassword()`, dst. di server.
  - `shared/utils/*` → `ROLE_LABELS`, `getRoleLabel()`, dst. di app **dan** server.
  - Helper h3 (`defineEventHandler`, `readBody`, `createError`, ...) di server.
- **`routeRules`** di `nuxt.config.ts` untuk header keamanan.

## Environment Variable

Salin `.env.example` menjadi `.env` lalu isi.

| Variabel | Wajib | Fungsi |
| --- | --- | --- |
| `APP_BASE_URL` | ✅ | URL publik aplikasi. Dipakai di tautan aktivasi email & validasi origin. |
| `GOOGLE_APPLICATION_CREDENTIALS` | ✅* | Path file JSON Service Account (untuk Sheets) — dipakai di lokal. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅* | Isi file JSON Service Account (mentah atau base64) — untuk hosting tanpa file (Vercel). Diutamakan bila diisi. |
| `GOOGLE_SPREADSHEET_ID` | ✅ | ID spreadsheet data operasional. |
| `AUTH_SPREADSHEET_ID` | ✅ | ID spreadsheet autentikasi. |
| `GOOGLE_DRIVE_FOLDER_ID` | ✅ | Folder Drive tujuan unggahan dokumen. |
| `GOOGLE_OAUTH_CLIENT_ID` | ✅ | OAuth client untuk akun Drive aplikasi. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ✅ | — |
| `GOOGLE_OAUTH_REDIRECT_URI` | ✅ | Harus `<APP_BASE_URL>/api/auth/google/callback`. |
| `GOOGLE_OAUTH_TOKEN_PATH` | ✅* | Lokasi file penyimpan refresh token Drive (di luar folder publik) — lokal. |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | ✅* | Nilai `refresh_token` dari file token — untuk hosting tanpa penyimpanan file (Vercel). Diutamakan bila diisi. |
| `GMAIL_USER` | ✅ | Alamat Gmail pengirim email aktivasi. |
| `GMAIL_APP_PASSWORD` | ✅ | App Password Gmail (bukan kata sandi biasa). |

\* Cukup salah satu dari pasangan tersebut: versi file untuk lokal, versi env untuk Vercel.

Variabel dibaca langsung lewat `process.env` (bukan `runtimeConfig`) agar repository juga
bisa dipakai oleh script CLI di luar Nuxt.

## Kenapa Sheets pakai Service Account tapi Drive pakai OAuth?

Service Account tidak punya kuota penyimpanan Drive sendiri, sehingga unggahan berkas
memakai akun Google milik instansi lewat OAuth. Super Admin menghubungkannya sekali melalui
`/api/auth/google`; refresh token disimpan di `GOOGLE_OAUTH_TOKEN_PATH`.

### Troubleshooting: "Koneksi Google Drive sistem sudah kedaluwarsa" (`invalid_grant`)

Refresh token Drive ditolak Google, sehingga unggah & preview dokumen gagal. Penyebab umum:
OAuth consent screen masih berstatus **Testing** (token hanya berlaku 7 hari), token dicabut
dari akun Google, atau kata sandi akun Google diganti.

1. Google Cloud Console → *Google Auth Platform* → **Branding**: isi
   *Application home page* `https://sertifikasi-coaching-mentoring.vercel.app`,
   *privacy policy* `…/kebijakan-privasi`, *terms of service* `…/syarat-ketentuan`, dan
   *Authorized domains* `sertifikasi-coaching-mentoring.vercel.app` → Save. Lalu **Audience** →
   **Publish app** (status *In production*), atau pilih *Internal* jika memakai Google Workspace instansi.
   Scope `drive.file` tidak sensitif sehingga tidak perlu verifikasi Google.
2. Pastikan `GOOGLE_OAUTH_REDIRECT_URI` terdaftar di *Credentials* → OAuth client.
3. Login sebagai Super Admin, buka `<APP_BASE_URL>/api/auth/google`, pilih akun Google pemilik
   folder Drive, setujui akses. Respons sukses = token baru tersimpan.
   Token yang dibuat **saat masih Testing tetap kedaluwarsa 7 hari** — hubungkan ulang setelah
   status *In production*. Di Vercel token tidak tersimpan otomatis: hubungkan dari lokal, lalu
   salin `refresh_token` dari file `GOOGLE_OAUTH_TOKEN_PATH` ke env `GOOGLE_OAUTH_REFRESH_TOKEN`
   di Vercel dan redeploy.

## Tool Pengembangan

- **VS Code** + ekstensi *Vue - Official* dan *Tailwind CSS IntelliSense*.
- `npm run typecheck` untuk memeriksa TypeScript (`vue-tsc`).
- Nuxt DevTools aktif di mode development.
