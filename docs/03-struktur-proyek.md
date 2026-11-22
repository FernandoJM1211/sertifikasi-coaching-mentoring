# 03 — Struktur Proyek

Peta seluruh file dan fungsinya. **Perbarui dokumen ini setiap menambah/menghapus file.**

```
.
├── app/            Frontend (Vue/Nuxt) — halaman, layout, komponen
├── server/         Backend (Nitro) — API, logika bisnis, akses Google Sheets
├── shared/         Kode yang dipakai frontend & backend
├── scripts/        Script CLI
├── public/         Aset statis yang disajikan apa adanya
├── docs/           Dokumentasi pengembangan (folder ini)
└── CLAUDE.md       Ringkasan aturan untuk asisten AI
```

## File Root

| File | Fungsi |
| --- | --- |
| `nuxt.config.ts` | Konfigurasi Nuxt: modul `@nuxt/ui`, CSS global, light mode, header keamanan (`routeRules`). |
| `package.json` | Dependency dan perintah `npm run ...`. |
| `tsconfig.json` | Merujuk tsconfig yang dibuat otomatis oleh Nuxt di `.nuxt/`. |
| `.env.example` | Contoh environment variable (lihat [02-tech-stack.md](02-tech-stack.md)). `.env` asli tidak di-commit. |
| `.gitignore` | File yang tidak masuk git (`.env`, `.nuxt`, `.output`, `node_modules`). |
| `.vscode/settings.json` | Arahkan VS Code ke TypeScript milik proyek. |
| `README.md` | Pengenalan singkat dan cara setup. |
| `CLAUDE.md` | Aturan & indeks dokumentasi untuk asisten AI. |

## `app/` — Frontend

### Dasar

| File | Fungsi |
| --- | --- |
| `app/app.vue` | Root aplikasi: `<UApp>` → layout → halaman. |
| `app/app.config.ts` | Tema Nuxt UI: warna `primary` = blue, `neutral` = slate. |
| `app/assets/css/main.css` | Import Tailwind dan Nuxt UI. |
| `app/middleware/auth.global.ts` | Redirect berdasarkan login & role untuk `/super-admin`, `/verifikator`, `/asesor-teknis`, `/asesor-kepublikan`, `/peserta`. Hanya UX — keamanan ada di API. |
| `app/composables/useTablePagination.ts` | `useTablePagination(filtered)` paginasi sisi klien semua tabel (`page`, `pageSize`, `items`, `reset`); `TABLE_PAGE_SIZES` = 5/10/20/50. |
| `app/components/TablePagination.vue` | `<TablePagination>` footer paginasi seragam: ringkasan baris, pilihan per halaman, Sebelumnya/Berikutnya. |
| `app/composables/useSelfAssessmentFiles.ts` | `useSelfAssessmentFiles()` unggah & URL preview berkas self assessment; `formatFileInfo()`. |
| `app/composables/useAuthUser.ts` | `useAuthUser()` (data pengguna login, cache key `authenticated-user`) dan `logout()`. |
| `app/utils/api-error.ts` | `getApiErrorMessage(error, fallback)` — ambil `statusMessage` dari error `$fetch` (auto-import). |
| `app/utils/format.ts` | `formatDateTimeId()` — format `13 Nov 2026, 09.30` (auto-import). |
| `app/utils/timeline.ts` | `buildTimelineStages()` (status progres dari jadwal saja; tahap terjauh yang berlangsung menjadi acuan), `getActiveStage()`, `getNextStage()`, tipe `TimelineTask`. |

### Layouts (`app/layouts/`)

| File | Dipakai oleh | Isi |
| --- | --- | --- |
| `default.vue` | `/` (beranda) | Header dengan tombol Masuk & Daftar. |
| `guest.vue` | `/login`, `/pendaftaran`, `/aktivasi-akun` | Header sederhana + footer. |
| `super-admin.vue` | `/super-admin/**` | `DashboardShell` dengan menu Super Admin. |
| `verifikator.vue` | `/verifikator/**` | `DashboardShell` dengan menu Verifikator. |
| `asesor-teknis.vue` | `/asesor-teknis/**` | `DashboardShell` dengan menu Asesor Teknis. |
| `asesor-kepublikan.vue` | `/asesor-kepublikan/**` | `DashboardShell` dengan menu Asesor Kepublikan. |
| `peserta.vue` | `/peserta/**` | `DashboardShell` dengan menu Peserta. |

Untuk role baru (mis. asesor), buat layout tipis serupa yang memakai `LayoutDashboardShell`.

### Komponen (`app/components/`)

| File | Tag | Fungsi |
| --- | --- | --- |
| `layout/DashboardShell.vue` | `<LayoutDashboardShell>` | Kerangka dashboard: sidebar, menu profil (Profil, Ganti Kata Sandi, Keluar), header, area konten. Brand: "Sertifikasi CMSP" / "Lembaga Administrasi Negara". Header: judul = label menu aktif (fallback `headerTitle`), sub judul = `panelLabel` (nama panel role), tanggal hari ini, notifikasi. Props: `panelLabel`, `headerTitle`, `navigation`, `basePath`. |
| `layout/AppFooter.vue` | `<LayoutAppFooter>` | Footer aplikasi. `variant="full"` (default) di layout publik `default`/`guest`: satu pita horizontal (unit, alamat, email, WhatsApp); `variant="compact"` kartu di bawah konten dashboard dengan tombol "Butuh Bantuan?" (modal pilihan email/WhatsApp). Data kontak ada di konstanta `contact` dalam file ini. |
| `account/AccountProfile.vue` | `<AccountProfile>` | Halaman profil (semua role). Peserta: data diri dari sheet `persons`, bisa diedit (NIP & email terkunci). Pegawai: nama & email. Prop `changePasswordPath`. |
| `document/DocumentPreviewModal.vue` | `<DocumentPreviewModal>` | Modal preview PDF/gambar hampir layar penuh (header tipis) + tombol **Buka di Tab Baru**. Dipakai semua preview dokumen, termasuk detail pengajuan Verifikator & Super Admin. Props: `v-model:open`, `url` atau `file`, `title`, `description`. |
| `account/ChangePasswordForm.vue` | `<AccountChangePasswordForm>` | Form ganti kata sandi; setelah berhasil semua sesi dicabut dan diarahkan ke login. Prop `profilePath`. |
| `guest/GuestRegistrationForm.vue` | `<GuestRegistrationForm>` | Form pendaftaran publik: data diri + 4 dokumen PDF, kirim ke `/api/applications/register`. |
| `certification/Cmsp01Form.vue` | diimpor di halaman | Form CMSP-01. Data awal dari server (props `initial`); jika belum pernah disimpan, data diri disalin dari Profil. 6 dokumen (4 pendaftaran + KTP + Surat Tugas) bisa dilihat & diganti. Expose `progress`, `declarationAccepted`, `payload`. |
| `certification/Cmsp02Form.vue` | diimpor di halaman | Form CMSP-02: evidence per unit kompetensi (file/link); evidence baru tampil paling atas. Expose `progress`, `payload`. Slot opsional `unit-header` (`{ unit }`) di setiap kartu unit — dipakai penilaian K/BK Asesor Teknis. Prop opsional `completedUnitCodes` untuk penanda unit sudah dinilai di navigasi pada mode tinjau. |
| `certification/SelfAssessmentDraftBar.vue` | `<CertificationSelfAssessmentDraftBar>` | Bar Simpan Draft melayang (sticky); menyimpan CMSP-01 & CMSP-02 sekaligus. |
| `certification/SelfAssessmentSubmitCard.vue` | `<CertificationSelfAssessmentSubmitCard>` | Kartu Submit di bawah halaman; aktif jika kedua form 100% + pernyataan disetujui. |
| `certification/SelfAssessmentStatusBadge.vue` | `<CertificationSelfAssessmentStatusBadge>` | Badge status self assessment di kanan header CMSP-01 & CMSP-02. |
| `certification/SelfAssessmentReviewNote.vue` | `<CertificationSelfAssessmentReviewNote>` | Kartu catatan perbaikan Verifikator untuk satu form (kuning lembut, teks netral). |

`Cmsp01Form`/`Cmsp02Form` punya prop `reviewMode` (dipakai halaman verifikasi): menyembunyikan panduan pengisian, progress, badge kelengkapan, contoh bukti, dan deskripsi evidence yang kosong.
| `certification/Cmsp02UnitNavigator.vue` | `<CertificationCmsp02UnitNavigator>` | Kotak nomor unit melayang di kanan CMSP-02; muncul saat scroll, hilang 5 detik setelah berhenti. |
| `document/LinkPreviewModal.vue` | `<DocumentLinkPreviewModal>` | Modal embed link evidence (video YouTube / file Google Drive). |
| `timeline/ProgressBar.vue` | `<TimelineProgressBar>` | Progres bar timeline (Selesai / Sedang Berlangsung / Belum Dimulai). Prop `stages`. |
| `timeline/CurrentStage.vue` | `<TimelineCurrentStage>` | Kartu "Tahapan Saat Ini" (nama, tanggal mulai & selesai) + panel tombol dinamis dari prop `tasks`. |
| `timeline/StaffHome.vue` | `<TimelineStaffHome>` | Beranda staf: semua periode aktif dari `/api/home/periods` + progres bar; props `tasksFor(periodId, stage)`, `showCurrentStage`, `emptyDescription`. |
| `period/PeriodPicker.vue` | `<PeriodPicker>` | Kartu pilihan periode sebelum halaman per periode (Verifikasi SA, Penugasan Asesor). Props `title`, `description`, `note`, `actionLabel`, `actionIcon`, `basePath`, `endpoint` (opsional, sumber daftar periode), `stageCode` (opsional; kartu menampilkan "Jadwal" tahap fitur tersebut, mis. `EVALUATION`). |
| `technical-assessment/List.vue` | `<TechnicalAssessmentList>` | Daftar penilaian CMSP-02 per periode (ringkasan, filter, tabel). Props `periodId`, `basePath`, `backPath`, `showAssessor`. |
| `technical-assessment/Detail.vue` | `<TechnicalAssessmentDetail>` | Penilaian satu peserta: evidence CMSP-02 + K/BK per unit, catatan, rekomendasi, simpan draf/kirim; buka kunci (Super Admin). Props `applicationId`, `backPath`. |
| `public-assessment/List.vue` | `<PublicAssessmentList>` | Daftar penilaian CMSP-03 per periode (status tambahan "Menunggu Asesor Teknis"). Props sama dengan `TechnicalAssessmentList`. |
| `public-assessment/Detail.vue` | `<PublicAssessmentDetail>` | Penilaian CMSP-03 satu peserta: unit + elemen + indikator, K/BK per unit, catatan, rekomendasi, simpan draf/kirim; buka kunci (Super Admin). Props `applicationId`, `backPath`. |
| `evaluation/QuestionImportModal.vue` | `<EvaluationQuestionImportModal>` | Modal import soal Excel di Bank Soal: unduh template, pilih .xlsx (dibaca di browser), pratinjau per baris, lewati duplikat, kirim ke `/api/evaluation/questions/import`. Props `existingTexts`, `v-model:open`; emit `imported`. |
| `assessor-assignment/List.vue` | `<AssessorAssignmentList>` | Asesor periode (kelola), ringkasan, tabel dengan pilih banyak/semua, modal penugasan massal. Props `periodId`, `backPath`. |
| `verification/SelfAssessmentList.vue` | `<VerificationSelfAssessmentList>` | Daftar self assessment dalam satu periode (Verifikator & Super Admin). Props `periodId`, `basePath`, `backPath`. |
| `verification/SelfAssessmentDetail.vue` | `<VerificationSelfAssessmentDetail>` | Detail verifikasi: form read-only, riwayat, catatan per form, keputusan. Props `applicationId`, `backPath`. |

### Halaman (`app/pages/`)

**Publik**

| Route | File | Fungsi |
| --- | --- | --- |
| `/` | `index.vue` | Landing page. |
| `/login` | `login.vue` | Login; redirect ke halaman sesuai role (`ROLE_HOME_PATHS`). |
| `/pendaftaran` | `pendaftaran.vue` | Membungkus `GuestRegistrationForm`. |
| `/aktivasi-akun?token=` | `aktivasi-akun.vue` | Peserta membuat kata sandi dari tautan email. |

**Super Admin** (`app/pages/super-admin/`)

| Route | File | Fungsi |
| --- | --- | --- |
| `/super-admin` | `index.vue` | Beranda: progres timeline setiap periode aktif (tanpa tombol dinamis). |
| `/verifikator` | `verifikator/index.vue` | Beranda Verifikator: timeline periode aktif + tombol Verifikasi Pendaftar / Verifikasi SA / Penugasan Asesor sesuai tahap. |
| `/asesor-teknis` | `asesor-teknis/index.vue` | Beranda Asesor Teknis: timeline periode aktif yang ditugaskan + tombol Nilai CMSP-02 pada tahap Penilaian Asesor. |
| `/super-admin/periods` | `periods/index.vue` | Daftar periode + ubah status (aktifkan, tutup, buka kembali, selesaikan). |
| `/super-admin/periods/create` | `periods/create.vue` | Buat periode baru (status DRAFT). |
| `/super-admin/periods/:periodId` | `periods/[periodId]/index.vue` | Ringkasan & daftar pengajuan dalam periode. |
| `/super-admin/periods/:periodId/timeline` | `periods/[periodId]/timeline.vue` | Atur jadwal 8 tahapan + override buka/tutup. |
| `/super-admin/applications/:applicationId` | `applications/[applicationId].vue` | Detail & verifikasi pengajuan (versi Super Admin). |
| `/super-admin/accounts` | `accounts/index.vue` | Daftar akun, buat akun pegawai, reset kata sandi, aktif/nonaktifkan. |
| `/super-admin/evaluations/questions` | `evaluations/questions.vue` | Bank Soal: tambah/ubah (modal), arsip/aktifkan; soal terpakai terkunci. |
| `/super-admin/evaluations/packages` | `evaluations/packages/index.vue` | Daftar paket soal. |
| `/super-admin/evaluations/packages/:packageId` | `evaluations/packages/[packageId].vue` | Buat (`baru`) / ubah paket: pilih soal dari bank soal. |
| `/super-admin/evaluations/plans` | `evaluations/plans/index.vue` | Pilih periode (`PeriodPicker`) untuk Perencanaan Evaluasi. |
| `/super-admin/evaluations/plans/:periodId` | `evaluations/plans/[periodId].vue` | Pengaturan evaluasi periode (paket, N soal, durasi, passing grade, acak) + Simpan & Terapkan / Terapkan Ulang + nilai peserta (lihat detail, reset progres). |
| `/super-admin/technical-assessments` | `technical-assessments/index.vue` | Pilih periode untuk memantau penilaian Asesor Teknis. |
| `/super-admin/technical-assessments/:periodId` | `technical-assessments/[periodId]/index.vue` | Semua penilaian CMSP-02 periode + nama asesor. |
| `/super-admin/technical-assessments/:periodId/:applicationId` | `.../[applicationId].vue` | Lihat/isi penilaian (selama tahap dibuka) + Buka Kunci. |
| `/asesor-teknis/assessments` | `asesor-teknis/assessments/index.vue` | Asesor Teknis: periode yang memiliki peserta yang ditugaskan kepadanya. |
| `/asesor-teknis/assessments/:periodId` | `.../[periodId]/index.vue` | Daftar peserta yang ditugaskan + status penilaian. |
| `/asesor-teknis/assessments/:periodId/:applicationId` | `.../[periodId]/[applicationId].vue` | Form penilaian CMSP-02. |
| `/asesor-teknis/profile`, `/asesor-teknis/change-password` | `asesor-teknis/*.vue` | Profil & ubah kata sandi. |
| `/super-admin/public-assessments` (+ `/:periodId`, `/:periodId/:applicationId`) | `public-assessments/**` | Pantau/isi/buka kunci penilaian CMSP-03 Asesor Kepublikan. |
| `/asesor-kepublikan` | `asesor-kepublikan/index.vue` | Beranda Asesor Kepublikan: timeline periode aktif yang ditugaskan + tombol Nilai CMSP-03. |
| `/asesor-kepublikan/assessments` (+ `/:periodId`, `/:periodId/:applicationId`) | `asesor-kepublikan/assessments/**` | Pilih periode → daftar peserta yang ditugaskan → form penilaian CMSP-03. |
| `/asesor-kepublikan/profile`, `/asesor-kepublikan/change-password` | `asesor-kepublikan/*.vue` | Profil & ubah kata sandi. |
| `/super-admin/evaluations/attempts/:attemptId` | `evaluations/attempts/[attemptId].vue` | Detail hasil evaluasi peserta: waktu, nilai, jawaban per soal vs kunci (benar/salah/tidak dijawab). |
| `/super-admin/accounts/:id` | `accounts/[id].vue` | Detail satu akun. |
| `/super-admin/profile` | `profile.vue` | Profil sendiri. |
| `/super-admin/change-password` | `change-password.vue` | Ganti kata sandi sendiri. |

**Verifikator** (`app/pages/verifikator/`)

| Route | File | Fungsi |
| --- | --- | --- |
| `/verifikator/periods` | `periods/index.vue` | Daftar periode (hanya baca). |
| `/verifikator/periods/:periodId` | `periods/[periodId]/index.vue` | Daftar pengajuan dalam periode. |
| `/verifikator/periods/:periodId/timeline` | `periods/[periodId]/timeline.vue` | Lihat jadwal tahapan (hanya baca). |
| `/verifikator/self-assessments` (+ `/super-admin/self-assessments`) | `self-assessments/index.vue` | Pilih periode (komponen `PeriodPicker`). |
| `/verifikator/assessor-assignments` (+ Super Admin) | `assessor-assignments/index.vue` | Pilih periode untuk Penugasan Asesor (`PeriodPicker`). |
| `/verifikator/assessor-assignments/:periodId` (+ Super Admin) | `assessor-assignments/[periodId].vue` | Daftar & penugasan asesor (`AssessorAssignmentList`). |
| `/verifikator/self-assessments/:periodId` (+ Super Admin) | `self-assessments/[periodId]/index.vue` | Daftar self assessment periode tsb. (komponen `VerificationSelfAssessmentList`). |
| `/verifikator/self-assessments/:periodId/:applicationId` (+ Super Admin) | `self-assessments/[periodId]/[applicationId].vue` | Detail CMSP-01 & 02 read-only + keputusan (komponen `VerificationSelfAssessmentDetail`). |
| `/verifikator/applications/:applicationId` | `applications/[applicationId].vue` | Periksa dokumen, catatan, keputusan terima/tolak. |
| `/verifikator/profile`, `/verifikator/change-password` | `profile.vue`, `change-password.vue` | Akun sendiri. |

**Peserta** (`app/pages/peserta/`)

| Route | File | Fungsi |
| --- | --- | --- |
| `/peserta` | `index.vue` | Beranda peserta: timeline periode aktif yang diikuti (pengajuan diterima) + tombol dinamis (tunggakan tahap sebelumnya diprioritaskan); info bila belum terdaftar pada periode aktif. |
| `/peserta/self-assessment` | `self-assessment/index.vue` | 🚧 Pilih pengajuan untuk self assessment. |
| `/peserta/self-assessment/:applicationId` | `self-assessment/[applicationId].vue` | 🚧 Tab CMSP-01 & CMSP-02. |
| `/peserta/evaluation` | `evaluation/index.vue` | Pilih pengajuan untuk evaluasi. |
| `/peserta/evaluation/:applicationId` | `evaluation/[applicationId].vue` | Petunjuk & mulai, pengerjaan (timer, navigasi soal, autosave), status terkirim. |
| `/peserta/profile`, `/peserta/change-password` | `profile.vue`, `change-password.vue` | Akun sendiri. |

> Halaman periode/pengajuan Super Admin dan Verifikator saat ini **duplikat** dengan sedikit
> perbedaan (Super Admin bisa mengubah). Kandidat refactor ke komponen bersama.

## `server/` — Backend

Alur: **`api/` → `services/` → `repositories/` → Google Sheets/Drive.**

### `server/middleware/`

| File | Fungsi |
| --- | --- |
| `csrf.ts` | Menolak request POST/PUT/PATCH/DELETE ke `/api` yang Origin-nya bukan aplikasi ini. |

### `server/utils/` (auto-import di server)

| File | Fungsi |
| --- | --- |
| `session.ts` | `requireUser(event, roles?)`, `requireRouterParam()`, cookie sesi (`setSessionCookie`, `clearSessionCookie`, `getSessionToken`), `getClientIp()`. |
| `account-guard.ts` | `requireManageableAccount(userId)` — tolak reset kata sandi/ubah status untuk akun Super Admin (404 bila akun tidak ada). |
| `rate-limit.ts` | `assertRateLimit()` / `resetRateLimit()` — pembatas percobaan in-memory. |
| `password.ts` | `hashPassword()`, `verifyPassword()`, `validateNewPassword()` (12–128 karakter). |
| `auth-token.ts` | `generateAuthToken()` (token acak) dan `hashAuthToken()` (SHA-256). |
| `google-sheets.ts` | Klien Sheets: `getSheetValues/appendSheetValues/updateSheetRow` (data) dan versi `...Auth...` (autentikasi). |
| `email.ts` | Email via Gmail: `sendAccountActivationEmail()`, `sendApplicationAcceptedEmail()` (akun sudah aktif), `sendApplicationAcceptedNoticeEmail()` (email pengajuan ≠ email akun), `sendApplicationRejectedEmail()`. Kapan dipakai: docs/08 K-09. |
| `account-response.ts` | `toPublicAccount()` — data akun tanpa `password_hash`. |
| `pdf-file.ts` | `assertValidPdfFile()` (MIME, ukuran, signature), `sanitizeFileNamePart()`, `multipartPartToFile()`. |
| `technical-assessment-input.ts` | Validasi body penilaian asesor: `parseTechnicalAssessmentInput()` (CMSP-02) dan `parsePublicAssessmentInput()` (CMSP-03). |
| `evaluation-input.ts` | Validasi body evaluasi: `parseQuestionInput()`, `parsePackageInput()`, `parsePeriodEvaluationInput()`, `parseStatusInput()`, `parseAnswersInput()`. |
| `upload-file.ts` | `assertValidUpload()` (deteksi tipe dari isi file: PDF/PNG/JPG/DOC/DOCX), `setFileResponseHeaders()` (inline hanya PDF/gambar). |

### `server/api/` — Endpoint

| Method & Path | File | Akses | Fungsi |
| --- | --- | --- | --- |
| `POST /api/auth/login` | `auth/login.post.ts` | Publik (rate limited) | Login, set cookie sesi. |
| `POST /api/auth/logout` | `auth/logout.post.ts` | Publik | Cabut sesi & hapus cookie. |
| `GET /api/auth/me` | `auth/me.get.ts` | Login | Data pengguna saat ini. |
| `POST /api/auth/change-password` | `auth/change-password.post.ts` | Login | Ganti kata sandi, cabut semua sesi. |
| `GET /api/auth/google` | `auth/google.get.ts` | Super Admin | Mulai OAuth untuk menghubungkan Google Drive. |
| `GET /api/auth/google/callback` | `auth/google/callback.get.ts` | Super Admin | Simpan refresh token Drive. |
| `POST /api/account-activation` | `account-activation.post.ts` | Publik (token) | Aktivasi akun peserta. |
| `GET /api/certification-info` | `certification-info/index.get.ts` | Publik | Info periode aktif untuk form pendaftaran. |
| `POST /api/applications/uploads` | `applications/uploads.post.ts` | Publik (rate limited, hanya saat pendaftaran dibuka) | Unggah satu dokumen pendaftaran (multipart `document` + `file`, maks. 4 MB) → `upload_token`. |
| `POST /api/applications/register` | `applications/register.post.ts` | Publik (rate limited) | Kirim pendaftaran (JSON): data pemohon + `documents` (token dari endpoint unggah). |
| `GET /api/certification-types` | `certification-types/index.get.ts` | Verifikator, Super Admin | Jenis sertifikasi. |
| `GET /api/certification-categories` | `certification-categories/index.get.ts` | Verifikator, Super Admin | Kategori. |
| `GET /api/certification-periods` | `certification-periods/index.get.ts` | Verifikator, Super Admin | Daftar periode. Query opsional `stage` (kode tahap atau `PERIOD`) menambah `stage_start_at`/`stage_end_at`. |
| `POST /api/certification-periods` | `certification-periods/index.post.ts` | Super Admin | Buat periode. |
| `PATCH /api/certification-periods/:periodId/status` | `certification-periods/[periodId]/status.patch.ts` | Super Admin | Ubah status periode. |
| `GET /api/certification-timelines/:periodId` | `certification-timelines/[periodId].get.ts` | Verifikator, Super Admin | Periode + timeline. |
| `POST /api/certification-timelines` | `certification-timelines/index.post.ts` | Super Admin | Simpan 8 tahapan. |
| `PATCH /api/certification-timelines/:timelineId/override` | `certification-timelines/[timelineId]/override.patch.ts` | Super Admin | Override `NORMAL`/`OPEN`/`CLOSED`. |
| `GET /api/application-verifications/by-period/:periodId` | `application-verifications/by-period/[periodId].get.ts` | Verifikator, Super Admin | Pengajuan dalam periode. |
| `GET /api/application-verifications/period-summary?periodId=` | `application-verifications/period-summary.get.ts` | Verifikator, Super Admin | Jumlah per status. |
| `GET /api/application-verifications/:applicationId` | `application-verifications/[applicationId].get.ts` | Verifikator, Super Admin | Detail pengajuan + dokumen. |
| `PUT /api/application-verifications/:applicationId/note` | `.../[applicationId]/note.put.ts` | Verifikator, Super Admin | Simpan catatan. |
| `GET /api/application-verifications/:applicationId/documents/:docId/preview` | `.../documents/[applicationDocumentId]/preview.get.ts` | Verifikator, Super Admin | Stream PDF dari Drive. |
| `POST /api/application-verifications` | `application-verifications/index.post.ts` | Verifikator, Super Admin | Keputusan DITERIMA/DITOLAK. |
| `GET /api/assessor-assignments/by-period/:periodId` | `.../by-period/[periodId]/index.get.ts` | Verifikator, Super Admin | Semua peserta diterima (status SA + penugasan), asesor periode & kandidat, status tahap, `canEdit`. |
| `PUT /api/assessor-assignments/by-period/:periodId/assessors` | `.../[periodId]/assessors.put.ts` | Verifikator, Super Admin | Tetapkan asesor periode untuk satu role (`{ role, userIds }`). |
| `POST /api/assessor-assignments/by-period/:periodId/assign` | `.../[periodId]/assign.post.ts` | Verifikator, Super Admin | Tugaskan asesor ke satu/banyak peserta (`{ applicationIds, technicalAssessorId?, publicAssessorId? }`). |
| `GET /api/self-assessment-verifications/by-period/:periodId` | `self-assessment-verifications/by-period/[periodId].get.ts` | Verifikator, Super Admin | Daftar self assessment periode + ringkasan + status tahap. |
| `GET /api/self-assessment-verifications/:applicationId` | `.../[applicationId]/index.get.ts` | Verifikator, Super Admin | Isi CMSP-01 & 02 + riwayat review. |
| `POST /api/self-assessment-verifications/:applicationId/review` | `.../[applicationId]/review.post.ts` | Verifikator, Super Admin | Keputusan `VERIFIED`/`REVISION_REQUESTED` + catatan per form. |
| `GET /api/self-assessment-verifications/:applicationId/files/:fileId` | `.../files/[fileId].get.ts` | Verifikator, Super Admin | Preview berkas yang tertaut ke self assessment. |
| `GET /api/technical-assessments/periods` | `technical-assessments/periods.get.ts` | Asesor Teknis | Periode yang memiliki peserta yang ditugaskan. |
| `GET /api/technical-assessments/by-period/:periodId` | `.../by-period/[periodId].get.ts` | Asesor Teknis (miliknya), Super Admin | Daftar penilaian CMSP-02 periode. |
| `GET/PUT /api/technical-assessments/:applicationId` | `.../[applicationId]/index.{get,put}.ts` | GET: Asesor yang ditugaskan, Super Admin · PUT: Asesor yang ditugaskan, Super Admin | Detail (evidence CMSP-02 + penilaian) / simpan draf atau kirim (`submit`). |
| `POST /api/technical-assessments/:applicationId/reopen` | `.../[applicationId]/reopen.post.ts` | Super Admin | Buka kunci penilaian terkirim. |
| `GET /api/technical-assessments/:applicationId/files/:fileId` | `.../files/[fileId].get.ts` | Asesor yang ditugaskan, Super Admin | Preview berkas evidence CMSP-02 saja. |
| `GET /api/public-assessments/periods` | `public-assessments/periods.get.ts` | Asesor Kepublikan | Periode yang memiliki peserta yang ditugaskan. |
| `GET /api/public-assessments/by-period/:periodId` | `.../by-period/[periodId].get.ts` | Asesor Kepublikan (miliknya), Super Admin | Daftar penilaian CMSP-03 periode. |
| `GET/PUT /api/public-assessments/:applicationId` | `.../[applicationId]/index.{get,put}.ts` | Asesor Kepublikan yang ditugaskan, Super Admin | Detail / simpan draf atau kirim (`submit`); ditolak bila Asesor Teknis belum mengirim "dapat dilanjutkan". |
| `POST /api/public-assessments/:applicationId/reopen` | `.../[applicationId]/reopen.post.ts` | Super Admin | Buka kunci penilaian CMSP-03 terkirim. |
| `GET /api/admin/accounts` | `admin/accounts/index.get.ts` | Super Admin | Daftar akun. |
| `POST /api/admin/accounts` | `admin/accounts/index.post.ts` | Super Admin | Buat akun pegawai. |
| `GET /api/admin/accounts/:id` | `admin/accounts/[id].get.ts` | Super Admin | Detail akun. |
| `POST /api/admin/accounts/:id/reset-password` | `admin/accounts/[id]/reset-password.post.ts` | Super Admin | Atur ulang kata sandi akun lain. |
| `POST /api/admin/accounts/:id/resend-activation` | `admin/accounts/[id]/resend-activation.post.ts` | Super Admin | Kirim ulang tautan aktivasi ke akun peserta berstatus menunggu aktivasi (token lama dicabut). |
| `PATCH /api/admin/accounts/:id/status` | `admin/accounts/[id]/status.patch.ts` | Super Admin | `ACTIVE` / `DISABLED`. |
| `GET /api/peserta/dashboard` | `peserta/dashboard.get.ts` | Peserta | Pengajuan milik peserta + periode + timeline + `progress` (status self assessment & evaluasi, apakah masih dapat dikerjakan). |
| `GET /api/home/periods` | `home/periods.get.ts` | Super Admin, Verifikator, Asesor Teknis, Asesor Kepublikan | Periode aktif (Asesor: yang memiliki peserta ditugaskan) + timeline untuk beranda. |
| `GET /api/peserta/applications/:applicationId/self-assessment` | `peserta/applications/[applicationId]/self-assessment/index.get.ts` | Peserta (pemilik) | Data CMSP-01 & 02, status, izin edit, catatan perbaikan, profil (hanya untuk isian awal). |
| `PUT /api/peserta/applications/:applicationId/self-assessment` | `.../self-assessment/index.put.ts` | Peserta (pemilik) | Simpan draft CMSP-01 & 02 sekaligus. |
| `POST /api/peserta/applications/:applicationId/self-assessment/submit` | `.../self-assessment/submit.post.ts` | Peserta (pemilik) | Submit keduanya (server mengecek kelengkapan). |
| `POST /api/peserta/applications/:applicationId/self-assessment/files` | `.../self-assessment/files/index.post.ts` | Peserta (pemilik) | Unggah file (multipart `purpose` + `file`). |
| `GET /api/peserta/applications/:applicationId/self-assessment/files/:fileId` | `.../self-assessment/files/[fileId].get.ts` | Peserta (pemilik) | Preview/unduh berkas miliknya. |
| `GET/POST /api/evaluation/questions` | `evaluation/questions/index.{get,post}.ts` | Super Admin | Daftar / tambah soal. |
| `POST /api/evaluation/questions/import` | `evaluation/questions/import.post.ts` | Super Admin | Import soal hasil baca Excel (`{ questions }`, 1–200). Divalidasi ulang per soal; semua atau tidak sama sekali; ditulis sekali append (`createQuestions`). |
| `PUT /api/evaluation/questions/:questionId` | `.../[questionId]/index.put.ts` | Super Admin | Ubah soal (ditolak bila sudah dipakai peserta). |
| `PATCH /api/evaluation/questions/:questionId/status` | `.../[questionId]/status.patch.ts` | Super Admin | Arsipkan / aktifkan (`{ status }`). |
| `GET/POST /api/evaluation/packages` | `evaluation/packages/index.{get,post}.ts` | Super Admin | Daftar / buat paket. |
| `GET/PUT /api/evaluation/packages/:packageId` | `.../[packageId]/index.{get,put}.ts` | Super Admin | Detail / ubah paket. |
| `PATCH /api/evaluation/packages/:packageId/status` | `.../[packageId]/status.patch.ts` | Super Admin | Arsipkan / aktifkan paket. |
| `GET/PUT /api/evaluation/periods/:periodId` | `evaluation/periods/[periodId].{get,put}.ts` | Super Admin | Pengaturan evaluasi periode + status snapshot + nilai peserta / simpan & terapkan (buat snapshot). |
| `GET /api/evaluation/attempts/:attemptId` | `evaluation/attempts/[attemptId]/index.get.ts` | Super Admin | Detail hasil evaluasi satu pengerjaan. |
| `POST /api/evaluation/attempts/:attemptId/reset` | `evaluation/attempts/[attemptId]/reset.post.ts` | Super Admin | Reset progres evaluasi peserta (status `RESET`). |
| `GET /api/peserta/applications/:applicationId/evaluation` | `.../evaluation/index.get.ts` | Peserta (pemilik) | Status, kelayakan, soal & jawaban (tanpa kunci/nilai). |
| `POST /api/peserta/applications/:applicationId/evaluation/start` | `.../evaluation/start.post.ts` | Peserta (pemilik) | Mulai: ambil N soal acak + acak opsi, tetapkan batas waktu. |
| `PUT /api/peserta/applications/:applicationId/evaluation/answers` | `.../evaluation/answers.put.ts` | Peserta (pemilik) | Autosave seluruh jawaban (`{ answers }`). |
| `POST /api/peserta/applications/:applicationId/evaluation/submit` | `.../evaluation/submit.post.ts` | Peserta (pemilik) | Kirim jawaban & nilai otomatis. |
| `GET /api/profile` | `profile/index.get.ts` | Login | Profil pengguna saat ini. |
| `PATCH /api/profile` | `profile/index.patch.ts` | Login | Perbarui profil (nama, jenis kelamin, tempat/tanggal lahir, instansi, telepon). |

### `server/services/` — Logika Bisnis

| File | Fungsi |
| --- | --- |
| `auth.service.ts` | Login, validasi sesi (`getAuthenticatedUser`), ganti kata sandi. |
| `account-activation.service.ts` | Aktivasi akun peserta dengan token. |
| `registration.service.ts` | Pendaftaran dua langkah: `uploadRegistrationDocument` (validasi PDF → unggah Drive → catat berkas, token = ID file Drive) lalu `processRegistration` (validasi data & token: berkas guest, belum tertaut, < 24 jam → simpan pengajuan, tautkan dokumen, ganti nama berkas di Drive). |
| `application.service.ts` | Validasi data pendaftaran, cek tahap Pendaftaran dibuka, cek konflik NIP/email, buat person & application. |
| `application-verification.service.ts` | Keputusan verifikasi (idempotent): riwayat, ubah status, superseded, siapkan akun, kirim email. |
| `application-verification-detail.service.ts` | Gabungkan pengajuan + dokumen + data file. |
| `application-verification-list.service.ts` | Ringkasan jumlah pengajuan per status dalam periode. |
| `application-verification-note.service.ts` | Simpan catatan verifikator (hanya saat `pending_verification`). |
| `application-document.service.ts` | `toPublicFile()`, `sendStoredFile()` (kirim isi berkas dari Drive), preview dokumen pendaftaran untuk Verifikator. |
| `peserta-application.service.ts` | `requireOwnedApplication()` (cek kepemilikan), `getCertificationInfo()`. |
| `self-assessment.service.ts` | Baca/simpan draft/submit CMSP-01 & 02, hak edit (status + jadwal tahap), validasi payload, cek kepemilikan berkas, unggah & preview berkas. `loadSelfAssessmentContent()` dipakai ulang oleh verifikasi. |
| `assessor-assignment.service.ts` | Daftar & simpan penugasan asesor (tahap `SELF_ASSESSMENT_VERIFICATION`, SA `VERIFIED`, asesor aktif sesuai role; Asesor Teknis tidak dapat diganti bila penilaiannya sudah dimulai). |
| `technical-assessment.service.ts` | Penilaian CMSP-02 Asesor Teknis: daftar periode/peserta yang ditugaskan, detail, simpan draf/kirim (tahap `ASSESSOR_ASSESSMENT`), buka kunci (Super Admin), berkas evidence. |
| `public-assessment.service.ts` | Penilaian CMSP-03 Asesor Kepublikan: daftar periode/peserta, detail, simpan draf/kirim (tahap `ASSESSOR_ASSESSMENT` + syarat hasil Asesor Teknis), buka kunci (Super Admin). |
| `self-assessment-verification.service.ts` | Daftar, detail, dan keputusan verifikasi self assessment (dijaga tahap `SELF_ASSESSMENT_VERIFICATION`). |
| `evaluation-admin.service.ts` | Bank soal, paket soal, perencanaan evaluasi periode & daftar nilai (Super Admin); aturan penguncian. |
| `evaluation-attempt.service.ts` | Pengerjaan peserta: kelayakan, mulai (acak soal/opsi), autosave, submit, penilaian `scoreAttempt()`, tutup otomatis saat waktu habis. |
| `profile.service.ts` | Baca & validasi/perbarui profil; sinkron nama ke akun. |
| `certification-stage.service.ts` | `getStageAccess()` / `assertStageOpen()` — cek tahap timeline dibuka (jadwal + override). |
| `peserta-account-provisioning.service.ts` | Buat/ambil akun peserta & token aktivasi, kirim email aktivasi, kirim ulang tautan aktivasi (`resendPesertaActivation`). |
| `certification-period.service.ts` | Buat periode & aturan transisi status. |
| `certification-timeline.service.ts` | Validasi & simpan 8 tahapan timeline. |
| `google-oauth.service.ts` | OAuth Google untuk Drive; simpan/muat refresh token. |
| `google-drive.service.ts` | Unggah & unduh berkas Drive. |

### `server/repositories/` — Akses Data

Satu file per sheet. Detail kolom di [04-database.md](04-database.md).

| File | Sheet | Spreadsheet |
| --- | --- | --- |
| `user.repository.ts` | `users` | Auth |
| `session.repository.ts` | `sessions` | Auth |
| `account-activation-token.repository.ts` | `activation_tokens` | Auth |
| `person.repository.ts` | `persons` | Data |
| `certification-type.repository.ts` | `certification_types` | Data |
| `certification-category.repository.ts` | `certification_categories` | Data |
| `certification-period.repository.ts` | `certification_periods` | Data |
| `certification-timeline.repository.ts` | `certification_timelines` | Data |
| `application.repository.ts` | `applications` | Data |
| `application-document.repository.ts` | `application_documents` | Data |
| `application-verification.repository.ts` | `application_verifications` | Data |
| `file.repository.ts` | `files` | Data |
| `self-assessment.repository.ts` | `cmsp01_*`, `cmsp02_*`, `self_assessment_reviews` | Data |
| `assessor-assignment.repository.ts` | `period_assessors`, `assessor_assignments` (tulis massal), `assessor_assignment_logs` | Data |
| `technical-assessment.repository.ts` | `technical_assessments` (upsert per pengajuan; format `unit_results`) | Data |
| `public-assessment.repository.ts` | `public_assessments` (upsert per pengajuan; format `unit_results` sama dengan teknis) | Data |
| `evaluation.repository.ts` | `evaluation_questions`, `evaluation_packages`, `period_evaluations`, `evaluation_snapshot_questions`, `evaluation_attempts` (helper tabel generik `createTable` + `createMany`) | Data |

## `shared/`

| File | Fungsi |
| --- | --- |
| `shared/utils/person.ts` | `GENDER_OPTIONS`, `normalizeGender()`, batas panjang field profil. |
| `shared/utils/self-assessment.ts` | Status self assessment + label, jenis dokumen CMSP-01, jenis unggahan & tipe file yang diizinkan, batas jumlah baris. |
| `shared/utils/cmsp02-units.ts` | 10 unit kompetensi CMSP-02 (kode, elemen, contoh evidence). |
| `shared/utils/evidence-link.ts` | `parseEvidenceLink()`: kenali link YouTube / file Drive (embed) vs folder Drive / website lain (tab baru). |
| `shared/utils/technical-assessment.ts` | Tahap `ASSESSOR_ASSESSMENT`, hasil `K`/`BK`, rekomendasi `CONTINUE`/`NOT_CONTINUE`, label status, batas catatan. |
| `shared/utils/cmsp03-units.ts` | 3 unit kompetensi CMSP-03 (kode internal `KEP.n`, elemen, indikator penilaian). |
| `shared/utils/public-assessment.ts` | Status daftar CMSP-03 (`WAITING`, `STOPPED`, + status teknis) + label, syarat hasil Asesor Teknis (`TechnicalGate`). |
| `shared/utils/evaluation.ts` | Huruf opsi `A`–`E`, 2–5 opsi, pilihan durasi 30/45/60/90, batas panjang teks evaluasi. |
| `shared/utils/evaluation-import.ts` | Import soal Excel: nama kolom template, batas (200 soal, 2 MB), `parseQuestionImportSheet` (baris → soal + galat), kunci duplikat. |
| `shared/utils/documents.ts` | Jenis dokumen pendaftaran + label/ikon, `MAX_PDF_SIZE_BYTES`. |
| `shared/utils/roles.ts` | `USER_ROLES`, `STAFF_ROLES`, `ROLE_LABELS`, `ROLE_HOME_PATHS`, `ACCOUNT_STATUSES`, `normalizeUserRole()`, `getRoleLabel()`, `getAccountStatusLabel()`. |

## `scripts/`

| File | Fungsi |
| --- | --- |
| `create-super-admin.ts` | Membuat akun Super Admin secara interaktif (`npm run create-super-admin`). Menolak bila sudah ada Super Admin aktif (hanya satu Super Admin). |

## `public/`

| File | Fungsi |
| --- | --- |
| `favicon.ico` | Ikon tab browser. |
| `robots.txt` | Aturan crawler mesin pencari. |
| `logo-lan.png`, `favicon-lan.svg` | Logo LAN (brand & favicon). |
| `templates/template-import-soal.xlsx` | Template import soal: sheet **Soal** (Topik, Pertanyaan, Opsi A–E, Kunci Jawaban) + sheet **Petunjuk**. |

## Folder yang Dibuat Otomatis (jangan diedit/commit)

`.nuxt/`, `.output/`, `node_modules/`.
