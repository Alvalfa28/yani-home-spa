export const formatInvoiceNumber = (dateStr, seq) =>
  `YHS-${String(dateStr || '').slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(3, '0')}`

/**
 * Peta id -> nomor invois.
 * Memakai kolom `invoice_number` bila ada; kalau tidak, nomor diturunkan dari urutan
 * pembuatan pada tanggal yang sama (lihat sql/migrations.sql untuk nomor permanen).
 */
export function buildInvoiceNumberMap(invoices) {
  const byDate = {}
  invoices.forEach((inv) => {
    const key = String(inv.invoice_date || '').slice(0, 10)
    ;(byDate[key] ||= []).push(inv)
  })

  const map = new Map()
  Object.entries(byDate).forEach(([date, list]) => {
    list
      .slice()
      .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
      .forEach((inv, i) => map.set(inv.id, inv.invoice_number || formatInvoiceNumber(date, i + 1)))
  })
  return map
}

/** Nomor berikutnya untuk tanggal tertentu = nomor terbesar yang ada + 1 (aman setelah ada invois dihapus). */
export function nextInvoiceNumber(dateStr, invoices) {
  const key = String(dateStr || '').slice(0, 10)
  const map = buildInvoiceNumberMap(invoices)
  let max = 0
  invoices
    .filter((inv) => String(inv.invoice_date || '').slice(0, 10) === key)
    .forEach((inv) => {
      const n = parseInt(String(map.get(inv.id) || '').split('-').pop(), 10) || 0
      if (n > max) max = n
    })
  return formatInvoiceNumber(key, max + 1)
}
