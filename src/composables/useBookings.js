import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { useCustomers } from './useCustomers'
import { todayISO, toLocalISODate } from '../utils/period'
import { friendlyDbError } from '../utils/db'
import { normalizePaymentMethod } from '../utils/payment'
import { DEFAULT_END_TIME, NO_THERAPIST, PACKAGE_PAYMENT } from '../utils/constants'

// State kalender di level modul agar bulan/tanggal terpilih tidak hilang saat pindah tab.
const now = new Date()
const calendarViewMonth = ref(now.getMonth() + 1)
const calendarViewYear = ref(now.getFullYear())
const selectedCalendarDate = ref(todayISO())

// Kolom bertipe `time` bisa mengembalikan 'HH:MM:SS'; bandingkan hanya 'HH:MM'.
const toHM = (t) => String(t || '').slice(0, 5)
// Jam boleh kosong: '' artinya belum ditentukan.
const startOf = (b) => toHM(b.booking_start_time || b.booking_time)
const endOf = (b) => toHM(b.booking_end_time) || (startOf(b) ? DEFAULT_END_TIME : '')
const toMinutes = (hm) => {
  const [h, m] = String(hm).split(':').map(Number)
  return h * 60 + m
}
const LONG_SESSION_MINUTES = 6 * 60
const isOverlapping = (s1, e1, s2, e2) => s1 < e2 && s2 < e1
// Sesi tanpa jam tampil paling bawah.
const byStartTime = (a, b) => (startOf(a) || '99:99').localeCompare(startOf(b) || '99:99')

export const blankBooking = (date = todayISO()) => ({
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  booking_date: date,
  booking_start_time: '',
  booking_end_time: '',
  therapist: '',
  payment_method: 'Cash',
  is_package: false,      // sesi lanjutan paket yang sudah dibayar (tanpa nominal)
  was_package: false,
  package_label: '',
  selected_services: [],  // [{ id, qty, price }]
  legacy_treatments: [],  // rawatan lama yang sudah tidak ada di menu; dipertahankan apa adanya
  notes: '',
})

export function useBookings() {
  const { availableServices, availableTherapists, bookingList, fetchData } = useMasterData()
  const { showToast } = useToast()
  const { ensureCustomer } = useCustomers()

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

  // ---- Paket: nomor sesi per pelanggan + nama paket ----
  const packageKey = (b) =>
    b.is_package && b.package_label
      ? `${(b.customer_name || '').trim().toLowerCase()}|${b.package_label.trim().toLowerCase()}`
      : null

  const packageSessionInfo = computed(() => {
    const groups = {}
    bookingList.value.forEach((b) => {
      const key = packageKey(b)
      if (key && b.status !== 'Batal') (groups[key] ||= []).push(b)
    })
    const info = {}
    Object.values(groups).forEach((list) => {
      list
        .slice()
        .sort((a, b) => `${a.booking_date} ${startOf(a) || '99:99'}`.localeCompare(`${b.booking_date} ${startOf(b) || '99:99'}`))
        .forEach((b, i) => { info[b.id] = { index: i + 1, total: list.length } })
    })
    return info
  })

  const knownPackageLabels = computed(() => [
    ...new Set(bookingList.value.map((b) => (b.package_label || '').trim()).filter(Boolean)),
  ])

  // ---- Booking -> form (untuk edit) ----
  const makeEditForm = (book) => {
    const form = blankBooking(book.booking_date)
    form.customer_name = book.customer_name || ''
    form.customer_phone = book.customer_phone || ''
    form.customer_address = book.customer_address || ''
    form.booking_start_time = startOf(book)
    form.booking_end_time = startOf(book) ? endOf(book) : ''
    form.therapist = book.therapist && book.therapist !== NO_THERAPIST ? book.therapist : ''
    form.is_package = !!book.is_package
    form.was_package = !!book.is_package
    form.package_label = book.package_label || ''
    form.payment_method = book.is_package ? 'Cash' : normalizePaymentMethod(book.payment_method)
    form.notes = book.notes || ''

    ;(Array.isArray(book.treatments) ? book.treatments : []).forEach((t) => {
      const id = t.id || t.service_id
      const svc = availableServices.value.find((s) => String(s.id) === String(id))
      if (svc) {
        form.selected_services.push({ id: svc.id, qty: Number(t.qty) || 1, price: t.price ?? svc.default_price })
      } else {
        form.legacy_treatments.push(t)
      }
    })
    return form
  }

  // Salinan booking untuk dijadikan booking BARU (terapis dikosongkan agar dipilih ulang).
  const makeCopyForm = (book) => {
    const form = makeEditForm(book)
    form.therapist = ''
    form.was_package = false
    return form
  }

  // ---- Simpan (baru atau edit) ----
  const saveBooking = async (form, editingId = null) => {
    if (!form.customer_name.trim() || !form.booking_date) {
      showToast('Mohon isi Nama Pelanggan dan Tanggal Booking.', 'error')
      return false
    }

    const start = toHM(form.booking_start_time)
    const end = toHM(form.booking_end_time)
    if (!!start !== !!end) {
      showToast('❌ Isi jam mulai dan jam selesai sekaligus, atau kosongkan keduanya dulu.', 'error')
      return false
    }
    const timed = !!start && !!end
    if (timed && start >= end) {
      showToast('❌ Jam selesai harus lebih besar dari jam mulai!', 'error')
      return false
    }
    // Salah pilih AM/PM sering membuat durasi jadi belasan jam: minta konfirmasi sebelum menyimpan.
    if (timed && toMinutes(end) - toMinutes(start) > LONG_SESSION_MINUTES) {
      const hours = ((toMinutes(end) - toMinutes(start)) / 60).toFixed(1).replace('.0', '')
      if (!confirm(`Jam yang terbaca: ${start} sampai ${end} (${hours} jam). Apakah benar? Cek AM/PM pada jam selesai.`)) return false
    }
    if (form.is_package && !form.package_label.trim()) {
      showToast('❌ Isi nama paket (cth: Pantang 7 hari) agar sesi bisa dikelompokkan.', 'error')
      return false
    }

    const therapist = form.therapist || NO_THERAPIST

    // Bentrok jam hanya dicek bila jam diisi, dan hanya terhadap sesi lain yang punya jam.
    // Terapis berbeda pada jam yang sama TIDAK dianggap bentrok.
    if (timed) {
      const clash = bookingList.value.find((b) => {
        if (editingId != null && String(b.id) === String(editingId)) return false
        if (b.booking_date !== form.booking_date || b.status === 'Batal') return false
        const bs = startOf(b)
        const be = endOf(b)
        if (!bs || !be) return false
        const sameResource =
          b.therapist === therapist || therapist === NO_THERAPIST || !b.therapist || b.therapist === NO_THERAPIST
        return sameResource && isOverlapping(start, end, bs, be)
      })
      if (clash) {
        const who = `${clash.customer_name} (${clash.therapist || NO_THERAPIST}) ${startOf(clash)}-${endOf(clash)}`
        const hint = therapist === NO_THERAPIST || !clash.therapist || clash.therapist === NO_THERAPIST
          ? 'Booking tanpa terapis dianggap memakai semua terapis, pilih terapis terlebih dahulu.'
          : 'Pilih jam lain.'
        showToast(`❌ Jam ${start}-${end} bentrok dengan booking ${who}. ${hint}`, 'error')
        return false
      }
    }

    try {
      const treatments = [
        ...form.selected_services
          .map((entry) => {
            const svc = availableServices.value.find((s) => String(s.id) === String(entry.id))
            if (!svc) return null
            return {
              id: svc.id,
              name: svc.name,
              qty: Math.max(1, Number(entry.qty) || 1),
              price: form.is_package ? 0 : Number(entry.price ?? svc.default_price) || 0,
            }
          })
          .filter(Boolean),
        ...(form.legacy_treatments || []),
      ]

      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_address: form.customer_address.trim(),
        booking_date: form.booking_date,
        booking_time: timed ? start : null,
        booking_start_time: timed ? start : null,
        booking_end_time: timed ? end : null,
        therapist,
        payment_method: form.is_package ? PACKAGE_PAYMENT : form.payment_method || 'Cash',
        treatments,
        notes: form.notes,
      }
      // Kolom paket hanya dikirim bila perlu, supaya booking biasa tetap jalan sebelum migrasi.
      if (form.is_package || form.was_package) {
        payload.is_package = !!form.is_package
        payload.package_label = form.is_package ? form.package_label.trim() : null
      }

      const { error } = editingId
        ? await supabase.from('yhs_bookings').update(payload).eq('id', editingId)
        : await supabase.from('yhs_bookings').insert([{ ...payload, status: 'Terjadwal' }])
      if (error) throw error

      const customerWarning = await ensureCustomer({
        name: form.customer_name,
        phone: form.customer_phone,
        address: form.customer_address,
      })
      showToast(
        customerWarning
          ? `⚠️ Booking tersimpan, tetapi pelanggan belum masuk daftar: ${customerWarning}`
          : editingId ? '✏️ Booking berhasil diperbarui!' : '📅 Booking berhasil dicatat ke kalendar!',
        customerWarning ? 'error' : 'success',
      )
      await fetchData()
      return true
    } catch (err) {
      showToast('Gagal menyimpan booking: ' + friendlyDbError(err), 'error')
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

  // Pindahkan tampilan kalender ke tanggal tertentu (setelah menyimpan/edit).
  const focusDate = (dateStr) => {
    const [y, m] = String(dateStr).split('-').map(Number)
    calendarViewYear.value = y
    calendarViewMonth.value = m
    selectedCalendarDate.value = dateStr
  }

  return {
    calendarViewMonth, calendarViewYear, selectedCalendarDate,
    calendarDaysInMonth, bookingCountByDate, bookingsGroupedByTherapist,
    packageSessionInfo, knownPackageLabels,
    makeEditForm, makeCopyForm, saveBooking, updateBookingStatus, deleteBooking, focusDate,
  }
}
