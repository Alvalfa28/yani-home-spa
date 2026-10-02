export const formatCurrency = (val) =>
  'B$ ' + Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatNumberID = (val) =>
  Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  const dateStr = d.toLocaleDateString('en-GB')
  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${dateStr}, ${timeStr}`
}
