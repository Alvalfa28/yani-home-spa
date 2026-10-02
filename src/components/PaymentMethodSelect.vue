<script setup>
import { computed } from 'vue'
import { PAYMENT_METHODS, isUnpaid } from '../utils/payment'

const props = defineProps({
  modelValue: { type: String, default: 'Cash' },
  compact: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

// Nilai lama dari database yang tidak ada di daftar tetap ditampilkan, bukan dikosongkan.
const options = computed(() =>
  !props.modelValue || PAYMENT_METHODS.includes(props.modelValue)
    ? PAYMENT_METHODS
    : [...PAYMENT_METHODS, props.modelValue],
)
</script>

<template>
  <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"
          class="w-full border border-[#ebdcc3] focus:ring-2 focus:ring-[#b48a57] outline-none font-bold"
          :class="[
            compact ? 'px-3 py-2 rounded-lg text-xs' : 'px-4 py-2.5 rounded-xl text-sm',
            isUnpaid(modelValue) ? 'text-red-600 bg-red-50' : 'text-[#3e3529] bg-[#fffdfa]',
          ]">
    <option v-for="m in options" :key="m" :value="m">{{ isUnpaid(m) ? '⚠️ ' + m : m }}</option>
  </select>
</template>
