# 07 — Status Pengembangan

Terakhir diperbarui: 15 November 2026. **Perbarui setiap fitur selesai/dimulai.**

Legenda: ✅ selesai · 🚧 sedang dikerjakan · ❌ belum ada

## Fitur

### Umum & Akun

| Fitur | Status | Catatan |
| --- | --- | --- |
| Landing page | ✅ | `/` |
| Login & logout | ✅ | Sesi 8 jam, rate limit |
| Redirect sesuai role | ✅ | `ROLE_HOME_PATHS` |
| Profil saya (semua role) | ✅ | Peserta: data diri dari `persons`, bisa diedit (NIP & email terkunci). Pegawai: nama. |
| Ganti kata sandi (semua role) | ✅ | Mencabut semua sesi |
| Lupa kata sandi (reset via email) | ❌ | Saat ini hanya Super Admin yang bisa reset kata sandi akun lain |
| Edit profil | ✅ | `PATCH /api/profile` |
| Notifikasi (ikon lonceng) | ❌ | Tombol sudah ada di header, belum berfungsi |

### Super Admin

| Fitur | Status | Catatan |
| --- | --- | --- |
| Dashboard | ✅ | Masih menandai "Pengelolaan Akun" sebagai *Segera hadir* padahal sudah ada |
| Buat periode | ✅ | |
| Atur timeline 8 tahapan | ✅ | |
| Override buka/tutup tahapan | ✅ | |
| Ubah status periode | ✅ | DRAFT → ACTIVE → CLOSED → COMPLETED |
| Manajemen akun pegawai | ✅ | Buat, reset kata sandi, aktif/nonaktif |
| Hubungkan Google Drive | ✅ | Lewat `/api/auth/google` (belum ada tombol di UI) |
| Kelola master jenis & kategori sertifikasi | ❌ | Diisi manual di sheet |
| Bank soal evaluasi (pilihan ganda) & pemasangan ke periode | ❌ | |
| Penetapan kelulusan | ❌ | |
| Akses sebagian fitur Verifikator & Asesor | 🚧 | Sudah bisa verifikasi pendaftaran; cakupan lain menunggu keputusan |
| Penugasan asesor ke peserta | ❌ | |
| Laporan/rekap | ❌ | |

### Pendaftaran & Verifikasi Berkas

| Fitur | Status | Catatan |
| --- | --- | --- |
| Form pendaftaran publik + 4 dokumen PDF | ✅ | |
| Validasi jadwal tahap Pendaftaran | ✅ | |
| Daftar pengajuan per periode | ✅ | |
| Preview dokumen | ✅ | Lewat backend |
| Catatan verifikator | ✅ | |
| Terima / tolak pengajuan | ✅ | |
| Pembuatan akun peserta + email aktivasi | ✅ | |
| Aktivasi akun peserta | ✅ | |
| Kirim ulang email aktivasi | ❌ | Bisa dengan memproses ulang keputusan "Diterima" |
| Email pemberitahuan penolakan | ❌ | |
| Verifikasi per dokumen | ❌ | Kolom `application_documents.status` belum dipakai |

### Peserta

| Fitur | Status | Catatan |
| --- | --- | --- |
| Beranda peserta (pengajuan, timeline) | ✅ | |
| Self assessment CMSP-01 | ✅ | Tersimpan di server (draft & submit). Isian awal dari Profil hanya sebelum draft pertama. Dokumen bisa diganti (hanya berlaku untuk CMSP-01) |
| Self assessment CMSP-02 | ✅ | Evidence file/link per unit, tersimpan di server |
| Simpan draft & submit gabungan | ✅ | Satu tombol menyimpan keduanya; submit hanya jika keduanya 100% + pernyataan disetujui; terkunci setelah submit |
| Unggah bukti self assessment | ❌ | |
| Lihat hasil / pengumuman | ❌ | |

### Tahap Lanjutan (sesuai probis)

| Fitur | Pelaku | Status |
| --- | --- | --- |
| Submit CMSP-01 & CMSP-02 ke server | Peserta | ✅ |
| Verifikasi CMSP-01 & 02 + minta perbaikan | Verifikator | ❌ |
| Perbaikan & submit ulang self assessment | Peserta | ✅ (sisi peserta siap; menunggu fitur Verifikator) |
| Assign peserta ke Asesor Teknis & Kepublikan | Verifikator | ❌ |
| Mengerjakan evaluasi pilihan ganda | Peserta | ❌ |
| Penilaian CMSP-02 (K/BK per indikator + catatan) | Asesor Teknis | ❌ |
| Penilaian form CMSP-03 (indikator menyusul) | Asesor Kepublikan | ❌ |
| Layout & halaman asesor (`/asesor-teknis`, `/asesor-kepublikan` atau satu `/asesor`) | Asesor | ❌ |
| Verifikasi penilaian & penetapan kelulusan | Verifikator / Super Admin | ❌ |
| Informasi kelulusan & sertifikat | Peserta | ❌ |
| Halaman remedial: kirim link bukti dukung (1x) | Peserta | ❌ |

## Known Issues / Utang Teknis

| # | Masalah | Dampak | Saran |
| --- | --- | --- | --- |
| 1 | Error TypeScript di `Cmsp02Form.vue` (`evidence` tidak didefinisikan, dll.). Error `Cmsp01Form.vue` sudah diperbaiki 15 Nov 2026 | Bagian form CMSP-02 bisa error saat dijalankan | Dibereskan saat CMSP-02 dikerjakan |
| 2 | Peringatan "possibly undefined" di `GuestRegistrationForm.vue` | Hanya strictness TS | Rapikan saat form disentuh |
| 3 | Prefix ID `PER-` dipakai `persons` **dan** `certification_periods` | Membingungkan saat membaca data | Ganti prefix person (mis. `PSN-`) + migrasi data, atau biarkan dan dokumentasikan |
| 4 | Generator ID membaca nomor terbesar | Dua penulisan bersamaan bisa menghasilkan ID sama | Terima risiko (trafik rendah) atau pakai ID acak/UUID |
| 5 | Sheet `sessions` terus bertambah | Login & cek sesi makin lambat | Hapus sesi kedaluwarsa berkala (script/cron) |
| 6 | Rate limiter in-memory | Reset saat server restart; tidak berbagi antar-instance | Cukup untuk satu server |
| 7 | Halaman periode/pengajuan Super Admin dan Verifikator duplikat | Perubahan harus dilakukan dua kali | Ekstrak ke komponen bersama |
| 8 | Aturan jadwal tahapan baru diterapkan untuk Pendaftaran | Tahap lain belum terkunci jadwal | Buat helper `assertStageOpen()` |
| 9 | Alias role lama `VERIFIER`/`PARTICIPANT` di `roles.ts` | — | Hapus setelah sheet `users` diperbarui |
| 10 | Setiap navigasi memanggil `/api/auth/me` (3 baca sheet) | Kuota Sheets & kecepatan | Cache sesi singkat di server jika mulai lambat |
| 11 | Dashboard Super Admin menandai Manajemen Akun "Segera hadir" | Membingungkan | Hapus `comingSoon` di `super-admin/index.vue` |
| 12 | Tidak ada tombol "Hubungkan Google Drive" di UI, dan tidak ada indikator saat token kedaluwarsa (terjadi 15 Nov 2026: `invalid_grant`) | Unggah & preview dokumen gagal tanpa disadari admin | Tambah tombol hubungkan ulang + status koneksi di dashboard Super Admin; publish OAuth app (lihat docs/02) |
| 13 | Halaman verifikasi Verifikator & Super Admin masih punya modal preview sendiri | Duplikasi | Ganti dengan `<DocumentPreviewModal>` |
| 14 | Peserta mengganti dokumen setelah diterima; Verifikator tidak mendapat penanda | Verifikator bisa tidak sadar dokumen berubah | Tampilkan "diganti peserta pada …" di halaman verifikasi, atau masukkan ke verifikasi CMSP-01 |

## Rencana Berikutnya

Urutan mengikuti alur probis di [01-gambaran-sistem.md](01-gambaran-sistem.md):

1. **Self assessment** — simpan & submit CMSP-01/02 ke server, kunci sesuai jadwal tahap
   `SELF_ASSESSMENT` (menunggu spesifikasi pemilik proyek).
2. **Verifikasi self assessment** — halaman Verifikator: tinjau isian, minta perbaikan
   dengan catatan, atau setujui.
3. **Assign asesor** — Verifikator memilih Asesor Teknis & Kepublikan untuk tiap peserta.
4. **Bank soal & evaluasi** — Super Admin menyusun soal pilihan ganda per periode; peserta mengerjakan.
5. **Role asesor** — layout, daftar peserta yang di-assign, penilaian CMSP-02 (K/BK + catatan)
   dan form CMSP-03 (menunggu daftar indikator).
6. **Penetapan kelulusan**, lalu **pengumuman, sertifikat, dan remedial (1x, link bukti)**.
