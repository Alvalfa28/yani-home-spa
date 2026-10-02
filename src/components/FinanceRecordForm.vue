<script setup>
import { computed } from 'vue'

const props = defineProps({
  kind: { type: String, required: true }, // 'income' | 'expense'
  form: { type: Object, required: true },
  categories: { type: Array, required: true },
  editing: { type: Boolean, default: false },
})
defineEmits(['save', 'cancel'])

const isIncome = computed(() => props.kind === 'income')
const dateKey = computed(() => (isIncome.value ? 'income_date' : 'expense_date'))
const noun = computed(() => (isIncome.value ? 'Pemasukan' : 'Pengeluaran'))
</script>

<template>
  <div class="bg-[#fdfbf7] p-5 rounded-2xl border space-y-4 shadow-md w-full"
       :class="isIncome ? 'border-[#2d7a4f]' : 'border-[#8c4343]'">
    <h4 class="font-serif text-sm font-bold text-[#5a4633]">
      {{ editing ? `✏️ Edit Rekod ${noun}${isIncome ? ' Manual' : ''}` : `✍️ Tambah Rekod ${noun}${isIncome ? ' Manual' : ''} Baru` }}
    </h4>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div>
        <label class="block font-bold text-[#8c7355] mb-1">{{ isIncome ? 'Keterangan / Sumber Pemasukan' : 'Keterangan / Nama Pengeluaran' }}</label>
        <input v-model="form.title" type="text"
               :placeholder="isIncome ? 'Cth: Tambahan modal / Sumber lain...' : 'Cth: Beli minyak urut & herba...'"
               class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
      </div>
      <div>
        <label class="block font-bold text-[#8c7355] mb-1">Jumlah (B$)</label>
        <input v-model.number="form.amount" type="number" min="0" placeholder="0.00" class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none font-bold" />
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
        <label class="block font-bold text-[#8c7355] mb-1">Catatan Tambahan (Opsional)</label>
        <input v-model="form.notes" type="text" placeholder="Keterangan tambahan..." class="w-full px-3 py-2 rounded-lg border border-[#ebdcc3] bg-white outline-none" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <button type="button" @click="$emit('cancel')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">Batal</button>
      <button type="button" @click="$emit('save')" class="px-4 py-2 text-white rounded-xl text-xs font-bold"
              :class="isIncome ? 'bg-[#2d7a4f]' : 'bg-[#8c4343]'">
        {{ editing ? 'Simpan Perubahan' : `Simpan ${noun}` }}
      </button>
    </div>
  </div>
</template>
