/** Normalisasi untuk pencarian: huruf kecil, tanpa aksen, spasi rapi. */
export const normalize = (v) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const tokenize = (query) => normalize(query).split(' ').filter(Boolean)

const digitsOf = (s) => String(s).replace(/\D/g, '')

/**
 * Cocok bila SETIAP kata pencarian ada di salah satu kolom (urutan bebas, huruf besar/kecil diabaikan).
 * Kata berupa angka juga dicocokkan ke nomor telepon tanpa spasi/tanda (cth: "673 123" cocok dengan "+673123").
 * Pencarian kosong = semua cocok.
 */
export const matchesQuery = (fields, query) => {
  const tokens = tokenize(query)
  if (tokens.length === 0) return true
  const hay = normalize(fields.filter((f) => f != null && f !== '').join(' '))
  const hayDigits = digitsOf(hay)
  return tokens.every((t) => {
    if (hay.includes(t)) return true
    const td = digitsOf(t)
    return /^[\d+\-()]+$/.test(t) && td.length >= 3 && hayDigits.includes(td)
  })
}

export const treatmentNames = (treatments) =>
  (Array.isArray(treatments) ? treatments : []).map((t) => t.name).filter(Boolean).join(' ')
