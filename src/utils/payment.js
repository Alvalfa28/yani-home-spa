export const PAYMENT_METHODS = [
  'Cash',
  'Transfer BIBD',
  'Transfer Baiduri',
  'QR Pay BIBD',
  'QR PAY BAIDURI',
  'Debit Card',
  'Belum Lunas',
]

export const UNPAID = 'Belum Lunas'

export const isUnpaid = (method) => (method || '').toLowerCase().includes('belum lunas')

/** Merapikan nilai dari database (spasi tersembunyi, variasi huruf "Belum Lunas"). */
export const normalizePaymentMethod = (method) => {
  const raw = (method || 'Cash').trim()
  return isUnpaid(raw) ? UNPAID : raw
}

/** Kelompok untuk rincian pembayaran: cash | bibd | baiduri | debit | belumLunas */
export const categorizePayment = (method) => {
  const m = (method || '').toLowerCase()
  if (m.includes('belum lunas')) return 'belumLunas'
  if (m.includes('bibd')) return 'bibd'
  if (m.includes('baiduri')) return 'baiduri'
  if (m.includes('debit')) return 'debit'
  return 'cash'
}
