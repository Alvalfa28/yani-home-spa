import { ref, computed } from 'vue'
import { useMasterData } from './useMasterData'
import { matchesQuery, tokenize, treatmentNames } from '../utils/search'
import { todayISO, formatDateID, parseLocalDate } from '../utils/period'
import { DAY_NAMES, NO_THERAPIST, RESERVATION_STATUS as ST } from '../utils/constants'

const MAX_RESULTS = 100
const dateWords = (d) => (d ? `${formatDateID(d)} ${DAY_NAMES[parseLocalDate(d).getDay()]} ${d}` : '')
const hm = (t) => String(t || '').slice(0, 5)

/** Cari di booking sesi DAN perkiraan tanggal: nama, no. HP, alamat, terapis, catatan, rawatan, paket, status, tanggal/hari/bulan. */
export function useCalendarSearch() {
  const { bookingList, reservationList } = useMasterData()
  const query = ref('')

  const results = computed(() => {
    if (tokenize(query.value).length === 0) return []
    const items = []

    bookingList.value.forEach((b) => {
      const fields = [
        b.customer_name, b.customer_phone, b.customer_address, b.therapist, b.notes, b.package_label,
        b.status || 'Terjadwal', b.is_package ? 'paket' : '', b.payment_method,
        treatmentNames(b.treatments), dateWords(b.booking_date), 'sesi booking',
      ]
      if (!matchesQuery(fields, query.value)) return
      const start = hm(b.booking_start_time || b.booking_time)
      items.push({
        key: 'b' + b.id,
        kind: b.is_package ? 'paket' : 'sesi',
        date: b.booking_date,
        time: start ? `${start} - ${hm(b.booking_end_time) || 'selesai'}` : '',
        name: b.customer_name,
        phone: b.customer_phone || '',
        therapist: b.therapist || NO_THERAPIST,
        status: b.status || 'Terjadwal',
        detail: treatmentNames(b.treatments),
        source: b,
      })
    })

    reservationList.value.forEach((r) => {
      const status = r.status || ST.WAITING
      const statusText = status === ST.SCHEDULED ? 'Sudah mulai rawatan' : status
      const fields = [
        r.customer_name, r.customer_phone, r.customer_address, r.therapist, r.notes,
        treatmentNames(r.treatments), statusText, 'perkiraan tanggal belum pasti',
        dateWords(r.expected_date), dateWords(r.original_date),
      ]
      if (!matchesQuery(fields, query.value)) return
      items.push({
        key: 'r' + r.id,
        kind: 'perkiraan',
        date: r.expected_date,
        time: '',
        name: r.customer_name,
        phone: r.customer_phone || '',
        therapist: r.therapist || '',
        status: statusText,
        detail: treatmentNames(r.treatments),
        source: r,
      })
    })

    // Mendatang (terdekat dulu), lalu yang sudah lewat (terbaru dulu).
    const today = todayISO()
    const byTime = (a, b) => String(a.date).localeCompare(String(b.date)) || a.time.localeCompare(b.time)
    const upcoming = items.filter((i) => i.date >= today).sort(byTime)
    const past = items.filter((i) => i.date < today).sort((a, b) => byTime(b, a))
    return [...upcoming, ...past].slice(0, MAX_RESULTS)
  })

  return { query, results }
}
