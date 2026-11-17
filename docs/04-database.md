# 04 — Database (Google Sheets)

Database terdiri dari **dua spreadsheet**:

| Spreadsheet | Env | Isi | Kenapa dipisah |
| --- | --- | --- | --- |
| **Auth** | `AUTH_SPREADSHEET_ID` | `users`, `sessions`, `activation_tokens` | Berisi hash kata sandi & token; aksesnya dibatasi lebih ketat. |
| **Data** | `GOOGLE_SPREADSHEET_ID` | Semua data operasional lainnya | Boleh dibuka tim operasional. |

## Aturan Umum

- **Baris 1 = header** (nama kolom persis seperti tabel di bawah). Data mulai baris 2.
- **Urutan kolom penting.** Repository membaca berdasarkan posisi (`row[0]`, `row[1]`, ...),
  bukan nama header. Menyisipkan kolom di tengah akan merusak data → tambah kolom **di akhir**
  dan perbarui repository + dokumen ini.
- Semua nilai disimpan sebagai teks. Tanggal = ISO 8601 UTC (`2026-11-13T02:30:00.000Z`).
  Boolean = `TRUE` / `FALSE`.
- **ID** dibuat aplikasi: `PREFIX-` + 6 digit (mis. `APP-000012`), nomor terbesar + 1.
- Jangan mengedit manual kolom hash/token. Edit manual lain sebaiknya hanya saat darurat.
- Spreadsheet harus dibagikan ke email Service Account sebagai **Editor**.

## Relasi

```
certification_types 1──* certification_categories
        │                        │
        └──────1──* certification_periods *──1┘
                          │
                          ├──1──* certification_timelines   (8 baris per periode)
                          │
persons 1──* applications *──1┘
   │            │
   │            ├──1──* application_documents *──1── files
   │            └──1──* application_verifications
   │
users (Auth) *──1 persons      users 1──* sessions
                               users 1──* activation_tokens
```

---

## Spreadsheet Auth

### `users`
Akun login semua role. Repository: `user.repository.ts`. ID: `USR-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `user_id` | ID akun |
| B | `person_id` | Relasi ke `persons` (wajib untuk `PESERTA`, kosong untuk pegawai) |
| C | `full_name` | Nama lengkap |
| D | `username_email` | Email login (huruf kecil, unik) |
| E | `password_hash` | Hash bcrypt |
| F | `role` | `SUPER_ADMIN` / `VERIFIKATOR` / `TECHNICAL_ASSESSOR` / `PUBLIC_ASSESSOR` / `PESERTA` |
| G | `account_status` | `PENDING_ACTIVATION` / `ACTIVE` / `SUSPENDED` / `DISABLED` |
| H | `email_verified_at` | Waktu aktivasi via email (peserta) |
| I | `password_changed_at` | Waktu terakhir ganti kata sandi |
| J | `created_at` | — |
| K | `updated_at` | — |
| L | `last_login_at` | Waktu login terakhir |

> Nilai lama `VERIFIER` dan `PARTICIPANT` masih dibaca sebagai `VERIFIKATOR` dan `PESERTA`
> (alias sementara di `shared/utils/roles.ts`). Ganti nilainya di sheet, lalu alias boleh dihapus.

### `sessions`
Sesi login. Repository: `session.repository.ts`. ID: `SES-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `session_id` | ID sesi |
| B | `user_id` | Relasi ke `users` |
| C | `session_token_hash` | SHA-256 dari token di cookie `cmsp_session` |
| D | `expires_at` | Kedaluwarsa (8 jam setelah login) |
| E | `revoked_at` | Diisi saat logout/ganti kata sandi/akun dinonaktifkan |
| F | `created_at` | — |
| G | `last_seen_at` | Aktivitas terakhir (diperbarui maks. tiap 5 menit) |
| H | `ip_address` | IP saat login |

Sheet ini terus bertambah. Baris yang `expires_at`-nya sudah lewat aman dihapus berkala
**[saran: buat pembersihan otomatis]**.

### `activation_tokens`
Token aktivasi akun peserta. Repository: `account-activation-token.repository.ts`. ID: `ACT-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `activation_token_id` | ID token |
| B | `user_id` | Relasi ke `users` |
| C | `token_hash` | SHA-256 dari token di tautan email |
| D | `expires_at` | Kedaluwarsa (24 jam) |
| E | `used_at` | Diisi saat dipakai **atau dicabut** (token baru diterbitkan) |
| F | `created_at` | — |
| G | `created_by` | Selalu `SYSTEM` |

---

## Spreadsheet Data

### `certification_types`
Master jenis sertifikasi. **Diisi manual** (belum ada UI). Repository: `certification-type.repository.ts`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `certification_type_id` | ID (bebas, mis. `CT-001`) |
| B | `type_name` | Nama jenis sertifikasi |
| C | `created_at` | — |
| D | `updated_at` | — |

### `certification_categories`
Master kategori per jenis. **Diisi manual.** Repository: `certification-category.repository.ts`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `category_id` | ID (bebas) |
| B | `certification_type_id` | Relasi ke `certification_types` |
| C | `category_name` | Nama kategori |
| D | `created_at` | — |
| E | `updated_at` | — |

### `certification_periods`
Periode/gelombang sertifikasi. Repository: `certification-period.repository.ts`. ID: `PER-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `period_id` | ID periode |
| B | `certification_type_id` | Relasi |
| C | `category_id` | Relasi |
| D | `period_name` | Nama periode (mis. "Periode I 2026") |
| E | `period_status` | `DRAFT` / `ACTIVE` / `CLOSED` / `COMPLETED` |
| F | `created_by` | `user_id` pembuat |
| G | `created_at` | — |
| H | `updated_at` | — |

### `certification_timelines`
8 tahapan per periode. Repository: `certification-timeline.repository.ts`. ID: `TL-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `timeline_id` | ID |
| B | `period_id` | Relasi |
| C | `stage_order` | 1–8 |
| D | `stage_code` | `REGISTRATION`, `DOCUMENT_VERIFICATION`, `SELF_ASSESSMENT`, `SELF_ASSESSMENT_VERIFICATION`, `EVALUATION`, `ASSESSOR_ASSESSMENT`, `ASSESSMENT_VERIFICATION`, `ANNOUNCEMENT` |
| E | `stage_name` | Nama tampilan |
| F | `start_at` | Mulai |
| G | `end_at` | Selesai |
| H | `is_override_open` | `FALSE`/`NORMAL` (ikut jadwal), `OPEN`, `CLOSED` (`TRUE` lama = `OPEN`) |
| I | `override_by` | `user_id` yang melakukan override |
| J | `override_at` | Waktu override |
| K | `created_at` | — |
| L | `updated_at` | — |

### `persons`
Data induk individu (berdasarkan NIP). Repository: `person.repository.ts`. ID: `PER-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `person_id` | ID person |
| B | `full_name` | Nama lengkap |
| C | `nip` | NIP 18 digit (unik) |
| D | `email` | Email (unik) |
| E | `phone_number` | Nomor WhatsApp |
| F | `institution_name` | Instansi |
| G | `region` | Asal daerah |
| H | `education_level` | Pendidikan terakhir |
| I | `position_name` | Jabatan |
| J | `created_at` | — |
| K | `updated_at` | — |
| L | `gender` | `Laki-laki` / `Perempuan` (diisi peserta di Profil) |
| M | `birth_place` | Tempat lahir |
| N | `birth_date` | Tanggal lahir, format `YYYY-MM-DD` |

Kolom L–N ditambahkan 15 Nov 2026 untuk halaman Profil; kosong untuk data lama sampai
peserta melengkapinya. `nip` dan `email` tidak dapat diubah peserta dari Profil.

> ⚠️ Prefix ID `PER-` sama dengan `certification_periods`. Tidak bentrok secara teknis
> (beda sheet) tetapi membingungkan saat membaca data. Lihat [07-status-pengembangan.md](07-status-pengembangan.md).

### `applications`
Pengajuan sertifikasi (satu person, satu periode). Data diri disimpan sebagai *snapshot*
saat mendaftar. Repository: `application.repository.ts`. ID: `APP-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `application_id` | ID pengajuan |
| B | `person_id` | Relasi ke `persons` |
| C | `period_id` | Relasi ke `certification_periods` |
| D | `category_id` | Kategori periode saat mendaftar |
| E | `full_name_snapshot` | Nama saat mendaftar |
| F | `nip_snapshot` | NIP saat mendaftar |
| G | `institution_name` | Instansi |
| H | `region` | Daerah |
| I | `email_snapshot` | Email |
| J | `phone_snapshot` | WhatsApp |
| K | `last_education` | Pendidikan terakhir |
| L | `position` | Jabatan |
| M | `application_status` | `pending_verification` / `accepted` / `rejected` / `superseded` |
| N | `verification_note` | Catatan verifikator |
| O | `submitted_at` | Waktu pengajuan |
| P | `created_at` | — |
| Q | `updated_at` | — |

### `application_documents`
Dokumen persyaratan per pengajuan. Repository: `application-document.repository.ts`. ID: `APP-DOC-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `application_document_id` | ID |
| B | `application_id` | Relasi |
| C | `document_type` | `IJAZAH`, `SK_JABATAN`, `SERTIFIKAT_COACHING_MENTORING`, `BUKTI_PRAKTIK_COACHING_MENTORING` |
| D | `file_id` | Relasi ke `files` (berkas terbaru; berubah saat peserta mengganti dokumen) |
| E | `is_required` | `TRUE`/`FALSE` |
| F | `uploaded_at` | — |
| G | `status` | Default `active` |
| H | `created_at` | — |
| I | `updated_at` | — |

### `application_verifications`
Riwayat keputusan verifikasi berkas (maks. satu per pengajuan). Repository:
`application-verification.repository.ts`. ID: `APP-VER-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `application_verification_id` | ID |
| B | `application_id` | Relasi |
| C | `verified_by` | `user_id` verifikator |
| D | `verification_status` | `DITERIMA` / `DITOLAK` |
| E | `verification_note` | Catatan saat keputusan |
| F | `verified_at` | Waktu keputusan |
| G | `created_at` | — |
| H | `updated_at` | — |

### `files`
Metadata berkas yang disimpan di Google Drive. Repository: `file.repository.ts`. ID: `FILE-000001`.

| # | Kolom | Isi |
| --- | --- | --- |
| A | `file_id` | ID |
| B | `original_file_name` | Nama file asli dari pengguna |
| C | `storage_provider` | `GOOGLE_DRIVE` |
| D | `storage_file_id` | ID file di Drive |
| E | `file_url` | Link Drive (tidak dipakai untuk preview; preview lewat backend) |
| F | `mime_type` | `application/pdf` |
| G | `file_size_bytes` | Ukuran |
| H | `uploaded_by` | `GUEST_REGISTRATION` atau `user_id` |
| I | `uploaded_at` | — |
| J | `status` | `active`, atau `replaced` jika dokumen sudah diganti peserta (berkas lama tetap di Drive sebagai jejak audit) |

---

---

## Self Assessment (CMSP-01 & CMSP-02)

Data hasil isian peserta **berdiri sendiri**: data diri disalin (bukan ditautkan) dari
Profil saat pertama kali diisi, dan dokumen CMSP-01 disalin dari dokumen pendaftaran.
Mengubah Profil/Application tidak mengubah data ini, dan sebaliknya. Repository:
`self-assessment.repository.ts`. Satu baris per pengajuan di sheet `*_submissions`;
baris anak (pelatihan, praktik, dokumen, evidence) ditimpa setiap Simpan Draft
(baris lama dipakai ulang, kelebihan dikosongkan).

Status (`cmsp01_submissions.status` = `cmsp02_submissions.status`, selalu sama):
`DRAFT` → `SUBMITTED` → (`REVISION_REQUESTED` → `SUBMITTED`)* → `VERIFIED`.
Simpan Draft & Submit selalu memproses CMSP-01 dan CMSP-02 bersamaan.

### `cmsp01_submissions` — ID `C01-000001`

| # | Kolom | Isi |
| --- | --- | --- |
| A | `cmsp01_id` | ID |
| B | `application_id` | Relasi ke `applications` (satu baris per pengajuan) |
| C | `period_id` | Periode (untuk daftar per periode) |
| D | `status` | Lihat di atas |
| E | `full_name` | Salinan data pemohon |
| F | `nip` | 18 digit |
| G | `rank_name` | Pangkat |
| H | `rank_group` | Golongan ruang |
| I | `gender` | `Laki-laki`/`Perempuan` |
| J | `birth_place` | — |
| K | `birth_date` | `YYYY-MM-DD` |
| L | `phone_number` | — |
| M | `email` | — |
| N | `institution_name` | Instansi |
| O | `work_unit` | Unit kerja |
| P | `position_name` | Jabatan |
| Q | `latest_education` | Pendidikan terakhir |
| R | `education_qualification` | Kualifikasi pendidikan |
| S | `domicile_address` | Alamat domisili |
| T | `declaration_accepted` | `TRUE`/`FALSE` — pernyataan pemohon |
| U | `declaration_accepted_at` | — |
| V | `submitted_at` | Waktu submit terakhir |
| W | `revision_count` | Jumlah submit ulang setelah perbaikan |
| X | `created_at` | — |
| Y | `updated_at` | — |

### `cmsp01_trainings` — ID `C01T-000001`

| # | Kolom | Isi |
| --- | --- | --- |
| A | `cmsp01_training_id` | ID |
| B | `cmsp01_id` | Induk |
| C | `sort_order` | Urutan tampil |
| D | `training_name` | — |
| E | `organizer` | Penyelenggara |
| F | `year` | 4 digit |
| G | `jp` | Jumlah JP |
| H | `created_at` | — |
| I | `updated_at` | — |

### `cmsp01_practices` — ID `C01P-000001`

| # | Kolom | Isi |
| --- | --- | --- |
| A | `cmsp01_practice_id` | ID |
| B | `cmsp01_id` | Induk |
| C | `sort_order` | Urutan tampil |
| D | `year` | 4 digit |
| E | `coachee_mentee` | Nama coachee/mentee |
| F | `topic` | Topik |
| G | `duration_minutes` | Durasi dalam **menit** |
| H | `created_at` | — |
| I | `updated_at` | — |

### `cmsp01_documents` — ID `C01D-000001`

| # | Kolom | Isi |
| --- | --- | --- |
| A | `cmsp01_document_id` | ID |
| B | `cmsp01_id` | Induk |
| C | `document_type` | `IJAZAH`, `SK_JABATAN`, `SERTIFIKAT_COACHING_MENTORING`, `BUKTI_PRAKTIK_COACHING_MENTORING`, `KTP`, `SURAT_TUGAS` |
| D | `file_id` | Relasi ke `files` |
| E | `source` | `APPLICATION` (disalin dari pendaftaran) / `UPLOAD` (diunggah/diganti di CMSP-01) |
| F | `created_at` | — |
| G | `updated_at` | — |

### `cmsp02_submissions` — ID `C02-000001`

| # | Kolom | Isi |
| --- | --- | --- |
| A | `cmsp02_id` | ID |
| B | `application_id` | Relasi |
| C | `period_id` | — |
| D | `status` | Sama dengan CMSP-01 |
| E | `submitted_at` | — |
| F | `revision_count` | — |
| G | `created_at` | — |
| H | `updated_at` | — |

### `cmsp02_evidences` — ID `C02E-000001`

| # | Kolom | Isi |
| --- | --- | --- |
| A | `cmsp02_evidence_id` | ID |
| B | `cmsp02_id` | Induk |
| C | `unit_code` | Kode unit (`UK.CMSP.1` … `UK.MSP.3`, lihat `shared/utils/cmsp02-units.ts`) |
| D | `sort_order` | Urutan dalam unit (1 = paling atas/terbaru) |
| E | `evidence_name` | — |
| F | `evidence_type` | `FILE`/`URL` |
| G | `file_id` | Relasi ke `files` jika `FILE` |
| H | `url` | Link http/https jika `URL` |
| I | `description` | Opsional |
| J | `created_at` | — |
| K | `updated_at` | — |

### `self_assessment_reviews` — ID `SAR-000001` (riwayat keputusan Verifikator; satu baris per keputusan)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `review_id` | ID |
| B | `application_id` | Relasi |
| C | `decision` | `REVISION_REQUESTED` / `VERIFIED` |
| D | `cmsp01_note` | Catatan untuk CMSP-01 |
| E | `cmsp02_note` | Catatan untuk CMSP-02 |
| F | `reviewed_by` | `user_id` verifikator |
| G | `reviewed_at` | — |
| H | `created_at` | — |

### `period_assessors` — ID `PAS-000001` (asesor yang bertugas pada sebuah periode)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `period_assessor_id` | ID |
| B | `period_id` | Relasi ke `certification_periods` |
| C | `user_id` | Akun asesor |
| D | `assessor_role` | `TECHNICAL_ASSESSOR` / `PUBLIC_ASSESSOR` |
| E | `status` | `ACTIVE` / `REMOVED` (baris tidak dihapus agar riwayat tetap ada) |
| F | `added_by` | `user_id` yang menambahkan |
| G | `added_at` | — |
| H | `updated_by` | — |
| I | `updated_at` | — |

### `assessor_assignments` — ID `ASG-000001` (penugasan asesor; satu baris per pengajuan)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `assignment_id` | ID |
| B | `application_id` | Relasi ke `applications` |
| C | `period_id` | Relasi ke `certification_periods` |
| D | `technical_assessor_id` | `user_id` Asesor Teknis |
| E | `public_assessor_id` | `user_id` Asesor Kepublikan |
| F | `assigned_by` | `user_id` yang pertama menugaskan |
| G | `assigned_at` | — |
| H | `updated_by` | `user_id` yang terakhir mengubah |
| I | `updated_at` | — |

### `assessor_assignment_logs` — ID `AAL-000001` (riwayat penugasan & pergantian asesor)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `log_id` | ID |
| B | `application_id` | Relasi |
| C | `period_id` | Relasi |
| D | `assessor_role` | `TECHNICAL_ASSESSOR` / `PUBLIC_ASSESSOR` |
| E | `old_assessor_id` | Kosong jika penugasan pertama |
| F | `new_assessor_id` | — |
| G | `reason` | Wajib diisi saat mengganti asesor yang sudah ada |
| H | `changed_by` | `user_id` Verifikator/Super Admin |
| I | `changed_at` | — |

### `technical_assessments` — ID `TAS-000001` (penilaian CMSP-02 Asesor Teknis; satu baris per pengajuan)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `technical_assessment_id` | ID |
| B | `application_id` | Relasi |
| C | `period_id` | Relasi |
| D | `assessor_id` | `user_id` Asesor Teknis yang menilai |
| E | `unit_results` | Hasil per unit: `UK.CMSP.1=K;UK.CMSP.2=BK;...` (unit belum dinilai tidak dicantumkan) |
| F | `note` | Catatan umum (maks. 3000; wajib bila `NOT_CONTINUE`) |
| G | `recommendation` | `CONTINUE` (dapat dilanjutkan) / `NOT_CONTINUE` (tidak dapat dilanjutkan) |
| H | `status` | `DRAFT` / `SUBMITTED` (terkunci) |
| I | `submitted_at` | — |
| J | `created_at` | — |
| K | `updated_at` | — |
| L | `reopened_by` | `user_id` Super Admin yang terakhir membuka kunci |
| M | `reopened_at` | — |

Header siap tempel:

```text
technical_assessment_id	application_id	period_id	assessor_id	unit_results	note	recommendation	status	submitted_at	created_at	updated_at	reopened_by	reopened_at
```

Berkas KTP, Surat Tugas, evidence, dan dokumen pengganti dicatat di sheet `files`
(`uploaded_by` = `user_id` peserta). Tipe yang diterima dideteksi dari isi file:
dokumen pendaftaran PDF; KTP/Surat Tugas PDF/JPG/PNG; evidence PDF/DOC/DOCX; maks. 5 MB.

## Evaluasi Pilihan Ganda

Dikelola Super Admin (bank soal → paket soal → pengaturan per periode); dikerjakan Peserta.
Kunci jawaban & nilai **tidak pernah** dikirim ke Peserta.

**Model snapshot:** bank soal & paket selalu dapat diubah. "Simpan & Terapkan" pada Perencanaan
Evaluasi menyalin isi soal paket ke `evaluation_snapshot_questions`; peserta yang mulai sesudahnya
memakai snapshot itu dan setiap pengerjaan mencatat `snapshot_id`-nya, sehingga nilai lama tidak
berubah walau soal diedit atau perencanaan diterapkan ulang.

### `evaluation_questions` — ID `EVQ-000001` (bank soal)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `question_id` | ID |
| B | `topic` | Opsional, untuk pencarian |
| C | `question_text` | Maks. 2000 karakter |
| D–H | `option_a` … `option_e` | 2–5 opsi berurutan mulai A; opsi tak terpakai kosong |
| I | `correct_option` | `A`–`E` (huruf asli) |
| J | `shuffle_options` | **Tidak dipakai lagi** (pengaturan acak pindah ke `period_evaluations`); kolom dibiarkan agar urutan kolom tetap |
| K | `status` | `ACTIVE` / `ARCHIVED` (soal tidak pernah dihapus) |
| L–O | `created_by`, `created_at`, `updated_by`, `updated_at` | — |

Soal tidak dihapus, hanya diarsipkan. Soal yang sudah dipakai tetap dapat diubah (ditandai "sudah digunakan").

### `evaluation_packages` — ID `EVP-000001` (paket soal)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `package_id` | ID |
| B | `package_name` | — |
| C | `description` | Opsional |
| D | `question_ids` | ID soal dipisah koma |
| E | `status` | `ACTIVE` / `ARCHIVED` |
| F–I | `created_by`, `created_at`, `updated_by`, `updated_at` | — |

Paket dapat diubah kapan saja; paket yang dipakai perencanaan periode tidak dapat diarsipkan.

### `period_evaluations` — ID `PEV-000001` (pengaturan evaluasi; satu baris per periode)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `period_evaluation_id` | ID |
| B | `period_id` | Relasi |
| C | `package_id` | Relasi |
| D | `question_count` | N soal per peserta (≤ soal aktif paket) |
| E | `duration_minutes` | `30` / `45` / `60` / `90` |
| F | `passing_grade` | 0–100 |
| G–J | `created_by`, `created_at`, `updated_by`, `updated_at` | — |
| K | `shuffle_questions` | `TRUE` / `FALSE` — acak soal. FALSE = N soal pertama sesuai urutan paket, sama untuk semua peserta. Kosong dianggap TRUE |
| L | `shuffle_options` | `TRUE` / `FALSE` — acak urutan opsi jawaban. Kosong dianggap TRUE |
| M | `snapshot_id` | Snapshot soal yang sedang diterapkan (kosong = belum diterapkan; peserta belum dapat mulai) |
| N | `applied_at` | Waktu terakhir "Simpan & Terapkan" |
| O | `config_version` | Nomor "Konfigurasi ke-N", naik setiap Simpan & Terapkan (kosong pada data lama = ke-1 bila sudah ada snapshot) |

Tidak dikunci. Setiap simpan membuat snapshot baru; peserta yang sudah mulai tetap memakai snapshot lamanya.

### `evaluation_snapshot_questions` — ID `ESQ-000001` (salinan soal per snapshot)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `snapshot_question_id` | ID baris |
| B | `snapshot_id` | `SNP-xxxxxxxxxxxx` — satu kali "Simpan & Terapkan" |
| C | `question_id` | ID soal asal di bank soal |
| D | `topic` | Salinan |
| E | `question_text` | Salinan |
| F–J | `option_a` … `option_e` | Salinan |
| K | `correct_option` | Salinan kunci (dipakai untuk menilai) |
| L | `created_at` | — |

Urutan baris dalam satu snapshot = urutan soal di paket (dipakai bila acak soal nonaktif). Hanya ditambah, tidak pernah diubah.

### `evaluation_attempts` — ID `EVA-000001` (pengerjaan; satu baris aktif per pengajuan)

| # | Kolom | Isi |
| --- | --- | --- |
| A | `attempt_id` | ID |
| B | `application_id` | Relasi |
| C | `period_id` | Relasi |
| D | `package_id` | Paket saat mulai |
| E | `question_ids` | Urutan soal untuk peserta ini (dipisah koma) |
| F | `option_orders` | Urutan opsi per soal dalam huruf asli, dipisah `\|` (mis. `CADB\|BA`) |
| G | `answers` | Jawaban per soal dalam huruf asli, dipisah `\|` (kosong = tidak dijawab) |
| H | `duration_minutes` | Snapshot saat mulai |
| I | `passing_grade` | Snapshot saat mulai |
| J | `started_at` | — |
| K | `deadline_at` | Mulai + durasi, terpotong akhir tahap `EVALUATION` |
| L | `submitted_at` | Untuk submit otomatis = `deadline_at` |
| M | `submit_type` | `MANUAL` / `AUTO` (waktu habis) |
| N | `status` | `IN_PROGRESS` / `SUBMITTED` / `RESET` (direset Super Admin; diabaikan, peserta boleh mulai lagi) |
| O | `correct_count` | Diisi saat dinilai |
| P | `total_questions` | — |
| Q | `score` | 0–100, dua desimal (benar ÷ total × 100) |
| R | `updated_at` | Waktu autosave terakhir |
| S | `snapshot_id` | Snapshot soal yang dipakai (kosong = data lama, dinilai dari bank soal) |
| T | `reset_by` | User ID Super Admin yang mereset |
| U | `reset_at` | Waktu reset |
| V | `config_version` | Nomor konfigurasi perencanaan saat peserta mulai (kosong = sebelum ada versi; ditampilkan "Versi awal") |

Header siap tempel (baris 1 tiap sheet, dipisah tab):

```text
evaluation_questions  question_id	topic	question_text	option_a	option_b	option_c	option_d	option_e	correct_option	shuffle_options	status	created_by	created_at	updated_by	updated_at
evaluation_packages   package_id	package_name	description	question_ids	status	created_by	created_at	updated_by	updated_at
period_evaluations    period_evaluation_id	period_id	package_id	question_count	duration_minutes	passing_grade	created_by	created_at	updated_by	updated_at	shuffle_questions	shuffle_options	snapshot_id	applied_at	config_version
evaluation_snapshot_questions  snapshot_question_id	snapshot_id	question_id	topic	question_text	option_a	option_b	option_c	option_d	option_e	correct_option	created_at
evaluation_attempts   attempt_id	application_id	period_id	package_id	question_ids	option_orders	answers	duration_minutes	passing_grade	started_at	deadline_at	submitted_at	submit_type	status	correct_count	total_questions	score	updated_at	snapshot_id	reset_by	reset_at	config_version
```

---

## Menambah Sheet Baru (checklist)

1. Buat sheet dengan header di baris 1 pada spreadsheet yang tepat (Auth hanya untuk data kredensial).
2. Buat `server/repositories/<nama>.repository.ts`: type, `SHEET_NAME`, `rowToX()`, `xToRow()`,
   generator ID, fungsi `find*/create*/update*`.
3. Tambahkan tabelnya ke dokumen ini (nama kolom, urutan, nilai yang mungkin).
4. Perbarui [03-struktur-proyek.md](03-struktur-proyek.md).

## Sheet yang Kemungkinan Dibutuhkan (usulan, sesuai probis)

Belum dibuat. Nama dan kolom final ditentukan saat fitur dirancang.

| Usulan sheet | Untuk langkah | Isi pokok |
| --- | --- | --- |
| `assessments` | Penilaian asesor | `assignment_id`, form (`CMSP_02`/`CMSP_03`), catatan umum, status, waktu submit |
| `assessment_items` | Nilai per indikator | `assessment_id`, kode indikator, `K`/`BK` (CMSP-02) atau nilai CMSP-03, catatan |
| `graduation_results` | Penetapan kelulusan | `LULUS`/`TIDAK_LULUS`, `decided_by`, percobaan ke- (awal/remedial) |
| `remedial_submissions` | Bukti remedial (1x) | `application_id`, link bukti, keterangan, waktu kirim |
| `certificates` | Sertifikat | nomor sertifikat, `file_id` PDF, tanggal terbit |
