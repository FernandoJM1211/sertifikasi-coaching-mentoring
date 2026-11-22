/**
 * Unit kompetensi CMSP-03 (aspek kepublikan) — dinilai langsung oleh Asesor Kepublikan,
 * tanpa isian/bukti dari peserta. Isi mengikuti dokumen resmi CMSP-03 milik pemilik proyek;
 * jangan ubah tanpa diminta.
 *
 * Kode unit (`KEP.n`) hanya kunci internal penyimpanan (`public_assessments.unit_results`);
 * jangan diubah setelah ada data penilaian.
 */

export type Cmsp03Element = {
  title: string
  indicators: string[]
}

export type Cmsp03Unit = {
  number: number
  code: string
  title: string
  elements: Cmsp03Element[]
}

export const CMSP03_COMPETENCY_UNITS: Cmsp03Unit[] = [
  {
    number: 1,
    code: 'KEP.1',
    title: 'Meningkatkan Kesadaran Orientasi Publik',
    elements: [
      {
        title: 'Memahami Konsep dan Nilai Orientasi Publik',
        indicators: [
          'Memahami prinsip-prinsip orientasi publik dan nilai dasar pelayanan publik.',
          'Memahami pentingnya mengutamakan kepentingan publik atau masyarakat.',
          'Memahami hambatan dalam penerapan orientasi publik dalam instansi pemerintah.',
        ],
      },
      {
        title: 'Membangun Kesadaran Orientasi Publik',
        indicators: [
          'Memahami peran dan tugas sebagai Pegawai ASN yang dikaitkan dengan tanggung jawab untuk mendukung kebutuhan/kepuasan masyarakat.',
          'Memahami dampak perilaku dan keputusan sebagai Pegawai ASN terhadap kepercayaan publik.',
          'Contoh perilaku yang pernah dilakukan terkait kontribusinya dalam mewujudkan birokrasi berorientasi publik.',
        ],
      },
    ],
  },
  {
    number: 2,
    code: 'KEP.2',
    title: 'Mengembangkan Pola Pikir Bertumbuh dan Kreativitas dalam Birokrasi',
    elements: [
      {
        title: 'Mengidentifikasi Prinsip dan Karakteristik Pola Pikir Bertumbuh (Growth Mindset)',
        indicators: [
          'Memahami konsep growth mindset dalam konteks organisasi pemerintahan.',
          'Memahami perbedaan antara fixed mindset dan growth mindset.',
          'Memahami nilai-nilai dasar pola pikir bertumbuh dan kreativitas dan dampaknya terhadap perilaku, kinerja, dan pengembangan diri Pegawai ASN.',
        ],
      },
      {
        title: 'Mengembangkan Kreativitas',
        indicators: [
          'Memahami teknik berpikir kreatif untuk memecahkan masalah birokrasi.',
          'Memahami hambatan budaya birokrasi terhadap kreativitas.',
          'Contoh ide kreatif yang pernah dikembangkan atau diusulkan selaras dengan kebutuhan dan tujuan birokrasi.',
        ],
      },
    ],
  },
  {
    number: 3,
    code: 'KEP.3',
    title: 'Membangun Budaya Kerja Transformasional',
    elements: [
      {
        title: 'Memahami Konsep dan Prinsip Budaya Kerja Transformasional',
        indicators: [
          'Memahami konsep budaya kerja transformasional dalam birokrasi dan hubungannya dengan pencapaian tujuan birokrasi.',
          'Memahami nilai dan prinsip budaya kerja transformasional yang dikaitkan dengan peran sebagai Pegawai ASN.',
          'Memahami perbedaan budaya kerja transaksional dan transformasional.',
          'Memahami hubungan budaya kerja transformasional dengan pencapaian tujuan birokrasi.',
        ],
      },
      {
        title: 'Mengelola dan Memperkuat Budaya Kerja Transformasional',
        indicators: [
          'Memahami pola kerja, nilai, dan kebiasaan yang berlaku di organisasinya saat ini sebagai dasar melakukan perubahan.',
          'Memahami hambatan, kelemahan, dan kekuatan budaya kerja saat ini dalam organisasinya.',
          'Memahami tantangan dan dampak yang timbul terhadap produktivitas dan pelayanan publik bila budaya kerja lama dipertahankan.',
        ],
      },
    ],
  },
]
