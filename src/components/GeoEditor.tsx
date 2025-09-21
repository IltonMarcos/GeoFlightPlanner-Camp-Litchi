"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { useToast } from '../hooks/use-toast';
import MapPanel from './MapPanel';
import dynamic from 'next/dynamic';
const Toolbar = dynamic(() => import('./Toolbar'), { ssr: false });
import AttributePanel from './AttributePanel';
import ImportDialog from './ImportDialog';
import HelpDialog from './HelpDialog';
import { useFlightData } from '../hooks/useFlightData';
import { parseCsv, generateCsv } from '../lib/csv-helpers';
import { downloadCsv } from '../lib/utils';
import { ViewMode, FeaturePoint, SelectionMode } from '@/lib/types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import * as turf from '@turf/turf';

const ALTITUDE_SENSITIVITY = 0.5; // Adjust this value to control altitude change speed
const ROTATION_SENSITIVITY = 0.5; // Adjust to control rotation speed

const satelliteStyle = {
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  },
  layers: [
    {
      id: 'esri-world-imagery-layer',
      type: 'raster' as const,
      source: 'esri-world-imagery',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// Free basemap styles (no keys required)




const openTopoMapStyle = {
  version: 8,
  sources: {
    opentopo: {
      type: 'raster' as const,
      tiles: [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Style: &copy; OpenTopoMap (CC-BY-SA)'
    }
  },
  layers: [
    { id: 'opentopo', type: 'raster' as const, source: 'opentopo', minzoom: 0, maxzoom: 17 }
  ]
};


const basemapStyles: {[key: string]: any} = {
  'voyager': 'https://demotiles.maplibre.org/style.json',
  'voyager-dark': 'https://demotiles.maplibre.org/style.json',
  'osm': 'https://demotiles.maplibre.org/style.json',
  // imagery
  'satellite': satelliteStyle,
  // terrain
  'opentopo': openTopoMapStyle,
};

const basemapOptions = [
    { id: "voyager", label: "Voyager" },
    { id: "satellite", label: "Satélite" },
    { id: "osm", label: "OSM" },
    { id: "voyager-dark", label: "Voyager Escuro" }
];

const GeoEditor = () => {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<MapRef>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // Compose extra free basemap options without touching the original array block
  const extraBasemapOptions = [
    // removed: { id: 's2cloudless', label: 'Sentinel-2 Cloudless (Global)' },
    { id: 's2-hybrid', label: 'Sentinel-2 Híbrido (rótulos)' },
    // removed: { id: 'nasa-viirs', label: 'NASA VIIRS (Global, z≤9)' },
    // removed: { id: 'nasa-viirs-hybrid', label: 'NASA VIIRS Híbrido (z≤9)' },
    { id: 'opentopo', label: 'OpenTopoMap (Topográfico)' },
    // removed: { id: 'hillshade-hybrid', label: 'Hillshade + Rótulos' },
  ];
  const allBasemapOptions = [...basemapOptions, { id: 'opentopo', label: 'OpenTopoMap (Topográfico)' }];
  const [basemapId, setBasemapId] = useState(allBasemapOptions[0].id);
  const basemap = basemapStyles[basemapId];
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const [altitudeRelativeToTerrain, setAltitudeRelativeToTerrain] = useState(false);
  const [symbolSize, setSymbolSize] = useState(1);
  const [previewIds, setPreviewIds] = useState<Set<string>>(new Set());
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [savingOfflineProgress, setSavingOfflineProgress] = useState(0);
  
  // Offline tile helpers and action scoped to this component (has access to mapRef/toast)
  function lonLatToTile(lon: number, lat: number, z: number) {
    const n = Math.pow(2, z);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  function replaceTemplate(tpl: string, z: number, x: number, y: number) {
    const n = 1 << z;
    const ty = tpl.includes('{-y}') ? (n - 1 - y) : y;
    return tpl
      .replace('{z}', String(z))
      .replace('{x}', String(x))
      .replace('{y}', String(y))
      .replace('{-y}', String(ty));
  }

  async function estimateTileLimit(defaultLimit = 300) {
    try {
      const est = await (navigator as any).storage?.estimate?.();
      if (!est || !est.quota || est.usage == null) return defaultLimit;
      const free = Math.max(0, est.quota - est.usage);
      const budget = Math.min(30 * 1024 * 1024, free * 0.5);
      const perTile = 60 * 1024; // ~60KB
      return Math.max(50, Math.min(defaultLimit, Math.floor(budget / perTile)));
    } catch {
      return defaultLimit;
    }
  }

  const saveAreaOffline = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    try {
      setIsSavingOffline(true);
      setSavingOfflineProgress(0);

      const style: any = map.getStyle();
      const sources = style?.sources || {};
      const rasterSources = Object.entries(sources).filter(([, s]: any) => s?.type === 'raster' && Array.isArray(s.tiles) && s.tiles.length);
      if (rasterSources.length === 0) {
        toast({ title: 'Mapa base não suportado', description: 'Este mapa base não expõe tiles raster para salvar offline.', variant: 'destructive' });
        return;
      }

      const bounds = map.getBounds();
      const zNow = Math.round(map.getZoom());
      const zooms = [zNow - 1, zNow, zNow + 1].filter(z => z >= 0 && z <= 22);

      const urlSet = new Set<string>();
      for (const z of zooms) {
        const sw = lonLatToTile(bounds.getWest(), bounds.getSouth(), z);
        const ne = lonLatToTile(bounds.getEast(), bounds.getNorth(), z);
        const x0 = Math.min(sw.x, ne.x), x1 = Math.max(sw.x, ne.x);
        const y0 = Math.min(sw.y, ne.y), y1 = Math.max(sw.y, ne.y);
        for (const [, src] of rasterSources as any) {
          const tpl = src.tiles[0];
          for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
              urlSet.add(replaceTemplate(tpl, z, x, y));
            }
          }
        }
      }

      const limit = await estimateTileLimit(300);
      const urls = Array.from(urlSet).slice(0, limit);

      const concurrency = 8;
      let completed = 0;
      const fetchOne = async (u: string) => {
        try { await fetch(u, { mode: 'no-cors' }); } catch {}
        completed++;
        setSavingOfflineProgress(completed / urls.length);
      };
      const queue = urls.slice();
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length) { const next = queue.shift(); if (!next) break; await fetchOne(next); }
      });
      await Promise.all(workers);

      toast({ title: 'Área salva para offline', description: `Tiles baixados: ${completed}/${urls.length}` });
    } catch (e: any) {
      toast({ title: 'Falha ao salvar offline', description: e?.message ?? 'Verifique o armazenamento disponível.', variant: 'destructive' });
    } finally {
      setIsSavingOffline(false);
      setSavingOfflineProgress(0);
    }
  }, [toast]);
  
  const {
    points,
    selectedPoints,
    originalHeaders,
    history,
    canUndo,
    canRedo,
    undo,
    redo,
    resetHistory,
    updatePoint,
    updateSelectedPoints,
    togglePointSelection,
    clearSelection,
    selectAll,
    duplicateSelectedPoints,
    deleteSelectedPoints,
    isDrawing,
    setIsDrawing,
    drawnPolygon,
    setDrawnPolygon,
    selectionMode,
    setSelectionMode,
    finishPolygonSelection,
    translationLock,
    setTranslationLock,
    translateSelectedPoints,
    translationDelta,
    setTranslationValue,
    applyTranslation,
    cancelTranslation,
    schema,
    attributeQuery,
    setAttributeQuery,
    applyAttributeSelection,
    applyBatchSelection,
    rotationCenter,
    setRotationCenter,
    rotateSelectedPoints,
    applyRotation,
    selectionAddMode,
    setSelectionAddMode,
    reverseFlightPoints,
  } = useFlightData();

  const isTranslating = useRef(false);
  const dragStartCoords = useRef<{ lng: number; lat: number } | null>(null);
  const previousPointsLength = useRef(points.length);
  const previousSelectedPointsSize = useRef(selectedPoints.size);
  const isRotating = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleZoomToAll = useCallback(() => {
    if (points.length > 0 && mapRef.current) {
      const longitudes = points.map(p => p.lon);
      const latitudes = points.map(p => p.lat);
      mapRef.current.fitBounds(
        [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
        { padding: 60, duration: 1000 }
      );
    }
  }, [points]);

  const handleZoomToSelected = useCallback(() => {
    const selected = points.filter(p => selectedPoints.has(p.id));
    if (selected.length > 0 && mapRef.current) {
      const longitudes = selected.map(p => p.lon);
      const latitudes = selected.map(p => p.lat);
      mapRef.current.fitBounds(
        [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
        { padding: 60, duration: 1000 }
      );
    }
  }, [points, selectedPoints]);

  const handlePointClick = (pointId: string) => {
    togglePointSelection(pointId);
  };
  
  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    if (isTranslating.current) return;
    
    const map = mapRef.current?.getMap();
    if (!map) return;
    
    const style = map.getStyle();
    
    const availableLayers = [];
    if (style.layers?.some(layer => layer.id === 'points-3d-layer')) availableLayers.push('points-3d-layer');
    if (style.layers?.some(layer => layer.id === 'points-3d-selection-layer')) availableLayers.push('points-3d-selection-layer');
    if (style.layers?.some(layer => layer.id === 'points-rotated-symbol-layer')) availableLayers.push('points-rotated-symbol-layer');
    if (style.layers?.some(layer => layer.id === 'points-symbol-layer')) availableLayers.push('points-symbol-layer');
    if (style.layers?.some(layer => layer.id === 'altitude-extrusions')) availableLayers.push('altitude-extrusions');
    
    let features = [];
    if (availableLayers.length > 0) {
      features = map.queryRenderedFeatures(e.point, { layers: availableLayers }) || [];
    }
    
    const clickedPointFeature = features[0];

    if (selectionMode === 'single') {
        if (clickedPointFeature && clickedPointFeature.properties?.id) {
            handlePointClick(clickedPointFeature.properties.id.toString());
        } else {
            if (!selectionAddMode) {
                clearSelection();
            }
        }
    } else if (isDrawing) {
      setDrawnPolygon(prev => [...prev, {lng: e.lngLat.lng, lat: e.lngLat.lat}]);
    } else if (selectionMode === 'rotate' && !rotationCenter) {
      setRotationCenter({ lon: e.lngLat.lng, lat: e.lngLat.lat });
      toast({ title: 'Pivô de Rotação Definido', description: 'Agora clique e arraste para girar os pontos.' });
    }

  }, [isDrawing, setDrawnPolygon, selectionMode, clearSelection, togglePointSelection, rotationCenter, setRotationCenter, toast, handlePointClick, selectionAddMode]);


  const handleMapMouseDown = useCallback((e: MapLayerMouseEvent) => {
    if (selectionMode === 'translate' && selectedPoints.size > 0) {
      isTranslating.current = true;
      dragStartCoords.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      if(mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = 'move';
      e.preventDefault();
    } else if (selectionMode === 'rotate' && rotationCenter) {
      isRotating.current = true;
      if(mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = 'grabbing';
      e.preventDefault();
    }
  }, [selectionMode, selectedPoints.size, rotationCenter]);

  const handleMapMouseMove = useCallback((e: MapLayerMouseEvent) => {
    if (isTranslating.current && dragStartCoords.current && e.originalEvent) {
      let dLon = e.lngLat.lng - dragStartCoords.current.lng;
      let dLat = e.lngLat.lat - dragStartCoords.current.lat;
      let dAlt = -e.originalEvent.movementY * ALTITUDE_SENSITIVITY;

      if (translationLock.lat) dLat = 0;
      if (translationLock.lon) dLon = 0;
      if (translationLock.alt) dAlt = 0;

      translateSelectedPoints({ dLat, dLon, dAlt });
      dragStartCoords.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
    } else if (isRotating.current && rotationCenter && e.originalEvent) {
        const angle = e.originalEvent.movementX * ROTATION_SENSITIVITY;
        rotateSelectedPoints(angle);
    }
  }, [translateSelectedPoints, translationLock, isRotating, rotationCenter, rotateSelectedPoints]);
  
  const handleMapMouseUp = useCallback(() => {
    if (isTranslating.current) {
      isTranslating.current = false;
      dragStartCoords.current = null;
      if(mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = '';
    }
    if (isRotating.current) {
      isRotating.current = false;
      if(mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = '';
      applyRotation();
      toast({ title: 'Rotação Aplicada', description: 'As posições dos pontos foram atualizadas.' });
    }
  }, [applyRotation, toast]);

  const handleFinishPolygon = useCallback(() => {
    const newSelectedCount = finishPolygonSelection();
    toast({ title: 'Seleção por Polígono', description: `${newSelectedCount} pontos selecionados` });
  }, [finishPolygonSelection, toast]);

  const handleMapContextMenu = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    if (isDrawing) {
      handleFinishPolygon();
    }
  }, [isDrawing, handleFinishPolygon]);

  const handleApplyTranslation = () => {
    applyTranslation();
    toast({ title: 'Translação Aplicada', description: 'As posições dos pontos foram atualizadas.' });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
          if (isDrawing) {
            setSelectionMode('single');
          } else if (selectionMode === 'translate') {
            cancelTranslation();
          } else if (selectionMode === 'rotate') {
             setSelectionMode('single');
          }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        redo();
      }
      if (event.key === 'Delete' && selectedPoints.size > 0) {
        deleteSelectedPoints();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, undo, redo, selectedPoints, deleteSelectedPoints, setSelectionMode, selectionMode, cancelTranslation]);

  const handleImportRequest = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setIsImporting(true);
    }
    event.target.value = ''; 
  };
  
  const handleImportSubmit = async (mappings: { lat: string; lon: string; alt?: string }) => {
    if (!importFile) return;

    try {
      const { points: newPoints, headers, schema: newSchema } = await parseCsv(importFile, mappings);
      resetHistory({ 
        points: newPoints, 
        selectedPoints: new Set(), 
        originalHeaders: headers, 
        isDrawing: false, 
        drawnPolygon: [], 
        selectionMode: 'single',
        translationLock: { lat: false, lon: false, alt: false },
        translationDelta: { dLat: 0, dLon: 0, dAlt: 0 },
        pointsBeforeTranslate: null,
        schema: newSchema,
        attributeQuery: null,
        rotationCenter: null,
        pointsBeforeRotate: null,
        selectionAddMode: false,
      });
      toast({ title: 'Importação Bem-sucedida', description: `${newPoints.length} pontos carregados` });
      setIsImporting(false);
      setImportFile(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Importação', description: error.message });
    }
  };

  const handleExport = () => {
    if (points.length === 0) {
      toast({ variant: 'destructive', title: 'Exportar falhou', description: 'Não há pontos para exportar.' });
      return;
    }
    try {
      const csvString = generateCsv(points, originalHeaders);
      downloadCsv(csvString, 'pontos_editados.csv');
      toast({ title: 'Exportação Bem-sucedida', description: `${points.length} pontos exportados.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro na Exportação', description: error.message });
    }
  };
  
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleToggleTerrain = () => {
    setTerrainEnabled(prev => !prev);
    if (!terrainEnabled) {
      setAltitudeRelativeToTerrain(false);
    }
  };

  const handleToggleAltitudeRelativeToTerrain = () => {
    setAltitudeRelativeToTerrain(prev => !prev);
  };

  const handleToggleViewMode = () => {
    setViewMode(prev => {
        if (prev === 'side-by-side') return 'map-only';
        if (prev === 'map-only') return 'attributes-only';
        return 'side-by-side';
    });
  };

  const mapPanel = (
    <div className="w-full h-full relative">
      <MapPanel
        mapRef={mapRef}
        points={points}
        selectedPointIds={selectedPoints}
        previewPointIds={previewIds}
        onPointClick={handlePointClick}
        isDrawing={isDrawing}
        drawnPolygon={drawnPolygon}
        onMapClick={handleMapClick}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseUp}
        onTouchStart={handleMapMouseDown}
        onTouchMove={handleMapMouseMove}
        onTouchEnd={handleMapMouseUp}
        onContextMenu={handleMapContextMenu}
        selectionMode={selectionMode}
        basemap={basemap}
        rotationCenter={rotationCenter}
        terrainEnabled={terrainEnabled}
        altitudeRelativeToTerrain={altitudeRelativeToTerrain}
        symbolSize={symbolSize}
      />
      {isDrawing && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm z-10 shadow-lg flex flex-col items-center gap-2">
            <div>
              <p>Desenhando polígono...</p>
              <p className="text-xs">Toque no mapa para adicionar pontos.</p>
            </div>
            <button
              onClick={handleFinishPolygon}
              className="mt-2 bg-primary-foreground text-primary font-bold py-1 px-3 rounded-md text-sm"
            >
              Finalizar Desenho
            </button>
          </div>
      )}
       {selectionMode === 'rotate' && !rotationCenter && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm z-10 shadow-lg">
          Toque no mapa para definir o centro da rotação.
        </div>
      )}
    </div>
  );

  const attributesPanel = (
    <div className="w-full h-full overflow-hidden">
        <AttributePanel
          points={points}
          originalHeaders={originalHeaders}
          selectedPoints={Array.from(selectedPoints)}
          onUpdatePoint={(id, newAttrs) => { updatePoint(id, newAttrs); }}
          onUpdateSelectedPoints={(newAttrs) => { updateSelectedPoints(newAttrs); }}
          onTogglePointSelection={togglePointSelection}
          selectionMode={selectionMode}
          setPreviewIds={setPreviewIds}
          onApplyBatchSelection={(ids) => { 
            console.log('GeoEditor - applyBatchSelection called with ids:', Array.from(ids));
            applyBatchSelection(ids); 
          }}
          onToolFinish={setSelectionMode}
          translationLock={translationLock}
          onTranslationLockChange={setTranslationLock}
          translationDelta={translationDelta}
          onApplyTranslation={handleApplyTranslation}
          onSetTranslationValue={setTranslationValue}
          schema={schema}
          onAttributeQueryChange={setAttributeQuery}
          onApplyAttributeQuery={applyAttributeSelection}
        />
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'map-only':
        return mapPanel;
      case 'attributes-only':
        return attributesPanel;
      default: // 'side-by-side'
        return (
          <ResizablePanelGroup direction="horizontal" className="w-full h-[calc(100vh-3rem)]">
            <ResizablePanel defaultSize={65} minSize={30}>{mapPanel}</ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full">
                {attributesPanel}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        );
    }
  };

  const handleDuplicate = () => { duplicateSelectedPoints(); }
  const handleDelete = () => { deleteSelectedPoints(); }
  const handleClearSelection = () => { clearSelection(); }
  const handleReversePoints = () => { 
    reverseFlightPoints(); 
    toast({ title: 'Ordem Invertida', description: 'A ordem dos pontos foi invertida com sucesso.' });
  };

  useEffect(() => {
    const justImported = points.length > 0 && previousPointsLength.current === 0;

    if (justImported) {
      setTimeout(() => handleZoomToAll(), 100);
    } else if (selectedPoints.size > 0 && selectedPoints.size !== previousSelectedPointsSize.current) {
        const is3DView = terrainEnabled && altitudeRelativeToTerrain;
        if (!isDrawing && selectionMode !== 'translate' && !isTranslating.current && !is3DView) {
            handleZoomToSelected();
        }
    }

    previousPointsLength.current = points.length;
    previousSelectedPointsSize.current = selectedPoints.size;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selectedPoints]);


  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {mounted && (
      <Toolbar
        onImportRequest={handleImportRequest}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        selectionMode={selectionMode}
        setSelectionMode={setSelectionMode}
        onClearSelection={handleClearSelection}
        isDrawing={isDrawing}
        hasData={points.length > 0}
        onZoomToSelected={handleZoomToSelected}
        hasSelection={selectedPoints.size > 0}
        onZoomAll={handleZoomToAll}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        terrainEnabled={terrainEnabled}
        onToggleTerrain={handleToggleTerrain}
        altitudeRelativeToTerrain={altitudeRelativeToTerrain}
        onToggleAltitudeRelativeToTerrain={handleToggleAltitudeRelativeToTerrain}
        symbolSize={symbolSize}
        onSymbolSizeChange={setSymbolSize}
        basemap={basemapId}
        onBasemapChange={setBasemapId}
        basemapOptions={allBasemapOptions}
        selectedPoints={selectedPoints}
        selectionAddMode={selectionAddMode}
        setSelectionAddMode={setSelectionAddMode}
        onSaveAreaOffline={saveAreaOffline}
        isSavingOffline={isSavingOffline}
        savingOfflineProgress={savingOfflineProgress}
        onReversePoints={handleReversePoints}
      />)}
      <div className="flex-1 relative h-[calc(100vh-3rem)]">
        {renderContent()}
      </div>

      {importFile && (
        <ImportDialog
          file={importFile}
          isOpen={isImporting}
          onClose={() => {
            setIsImporting(false);
            setImportFile(null);
          }}
          onSubmit={handleImportSubmit}
        />
      )}

      <HelpDialog isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
};

export default GeoEditor;
