# 08 — Keputusan & Skenario

Catatan skenario yang pernah dibahas bersama pemilik proyek beserta **keputusan yang disepakati**
dan cara sistem menerapkannya. Tujuannya agar alasan di balik aturan tidak hilang dan tidak
dibahas ulang dari nol.

**Cara memakai dokumen ini**

- Tambahkan entri baru setiap kali ada skenario/kasus yang didiskusikan lalu disepakati.
- Bila keputusan berubah, **jangan hapus** entri lama: tandai "Diganti oleh K-xx" dan tulis entri baru.
- Format setiap entri: konteks → keputusan → penerapan di sistem → tanggal.
- Keputusan proses bisnis tingkat tinggi tetap diringkas di
  [01-gambaran-sistem.md](01-gambaran-sistem.md#keputusan-yang-sudah-dikonfirmasi).

## Daftar Isi

| No | Topik | Tanggal |
| --- | --- | --- |
| K-01 | [Identitas pendaftar: NIP vs email](#k-01--identitas-pendaftar-nip-vs-email) | 22 Nov 2026 |
| K-02 | [Pendaftaran ganda pada periode yang sama](#k-02--pendaftaran-ganda-pada-periode-yang-sama) | 22 Nov 2026 (dicatat) |
| K-03 | [Tautan aktivasi akun](#k-03--tautan-aktivasi-akun) | Nov 2026 |
| K-04 | [Super Admin hanya satu](#k-04--super-admin-hanya-satu) | Nov 2026 |
| K-05 | [Pengacakan opsi jawaban: per periode, bukan per soal](#k-05--pengacakan-opsi-jawaban-per-periode-bukan-per-soal) | Nov 2026 |
| K-06 | [Import soal dari Excel](#k-06--import-soal-dari-excel) | Nov 2026 |
| K-07 | [Pencegahan kecurangan evaluasi ditunda](#k-07--pencegahan-kecurangan-evaluasi-ditunda) | 17 Nov 2026 |
| K-08 | [Penilaian Asesor Kepublikan (CMSP-03)](#k-08--penilaian-asesor-kepublikan-cmsp-03) | 18 Nov 2026 |
| K-09 | [Halaman konfirmasi pendaftaran & email hasil verifikasi](#k-09--halaman-konfirmasi-pendaftaran--email-hasil-verifikasi) | 22 Nov 2026 |
| K-10 | [Mendaftar ulang pada periode yang sama](#k-10--mendaftar-ulang-pada-periode-yang-sama) | 22 Nov 2026 |
| K-11 | [Preview berkas Word & link evidence](#k-11--preview-berkas-word--link-evidence) | 22 Nov 2026 |
| K-12 | [Sumber identitas peserta di halaman staf](#k-12--sumber-identitas-peserta-di-halaman-staf) | 22 Nov 2026 |
| K-13 | [Badge "Perlu Perbaikan" per form](#k-13--badge-perlu-perbaikan-per-form) | 22 Nov 2026 |
| K-14 | [Dispensasi penugasan asesor](#k-14--dispensasi-penugasan-asesor) | 22 Nov 2026 |

---

## K-01 — Identitas pendaftar: NIP vs email

**Konteks.** Peserta periode lalu mendaftar lagi di periode baru. Muncul pertanyaan: bagaimana bila
NIP sama tetapi email berbeda (atau sebaliknya)? Apakah cukup email saja yang dijadikan acuan,
mengingat email adalah username akun dan tidak bisa diganti?

**Keputusan.**

- **NIP = identitas orang**, **email = akun login**. Prinsipnya **satu NIP = satu person = satu akun**.
- Email saja **tidak cukup** sebagai acuan: orang yang sama bisa punya dua profil/akun bila ganti email,
  NIP orang lain bisa dipakai untuk membuat profil ganda, dan satu orang bisa mendaftar dua kali
  di periode yang sama dengan email berbeda.
- Akun baru **hanya** dibuat bila NIP belum pernah punya akun.

| Kasus | Saat mendaftar | Saat diterima (ACC) Verifikator | Login memakai |
| --- | --- | --- | --- |
| 1. NIP baru + email baru | Diterima; person baru dibuat | **Akun baru** dibuat dengan email ini + tautan aktivasi | Email ini |
| 2. NIP lama + email lama | Diterima; ditautkan ke person lama | Tidak ada akun baru. Akun aktif tetap; akun belum aktivasi dikirimi tautan aktivasi baru | Akun lama |
| 3. NIP lama + email baru | **Diterima** (sebelumnya ditolak); ditautkan ke person lama lewat NIP. Pendaftar diberi tahu NIP sudah terdaftar dengan email lain (disamarkan, mis. `bu***@gmail.com`) dan harus masuk dengan akun tersebut | Tidak ada akun baru. **Email akun & email person tidak diganti**; email baru hanya tersimpan di pengajuan. Tautan aktivasi (bila akun belum aktif) dikirim ke **email lama**. Verifikator melihat penanda "Email pengajuan berbeda dari email akun terdaftar" | Akun lama (email lama) |
| 4. NIP baru + email lama | **Ditolak**: "Email sudah terdaftar untuk peserta lain. Gunakan email lain." | — | — |
| 5. NIP milik A + email milik B | **Ditolak**: "NIP dan email terdaftar atas dua peserta yang berbeda…" | — | — |

**Data profil pada kasus 2 & 3.** Saat pengajuan **diterima**, data profil (person) diperbarui dari
pengajuan tersebut: nama (mis. gelar baru), instansi, wilayah, pendidikan, jabatan, dan nomor HP;
nama pada akun login ikut disamakan. Pengajuan yang masih menunggu, ditolak, atau `superseded`
**tidak** mengubah profil. Email tidak ikut berubah (lihat di atas). Isian CMSP-01 tetap berdiri sendiri.

Catatan kasus 3: bila person lama **belum punya akun** (mis. pengajuan sebelumnya tidak pernah
diterima), akun dibuat dengan email pengajuan yang diterima dan email person ikut diperbarui.

**Alasan email akun tidak diganti otomatis.** NIP relatif mudah diketahui orang lain. Bila email akun
ikut berganti mengikuti pendaftaran, siapa pun yang tahu NIP seseorang bisa mengambil alih akunnya.
Bila peserta sudah tidak dapat mengakses email lama, penggantian email dilakukan Super Admin setelah
memastikan identitas (fitur "Ubah Email Akun" **belum ada** — lihat 07).

**Penerapan.**

- `server/services/application.service.ts` → `createApplication()` (aturan kasus 1–5, `notice` untuk pendaftar).
- `server/services/peserta-account-provisioning.service.ts` → `preparePesertaAccount()` (akun lama dipakai, email tidak diganti).
- `server/services/application-verification-detail.service.ts` → `identity.emailMismatch` untuk penanda Verifikator.
- `app/components/guest/GuestRegistrationForm.vue` (informasi di halaman sukses),
  halaman detail pengajuan Verifikator & Super Admin (penanda).
- Respons publik `POST /api/applications/register` tidak lagi memuat data person tersimpan
  (nama pemilik NIP) agar tidak bocor ke orang yang mengetik NIP orang lain.

---

## K-02 — Pendaftaran ganda pada periode yang sama

**Konteks.** Satu orang (NIP sama) mengirim pendaftaran lebih dari sekali pada periode yang sama.

**Keputusan (sudah berjalan, dicatat ulang).**

- Selama belum ada yang diterima, semua pengajuan boleh masuk (`pending_verification`).
- Pengajuan yang **di-ACC Verifikator** menjadi `accepted`; pengajuan lain dengan NIP & periode
  yang sama otomatis menjadi `superseded`. Data person diperbarui dari pengajuan yang di-ACC
  (tidak otomatis yang terbaru — Verifikator memilih).
- Setelah ada yang diterima, pengajuan baru dengan NIP tersebut pada periode yang sama **ditolak**.

**Penerapan.** `createApplication()` (cek `findAcceptedApplicationByNipAndPeriod`),
`application.repository.ts` (penandaan `superseded`).

---

## K-03 — Tautan aktivasi akun

**Konteks.** Email aktivasi berisi tautan `localhost`; email bisa tidak masuk atau terhapus.

**Keputusan.**

- Tautan dibangun dari `APP_BASE_URL` server yang memproses penerimaan; di hosting (Vercel) wajib
  berisi URL publik dan perlu redeploy setelah diubah.
- Super Admin dapat **Kirim Ulang Tautan Aktivasi** untuk akun peserta berstatus menunggu aktivasi;
  tautan lama otomatis tidak berlaku. Masa berlaku tautan 24 jam.

**Penerapan.** `resendPesertaActivation()`, `POST /api/admin/accounts/:id/resend-activation`,
Manajemen Akun → Pengaturan Akun.

---

## K-04 — Super Admin hanya satu

**Konteks.** Bagaimana membuat Super Admin bila database direset, dan apakah ada celah orang lain
membuat akun Super Admin?

**Keputusan.**

- Hanya ada **satu** Super Admin, dibuat lewat terminal (`npm run create-super-admin`); script
  menolak bila sudah ada Super Admin aktif.
- Manajemen Akun tidak dapat membuat Super Admin, dan akun Super Admin **dilindungi** dari reset
  kata sandi/ubah status lewat UI maupun API (403).
- Mengganti Super Admin: nonaktifkan akun lama (`DISABLED`) langsung di sheet `users`, lalu jalankan script.

**Penerapan.** `STAFF_ROLES` (tanpa `SUPER_ADMIN`), `server/utils/account-guard.ts`, `scripts/create-super-admin.ts`.

---

## K-05 — Pengacakan opsi jawaban: per periode, bukan per soal

**Konteks.** Dulu ada pengaturan acak/tidak per soal (kolom `evaluation_questions.shuffle_options`),
fiturnya sudah tidak dipakai.

**Keputusan.** Pengacakan hanya diatur **per periode** (`period_evaluations.shuffle_options`). Kolom
per soal **dihapus** dari kode dan sheet (opsi B).

**Penerapan.** `evaluation.repository.ts` (`QUESTION_COLUMNS`), docs/04.

---

## K-06 — Import soal dari Excel

**Keputusan.**

- Tombol **Import Excel** di Bank Soal, memakai template resmi (`public/templates/template-import-soal.xlsx`):
  Topik, Pertanyaan, Opsi A–E, Kunci Jawaban.
- File dibaca di browser (`read-excel-file`), pratinjau per baris (valid / tidak valid / duplikat),
  duplikat dapat dilewati. Maks. **200 soal** dan **2 MB** per import.
- Server memvalidasi ulang setiap soal; **semua atau tidak sama sekali**.

**Penerapan.** `shared/utils/evaluation-import.ts`, `POST /api/evaluation/questions/import`,
`QuestionImportModal.vue`.

---

## K-07 — Pencegahan kecurangan evaluasi ditunda

**Keputusan.** Deteksi pindah tab, layar penuh, dan blokir salin/klik kanan **belum dibutuhkan**
(keputusan pemilik proyek & atasan). Jangan diusulkan lagi kecuali diangkat kembali.

---

## K-08 — Penilaian Asesor Kepublikan (CMSP-03)

**Keputusan.**

- CMSP-03 berisi **3 unit** (Orientasi Publik; Pola Pikir Bertumbuh & Kreativitas; Budaya Kerja
  Transformasional), masing-masing dengan elemen kompetensi & indikator penilaian. Tidak ada input peserta.
- Mekanisme sama dengan penilaian CMSP-02 Asesor Teknis: **K/BK per unit**, satu catatan umum,
  rekomendasi dapat/tidak dapat dilanjutkan (catatan wajib bila tidak), simpan draf / kirim (terkunci),
  Super Admin dapat mengisi & membuka kunci. Label rekomendasi sementara sama dengan Asesor Teknis.
- **Berurutan:** baru dapat diisi setelah Asesor Teknis **mengirim** penilaian dengan rekomendasi
  "dapat dilanjutkan". Sebelumnya peserta berstatus "Menunggu Asesor Teknis".
- Asesor Kepublikan tidak dapat diganti bila penilaian CMSP-03 peserta tersebut sudah dimulai.
- Kartu ringkasan di daftar penilaian disamakan dengan halaman Asesor Teknis (6 kartu); peserta yang
  menunggu Asesor Teknis dihitung dalam "Belum Dinilai".

**Penerapan.** `shared/utils/cmsp03-units.ts`, `public-assessment.service.ts`, sheet `public_assessments`,
portal `/asesor-kepublikan`, menu Super Admin "Penilaian Asesor Kepublikan".

---

## K-09 — Halaman konfirmasi pendaftaran & email hasil verifikasi

**Konteks.** Halaman "Pendaftaran Berhasil Dikirim" belum menjelaskan langkah berikutnya. Usulan awal:
membedakan informasi di halaman sesuai kondisi akun pendaftar.

**Keputusan.**

- **Halaman konfirmasi dibuat umum** (sama untuk semua pendaftar). Halaman ini publik; bila isinya
  berbeda per kondisi, orang yang mengetik NIP orang lain dapat mengetahui apakah NIP itu sudah
  punya akun/aktif. Pengecualian hanya informasi kasus 3 (K-01).
- Isi halaman: ringkasan (termasuk email yang diisi), **Langkah Selanjutnya** (diperiksa Verifikator →
  hasil dikirim lewat email → bila diterima berisi petunjuk masuk), dan pengingat memeriksa folder
  **Spam/Promosi**.
- **Penyesuaian per kondisi dilakukan di email** setelah Verifikator memutuskan:

| Kondisi | Email | Dikirim ke |
| --- | --- | --- |
| Diterima, belum punya akun / akun belum aktivasi | Aktivasi akun (tautan 24 jam) | Email akun (akun baru = email pengajuan) |
| Diterima, akun sudah aktif | "Pendaftaran diterima — masuk dengan akun Anda (email login)" + tombol Masuk | Email akun |
| Diterima, email pengajuan ≠ email akun (kasus 3) | Tambahan: pemberitahuan singkat **tanpa tautan login/aktivasi** dan tanpa menyebut email akun | Email pengajuan |
| Ditolak | Pemberitahuan **umum & diplomatis**, **tanpa catatan Verifikator** | Email pengajuan |

- Gagal mengirim email aktivasi = keputusan dapat diproses ulang (token baru). Gagal mengirim email
  informatif (diterima/pemberitahuan/penolakan) hanya dicatat di log; keputusan tetap tersimpan.
  Email penolakan hanya dikirim saat keputusan pertama kali disimpan.

**Penerapan.** `server/utils/email.ts` (4 jenis email), `sendPesertaActivationEmail()` di
`peserta-account-provisioning.service.ts`, `application-verification.service.ts`,
`app/components/guest/GuestRegistrationForm.vue`.

---

## K-10 — Mendaftar ulang pada periode yang sama

**Konteks.** Peserta sudah diterima pada periode X (mis. belum sempat aktivasi karena email tidak
ditemukan), lalu mendaftar lagi pada periode yang sama. Apakah aturan NIP/email (K-01) berlaku?

**Keputusan.** Aturan K-01 berlaku untuk periode yang sama maupun berbeda, tetapi pengecekan
"NIP sudah diterima pada periode ini" dijalankan **lebih dulu**:

| Situasi | Hasil saat submit |
| --- | --- |
| Periode sama, pengajuan sebelumnya **sudah diterima** | **Ditolak** (apa pun email yang diisi), tidak ada pengajuan & email baru |
| Periode sama, pengajuan sebelumnya **masih menunggu** | Masuk, mengikuti K-01; saat salah satu diterima, lainnya `superseded` (K-02) tanpa email |
| Periode sama, pengajuan sebelumnya **ditolak** | Masuk, mengikuti K-01 |
| Periode berbeda | Masuk, mengikuti K-01 |

Pesan penolakan diganti agar memandu peserta (tanpa menyebut akun sudah aktif atau belum):
*"Pendaftaran dengan NIP ini sudah diterima pada periode ini, sehingga tidak perlu mendaftar ulang.
Informasi akun telah dikirim ke email yang terdaftar; periksa juga folder Spam/Promosi. Jika tidak
menemukannya, hubungi admin melalui kontak di bagian bawah halaman."* Admin lalu dapat memakai
**Kirim Ulang Tautan Aktivasi** (K-03).

**Penerapan.** `createApplication()` di `server/services/application.service.ts`.

---

## K-11 — Preview berkas Word & link evidence

**Konteks.** Evidence berupa Word (.doc/.docx) sebelumnya hanya bisa diunduh. Sistem akan dipakai di
Vercel (prototipe, ±30–50 peserta), sehingga solusinya tidak boleh memberatkan kuota.

**Keputusan.**

- Dipilih **konversi lewat Google Drive → PDF** (opsi A): salinan sementara sebagai Google Docs →
  ekspor PDF → salinan dihapus. Mendukung .doc & .docx, tanpa library baru, berkas asli tidak berubah.
  Ditolak: library di browser (hanya .docx, tata letak meleset) dan viewer online (berkas harus publik).
- Konversi ±5–9 detik saat pertama dibuka, lalu di-cache 10 menit di server. Hasil > 4,3 MB tidak
  ditampilkan (batas respons Vercel ±4,5 MB) — pengguna diminta mengunduh.
- Batas waktu fungsi Vercel dinaikkan ke 60 detik (`nuxt.config.ts`) karena default Hobby 10 detik.
- Modal preview punya tombol **Unduh** (berkas asli) dan **Buka di Tab Baru**.
- Link evidence: video YouTube & file Google Drive ditampilkan di modal (ukuran sama dengan preview
  PDF); link lain (folder Drive, website) langsung dibuka di **tab baru**. Hanya `http`/`https` diterima.

**Penerapan.** `convertGoogleDriveFileToPdf()` (`google-drive.service.ts`), `sendStoredFile()`
(`?preview=pdf`), `DocumentPreviewModal.vue`, `LinkPreviewModal.vue`, `nuxt.config.ts`.

---

## K-12 — Sumber identitas peserta di halaman staf

**Konteks.** Apakah nama/NIP/instansi di tabel & halaman staf sebaiknya memakai data **profil**
(terkini, mis. sudah bertambah gelar) atau data **pengajuan/periode**?

**Keputusan.**

- Tetap memakai **data pada periode tersebut** (isian CMSP-01, atau data pengajuan bila CMSP-01
  belum ada), karena itulah data yang sah saat pengajuan/sertifikasi peserta. Data profil **tidak**
  dipakai di halaman staf (hanya di Profil & sidebar peserta).

| Halaman | Sumber |
| --- | --- |
| Daftar & detail pengajuan (verifikasi pendaftaran) | Data pengajuan |
| Verifikasi SA, Penugasan Asesor, Perencanaan Evaluasi, Penilaian Asesor Teknis & Kepublikan | Isian CMSP-01 → data pengajuan |

- Kartu ringkasan di detail **Verifikasi Self Assessment** tidak lagi menampilkan Nama/NIP/Instansi
  (sama persis dengan isian CMSP-01 di bawahnya); yang tersisa **Periode, Dikirim, Perbaikan**.

**Penerapan.** `app/components/verification/SelfAssessmentDetail.vue`.

---

## K-13 — Badge "Perlu Perbaikan" per form

**Konteks.** Verifikator meminta perbaikan dengan catatan hanya untuk CMSP-01, tetapi badge di
CMSP-02 juga tertulis "Perlu Perbaikan" (status perbaikan satu untuk keseluruhan self assessment),
sehingga peserta bisa mengira CMSP-02 juga harus diperbaiki.

**Keputusan.**

- Selama status **Perlu Perbaikan**, badge di setiap form mengikuti catatan form itu:
  form yang mendapat catatan → **Perlu Perbaikan**; form tanpa catatan → **Tidak Ada Catatan** (abu-abu).
  Dipilih "Tidak Ada Catatan", bukan "Sudah Sesuai", karena keputusan verifikasi belum final.
- Bila Verifikator tidak memberi catatan di form mana pun, kedua form tetap "Perlu Perbaikan".
- Badge hanya petunjuk: form tanpa catatan **tetap dapat diedit**, dan kirim ulang tetap bersamaan.

**Penerapan.** `formBadgeStatus()` di `app/pages/peserta/self-assessment/[applicationId].vue`;
status tampilan `REVISION_NO_NOTE` di `SelfAssessmentStatusBadge.vue` (tidak disimpan di database).

---

## K-14 — Dispensasi penugasan asesor

**Konteks.** Penugasan asesor terkunci begitu tahap Penilaian Asesor dibuka — sesuai aturan, tetapi
perlu cara untuk dispensasi (mis. peserta terlambat diverifikasi, asesor berhalangan) dan untuk uji coba.

**Keputusan.**

- **Normal (jadwal):** penugasan hanya saat tahap Verifikasi SA dibuka **dan** Penilaian Asesor belum dibuka.
- **Dispensasi:** bila Super Admin membuka tahap **Verifikasi Self Assessment secara manual**
  (override OPEN), penugasan dapat dilakukan lagi walau Penilaian Asesor sedang berjalan:
  menambah/mengganti asesor periode, menugaskan peserta yang belum punya asesor, dan mengganti
  asesor peserta yang penilaiannya **belum dimulai**.
- Pengaman tetap berlaku: asesor peserta yang penilaian CMSP-02/CMSP-03-nya sudah dimulai tidak
  dapat diganti; asesor yang masih memegang peserta tidak dapat dikeluarkan dari periode.
- Dipilih override (bukan "Super Admin selalu bisa") agar dispensasi disengaja & tercatat
  (`override_by`/`override_at` di timeline) dan dikunci lagi cukup dengan mengembalikan tahap ke Normal.
- Halaman Penugasan Asesor menampilkan kotak kuning "Penugasan dibuka manual".

**Penerapan.** `editRule()` di `server/services/assessor-assignment.service.ts`; `StageAccess.manual`
di `certification-stage.service.ts`; `app/components/assessor-assignment/List.vue`.

## K-15 — Aksesibilitas dasar (hasil PageSpeed Insights)

**Konteks.** PageSpeed Insights (Aksesibilitas) menandai tiga hal di halaman depan: kontras tombol
"Daftar"/"Daftar Sertifikasi" kurang (putih di atas biru 500 ±3,7 : 1), dokumen tanpa `<title>`, dan
`<html>` tanpa atribut `lang`.

**Keputusan.**

- `<html lang="id">`, meta description, dan judul tab: halaman berjudul → "Judul · Sertifikasi CMSP",
  selain itu "Sertifikasi Coaching dan Mentoring Sektor Publik".
- Penggelapan warna tema (primary/secondary/info/error → shade 600, success/warning → 700) sempat
  diterapkan lalu **dibatalkan** atas permintaan pemilik proyek karena tampilan badge/tombol jadi kurang
  menarik. Warna tetap shade 500 bawaan Nuxt UI; temuan kontras tombol "Daftar" diterima sebagai catatan.

**Penerapan.** `nuxt.config.ts` (`app.head`), `app/app.vue` (`titleTemplate`).

## K-16 — Verifikasi Peserta menjadi menu tersendiri

**Konteks.** Tombol "Verifikasi Peserta" menumpang di kartu menu Periode Sertifikasi (bersama Atur
Timeline dan Tutup Periode), berbeda dengan menu lain yang memilih periode lewat kartu.

**Keputusan.**

- Menu sidebar baru **Verifikasi Peserta** (Super Admin & Verifikator): pilih periode lewat kartu
  (jadwal tahap Verifikasi Peserta), lalu daftar pendaftar — isi halamannya tidak berubah.
- Menu periode berganti nama: Super Admin **Atur Periode** (Atur Timeline + ubah status),
  Verifikator **Timeline Periode** (hanya Lihat Timeline, karena tidak dapat mengatur).
- Urutan sidebar mengikuti alur: Beranda → Atur/Timeline Periode → Verifikasi Peserta → Verifikasi
  Self Assessment → Penugasan Asesor → …
- Alamat lama `/periods/<id>` dialihkan otomatis ke `/participant-verifications/<id>`.

**Penerapan.** `app/pages/{super-admin,verifikator}/participant-verifications/`, `periods/index.vue`,
`periods/[periodId]/index.vue` (redirect), `app/layouts/{super-admin,verifikator}.vue`,
tautan Kembali di `applications/[applicationId].vue`, beranda Verifikator.

## K-17 — Tahap "Evaluasi" berganti nama menjadi "Tes Tertulis"

**Konteks.** Istilah "Evaluasi" terkesan sebagai tahap akhir, padahal letaknya di tengah (tahap 5,
sebelum penilaian asesor). Pada proses klasikal tahap ini disebut "tes tertulis".

**Keputusan.**

- Nama tampilan menjadi **Tes Tertulis** di seluruh aplikasi (menu peserta, "Perencanaan Tes
  Tertulis", tombol, pesan, nama tahap timeline). "Tertulis" merujuk bentuk tes (pilihan ganda),
  bukan medianya, sehingga tetap tepat untuk tes berbasis komputer.
- Kolom `stage_name` tahap 5 di sheet `certification_timelines` diperbarui manual oleh pemilik
  proyek menjadi "Tes Tertulis" untuk periode yang sudah ada.
- **Nama teknis tidak diubah** (tab sheet `evaluation_*`, `period_evaluations`, kode `EVALUATION`,
  prefix ID, rute `/evaluation(s)`); dicatat di docs/04 bahwa artinya Tes Tertulis.
- "Pemantauan dan Evaluasi" pada isi unit CMSP-02 tidak termasuk (isi resmi form).
- Entri lama di dokumen ini tetap memakai istilah "Evaluasi" sebagai riwayat.

**Penerapan.** Label di `app/`, pesan di `server/`, `app/utils/timeline.ts`, `stageName` di
`certification-timeline.service.ts` & halaman timeline; docs 01/03/04/05/07, CLAUDE.md.
