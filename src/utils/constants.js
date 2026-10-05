export const EXPENSE_CATEGORIES = ['Bahan & Produk', 'Gaji / Komisen', 'Utiliti & Sewa', 'Operasi Harian', 'Lain-lain']
export const INCOME_CATEGORIES = ['Pendapatan Usaha', 'Pelunasan Invois', 'Sumbangan / Modal', 'Lain-lain']
export const SETTLEMENT_CATEGORY = 'Pelunasan Invois'
export const PERSONAL_CATEGORIES = [
  'Makan & Minum', 'Transportasi', 'Belanja', 'Tagihan & Utiliti',
  'Kesehatan', 'Keluarga', 'Hiburan', 'Lain-lain',
]

// Saran "sumber uang" (bisa juga mengetik sendiri).
export const DEFAULT_SOURCES = ['Kas Tunai', 'BIBD', 'Baiduri', 'Debit Card', 'Modal Pribadi']
export const NO_SOURCE = 'Tanpa sumber'
// Pembayaran invois otomatis masuk ke sumber uang ini.
export const SOURCE_BY_PAYMENT = { cash: 'Kas Tunai', bibd: 'BIBD', baiduri: 'Baiduri', debit: 'Debit Card' }

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
]

export const DEFAULT_START_TIME = '10:00'
export const DEFAULT_END_TIME = '11:00'
export const NO_THERAPIST = 'Tanpa Terapis'
export const THERAPIST_BONUS_RATE = 0.10
export const PACKAGE_PAYMENT = 'Paket (sudah dibayar)'
