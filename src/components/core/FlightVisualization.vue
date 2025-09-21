<template>
  <div class="visualization-container">
    <BaseMapSelector 
      v-model="selectedMapConfig"
      @update:modelValue="onMapConfigChange"
    />
    
    <div class="viewer-container">
      <!-- Show MapLibre viewer when selected -->
      <MapComponent 
        v-if="selectedMapConfig.type === 'basemap' || selectedMapConfig.id === 'maplibre-3d'" 
        ref="mapComponent"
        :flight-data="flightData"
        :base-map="selectedMapConfig.type === 'basemap' ? selectedMapConfig.id : 'voyager'"
        :selection-mode="selectionMode"
        :selected-points="selectedPoints"
        @toggle-point-selection="$emit('toggle-point-selection', $event)"
        @set-selection-mode="$emit('set-selection-mode', $event)"
        @rotate-points="(center, angle) => $emit('rotate-points', center, angle)"
        @apply-rotation="$emit('apply-rotation')"
      />
      
      <!-- Show Three.js viewer when selected -->
      <ThreeDViewer 
        v-else-if="selectedMapConfig.id === 'three-3d'" 
        ref="threeComponent"
        :flight-data="flightData"
        altitudeMode="AGL"
        :showDropLines="true"
      />
      
      <!-- Show Simple Three.js viewer when selected -->
      <SimpleThreeDViewer 
        v-else-if="selectedMapConfig.id === 'simple-three-3d'" 
        ref="simpleThreeComponent"
        :flight-data="flightData"
      />
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import MapComponent from './MapComponent.vue';
import ThreeDViewer from './ThreeDViewer.vue';
import SimpleThreeDViewer from './SimpleThreeDViewer.vue';
import BaseMapSelector from './BaseMapSelector.vue';

export default {
  name: 'FlightVisualization',
  components: {
    MapComponent,
    ThreeDViewer,
    SimpleThreeDViewer,
    BaseMapSelector
  },
  props: {
    flightData: {
      type: Array,
      default: () => []
    },
    selectionMode: {
      type: String,
      default: 'single'
    },
    selectedPoints: {
      type: Set,
      default: () => new Set()
    },
  },
  emits: ['toggle-point-selection', 'set-selection-mode', 'rotate-points', 'apply-rotation'],
  setup(props) {
    const selectedMapConfig = ref({
      type: 'basemap',
      id: 'voyager'
    });
    
    const mapComponent = ref(null);
    const threeComponent = ref(null);

    const onMapConfigChange = (newConfig) => {
      selectedMapConfig.value = newConfig;
      
      if ((newConfig.type === 'basemap' || newConfig.id === 'maplibre-3d') && mapComponent.value && props.flightData.length > 0) {
        mapComponent.value.updateFlightData(props.flightData);
      }
    };

    

    return {
      selectedMapConfig,
      mapComponent,
      threeComponent,
      onMapConfigChange
    };
  }
};
</script>

<style scoped>
.visualization-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.viewer-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
}
</style>