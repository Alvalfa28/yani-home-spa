<script setup>
// Mengambil state customer dari App.vue secara dua arah
const customer = defineModel()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-1">Nama Pelanggan</label>
      <input v-model="customer.name" type="text" placeholder="Cth: Ibu Siti" 
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all duration-200 bg-white" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-1">No. WhatsApp</label>
      <input v-model="customer.wa" type="text" placeholder="Cth: 08123456789" 
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all duration-200 bg-white" />
    </div>
    <div class="md:col-span-2">
      <label class="block text-sm font-medium text-gray-600 mb-1">Tanggal Invois</label>
      <input v-model="customer.date" type="date" 
             class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all duration-200 bg-white" />
    </div>
  </div>
</template>