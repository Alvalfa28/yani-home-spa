import { ref, computed } from 'vue'
import { useMasterData } from './useMasterData'
import { usePeriodFilter } from './usePeriodFilter'
import { matchesQuery, treatmentNames } from '../utils/search'
import { parseLocalDate, formatDateID } from '../utils/period'
import { DAY_NAMES, RESERVATION_STATUS as ST } from '../utils/constants'

export const STATUS_OPTIONS = [
  { value: 'aktif', label: 'Menunggu + ✅ sudah mulai' },
  { value: 'menunggu', label: 'Hanya menunggu' },
  { value: 'mulai', label: 'Hanya ✅ sudah mulai rawatan' },
  { value: 'batal', label: 'Dibatalkan' },
  { value: 'semua', label: 'Semua status' },
]

export const SORT_OPTIONS = [
  { value: 'tanggal-asc', label: 'Tanggal perkiraan: terdekat dulu' },
  { value: 'tanggal-desc', label: 'Tanggal perkiraan: terjauh dulu' },
  { value: 'nama', label: 'Nama A–Z' },
  { value: 'dibuat', label: 'Terakhir dicatat' },
]

/**
 * Daftar perkiraan tanggal dengan: filter periode (harian/mingguan/bulanan/tahunan/semua),
 * hari dalam seminggu, status, pencarian teks, dan urutan.
 */
export function useReservationList() {
  const { reservationList } = useMasterData()
  const { filter, matches } = usePeriodFilter('semua')

  const query = ref('')
  const status = ref('aktif')
  const weekday = ref('') // '' = semua hari, 0..6 = Ahad..Sabtu
  const sort = ref('tanggal-asc')

  const statusOf = (r) => r.status || ST.WAITING
  const passStatus = (r) => {
    const st = statusOf(r)
    switch (status.value) {
      case 'menunggu': return st === ST.WAITING
      case 'mulai': return st === ST.SCHEDULED
      case 'batal': return st === ST.CANCELLED
      case 'semua': return true
      default: return st !== ST.CANCELLED
    }
  }

  const list = computed(() => {
    const rows = reservationList.value.filter((r) => {
      if (!passStatus(r)) return false
      if (!matches(r.expected_date)) return false
      if (weekday.value !== '' && r.expected_date && parseLocalDate(r.expected_date).getDay() !== Number(weekday.value)) return false
      const dayName = r.expected_date ? DAY_NAMES[parseLocalDate(r.expected_date).getDay()] : ''
      return matchesQuery([
        r.customer_name, r.customer_phone, r.customer_address, r.therapist, r.notes,
        treatmentNames(r.treatments), statusOf(r) === ST.SCHEDULED ? 'sudah mulai rawatan' : statusOf(r),
        formatDateID(r.expected_date), dayName, r.expected_date,
      ], query.value)
    })

    const dateAsc = (a, b) => String(a.expected_date).localeCompare(String(b.expected_date))
    switch (sort.value) {
      case 'tanggal-desc': return rows.sort((a, b) => dateAsc(b, a))
      case 'nama': return rows.sort((a, b) => String(a.customer_name).localeCompare(String(b.customer_name)) || dateAsc(a, b))
      case 'dibuat': return rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      default: return rows.sort(dateAsc)
    }
  })

  const totalCount = computed(() => reservationList.value.length)

  const isFiltered = computed(
    () => filter.period !== 'semua' || query.value.trim() !== '' || status.value !== 'aktif' || weekday.value !== '' || sort.value !== 'tanggal-asc',
  )

  const reset = () => {
    filter.period = 'semua'
    query.value = ''
    status.value = 'aktif'
    weekday.value = ''
    sort.value = 'tanggal-asc'
  }

  return { filter, query, status, weekday, sort, list, totalCount, isFiltered, reset }
}
