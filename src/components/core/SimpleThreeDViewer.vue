<template>
  <div ref="container" class="three-container"></div>
</template>

<script>
import * as THREE from 'three';
import * as proj4 from 'proj4';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default {
  name: 'SimpleThreeDViewer',
  props: {
    flightData: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      waypoints: []
    };
  },
  mounted() {
    this.init();
    this.animate();
    window.addEventListener('resize', this.onWindowResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
  },
  watch: {
    flightData: {
      handler() {
        this.updateWaypoints();
      },
      deep: true
    }
  },
  methods: {
    init() {
      // Configure coordinate systems
      proj4.defs("WGS84", "+proj=longlat +datum=WGS84 +no_defs"); // Lat/Lng (graus)
      proj4.defs("ECEF", "+proj=geocent +datum=WGS84 +units=m +no_defs"); // Cartesiano (metros)

      // Create scene
      this.scene = new THREE.Scene();
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(75, this.$refs.container.clientWidth / this.$refs.container.clientHeight, 0.1, 10000000);
      this.camera.position.set(0, 0, 20000000); // 20.000 km de distância
      this.camera.lookAt(0, 0, 0);
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(this.$refs.container.clientWidth, this.$refs.container.clientHeight);
      this.$refs.container.appendChild(this.renderer.domElement);
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);
      
      // Add Earth sphere
      const earthGeometry = new THREE.SphereGeometry(6371000, 32, 32); // Raio da Terra em metros
      const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0x2233FF,
        transparent: true,
        opacity: 0.7
      });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      this.scene.add(earth);
      
      // Add orbit controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.minDistance = 6371000; // Raio da Terra (não permitir zoom mais próximo)
      this.controls.maxDistance = 30000000; // 30.000 km de distância máxima
      
      // Initial waypoint update
      this.updateWaypoints();
    },
    
    // Function to convert geographic coordinates to Cartesian
    convertGeoToCartesian(lat, lng, alt = 0) {
      const [x, y, z] = proj4("WGS84", "ECEF", [lng, lat, alt]);
      return new THREE.Vector3(x, y, z);
    },
    
    // Update waypoints based on flight data
    updateWaypoints() {
      // Remove existing waypoints
      this.waypoints.forEach(waypoint => {
        this.scene.remove(waypoint);
      });
      this.waypoints = [];
      
      // Add new waypoints
      if (this.flightData && this.flightData.length > 0) {
        this.flightData.forEach(point => {
          const lat = parseFloat(point.lat);
          const lng = parseFloat(point.lon);
          const alt = parseFloat(point.alt) || 0;
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const position = this.convertGeoToCartesian(lat, lng, alt);
            const waypointGeometry = new THREE.SphereGeometry(100000, 16, 16); // 100km de tamanho visual
            const waypointMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
            const waypoint = new THREE.Mesh(waypointGeometry, waypointMaterial);
            waypoint.position.copy(position);
            this.scene.add(waypoint);
            this.waypoints.push(waypoint);
          }
        });
      }
    },
    
    // Animation loop
    animate() {
      requestAnimationFrame(this.animate);
      if (this.controls) {
        this.controls.update();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },
    
    // Handle window resize
    onWindowResize() {
      if (this.camera && this.renderer && this.$refs.container) {
        this.camera.aspect = this.$refs.container.clientWidth / this.$refs.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.$refs.container.clientWidth, this.$refs.container.clientHeight);
      }
    }
  }
};
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
}
</style>