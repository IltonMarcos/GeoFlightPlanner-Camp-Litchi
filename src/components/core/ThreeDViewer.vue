<template>
  <div ref="container" class="three-container" />
</template>

<script setup lang="ts">
/**
 * ThreeDViewer.vue
 * 
 * A 3D visualization component for flight waypoints using Three.js and Proj4js.
 * 
 * Features:
 * - Converts geographic coordinates (EPSG:4326) to Cartesian coordinates (ECEF)
 * - Renders waypoints as 3D spheres with labels
 * - Displays flight path as lines connecting waypoints
 * - Shows drop lines from ground to waypoints
 * - Includes Earth visualization for context
 * - Interactive camera controls with OrbitControls
 * - Performance optimizations for large datasets
 * - Responsive design with resize handling
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as proj4 from 'proj4';

// Define types
type AltitudeMode = "AGL" | "MSL";

interface FlightPoint {
  lat: number | string;
  lon: number | string;
  alt: number | string;
  [key: string]: any; // Allow any other properties
}

// Define props
const props = withDefaults(defineProps<{
  flightData: FlightPoint[];
  altitudeMode?: AltitudeMode;
  showDropLines?: boolean;
}>(), {
  altitudeMode: "AGL",
  showDropLines: true
});

// Define refs
const container = ref<HTMLDivElement | null>(null);
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: any = null;
let waypointsGroup: THREE.Group | null = null;
let lineGroup: THREE.Group | null = null;

// Configure coordinate systems
proj4.defs("WGS84", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs("ECEF", "+proj=geocent +datum=WGS84 +units=m +no_defs");

// Function to convert geographic coordinates to Cartesian
function convertGeoToCartesian(lat: number, lng: number, alt: number = 0): THREE.Vector3 {
  try {
    // Validate input
    if (!isFinite(lat) || !isFinite(lng)) {
      throw new Error('Invalid latitude or longitude values');
    }
    
    // Normalize coordinates
    const normalizedLat = Math.max(-90, Math.min(90, lat));
    const normalizedLng = ((lng + 180) % 360) - 180; // Wrap longitude to [-180, 180]
    
    const [x, y, z] = proj4("WGS84", "ECEF", [normalizedLng, normalizedLat, alt]);
    return new THREE.Vector3(x, y, z);
  } catch (error) {
    console.error('Error converting coordinates:', error);
    // Return a default position if conversion fails
    return new THREE.Vector3(0, 0, 0);
  }
}

// Function to convert string values to numbers
function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  // Accept comma as decimal separator from CSV
  const n = Number(String(v).replace(",", ".").trim());
  return isFinite(n) ? n : NaN;
}

// Initialize Three.js scene
function initScene() {
  if (!container.value) return;

  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create camera
  const containerWidth = container.value.clientWidth;
  const containerHeight = container.value.clientHeight;
  camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 100000000);
  camera.position.set(0, 0, 20000000); // 20,000 km distance

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerWidth, containerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.domElement);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Add a textured Earth sphere for context
  const earthGeometry = new THREE.SphereGeometry(6371000, 64, 64); // Earth radius in meters
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    (texture) => {
      const earthMaterial = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.4, roughness: 0.7 });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      scene.add(earth);
    },
    undefined, // onProgress callback not needed
    (error) => {
      console.error('An error occurred while loading the Earth texture:', error);
      // Fallback to a basic material if the texture fails to load
      const fallbackMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2233ff,
        wireframe: true 
      });
      const earth = new THREE.Mesh(earthGeometry, fallbackMaterial);
      scene.add(earth);
    }
  );
  
  // Add stars in the background
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 300000,
    sizeAttenuation: false
  });
  
  const starsVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(100000000);
    const y = THREE.MathUtils.randFloatSpread(100000000);
    const z = THREE.MathUtils.randFloatSpread(100000000);
    starsVertices.push(x, y, z);
  }
  
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);

  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Create groups for waypoints and lines
  waypointsGroup = new THREE.Group();
  scene.add(waypointsGroup);

  lineGroup = new THREE.Group();
  scene.add(lineGroup);

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

// Handle window resize
function onWindowResize() {
  if (!container.value || !camera || !renderer) return;

  const width = container.value.clientWidth;
  const height = container.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Render waypoints
function renderWaypoints() {
  if (!scene || !waypointsGroup || !lineGroup) return;

  // Clear existing waypoints and lines
  waypointsGroup.clear();
  lineGroup.clear();

  const pts = props.flightData ?? [];
  if (!pts.length) return;

  // Limit the number of waypoints for performance
  const maxWaypoints = 1000;
  const step = Math.max(1, Math.floor(pts.length / maxWaypoints));
  const filteredPts = pts.filter((_, index) => index % step === 0);

  // Convert waypoints to Cartesian coordinates
  const cartesianWaypoints = filteredPts.map((p, i) => {
    const lon = toNum((p as any).lon ?? (p as any).lng ?? (p as any).long);
    const lat = toNum((p as any).lat ?? (p as any).latitude);
    const altRaw = toNum((p as any).alt ?? (p as any).altitude ?? (p as any).elev ?? (p as any).height ?? (p as any).z);
    
    if (!isFinite(lon) || !isFinite(lat) || !isFinite(altRaw)) {
      return null;
    }
    
    // For now, we'll use a simplified approach to altitude
    // In a full implementation, you would need to handle AGL vs MSL properly
    const alt = altRaw;
    return convertGeoToCartesian(lat, lon, alt);
  }).filter(Boolean) as THREE.Vector3[];

  // For performance with many points, use Points instead of individual spheres
  if (cartesianWaypoints.length > 100) {
    const pointsGeometry = new THREE.BufferGeometry().setFromPoints(cartesianWaypoints);
    const pointsMaterial = new THREE.PointsMaterial({ 
      color: 0xff3333,
      size: 200000,
      sizeAttenuation: false
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    waypointsGroup.add(points);
  } else {
    // Add spheres for each waypoint
    cartesianWaypoints.forEach((point, index) => {
      // Create a larger, more visible sphere for waypoints
      const geometry = new THREE.SphereGeometry(100000, 16, 16); // Larger radius of 100 km
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xff3333,
        transparent: true,
        opacity: 0.8
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(point);
      waypointsGroup.add(sphere);
      
      // Add a small label sprite for each waypoint
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 128;
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`WP ${index + 1}`, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(point.clone().add(new THREE.Vector3(0, 0, 200000))); // Position above the waypoint
        sprite.scale.set(500000, 250000, 1); // Scale the sprite
        waypointsGroup.add(sprite);
      }
    });
  }

  // Add a line connecting the waypoints (trajectory)
  if (cartesianWaypoints.length > 1) {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(cartesianWaypoints);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00,
      linewidth: 2
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    lineGroup.add(line);
    
    // Add dashed line for better visibility
    const dashedLineMaterial = new THREE.LineDashedMaterial({
      color: 0xffff00,
      dashSize: 300000,
      gapSize: 100000,
      linewidth: 1
    });
    const dashedLine = new THREE.Line(lineGeometry, dashedLineMaterial);
    dashedLine.computeLineDistances();
    lineGroup.add(dashedLine);
  }

  // Add drop lines if requested
  if (props.showDropLines) {
    filteredPts.forEach((p, i) => {
      const lon = toNum((p as any).lon ?? (p as any).lng ?? (p as any).long);
      const lat = toNum((p as any).lat ?? (p as any).latitude);
      const altRaw = toNum((p as any).alt ?? (p as any).altitude ?? (p as any).elev ?? (p as any).height ?? (p as any).z);
      
      if (!isFinite(lon) || !isFinite(lat) || !isFinite(altRaw)) return;
      
      // Ground point (altitude 0)
      const groundPoint = convertGeoToCartesian(lat, lon, 0);
      // Actual point
      const actualPoint = convertGeoToCartesian(lat, lon, altRaw);
      
      // Create line between ground and actual point
      const dropLineGeometry = new THREE.BufferGeometry().setFromPoints([groundPoint, actualPoint]);
      const dropLineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        opacity: 0.7,
        transparent: true
      });
      const dropLine = new THREE.Line(dropLineGeometry, dropLineMaterial);
      lineGroup.add(dropLine);
    });
  }
}

// Animation loop
function animate() {
  if (!renderer || !scene || !camera) return;
  
  requestAnimationFrame(animate);
  
  // Update controls if available
  if (controls) controls.update();
  
  renderer.render(scene, camera);
}

// Rebuild entities when flight data changes
function rebuildEntities() {
  renderWaypoints();
}

let resizeObserver: ResizeObserver | null = null;

// Lifecycle hooks
onMounted(() => {
  initScene();
  renderWaypoints();
  animate();
  
  // Add resize observer for container
  if (container.value) {
    resizeObserver = new ResizeObserver(onWindowResize);
    resizeObserver.observe(container.value);
  }
});

watch(
  () => [props.flightData, props.altitudeMode, props.showDropLines],
  () => { rebuildEntities(); },
  { deep: true }
);

onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose();
  }
  
  // Dispose of geometries and materials to prevent memory leaks
  if (waypointsGroup) {
    waypointsGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
  
  if (lineGroup) {
    lineGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
  
  // Remove event listeners
  window.removeEventListener('resize', onWindowResize);
  
  // Disconnect resize observer
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value);
    resizeObserver.disconnect();
  }
  
  // Dispose of controls
  if (controls) {
    controls.dispose();
  }
});
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
</style>