<script setup>
import { useToast } from '../composables/useToast'
const { toast } = useToast()
</script>

<template>
  <transition name="toast">
    <div v-if="toast.show"
         class="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium border flex items-center gap-3 backdrop-blur-md transition-all print:hidden"
         :class="toast.type === 'error' ? 'bg-red-500/90 text-white border-red-600' : 'bg-[#3e3529]/95 text-white border-[#b48a57]'">
      <span>{{ toast.message }}</span>
    </div>
  </transition>
</template>
