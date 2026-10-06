<script setup>
import { ref, computed } from 'vue'
import { useReservations, blankReservation } from '../composables/useReservations'
import { useMasterData } from '../composables/useMasterData'
import { RESERVATION_STATUS as ST } from '../utils/constants'
import { todayISO, diffDays, formatDateID } from '../utils/period'
import CustomerAutocomplete from './CustomerAutocomplete.vue'
import ServicePicker from './ServicePicker.vue'

const emit = defineEmits(['schedule'])

const { availableTherapists } = useMasterData()
const {
  reservationsAvailable, statusOf, activeReservations, sortedAll, windowRange,
  makeEditForm, saveReservation, updateStatus, shiftDate, deleteReservation,
} = useReservations()

const showAll = ref(false)
const list = computed(() => (showAll.value ? sortedAll.value : activeReservations.value))

const showForm = ref(false)
const editingId = ref(null)
const form = ref(blankReservation())

const openNew = () => { editingId.value = null; form.value = blankReservation(); showForm.value = true }
const openEdit = (r) => { editingId.value = r.id; form.value = makeEditForm(r); showForm.value = true }
const closeForm = () => { showForm.value = false; editingId.value = null }
const pickCustomer = (c) => {
  form.value.customer_name = c.name
  form.value.customer_phone = c.phone || ''
  form.value.customer_address = c.address || ''
}
const submit = async () => { if (await saveReservation(form.value, editingId.value)) closeForm() }

const countdown = (r) => {
  if (statusOf(r) !== ST.WAITING) return null
  const d = diffDays(todayISO(), r.expected_date)
  if (d === 0) return { text: 'Hari ini', cls: 'bg-red-100 text-red-700' }
  if (d > 0) return { text: `${d} hari lagi`, cls: d <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800' }
  return { text: `Lewat ${-d} hari`, cls: 'bg-red-100 text-red-700' }
}
const statusCls = (s) => (s === ST.SCHEDULED ? 'bg-emerald-100 text-emerald-800' : s === ST.CANCELLED ? 'bg-gray-200 text-gray-600' : 'bg-[#eee8f5] text-[#4b3569]')
</script>

<template>
  <div class="bg-[#f6f2fb] p-5 rounded-2xl border border-[#ded3ec] space-y-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <h4 class="font-serif text-sm font-bold text-[#4b3569]">📌 Perkiraan Tanggal (booking belum pasti)</h4>
        <p class="text-[11px] text-[#7d6a96]">Untuk pelanggan yang baru menetapkan tanggal perkiraan dan bisa maju/mundur. Tanpa jam & terapis, tidak mengunci jadwal terapis. Setelah tanggal pasti, klik <strong>Jadwalkan Sesi</strong>.</p>
      </div>
      <button v-if="reservationsAvailable" type="button" @click="openNew" class="text-xs font-bold bg-[#6a4c93] text-white px-4 py-2.5 rounded-xl shadow hover:bg-[#573d7a] whitespace-nowrap">+ Tambah Perkiraan Tanggal</button>
    </div>

    <p v-if="!reservationsAvailable" class="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-4">
      Tabel <code>yhs_reservations</code> belum ada. Jalankan <code>sql/migrations-v3.sql</code> di Supabase SQL Editor, lalu muat ulang halaman.
    </p>

    <template v-else>
      <!-- Form -->
      <div v-if="showForm" class="bg-white p-5 rounded-2xl border border-[#6a4c93] space-y-4 shadow-md">
        <h5 class="font-serif text-sm font-bold text-[#4b3569]">{{ editingId ? '✏️ Edit / Geser Perkiraan Tanggal' : '✍️ Perkiraan Tanggal Baru' }}</h5>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Nama Pelanggan <span class="font-normal">(ketik, lalu klik untuk isi otomatis)</span></label>
            <CustomerAutocomplete v-model="form.customer_name" compact placeholder="Nama pelanggan..." @select="pickCustomer" />
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">No. Telefon WhatsApp</label>
            <input v-model="form.customer_phone" type="text" placeholder="+673..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          <div class="sm:col-span-2">
            <label class="block font-bold text-[#8c7355] mb-1">Alamat Pelanggan</label>
            <input v-model="form.customer_address" type="text" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          <div class="w-full overflow-hidden">
            <label class="block font-bold text-[#8c7355] mb-1">Perkiraan Tanggal</label>
            <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
              <input v-model="form.expected_date" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Rentang Fleksibel (± hari)</label>
            <input v-model.number="form.flex_days" type="number" min="0" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
            <p class="text-[10px] text-gray-500 mt-1">Hanya untuk penanda di kalender. 0 = tanpa rentang.</p>
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Preferensi Terapis <span class="font-normal">(opsional)</span></label>
            <select v-model="form.therapist" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
              <option value="">-- Belum ditentukan --</option>
              <option v-for="t in availableTherapists" :key="t.id" :value="t.name">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#8c7355] mb-1">Catatan</label>
            <input v-model="form.notes" type="text" placeholder="Cth: jadwal dokter, kontak keluarga..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
          </div>
          <div class="sm:col-span-2">
            <ServicePicker v-model="form.selected_services" hide-price :legacy="form.legacy_treatments" label="Rawatan yang diinginkan (opsional)" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" @click="closeForm" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
          <button type="button" @click="submit" class="px-4 py-2 bg-[#6a4c93] text-white rounded-xl text-xs font-bold">{{ editingId ? 'Simpan Perubahan' : 'Simpan Perkiraan' }}</button>
        </div>
      </div>

      <label class="flex items-center gap-2 text-[11px] text-[#4b3569] cursor-pointer">
        <input type="checkbox" v-model="showAll" class="w-3.5 h-3.5 rounded" />
        Tampilkan juga yang sudah dijadwalkan / dibatalkan
      </label>

      <div v-if="list.length === 0" class="text-center py-6 text-xs text-gray-500 italic">Belum ada perkiraan tanggal yang menunggu.</div>

      <div v-else class="space-y-3 max-h-[480px] overflow-y-auto pr-2">
        <div v-for="r in list" :key="r.id" class="p-4 rounded-xl border border-[#ded3ec] bg-white text-xs space-y-2 shadow-sm" :class="statusOf(r) === ST.CANCELLED ? 'opacity-60' : ''">
          <div class="flex flex-wrap justify-between items-start gap-2">
            <div>
              <p class="font-serif font-bold text-sm text-[#4b3569]">{{ r.customer_name }}</p>
              <p class="text-gray-600">📞 {{ r.customer_phone || '-' }}<span v-if="r.customer_address"> · 📍 {{ r.customer_address }}</span></p>
            </div>
            <div class="flex flex-wrap items-center gap-1">
              <span v-if="countdown(r)" class="px-2 py-0.5 rounded text-[10px] font-bold" :class="countdown(r).cls">{{ countdown(r).text }}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="statusCls(statusOf(r))">{{ statusOf(r) }}</span>
            </div>
          </div>

          <div class="bg-[#f6f2fb] p-2 rounded border border-[#ded3ec] space-y-0.5">
            <p class="font-bold text-[#4b3569]">📌 Perkiraan: {{ formatDateID(r.expected_date) }}</p>
            <p v-if="r.original_date && r.original_date !== r.expected_date" class="text-[11px] text-amber-700">Semula {{ formatDateID(r.original_date) }} (sudah bergeser {{ Math.abs(diffDays(r.original_date, r.expected_date)) }} hari)</p>
            <p v-if="windowRange(r)" class="text-[11px] text-gray-600">Rentang ±{{ r.flex_days }} hari: {{ windowRange(r) }}</p>
            <p v-if="r.therapist" class="text-[11px] text-gray-600">Preferensi terapis: {{ r.therapist }}</p>
            <p v-if="r.treatments && r.treatments.length" class="text-[11px] text-gray-600">Rawatan: {{ r.treatments.map((t) => t.name + ((t.qty || 1) > 1 ? ' ×' + t.qty : '')).join(', ') }}</p>
          </div>
          <p v-if="r.notes" class="text-gray-500 italic">Catatan: "{{ r.notes }}"</p>

          <div class="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
            <template v-if="statusOf(r) === ST.WAITING">
              <button type="button" @click="emit('schedule', r)" class="px-2 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px] shadow hover:bg-[#235e3c]">📅 Jadwalkan Sesi</button>
              <button type="button" @click="shiftDate(r, -7)" class="px-2 py-1 bg-[#eee8f5] text-[#4b3569] rounded font-bold text-[10px]">◀ 1 minggu</button>
              <button type="button" @click="shiftDate(r, 7)" class="px-2 py-1 bg-[#eee8f5] text-[#4b3569] rounded font-bold text-[10px]">1 minggu ▶</button>
              <button type="button" @click="openEdit(r)" class="px-2 py-1 bg-[#3b5998] text-white rounded font-bold text-[10px] shadow">✏️ Edit / Geser</button>
              <button type="button" @click="updateStatus(r.id, ST.CANCELLED, 'Perkiraan dibatalkan.')" class="px-2 py-1 bg-gray-500 text-white rounded font-bold text-[10px] shadow">🚫 Batal</button>
            </template>
            <button v-else type="button" @click="updateStatus(r.id, ST.WAITING, 'Perkiraan diaktifkan kembali.')" class="px-2 py-1 bg-[#8c7355] text-white rounded font-bold text-[10px] shadow">↩️ Aktifkan</button>
            <button type="button" @click="deleteReservation(r)" class="px-2 py-1 bg-red-600 text-white rounded font-bold text-[10px] shadow hover:bg-red-700">🗑️ Hapus</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
