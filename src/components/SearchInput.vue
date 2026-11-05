<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Cari...' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">🔍</span>
    <input :value="modelValue" type="text" autocomplete="off" :placeholder="placeholder"
           @input="$emit('update:modelValue', $event.target.value)"
           class="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#ebdcc3] bg-white text-sm outline-none focus:ring-2 focus:ring-[#b48a57]" />
    <button v-if="modelValue" type="button" aria-label="Hapus pencarian" @click="$emit('update:modelValue', '')"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 text-xs font-bold">✕</button>
  </div>
</template>
