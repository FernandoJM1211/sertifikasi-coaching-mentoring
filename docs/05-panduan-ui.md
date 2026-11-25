# 05 — Panduan UI (Style Guide)

Pedoman agar halaman baru konsisten dengan yang sudah ada. Disarikan dari halaman
Super Admin, Verifikator, dan Peserta yang sudah berjalan.

## Prinsip

- **Bersih dan formal** — aplikasi instansi pemerintah: putih, biru, abu-abu (slate).
- **Bahasa Indonesia baku**, sapaan "Anda". Hindari istilah teknis di UI
  (tulis "Pengajuan", bukan "Application"; "Verifikator", bukan "Verifier").
- **Light mode saja** (`colorMode.preference = 'light'`).
- Utamakan **komponen Nuxt UI** (`UButton`, `UCard`, `UBadge`, `UModal`, `UInput`, `USelect`,
  `UTextarea`, `UAvatar`, `UIcon`, `toast`). Jangan membuat tombol/kartu dari nol.
- Hanya **Tailwind utility class**; tidak menulis CSS kustom kecuali terpaksa.

## Warna

Tema di `app/app.config.ts`: `primary = blue`, `neutral = slate`.

| Kegunaan | Class |
| --- | --- |
| Latar halaman dashboard | `bg-gradient-to-br from-blue-50 via-white to-indigo-50` (sudah di layout) |
| Aksen / eyebrow / ikon utama | `text-primary`, latar ikon `bg-blue-50` |
| Judul halaman (h1) — tingkat 1 | `text-blue-500` |
| Judul section/kartu (h2/h3) — tingkat 2 | `text-slate-900` |
| Teks isi, sub judul & keterangan — tingkat 3 | `text-slate-600` |
| Teks redup (keterangan kecil, ikon pendukung) | `text-slate-500` |

**Hierarki warna teks:** judul halaman **biru** → judul section/kartu **hitam** → sub judul,
deskripsi, dan label **abu-abu** (`slate-600`). Jangan memakai `text-slate-400` atau
`text-gray-*` untuk teks; gunakan skala `slate` di atas. Pengecualian: hero landing page.
| Border | `border-slate-200` atau `ring-1 ring-slate-200/70` |
| Kotak informasi abu-abu | `rounded-xl border border-slate-200 bg-slate-50 p-4` |
| Kotak info biru | `rounded-xl border border-blue-100 bg-blue-50/70 p-4` |

Gunakan `slate-*`, **bukan** `gray-*` (beberapa file lama masih memakai `gray`; seragamkan saat disentuh).

### Warna status (`UBadge color=...`, `variant="subtle"`)

| Arti | `color` | Contoh status |
| --- | --- | --- |
| Berhasil / aktif / diterima | `success` | `ACTIVE`, `accepted`, `DITERIMA`, tahap `OPEN` |
| Menunggu / perlu tindakan | `warning` | `pending_verification`, `PENDING_ACTIVATION`, "Perlu Perbaikan" |
| Gagal / ditutup / ditolak | `error` | `rejected`, `DITOLAK`, `CLOSED`, `DISABLED` |
| Informasi / selesai | `primary` atau `info` | `COMPLETED`, label role |
| Netral / draf | `neutral` | `DRAFT`, `superseded` |
| Selesai dikerjakan/dinilai (ungu) | `secondary` (= `violet`, di `app.config.ts`) | tes tertulis & penilaian asesor "Selesai" |

Jika halaman punya **card ringkasan** per status, warna badge di tabel **harus sama** dengan warna card
terkait (abu = `neutral`, kuning = `warning`, ungu = `secondary`, hijau = `success`, merah = `error`,
biru = `info`/`primary`).

**Warna solid, bukan transparan.** Latar & garis tepi `UBadge` dan `UAlert` (varian `subtle`, `soft`,
`outline`) sudah dibuat **solid** di `app/app.config.ts` (campuran warna tema dengan putih), agar tidak
tercampur dengan latar halaman yang bergradasi. Untuk elemen buatan sendiri di atas latar berwarna,
pakai warna solid (mis. `bg-amber-50`, `border-amber-200`), **jangan** opacity seperti `bg-warning/10`
atau `bg-primary/5`.

**Latar muda selalu bergaris tepi.** Elemen berlatar hampir putih (`bg-{warna}-50/100`, mis. kotak ikon,
kotak ringkasan, kotak info, tab tidak aktif) wajib diberi `border` senada: abu-abu → `border-slate-400`,
warna lain → `border-{warna}-300` (mis. `border border-blue-300 bg-blue-50`). Garis tepi kartu/tabel umum tetap `slate-300`.

**Form CMSP dalam mode tinjau** (`review-mode`: Verifikasi SA, penilaian asesor) bukan form isian:
tanda wajib (`*`), petunjuk format/ukuran file, dan tombol tambah/hapus tidak ditampilkan.

Selalu tampilkan **label Bahasa Indonesia**, bukan nilai mentah database
(mis. `pending_verification` → "Menunggu Verifikasi"). Untuk role dan status akun pakai
`getRoleLabel()` dan `getAccountStatusLabel()` dari `shared/utils/roles.ts`.

## Tipografi

| Elemen | Class |
| --- | --- |
| Eyebrow (label kecil di atas judul) | `text-sm font-medium text-primary` |
| Judul halaman (h1) | `text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl` |
| Deskripsi halaman | `mt-2 max-w-2xl text-sm leading-6 text-slate-600` |
| Judul kartu/section (h2) | `font-semibold text-slate-900` (atau `text-lg font-semibold`) |
| Deskripsi kartu | `mt-1 text-sm text-slate-600` |
| Label field | `text-sm text-slate-600` |
| Nilai field | `text-sm font-semibold text-slate-800` |

## Kerangka Halaman Dashboard

Layout (sidebar + header) sudah disediakan `LayoutDashboardShell`. Halaman cukup mengisi konten:

```vue
<script setup lang="ts">
definePageMeta({ layout: 'verifikator' })
useHead({ title: 'Judul Halaman' })
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Header halaman -->
    <section class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm font-medium text-primary">Nama Modul</p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl">
          Judul Halaman
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Penjelasan singkat fungsi halaman.
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <UButton color="neutral" variant="outline" icon="i-lucide-arrow-left" to="/verifikator/participant-verifications">
          Kembali
        </UButton>
        <UButton icon="i-lucide-plus">Aksi Utama</UButton>
      </div>
    </section>

    <!-- Konten -->
    <UCard class="ring-1 ring-slate-200/70 shadow-sm">
      ...
    </UCard>
  </div>
</template>
```

- Lebar konten: `max-w-6xl` (umum), `max-w-7xl` (dashboard/tabel lebar), `max-w-3xl`–`max-w-5xl` (form).
- Jarak antar section: `space-y-6` (atau `space-y-8` untuk dashboard).
- Grid kartu: `grid gap-5 sm:grid-cols-2` / `lg:grid-cols-3`.

## Pola Komponen

### Kartu dengan ikon judul

```vue
<UCard class="ring-1 ring-slate-200/70 shadow-sm">
  <template #header>
    <div class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
        <UIcon name="i-lucide-file-text" class="size-5 text-primary" />
      </div>
      <div>
        <h2 class="font-semibold text-slate-900">Judul Kartu</h2>
        <p class="mt-1 text-sm text-slate-600">Keterangan singkat.</p>
      </div>
    </div>
  </template>
  ...
</UCard>
```

### Daftar detail (label–nilai)

```vue
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div v-for="item in details" :key="item.label"
       class="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
    <p class="text-sm text-slate-600">{{ item.label }}</p>
    <p class="mt-2 break-words text-sm font-semibold text-slate-800">
      {{ item.value || 'Belum diisi' }}
    </p>
  </div>
</div>
```

### Tombol Kembali (wajib seragam)

Selalu di **kanan atas** halaman (sejajar judul), bentuk outline dengan panah dan teks **"Kembali"** saja:

```vue
<UButton to="/halaman-sebelumnya" color="neutral" variant="outline" icon="i-lucide-arrow-left">
  Kembali
</UButton>
```

Jangan memakai variasi lain (ghost, teks panjang seperti "Kembali ke Daftar ...", atau posisi kiri).
Jangan membuat baris tersendiri untuk tombol Kembali di atas judul (boros ruang).

Jika halaman punya badge status (periode, pengajuan), letakkan **di bawah** tombol Kembali:

```vue
<div class="flex items-start justify-between gap-4">
  <div class="min-w-0">
    <h1 class="text-xl font-semibold text-slate-900 sm:text-2xl">Judul</h1>
    <p class="mt-1 text-sm text-slate-600">Keterangan singkat</p>
  </div>
  <div class="flex shrink-0 flex-col items-end gap-2">
    <UButton to="/..." color="neutral" variant="outline" icon="i-lucide-arrow-left" size="sm">Kembali</UButton>
    <UBadge color="success" variant="subtle">Aktif</UBadge>
  </div>
</div>
```

### Tombol

| Jenis | Props |
| --- | --- |
| Aksi utama | default (`color="primary"`, solid) |
| Sekunder / Kembali / Batal | `color="neutral" variant="outline"` |
| Aksi positif (aktifkan, terima) | `color="success"` |
| Aksi berbahaya (tolak, nonaktifkan, tutup) | `color="error"` — **wajib konfirmasi modal** |
| Ikon saja | `variant="ghost" square` + `aria-label` |

Saat proses berjalan: `:loading="isSubmitting" :disabled="isSubmitting"`.

### Tabel daftar (wajib seragam)

- **Judul kolom selalu satu baris** (`th { white-space: nowrap }` di `main.css`). Pada tabel
  `table-fixed`, beri lebar kolom yang cukup untuk judulnya (mis. `w-40` untuk "Unit Kompetensi",
  `w-44` untuk "Asesor Kepublikan") dan naikkan `min-w-[...]` tabel; kelebihan lebar ditangani scroller.

Acuan: daftar pengajuan di detail periode dan daftar Verifikasi Self Assessment.

- Kartu `UCard`. Header kartu: judul + deskripsi di kiri, **Muat Ulang** (`neutral outline`, `size="sm"`,
  ikon `i-lucide-refresh-cw`) di kanan; di bawahnya kotak filter `border-blue-100 bg-blue-50/50`
  (pencarian + `USelect` status).
- Header kolom: `px-4 py-3 font-semibold text-blue-600`. Kolom teks **rata kiri**;
  kolom **Status** dan **Aksi** **rata tengah** (tabel Bank Soal: semua header rata tengah).
- **Setiap tabel wajib berpaginasi**: `useTablePagination(filteredItems)` + `<TablePagination>` di footer kartu
  (pilihan 5/10/20/50 per halaman, default 10); panggil `reset` saat filter/pencarian berubah.
- Garis tipis pemisah antarkolom berlaku otomatis untuk semua `<table>` (aturan global di
  `app/assets/css/main.css`); tidak perlu kelas tambahan.
- Tabel ringkas (mis. Bank Soal, Manajemen Akun): teks panjang satu baris dengan `truncate`
  (+ `table-fixed` dan `:title` berisi teks lengkap), badge status tanpa `min-w`, dan tombol aksi
  ikon saja (`square size="md"`, `aria-label` + `title`).
- Sel: `px-4 py-4`. Badge status `inline-flex min-w-32 justify-center`.
- Tombol aksi di kolom Aksi: **berlabel + ikon**, `size="sm"`, `class="inline-flex w-32 justify-center"`
  (tabel penilaian asesor `w-24`). Aturan ikon **seragam di semua tabel proses**:
  - Ada pekerjaan (memverifikasi, menilai, mengubah): `color="primary"` solid + ikon **`i-lucide-pencil`**,
    label kerja (**Verifikasi**, **Nilai**).
  - Hanya melihat: `color="neutral" variant="outline"` + ikon **`i-lucide-eye`**, label **Lihat**.
  - Tombol "kerja" hanya bila benar-benar bisa dikerjakan (tahap dibuka, tidak menunggu tahap sebelumnya);
    selain itu tampil sebagai **Lihat**.
  - Belum bisa diproses sama sekali: tombol outline `disabled` dengan keterangan singkat.
- **Lebih dari satu aksi per baris** (mis. Manajemen Akun, Penetapan Hasil Asesmen): satu tombol ikon
  `i-lucide-settings-2` (`color="primary"` solid, `square size="md"`) yang membuka **`<TableActionModal>`**
  berisi ringkasan baris + daftar pilihan (ikon berwarna, judul, keterangan; aksi yang belum tersedia
  tampil nonaktif dengan alasannya). Jangan menaruh beberapa tombol di dalam sel.
- **Isi sel nilai/status cukup badge** (`UBadge variant="subtle"`), seragam dalam satu tabel — jangan
  mencampur teks berwarna dan badge. Penjelasan tambahan (alasan, rincian) ditaruh di modal/halaman detail.
  Rekomendasi asesor: badge **Dilanjutkan** (`success`) / **Tidak Dilanjutkan** (`error`).
- Status "menunggu tahap sebelumnya" (mis. Menunggu Tes Tertulis / Menunggu Asesor Teknis) memakai warna
  **`warning`** (kuning), baik badge maupun kotak info di halaman detail.
- Footer: jumlah data yang ditampilkan (dan paginasi bila ada).

### Ikon

Lucide via `i-lucide-*`. Yang sudah dipakai: `calendar-days` (periode), `users` (akun),
`layout-dashboard`, `clipboard-check` (self assessment), `file-text` (dokumen),
`user-round` (profil), `key-round` (kata sandi), `log-out`, `arrow-left` (kembali),
`plus` (tambah), `refresh-cw` (muat ulang), `circle-check`, `circle-alert`, `circle-x`,
`info`, `loader-circle` (loading, dengan `animate-spin`), `lock`, `lock-open`.

### Modal konfirmasi

Gunakan `UModal` dengan `v-model:open`. Struktur: header (ikon berwarna + judul + subjudul),
isi (ringkasan objek yang diubah dalam kotak abu-abu), footer (Batal `neutral outline` +
tombol aksi sesuai warna). Saat memproses, set `:dismissible="false"`.
Contoh lengkap: modal ubah status di `app/pages/super-admin/periods/index.vue`.

### Notifikasi (toast)

```ts
const toast = useToast()

toast.add({ title: 'Berhasil disimpan', description: '...', color: 'success', icon: 'i-lucide-circle-check' })
toast.add({ title: 'Gagal menyimpan', description: message, color: 'error', icon: 'i-lucide-circle-x' })
toast.add({ title: 'Data belum lengkap', description: '...', color: 'warning', icon: 'i-lucide-circle-alert' })
```

Pesan error dari server ada di `error.data.statusMessage`:

```ts
catch (error: unknown) {
  const data = (error as { data?: { statusMessage?: string } }).data
  toast.add({ title: 'Gagal', description: data?.statusMessage || 'Terjadi kesalahan. Silakan coba lagi.', color: 'error' })
}
```

### State halaman

Setiap halaman yang memuat data wajib punya tiga state:

1. **Loading** — `UIcon i-lucide-loader-circle animate-spin` + teks "Memuat ...".
2. **Error** — kartu berisi ikon `circle-alert` merah, pesan, dan tombol "Muat Ulang".
3. **Kosong** — ikon besar abu-abu di tengah, judul ("Belum Ada ..."), keterangan, tombol aksi bila relevan.

## Tombol Beranda per Role

Beranda setiap role berisi progres timeline periode aktif dan kartu **Tahapan Saat Ini** dengan panel
tombol dinamis (`TimelineTask`). Sumber kode: `app/pages/<role>/index.vue`; data staf dari
`GET /api/home/periods` (`insight` per periode, `server/services/home.service.ts`).

**Aturan umum**

- **Periode yang tampil:** Peserta — periode aktif yang pengajuannya diterima; Super Admin & Verifikator —
  semua periode aktif; Asesor — hanya periode aktif yang memiliki peserta yang ditugaskan kepadanya.
- **Progres timeline** mengikuti jadwal saja. **Tombol** mengikuti status tahap yang sebenarnya
  (`getStageAccess`): tahap yang **dibuka manual** Super Admin tetap memunculkan tombol (dengan catatan
  "dibuka khusus oleh penyelenggara"), tahap yang **ditutup manual** tidak.
- **Angka** di panel sama dengan kartu ringkasan di halaman daftar (memakai service yang sama).
- Bila ringkasan gagal dihitung, beranda tetap tampil dengan tombol berdasarkan jadwal saja.
- Gaya panel (`tone`):

  | Tone | Arti | Kotak | Tombol |
  | --- | --- | --- | --- |
  | `action` | Tugas tahap ini | Biru | Biru solid |
  | `pending` | Tunggakan / mendesak | Kuning + ikon peringatan | Kuning solid |
  | `waiting` | Menunggu tahap/pihak lain | Kuning + ikon jam pasir | Outline |
  | `done` | Sudah selesai | Hijau | Outline |
  | `info` | Tanpa tindakan | Biru muda | Outline (bila ada) |

- Ikon tombol mengikuti aturan tabel: pensil untuk mengerjakan, mata untuk melihat. **Satu ikon saja**
  (tanpa panah), label **1–2 kata** (Nilai, Verifikasi, Tugaskan, Atur, Tetapkan, Pantau, Lihat);
  konteks & jumlah ditulis di judul panel, keterangan cukup satu kalimat pendek.

### Peserta

Hasil akhir yang **sudah diumumkan** diutamakan di atas semuanya (juga sesudah tahap Pengumuman berakhir).
Selain itu, tunggakan tahap sebelumnya yang masih dapat dikerjakan **diprioritaskan** di atas tugas tahap berjalan.

| Tahap berlangsung | Kondisi | Yang muncul |
| --- | --- | --- |
| Self Assessment | SA belum dikirim (NEW/DRAFT) & dapat diisi | `action` **Isi Sekarang** |
| | Diminta perbaikan | `action` **Perbaiki** |
| | Sudah dikirim / terverifikasi | `done` **Lihat** |
| | Belum dapat diisi (mis. tahap ditutup) | `info` **Buka** |
| Tes Tertulis | Belum mulai / sedang dikerjakan & tersedia | `action` **Kerjakan / Lanjutkan** |
| | Sudah terkirim | `done` **Lihat** |
| | Belum tersedia (SA belum terverifikasi, dll.) | `info` **Buka** |
| Tahap sesudah Self Assessment | SA masih dapat diisi/diperbaiki | `pending` **Lengkapi / Perbaiki** |
| Tahap sesudah Tes Tertulis | Tes masih tersedia & belum terkirim | `pending` **Kerjakan / Lanjutkan** |
| Hasil sudah diumumkan | Lulus / Lulus Remedial | `done` "Selamat, Anda lulus sertifikasi" → **Lihat** |
| | Remedial, belum kirim & pengiriman dibuka | `pending` "Tugas remedial Anda belum dikirim" → **Kirim** |
| | Remedial, pengiriman ditutup | `info` → **Lihat** |
| | Tugas remedial menunggu tinjauan | `waiting` → **Lihat** |
| | Tidak Lulus / Tidak Kirim Remedial / Tidak Melanjutkan | `info` "Hasil sertifikasi sudah diumumkan" → **Lihat** |
| Pengumuman | Hasil belum ditetapkan | `info` "Hasil akhir belum diumumkan" → **Buka** |
| Tahap lain (Pendaftaran, Verifikasi, Penilaian, Penetapan) | — | `info` keterangan tahap, tanpa tombol |
| Tidak ada tahap berlangsung | Ada pekerjaan yang dibuka manual | Tombol pekerjaan tersebut |

### Verifikator

| Tahap berlangsung | Kondisi | Yang muncul |
| --- | --- | --- |
| Pendaftaran, Verifikasi Peserta | Ada pendaftar menunggu | `action` "N pendaftar menunggu verifikasi" → **Verifikasi** |
| | Tidak ada | `done` → **Lihat** |
| Tahap sesudahnya | Masih ada pendaftar menunggu | `pending` → **Verifikasi** |
| Tahap Verifikasi SA **dibuka** (jadwal/manual) | Ada SA dikirim | `action` "N self assessment menunggu verifikasi" → **Verifikasi** |
| | Tidak ada | `done` rincian terverifikasi/diperbaiki/belum dikirim → **Lihat** |
| | Penugasan dapat diubah, ada peserta belum lengkap asesornya | `action` → **Tugaskan** |
| | Semua sudah ditugaskan | `done` → **Lihat** |
| | Belum ada SA terverifikasi | `info` tanpa tombol |
| Tes Tertulis, Penilaian Asesor | Masih ada peserta tanpa asesor lengkap (penugasan terkunci) | `pending` "hubungi Super Admin" → **Lihat** |
| Hasil sudah diumumkan | Ada tugas remedial menunggu tinjauan | `action` "N tugas remedial menunggu tinjauan" → **Tinjau** |
| | Tidak ada | `info` (Pengumuman dibuka) / `done` (sesudahnya) jumlah Lulus, belum kirim remedial, Tidak Lulus → **Lihat** |
| Tahap lain | — | `info` "Tidak ada tindakan Verifikator" + keterangan tahap |

### Asesor Teknis

| Status tahap Penilaian Asesor | Kondisi | Yang muncul |
| --- | --- | --- |
| Dibuka (jadwal/manual) | Ada peserta dapat dinilai (belum dinilai/draf) | `action` "N peserta belum selesai Anda nilai" → **Nilai** |
| | Ada peserta belum mengirim tes tertulis | `waiting` "N peserta menunggu tes tertulis" (tombol **Lihat** bila tidak ada yang dapat dinilai) |
| | Semua sudah dikirim | `done` → **Lihat** |
| | Belum ada peserta | `info` |
| Belum dimulai | — | `info` jumlah peserta yang ditugaskan |
| Sudah berakhir / ditutup | — | `info` "N dari M peserta sudah Anda nilai" → **Lihat** (bila ada) |

### Asesor Kepublikan

| Status tahap Penilaian Asesor | Kondisi | Yang muncul |
| --- | --- | --- |
| Dibuka (jadwal/manual) | Ada peserta dapat dinilai | `action` "N peserta belum selesai Anda nilai" → **Nilai** |
| | Ada peserta menunggu Asesor Teknis | `waiting` "N peserta menunggu penilaian Asesor Teknis" |
| | Semua sudah dikirim | `done` → **Lihat** (+ jumlah yang tidak dilanjutkan Asesor Teknis) |
| | Semua peserta tidak dilanjutkan Asesor Teknis | `info` → **Lihat** |
| Belum dimulai / berakhir | — | Sama seperti Asesor Teknis |

### Super Admin

| Tahap / kondisi | Yang muncul |
| --- | --- |
| Sampai tahap Tes Tertulis berakhir, pengaturan tes **belum diterapkan** atau **paket berubah** | `action` (sebelum tahap) / `pending` (tahap sudah dibuka) → **Atur** |
| Tahap Tes Tertulis dibuka & sudah diterapkan | `info` "N dari M peserta sudah mengerjakan" → **Pantau** |
| Tahap Penetapan dibuka, semua penilaian lengkap | `action` "Hasil N peserta siap ditetapkan" → **Tetapkan** |
| Tahap Penetapan dibuka, ada yang belum lengkap | `waiting` → **Lihat** |
| Tahap Penetapan dibuka, sudah ditetapkan | `done` jumlah Lulus/Remedial → **Lihat** |
| Hasil sudah diumumkan | Sama seperti Verifikator (**Tinjau** / **Lihat** Hasil Akhir) |
| Tahap lain tanpa tugas Super Admin | `info` + pintasan pemantauan: **Lihat Verifikasi Peserta** (Pendaftaran, Verifikasi Peserta), **Lihat** (SA, Verifikasi SA), **Lihat Penilaian Asesor** (Penilaian Asesor) |

Saat menambah tahap/fitur baru, perbarui tabel di atas.

## Teks Pengumuman Sertifikasi (Peserta)

Halaman `/peserta/announcement/:applicationId` (K-26). Teks dibuat singkat; ubah di
`app/pages/peserta/announcement/[applicationId].vue` (computed `notice`) dan perbarui tabel ini.

| Kondisi | Status | Warna/ikon | Judul | Teks |
| --- | --- | --- | --- | --- |
| Tahap Pengumuman belum dimulai | — | biru, `hourglass` | Hasil Akhir Belum Diumumkan | Hasil diumumkan mulai {tanggal mulai}. |
| Pengumuman dimulai, hasil belum ditetapkan | — | biru, `hourglass` | Hasil Akhir Sedang Ditetapkan | Mohon menunggu keputusan akhir dari panitia. |
| Lulus | `PASSED` | hijau, `award` | Selamat, Anda Lulus Sertifikasi | Anda lulus sertifikasi {nama periode}. Info penerimaan sertifikat akan disampaikan panitia. |
| Remedial, belum kirim | `REMEDIAL_PENDING` | kuning, `rotate-ccw` | Anda Belum Dapat Dinyatakan Lulus | Ada penilaian Anda yang belum memenuhi standar. Kerjakan tugas remedial sesuai instruksi panitia, lalu kirim link Google Drive-nya di bawah. / Remedial hanya satu kali. Hubungi panitia untuk detail kekurangan. |
| Tugas remedial terkirim | `REMEDIAL_SUBMITTED` | biru muda, `send` | Tugas Remedial Terkirim | Tugas remedial Anda sedang ditinjau panitia. |
| Lulus remedial | `REMEDIAL_PASSED` | hijau, `award` | Selamat, Anda Lulus Sertifikasi | Tugas remedial Anda memenuhi standar. Info penerimaan sertifikat akan disampaikan panitia. |
| Tidak lulus remedial | `REMEDIAL_FAILED` | merah, `circle-x` | Anda Belum Lulus Sertifikasi | Tugas remedial Anda belum memenuhi standar. Terima kasih atas partisipasi Anda. Silakan mendaftar kembali pada periode berikutnya. |
| Tidak kirim remedial sampai batas | `REMEDIAL_EXPIRED` | merah, `circle-x` | Anda Belum Lulus Sertifikasi | Anda tidak mengirim tugas remedial sampai batas waktu. Terima kasih atas partisipasi Anda. Silakan mendaftar kembali pada periode berikutnya. |
| Tidak Melanjutkan (K-25) | `WITHDRAWN` | merah, `circle-x` | Anda Belum Lulus Sertifikasi | Anda tidak mengikuti seluruh tahapan asesmen. Terima kasih atas partisipasi Anda. Silakan mendaftar kembali pada periode berikutnya. |

Form **Tugas Remedial** tampil untuk `REMEDIAL_PENDING` & `REMEDIAL_SUBMITTED`: badge "Batas: {akhir
tahap Pengumuman}", field Link Google Drive (wajib; bantuan "Pastikan akses link diatur ke 'Siapa saja yang
memiliki link'") dan Catatan (opsional), tombol **Kirim** / **Perbarui** dan **Buka Link**. Saat pengiriman
ditutup: alert "Pengiriman tugas remedial sedang ditutup" dan field nonaktif.

## Format Data

| Data | Format | Cara |
| --- | --- | --- |
| Tanggal & waktu | `13 Nov 2026, 09.30` | `new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })` |
| Tanggal saja | `13 November 2026` | `Intl.DateTimeFormat('id-ID', { dateStyle: 'long' })` |
| Ukuran file | `1,2 MB` | — |
| Nilai kosong | `Belum diisi` / `-` | — |

Data waktu dari server berformat ISO UTC; tampilkan dalam zona waktu browser.

## Form

- Label di atas field, `text-sm font-medium text-slate-700`; tandai wajib dengan `*`.
- Field lebar penuh: `class="w-full"`; ukuran `size="lg"` atau `size="xl"` untuk form utama.
- Validasi di client untuk kenyamanan, **tetap** divalidasi ulang di server.
- Pesan error per field di bawah field, `text-sm text-red-600`.
- Tombol form di kanan bawah: Batal (outline) lalu Simpan (primary).

## Aksesibilitas

- Tombol ikon wajib `aria-label`.
- Jangan menyampaikan status hanya lewat warna — selalu ada teks label.
- Elemen yang bisa diklik pakai `<button>`/`<NuxtLink>`/`UButton`, bukan `<div @click>`.

## Responsif

Dashboard dirancang desktop-first (sidebar tetap `w-72`). Konten halaman tetap harus
rapi di layar kecil: gunakan `flex-wrap`, `sm:grid-cols-2`, `min-w-0` + `truncate`/`break-words`
untuk teks panjang (email, nama instansi).
