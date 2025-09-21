'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Edit, Save, X, ArrowRight, Lock, Unlock, Check as CheckIcon, ClipboardEdit, Filter } from 'lucide-react';
import type { FeaturePoint, SelectionMode, PointAttributeValue, DatasetSchema, AttributeQuery, SchemaField } from '../lib/types';
import { useFlightData } from '../hooks/useFlightData';
import { useHistory } from '../hooks/useHistory';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Slider } from './ui/slider';

const AttributeSelectorPanel = ({ schema, onQueryChange, onApply, onClear, onToolFinish }: {
  schema: DatasetSchema,
  onQueryChange: (query: AttributeQuery | null) => void,
  onApply: () => void,
  onClear: () => void,
  onToolFinish: (mode: SelectionMode) => void,
}) => {
    const [selectedField, setSelectedField] = useState<SchemaField | null>(null);
    const [operator, setOperator] = useState<AttributeQuery['operator']>('eq');
    const [value, setValue] = useState<any>('');
    const [minValue, setMinValue] = useState<any>('');
    const [maxValue, setMaxValue] = useState<any>('');
    const [selectedValues, setSelectedValues] = useState<Set<any>>(new Set());

    useEffect(() => {
        if (!selectedField) {
            onQueryChange(null);
            return;
        }

        let query: AttributeQuery | null = null;
        if (selectedField.type === 'number') {
            if (operator === 'between') {
                query = { field: selectedField.name, operator, min: parseFloat(minValue), max: parseFloat(maxValue) };
            } else {
                 query = { field: selectedField.name, operator, value: parseFloat(value) };
            }
        } else if (selectedField.type === 'string') {
            if (operator === 'in') {
                query = { field: selectedField.name, operator, values: Array.from(selectedValues) };
            } else {
                query = { field: selectedField.name, operator, value: value };
            }
        }
        onQueryChange(query);

    }, [selectedField, operator, value, minValue, maxValue, selectedValues, onQueryChange]);


    const handleFieldChange = (fieldName: string) => {
        const field = schema.fields.find(f => f.name === fieldName) || null;
        setSelectedField(field);
        setValue('');
        setMinValue(field?.stats.min ?? '');
        setMaxValue(field?.stats.max ?? '');
        setSelectedValues(new Set());
        setOperator(field?.type === 'number' ? 'between' : 'in');
    };

    const handleStringValueToggle = (val: string) => {
        setSelectedValues(prev => {
            const newSet = new Set(prev);
            if (newSet.has(val)) {
                newSet.delete(val);
            } else {
                newSet.add(val);
            }
            return newSet;
        })
    }

    const isApplyDisabled = () => {
        if (!selectedField) return true;
        if (selectedField.type === 'number') {
            if (operator === 'between') return isNaN(parseFloat(minValue)) || isNaN(parseFloat(maxValue));
            return isNaN(parseFloat(value));
        }
        if (selectedField.type === 'string') {
            if (operator === 'in') {
                return selectedValues.size === 0;
            }
            return value === '';
        }
        return true;
    };

    const handleApply = () => {
        // Apply attribute filter selection only; the hook will set the proper selectionMode
        onApply();
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="attr-select-field">Campo</Label>
                <Select onValueChange={handleFieldChange}>
                    <SelectTrigger id="attr-select-field">
                        <SelectValue placeholder="Selecione um atributo" />
                    </SelectTrigger>
                    <SelectContent>
                        {schema.fields.filter(f => f.type !== 'other').map(field => (
                            <SelectItem key={field.name} value={field.name}>{field.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedField?.type === 'number' && (
                <>
                    <div className="space-y-2">
                         <Label>Operador</Label>
                         <Select value={operator} onValueChange={(v: AttributeQuery['operator']) => setOperator(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="between">Entre</SelectItem>
                                <SelectItem value="eq">Igual a</SelectItem>
                                <SelectItem value="neq">Diferente de</SelectItem>
                                <SelectItem value="gte">Maior ou igual a</SelectItem>
                                <SelectItem value="lte">Menor ou igual a</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                   {operator === 'between' ? (
                       <div className="flex gap-2">
                           <div className="space-y-2 flex-1">
                               <Label htmlFor="attr-min-val">Mínimo</Label>
                               <Input id="attr-min-val" type="number" value={minValue} onChange={e => setMinValue(e.target.value)} placeholder={selectedField.stats.min?.toString()}/>
                           </div>
                           <div className="space-y-2 flex-1">
                               <Label htmlFor="attr-max-val">Máximo</Label>
                               <Input id="attr-max-val" type="number" value={maxValue} onChange={e => setMaxValue(e.target.value)} placeholder={selectedField.stats.max?.toString()}/>
                           </div>
                       </div>
                   ) : (
                        <div className="space-y-2">
                            <Label htmlFor="attr-val">Valor</Label>
                            <Input id="attr-val" type="number" value={value} onChange={e => setValue(e.target.value)} />
                        </div>
                   )}
                </>
            )}
            
            {selectedField?.type === 'string' && (
                 <>
                    <div className="space-y-2">
                         <Label>Operador</Label>
                         <Select value={operator} onValueChange={(v: AttributeQuery['operator']) => setOperator(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in">Está em</SelectItem>
                                <SelectItem value="eq">Igual a</SelectItem>
                                <SelectItem value="neq">Diferente de</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {operator === 'in' ? (
                        <div className="space-y-2">
                            <Label>Valores</Label>
                            <ScrollArea className="h-40 rounded-md border p-2">
                                {Array.from(selectedField.stats.uniqueValues || []).map(val => (
                                    <div key={val} className="flex items-center space-x-2 p-1">
                                        <Checkbox id={'check-' + val} checked={selectedValues.has(val)} onCheckedChange={() => handleStringValueToggle(val)} />
                                        <Label htmlFor={'check-' + val} className="font-normal truncate">{val}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    ) : (
                         <div className="space-y-2">
                            <Label htmlFor="attr-val">Valor</Label>
                            <Input id="attr-val" type="text" value={value} onChange={e => setValue(e.target.value)} />
                        </div>
                    )}
                 </>
            )}

            <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1" disabled={isApplyDisabled()}>Aplicar Filtro</Button>
                <Button onClick={onClear} variant="outline">Limpar</Button>
            </div>
        </div>
    )
}

const RangeSelectorPanel = ({ points, setPreviewIds, onApplyBatchSelection, onToolFinish }: {
    points: FeaturePoint[];
    setPreviewIds: (ids: Set<string>) => void;
    onApplyBatchSelection: (ids: Set<string>) => void;
    onToolFinish: (mode: SelectionMode) => void;
}) => {
    const maxPoints = points.length;
    const [[min, max], setRange] = useState([1, maxPoints]);

    const calculateIdsFromRange = (minVal: number, maxVal: number): Set<string> => {
        console.log('calculateIdsFromRange called with minVal:', minVal, 'maxVal:', maxVal);
        console.log('calculateIdsFromRange - points length:', points.length);
        console.log('calculateIdsFromRange - points sample:', points.slice(0, Math.min(5, points.length)).map(p => ({id: p.id, lat: p.lat, lon: p.lon})));
        
        const ids = new Set<string>();
        const lower = Math.max(0, Math.floor(minVal) - 1);
        const upper = Math.min(maxPoints - 1, Math.floor(maxVal) - 1);
        
        console.log('calculateIdsFromRange - calculated lower:', lower, 'upper:', upper);
        
        if (lower > upper) {
            console.log('calculateIdsFromRange - invalid range, returning empty set');
            return ids;
        }
        
        for (let i = lower; i <= upper; i++) {
            if (i < points.length) {
                console.log('calculateIdsFromRange - adding point at index', i, 'with id', points[i].id);
                ids.add(points[i].id);
            } else {
                console.log('calculateIdsFromRange - index', i, 'out of bounds, points.length:', points.length);
            }
        }
        
        console.log('calculateIdsFromRange - final ids set:', Array.from(ids));
        return ids;
    }

    useEffect(() => {
        // Set initial preview to all points
        setPreviewIds(calculateIdsFromRange(1, maxPoints));

        // Cleanup on unmount
        return () => {
            setPreviewIds(new Set());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSliderChange = (newRange: number[]) => {
        setRange(newRange);
        setPreviewIds(calculateIdsFromRange(newRange[0], newRange[1]));
    };

    const handleInputChange = (which: 'min' | 'max', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;

        const newRange: [number, number] = [min, max];
        if (which === 'min') {
            newRange[0] = Math.max(1, Math.min(numValue, max));
        } else {
            newRange[1] = Math.min(maxPoints, Math.max(numValue, min));
        }
        setRange(newRange);
        setPreviewIds(calculateIdsFromRange(newRange[0], newRange[1]));
    }

    const handleApply = () => {
        console.log('handleApply called with min:', min, 'max:', max);
        const idsToApply = calculateIdsFromRange(min, max);
        console.log('handleApply - idsToApply:', Array.from(idsToApply));
        
        if (idsToApply.size === 0) {
            console.warn('No points to select in the given range');
            return;
        }
        
        // Clear preview first
        setPreviewIds(new Set());

        // Apply the selection only; applyBatchSelection sets selectionMode to 'batch-edit'
        console.log('handleApply - applying batch selection (no explicit mode change)');
        onApplyBatchSelection(idsToApply);
    };

    const handleCancel = () => {
        setPreviewIds(new Set());
        onToolFinish('single');
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Intervalo de Pontos (Ordem Natural)</Label>
                <p className="text-sm text-muted-foreground">Ajuste o intervalo para pré-visualizar a seleção (em amarelo). Clique em Aplicar para confirmar.</p>
                <div className="flex items-center gap-2">
                    <Input type="number" value={min} onChange={e => handleInputChange('min', e.target.value)} className="w-24" min={1} max={max} />
                    <Slider
                        value={[min, max]}
                        onValueChange={handleSliderChange}
                        max={maxPoints}
                        min={1}
                        step={1}
                        className="flex-1"
                    />
                    <Input type="number" value={max} onChange={e => handleInputChange('max', e.target.value)} className="w-24" min={min} max={maxPoints} />
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1">Aplicar Intervalo</Button>
                <Button onClick={handleCancel} variant="outline">Cancelar</Button>
            </div>
        </div>
    );
};


const AttributesPanel = ({ 
  points,
  originalHeaders,
  selectedPoints, 
  onUpdatePoint,
  onUpdateSelectedPoints,
  onTogglePointSelection,
  selectionMode,
  setPreviewIds,
  onApplyBatchSelection,
  onToolFinish,
  translationLock,
  onTranslationLockChange,
  translationDelta,
  onApplyTranslation,
  onSetTranslationValue,
  schema,
  onAttributeQueryChange,
  onApplyAttributeQuery,
}: {
  points: FeaturePoint[],
  originalHeaders: string[],
  selectedPoints: string[], 
  onUpdatePoint: (id: string, newAttrs: Partial<FeaturePoint>) => void,
  onUpdateSelectedPoints: (newAttrs: Partial<Omit<FeaturePoint, 'id'>>) => void,
  onTogglePointSelection: (id: string) => void,
  selectionMode: SelectionMode,
  setPreviewIds: (ids: Set<string>) => void;
  onApplyBatchSelection: (ids: Set<string>) => void;
  onToolFinish: (mode: SelectionMode) => void;
  translationLock: { lat: boolean; lon: boolean; alt: boolean },
  onTranslationLockChange: (axis: 'lat' | 'lon' | 'alt', locked: boolean) => void,
  translationDelta: { dLat: number; dLon: number; dAlt: number };
  onApplyTranslation: () => void;
  onSetTranslationValue: (axis: 'dLat' | 'dLon' | 'dAlt', value: number) => void;
  schema: DatasetSchema;
  onAttributeQueryChange: (query: AttributeQuery | null) => void;
  onApplyAttributeQuery: () => void;
}) => {
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FeaturePoint>>({});
  const [batchEditValues, setBatchEditValues] = useState<Record<string, any>>({});
  const [selectionTool, setSelectionTool] = useState<'attribute' | 'range'>('attribute');

  useEffect(() => {
      if (selectionMode !== 'attribute' && selectionMode !== 'batch-edit') {
          setSelectionTool('attribute');
          setPreviewIds(new Set());
      }
  }, [selectionMode, setPreviewIds]);

  const selectedPointsData = useMemo(() => {
    console.log('Computing selectedPointsData:');
    console.log('- selectedPoints:', selectedPoints);
    console.log('- points length:', points.length);
    console.log('- points sample:', points.slice(0, Math.min(5, points.length)).map(p => ({id: p.id, lat: p.lat, lon: p.lon})));
    
    const data = points.filter(p => {
      const isSelected = selectedPoints.includes(p.id);
      if (isSelected) {
        console.log('Point', p.id, 'is selected');
      }
      return isSelected;
    });
    
    console.log('selectedPointsData result length:', data.length);
    if (data.length > 0) {
      console.log('selectedPointsData sample:', data.slice(0, Math.min(3, data.length)).map(p => ({id: p.id, lat: p.lat, lon: p.lon})));
    }
    
    return data;
  }, [points, selectedPoints]);
  
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

  const handleCancelEditing = () => {
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

  const renderContent = () => {
    console.log('renderContent called:');
    console.log('- selectionMode:', selectionMode);
    console.log('- selectionTool:', selectionTool);
    console.log('- selectedPointsData length:', selectedPointsData.length);
    console.log('- selectedPointsData sample:', selectedPointsData.slice(0, Math.min(3, selectedPointsData.length)).map(p => ({id: p.id, lat: p.lat, lon: p.lon})));
    
    if (selectionMode === 'attribute') {
        console.log('rendering attribute selection mode');
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg">
                    <Filter className="w-5 h-5" />
                    <span>Seleção por Atributos</span>
                </div>
                <RadioGroup 
                    value={selectionTool} 
                    onValueChange={(v) => {
                        console.log('RadioGroup onValueChange - v:', v);
                        setPreviewIds(new Set());
                        setSelectionTool(v as 'attribute' | 'range');
                    }} 
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="attribute" id="r-attr" />
                        <Label htmlFor="r-attr">Por Filtro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="range" id="r-range" />
                        <Label htmlFor="r-range">Por Intervalo</Label>
                    </div>
                </RadioGroup>
                <hr/>
                {selectionTool === 'attribute' ? (
                    <AttributeSelectorPanel 
                        schema={schema} 
                        onQueryChange={onAttributeQueryChange} 
                        onApply={onApplyAttributeQuery} 
                        onClear={() => onAttributeQueryChange(null)}
                        onToolFinish={onToolFinish}
                    />
                ) : (
                    <RangeSelectorPanel 
                        points={points}
                        setPreviewIds={setPreviewIds}
                        onApplyBatchSelection={onApplyBatchSelection}
                        onToolFinish={onToolFinish}
                    />
                )}
            </div>
        );
    }

    console.log('not in attribute mode, checking selected points');
        if (selectedPointsData.length === 0 && selectionMode !== 'batch-edit') {
            console.log('no selected points and not in batch-edit mode, showing empty state');
            return (
            <div className="flex items-center justify-center h-full">
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Propriedades do Ponto</h3>
                {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => handleEdit(point)}>
                    <Edit className="w-4 h-4" />
                    </Button>
                ) : (
                    <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={handleSave}><Save className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEditing}><X className="w-4 h-4" /></Button>
                    </div>
                )}
            </div>
            <div>
              <Label htmlFor="point-id">ID</Label>
              <Input id="point-id" value={point.id} disabled className="mt-1" />
            </div>

            {coreProperties.map(property => {
                if (property === 'alt' && !hasAltitude) return null;
                return (
                <div key={property}>
                    <Label htmlFor={'point-' + property}>{property.charAt(0).toUpperCase() + property.slice(1)}</Label>
                    <Input id={'point-' + property} value={currentValues[property] ?? ''} onChange={(e) => handleInputChange(property, e.target.value)} disabled={!isEditing} type={'number'} step={'any'} className="mt-1"/>
                </div>
                )
            })}
            {Object.keys(point.attributes).map(attr => (
                <div key={attr}>
                <Label htmlFor={'point-attr-' + attr}>{attr.charAt(0).toUpperCase() + attr.slice(1)}</Label>
                <Input id={'point-attr-' + attr} value={currentValues[attr] ?? ''} onChange={(e) => handleAttributeChange(attr, e.target.value)} disabled={!isEditing} type="text" className="mt-1" />
                </div>
            ))}
        </div>
      );
    }
    
    // Multi-select modes
    return (
      <>
        <h3 className="text-lg font-semibold mb-4">{selectedPointsData.length} Pontos Selecionados</h3>
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-4">
            {renderMultiSelectContent()}
            <hr className="my-4"/>
            <p className="text-sm font-medium mb-2">Pontos selecionados:</p>
            <div className="space-y-2">
                {selectedPointsData.map(point => (
                    <div
                        key={point.id}
                        className="p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors text-xs"
                        onClick={() => onTogglePointSelection(point.id)}
                    >
                        <div className="font-medium truncate">ID: {point.id}</div>
                        <div className="text-gray-600">
                            Lat: {point.lat.toFixed(6)}, Lon: {point.lon.toFixed(6)}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </>
    );
  };


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
                Travar Latitude
              </Label>
              <Input 
                  value={translationDelta.dLat.toFixed(6)}
                  onChange={(e) => onSetTranslationValue('dLat', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="any"
                  className="w-28 h-8 text-xs" 
                  disabled={translationLock.lat} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="lock-lon" checked={translationLock.lon} onCheckedChange={(checked) => onTranslationLockChange('lon', !!checked)} />
              <Label htmlFor="lock-lon" className="flex items-center gap-2 flex-1">
                {translationLock.lon ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                Travar Longitude
              </Label>
              <Input 
                  value={translationDelta.dLon.toFixed(6)} 
                  onChange={(e) => onSetTranslationValue('dLon', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="any"
                  className="w-28 h-8 text-xs"
                  disabled={translationLock.lon} />
            </div>
            {hasAltitude && (
              <div className="flex items-center space-x-2">
                <Checkbox id="lock-alt" checked={translationLock.alt} onCheckedChange={(checked) => onTranslationLockChange('alt', !!checked)} />
                <Label htmlFor="lock-alt" className="flex items-center gap-2 flex-1">
                  {translationLock.alt ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  Travar Altitude
                </Label>
                <Input 
                  value={translationDelta.dAlt.toFixed(6)} 
                  onChange={(e) => onSetTranslationValue('dAlt', parseFloat(e.target.value) || 0)}
                  type="number"
                  step="any"
                  className="w-28 h-8 text-xs"
                  disabled={translationLock.alt} />
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
      const allOriginalAttributes = originalHeaders.filter(h => !['lat', 'lon', 'alt'].some(coord => new RegExp('^' + coord + '$', 'i').test(h)));
      const firstSelectedPoint = selectedPointsData[0];

      const getPlaceholder = (field: string) => {
        if (!firstSelectedPoint) return '';
        let exampleValue: any;
        if (field === 'lat') exampleValue = firstSelectedPoint.lat;
        else if (field === 'lon') exampleValue = firstSelectedPoint.lon;
        else if (field === 'alt') exampleValue = firstSelectedPoint.alt;
        else exampleValue = firstSelectedPoint.attributes[field];
        
        const valueStr = (exampleValue !== null && exampleValue !== undefined) ? String(exampleValue) : '';
        return 'Manter valor original (' + valueStr + ')';
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
              <Label htmlFor={'batch-attr-' + attr}>{attr}</Label>
              <Input
                id={'batch-attr-' + attr}
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
    return null;
  };

  return (
    <div className="p-4 h-full">
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {renderContent()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttributesPanel;
