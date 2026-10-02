<script setup>
import logoImage from '../assets/logo.jpg'
import { useInvoiceForm } from '../composables/useInvoiceForm'
import { formatCurrency } from '../utils/format'
import { isUnpaid } from '../utils/payment'

const {
  invoiceNumber, visitDate, paymentMethod, customerName, customerPhone, customerAddress,
  selectedTherapist, remarks, selectedServices, subtotal, transactionDiscountAmount, totalDue, lineTotal,
} = useInvoiceForm()
</script>

<template>
  <div id="invoice-preview" class="lg:col-span-5 bg-white rounded-2xl shadow-[0_4px_25px_-5px_rgba(180,138,87,0.1)] border border-[#ebdcc3] p-6 sm:p-8 sticky top-6">
    <div class="text-center border-b border-[#ebdcc3] pb-6 mb-6 flex flex-col items-center">
      <img :src="logoImage" alt="Logo" class="w-16 h-16 rounded-full object-cover shadow-sm border border-[#ebdcc3] mb-2" />
      <h2 class="font-serif text-xl font-bold text-[#3e3529]">Yani Home & Spa</h2>
      <p class="text-[11px] text-[#8c7355]">Tanjong Bunut, Brunei Darussalam<br>+6737100696</p>
    </div>

    <div class="flex justify-between items-start mb-6 text-xs">
      <div>
        <span class="font-bold text-[#8c7355] uppercase tracking-wider block mb-1">INVOIS / INVOICE</span>
        <p class="font-semibold text-[#3e3529]">{{ invoiceNumber }}</p>
        <p class="text-[11px] text-gray-500">{{ visitDate }}</p>
      </div>
      <div class="text-right">
        <span class="font-bold text-[#8c7355] uppercase tracking-wider block mb-1">Status / Bayar</span>
        <span class="px-2 py-0.5 rounded font-bold text-[10px]"
              :class="isUnpaid(paymentMethod) ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-50 text-amber-800'">
          {{ paymentMethod }}
        </span>
      </div>
    </div>

    <div class="bg-[#fdfbf7] p-3 rounded-xl border border-[#ebdcc3] mb-6 text-xs space-y-1">
      <span class="font-bold text-[#8c7355] block uppercase text-[10px]">Pelanggan / Customer</span>
      <p class="font-semibold text-[#3e3529]">{{ customerName || '-' }}</p>
      <p class="text-gray-500">📞 {{ customerPhone || '-' }}</p>
      <p class="text-gray-600">📍 {{ customerAddress || '-' }}</p>
      <p v-if="selectedTherapist" class="text-[11px] text-[#8c7355] font-semibold pt-1 border-t border-[#ebdcc3]">Terapis: {{ selectedTherapist }}</p>
      <p v-if="remarks" class="text-[11px] text-gray-600 italic pt-1 border-t border-[#ebdcc3]">Catatan: {{ remarks }}</p>
    </div>

    <div class="mb-6 overflow-x-auto">
      <table class="w-full text-xs text-left">
        <thead>
          <tr class="bg-[#b48a57] text-white">
            <th class="p-2 rounded-l-lg">No</th>
            <th class="p-2">Perkhidmatan</th>
            <th class="p-2 text-center">Qty</th>
            <th class="p-2 text-right rounded-r-lg">Harga</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#f4ecd8]">
          <tr v-for="(item, idx) in selectedServices" :key="idx">
            <td class="p-2 text-gray-500">{{ idx + 1 }}</td>
            <td class="p-2 font-medium text-[#3e3529]">{{ item.name || '(Belum diisi)' }}</td>
            <td class="p-2 text-center">{{ item.qty }}</td>
            <td class="p-2 text-right font-medium">{{ formatCurrency(lineTotal(item)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="border-t border-[#ebdcc3] pt-4 space-y-2 text-xs">
      <div class="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span>{{ formatCurrency(subtotal) }}</span>
      </div>
      <div v-if="transactionDiscountAmount > 0" class="flex justify-between text-red-600">
        <span>Diskon Transaksi</span>
        <span>- {{ formatCurrency(transactionDiscountAmount) }}</span>
      </div>
      <div class="flex justify-between text-base font-serif font-bold text-[#3e3529] pt-2 border-t border-[#ebdcc3]">
        <span>JUMLAH / TOTAL DUE</span>
        <span class="text-[#b48a57]">{{ formatCurrency(totalDue) }}</span>
      </div>
    </div>

    <div class="mt-8 text-center border-t border-[#f4ecd8] pt-4 text-[10px] text-[#8c7355] font-serif italic">
      🌸 Terima kasih kerana memilih Yani Home & Spa 🌸<br>Tanjong Bunut, Brunei Darussalam
    </div>
  </div>
</template>
