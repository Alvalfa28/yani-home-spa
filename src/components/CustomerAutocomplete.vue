<script setup>
import { ref, computed } from 'vue'
import { useCustomers } from '../composables/useCustomers'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Ketik nama pelanggan...' },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'select'])

const { customerDirectory } = useCustomers()
const open = ref(false)
const active = ref(-1)

const suggestions = computed(() => {
  const keyword = props.modelValue.trim().toLowerCase()
  if (!keyword) return []
  const starts = (c) => (c.name.toLowerCase().startsWith(keyword) ? 1 : 0)
  return customerDirectory.value
    .filter((c) => c.name.toLowerCase().includes(keyword))
    .sort((a, b) => starts(b) - starts(a) || a.name.localeCompare(b.name))
    .slice(0, 8)
})

const onInput = (e) => {
  emit('update:modelValue', e.target.value)
  open.value = true
  active.value = -1
}

// Klik nama -> isi nama, no. telefon, dan alamat sekaligus (diterima komponen induk lewat @select).
const pick = (cust) => {
  emit('update:modelValue', cust.name)
  emit('select', cust)
  open.value = false
  active.value = -1
}

const onKeydown = (e) => {
  if (!open.value || suggestions.value.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, suggestions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter' && active.value >= 0) {
    e.preventDefault()
    pick(suggestions.value[active.value])
  } else if (e.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="relative">
    <input :value="modelValue" type="text" autocomplete="off" :placeholder="placeholder"
           @input="onInput" @focus="open = true" @blur="open = false" @keydown="onKeydown"
           class="w-full border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none"
           :class="compact ? 'px-3 py-2 rounded-lg bg-white' : 'px-4 py-2.5 rounded-xl text-sm bg-[#fffdfa]'" />

    <ul v-if="open && suggestions.length" class="absolute left-0 right-0 mt-1 bg-white border border-[#ebdcc3] rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto">
      <li v-for="(c, i) in suggestions" :key="c.key" @mousedown.prevent="pick(c)" @mouseenter="active = i"
          class="px-4 py-2 text-xs cursor-pointer border-b border-gray-50 last:border-none"
          :class="i === active ? 'bg-[#f4ecd8]' : 'hover:bg-[#fdfbf7]'">
        <div class="flex justify-between gap-2">
          <span class="font-bold text-[#3e3529]">{{ c.name }}</span>
          <span class="text-gray-500">{{ c.phone }}</span>
        </div>
        <p v-if="c.address" class="text-[10px] text-gray-500 truncate">📍 {{ c.address }}</p>
      </li>
    </ul>
  </div>
</template>
