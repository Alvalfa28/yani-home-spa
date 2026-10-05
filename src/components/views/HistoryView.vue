<script setup>
import { computed } from 'vue'
import { useMasterData } from '../../composables/useMasterData'
import { usePeriodFilter } from '../../composables/usePeriodFilter'
import { useInvoiceForm } from '../../composables/useInvoiceForm'
import { useNavigation } from '../../composables/useNavigation'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { paymentStatusOf } from '../../utils/receivable'
import { useSettlement } from '../../composables/useSettlement'
import { useToast } from '../../composables/useToast'
import PeriodFilter from '../PeriodFilter.vue'

const { goTo } = useNavigation()
const { invoiceHistory, incomeList, incomesAvailable } = useMasterData()
const { requestSettlement } = useSettlement()
const { showToast } = useToast()
const { getInvoiceNumber, startEditInvoice, deleteInvoice } = useInvoiceForm()
const { filter, matches } = usePeriodFilter()

const list = computed(() => invoiceHistory.value.filter((inv) => matches(inv.invoice_date)))
const statusOf = (inv) => paymentStatusOf(inv, incomeList.value)
const badgeLabel = (inv) => {
  const st = statusOf(inv)
  if (st.outstanding) return st.isDownPayment ? `DP ${formatCurrency(st.paid)}` : 'Belum Lunas'
  return /belum lunas/i.test(inv.payment_method || '') ? 'Lunas (pelunasan)' : inv.payment_method || 'Cash'
}
const settle = (inv) => {
  if (!incomesAvailable.value) {
    showToast('Pencatatan pelunasan belum aktif: tabel yhs_incomes belum ada (jalankan migrasi).', 'error')
    return
  }
  requestSettlement(inv.id)
  goTo('expenses')
}
const totalAmount = computed(() => list.value.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0))
</script>

<template>
  <div class="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#ebdcc3] space-y-6 print:hidden">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#f4ecd8] pb-4 gap-4">
      <div>
        <h3 class="font-serif text-xl font-bold text-[#5a4633]">📜 Rekod Riwayat / Invois (Dilengkapi Tombol Edit)</h3>
        <p class="text-xs text-[#8c7355]">Anda dapat mengedit invois yang salah atau mengubah status "Belum Lunas" menjadi lunas</p>
      </div>
      <button type="button" @click="goTo('form')" class="text-xs font-bold bg-[#3b5998] text-white px-4 py-2.5 rounded-xl shadow">Kembali ke Form</button>
    </div>

    <PeriodFilter :filter="filter" accent="bg-[#3b5998]">
      Menampilkan {{ list.length }} rekod (Total: {{ formatCurrency(totalAmount) }})
    </PeriodFilter>

    <div v-if="list.length === 0" class="text-center py-10 text-gray-500 text-xs italic">
      Tiada rekod invois pada periode ini.
    </div>

    <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      <div v-for="inv in list" :key="inv.id" class="p-4 rounded-xl border border-[#ebdcc3] bg-[#fffdfa] text-xs space-y-2 shadow-sm">
        <div class="flex justify-between items-center gap-2">
          <span class="font-bold font-serif text-[#5a4633] text-sm">{{ getInvoiceNumber(inv) }}</span>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded font-bold text-[10px]"
                  :class="statusOf(inv).outstanding ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-emerald-100 text-emerald-800'">
              {{ badgeLabel(inv) }}
            </span>
            <button v-if="statusOf(inv).outstanding" type="button" @click="settle(inv)" class="px-2.5 py-1 bg-[#2d7a4f] text-white rounded font-bold text-[10px] shadow hover:bg-[#235e3c] transition-all">💰 Terima Pelunasan</button>
            <button type="button" @click="startEditInvoice(inv)" class="px-2.5 py-1 bg-[#b48a57] text-white rounded font-bold text-[10px] shadow hover:bg-[#a07747] transition-all">✏️ Edit Invois</button>
            <button type="button" @click="deleteInvoice(inv.id, inv.customer_name)" class="px-2.5 py-1 bg-red-600 text-white rounded font-bold text-[10px] shadow hover:bg-red-700 transition-all">🗑️ Hapus</button>
          </div>
        </div>

        <div class="space-y-0.5 text-gray-600">
          <p>👤 <strong>{{ inv.customer_name }}</strong> ({{ inv.customer_wa || '-' }})</p>
          <p>📍 Alamat: {{ inv.customer_address || '-' }}</p>
          <p>📅 {{ inv.invoice_date }} · 🕐 {{ formatDateTime(inv.created_at) }} · Terapis: {{ inv.therapist || '-' }}</p>
          <p v-if="inv.start_time">⏰ Sesi: {{ String(inv.start_time).slice(0, 5) }} - {{ String(inv.end_time || '').slice(0, 5) }}</p>
          <p>{{ Array.isArray(inv.treatments) ? inv.treatments.length : 1 }} perkhidmatan</p>
          <p v-if="statusOf(inv).outstanding" class="text-red-600 font-semibold">Diterima {{ formatCurrency(statusOf(inv).paid) }} · Sisa {{ formatCurrency(statusOf(inv).remaining) }}</p>
        </div>

        <div class="pt-2 border-t border-[#f4ecd8] flex justify-between items-center">
          <span class="text-[10px] text-gray-500 italic">{{ inv.remarks || 'Tiada catatan' }}</span>
          <span class="font-bold text-[#b48a57] text-sm">{{ formatCurrency(inv.total_amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
