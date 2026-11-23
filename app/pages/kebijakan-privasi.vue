<script setup lang="ts">
// Halaman publik; tautannya didaftarkan pada Branding Google OAuth (privacy policy).
useHead({ title: 'Kebijakan Privasi' })
</script>

<template>
  <LayoutLegalPage title="Kebijakan Privasi" effective-date="23 November 2026">
    <p>
      Sistem Sertifikasi Coaching dan Mentoring Sektor Publik ("Sistem") dikelola oleh Direktorat
      Teknologi dan Digitalisasi Pembelajaran, Lembaga Administrasi Negara ("Penyelenggara").
      Kebijakan ini menjelaskan data apa yang dikumpulkan, untuk apa digunakan, dan bagaimana data
      tersebut disimpan dan dilindungi.
    </p>

    <div>
      <h2>1. Data yang Dikumpulkan</h2>
      <ul>
        <li><b>Data identitas & kepegawaian:</b> nama lengkap, NIP, email, nomor WhatsApp, instansi, asal daerah, pendidikan terakhir, jabatan, jenis kelamin, tempat dan tanggal lahir.</li>
        <li><b>Berkas pendaftaran dan bukti dukung:</b> dokumen yang diunggah, misalnya KTP, surat tugas, dokumen pendaftaran, serta bukti kompetensi pada self assessment (CMSP-01 dan CMSP-02), termasuk tautan yang Anda cantumkan.</li>
        <li><b>Data proses sertifikasi:</b> status pengajuan, catatan verifikasi, jawaban dan nilai tes tertulis, serta hasil penilaian asesor.</li>
        <li><b>Data akun dan keamanan:</b> email login, kata sandi dalam bentuk hash (tidak disimpan dalam bentuk asli), waktu login, dan alamat IP saat login.</li>
      </ul>
    </div>

    <div>
      <h2>2. Penggunaan Data</h2>
      <p>Data digunakan hanya untuk menyelenggarakan sertifikasi, yaitu:</p>
      <ul>
        <li>memverifikasi pendaftaran dan membuat akun peserta;</li>
        <li>memeriksa self assessment, melaksanakan tes tertulis, dan penilaian oleh asesor;</li>
        <li>menetapkan dan mengumumkan hasil sertifikasi;</li>
        <li>mengirim email terkait proses sertifikasi, misalnya aktivasi akun dan hasil verifikasi;</li>
        <li>menjaga keamanan akun dan sistem.</li>
      </ul>
      <p class="mt-2">Data tidak dijual, tidak digunakan untuk iklan, dan tidak dibagikan kepada pihak lain di luar keperluan sertifikasi, kecuali diwajibkan oleh peraturan perundang-undangan.</p>
    </div>

    <div>
      <h2>3. Pihak yang Dapat Mengakses Data</h2>
      <p>
        Data hanya dapat diakses oleh petugas yang berwenang sesuai perannya: Super Admin,
        Verifikator, Asesor Teknis, dan Asesor Kepublikan. Asesor hanya melihat data peserta yang
        ditugaskan kepadanya.
      </p>
    </div>

    <div>
      <h2>4. Penyimpanan Data dan Layanan Google</h2>
      <p>
        Data isian disimpan pada Google Sheets dan berkas yang diunggah disimpan pada Google Drive
        milik Penyelenggara. Sistem menggunakan akses Google Drive dengan cakupan
        <code>drive.file</code>, yaitu hanya untuk membuat dan membaca berkas yang diunggah melalui
        Sistem ke Drive Penyelenggara. Sistem <b>tidak</b> meminta akses ke akun Google milik peserta
        dan tidak membaca berkas lain di Google Drive.
      </p>
      <p class="mt-2">
        Penggunaan dan pemindahan informasi yang diterima dari Google API mematuhi
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Kebijakan Data Pengguna Layanan Google API</a>,
        termasuk ketentuan Penggunaan Terbatas (Limited Use).
      </p>
    </div>

    <div>
      <h2>5. Keamanan</h2>
      <p>
        Akses ke Sistem memerlukan login, kata sandi disimpan dalam bentuk hash, sesi login berlaku
        terbatas, dan berkas hanya dapat dibuka oleh pengguna yang berhak melalui Sistem.
      </p>
    </div>

    <div>
      <h2>6. Masa Penyimpanan</h2>
      <p>
        Data disimpan selama diperlukan untuk penyelenggaraan sertifikasi serta keperluan
        administrasi dan arsip Penyelenggara sesuai ketentuan yang berlaku.
      </p>
    </div>

    <div>
      <h2>7. Hak Anda</h2>
      <p>
        Anda dapat melihat dan memperbarui data profil melalui akun Anda. Untuk permintaan koreksi
        atau pertanyaan lain terkait data pribadi, hubungi Penyelenggara melalui kontak di bawah.
      </p>
    </div>

    <div>
      <h2>8. Perubahan Kebijakan</h2>
      <p>Kebijakan ini dapat diperbarui sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini.</p>
    </div>

    <div>
      <h2>9. Kontak</h2>
      <p>
        Direktorat Teknologi dan Digitalisasi Pembelajaran, Lembaga Administrasi Negara<br>
        Jl. Veteran No.10, Jakarta 10110<br>
        Email: <a href="mailto:dit.tekdigi@gmail.com">dit.tekdigi@gmail.com</a>
      </p>
    </div>
  </LayoutLegalPage>
</template>
