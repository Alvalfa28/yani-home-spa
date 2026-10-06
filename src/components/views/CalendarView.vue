<script setup>
import { ref, computed } from 'vue'
import { useMasterData } from '../../composables/useMasterData'
import { useBookings, blankBooking } from '../../composables/useBookings'
import { useReservations } from '../../composables/useReservations'
import { useInvoiceForm } from '../../composables/useInvoiceForm'
import { useNavigation } from '../../composables/useNavigation'
import { MONTH_NAMES } from '../../utils/constants'
import { yearOptions, formatDateID } from '../../utils/period'
import { formatCurrency } from '../../utils/format'
import { isUnpaid } from '../../utils/payment'
import PaymentMethodSelect from '../PaymentMethodSelect.vue'
import CustomerAutocomplete from '../CustomerAutocomplete.vue'
import ServicePicker from '../ServicePicker.vue'
import TentativeDatesPanel from '../TentativeDatesPanel.vue'

const { goTo } = useNavigation()
const { availableTherapists } = useMasterData()
const { loadBookingIntoForm } = useInvoiceForm()
const {
  calendarViewMonth, calendarViewYear, selectedCalendarDate,
  calendarDaysInMonth, bookingCountByDate, bookingsGroupedByTherapist,
  packageSessionInfo, knownPackageLabels,
  makeEditForm, makeCopyForm, saveBooking, updateBookingStatus, deleteBooking, focusDate,
} = useBookings()
const { reservationCountByDate, reservationsForDay, makeBookingForm, markScheduled, windowRange } = useReservations()

const years = yearOptions()
const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']

const showForm = ref(false)
const editingId = ref(null)
const editingBook = ref(null)     // booking asli yang sedang diedit (untuk banner)
const copyFrom = ref(null)        // booking sumber saat membuat salinan
const fromReservation = ref(null) // perkiraan tanggal yang sedang dijadwalkan
const form = ref(blankBooking())

const resetContext = () => {
  editingId.value = null
  editingBook.value = null
  copyFrom.value = null
  fromReservation.value = null
}

const openNew = () => {
  resetContext()
  form.value = blankBooking(selectedCalendarDate.value)
  showForm.value = true
}

const openEdit = (book) => {
  resetContext()
  editingId.value = book.id
  editingBook.value = book
  form.value = makeEditForm(book)
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Booking baru dari salinan (cth: rawatan & jam sama, terapis lain). Booking asli tidak berubah.
const openCopy = (book) => {
  resetContext()
  copyFrom.value = book
  form.value = makeCopyForm(book)
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Perkiraan tanggal -> booking sesi sungguhan (tanggal, jam, terapis dipastikan di sini).
const scheduleFromReservation = (r) => {
  resetContext()
  fromReservation.value = r
  form.value = makeBookingForm(r)
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Pilih pelanggan lama -> nama, no. telefon, dan alamat terisi otomatis.
const pickCustomer = (cust) => {
  form.value.customer_name = cust.name
  form.value.customer_phone = cust.phone || ''
  form.value.customer_address = cust.address || ''
}

const closeForm = () => {
  showForm.value = false
  resetContext()
}

// asNew = true: simpan sebagai booking baru (tidak menimpa booking yang sedang diedit).
const submit = async (asNew = false) => {
  const date = form.value.booking_date
  const reservation = fromReservation.value
  if (await saveBooking(form.value, asNew ? null : editingId.value)) {
    if (reservation) await markScheduled(reservation.id)
    focusDate(date) // langsung tampilkan tanggal yang baru disimpan
    closeForm()
  }
}

// Tampilkan jam yang terbaca (format 24 jam) + durasi, supaya salah AM/PM langsung terlihat.
const timeCheck = computed(() => {
  const s = form.value.booking_start_time
  const e = form.value.booking_end_time
  if (!s || !e) return null
  const mins = (Number(e.slice(0, 2)) * 60 + Number(e.slice(3, 5))) - (Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)))
  if (mins <= 0) return { text: `Terbaca ${s} - ${e}: jam selesai harus setelah jam mulai`, bad: true }
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const dur = `${h ? h + ' jam ' : ''}${m ? m + ' menit' : ''}`.trim()
  return { text: `Terbaca ${s} - ${e} (durasi ${dur})${mins > 360 ? ', cek AM/PM!' : ''}`, bad: mins > 360 }
})

const dayReservations = computed(() => reservationsForDay(selectedCalendarDate.value))

const statusClass = (status) => {
  if (status === 'Selesai') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Batal') return 'bg-gray-200 text-gray-600'
  return 'bg-amber-100 text-amber-800'
}

const timeLabel = (book) => {
  const start = String(book.booking_start_time || book.booking_time || '').slice(0, 5)
  if (!start) return null
  return `${start} - ${String(book.booking_end_time || 'Selesai').slice(0, 5)}`
}

const showPrice = (book, tr) => !book.is_package && Number(tr.price) > 0
</script>

<template>
  <div class="max-w-7xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">

    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#5a4633]">📅 Kalendar Jadwal Booking Berdasarkan Terapis</h3>
        <p class="text-xs text-[#8c7355]">Jam boleh dikosongkan dulu · bisa edit/salin booking · sesi paket tanpa nominal · perkiraan tanggal 📌 untuk booking yang belum pasti</p>
      </div>

      <div class="flex items-center gap-3">
        <button type="button" @click="openNew" class="text-xs font-bold bg-[#b48a57] text-white px-4 py-2.5 rounded-xl shadow hover:bg-[#a07747] transition-all">+ Tambah Booking Baru</button>
        <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#3e3529] text-white px-4 py-2.5 rounded-xl shadow">Kembali</button>
      </div>
    </div>

    <!-- Form booking (tambah / edit / salin / dari perkiraan) -->
    <div v-if="showForm" class="bg-[#fdfbf7] p-5 rounded-2xl border border-[#b48a57] space-y-4 shadow-md w-full overflow-hidden">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">
        {{ editingId ? '✏️ Edit Booking' : copyFrom ? '📄 Booking Baru (salinan)' : fromReservation ? '📅 Jadwalkan Sesi dari Perkiraan Tanggal' : '📥 Catat Booking WhatsApp' }}
      </h4>

      <div v-if="editingId && editingBook" class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 space-y-1">
        <p>
          ✏️ Anda sedang <strong>mengedit</strong> booking <strong>{{ editingBook.customer_name }}</strong>
          ({{ editingBook.therapist || 'Tanpa Terapis' }}, {{ timeLabel(editingBook) || 'tanpa jam' }}).
          <strong>Simpan Perubahan</strong> akan <strong>menimpa</strong> booking itu.
        </p>
        <p>Untuk menambah booking lain (cth: terapis berbeda di jam yang sama), klik <strong>➕ Simpan sebagai Booking Baru</strong>.</p>
      </div>
      <div v-else-if="copyFrom" class="p-3 rounded-xl bg-sky-50 border border-sky-300 text-[11px] text-sky-900">
        📄 Salinan dari booking <strong>{{ copyFrom.customer_name }}</strong> ({{ copyFrom.therapist || 'Tanpa Terapis' }}).
        Pilih <strong>terapis lain</strong> (atau ubah jam/tanggal), lalu simpan. Booking asli tidak berubah.
      </div>
      <div v-else-if="fromReservation" class="p-3 rounded-xl bg-[#f6f2fb] border border-[#c9b8e3] text-[11px] text-[#4b3569] space-y-1">
        <p>📌 Dari perkiraan tanggal <strong>{{ formatDateID(fromReservation.expected_date) }}</strong> untuk <strong>{{ fromReservation.customer_name }}</strong>.
          Pilih <strong>tanggal sebenarnya</strong> (bisa berbeda dari perkiraan), jam, dan terapis.</p>
        <p>Perkiraan akan ditandai <em>Sudah Dijadwalkan</em> setelah sesi pertama disimpan. Untuk paket beberapa hari, tambahkan sesi lainnya lewat <strong>📄 Salin</strong> atau <strong>Sesi paket</strong>.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label class="block font-bold text-[#8c7355] mb-1">Nama Pelanggan <span class="font-normal">(ketik, lalu klik untuk isi otomatis)</span></label>
          <CustomerAutocomplete v-model="form.customer_name" compact placeholder="Nama dari WA..." @select="pickCustomer" />
        </div>
        <div>
          <label class="block font-bold text-[#8c7355] mb-1">No. Telefon WhatsApp</label>
          <input v-model="form.customer_phone" type="text" placeholder="+673..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
        </div>

        <div class="sm:col-span-2">
          <label class="block font-bold text-[#8c7355] mb-1">Alamat Pelanggan</label>
          <input v-model="form.customer_address" type="text" placeholder="Cth: Kampong Tanjong Bunut..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
        </div>

        <div class="w-full overflow-hidden">
          <label class="block font-bold text-[#8c7355] mb-1">Tanggal Booking</label>
          <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
            <input v-model="form.booking_date" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
          </div>
        </div>

        <div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-[#8c7355] mb-1">Jam Mulai <span class="font-normal">(opsional)</span></label>
              <input v-model="form.booking_start_time" type="time" class="w-full px-3 py-2 text-xs bg-white rounded-lg border border-[#ebdcc3] outline-none" />
            </div>
            <div>
              <label class="block font-bold text-[#8c7355] mb-1">Jam Selesai <span class="font-normal">(opsional)</span></label>
              <input v-model="form.booking_end_time" type="time" class="w-full px-3 py-2 text-xs bg-white rounded-lg border border-[#ebdcc3] outline-none" />
            </div>
          </div>
          <p v-if="timeCheck" class="mt-1 text-[10px] font-semibold" :class="timeCheck.bad ? 'text-red-600' : 'text-gray-500'">⏱ {{ timeCheck.text }}</p>
          <button v-if="form.booking_start_time || form.booking_end_time" type="button"
                  @click="form.booking_start_time = ''; form.booking_end_time = ''"
                  class="mt-1 text-[10px] font-bold text-[#b48a57] hover:underline">Kosongkan jam (tentukan nanti)</button>
        </div>

        <div>
          <label class="block font-bold text-[#8c7355] mb-1">Terapis Ditugaskan</label>
          <select v-model="form.therapist" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
            <option value="">-- Pilih Terapis --</option>
            <option v-for="thp in availableTherapists" :key="thp.id" :value="thp.name">{{ thp.name }}</option>
          </select>
        </div>

        <div v-if="!form.is_package">
          <label class="block font-bold text-[#8c7355] mb-1">Cara Bayar / Status</label>
          <PaymentMethodSelect v-model="form.payment_method" compact />
        </div>

        <!-- Sesi paket -->
        <div class="sm:col-span-2 p-3 rounded-xl border border-dashed border-[#b48a57] bg-white space-y-2">
          <label class="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_package" class="mt-0.5 w-4 h-4 rounded border-[#ebdcc3]" />
            <span>
              <span class="font-bold text-[#5a4633]">Sesi paket (tanpa nominal)</span>
              <span class="block text-[11px] text-gray-500">Untuk pelanggan yang sudah membayar paket (cth: pantang 7 hari) dan memilih hari sesi belakangan. Tidak ada tagihan baru.</span>
            </span>
          </label>
          <div v-if="form.is_package">
            <label class="block font-bold text-[#8c7355] mb-1">Nama Paket</label>
            <input v-model="form.package_label" type="text" list="package-labels" placeholder="Cth: Pantang 7 hari (dibayar 1 Okt 2026)"
                   class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
            <datalist id="package-labels"><option v-for="l in knownPackageLabels" :key="l" :value="l" /></datalist>
            <p class="text-[10px] text-gray-500 mt-1">Pakai nama yang sama di setiap sesi agar nomor sesi (1/7, 2/7, ...) terhitung otomatis.</p>
          </div>
        </div>

        <div class="sm:col-span-2">
          <label class="block font-bold text-[#8c7355] mb-1">Rincian Pesan / Catatan WA</label>
          <input v-model="form.notes" type="text" placeholder="Cth: Pesan khusus..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
        </div>

        <div class="sm:col-span-2">
          <ServicePicker v-model="form.selected_services" :hide-price="form.is_package" :legacy="form.legacy_treatments" />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" @click="closeForm" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
        <button v-if="editingId" type="button" @click="submit(true)" class="px-4 py-2 bg-[#b48a57] text-white rounded-xl text-xs font-bold">➕ Simpan sebagai Booking Baru</button>
        <button type="button" @click="submit(false)" class="px-4 py-2 bg-[#2d7a4f] text-white rounded-xl text-xs font-bold">
          {{ editingId ? 'Simpan Perubahan (menimpa)' : 'Simpan ke Kalendar' }}
        </button>
      </div>
    </div>

    <!-- Pilih bulan -->
    <div class="flex flex-wrap items-center justify-between bg-[#fffdfa] p-3 rounded-xl border border-[#ebdcc3] text-xs gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-bold text-[#5a4633]">Pilih Bulan:</span>
        <select v-model.number="calendarViewMonth" class="px-3 py-1.5 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold">
          <option v-for="(name, i) in MONTH_NAMES" :key="i" :value="i + 1">{{ name }}</option>
        </select>
        <select v-model.number="calendarViewYear" class="px-3 py-1.5 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <p class="text-gray-500 italic">Klik pada tanggal untuk melihat jadwal · <span class="font-bold text-[#6a4c93]">📌</span> = perkiraan tanggal (belum pasti)</p>
    </div>

    <!-- Grid kalender -->
    <div class="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs w-full">
      <div v-for="(name, i) in dayNames" :key="name" class="font-bold py-2" :class="i === 0 || i === 6 ? 'text-[#b48a57]' : 'text-[#5a4633]'">{{ name }}</div>

      <div v-for="(d, idx) in calendarDaysInMonth" :key="idx"
           @click="d.dateStr && (selectedCalendarDate = d.dateStr)"
           class="min-h-[60px] sm:min-h-[85px] p-1 sm:p-2 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer relative"
           :class="!d.dayNum ? 'bg-gray-50 border-transparent cursor-default'
             : selectedCalendarDate === d.dateStr ? 'bg-[#f4ecd8] border-[#b48a57] shadow-sm'
             : 'bg-[#fffdfa] border-[#ebdcc3] hover:bg-amber-50/50'">
        <span v-if="d.dayNum" class="font-bold text-xs" :class="selectedCalendarDate === d.dateStr ? 'text-[#b48a57]' : 'text-[#3e3529]'">{{ d.dayNum }}</span>
        <div v-if="d.dayNum && (bookingCountByDate[d.dateStr] || reservationCountByDate[d.dateStr])" class="my-auto flex flex-col items-center gap-0.5">
          <span v-if="bookingCountByDate[d.dateStr]" class="px-1.5 py-0.5 bg-[#2d7a4f] text-white rounded-full text-[9px] sm:text-[10px] font-bold shadow-sm whitespace-nowrap">
            {{ bookingCountByDate[d.dateStr] }} sesi
          </span>
          <span v-if="reservationCountByDate[d.dateStr]" class="px-1.5 py-0.5 bg-[#6a4c93] text-white rounded-full text-[9px] sm:text-[10px] font-bold shadow-sm whitespace-nowrap">
            📌 {{ reservationCountByDate[d.dateStr] }}
          </span>
        </div>
        <span v-if="d.dayNum"></span>
      </div>
    </div>

    <!-- Jadwal harian per terapis -->
    <div class="bg-[#fffdfa] p-5 rounded-2xl border border-[#ebdcc3] space-y-4">
      <h4 class="font-serif text-sm font-bold text-[#5a4633]">
        📋 Jadwal Sesi Tanggal: <span class="text-[#b48a57] font-bold">{{ selectedCalendarDate }}</span>
      </h4>

      <!-- Perkiraan tanggal untuk hari ini (tidak terikat terapis/jam) -->
      <div v-if="dayReservations.exact.length || dayReservations.window.length" class="p-3 rounded-xl border border-[#c9b8e3] bg-[#f6f2fb] text-xs space-y-2">
        <p class="font-bold text-[#4b3569]">📌 Perkiraan tanggal (belum pasti)</p>
        <div v-for="r in dayReservations.exact" :key="'e' + r.id" class="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-[#ded3ec]">
          <span><strong>{{ r.customer_name }}</strong> <span class="text-gray-500">· 📞 {{ r.customer_phone || '-' }}</span> <span class="px-1.5 py-0.5 rounded bg-[#6a4c93] text-white text-[10px] font-bold">Perkiraan tepat tanggal ini</span></span>
          <button type="button" @click="scheduleFromReservation(r)" class="px-2 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px]">📅 Jadwalkan Sesi</button>
        </div>
        <div v-for="r in dayReservations.window" :key="'w' + r.id" class="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-dashed border-[#ded3ec]">
          <span><strong>{{ r.customer_name }}</strong> <span class="text-gray-500">· perkiraan {{ formatDateID(r.expected_date, true) }} (rentang {{ windowRange(r) }})</span></span>
          <button type="button" @click="scheduleFromReservation(r)" class="px-2 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px]">📅 Jadwalkan Sesi</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        <div v-for="(bookings, therapistName) in bookingsGroupedByTherapist" :key="therapistName"
             class="bg-white rounded-xl border border-[#ebdcc3] shadow-sm overflow-hidden flex flex-col">
          <div class="bg-[#5a4633] text-white px-4 py-3 flex justify-between items-center">
            <span class="font-serif font-bold text-sm tracking-wide">👩‍⚕️ Terapis: {{ therapistName }}</span>
            <span class="bg-[#b48a57] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{{ bookings.length }} sesi</span>
          </div>

          <div class="p-3 space-y-3 flex-1 bg-[#fffdfa] max-h-[500px] overflow-y-auto">
            <div v-if="bookings.length === 0" class="text-xs text-gray-400 text-center py-8 italic">
              Tidak ada sesi jadwal untuk {{ therapistName }} pada tanggal ini.
            </div>

            <div v-for="book in bookings" :key="book.id" class="p-3 rounded-lg border border-[#ebdcc3] bg-white text-xs space-y-2 shadow-sm"
                 :class="book.status === 'Batal' ? 'opacity-60' : ''">
              <div class="flex justify-between items-center border-b border-gray-100 pb-1.5 gap-2">
                <span v-if="timeLabel(book)" class="font-bold text-xs bg-[#b48a57] text-white px-2.5 py-0.5 rounded">⏰ {{ timeLabel(book) }}</span>
                <span v-else class="font-bold text-[10px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded">⏰ Jam belum ditentukan</span>
                <div class="flex flex-wrap justify-end items-center gap-1">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="statusClass(book.status)">{{ book.status || 'Terjadwal' }}</span>
                  <span v-if="book.is_package" class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">📦 Paket</span>
                  <span v-else class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="isUnpaid(book.payment_method) ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-800'">
                    {{ book.payment_method || 'Cash' }}
                  </span>
                </div>
              </div>

              <div>
                <p class="font-serif font-bold text-sm text-[#5a4633]">{{ book.customer_name }}</p>
                <p v-if="book.is_package" class="text-[11px] font-semibold text-indigo-700">
                  {{ book.package_label || 'Paket' }}
                  <span v-if="packageSessionInfo[book.id]">· Sesi {{ packageSessionInfo[book.id].index }}/{{ packageSessionInfo[book.id].total }} dijadwalkan</span>
                </p>
                <p class="text-gray-600 text-[11px]">📞 {{ book.customer_phone || '-' }}</p>
                <p class="text-gray-500 text-[11px]">📍 {{ book.customer_address || '-' }}</p>
              </div>

              <div class="bg-[#fdfbf7] p-2 rounded border border-[#ebdcc3] space-y-0.5">
                <p class="text-[10px] uppercase font-bold text-[#8c7355]">Rawatan Dipesan:</p>
                <p v-if="!book.treatments || book.treatments.length === 0" class="text-[11px] text-gray-400 italic">Belum dipilih</p>
                <div v-for="(tr, ti) in book.treatments" :key="ti" class="text-[11px] text-[#3e3529] font-medium">
                  • {{ tr.name }}<span v-if="(tr.qty || 1) > 1" class="font-bold"> ×{{ tr.qty }}</span>
                  <span v-if="showPrice(book, tr)" class="text-[#b48a57]"> ({{ formatCurrency(tr.price * (tr.qty || 1)) }})</span>
                </div>
              </div>

              <p v-if="book.notes" class="text-gray-500 text-[11px] italic">Catatan: "{{ book.notes }}"</p>

              <div class="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                <button type="button" @click="openEdit(book)" class="px-2 py-1 bg-[#3b5998] text-white rounded font-bold text-[10px] shadow hover:bg-[#324b81]">✏️ Edit</button>
                <button type="button" @click="openCopy(book)" class="px-2 py-1 bg-sky-600 text-white rounded font-bold text-[10px] shadow hover:bg-sky-700">📄 Salin</button>

                <template v-if="book.status !== 'Selesai' && book.status !== 'Batal'">
                  <button v-if="book.is_package" type="button" @click="updateBookingStatus(book.id, 'Selesai')"
                          class="px-2 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px] shadow hover:bg-[#235e3c]">✅ Tandai Selesai</button>
                  <button v-else type="button" @click="loadBookingIntoForm(book)"
                          class="px-2 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px] shadow hover:bg-[#235e3c]">✨ Buat Invois</button>
                </template>

                <button v-if="book.status === 'Batal'" type="button" @click="updateBookingStatus(book.id, 'Terjadwal')"
                        class="px-2 py-1 bg-[#8c7355] text-white rounded font-bold text-[10px] shadow">↩️ Aktifkan</button>
                <button v-else-if="book.status !== 'Selesai'" type="button" @click="updateBookingStatus(book.id, 'Batal')"
                        class="px-2 py-1 bg-gray-500 text-white rounded font-bold text-[10px] shadow">🚫 Batal</button>

                <button type="button" @click="deleteBooking(book.id, book.customer_name)"
                        class="px-2 py-1 bg-red-600 text-white rounded font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Perkiraan tanggal: daftar + form (booking belum pasti) -->
    <TentativeDatesPanel @schedule="scheduleFromReservation" />
  </div>
</template>
