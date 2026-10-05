<script setup>
import { computed } from 'vue'

const props = defineProps({
  kind: { type: String, required: true }, // 'income' | 'expense' | 'personal'
  form: { type: Object, required: true },
  categories: { type: Array, required: true },
  sources: { type: Array, default: () => [] }, // saran sumber uang (boleh mengetik sendiri)
  editing: { type: Boolean, default: false },
})
defineEmits(['save', 'cancel'])

const isIncome = computed(() => props.kind === 'income')
const dateKey = computed(() => (isIncome.value ? 'income_date' : 'expense_date'))
const noun = computed(() => ({ income: 'Pemasukan', expense: 'Pengeluaran', personal: 'Pengeluaran Pribadi' })[props.kind])
const listId = computed(() => `sources-${props.kind}`)
const theme = computed(() => ({
  income: { border: 'border-[#2d7a4f]', button: 'bg-[#2d7a4f]' },
  expense: { border: 'border-[#8c4343]', button: 'bg-[#8c4343]' },
  personal: { border: 'border-[#6a4c93]', button: 'bg-[#6a4c93]' },
})[props.kind])
</script>

<template>
  <div class="bg-[#fdfbf7] p-5 rounded-2xl border space-y-4 shadow-md w-full" :class="theme.border">
    <h4 class="font-serif text-sm font-bold text-[#5a4633]">
      {{ editing ? '✏️ Edit' : '✍️ Tambah' }} Rekod {{ noun }}{{ isIncome ? ' Manual' : '' }}{{ editing ? '' : ' Baru' }}
    </h4>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div class="sm:col-span-2">
        <slot name="extra" />
      </div>

      <div>
        <label class="block font-bold text-[#8c7355] mb-1">{{ isIncome ? 'Keterangan / Sumber Pemasukan' : 'Keterangan / Nama Pengeluaran' }}</label>
        <input v-model="form.title" type="text"
               :placeholder="isIncome ? 'Cth: Pelunasan paket 7 hari / Tambahan modal...' : kind === 'personal' ? 'Cth: Makan siang, bensin...' : 'Cth: Beli minyak urut & herba...'"
               class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
      </div>
      <div>
        <label class="block font-bold text-[#8c7355] mb-1">Jumlah (B$)</label>
        <input v-model.number="form.amount" type="number" min="0" step="0.01" placeholder="0.00" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold" />
      </div>

      <div class="w-full overflow-hidden">
        <label class="block font-bold text-[#8c7355] mb-1">Tarikh {{ noun }}</label>
        <div class="w-full max-w-full overflow-hidden rounded-lg border border-[#ebdcc3] bg-white">
          <input v-model="form[dateKey]" type="date" class="w-full px-3 py-2 text-xs bg-transparent outline-none block box-border" style="max-width: 100%;" />
        </div>
      </div>

      <div>
        <label class="block font-bold text-[#8c7355] mb-1">Kategori {{ noun }}</label>
        <select v-model="form.category" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none">
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div class="sm:col-span-2">
        <label class="block font-bold text-[#8c7355] mb-1">
          Sumber Uang {{ isIncome ? '(uang masuk ke mana / dari mana)' : '(dibayar dari mana)' }}
        </label>
        <input v-model="form.source" type="text" :list="listId" placeholder="Pilih saran atau ketik sendiri, cth: Kas Tunai, BIBD, Modal Pribadi"
               class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
        <datalist :id="listId">
          <option v-for="s in sources" :key="s" :value="s" />
        </datalist>
        <p v-if="kind !== 'personal'" class="text-[10px] text-gray-500 mt-1">Dihitung ke total pemasukan/pengeluaran dan ke saldo sumber uang ini.</p>
      </div>

      <div class="sm:col-span-2">
        <label class="block font-bold text-[#8c7355] mb-1">Catatan Tambahan (Opsional)</label>
        <input v-model="form.notes" type="text" placeholder="Keterangan tambahan..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button type="button" @click="$emit('cancel')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
      <button type="button" @click="$emit('save')" class="px-4 py-2 text-white rounded-xl text-xs font-bold" :class="theme.button">
        {{ editing ? 'Simpan Perubahan' : `Simpan ${noun}` }}
      </button>
    </div>
  </div>
</template>
