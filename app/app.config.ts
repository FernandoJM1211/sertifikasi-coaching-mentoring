/**
 * Warna SOLID untuk badge & alert.
 *
 * Varian bawaan Nuxt UI memakai warna transparan (mis. `bg-warning/10`, `ring-warning/25`), sehingga
 * tercampur dengan latar halaman yang berwarna (gradien biru) dan menghasilkan warna baru.
 * Di sini diganti campuran warna tema dengan PUTIH pada persentase yang sama, jadi tampilannya
 * tetap lembut tetapi sama di atas latar apa pun.
 *
 * Ditambahkan lewat `compoundVariants` yang dijalankan setelah tema bawaan (extend), sehingga
 * kelas bg/ring di bawah menimpa kelas transparan bawaan.
 */
const COLORS = ['primary', 'secondary', 'success', 'info', 'warning', 'error'] as const
type Color = (typeof COLORS)[number]

// Kelas ditulis utuh (bukan disusun dari variabel) agar terdeteksi Tailwind saat build.
/** Latar: setara `bg-{color}/10`. */
const BG_10: Record<Color, string> = {
  primary: 'bg-[color:color-mix(in_oklab,var(--ui-primary)_10%,white)]',
  secondary: 'bg-[color:color-mix(in_oklab,var(--ui-secondary)_10%,white)]',
  success: 'bg-[color:color-mix(in_oklab,var(--ui-success)_10%,white)]',
  info: 'bg-[color:color-mix(in_oklab,var(--ui-info)_10%,white)]',
  warning: 'bg-[color:color-mix(in_oklab,var(--ui-warning)_10%,white)]',
  error: 'bg-[color:color-mix(in_oklab,var(--ui-error)_10%,white)]',
}

/** Garis tepi: setara `ring-{color}/25`. */
const RING_25: Record<Color, string> = {
  primary: 'ring-[color:color-mix(in_oklab,var(--ui-primary)_25%,white)]',
  secondary: 'ring-[color:color-mix(in_oklab,var(--ui-secondary)_25%,white)]',
  success: 'ring-[color:color-mix(in_oklab,var(--ui-success)_25%,white)]',
  info: 'ring-[color:color-mix(in_oklab,var(--ui-info)_25%,white)]',
  warning: 'ring-[color:color-mix(in_oklab,var(--ui-warning)_25%,white)]',
  error: 'ring-[color:color-mix(in_oklab,var(--ui-error)_25%,white)]',
}

/** Garis tepi: setara `ring-{color}/50` (badge outline). */
const RING_50: Record<Color, string> = {
  primary: 'ring-[color:color-mix(in_oklab,var(--ui-primary)_50%,white)]',
  secondary: 'ring-[color:color-mix(in_oklab,var(--ui-secondary)_50%,white)]',
  success: 'ring-[color:color-mix(in_oklab,var(--ui-success)_50%,white)]',
  info: 'ring-[color:color-mix(in_oklab,var(--ui-info)_50%,white)]',
  warning: 'ring-[color:color-mix(in_oklab,var(--ui-warning)_50%,white)]',
  error: 'ring-[color:color-mix(in_oklab,var(--ui-error)_50%,white)]',
}

/** Netral: setara `bg-elevated/50` (alert soft/subtle). */
const NEUTRAL_BG_50 = 'bg-[color:color-mix(in_oklab,var(--ui-bg-elevated)_50%,white)]'

/**
 * Latar muda selalu bergaris tepi (docs/05). Varian `soft` bawaan Nuxt UI tidak punya garis tepi,
 * sehingga menyatu dengan latar halaman; di sini diberi garis tepi yang sama dengan varian `subtle`.
 */
const RING = 'ring ring-inset'
const NEUTRAL_RING = 'ring ring-inset ring-slate-300'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      // Ungu: status "Selesai" (badge tabel mengikuti warna card ringkasan).
      secondary: 'violet',
      neutral: 'slate'
    },
    badge: {
      compoundVariants: COLORS.flatMap((color) => [
        { color, variant: 'subtle' as const, class: `${BG_10[color]} ${RING_25[color]}` },
        { color, variant: 'soft' as const, class: `${BG_10[color]} ${RING} ${RING_25[color]}` },
        { color, variant: 'outline' as const, class: RING_50[color] },
      ]),
      ...(['soft', 'subtle'] as const).map((variant) => ({ color: 'neutral' as const, variant, class: NEUTRAL_RING })),
    },
    alert: {
      compoundVariants: [
        ...COLORS.flatMap((color) => [
          { color, variant: 'subtle' as const, class: { root: `${BG_10[color]} ${RING_25[color]}` } },
          { color, variant: 'soft' as const, class: { root: `${BG_10[color]} ${RING} ${RING_25[color]}` } },
          { color, variant: 'outline' as const, class: { root: RING_25[color] } },
        ]),
        { color: 'neutral' as const, variant: 'subtle' as const, class: { root: `${NEUTRAL_BG_50} ${NEUTRAL_RING}` } },
        { color: 'neutral' as const, variant: 'soft' as const, class: { root: `${NEUTRAL_BG_50} ${NEUTRAL_RING}` } },
      ],
    },
  }
})
