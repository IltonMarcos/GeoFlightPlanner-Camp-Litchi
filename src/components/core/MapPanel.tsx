
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
  basemap: string;
}

const PRIMARY_COLOR = "#1D4ED8"; // Blue-700
const ACCENT_COLOR = "#F97316"; // Orange-500

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

const pointLayerStyle: Layer['props'] = {
    id: 'points-layer',
    type: 'circle',
    source: 'points-source',
    paint: {
        'circle-radius': 8,
        'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            ACCENT_COLOR,
            PRIMARY_COLOR
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': "#FFFFFF",
        'circle-opacity': 0.8
    }
};

export const MapPanel: FC<MapPanelProps> = ({
  mapRef,
  points,
  selectedPointIds,
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
}) => {
  const BASEMAP_STYLES: Record<string, any> = {
    voyager: 'https://demotiles.maplibre.org/style.json',
    'dark-voyager': 'https://demotiles.maplibre.org/style.json',
    osm: 'https://demotiles.maplibre.org/style.json',
    opentopo: {
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
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const pointsSource: FeatureCollection<Point> = useMemo(() => ({
    type: 'FeatureCollection',
    features: points.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { id: p.id }
    }))
  }), [points]);

  useEffect(() => {
    if (isMapLoaded && mapRef.current?.getMap()) {
        const map = mapRef.current.getMap();
        
        const source = map.getSource('points-source') as maplibregl.GeoJSONSource | undefined;
        if (!source) return;

        // First, clear the selection state for all features to handle deselection
        const allPointIds = points.map(p => p.id);
        allPointIds.forEach(id => {
            map.removeFeatureState({ source: 'points-source', id });
        });

        // Then, apply the selection state for the currently selected features
        selectedPointIds.forEach(id => {
            map.setFeatureState(
                { source: 'points-source', id: id },
                { selected: true }
            );
        });
    }
  }, [selectedPointIds, points, mapRef, isMapLoaded]);

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

  return (
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        onLoad={() => setIsMapLoaded(true)}
        initialViewState={{
          longitude: -46.6333,
          latitude: -23.5505,
          zoom: 3,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={BASEMAP_STYLES[basemap] ?? basemap}
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
        interactiveLayerIds={['points-layer']}
      >
        <FullscreenControl position="top-right" />
        <ScaleControl position="bottom-left" />
        
        {isMapLoaded && (
            <Source id="points-source" type="geojson" data={pointsSource} promoteId="id">
                <Layer {...pointLayerStyle} />
            </Source>
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
      </Map>
  );
};

export default MapPanel;
