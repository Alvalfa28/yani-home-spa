<script setup>
import { ref, computed } from 'vue'
import { useMasterData } from '../composables/useMasterData'

// v-model = [{ id, qty, price }]. Dipakai di form booking dan form perkiraan tanggal.
const props = defineProps({
  modelValue: { type: Array, required: true },
  hidePrice: { type: Boolean, default: false },
  legacy: { type: Array, default: () => [] }, // rawatan lama yang sudah tidak ada di menu
  label: { type: String, default: 'Pilih Rawatan (centang, lalu isi jumlahnya)' },
})
const emit = defineEmits(['update:modelValue'])

const { availableServices } = useMasterData()
const keyword = ref('')

const filtered = computed(() => {
  const k = keyword.value.toLowerCase()
  return k ? availableServices.value.filter((s) => s.name.toLowerCase().includes(k)) : availableServices.value
})
const selectedMap = computed(() => Object.fromEntries(props.modelValue.map((e) => [e.id, e])))

const toggle = (serv) => {
  const exists = props.modelValue.some((e) => e.id === serv.id)
  emit(
    'update:modelValue',
    exists
      ? props.modelValue.filter((e) => e.id !== serv.id)
      : [...props.modelValue, { id: serv.id, qty: 1, price: serv.default_price }],
  )
}
</script>

<template>
  <div class="space-y-2">
    <label class="block font-bold text-[#8c7355]">{{ label }}</label>
    <input v-model="keyword" type="text" placeholder="🔍 Cari nama rawatan..." class="w-full px-3 py-1.5 rounded-lg border border-[#ebdcc3] text-xs bg-white outline-none mb-2" />

    <div class="max-h-52 overflow-y-auto space-y-1 bg-white p-3 rounded-xl border border-[#ebdcc3]">
      <div v-for="serv in filtered" :key="serv.id" class="flex items-center gap-2 py-1 border-b border-gray-50 last:border-none">
        <input type="checkbox" :id="'sp-' + serv.id" :checked="!!selectedMap[serv.id]" @change="toggle(serv)" class="w-4 h-4 text-[#b48a57] rounded border-[#ebdcc3]" />
        <label :for="'sp-' + serv.id" class="text-xs text-[#3e3529] cursor-pointer flex-1 flex justify-between gap-2">
          <span>{{ serv.name }}</span>
          <span v-if="!hidePrice" class="font-bold text-[#b48a57] whitespace-nowrap">B$ {{ serv.default_price }}</span>
        </label>
        <div v-if="selectedMap[serv.id]" class="flex items-center gap-1">
          <span class="text-[10px] font-bold text-[#8c7355]">Qty</span>
          <input v-model.number="selectedMap[serv.id].qty" type="number" min="1" class="w-14 px-2 py-1 rounded border border-[#ebdcc3] text-xs outline-none" />
        </div>
      </div>
    </div>

    <p v-if="legacy.length" class="text-[10px] text-gray-500">
      Rawatan lama yang sudah tidak ada di menu tetap disimpan: {{ legacy.map((t) => t.name).join(', ') }}
    </p>
  </div>
</template>
