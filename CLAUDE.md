# CLAUDE.md — Panduan Pengembangan CMSP

File ini dibaca otomatis oleh asisten AI (Claude Code) di setiap sesi.
Isinya ringkas; detail ada di folder [docs/](docs/).

## Tentang Proyek

**CMSP** adalah sistem sertifikasi **Coaching dan Mentoring Sektor Publik**:
Guest mendaftar pada periode yang dibuka → Verifikator memverifikasi & membuatkan akun Peserta →
Peserta mengisi CMSP-01 & CMSP-02 (bisa diminta perbaikan) → Verifikator meng-assign ke asesor →
Peserta mengerjakan tes tertulis pilihan ganda (bank soal dari Super Admin) → Asesor Teknis menilai CMSP-02
(K/BK per indikator + catatan) → Asesor Kepublikan menilai form CMSP-03 → kelulusan ditetapkan →
Lulus: sertifikat; Tidak lulus: remedial satu kali (kirim link bukti).
Super Admin mengelola periode, timeline, akun, bank soal, dan dapat mengakses sebagian fitur Verifikator/Asesor.
Alur lengkap + diagram: [docs/01-gambaran-sistem.md](docs/01-gambaran-sistem.md).

Stack: **Nuxt 4 + Nuxt UI 4 + Tailwind CSS 4**, database **Google Sheets**, berkas di **Google Drive**.
Bahasa UI, pesan error, dan komentar kode: **Bahasa Indonesia**.

## Dokumentasi

| File | Isi |
| --- | --- |
| [docs/01-gambaran-sistem.md](docs/01-gambaran-sistem.md) | Apa sistem ini, role, proses bisnis, status |
| [docs/02-tech-stack.md](docs/02-tech-stack.md) | Teknologi, versi, environment variable |
| [docs/03-struktur-proyek.md](docs/03-struktur-proyek.md) | Fungsi setiap folder dan file |
| [docs/04-database.md](docs/04-database.md) | Sheet di Google Sheets beserta kolomnya |
| [docs/05-panduan-ui.md](docs/05-panduan-ui.md) | Style guide halaman (warna, layout, komponen) |
| [docs/06-konvensi-kode.md](docs/06-konvensi-kode.md) | Pola kode backend/frontend + checklist keamanan |
| [docs/07-status-pengembangan.md](docs/07-status-pengembangan.md) | Fitur yang sudah/belum ada, known issues |
| [docs/08-keputusan-skenario.md](docs/08-keputusan-skenario.md) | Log skenario yang dibahas + keputusan yang disepakati (mis. aturan NIP/email pendaftaran) |

**Baca dokumen yang relevan sebelum mengerjakan fitur.** Setelah menambah fitur, sheet,
atau file baru, **perbarui dokumen terkait** (terutama 03, 04, dan 07). Setiap skenario yang
didiskusikan lalu disepakati dengan pemilik proyek **dicatat di 08** (entri baru, jangan hapus yang lama).

## Aturan Wajib

1. **Role** hanya diambil dari [shared/utils/roles.ts](shared/utils/roles.ts):
   `SUPER_ADMIN`, `VERIFIKATOR`, `TECHNICAL_ASSESSOR`, `PUBLIC_ASSESSOR`, `PESERTA`.
   Jangan memakai `VERIFIER`/`PARTICIPANT`/`user` lagi (nama lama).
2. **Setiap endpoint API** yang butuh login wajib diawali `await requireUser(event, [roles])`.
   Middleware frontend hanya untuk redirect, bukan pengaman.
3. **Alur lapisan backend:** `server/api` (validasi input + otorisasi) → `server/services`
   (logika bisnis) → `server/repositories` (baca/tulis sheet). Endpoint tidak memanggil
   Google Sheets langsung.
4. **Jangan pernah** mengirim `password_hash` atau token mentah ke frontend.
   Gunakan `toPublicAccount()` untuk data akun.
5. Validasi semua input di server (tipe, wajib, panjang maksimum). Input dari `readBody`
   bertipe `unknown` sampai dicek.
6. Tulis ke sheet selalu lewat repository (sudah memakai `valueInputOption: RAW`).
7. Ikuti [docs/05-panduan-ui.md](docs/05-panduan-ui.md) untuk halaman baru agar tampilan konsisten.
8. Jangan menambah dependency baru tanpa alasan kuat; utamakan komponen Nuxt UI.
9. Jangan commit `.env`, file kredensial Google, atau token OAuth.

## Area yang Sedang Dikerjakan Pemilik Proyek

Form **CMSP-01 & CMSP-02** (`app/components/certification/`, `app/pages/peserta/self-assessment/`)
sudah tersambung ke server. Konten form (field, unit kompetensi, pernyataan) mengikuti
dokumen resmi milik pemilik proyek — **jangan ubah isi/aturannya tanpa diminta**.
Data hasil submit berdiri sendiri (tidak ditautkan ke Profil/Application).

## Perintah

```bash
npm run dev                 # development (http://localhost:3000)
npm run build               # build production
npm run typecheck           # pemeriksaan TypeScript
npm run create-super-admin  # membuat akun Super Admin pertama
```

Sebelum menyatakan pekerjaan selesai: jalankan `npm run typecheck` dan pastikan
tidak ada error baru di file yang diubah.
