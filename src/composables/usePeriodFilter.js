import { reactive } from 'vue'
import { getISOWeek, matchesPeriod, todayISO } from '../utils/period'

/**
 * Satu filter periode (harian/mingguan/bulanan/tahunan/semua).
 * Panggil sekali per tampilan, lalu `<PeriodFilter :filter="filter" />` dan `matches(tanggal)`.
 */
export function usePeriodFilter(initial = 'bulanan') {
  const now = new Date()
  const iso = getISOWeek(now)

  const filter = reactive({
    period: initial,
    date: todayISO(),
    weekNum: iso.week,
    weekYear: iso.year,
    month: now.getMonth() + 1,
    monthYear: now.getFullYear(),
    yearAnnual: now.getFullYear(),
  })

  const matches = (dateStr) => matchesPeriod(dateStr, filter)
  return { filter, matches }
}
