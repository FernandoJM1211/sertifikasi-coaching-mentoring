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
| Judul | `text-slate-900` |
| Teks isi | `text-slate-600` |
| Teks sekunder / keterangan | `text-slate-500` |
| Teks sangat redup | `text-slate-400` |
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
| Selesai dikerjakan/dinilai (ungu) | `secondary` (= `violet`, di `app.config.ts`) | evaluasi & penilaian asesor "Selesai" |

Jika halaman punya **card ringkasan** per status, warna badge di tabel **harus sama** dengan warna card
terkait (abu = `neutral`, kuning = `warning`, ungu = `secondary`, hijau = `success`, merah = `error`,
biru = `info`/`primary`).

Selalu tampilkan **label Bahasa Indonesia**, bukan nilai mentah database
(mis. `pending_verification` → "Menunggu Verifikasi"). Untuk role dan status akun pakai
`getRoleLabel()` dan `getAccountStatusLabel()` dari `shared/utils/roles.ts`.

## Tipografi

| Elemen | Class |
| --- | --- |
| Eyebrow (label kecil di atas judul) | `text-sm font-medium text-primary` |
| Judul halaman (h1) | `text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl` |
| Deskripsi halaman | `mt-2 max-w-2xl text-sm leading-6 text-slate-600` |
| Judul kartu/section (h2) | `font-semibold text-slate-900` (atau `text-lg font-semibold`) |
| Deskripsi kartu | `mt-1 text-sm text-slate-500` |
| Label field | `text-sm text-slate-500` |
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
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Judul Halaman
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Penjelasan singkat fungsi halaman.
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <UButton color="neutral" variant="outline" icon="i-lucide-arrow-left" to="/verifikator/periods">
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
        <p class="mt-1 text-sm text-slate-500">Keterangan singkat.</p>
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
    <p class="text-sm text-slate-500">{{ item.label }}</p>
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
    <p class="mt-1 text-sm text-slate-500">Keterangan singkat</p>
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
- Tombol aksi di kolom Aksi: `size="sm"`, `class="inline-flex w-32 justify-center"`.
  - Perlu ditindaklanjuti (mis. **Verifikasi**): `color="primary"` solid.
  - Hanya melihat (**Lihat**): `color="neutral" variant="outline"`.
  - Belum bisa diproses: tombol outline `disabled` dengan keterangan singkat.
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
