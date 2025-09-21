
"use client";

import type { FC, ChangeEvent, useEffect } from 'react';
import { Upload, Download, DownloadCloud, Undo2, Redo, Square, Maximize, ZoomInIcon, ZoomOutIcon, Copy, Trash2, Rows, Columns, PanelRight, MoveIcon, Eraser, ClipboardEdit, Layers, MousePointer, Filter, RotateCw, Mountain, ArrowDownUp } from 'lucide-react';
import { SwitchVerticalIcon } from './icons/SwitchVerticalIcon';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { SelectionMode, ViewMode } from '@/lib/types';

interface ToolbarProps {
  onImportRequest: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  onClearSelection: () => void;
  isDrawing: boolean;
  hasData: boolean;
  onZoomToSelected: () => void;
  hasSelection: boolean;
  onZoomAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  terrainEnabled: boolean;
  onToggleTerrain: () => void;
  altitudeRelativeToTerrain: boolean;
  onToggleAltitudeRelativeToTerrain: () => void;
  symbolSize: number;
  onSymbolSizeChange: (size: number) => void;
  basemap: string;
  onBasemapChange: (basemap: string) => void;
  basemapOptions: { id: string; label: string }[];
  selectedPoints: Set<string>;
  // New props for selection modes
  selectionAddMode: boolean;
  setSelectionAddMode: (mode: boolean) => void;
  // Offline saving
  onSaveAreaOffline: () => void;
  isSavingOffline?: boolean;
  savingOfflineProgress?: number; // 0..1
  onReversePoints: () => void;
}

export const Toolbar: FC<ToolbarProps> = ({
  onImportRequest,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectionMode,
  setSelectionMode,
  onClearSelection,
  isDrawing,
  hasData,
  onZoomToSelected,
  hasSelection,
  onZoomAll,
  onZoomIn,
  onZoomOut,
  onDuplicate,
  onDelete,
  viewMode,
  onToggleViewMode,
  terrainEnabled,
  onToggleTerrain,
  altitudeRelativeToTerrain,
  onToggleAltitudeRelativeToTerrain,
  symbolSize,
  onSymbolSizeChange,
  basemap,
  onBasemapChange,
  basemapOptions,
  selectedPoints,
  // New props for selection modes
  selectionAddMode,
  setSelectionAddMode,
  onSaveAreaOffline,
  isSavingOffline,
  savingOfflineProgress,
  onReversePoints
}) => {
  
  const handleSelectionModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
  };

  return (
    <TooltipProvider>
      <header className="flex items-center gap-1 h-12 border-b bg-card px-2 shrink-0 overflow-x-auto whitespace-nowrap flex-nowrap">
        <h1 className="text-md md:text-lg font-bold font-headline text-primary mr-1 md:mr-2">GeoFlightPlannerCamp</h1>
        
        {/* Import/Export */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" asChild className="h-8 w-8">
                <label htmlFor="csv-upload">
                  <Upload className="h-4 w-4" />
                </label>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Importar CSV</p></TooltipContent>
          </Tooltip>
          <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={onImportRequest} />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onExport} disabled={!hasData} className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Exportar CSV</p></TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="h-8 w-8">
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Desfazer</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="h-8 w-8">
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Refazer</p></TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-6" />

        {/* Zoom Tools */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={!hasData} className="h-8 w-8"><ZoomInIcon className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Ferramentas de Visualização</p></TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onZoomIn} disabled={!hasData}>
              <ZoomInIcon className="mr-2 h-4 w-4"/> Aproximar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onZoomOut} disabled={!hasData}>
              <ZoomOutIcon className="mr-2 h-4 w-4"/> Afastar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onZoomAll} disabled={!hasData}>
              <Maximize className="mr-2 h-4 w-4"/> Zoom em Tudo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onZoomToSelected} disabled={!hasSelection}>
              <ZoomInIcon className="mr-2 h-4 w-4"/> Zoom na Seleção
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />
        
        {/* Selection Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={selectionMode === 'single' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleSelectionModeChange('single')} disabled={!hasData} className="h-8 w-8">
                <MousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Seleção Individual</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={selectionMode === 'polygon' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleSelectionModeChange('polygon')} disabled={!hasData} className="h-8 w-8">
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Selecionar com Polígono</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={selectionMode === 'attribute' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleSelectionModeChange('attribute')} disabled={!hasData} className="h-8 w-8">
                <Filter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Seleção por Atributos</p></TooltipContent>
          </Tooltip>
          
          {/* Selection Mode Buttons */}
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={selectionAddMode ? 'secondary' : 'outline'} 
                size="icon" 
                onClick={() => {
                  // Toggle add mode
                  setSelectionAddMode(!selectionAddMode);
                }} 
                disabled={!hasSelection} 
                className="h-8 w-8"
              >
                <span className="font-bold text-sm">+</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Modo Adição (Seleções Cumulativas)</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onClearSelection} disabled={!hasSelection || isDrawing} className="h-8 w-8">
                  <Eraser className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{isDrawing ? "Finalizar Desenho" : "Limpar Seleção"}</p></TooltipContent>
          </Tooltip>
        </div>


        <Separator orientation="vertical" className="h-6" />
        
        {/* Editing Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onDuplicate} disabled={!hasSelection} className="h-8 w-8">
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Duplicar</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={selectionMode === 'translate' ? 'secondary' : 'outline'} size="icon" onClick={() => handleSelectionModeChange('translate')} disabled={!hasSelection} className="h-8 w-8">
                <MoveIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Mover Seleção</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={selectionMode === 'rotate' ? 'secondary' : 'outline'} size="icon" onClick={() => handleSelectionModeChange('rotate')} disabled={selectedPoints.size < 2} className="h-8 w-8">
                    <RotateCw className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Rotacionar Seleção</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={selectionMode === 'batch-edit' ? 'secondary' : 'outline'} size="icon" onClick={() => handleSelectionModeChange('batch-edit')} disabled={!hasSelection} className="h-8 w-8">
                <ClipboardEdit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Editar Atributos</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onDelete} disabled={!hasSelection} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Excluir</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onReversePoints} disabled={!hasData} className="h-8 w-8">
                <SwitchVerticalIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Inverter Ordem dos Pontos</p></TooltipContent>
          </Tooltip>
        </div>
        
        <div className="flex-1" />

        {/* 3D Tools */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={terrainEnabled ? 'secondary' : 'outline'} size="icon" onClick={onToggleTerrain} className="h-8 w-8">
                <Mountain className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Ativar/Desativar Terreno 3D</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={altitudeRelativeToTerrain ? 'secondary' : 'outline'} size="icon" onClick={onToggleAltitudeRelativeToTerrain} disabled={!terrainEnabled} className="h-8 w-8">
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Altitude Relativa ao Terreno</p></TooltipContent>
          </Tooltip>
          <Input
            type="number"
            value={symbolSize}
            onChange={(e) => onSymbolSizeChange(parseFloat(e.target.value) || 0)}
            disabled={!altitudeRelativeToTerrain}
            className="h-8 w-20 text-xs"
            placeholder="Tamanho"
          />
        </div>
        
        {/* Offline cache current view */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onSaveAreaOffline} disabled={isSavingOffline} className="h-8 w-8">
              <DownloadCloud className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isSavingOffline ? `Salvando (${Math.round((savingOfflineProgress ?? 0)*100)}%)` : 'Salvar área para offline'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Basemap switcher */}
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8"><Layers className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Trocar Mapa Base</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
                <DropdownMenuLabel>Mapas Base</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={basemap} onValueChange={onBasemapChange}>
                    {basemapOptions.map(option => (
                        <DropdownMenuRadioItem key={option.id} value={option.id}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>

        {/* View Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleViewMode} className="h-8 w-8">
              {viewMode === 'side-by-side' ? <Columns className="h-4 w-4" /> : viewMode === 'map-only' ? <PanelRight className="h-4 w-4" /> : <Rows className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{viewMode === 'side-by-side' ? "Mostrar só o Mapa" : viewMode === 'map-only' ? "Mostrar só Atributos" : "Mostrar Ambos"}</p></TooltipContent>
        </Tooltip>
      </header>
    </TooltipProvider>
  );
};

export default Toolbar;
