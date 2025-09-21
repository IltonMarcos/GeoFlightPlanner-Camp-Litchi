"use client";
import type { FC, RefObject } from 'react';
import { useMemo, useEffect, useState } from 'react';
import Map, { FullscreenControl, MapRef, Source, Layer, MapLayerMouseEvent, ScaleControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { FeaturePoint, SelectionMode } from '@/lib/types';
import type { Feature, FeatureCollection, Point, Polygon, LineString } from 'geojson';

interface MapPanelProps {
  mapRef: RefObject<MapRef>;
  points: FeaturePoint[];
  selectedPointIds: Set<string>;
  previewPointIds: Set<string>;
  onPointClick: (pointId: string, e: MapLayerMouseEvent) => void;
  isDrawing: boolean;
  drawnPolygon: {lng: number, lat: number}[];
  onMouseDown: (e: MapLayerMouseEvent) => void;
  onMouseUp: (e: MapLayerMouseEvent) => void;
  onMouseMove: (e: MapLayerMouseEvent) => void;
  onTouchStart: (e: MapLayerMouseEvent) => void;
  onTouchEnd: (e: MapLayerMouseEvent) => void;
  onTouchMove: (e: MapLayerMouseEvent) => void;
  onContextMenu: (e: MapLayerMouseEvent) => void;
  onMapClick: (e: MapLayerMouseEvent) => void;
  selectionMode: SelectionMode;
  basemap: any;
  rotationCenter: {lon: number, lat: number} | null;
  terrainEnabled: boolean;
  altitudeRelativeToTerrain: boolean;
  symbolSize: number;
}

const PRIMARY_COLOR = "#1D4ED8"; // Blue-700
const ACCENT_COLOR = "#F97316"; // Orange-500
const PREVIEW_COLOR = "#FBBF24"; // Amber-400
const ROTATION_CENTER_COLOR = "#be123c"; // Rose-700

const polygonStyle: Layer['props'] = {
    id: 'drawn-polygon',
    type: 'fill',
    paint: {
        'fill-color': ACCENT_COLOR,
        'fill-opacity': 0.3,
        'fill-outline-color': ACCENT_COLOR,
    }
};

const polygonLineStyle: Layer['props'] = {
    id: 'drawn-polygon-line',
    type: 'line',
    paint: {
        'line-color': ACCENT_COLOR,
        'line-width': 2,
    }
};

const modelLayerStyle: Layer['props'] = {
    id: 'points-3d-layer',
    type: 'model',
    source: 'points-source',
    layout: {
        'model-id': 'cone-model'
    },
    paint: {
        'model-rotation': [
            ['+', 90, ['coalesce', ['get', 'gimbalPitch'], 0]],
            ['coalesce', ['get', 'heading'], 0],
            0
        ],
        'model-scale': [2, 2, 1.5],
        'model-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], ACCENT_COLOR,
            ['boolean', ['feature-state', 'preview'], false], PREVIEW_COLOR,
            PRIMARY_COLOR
        ],
        'model-opacity': 0.8
    }
};

const symbolLayerStyle: Layer['props'] = {
    id: 'points-symbol-layer',
    type: 'circle',
    source: 'points-source',
    paint: {
        'circle-radius': 8,
        'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], ACCENT_COLOR,
            ['boolean', ['feature-state', 'preview'], false], PREVIEW_COLOR,
            PRIMARY_COLOR
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    }
};

const rotatedSymbolLayerStyle: Layer['props'] = {
    id: 'points-rotated-symbol-layer',
    type: 'symbol',
    source: 'points-source',
    layout: {
        'icon-image': 'triangle-15',
        'icon-size': 1.5,
        'icon-rotate': ['coalesce', ['get', 'heading'], 0],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
    },
    paint: {
        'icon-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], ACCENT_COLOR,
            ['boolean', ['feature-state', 'preview'], false], PREVIEW_COLOR,
            PRIMARY_COLOR
        ]
    }
};

const rotationCenterStyle: Layer['props'] = {
    id: 'rotation-center-layer',
    type: 'circle',
    paint: {
        'circle-radius': 8,
        'circle-color': ROTATION_CENTER_COLOR,
        'circle-stroke-width': 2,
        'circle-stroke-color': "#FFFFFF",
    }
}

export const MapPanel: FC<MapPanelProps> = ({
  mapRef,
  points,
  selectedPointIds,
  previewPointIds,
  onPointClick,
  isDrawing,
  drawnPolygon,
  onMouseDown,
  onMouseUp,
  onMouseMove,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  onContextMenu,
  onMapClick,
  selectionMode,
  basemap,
  rotationCenter,
  terrainEnabled,
  altitudeRelativeToTerrain,
  symbolSize
}) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [visualizedAltitudeFeatures, setVisualizedAltitudeFeatures] = useState<FeatureCollection<LineString | Point>>({ type: 'FeatureCollection', features: [] });

  const handleMapLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (typeof map.addModel === 'function' && terrainEnabled) {
      map.addModel('cone-model', 'https://maplibre.org/maplibre-gl-js-docs/assets/3d-models/cone.gltf', (error) => {
          if (error) {
            setModelLoadFailed(true);
            setIsMapLoaded(true);
            return;
          }
          setIsMapLoaded(true);
      });
    } else {
      setModelLoadFailed(true);
      setIsMapLoaded(true);
    }
  }
  
  useEffect(() => {
    if (isMapLoaded && mapRef.current) {
      const map = mapRef.current.getMap();
      const sourceId = 'terrain-dem';

      if (terrainEnabled) {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256,
          });
        }
        map.setTerrain({ source: sourceId, exaggeration: 1.5 });
      } else {
        if (map.getTerrain()) {
          map.setTerrain(null);
        }
      }
    }
  }, [terrainEnabled, isMapLoaded, mapRef]);

  useEffect(() => {
    let isCancelled = false;

    if (!terrainEnabled || !altitudeRelativeToTerrain || !isMapLoaded || !mapRef.current) {
      setVisualizedAltitudeFeatures({ type: 'FeatureCollection', features: [] });
      return;
    }

    const map = mapRef.current.getMap();

    const calculateAltitudeFeatures = async () => {
      if (isCancelled) return;

      const features: Feature<Polygon>[] = [];
      const promises = points.map(point => 
        new Promise<void>(resolve => {
          const elevation = map.queryTerrainElevation({ lng: point.lon, lat: point.lat }, { exaggerated: false });
          if (elevation !== null && point.alt !== null && point.alt !== undefined) {
            const finalAltitude = elevation + point.alt;
            const sizeInDegrees = symbolSize / 111111; 

            const polygon = [
              [
                [point.lon - sizeInDegrees, point.lat - sizeInDegrees],
                [point.lon + sizeInDegrees, point.lat - sizeInDegrees],
                [point.lon + sizeInDegrees, point.lat + sizeInDegrees],
                [point.lon - sizeInDegrees, point.lat + sizeInDegrees],
                [point.lon - sizeInDegrees, point.lat - sizeInDegrees]
              ]
            ];

            features.push({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: polygon
              },
              properties: {
                id: point.id,
                base: finalAltitude - symbolSize,
                height: finalAltitude
              }
            });
          }
          resolve();
        })
      );

      await Promise.all(promises);
      if (!isCancelled) {
        setVisualizedAltitudeFeatures({ type: 'FeatureCollection', features });
      }
    };

    const onSourceData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId === 'terrain-dem' && e.isSourceLoaded) {
        map.off('sourcedata', onSourceData);
        calculateAltitudeFeatures();
      }
    };

    if (map.getSource('terrain-dem') && map.isSourceLoaded('terrain-dem')) {
      calculateAltitudeFeatures();
    } else {
      map.on('sourcedata', onSourceData);
    }

    return () => {
      isCancelled = true;
      map.off('sourcedata', onSourceData);
    };

  }, [terrainEnabled, altitudeRelativeToTerrain, points, isMapLoaded, mapRef, symbolSize]);

  const pointsSource: FeatureCollection<Point> = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: points.map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { 
              id: p.id,
              heading: p.heading,
              gimbalPitch: p.gimbalPitch
          }
      }))
    };
  }, [points]);

  useEffect(() => {
    if (isMapLoaded && mapRef.current?.getMap()) {
        const map = mapRef.current.getMap();
        
        const sourceId = altitudeRelativeToTerrain ? 'altitude-features-source' : 'points-source';
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (!source) return;

        const allFeatures = map.querySourceFeatures(sourceId);
        const allPointIds = allFeatures.map(f => f.properties?.id).filter(id => id !== undefined);

        allPointIds.forEach(id => {
            map.setFeatureState({ source: sourceId, id: id }, { selected: false, preview: false });
        });

        selectedPointIds.forEach(id => {
            map.setFeatureState({ source: sourceId, id: id }, { selected: true });
        });

        previewPointIds.forEach(id => {
            map.setFeatureState({ source: sourceId, id: id }, { preview: true });
        });
    }
  }, [selectedPointIds, previewPointIds, points, mapRef, isMapLoaded, altitudeRelativeToTerrain]);

  const polygonFeature: Feature<Polygon> | null = isDrawing && drawnPolygon.length > 1
    ? {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[...drawnPolygon.map(p => [p.lng, p.lat]), [drawnPolygon[0].lng, drawnPolygon[0].lat]]],
        },
        properties: {}
    } : null;

  const lineFeature: Feature<LineString> | null = isDrawing && drawnPolygon.length > 0
    ? {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: drawnPolygon.map(p => [p.lng, p.lat]),
        },
        properties: {}
    } : null;
    
  const rotationCenterFeature: Feature<Point> | null = rotationCenter
    ? {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [rotationCenter.lon, rotationCenter.lat] },
        properties: {}
      }
    : null;

  const interactiveLayerIds = ['points-3d-layer', 'points-3d-selection-layer', 'points-rotated-symbol-layer', 'points-symbol-layer', 'altitude-extrusions'];
  
  return (
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: -46.6333,
          latitude: -23.5505,
          zoom: 3,
          pitch: 60
        }}
        style={{ width: '100%', height: '100%' }}
        maxPitch={85}
        mapStyle={basemap}
        dragPan={selectionMode !== 'translate'}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onContextMenu={onContextMenu}
        onClick={onMapClick}
        cursor={selectionMode === 'translate' ? 'move' : isDrawing ? 'crosshair' : 'grab'}
        interactiveLayerIds={interactiveLayerIds}
      >
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" />
        
        {isMapLoaded && (
          <>
            <Source id="points-source" type="geojson" data={pointsSource} promoteId="id">
                <Layer {...symbolLayerStyle} layout={{ 
                    visibility: (terrainEnabled && altitudeRelativeToTerrain) ? 'none' : 'visible' 
                }} />
                {(terrainEnabled && altitudeRelativeToTerrain && modelLoadFailed) && (
                    <Layer {...rotatedSymbolLayerStyle} />
                )}
                {(terrainEnabled && altitudeRelativeToTerrain && !modelLoadFailed) && (
                    <>
                        <Layer {...modelLayerStyle} />
                        <Layer 
                            id="points-3d-selection-layer" 
                            type="circle" 
                            source="points-source"
                            paint={{
                                'circle-radius': 15,
                                'circle-color': 'rgba(0,0,0,0)',
                                'circle-opacity': 0,
                                'circle-stroke-width': 0
                            }}
                            layout={{
                                'visibility': 'visible'
                            }}
                        />
                    </>
                )}
            </Source>

            <Source id="altitude-features-source" type="geojson" data={visualizedAltitudeFeatures} promoteId="id">
              <Layer id="altitude-extrusions" type="fill-extrusion" 
                layout={{ visibility: altitudeRelativeToTerrain ? 'visible' : 'none' }}
                paint={{
                  'fill-extrusion-color': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false], ACCENT_COLOR,
                    ['boolean', ['feature-state', 'preview'], false], PREVIEW_COLOR,
                    PRIMARY_COLOR
                  ],
                  'fill-extrusion-base': ['get', 'base'],
                  'fill-extrusion-height': ['get', 'height']
                }} />
            </Source>
          </>
        )}
        
        {isDrawing && lineFeature && (
          <Source id="drawing-line-source" type="geojson" data={lineFeature}>
            <Layer {...polygonLineStyle} />
          </Source>
        )}
        {isDrawing && polygonFeature && (
          <Source id="drawing-polygon-source" type="geojson" data={polygonFeature}>
            <Layer {...polygonStyle} />
          </Source>
        )}
        {selectionMode === 'rotate' && rotationCenterFeature && (
            <Source id="rotation-center-source" type="geojson" data={rotationCenterFeature}>
                <Layer {...rotationCenterStyle} />
            </Source>
        )}
      </Map>
  );
};

export default MapPanel;