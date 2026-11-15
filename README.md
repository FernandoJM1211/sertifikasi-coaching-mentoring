# Sistem Sertifikasi Coaching dan Mentoring (CMSP)

Aplikasi untuk mengelola proses sertifikasi Coaching dan Mentoring Sektor Publik:
pendaftaran peserta, verifikasi berkas, self assessment (CMSP-01 & CMSP-02), hingga pengumuman.

**Teknologi:** Nuxt 4, Nuxt UI + Tailwind CSS 4, Google Sheets (database), Google Drive (penyimpanan dokumen).

## Dokumentasi

Dokumentasi pengembangan lengkap ada di folder [docs/](docs/); ringkasan aturan untuk
asisten AI ada di [CLAUDE.md](CLAUDE.md).

| Dokumen | Isi |
| --- | --- |
| [01 — Gambaran Sistem](docs/01-gambaran-sistem.md) | Proses bisnis, role, status |
| [02 — Tech Stack](docs/02-tech-stack.md) | Teknologi & environment variable |
| [03 — Struktur Proyek](docs/03-struktur-proyek.md) | Fungsi setiap file |
| [04 — Database](docs/04-database.md) | Sheet & kolom Google Sheets |
| [05 — Panduan UI](docs/05-panduan-ui.md) | Style guide |
| [06 — Konvensi Kode](docs/06-konvensi-kode.md) | Pola kode & checklist keamanan |
| [07 — Status Pengembangan](docs/07-status-pengembangan.md) | Progres fitur & known issues |

## Role

| Role (nilai di sheet `users`) | Label              | Halaman          |
| ----------------------------- | ------------------ | ---------------- |
| `SUPER_ADMIN`                 | Super Admin        | `/super-admin`   |
| `VERIFIKATOR`                 | Verifikator        | `/verifikator`   |
| `TECHNICAL_ASSESSOR`          | Asesor Teknis      | (belum tersedia) |
| `PUBLIC_ASSESSOR`             | Asesor Kepublikan  | (belum tersedia) |
| `PESERTA`                     | Peserta            | `/peserta`       |

Definisi role ada di [shared/utils/roles.ts](shared/utils/roles.ts) dan dipakai bersama oleh frontend & backend.

## Struktur Folder

```
app/                    # Frontend (Nuxt 4 srcDir)
  components/
    account/            # Profil & ganti kata sandi (dipakai semua role)
    certification/      # Form CMSP-01 & CMSP-02 (self assessment)
    guest/              # Form pendaftaran publik
    layout/             # DashboardShell: sidebar + header dashboard
  composables/          # useAuthUser(), logout()
  layouts/              # guest, super-admin, verifikator, peserta
  middleware/           # auth.global.ts: redirect berdasarkan role (UX saja)
  pages/                # Routing berbasis file
server/                 # Backend (Nitro)
  api/                  # Endpoint HTTP: validasi input + otorisasi, lalu panggil service
  middleware/           # csrf.ts: cek Origin untuk semua request yang mengubah data
  services/             # Logika bisnis
  repositories/         # Akses data Google Sheets (satu file per sheet)
  utils/                # Helper (auto-import): requireUser, rate limit, password, Google Sheets
shared/                 # Kode yang dipakai app/ dan server/ (konstanta role)
scripts/                # Script CLI (bootstrap Super Admin)
```

## Keamanan

- Sesi login memakai cookie `httpOnly` + `SameSite=Lax` (`secure` di production); token disimpan sebagai hash SHA-256.
- Setiap endpoint memakai `requireUser(event, [roles])` dari [server/utils/session.ts](server/utils/session.ts).
  Middleware frontend hanya untuk redirect, **bukan** pengaman.
- Request `POST/PUT/PATCH/DELETE` ke `/api` wajib berasal dari origin aplikasi ([server/middleware/csrf.ts](server/middleware/csrf.ts)).
- Login dan pendaftaran dibatasi jumlah percobaannya (in-memory, cukup untuk satu instance server).
- Penulisan ke Sheets memakai `valueInputOption: RAW` sehingga input tidak dieksekusi sebagai formula.
- Kata sandi di-hash dengan bcrypt (12 rounds), panjang 12–128 karakter.

## Setup

```bash
npm install
cp .env.example .env   # lalu isi semua nilainya
```

1. Buat Service Account Google, bagikan kedua spreadsheet ke email service account (Editor).
2. Buat akun Super Admin pertama:

   ```bash
   npm run create-super-admin
   ```

3. Jalankan aplikasi, login sebagai Super Admin, lalu buka `/api/auth/google`
   untuk menghubungkan Google Drive (tempat dokumen pendaftaran disimpan).

## Perintah

```bash
npm run dev         # server development di http://localhost:3000
npm run build       # build production
npm run preview     # menjalankan hasil build
npm run typecheck   # pemeriksaan TypeScript
```
