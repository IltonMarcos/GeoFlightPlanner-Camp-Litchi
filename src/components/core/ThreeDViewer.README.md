# Three.js 3D Visualization Implementation

This implementation replaces the Cesium-based 3D visualization with a lighter-weight solution using Three.js and Proj4js.

## Features

- **Coordinate Conversion**: Uses Proj4js to convert geographic coordinates (EPSG:4326) to Earth-Centered, Earth-Fixed (ECEF) Cartesian coordinates
- **3D Visualization**: Renders flight waypoints as 3D spheres with labels
- **Flight Path**: Displays the flight path as lines connecting waypoints
- **Drop Lines**: Shows vertical lines from the ground to each waypoint
- **Earth Visualization**: Includes a wireframe Earth for spatial context
- **Starfield**: Adds a background starfield for visual appeal
- **Interactive Controls**: Implements OrbitControls for camera manipulation
- **Performance Optimizations**: 
  - Uses Points for large datasets (more than 100 waypoints)
  - Limits maximum number of rendered waypoints
  - Proper resource disposal to prevent memory leaks
- **Responsive Design**: Handles window and container resizing

## Dependencies

- `three`: The core Three.js library
- `proj4`: For coordinate transformations
- `@types/three`: TypeScript definitions for Three.js
- `@types/proj4`: TypeScript definitions for Proj4js

## Installation

```bash
npm install three proj4
npm install --save-dev @types/three @types/proj4
```

## Usage

The ThreeDViewer component can be used like any other Vue component:

```vue
<template>
  <ThreeDViewer 
    :flight-data="flightData"
    altitude-mode="AGL"
    :show-drop-lines="true"
  />
</template>

<script setup>
import ThreeDViewer from './ThreeDViewer.vue';

const flightData = [
  { lat: -23.5505, lon: -46.6333, alt: 100000 },
  { lat: 40.7128, lon: -74.0060, alt: 100000 },
  { lat: 35.6895, lon: 139.6917, alt: 100000 }
];
</script>
```

## Implementation Details

### Coordinate System

The implementation uses the following coordinate systems:
- **WGS84 (EPSG:4326)**: Geographic coordinates (latitude, longitude, altitude)
- **ECEF**: Earth-Centered, Earth-Fixed Cartesian coordinates (x, y, z in meters)

The conversion is done using Proj4js with the following definitions:
```
WGS84: "+proj=longlat +datum=WGS84 +no_defs"
ECEF: "+proj=geocent +datum=WGS84 +units=m +no_defs"
```

### Performance Considerations

1. **Waypoint Limiting**: For datasets with more than 1000 waypoints, the implementation samples the data to maintain performance.
2. **Rendering Optimization**: For large datasets (>100 waypoints), the implementation uses `THREE.Points` instead of individual spheres.
3. **Memory Management**: All Three.js resources (geometries, materials) are properly disposed of when the component is unmounted.

### Controls

The implementation uses OrbitControls for camera manipulation:
- **Rotate**: Left mouse button drag
- **Zoom**: Mouse wheel or pinch gesture
- **Pan**: Right mouse button drag

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flightData` | Array | `[]` | Array of flight points with lat, lon, and alt properties |
| `altitudeMode` | String | `"AGL"` | Altitude mode ("AGL" or "MSL") |
| `showDropLines` | Boolean | `true` | Whether to show drop lines from ground to waypoints |

## Future Improvements

1. **Texture-based Earth**: Replace the wireframe Earth with a textured sphere
2. **Advanced Labeling**: Implement more sophisticated labeling with collision detection
3. **Animation**: Add animation capabilities for flight path visualization
4. **Customization**: Add more customization options for colors, sizes, and materials
5. **Performance**: Further optimize for very large datasets using techniques like level-of-detail rendering