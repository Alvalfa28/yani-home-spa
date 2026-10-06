import { MONTH_NAMES } from './constants'

const pad = (n) => String(n).padStart(2, '0')

/** Tanggal LOKAL 'YYYY-MM-DD' (toISOString() memakai UTC dan bisa mundur sehari). */
export const toLocalISODate = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = () => toLocalISODate(new Date())

/** Parse 'YYYY-MM-DD' sebagai tanggal lokal (new Date('YYYY-MM-DD') dibaca sebagai UTC). */
export const parseLocalDate = (str) => {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Minggu ISO-8601 beserta tahun ISO-nya (di sekitar 1 Jan tahun ISO bisa beda dari tahun kalender). */
export const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return { week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7), year: d.getUTCFullYear() }
}

export const getWeekNumber = (date) => getISOWeek(date).week

/** Jumlah minggu ISO dalam setahun (52 atau 53). 28 Des selalu ada di minggu terakhir. */
export const weeksInYear = (year) => getISOWeek(new Date(year, 11, 28)).week

/** Pilihan tahun untuk dropdown: 4 tahun ke belakang sampai 1 tahun ke depan. */
export const yearOptions = () => {
  const y = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => y - 4 + i)
}

/** Apakah dateStr ('YYYY-MM-DD') masuk filter periode? `f` = state dari usePeriodFilter. */
export const matchesPeriod = (dateStr, f) => {
  if (f.period === 'semua') return true
  if (!dateStr) return false
  const str = String(dateStr).slice(0, 10)
  if (f.period === 'harian') return str === f.date

  const d = parseLocalDate(str)
  if (f.period === 'mingguan') {
    const iso = getISOWeek(d)
    return iso.week === Number(f.weekNum) && iso.year === Number(f.weekYear)
  }
  if (f.period === 'bulanan') {
    return d.getMonth() + 1 === Number(f.month) && d.getFullYear() === Number(f.monthYear)
  }
  if (f.period === 'tahunan') return d.getFullYear() === Number(f.yearAnnual)
  return true
}

export const describePeriod = (f) => {
  switch (f.period) {
    case 'harian': return `Harian (${f.date})`
    case 'mingguan': return `Mingguan (minggu ke-${f.weekNum}, ${f.weekYear})`
    case 'bulanan': return `Bulanan (${MONTH_NAMES[f.month - 1]} ${f.monthYear})`
    case 'tahunan': return `Tahunan (${f.yearAnnual})`
    default: return 'Semua periode'
  }
}

/** Tambah/kurang hari pada 'YYYY-MM-DD' (tanggal lokal). */
export const addDaysISO = (dateStr, days) => {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  return toLocalISODate(d)
}

/** Selisih hari (to - from). Positif bila `to` di masa depan. */
export const diffDays = (fromStr, toStr) =>
  Math.round((parseLocalDate(toStr) - parseLocalDate(fromStr)) / 86400000)

/** '2026-10-30' -> '30 Oktober 2026' (short: '30 Okt'). */
export const formatDateID = (dateStr, short = false) => {
  if (!dateStr) return '-'
  const d = parseLocalDate(dateStr)
  const month = MONTH_NAMES[d.getMonth()]
  return short ? `${d.getDate()} ${month.slice(0, 3)}` : `${d.getDate()} ${month} ${d.getFullYear()}`
}
