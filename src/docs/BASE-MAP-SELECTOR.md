# Base Map Selector Implementation

This document explains the implementation of the new Base Map Selector that combines traditional base maps with 3D viewer options.

## Component Overview

The `BaseMapSelector.vue` component provides a unified interface for selecting between:
1. Traditional 2D base maps (Voyager, OSM, Dark Voyager)
2. 3D viewer options (MapLibre 3D, CesiumJS 3D)

## Implementation Details

### Component Structure

```vue
<BaseMapSelector 
  v-model="selectedMapConfig"
  @update:modelValue="onMapConfigChange"
/>
```

### Data Model

The component uses a unified data model with the following structure:

```javascript
{
  type: 'basemap' | 'viewer',
  id: string // Specific identifier for the selected option
}
```

### Available Options

1. **Base Maps**:
   - Voyager (`voyager`) - Default MapLibre style
   - OSM (`osm`) - OpenStreetMap style
   - Dark Voyager (`dark-voyager`) - Dark theme MapLibre style

2. **3D Viewers**:
   - MapLibre 3D (`maplibre-3d`) - Enhanced 3D with pitch/bearing
   - CesiumJS 3D (`cesium-3d`) - Full 3D globe with terrain

## Integration with Viewers

The selector integrates with both viewers through the `FlightVisualization` component:

1. When a base map is selected, the MapLibre component is shown with the appropriate style
2. When a 3D viewer is selected, the corresponding 3D component is displayed:
   - MapLibre 3D: Enhanced MapLibre with 3D features
   - CesiumJS 3D: Full CesiumJS 3D viewer

## Usage Example

```vue
<template>
  <FlightVisualization :flight-data="flightData" />
</template>

<script>
import FlightVisualization from './components/core/FlightVisualization.vue';

export default {
  components: {
    FlightVisualization
  },
  data() {
    return {
      flightData: [] // Your flight data array
    };
  }
};
</script>
```

## Styling

The selector uses a clean, modern design with:
- Dropdown interface for easy selection
- Visual separation between base maps and 3D viewers
- Clear indication of the currently selected option
- Responsive design that works on both desktop and mobile

## Benefits

1. **Unified Interface**: Single control for all map/viewer options
2. **Clear Organization**: Logical grouping of similar options
3. **Extensible**: Easy to add new base maps or 3D viewers
4. **User-Friendly**: Intuitive selection process
5. **Consistent**: Matches the application's design language

## Future Enhancements

1. **Custom Base Maps**: Allow users to add their own base map URLs
2. **Favorites**: Let users mark frequently used maps/viewers
3. **Search**: Add search functionality for large lists of options
4. **Preview**: Show thumbnails of each map style
5. **Offline Support**: Indicate which maps work offline