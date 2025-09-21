<template>
  <div class="view-toggle">
    <button 
      :class="{ active: is3DView }" 
      @click="toggleView"
      class="toggle-button"
    >
      {{ is3DView ? '3D View' : '2D View' }}
    </button>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'ViewToggle',
  emits: ['view-change'],
  setup(props, { emit }) {
    const is3DView = ref(true);
    
    const toggleView = () => {
      is3DView.value = !is3DView.value;
      emit('view-change', is3DView.value);
    };
    
    return {
      is3DView,
      toggleView
    };
  }
};
</script>

<style scoped>
.view-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
}

.toggle-button {
  background: #1a75bc; /* GeoOne blue */
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.toggle-button:hover {
  background: #ff6b35; /* GeoOne orange */
}

.toggle-button.active {
  background: #ff6b35; /* GeoOne orange */
}
</style>