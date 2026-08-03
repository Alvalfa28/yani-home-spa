<script setup>
const treatments = defineModel('treatments')

// Menerima prop totalAmount dari App.vue
defineProps({
  totalAmount: {
    type: Number,
    required: true
  }
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

const addTreatment = () => {
  treatments.value.push({ name: '', price: 0 })
}

const removeTreatment = (index) => {
  if (treatments.value.length > 1) {
    treatments.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="mb-8">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-serif font-semibold text-gray-800">Rincian Rawatan</h3>
      <button @click="addTreatment" 
              class="text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-md transition-colors">
        + Tambah Rawatan
      </button>
    </div>

    <!-- Tabel Dinamis -->
    <div class="space-y-3">
      <div v-for="(item, index) in treatments" :key="index" 
           class="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
        
        <div class="flex-grow w-full">
          <input v-model="item.name" type="text" placeholder="Nama Layanan (cth: Urut Tradisional)" 
                 class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none bg-white" />
        </div>
        
        <div class="w-full sm:w-48 relative">
          <span class="absolute left-3 top-2.5 text-gray-400 text-sm">Rp</span>
          <input v-model.number="item.price" type="number" min="0" placeholder="0"
                 class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none bg-white" />
        </div>

        <button @click="removeTreatment(index)" title="Hapus baris"
                class="text-gray-400 hover:text-red-500 p-2 transition-colors self-end sm:self-auto"
                :class="{'opacity-50 cursor-not-allowed hover:text-gray-400': treatments.length === 1}"
                :disabled="treatments.length === 1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Kalkulasi Total -->
    <div class="flex justify-end border-t border-rose-100 pt-6 mt-6">
      <div class="bg-rose-50 px-6 py-4 rounded-xl border border-rose-100 min-w-[250px]">
        <p class="text-sm font-medium text-rose-800/70 mb-1 uppercase tracking-wider">Total Keseluruhan</p>
        <p class="text-2xl font-bold text-gray-900 font-serif">{{ formatCurrency(totalAmount) }}</p>
      </div>
    </div>
  </div>
</template>