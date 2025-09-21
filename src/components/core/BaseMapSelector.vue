<template>
  <div class="base-map-selector">
    <!-- Use the new CubeIcon as the trigger -->
    <div class="selector-trigger" @click="toggleSelector">
      <CubeIcon />
    </div>
    
    <div class="selector-dropdown" v-if="isOpen">
      <!-- Renamed section to "Visualização 2D" -->
      <div class="selector-section">
        <h3>Visualização 2D</h3>
        <div 
          v-for="basemap in baseMaps" 
          :key="basemap.id"
          class="selector-option"
          :class="{ selected: modelValue.type === 'basemap' && modelValue.id === basemap.id }"
          @click="selectBaseMap(basemap.id)"
        >
          {{ basemap.name }}
        </div>
      </div>
      
      <!-- Renamed section to "Visualização 3D" -->
      <div class="selector-section">
        <h3>Visualização 3D</h3>
        <div 
          v-for="viewer in viewers" 
          :key="viewer.id"
          class="selector-option"
          :class="{ selected: modelValue.type === 'viewer' && modelValue.id === viewer.id }"
          @click="selectViewer(viewer.id)"
        >
          {{ viewer.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
// Import the new icon
import CubeIcon from '../icons/CubeIcon.vue';

export default {
  name: 'BaseMapSelector',
  components: {
    // Register the icon component
    CubeIcon
  },
  props: {
    modelValue: {
      type: Object,
      default: () => ({
        type: 'basemap',
        id: 'voyager'
      })
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const isOpen = ref(false);
    
    const baseMaps = ref([
      { id: 'voyager', name: 'Voyager' },
      { id: 'osm', name: 'OSM' },
      { id: 'dark-voyager', name: 'Dark Voyager' },
      // Terrain
      { id: 'opentopo', name: 'OpenTopoMap' },
      
    ]);
    
    const viewers = ref([
      { id: 'maplibre-3d', name: 'MapLibre 3D' },
      { id: 'three-3d', name: 'Three.js 3D (Advanced)' },
      { id: 'simple-three-3d', name: 'Three.js 3D (Simple)' }
    ]);
    
    const toggleSelector = () => {
      isOpen.value = !isOpen.value;
    };
    
    const selectBaseMap = (basemapId) => {
      emit('update:modelValue', {
        type: 'basemap',
        id: basemapId
      });
      isOpen.value = false;
    };
    
    const selectViewer = (viewerId) => {
      emit('update:modelValue', {
        type: 'viewer',
        id: viewerId
      });
      isOpen.value = false;
    };
    
    // Close selector when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.base-map-selector')) {
        isOpen.value = false;
      }
    };
    
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });
    
    onBeforeUnmount(() => {
      document.removeEventListener('click', handleClickOutside);
    });
    
    return {
      isOpen,
      baseMaps,
      viewers,
      toggleSelector,
      selectBaseMap,
      selectViewer
    };
  }
};
</script>

<style scoped>
/* Positioned the component to the top-right */
.base-map-selector {
  position: absolute;
  top: 10px;
  right: 10px; /* Changed from left to right */
  z-index: 1000;
}

/* Styling for the new icon trigger */
.selector-trigger {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px; /* Adjusted padding for icon */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center; /* Center the icon */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  width: 40px; /* Fixed width */
  height: 40px; /* Fixed height */
}

.selector-trigger:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.selector-dropdown {
  position: absolute;
  top: 100%;
  right: 0; /* Align dropdown to the right */
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  margin-top: 4px;
  min-width: 200px;
  z-index: 1001;
}

.selector-section {
  padding: 8px 0;
}

.selector-section:not(:last-child) {
  border-bottom: 1px solid #eee;
}

.selector-section h3 {
  margin: 0;
  padding: 8px 12px 4px;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  text-transform: uppercase;
}

.selector-option {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.2s ease;
}

.selector-option:hover {
  background: #f5f5f5;
}

.selector-option.selected {
  background: #1a75bc;
  color: white;
}
</style>
