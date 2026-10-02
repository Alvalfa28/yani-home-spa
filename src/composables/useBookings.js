import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { todayISO, toLocalISODate } from '../utils/period'
import { DEFAULT_START_TIME, DEFAULT_END_TIME, NO_THERAPIST } from '../utils/constants'

// State kalender di level modul agar bulan/tanggal terpilih tidak hilang saat pindah tab.
const now = new Date()
const calendarViewMonth = ref(now.getMonth() + 1)
const calendarViewYear = ref(now.getFullYear())
const selectedCalendarDate = ref(todayISO())

// Kolom bertipe `time` bisa mengembalikan 'HH:MM:SS'; bandingkan hanya 'HH:MM'.
const toHM = (t) => String(t || '').slice(0, 5)
const startOf = (b) => toHM(b.booking_start_time || b.booking_time) || DEFAULT_START_TIME
const endOf = (b) => toHM(b.booking_end_time) || DEFAULT_END_TIME
const isOverlapping = (s1, e1, s2, e2) => s1 < e2 && s2 < e1
const byStartTime = (a, b) => startOf(a).localeCompare(startOf(b))

export const blankBooking = (date = todayISO()) => ({
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  booking_date: date,
  booking_start_time: DEFAULT_START_TIME,
  booking_end_time: DEFAULT_END_TIME,
  therapist: '',
  payment_method: 'Cash',
  selected_services: [],
  notes: '',
})

export function useBookings() {
  const { availableServices, availableTherapists, bookingList, fetchData } = useMasterData()
  const { showToast } = useToast()

  // ---- Kalender ----
  const calendarDaysInMonth = computed(() => {
    const year = calendarViewYear.value
    const month = calendarViewMonth.value
    const days = []

    const leading = new Date(year, month - 1, 1).getDay()
    for (let i = 0; i < leading; i++) days.push({ dayNum: '', dateStr: '' })

    const total = new Date(year, month, 0).getDate()
    for (let n = 1; n <= total; n++) {
      days.push({ dayNum: n, dateStr: toLocalISODate(new Date(year, month - 1, n)) })
    }
    return days
  })

  // Jumlah sesi aktif (tanpa yang dibatalkan) per tanggal, dihitung sekali.
  const bookingCountByDate = computed(() => {
    const counts = {}
    bookingList.value.forEach((b) => {
      if (b.status === 'Batal') return
      counts[b.booking_date] = (counts[b.booking_date] || 0) + 1
    })
    return counts
  })

  const bookingsGroupedByTherapist = computed(() => {
    const dayBookings = bookingList.value.filter((b) => b.booking_date === selectedCalendarDate.value)
    const columns = {}
    const known = new Set(availableTherapists.value.map((t) => t.name))

    availableTherapists.value.forEach((thp) => {
      columns[thp.name] = dayBookings.filter((b) => b.therapist === thp.name).sort(byStartTime)
    })

    const unassigned = dayBookings
      .filter((b) => !b.therapist || b.therapist === NO_THERAPIST || !known.has(b.therapist))
      .sort(byStartTime)

    if (unassigned.length > 0 || Object.keys(columns).length === 0) {
      columns[NO_THERAPIST] = unassigned
    }
    return columns
  })

  // ---- Simpan ----
  const saveBooking = async (form) => {
    if (!form.customer_name.trim() || !form.booking_date) {
      showToast('Mohon isi Nama Pelanggan dan Tanggal Booking.', 'error')
      return false
    }

    const start = toHM(form.booking_start_time) || DEFAULT_START_TIME
    const end = toHM(form.booking_end_time) || DEFAULT_END_TIME
    if (start >= end) {
      showToast('❌ Jam selesai harus lebih besar dari jam mulai!', 'error')
      return false
    }

    const therapist = form.therapist || NO_THERAPIST
    const conflict = bookingList.value.some((b) => {
      if (b.booking_date !== form.booking_date || b.status === 'Batal') return false
      const sameResource =
        b.therapist === therapist || therapist === NO_THERAPIST || !b.therapist || b.therapist === NO_THERAPIST
      return sameResource && isOverlapping(start, end, startOf(b), endOf(b))
    })
    if (conflict) {
      showToast(`❌ Jam ${start} - ${end} sudah terisi/dibooking pada tanggal ini! Silakan pilih jam lain.`, 'error')
      return false
    }

    try {
      const treatments = form.selected_services
        .map((id) => availableServices.value.find((s) => s.id === id))
        .filter(Boolean)
        .map((s) => ({ id: s.id, name: s.name, price: s.default_price, qty: 1 }))

      const { error } = await supabase.from('yhs_bookings').insert([{
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_address: form.customer_address.trim(),
        booking_date: form.booking_date,
        booking_time: start,
        booking_start_time: start,
        booking_end_time: end,
        therapist,
        payment_method: form.payment_method || 'Cash',
        treatments,
        notes: form.notes,
        status: 'Terjadwal',
      }])
      if (error) throw error

      showToast('📅 Booking WhatsApp berhasil dicatat ke kalendar!')
      await fetchData()
      return true
    } catch (err) {
      showToast('Gagal menyimpan booking: ' + err.message, 'error')
      return false
    }
  }

  const updateBookingStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('yhs_bookings').update({ status }).eq('id', id)
      if (error) throw error
      showToast(`Status booking diubah menjadi ${status}`)
      await fetchData()
    } catch (err) {
      showToast('Gagal mengemas kini status: ' + err.message, 'error')
    }
  }

  const deleteBooking = async (id, customerName) => {
    if (!confirm(`Adakah anda pasti ingin memadam sesi booking untuk "${customerName}"?`)) return
    try {
      const { error } = await supabase.from('yhs_bookings').delete().eq('id', id)
      if (error) throw error
      showToast(`Sesi booking ${customerName} berhasil dipadam!`)
      await fetchData()
    } catch (err) {
      showToast('Gagal memadam sesi booking: ' + err.message, 'error')
    }
  }

  return {
    calendarViewMonth, calendarViewYear, selectedCalendarDate,
    calendarDaysInMonth, bookingCountByDate, bookingsGroupedByTherapist,
    saveBooking, updateBookingStatus, deleteBooking,
  }
}
