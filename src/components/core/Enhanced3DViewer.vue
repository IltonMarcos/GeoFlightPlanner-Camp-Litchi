<template>
  <div ref="container" class="cesium-container" />
</template>

<script setup lang="ts">
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { onMounted, onBeforeUnmount, ref, watch } from "vue";

type AltitudeMode = "AGL" | "MSL";

interface FlightPoint {
  lat: number | string;
  lon: number | string;
  alt: number | string; // metros
  // ... qualquer outro campo do CSV que queira carregar como propriedade
}

const props = withDefaults(defineProps<{
  flightData: FlightPoint[];
  altitudeMode?: AltitudeMode;     // "AGL" (padrão) ou "MSL"
  showDropLines?: boolean;         // linhas verticais do solo ao ponto
  cesiumIonToken?: string;         // sobrescreve VITE_CESIUM_ION_TOKEN
}>(), {
  altitudeMode: "AGL",
  showDropLines: true
});

const container = ref<HTMLDivElement | null>(null);
let viewer: Cesium.Viewer | null = null;
let dataSource: Cesium.CustomDataSource | null = null;

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  // aceita vírgula decimal do CSV
  const n = Number(String(v).replace(",", ".").trim());
  return isFinite(n) ? n : NaN;
}

async function ensureTerrain() {
  // Token
  Cesium.Ion.defaultAccessToken =
    props.cesiumIonToken ?? (import.meta as any).env?.VITE_CESIUM_ION_TOKEN ?? "";

  // Cesium mudou APIs de terreno ao longo das versões; cobrimos as principais:
  let terrainProvider: Cesium.TerrainProvider;
  if ((Cesium as any).createWorldTerrainAsync) {
    terrainProvider = await (Cesium as any).createWorldTerrainAsync();
  } else if ((Cesium as any).createWorldTerrain) {
    terrainProvider = (Cesium as any).createWorldTerrain();
  } else if ((Cesium as any).Terrain && (Cesium as any).Terrain.fromWorldTerrain) {
    terrainProvider = (Cesium as any).Terrain.fromWorldTerrain();
  } else {
    terrainProvider = new Cesium.EllipsoidTerrainProvider(); // fallback sem relevo
  }
  viewer!.terrainProvider = terrainProvider;
  viewer!.scene.globe.depthTestAgainstTerrain = true;
}

async function rebuildEntities() {
  if (!viewer) return;

  // limpa data source anterior
  if (dataSource) {
    viewer.dataSources.remove(dataSource, true);
    dataSource = null;
  }
  dataSource = new Cesium.CustomDataSource("flight");
  await viewer.dataSources.add(dataSource);

  const pts = props.flightData ?? [];
  if (!pts.length) return;

  // precisamos amostrar o terreno quando:
  // - queremos drop lines (para obter a altitude do solo) OU
  // - altitudeMode === "MSL" e queremos exibir AGL em tooltip, etc.
  const needTerrainHeights = !!props.showDropLines || props.altitudeMode === "MSL";

  let terrainHeights: number[] | null = null;
  if (needTerrainHeights) {
    const cartos = pts.map(p => {
      const lon = toNum((p as any).lon ?? (p as any).lng ?? (p as any).long);
      const lat = toNum((p as any).lat ?? (p as any).latitude);
      return Cesium.Cartographic.fromDegrees(lon, lat);
    });
    // amostra no nível mais detalhado disponível
    const sampled = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartos);
    terrainHeights = sampled.map(c => c.height); // altura do terreno acima do elipsóide
  }

  const entities: Cesium.Entity[] = [];

  pts.forEach((p, i) => {
    const lon = toNum((p as any).lon ?? (p as any).lng ?? (p as any).long);
    const lat = toNum((p as any).lat ?? (p as any).latitude);
    const altRaw = toNum((p as any).alt ?? (p as any).altitude ?? (p as any).elev ?? (p as any).height ?? (p as any).z);

    if (!isFinite(lon) || !isFinite(lat) || !isFinite(altRaw)) return;

    const terrain = terrainHeights ? terrainHeights[i] : undefined;

    // Monta posição e referência de altura conforme o modo
    let position: Cesium.Cartesian3;
    let heightReference: Cesium.HeightReference | undefined;

    if (props.altitudeMode === "AGL") {
      // ALT é altura acima do solo -> use heightReference RELATIVE_TO_GROUND
      position = Cesium.Cartesian3.fromDegrees(lon, lat, altRaw);
      heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
    } else {
      // ALT é altitude absoluta (MSL/ellipsoide) -> use NONE
      position = Cesium.Cartesian3.fromDegrees(lon, lat, altRaw);
      heightReference = Cesium.HeightReference.NONE;
    }

    // calcula AGL para tooltip (se tiver terreno amostrado)
    const agl = terrain != null
      ? (props.altitudeMode === "AGL" ? altRaw : (altRaw - terrain))
      : undefined;

    const ent = dataSource!.entities.add({
      position,
      point: {
        pixelSize: 6,
        color: Cesium.Color.RED.withAlpha(0.9),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        heightReference
      },
      properties: {
        ...p,
        terrainHeight: terrain,
        altAGL: agl
      },
      label: {
        text: agl != null ? `${agl.toFixed(1)} m AGL` : "",
        font: "12px sans-serif",
        pixelOffset: new Cesium.Cartesian2(0, -15),
        showBackground: true,
        backgroundColor: Cesium.Color.fromBytes(0, 0, 0, 160),
        heightReference
      }
    });
    entities.push(ent);

    // Drop line opcional (solo -> ponto)
    if (props.showDropLines) {
      const groundH = terrain ?? 0.0;
      const groundPos = Cesium.Cartesian3.fromDegrees(lon, lat, groundH);
      dataSource!.entities.add({
        polyline: {
          positions: [groundPos, position],
          width: 1.5,
          material: Cesium.Color.fromBytes(255, 255, 255, 180),
          // depthFailMaterial mantém visível mesmo quando cruza terreno
          depthFailMaterial: Cesium.Color.fromBytes(255, 255, 255, 80)
        }
      });
    }
  });

  if (entities.length) {
    viewer.flyTo(entities, { duration: 1.2 });
  }
}

onMounted(async () => {
  if (!container.value) return;

  viewer = new Cesium.Viewer(container.value, {
    // widgets desnecessários desligados
    geocoder: false,
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    selectionIndicator: false,
    infoBox: false,
    sceneMode: Cesium.SceneMode.SCENE3D,
    // o terrainProvider será setado após ensureTerrain()
  });

  await ensureTerrain();
  await rebuildEntities();
});

watch(
  () => [props.flightData, props.altitudeMode, props.showDropLines],
  () => { rebuildEntities(); },
  { deep: true }
);

onBeforeUnmount(() => {
  if (viewer && !viewer.isDestroyed()) viewer.destroy();
  viewer = null;
});
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: absolute; /* ou o que seu layout exigir */
  inset: 0;
}
</style>