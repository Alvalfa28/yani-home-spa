import { computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useMasterData } from './useMasterData'
import { useToast } from './useToast'
import { useCustomers } from './useCustomers'
import { blankBooking } from './useBookings'
import { todayISO, addDaysISO, diffDays, formatDateID } from '../utils/period'
import { friendlyDbError } from '../utils/db'
import { DEFAULT_FLEX_DAYS, NO_THERAPIST, RESERVATION_STATUS as ST } from '../utils/constants'

export const blankReservation = () => ({
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  expected_date: todayISO(),
  flex_days: DEFAULT_FLEX_DAYS,
  therapist: '',
  selected_services: [], // [{ id, qty, price }]
  legacy_treatments: [],
  notes: '',
})

/**
 * Perkiraan tanggal = "tahanan tanggal" (hold) yang BELUM pasti: tanpa jam, tanpa terapis wajib,
 * tidak ikut cek bentrok, dan bisa digeser maju/mundur. Setelah tanggal pasti, dijadwalkan
 * menjadi booking sesi biasa (satu atau banyak sesi).
 */
export function useReservations() {
  const { reservationList, reservationsAvailable, availableServices, fetchData } = useMasterData()
  const { showToast } = useToast()
  const { ensureCustomer } = useCustomers()

  const statusOf = (r) => r.status || ST.WAITING
  // Ceklis ✅ = sudah mulai rawatan / sudah dijadwalkan. Nilai di database tetap 'Sudah Dijadwalkan' (kompatibel dengan data lama).
  const isStarted = (r) => statusOf(r) === ST.SCHEDULED
  const byDateAsc = (a, b) => String(a.expected_date).localeCompare(String(b.expected_date))

  // Masih menunggu (belum mulai rawatan).
  const activeReservations = computed(() =>
    reservationList.value.filter((r) => statusOf(r) === ST.WAITING).slice().sort(byDateAsc),
  )
  // Pin ungu tetap tampil sebagai riwayat: menunggu + sudah diceklis. Hanya yang dibatalkan yang hilang.
  const pinnedReservations = computed(() =>
    reservationList.value.filter((r) => statusOf(r) !== ST.CANCELLED).slice().sort(byDateAsc),
  )
  // Sudah diceklis (mulai rawatan), terbaru dulu.
  const startedReservations = computed(() =>
    reservationList.value.filter(isStarted).slice().sort((a, b) => byDateAsc(b, a)),
  )
  const sortedAll = computed(() => reservationList.value.slice().sort(byDateAsc))

  // Pin per tanggal (menunggu + sudah diceklis) untuk kotak kalender dan blok hari terpilih.
  const reservationsByDate = computed(() => {
    const map = {}
    pinnedReservations.value.forEach((r) => {
      ;(map[r.expected_date] ||= []).push(r)
    })
    return map
  })

  // Jumlah yang masih MENUNGGU per tanggal (yang sudah diceklis tidak dihitung, tetapi pin-nya tetap tampil).
  const reservationCountByDate = computed(() => {
    const counts = {}
    activeReservations.value.forEach((r) => {
      counts[r.expected_date] = (counts[r.expected_date] || 0) + 1
    })
    return counts
  })

  // Untuk hari yang dipilih: pin yang tepat jatuh hari itu (termasuk yang sudah diceklis),
  // dan yang masih menunggu yang rentang fleksibelnya mencakup hari itu.
  const reservationsForDay = (dateStr) => {
    const exact = reservationsByDate.value[dateStr] || []
    const window = activeReservations.value.filter(
      (r) => r.expected_date !== dateStr && Number(r.flex_days) > 0 && Math.abs(diffDays(r.expected_date, dateStr)) <= Number(r.flex_days),
    )
    return { exact, window }
  }

  const windowRange = (r) =>
    Number(r.flex_days) > 0
      ? `${formatDateID(addDaysISO(r.expected_date, -Number(r.flex_days)), true)} – ${formatDateID(addDaysISO(r.expected_date, Number(r.flex_days)), true)}`
      : ''

  // ---- konversi rawatan <-> form ----
  const splitTreatments = (treatments) => {
    const selected = []
    const legacy = []
    ;(Array.isArray(treatments) ? treatments : []).forEach((t) => {
      const id = t.id || t.service_id
      const svc = availableServices.value.find((s) => String(s.id) === String(id))
      if (svc) selected.push({ id: svc.id, qty: Number(t.qty) || 1, price: t.price ?? svc.default_price })
      else legacy.push(t)
    })
    return { selected, legacy }
  }

  const makeEditForm = (r) => {
    const f = blankReservation()
    f.customer_name = r.customer_name || ''
    f.customer_phone = r.customer_phone || ''
    f.customer_address = r.customer_address || ''
    f.expected_date = r.expected_date
    f.flex_days = Number(r.flex_days) || 0
    f.therapist = r.therapist && r.therapist !== NO_THERAPIST ? r.therapist : ''
    f.notes = r.notes || ''
    const { selected, legacy } = splitTreatments(r.treatments)
    f.selected_services = selected
    f.legacy_treatments = legacy
    return f
  }

  // Form booking sesi yang terisi dari perkiraan; tanggal sebenarnya dipilih saat menyimpan.
  const makeBookingForm = (r) => {
    const f = blankBooking(r.expected_date)
    f.customer_name = r.customer_name || ''
    f.customer_phone = r.customer_phone || ''
    f.customer_address = r.customer_address || ''
    f.therapist = r.therapist && r.therapist !== NO_THERAPIST ? r.therapist : ''
    f.notes = `Dari perkiraan tgl ${formatDateID(r.expected_date)}${r.notes ? ': ' + r.notes : ''}`
    const { selected, legacy } = splitTreatments(r.treatments)
    f.selected_services = selected
    f.legacy_treatments = legacy
    return f
  }

  // ---- CRUD ----
  const saveReservation = async (form, editingId = null) => {
    if (!form.customer_name.trim() || !form.expected_date) {
      showToast('Mohon isi Nama Pelanggan dan Perkiraan Tanggal.', 'error')
      return false
    }
    try {
      const treatments = [
        ...form.selected_services
          .map((e) => {
            const svc = availableServices.value.find((s) => String(s.id) === String(e.id))
            return svc ? { id: svc.id, name: svc.name, qty: Math.max(1, Number(e.qty) || 1), price: Number(e.price ?? svc.default_price) || 0 } : null
          })
          .filter(Boolean),
        ...(form.legacy_treatments || []),
      ]
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: (form.customer_phone || '').trim(),
        customer_address: (form.customer_address || '').trim(),
        expected_date: form.expected_date,
        flex_days: Math.max(0, Number(form.flex_days) || 0),
        therapist: form.therapist || null,
        treatments,
        notes: (form.notes || '').trim(),
      }
      // `original_date` hanya diisi saat dibuat, supaya terlihat kalau tanggalnya kemudian bergeser.
      const { error } = editingId
        ? await supabase.from('yhs_reservations').update(payload).eq('id', editingId)
        : await supabase.from('yhs_reservations').insert([{ ...payload, original_date: payload.expected_date, status: ST.WAITING }])
      if (error) throw error

      const warn = await ensureCustomer({ name: payload.customer_name, phone: payload.customer_phone, address: payload.customer_address })
      showToast(
        warn
          ? `⚠️ Perkiraan tersimpan, tetapi pelanggan belum masuk daftar: ${warn}`
          : editingId ? '✏️ Perkiraan tanggal diperbarui!' : '📌 Perkiraan tanggal dicatat!',
        warn ? 'error' : 'success',
      )
      await fetchData()
      return true
    } catch (err) {
      showToast('Gagal menyimpan perkiraan tanggal: ' + friendlyDbError(err), 'error')
      return false
    }
  }

  const updateStatus = async (id, status, message) => {
    try {
      const { error } = await supabase.from('yhs_reservations').update({ status }).eq('id', id)
      if (error) throw error
      if (message) showToast(message)
      await fetchData()
      return true
    } catch (err) {
      showToast('Gagal mengubah status: ' + err.message, 'error')
      return false
    }
  }

  // Tombol ceklis: tandai sudah mulai rawatan, atau batalkan ceklis. Pin ungu TIDAK hilang.
  const markStarted = (id) => updateStatus(id, ST.SCHEDULED, '✅ Ditandai sudah mulai rawatan (pin tetap ada sebagai riwayat).')
  const unmarkStarted = (id) => updateStatus(id, ST.WAITING, 'Ceklis dibatalkan: perkiraan kembali menunggu.')
  const toggleStarted = (r) => (isStarted(r) ? unmarkStarted(r.id) : markStarted(r.id))

  // Setelah sesi dijadwalkan dari perkiraan: otomatis diceklis, pin tetap ada sebagai riwayat.
  const markScheduled = (id) =>
    updateStatus(id, ST.SCHEDULED, '✅ Sesi dijadwalkan. Perkiraan diberi ceklis (pin ungu tetap ada sebagai riwayat).')

  // Geser maju/mundur (cth: tanggalnya lebih awal/akhir dari perkiraan).
  const shiftDate = async (r, days) => {
    const next = addDaysISO(r.expected_date, days)
    try {
      const { error } = await supabase.from('yhs_reservations').update({ expected_date: next }).eq('id', r.id)
      if (error) throw error
      showToast(`📌 Perkiraan ${r.customer_name} digeser ke ${formatDateID(next)}`)
      await fetchData()
    } catch (err) {
      showToast('Gagal menggeser tanggal: ' + err.message, 'error')
    }
  }

  const deleteReservation = async (r) => {
    if (!confirm(`Adakah anda pasti ingin memadam perkiraan tanggal untuk "${r.customer_name}"?`)) return
    try {
      const { error } = await supabase.from('yhs_reservations').delete().eq('id', r.id)
      if (error) throw error
      showToast(`Perkiraan ${r.customer_name} dipadam.`)
      await fetchData()
    } catch (err) {
      showToast('Gagal memadam: ' + err.message, 'error')
    }
  }

  return {
    reservationsAvailable, statusOf, isStarted,
    activeReservations, pinnedReservations, startedReservations, sortedAll,
    reservationsByDate, reservationCountByDate, reservationsForDay, windowRange,
    makeEditForm, makeBookingForm,
    saveReservation, updateStatus, markScheduled, markStarted, unmarkStarted, toggleStarted,
    shiftDate, deleteReservation,
  }
}
