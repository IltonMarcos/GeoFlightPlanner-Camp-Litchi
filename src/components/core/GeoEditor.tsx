
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { useToast } from '../../hooks/use-toast';
import MapPanel from './MapPanel';
import dynamic from 'next/dynamic';
const Toolbar = dynamic(() => import('./Toolbar'), { ssr: false });
import AttributePanel from '../AttributePanel';
import ImportDialog from '../ImportDialog';
import HelpDialog from '../HelpDialog';
import { useFlightData } from '../../hooks/useFlightData';
import { parseCsv, generateCsv } from '../../lib/csv-helpers';
import { downloadCsv } from '../../lib/utils';
import { ViewMode, FeaturePoint } from '@/lib/types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const ALTITUDE_SENSITIVITY = 0.5; // Adjust this value to control altitude change speed

// Basemap options via IDs mapped in MapPanel/MapComponent
const basemapOptions = [
  { id: 'voyager', label: 'Voyager' },
  { id: 'osm', label: 'OSM' },
  { id: 'dark-voyager', label: 'Voyager Escuro' },
  // Terrain
  { id: 'opentopo', label: 'OpenTopoMap (Topográfico)' },
];

const GeoEditor = () => {
  const { toast } = useToast();
  const mapRef = useRef<MapRef>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [basemap, setBasemap] = useState(basemapOptions[0].id);
  
  const {
    points,
    selectedPoints,
    originalHeaders,
    canUndo,
    canRedo,
    undo,
    redo,
    resetHistory,
    updatePoint,
    updateSelectedPoints,
    togglePointSelection,
    clearSelection,
    selectionMode,
    setSelectionMode,
    drawnPolygon,
    isDrawing,
    setDrawnPolygon,
    finishPolygonSelection,
    duplicateSelectedPoints,
    deleteSelectedPoints,
    translationLock,
    setTranslationLock,
    translationDelta,
    setTranslationValue,
    translateSelectedPoints,
    applyTranslation,
    cancelTranslation,
    selectAll
  } = useFlightData();

  const isTranslating = useRef(false);
  const dragStartCoords = useRef<{ lng: number; lat: number } | null>(null);
  const previousPointsLength = useRef(points.length);
  const previousSelectedPointsSize = useRef(selectedPoints.size);

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

const handlePointClick = useCallback((pointId: string, e?: MapLayerMouseEvent) => {
  console.log('Point clicked:', pointId, 'Selection mode:', selectionMode);
  if (e) {
    // Prevent the click from triggering the map click handler
    e.originalEvent.stopPropagation();
  }
  // Only toggle selection if we're not in drawing mode
  if (!isDrawing) {
    console.log('Toggling selection for point:', pointId);
    togglePointSelection(pointId);
  }
}, [isDrawing, togglePointSelection]);  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    console.log('Map clicked. Selection mode:', selectionMode, 'Is translating:', isTranslating.current);
    if (isTranslating.current) {
      console.log('Ignoring click because translation is in progress');
      return;
    }

    // Handle clicks on the points layer separately (this will be caught by the layer click event)
    if (e.features && e.features.length > 0) {
      return;
    }

    // Handle clicks on empty areas
    if (selectionMode === 'single' && selectedPoints.size > 0) {
      console.log('Clearing selection because clicked outside point');
      clearSelection();
    }

    // Handle polygon drawing
    if (isDrawing) {
      console.log('Adding point to drawn polygon');
      setDrawnPolygon((prev: Array<{lng: number, lat: number}>) => [...prev, {lng: e.lngLat.lng, lat: e.lngLat.lat}]);
    }
  }, [isDrawing, setDrawnPolygon, isTranslating, selectionMode, selectedPoints.size, clearSelection]);


  const handleMapMouseDown = useCallback((e: MapLayerMouseEvent) => {
    if (selectionMode === 'translate' && selectedPoints.size > 0) {
      isTranslating.current = true;
      dragStartCoords.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      if(mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = 'move';
      e.preventDefault();
    }
  }, [selectionMode, selectedPoints.size]);

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
    }
  }, [translateSelectedPoints, translationLock]);
  
  const handleMapMouseUp = useCallback(() => {
    if (isTranslating.current) {
      isTranslating.current = false;
      dragStartCoords.current = null;
      if(mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = '';
    }
  }, []);

  const handleFinishPolygon = useCallback(() => {
    const newSelectedCount = finishPolygonSelection();
    toast({
      title: 'Seleção por Polígono',
      description: `${newSelectedCount} pontos selecionados`
    });
  }, [finishPolygonSelection, toast]);

  const handleMapContextMenu = useCallback((e: MapLayerMouseEvent) => {
    e.preventDefault();
    if (isDrawing) {
      handleFinishPolygon();
    }
  }, [isDrawing, handleFinishPolygon]);

  const handleApplyTranslation = () => {
    applyTranslation();
    toast({
      title: 'Translação Aplicada',
      description: 'As posições dos pontos foram atualizadas.'
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
          if (isDrawing) {
            setSelectionMode('single');
          } else if (selectionMode === 'translate') {
            cancelTranslation();
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
  }, [isDrawing, undo, redo, selectedPoints, deleteSelectedPoints, setSelectionMode, selectionMode, cancelTranslation, handleZoomToAll]);

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
      const { points: newPoints, headers } = await parseCsv(importFile, mappings);
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
      });
      toast({
        title: 'Importação Bem-sucedida',
        description: `${newPoints.length} pontos carregados`
      });
      setIsImporting(false);
      setImportFile(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: error.message
      });
    }
  };

  const handleExport = () => {
    if (points.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Exportar falhou',
        description: 'Não há pontos para exportar.',
      });
      return;
    }
    try {
      const csvString = generateCsv(points, originalHeaders);
      downloadCsv(csvString, 'pontos_editados.csv');
      toast({
        title: 'Exportação Bem-sucedida',
        description: `${points.length} pontos exportados.`
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Exportação',
        description: error.message
      });
    }
  };
  
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

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
    </div>
  );

  const attributesPanel = (
    <AttributePanel
      points={points}
      originalHeaders={originalHeaders}
      selectedPoints={Array.from(selectedPoints)}
      onUpdatePoint={(id, newAttrs) => {
        updatePoint(id, newAttrs);
      }}
      onUpdateSelectedPoints={(newAttrs) => {
        updateSelectedPoints(newAttrs);
      }}
      onTogglePointSelection={togglePointSelection}
      selectionMode={selectionMode}
      translationLock={translationLock}
      onTranslationLockChange={setTranslationLock}
      translationDelta={translationDelta}
      onApplyTranslation={handleApplyTranslation}
      onSetTranslationValue={setTranslationValue}
    />
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'map-only':
        return mapPanel;
      case 'attributes-only':
        return <div className="w-full h-full overflow-y-auto">{attributesPanel}</div>;
      default: // 'side-by-side'
        return (
          <ResizablePanelGroup direction="horizontal" className="w-full h-full">
            <ResizablePanel defaultSize={65}>{mapPanel}</ResizablePanel>
            <ResizableHandle withHandle className="my-handle" />
            <ResizablePanel defaultSize={35}>
              <div className="w-full h-full overflow-y-auto">{attributesPanel}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        );
    }
  };

  const handleDuplicate = () => {
    duplicateSelectedPoints();
  }

  const handleDelete = () => {
    deleteSelectedPoints();
  }
  
  const handleClearSelection = () => {
    clearSelection();
  };

  useEffect(() => {
    const justImported = points.length > 0 && previousPointsLength.current === 0;
    const selectionJustCleared = selectedPoints.size === 0 && previousSelectedPointsSize.current > 0;

    if (justImported) {
      setTimeout(() => handleZoomToAll(), 100);
    } else if (selectionJustCleared) {
      // When selection is cleared, zoom to all current points
      setTimeout(() => handleZoomToAll(), 100);
    } else if (selectedPoints.size > 0 && selectedPoints.size !== previousSelectedPointsSize.current) {
        if (!isDrawing && selectionMode !== 'translate' && !isTranslating.current) {
            handleZoomToSelected();
        }
    }

    previousPointsLength.current = points.length;
    previousSelectedPointsSize.current = selectedPoints.size;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selectedPoints]);


  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        onSelectAll={selectAll}
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
        basemap={basemap}
        onBasemapChange={setBasemap}
        basemapOptions={basemapOptions}
        onHelp={() => setIsHelpOpen(true)}
      />)}
      <div className="flex-1 relative">
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
