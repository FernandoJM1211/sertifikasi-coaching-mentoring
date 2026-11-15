/**
 * Unit kompetensi CMSP-02 (Self Assessment Teknis).
 * Dipakai form peserta, validasi server, dan nanti penilaian Asesor Teknis.
 */

export type CompetencyUnit = {
  number: number
  code: string
  title: string
  elements: string[]
  relevantEvidence: string[]
}

export const CMSP02_COMPETENCY_UNITS: CompetencyUnit[] = [
  {
    number: 1,
    code: 'UK.CMSP.1',
    title: 'Memahami Praktik Coaching dan Mentoring pada Sektor Publik',
    elements: [
      'Menyampaikan pengertian, tujuan, dan Prinsip Coaching dan Mentoring pada sektor publik',
      'Menyampaikan tahapan dan peran yang terlibat dalam proses Coaching dan Mentoring pada sektor publik.',
    ],
    relevantEvidence: [
      'Sertifikat pelatihan coaching dan mentoring',
      'Modul atau materi terkait coaching/mentoring yang pernah dibuat',
      'Presentasi atau bahan paparan yang pernah digunakan untuk menjelaskan coaching dan mentoring',
    ],
  },
  {
    number: 2,
    code: 'UK.CMSP.2',
    title: 'Membangun Hubungan Coaching dan Mentoring yang Efektif',
    elements: [
      'Mengidentifikasi kebutuhan dan tujuan pengembangan individu',
      'Menciptakan suasana aman, nyaman dan mendukung proses Coaching/Mentoring',
      'Melakukan komunikasi yang efektif dalam konteks Coaching/Mentoring',
      'Menetapkan kesepakatan sesi Coaching/Mentoring.',
    ],
    relevantEvidence: [
      'Form/lembar identifikasi profil dan kebutuhan coachee/mentee',
      'Rekaman video proses Coaching/mentoring',
      'Form kontrak pembelajaran atau kesepakatan sesi coaching/mentoring',
    ],
  },
  {
    number: 3,
    code: 'UK.CMSP.3',
    title: 'Memfasilitasi Proses Pencapaian Tujuan',
    elements: [
      'Menetapkan Tujuan Pengembangan Individu yang Jelas dan Relevan',
      'Mengembangkan Rencana Aksi yang Terukur',
    ],
    relevantEvidence: [
      'Rekaman video proses Coaching/mentoring',
      'Form penetapan tujuan pengembangan individu (Bukti perumusan tujuan menggunakan prinsip SMART atau pendekatan sejenis/lainnya)',
      'Form Action Plan/Rencana Aksi/Pengembangan',
    ],
  },
  {
    number: 4,
    code: 'UK.CMSP.4',
    title: 'Memfasilitasi Pemantauan dan Evaluasi',
    elements: [
      'Mengidentifikasi Indikator Keberhasilan Proses Coaching/Mentoring',
      'Memantau Kemajuan dan Perkembangan Coachee/Mentee',
      'Memfasilitasi Refleksi dan Umpan Balik Positif terhadap Proses dan Hasil Coaching/Mentoring',
    ],
    relevantEvidence: [
      'Rekaman video proses Coaching/mentoring',
      'Form monitoring dan evaluasi coaching dan mentoring',
    ],
  },
  {
    number: 5,
    code: 'UK.CSP.1',
    title: 'Mendengarkan Aktif dan Kehadiran Penuh (Active Listening and Presence)',
    elements: [
      'Menggunakan keterampilan mendengarkan aktif (Active Listening).',
      'Menciptakan Kehadiran Penuh (Establish Presence)',
    ],
    relevantEvidence: [
      'Rekaman video praktik coaching yang menunjukkan unit kompetensi',
    ],
  },
  {
    number: 6,
    code: 'UK.CSP.2',
    title: 'Menggunakan Teknik Bertanya Reflektif dan Mendalam (Powerfull Questioning)',
    elements: [
      'Mengajukan Pertanyaan yang Membuka Wawasan.',
      'Mengajukan Pertanyaan yang Reflektif dan Memberdayakan',
    ],
    relevantEvidence: [
      'Rekaman video praktik coaching yang menunjukkan unit kompetensi',
    ],
  },
  {
    number: 7,
    code: 'UK.CSP.3',
    title: 'Menerapkan Model dan Kerangka Sistematis dalam Proses Coaching',
    elements: [
      'Mengidentifikasi Model dan Kerangka Coaching yang Relevan',
      'Melaksanakan Tahapan Coaching secara Sistematis',
    ],
    relevantEvidence: [
      'Form/dokumen praktik coaching yang menggunakan model dan kerangka coaching, misalnya GROW, CLEAR, OSCAR, atau model lain beserta karakteristik dan penggunaannya',
    ],
  },
  {
    number: 8,
    code: 'UK.MSP.1',
    title: 'Menggunakan Teknik Berbagi Pengetahuan dan Pengalaman',
    elements: [
      'Memilih Teknik Berbagi Pengetahuan dan Pengalaman yang Sesuai dengan Karakter Mentee.',
      'Menyampaikan Pengetahuan dan Pengalaman secara Inspiratif dan Aplikatif.',
    ],
    relevantEvidence: [
      'Rencana Sesi Mentoring yang memuat karakteristik/kebutuhan mentee dan teknik berbagi yang dipilih',
      'Rekaman video sesi mentoring yang menunjukkan unit kompetensi',
    ],
  },
  {
    number: 9,
    code: 'UK.MSP.2',
    title: 'Memberikan Bimbingan dan Dukungan Peningkatan Kinerja',
    elements: [
      'Mengidentifikasi Data dan Informasi Kinerja',
      'Melakukan Analisis Kebutuhan Peningkatan Kinerja',
      'Memberikan Bimbingan Peningkatan Kemampuan dan Hasil Kerja',
    ],
    relevantEvidence: [
      'Log Book atau Catatan Sesi Mentoring yang terkait dengan memberikan bimbingan dan dukungan peningkatan kinerja',
    ],
  },
  {
    number: 10,
    code: 'UK.MSP.3',
    title: 'Memberikan Bimbingan Adaptasi dan Penyesuaian Peran',
    elements: [
      'Mengidentifikasi Kebutuhan Adaptasi dan Penyesuaian Peran Mentee',
      'Memberikan Dukungan Adaptasi dan Penyesuaian Peran Mentee',
    ],
    relevantEvidence: [
      'Log Book atau Catatan Sesi Mentoring yang terkait dengan bimbingan adaptasi dan penyesuaian peran',
    ],
  },
]

export const CMSP02_UNIT_CODES = CMSP02_COMPETENCY_UNITS.map((unit) => unit.code)
