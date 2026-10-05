<script setup>
import { ref } from 'vue'
import { useMasterData } from '../../composables/useMasterData'
import { useInvoiceForm } from '../../composables/useInvoiceForm'
import PaymentMethodSelect from '../PaymentMethodSelect.vue'
import ManageServicesPanel from '../ManageServicesPanel.vue'
import ManageTherapistsPanel from '../ManageTherapistsPanel.vue'
import InvoicePreview from '../InvoicePreview.vue'
import CustomerAutocomplete from '../CustomerAutocomplete.vue'
import { isUnpaid } from '../../utils/payment'
import { formatCurrency } from '../../utils/format'

const { availableServices, availableTherapists } = useMasterData()
const {
  editingInvoiceId, invoiceNumber, customerName, customerPhone, customerAddress, visitDate,
  invoiceStartTime, invoiceEndTime, paymentMethod, remarks, selectedTherapist,
  serviceSearchKeywords, selectedServices, discountType, discountValue, isSubmitting,
  isPartialPayment, paidInput, totalDue, paidNow, remainingDue,
  selectCustomer, getFilteredServices, selectService, addServiceRow, removeServiceRow,
  resetForm, saveInvoice, copyInvoiceText,
} = useInvoiceForm()

const showManageServices = ref(false)
const showManageTherapists = ref(false)

const onTherapistDeleted = (name) => {
  if (selectedTherapist.value === name) selectedTherapist.value = ''
}

const handlePrint = () => window.print()
</script>

<template>
  <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

    <div class="lg:col-span-7 bg-white rounded-2xl shadow-[0_4px_25px_-5px_rgba(180,138,87,0.1)] border border-[#ebdcc3] p-6 sm:p-8 space-y-6 print:hidden">
      <div class="flex justify-between items-center border-b border-[#f4ecd8] pb-3">
        <h2 class="font-serif text-lg font-bold text-[#5a4633]">
          {{ editingInvoiceId ? '✏️ Mode Edit Invois' : 'Maklumat Pelanggan / Customer Info' }}
        </h2>
        <span v-if="editingInvoiceId" class="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg">
          Sedang Edit: {{ invoiceNumber }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Nama Pelanggan (ketik, lalu klik untuk isi otomatis)</label>
          <CustomerAutocomplete v-model="customerName" placeholder="Ketik nama (cth: A...)" @select="selectCustomer" />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">No. Telefon</label>
          <input v-model="customerPhone" type="text" placeholder="+673 xxx xxxx" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Alamat Pelanggan / Address</label>
        <input v-model="customerAddress" type="text" placeholder="Cth: Simpang 22, Kampong Tanjong Bunut..." class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="w-full overflow-hidden">
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Tarikh Kunjungan</label>
          <div class="w-full max-w-full overflow-hidden rounded-xl border border-[#ebdcc3] bg-[#fffdfa] focus-within:ring-2 focus-within:ring-[#b48a57]">
            <input v-model="visitDate" type="date" class="w-full px-4 py-2.5 text-sm bg-transparent outline-none block box-border text-center sm:text-left" style="max-width: 100%;" />
          </div>
        </div>

        <div class="w-full overflow-hidden">
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Cara Bayar / Status</label>
          <PaymentMethodSelect v-model="paymentMethod" />
        </div>
      </div>

      <!-- DP / bayar sebagian -->
      <div v-if="!isUnpaid(paymentMethod)" class="p-4 rounded-xl border border-dashed border-[#b48a57] bg-[#fffdfa] space-y-3">
        <label class="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" v-model="isPartialPayment" class="mt-0.5 w-4 h-4 rounded border-[#ebdcc3]" />
          <span>
            <span class="text-xs font-bold text-[#5a4633]">Pelanggan baru bayar DP (sebagian)</span>
            <span class="block text-[11px] text-gray-500">Cth: paket 7 hari B$300, DP B$50. Yang masuk pemasukan hanya DP; sisanya dicatat di Keuangan → Pemasukan saat dilunasi.</span>
          </span>
        </label>
        <div v-if="isPartialPayment" class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Jumlah DP Diterima (B$)</label>
            <input v-model.number="paidInput" type="number" min="0" step="0.01" placeholder="0.00"
                   class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-white font-bold" />
          </div>
          <div class="text-xs space-y-0.5 text-[#5a4633]">
            <p>Total: <strong>{{ formatCurrency(totalDue) }}</strong></p>
            <p>Diterima sekarang: <strong class="text-emerald-700">{{ formatCurrency(paidNow) }}</strong></p>
            <p>Sisa tagihan: <strong class="text-red-600">{{ formatCurrency(remainingDue) }}</strong></p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Jam Mulai Sesi</label>
          <input v-model="invoiceStartTime" type="time" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] text-sm bg-[#fffdfa] outline-none focus:ring-2 focus:ring-[#b48a57]" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Jam Selesai Sesi</label>
          <input v-model="invoiceEndTime" type="time" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] text-sm bg-[#fffdfa] outline-none focus:ring-2 focus:ring-[#b48a57]" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-xs font-bold uppercase tracking-wider text-[#8c7355]">Terapis / Therapist</label>
            <button type="button" @click="showManageTherapists = true" class="text-[10px] font-bold text-[#b48a57] hover:underline">+ Terapis Baru / Urus</button>
          </div>
          <select v-model="selectedTherapist" class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]">
            <option value="">-- Tanpa Terapis --</option>
            <option v-for="thp in availableTherapists" :key="thp.id" :value="thp.name">{{ thp.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-[#8c7355] mb-1">Catatan / Remarks</label>
          <input v-model="remarks" type="text" placeholder="Catatan tambahan..." class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none text-sm bg-[#fffdfa]" />
        </div>
      </div>

      <ManageTherapistsPanel v-if="showManageTherapists"
                             @close="showManageTherapists = false"
                             @created="selectedTherapist = $event"
                             @deleted="onTherapistDeleted" />

      <div class="border-t border-[#f4ecd8] pt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-serif text-lg font-bold text-[#5a4633]">Pilih Perkhidmatan / Select Services</h3>
          <div class="flex gap-2">
            <button type="button" @click="showManageServices = true" class="text-xs font-bold bg-[#8c7355] text-white px-3 py-1.5 rounded-lg hover:bg-[#725c43] transition-colors">⚙️ Kelola Layanan</button>
            <button type="button" @click="addServiceRow" class="text-xs font-bold bg-[#f4ecd8] text-[#5a4633] px-3 py-1.5 rounded-lg hover:bg-[#ebdcc3] transition-colors">+ Baris</button>
          </div>
        </div>

        <ManageServicesPanel v-if="showManageServices" @close="showManageServices = false" />

        <div class="space-y-3">
          <div v-for="(item, index) in selectedServices" :key="index" class="bg-[#fffdfa] p-4 rounded-xl border border-[#ebdcc3] space-y-3 overflow-hidden">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-[#8c7355]">Item #{{ index + 1 }}</span>
              <button type="button" @click="removeServiceRow(index)" class="text-red-400 hover:text-red-600 text-xs font-bold" :disabled="selectedServices.length === 1">Hapus</button>
            </div>

            <div class="w-full">
              <input v-model="serviceSearchKeywords[index]" type="text" placeholder="🔍 Ketik untuk cari layanan..."
                     class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none mb-2 focus:ring-1 focus:ring-[#b48a57]" />
              <select @change="selectService(index, $event.target.value)" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none">
                <option value="">-- Pilih Rawatan --</option>
                <option v-for="serv in getFilteredServices(index)" :key="serv.id" :value="serv.id" :selected="String(serv.id) === String(item.service_id)">
                  {{ serv.name }} (B$ {{ serv.default_price }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] uppercase font-bold text-[#8c7355]">Qty</label>
                <input v-model.number="item.qty" type="number" min="1" class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
              </div>
              <div>
                <label class="text-[10px] uppercase font-bold text-[#8c7355]">Diskon</label>
                <input v-model.number="item.discount" type="number" min="0" class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-sm bg-white outline-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-[#f4ecd8] pt-6">
        <h3 class="font-serif text-sm font-bold text-[#5a4633] mb-2">Diskaun Transaksi / Transaction Discount</h3>
        <div class="flex gap-2 mb-3">
          <button type="button" @click="discountType = 'percent'" class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                  :class="discountType === 'percent' ? 'bg-[#b48a57] text-white border-[#b48a57]' : 'bg-[#fffdfa] text-[#5a4633] border-[#ebdcc3]'">Peratus %</button>
          <button type="button" @click="discountType = 'nominal'" class="flex-1 py-2 text-xs font-bold rounded-lg border transition-all"
                  :class="discountType === 'nominal' ? 'bg-[#b48a57] text-white border-[#b48a57]' : 'bg-[#fffdfa] text-[#5a4633] border-[#ebdcc3]'">Nominal B$</button>
        </div>
        <input v-model.number="discountValue" type="number" min="0" placeholder="Masukkan nilai diskon transaksi"
               class="w-full px-4 py-2.5 rounded-xl border border-[#ebdcc3] text-sm bg-[#fffdfa] outline-none focus:ring-1 focus:ring-[#b48a57]" />
      </div>

      <div class="grid grid-cols-2 gap-3 pt-4 border-t border-[#f4ecd8]">
        <button type="button" @click="handlePrint" class="py-3 px-4 bg-[#8c7355] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#725c43] transition-all">🖨️ Cetak / PDF</button>
        <button type="button" @click="copyInvoiceText" class="py-3 px-4 bg-[#2d7a4f] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#235e3c] transition-all">📋 Salin Teks</button>
        <button type="button" @click="resetForm()" class="py-3 px-4 bg-[#fffdfa] text-[#5a4633] border border-[#ebdcc3] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#f4ecd8] transition-all">🔄 Reset</button>
        <button type="button" @click="saveInvoice" :disabled="isSubmitting" class="py-3 px-4 bg-[#3b5998] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-[#324b81] transition-all disabled:opacity-60">
          {{ editingInvoiceId ? '💾 Simpan Perubahan' : '💾 Simpan Data' }}
        </button>
      </div>
    </div>

    <InvoicePreview />
  </div>
</template>
