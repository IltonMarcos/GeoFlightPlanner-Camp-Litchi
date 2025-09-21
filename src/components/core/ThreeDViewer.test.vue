<template>
  <div class="test-container">
    <h1>Three.js 3D Viewer Test</h1>
    <ThreeDViewer :flight-data="testFlightData" />
  </div>
</template>

<script setup lang="ts">
import ThreeDViewer from './ThreeDViewer.vue';

// Sample flight data for testing
const testFlightData = [
  { lat: -23.5505, lon: -46.6333, alt: 100000 }, // São Paulo, Brazil
  { lat: 40.7128, lon: -74.0060, alt: 100000 }, // New York, USA
  { lat: 35.6895, lon: 139.6917, alt: 100000 }, // Tokyo, Japan
  { lat: 51.5074, lon: -0.1278, alt: 100000 }, // London, UK
  { lat: -33.8688, lon: 151.2093, alt: 100000 } // Sydney, Australia
];