
"use client";
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Save, X, ArrowRight, Lock, Unlock, Check as CheckIcon, ClipboardEdit } from 'lucide-react';
import { FeaturePoint, SelectionMode, PointAttributeValue } from '@/lib/types';

const AttributesPanel = ({ 
  points,
  originalHeaders,
  selectedPoints, 
  onUpdatePoint,
  onUpdateSelectedPoints,
  onTogglePointSelection,
  selectionMode,
  translationLock,
  onTranslationLockChange,
  translationDelta,
  onApplyTranslation,
  onSetTranslationValue,
}: {
  points: FeaturePoint[],
  originalHeaders: string[],
  selectedPoints: string[], 
  onUpdatePoint: (id: string, newAttrs: Partial<FeaturePoint>) => void,
  onUpdateSelectedPoints: (newAttrs: Partial<Omit<FeaturePoint, 'id'>>) => void,
  onTogglePointSelection: (id: string) => void,
  selectionMode: SelectionMode,
  translationLock: { lat: boolean; lon: boolean; alt: boolean },
  onTranslationLockChange: (axis: 'lat' | 'lon' | 'alt', locked: boolean) => void,
  translationDelta: { dLat: number; dLon: number; dAlt: number };
  onApplyTranslation: () => void;
  onSetTranslationValue: (axis: 'dLat' | 'dLon' | 'dAlt', value: number) => void;
}) => {
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FeaturePoint>>({});
  const [batchEditValues, setBatchEditValues] = useState<Record<string, any>>({});

  const selectedPointsData = points.filter(p => selectedPoints.includes(p.id));
  
  const hasAltitude = useMemo(() => {
    return points.some(p => p.alt !== null && p.alt !== undefined);
  }, [points]);

  const handleEdit = (point: FeaturePoint) => {
    setEditingPoint(point.id);
    const { attributes, ...rest } = point;
    setEditValues({ ...attributes, ...rest });
  };

  const handleSave = () => {
    if (editingPoint && editValues) {
      onUpdatePoint(editingPoint, editValues);
      setEditingPoint(null);
      setEditValues({});
    }
  };

  const handleCancel = () => {
    setEditingPoint(null);
    setEditValues({});
  };

  const handleInputChange = (field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [field]: field === 'lat' || field === 'lon' || field === 'alt' ? parseFloat(value) || 0 : value
    }));
  };
  
  const handleAttributeChange = (field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      attributes: {
        ...(prev.attributes as Record<string, any>),
        [field]: value,
      },
    }));
  };
  
  const handleBatchInputChange = (field: string, value: string) => {
    setBatchEditValues(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyBatchUpdate = () => {
    const updates: Partial<Omit<FeaturePoint, 'id'>> = {};
    const attributeUpdates: Record<string, PointAttributeValue> = {};

    for (const key in batchEditValues) {
        const value = batchEditValues[key];
        if (value === '' || value === undefined) continue;

        if (key === 'lat' || key === 'lon' || key === 'alt') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                (updates as any)[key] = numValue;
            }
        } else {
            attributeUpdates[key] = value;
        }
    }
    
    if (Object.keys(attributeUpdates).length > 0) {
        updates.attributes = attributeUpdates;
    }

    if (Object.keys(updates).length > 0) {
        onUpdateSelectedPoints(updates);
        setBatchEditValues({});
    }
  };

  if (selectedPointsData.length === 0) {
    return (
      <div className="attributes-panel p-4 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Nenhum ponto selecionado</p>
          <p className="text-sm mt-2">
            Clique em um ponto no mapa ou use as ferramentas de seleção
          </p>
        </div>
      </div>
    );
  }

  if (selectedPointsData.length === 1 && selectionMode === 'single') {
    const point = selectedPointsData[0];
    const isEditing = editingPoint === point.id;
    const currentValues: Record<string, any> = isEditing ? editValues : { ...point, ...point.attributes };

    const coreProperties = ['lat', 'lon', 'alt'];

    return (
      <div className="attributes-panel p-4 h-full">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Propriedades do Ponto
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(point)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="point-id">ID</Label>
                  <Input
                    id="point-id"
                    value={point.id}
                    disabled
                    className="mt-1"
                  />
                </div>

                {coreProperties.map(property => {
                  if (property === 'alt' && !hasAltitude) return null;
                  return (
                    <div key={property}>
                      <Label htmlFor={`point-${property}`}>
                        {property.charAt(0).toUpperCase() + property.slice(1)}
                      </Label>
                      <Input
                        id={`point-${property}`}
                        value={currentValues[property] ?? ''}
                        onChange={(e) => handleInputChange(property, e.target.value)}
                        disabled={!isEditing}
                        type={'number'}
                        step={'any'}
                        className="mt-1"
                      />
                    </div>
                  )
                })}
                {Object.keys(point.attributes).map(attr => (
                   <div key={attr}>
                   <Label htmlFor={`point-attr-${attr}`}>
                     {attr.charAt(0).toUpperCase() + attr.slice(1)}
                   </Label>
                   <Input
                     id={`point-attr-${attr}`}
                     value={currentValues[attr] ?? ''}
                     onChange={(e) => handleAttributeChange(attr, e.target.value)}
                     disabled={!isEditing}
                     type="text"
                     className="mt-1"
                   />
                 </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderMultiSelectContent = () => {
    if (selectionMode === 'translate') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Arraste no mapa para mover ou insira os deltas. Trave um eixo (Lat/Lon) para que o arrasto no outro eixo altere a altitude. Clique em "Aplicar" para salvar.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="lock-lat" checked={translationLock.lat} onCheckedChange={(checked) => onTranslationLockChange('lat', !!checked)} />
              <Label htmlFor="lock-lat" className="flex items-center gap-2 flex-1">
                {translationLock.lat ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                Ativar Latitude
              </Label>
              <Input 
                  value={translationDelta.dLat.toFixed(6)}
                  onChange={(e) => onSetTranslationValue('dLat', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="any"
                  className="w-28 h-8 text-xs" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="lock-lon" checked={translationLock.lon} onCheckedChange={(checked) => onTranslationLockChange('lon', !!checked)} />
              <Label htmlFor="lock-lon" className="flex items-center gap-2 flex-1">
                {translationLock.lon ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                Ativar Longitude
              </Label>
              <Input 
                  value={translationDelta.dLon.toFixed(6)} 
                  onChange={(e) => onSetTranslationValue('dLon', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="any"
                  className="w-28 h-8 text-xs" />
            </div>
            {hasAltitude && (
              <div className="flex items-center space-x-2">
                <Checkbox id="lock-alt" checked={translationLock.alt} onCheckedChange={(checked) => onTranslationLockChange('alt', !!checked)} />
                <Label htmlFor="lock-alt" className="flex items-center gap-2 flex-1">
                  {translationLock.alt ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  Ativar Altitude
                </Label>
                <Input 
                  value={translationDelta.dAlt.toFixed(6)} 
                  onChange={(e) => onSetTranslationValue('dAlt', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="any"
                  className="w-28 h-8 text-xs" />
              </div>
            )}
          </div>
          <Button onClick={onApplyTranslation} className="w-full">
            <CheckIcon className="w-4 h-4 mr-2"/>
            Aplicar Translação
          </Button>
        </div>
      );
    }
    
    if (selectionMode === 'batch-edit' || selectionMode === 'all') {
      const allOriginalAttributes = originalHeaders.filter(h => !['lat', 'lon', 'alt'].some(coord => new RegExp(`^${coord}$`, 'i').test(h)));
      const firstSelectedPoint = selectedPointsData[0];

      const getPlaceholder = (field: string) => {
        let exampleValue: any;
        if (field === 'lat') exampleValue = firstSelectedPoint.lat;
        else if (field === 'lon') exampleValue = firstSelectedPoint.lon;
        else if (field === 'alt') exampleValue = firstSelectedPoint.alt;
        else exampleValue = firstSelectedPoint.attributes[field];
        
        const valueStr = (exampleValue !== null && exampleValue !== undefined) ? String(exampleValue) : '';
        return `Manter valor original (${valueStr})`;
      }

      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <ClipboardEdit className="w-4 h-4" />
            Edite os campos abaixo para atualizar todos os pontos selecionados. Deixe em branco para não alterar.
          </p>
          <div>
              <Label htmlFor="batch-lat">Latitude</Label>
              <Input
                  id="batch-lat"
                  type="number"
                  step="any"
                  placeholder={getPlaceholder('lat')}
                  value={batchEditValues.lat ?? ''}
                  onChange={(e) => handleBatchInputChange('lat', e.target.value)}
                  className="mt-1"
              />
          </div>
          <div>
              <Label htmlFor="batch-lon">Longitude</Label>
              <Input
                  id="batch-lon"
                  type="number"
                  step="any"
                  placeholder={getPlaceholder('lon')}
                  value={batchEditValues.lon ?? ''}
                  onChange={(e) => handleBatchInputChange('lon', e.target.value)}
                  className="mt-1"
              />
          </div>
          {hasAltitude && (
            <div>
                <Label htmlFor="batch-alt">Altitude</Label>
                <Input
                    id="batch-alt"
                    type="number"
                    step="any"
                    placeholder={getPlaceholder('alt')}
                    value={batchEditValues.alt ?? ''}
                    onChange={(e) => handleBatchInputChange('alt', e.target.value)}
                    className="mt-1"
                />
            </div>
          )}
          <hr className="my-2" />
          {allOriginalAttributes.map(attr => (
            <div key={attr}>
              <Label htmlFor={`batch-attr-${attr}`}>{attr}</Label>
              <Input
                id={`batch-attr-${attr}`}
                type="text"
                placeholder={getPlaceholder(attr)}
                value={batchEditValues[attr] ?? ''}
                onChange={(e) => handleBatchInputChange(attr, e.target.value)}
                className="mt-1"
              />
            </div>
          ))}

          <Button onClick={handleApplyBatchUpdate} className="w-full">
              Aplicar
              <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="attributes-panel p-4 h-full">
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                    {selectedPointsData.length} Pontos Selecionados
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  {renderMultiSelectContent()}
                </div>
                
                <hr className="my-4"/>

                <p className="text-sm font-medium mb-2">Pontos selecionados:</p>
                <ScrollArea className="h-[calc(100vh-26rem)]">
                    <div className="space-y-2">
                        {selectedPointsData.map(point => (
                            <div
                                key={point.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-xs"
                                onClick={() => onTogglePointSelection(point.id)}
                            >
                                <div className="font-medium truncate">ID: {point.id}</div>
                                <div className="text-gray-600">
                                  Lat: {point.lat.toFixed(6)}, Lon: {point.lon.toFixed(6)}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );
};

export default AttributesPanel;
