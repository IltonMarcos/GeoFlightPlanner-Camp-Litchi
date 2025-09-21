<template>
  <div id="map" style="height: 400px;">
    <ViewToggle @view-change="onViewChange" />
  </div>
</template>

<script>
import { onMounted, ref, defineExpose, watch } from 'vue';
import maplibre from 'maplibre-gl';
import ViewToggle from './ViewToggle.vue';
import { pointsToGeoJSON } from '../../lib/csvParser';

export default {
  name: 'MapComponent',
  components: {
    ViewToggle
  },
  props: {
    flightData: {
      type: Array,
      default: () => []
    },
    baseMap: {
      type: String,
      default: 'voyager'
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
  emits: ['view-change', 'toggle-point-selection', 'set-selection-mode', 'rotate-points', 'apply-rotation'],
  setup(props, { emit }) {
    const map = ref(null);
    const is3DView = ref(true);
    const rotationCenter = ref(null);
    let dragStartPoint = null;
    
    const baseMapStyles = {
      'voyager': 'https://demotiles.maplibre.org/style.json',
      'osm': 'https://demotiles.maplibre.org/style.json',
      'dark-voyager': 'https://demotiles.maplibre.org/style.json',
      // Free terrain
      'opentopo': {
        version: 8,
        sources: {
          opentopo: {
            type: 'raster',
            tiles: [
              'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
              'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
              'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: 'Map data: \u00A9 OpenStreetMap contributors, SRTM | Style: \u00A9 OpenTopoMap (CC-BY-SA)'
          }
        },
        layers: [ { id: 'opentopo', type: 'raster', source: 'opentopo', minzoom: 0, maxzoom: 17 } ]
      },
    };
    
    onMounted(() => {
      map.value = new maplibre.Map({
        container: 'map',
        style: baseMapStyles[props.baseMap] || baseMapStyles['voyager'],
        center: [-50, -15],
        zoom: 4,
        pitch: is3DView.value ? 60 : 0,
        bearing: 0
      });

      map.value.addControl(new maplibre.NavigationControl(), 'top-right');
      
      map.value.on('load', () => {
        if (props.flightData && props.flightData.length > 0) {
          updateFlightData(props.flightData);
        }
        setupMapInteractions();
      });
    });
    
    watch(() => props.baseMap, (newBaseMap) => {
      if (map.value) {
        map.value.setStyle(baseMapStyles[newBaseMap] || baseMapStyles['voyager'], { diff: false });
        map.value.once('styledata', () => {
          if (props.flightData && props.flightData.length > 0) {
            updateFlightData(props.flightData);
          }
        });
      }
    });

    watch(() => props.selectionMode, (newMode) => {
        if (newMode === 'rotate') {
            map.value.getCanvas().style.cursor = 'crosshair';
            rotationCenter.value = null; // Reset on mode change
        } else {
            map.value.getCanvas().style.cursor = 'grab';
        }
    });

    watch(() => props.selectedPoints, () => {
        if (map.value && map.value.isStyleLoaded() && map.value.getLayer('waypoints-3d')) {
            map.value.setPaintProperty('waypoints-3d', 'fill-extrusion-color', [
                'case',
                ['in', ['get', 'id'], ['literal', [...props.selectedPoints]]],
                '#ff6b35', // Selected color
                '#1a75bc'  // Default color
            ]);
        }
    });

    const setupMapInteractions = () => {
        map.value.on('click', (e) => {
            if (props.selectionMode === 'single') {
                const features = map.value.queryRenderedFeatures(e.point, { layers: ['waypoints-3d'] });
                if (features.length > 0) {
                    const pointId = features[0].properties.id;
                    emit('toggle-point-selection', pointId);
                }
            } else if (props.selectionMode === 'rotate') {
                if (!rotationCenter.value) {
                    rotationCenter.value = e.lngLat;
                    // Add a marker for the rotation center
                    if (map.value.getSource('rotation-center')) {
                        map.value.getSource('rotation-center').setData({
                            type: 'Point',
                            coordinates: [e.lngLat.lng, e.lngLat.lat]
                        });
                    } else {
                        map.value.addSource('rotation-center', {
                            type: 'geojson',
                            data: { type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] }
                        });
                        map.value.addLayer({
                            id: 'rotation-center-layer',
                            type: 'circle',
                            source: 'rotation-center',
                            paint: {
                                'circle-radius': 6,
                                'circle-color': '#f00',
                                'circle-stroke-width': 2,
                                'circle-stroke-color': '#fff'
                            }
                        });
                    }
                }
            }
        });

        map.value.on('mousedown', (e) => {
            if (props.selectionMode === 'rotate' && rotationCenter.value) {
                map.value.dragPan.disable();
                dragStartPoint = e.lngLat;
                map.value.on('mousemove', onRotateDrag);
                map.value.once('mouseup', onRotateDragEnd);
            }
        });
    };

    const onRotateDrag = (e) => {
        if (!dragStartPoint || !rotationCenter.value) return;

        const center = rotationCenter.value;
        const start = dragStartPoint;
        const end = e.lngLat;

        const angle1 = Math.atan2(start.lat - center.lat, start.lng - center.lng);
        const angle2 = Math.atan2(end.lat - center.lat, end.lng - center.lng);
        let angle = (angle2 - angle1) * 180 / Math.PI;

        emit('rotate-points', { lon: center.lng, lat: center.lat }, angle);
        dragStartPoint = e.lngLat; // Update start point for continuous rotation
    };

    const onRotateDragEnd = () => {
        map.value.dragPan.enable();
        map.value.off('mousemove', onRotateDrag);
        
        // Reset state
        rotationCenter.value = null;
        dragStartPoint = null;
        if (map.value.getSource('rotation-center')) {
            map.value.removeLayer('rotation-center-layer');
            map.value.removeSource('rotation-center');
        }
        emit('apply-rotation');
        emit('set-selection-mode', 'single');
    };
    
    const updateFlightData = (points) => {
      if (!map.value || !map.value.isStyleLoaded()) return;
      
      const { lineString, waypoints } = pointsToGeoJSON(points);
      
      const waypointsAsPolygons = {
        type: 'FeatureCollection',
        features: waypoints.features.map(pointFeature => {
          const coords = pointFeature.geometry.coordinates;
          const altitude = pointFeature.properties.altitude;
          const size = 0.0001;
          
          return {
            type: 'Feature',
            properties: {
              altitude: altitude,
              id: pointFeature.properties.id
            },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [coords[0] - size, coords[1] - size],
                [coords[0] + size, coords[1] - size],
                [coords[0] + size, coords[1] + size],
                [coords[0] - size, coords[1] + size],
                [coords[0] - size, coords[1] - size]
              ]]
            }
          };
        })
      };
      
      if (map.value.getSource('flight-path')) {
        map.value.getSource('flight-path').setData(lineString);
      } else {
        map.value.addSource('flight-path', { type: 'geojson', data: lineString });
        map.value.addLayer({
          id: 'flight-path-3d',
          type: 'line',
          source: 'flight-path',
          paint: { 'line-color': '#ff6b35', 'line-width': 3, 'line-opacity': 0.8 }
        });
      }
      
      if (map.value.getSource('waypoints')) {
        map.value.getSource('waypoints').setData(waypointsAsPolygons);
      } else {
        map.value.addSource('waypoints', { type: 'geojson', data: waypointsAsPolygons });
      }
      
      if (!map.value.getLayer('waypoints-3d')) {
        map.value.addLayer({
          id: 'waypoints-3d',
          type: 'fill-extrusion',
          source: 'waypoints',
          paint: {
            'fill-extrusion-color': '#1a75bc',
            'fill-extrusion-height': ['get', 'altitude'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.9
          }
        });
      }
    };

    const onViewChange = (is3D) => {
      is3DView.value = is3D;
      if (map.value) {
        map.value.easeTo({ pitch: is3D ? 60 : 0, duration: 1000 });
      }
      emit('view-change', is3D);
    };

    defineExpose({ updateFlightData });

    return { map, updateFlightData, onViewChange };
  },
};
</script>

<style scoped>
@import 'maplibre-gl/dist/maplibre-gl.css';

#map {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
