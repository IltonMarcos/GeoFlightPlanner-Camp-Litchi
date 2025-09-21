"use client";
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useHistory } from './useHistory';
import type { FeaturePoint, SelectionMode, DatasetSchema, AttributeQuery } from '../lib/types';
import * as turf from '@turf/turf';
import { randomId } from '@/lib/uuid';

interface FlightDataState {
    points: FeaturePoint[];
    selectedPoints: Set<string>;
    originalHeaders: string[];
    isDrawing: boolean;
    drawnPolygon: {lng: number, lat: number}[];
    selectionMode: SelectionMode;
    translationLock: { lat: boolean; lon: boolean; alt: boolean };
    translationDelta: { dLat: number; dLon: number; dAlt: number };
    pointsBeforeTranslate: FeaturePoint[] | null;
    schema: DatasetSchema;
    attributeQuery: AttributeQuery | null;
    rotationCenter: { lon: number, lat: number } | null;
    pointsBeforeRotate: FeaturePoint[] | null;
    selectionAddMode: boolean;
}

const initialState: FlightDataState = {
    points: [],
    selectedPoints: new Set(),
    originalHeaders: [],
    isDrawing: false,
    drawnPolygon: [],
    selectionMode: 'single',
    translationLock: { lat: false, lon: false, alt: false },
    translationDelta: { dLat: 0, dLon: 0, dAlt: 0 },
    pointsBeforeTranslate: null,
    schema: { fields: [] },
    attributeQuery: null,
    rotationCenter: null,
    pointsBeforeRotate: null,
    selectionAddMode: false,
};

export const useFlightData = () => {
    const {state, setState, undo, redo, canUndo, canRedo, resetHistory} = useHistory<FlightDataState>(initialState);

    const { 
        points, 
        selectedPoints, 
        originalHeaders, 
        isDrawing, 
        drawnPolygon, 
        selectionMode,
        translationLock,
        translationDelta,
        pointsBeforeTranslate,
        schema,
        attributeQuery,
        rotationCenter,
        pointsBeforeRotate,
    } = state || initialState;

    const cancelTranslation = useCallback(() => {
        setState(prev => {
            if (!prev) return initialState;
            if (prev.pointsBeforeTranslate) {
                return {
                    ...prev,
                    points: prev.pointsBeforeTranslate,
                    pointsBeforeTranslate: null,
                    translationDelta: { dLat: 0, dLon: 0, dAlt: 0 },
                    selectionMode: 'single',
                };
            }
            return { ...prev, selectionMode: 'single' };
        }, false);
    }, [setState]);
    
    const setSelectionMode = useCallback((mode: SelectionMode) => {
        setState(prev => {
            if (!prev) return initialState;
            let nextState = { ...prev };

            if ((prev.selectionMode === 'translate' && mode !== 'translate') && prev.pointsBeforeTranslate) {
                nextState.points = prev.pointsBeforeTranslate;
            }
             if ((prev.selectionMode === 'rotate' && mode !== 'rotate') && prev.pointsBeforeRotate) {
                nextState.points = prev.pointsBeforeRotate;
            }

            nextState = {
                ...nextState,
                selectionMode: mode,
                isDrawing: mode === 'polygon',
                drawnPolygon: [],
                pointsBeforeTranslate: null,
                translationDelta: { dLat: 0, dLon: 0, dAlt: 0 },
                rotationCenter: null,
                pointsBeforeRotate: null,
            };

            if (mode === 'polygon') {
                nextState.selectedPoints = new Set();
            } else if (mode === 'translate' && prev.selectedPoints.size > 0) {
                nextState.pointsBeforeTranslate = [...prev.points];
            } else if (mode === 'rotate' && prev.selectedPoints.size > 1) {
                nextState.pointsBeforeRotate = [...prev.points];
            } else if (mode === 'attribute') {
                nextState.attributeQuery = null;
            }
            
            return nextState;
        });
    }, [setState]);

    const finishPolygonSelection = useCallback((): number => {
      let count = 0;
      setState(prev => {
        if (!prev || prev.drawnPolygon.length < 3) {
            return {
                ...(prev || initialState),
                isDrawing: false,
                selectionMode: 'single',
                drawnPolygon: []
            };
        }
    
        const polygon = turf.polygon([
          [...prev.drawnPolygon.map(p => [p.lng, p.lat]), [prev.drawnPolygon[0].lng, prev.drawnPolygon[0].lat]]
        ]);
        
        const pointsInPolygon = new Set<string>();
        prev.points.forEach(point => {
            const turfPoint = turf.point([point.lon, point.lat]);
            if (turf.booleanPointInPolygon(turfPoint, polygon)) {
                pointsInPolygon.add(point.id);
            }
        });
        
        count = pointsInPolygon.size;
  
        let finalSelectedPoints: Set<string>;

        if (prev.selectionAddMode) {
          finalSelectedPoints = new Set(prev.selectedPoints);
          pointsInPolygon.forEach(id => finalSelectedPoints.add(id));
        } else {
          finalSelectedPoints = pointsInPolygon;
        }

        return {
          ...prev, 
          selectedPoints: finalSelectedPoints,
          drawnPolygon: [],
          isDrawing: false,
          selectionMode: finalSelectedPoints.size > 0 ? 'batch-edit' : 'single',
        };
      }, true);
      return count;
    }, [setState]);

    const togglePointSelection = useCallback((pointId: string) => {
        setState(prev => {
          if (!prev) return initialState;
          
          if (prev.selectionAddMode) {
            const newSelectedPoints = new Set(prev.selectedPoints);
            newSelectedPoints.add(pointId);
            return {...prev, selectedPoints: newSelectedPoints, selectionMode: 'single' };
          } 
          
          const newSelectedPoints = new Set([pointId]);
          if (prev.selectedPoints.size === 1 && prev.selectedPoints.has(pointId)) {
            return {...prev, selectedPoints: new Set(), selectionMode: 'single' };
          }
          return { ...prev, selectedPoints: newSelectedPoints, selectionMode: 'single' };
        }, true);
    }, [setState]);


    const selectAll = useCallback((select: boolean) => {
        setState(prev => {
            if (!prev) return initialState;
            if (select) {
                const allPointIds = new Set(prev.points.map(p => p.id));
                return { ...prev, selectedPoints: allPointIds, selectionMode: 'all' };
            } else {
                return { ...prev, selectedPoints: new Set(), selectionMode: 'single' };
            }
        }, true);
    }, [setState]);

    const clearSelection = useCallback(() => {
        setState(prev => ({...(prev || initialState), selectedPoints: new Set(), selectionMode: 'single', selectionAddMode: false }), true);
    }, [setState]);

    const duplicateSelectedPoints = useCallback(() => {
        setState(prev => {
          if (!prev) return initialState;
          const newPoints: FeaturePoint[] = [...prev.points];
          const newSelectedPoints = new Set<string>();
          
          prev.points.forEach(p => {
              if (prev.selectedPoints.has(p.id)) {
                  const newPoint: FeaturePoint = {
                      ...p,
                      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? (crypto as any).randomUUID() : randomId()),
                      lon: p.lon + 0.0001, // small offset
                      lat: p.lat + 0.0001,
                  };
                  newPoints.push(newPoint);
                  newSelectedPoints.add(newPoint.id);
              }
          });

          return {
              ...prev,
              points: newPoints,
              selectedPoints: newSelectedPoints
          };
        });
    }, [setState]);

    const deleteSelectedPoints = useCallback(() => {
        setState(prev => {
          if (!prev) return initialState;
          const newPoints = prev.points.filter(p => !prev.selectedPoints.has(p.id));
          return {
              ...prev,
              points: newPoints,
              selectedPoints: new Set(),
              selectionAddMode: false
          };
        });
    }, [setState]);

    const updatePoint = useCallback((pointId: string, newValues: Partial<FeaturePoint>) => {
        setState(prev => {
          if (!prev) return initialState;
          const newPoints = prev.points.map(p => 
              p.id === pointId ? { ...p, ...newValues } : p
          );
          return { ...prev, points: newPoints };
        });
    }, [setState]);

    const updateSelectedPoints = useCallback((newValues: Partial<Omit<FeaturePoint, 'id'>>) => {
        setState(prev => {
          if (!prev) return initialState;
          const { attributes, ...coordValues } = newValues;

          const newPoints = prev.points.map(p => {
            if (prev.selectedPoints.has(p.id)) {
              const updatedPoint = { ...p, ...coordValues };
              if (attributes) {
                updatedPoint.attributes = { ...p.attributes, ...attributes };
              }
              return updatedPoint;
            }
            return p;
          });
          return { ...prev, points: newPoints };
        });
    }, [setState]);
    
    const translateSelectedPoints = useCallback((delta: { dLat: number; dLon: number; dAlt: number }) => {
        setState(prev => {
            if (!prev || !prev.pointsBeforeTranslate) return prev;
    
            const newPoints = prev.points.map(p => {
                if (p && prev.selectedPoints.has(p.id)) {
                    return {
                        ...p,
                        lat: p.lat + delta.dLat,
                        lon: p.lon + delta.dLon,
                        alt: (p.alt !== null && p.alt !== undefined) ? p.alt + delta.dAlt : p.alt,
                    };
                }
                return p;
            });
    
            return { 
                ...prev,
                points: newPoints,
                translationDelta: {
                    dLat: prev.translationDelta.dLat + delta.dLat,
                    dLon: prev.translationDelta.dLon + delta.dLon,
                    dAlt: prev.translationDelta.dAlt + delta.dAlt,
                }
            };
        }, false);
    }, [setState]);

    const applyTranslation = useCallback(() => {
        setState(prev => {
            if (!prev) return initialState;
            return {
                ...prev,
                pointsBeforeTranslate: null, // Clear the backup, committing the change
                translationDelta: { dLat: 0, dLon: 0, dAlt: 0 },
                selectionMode: 'single',
            }
        });
    }, [setState]);
    
    const setTranslationLock = useCallback((axis: 'lat' | 'lon' | 'alt', locked: boolean) => {
        setState(prev => {
            if (!prev) return initialState;
            return {
                ...prev,
                translationLock: {
                    ...prev.translationLock,
                    [axis]: locked
                }
            }
        }, true);
    }, [setState]);

    const setTranslationValue = useCallback((axis: 'dLat' | 'dLon' | 'dAlt', value: number) => {
        setState(prev => {
            if (!prev || !prev.pointsBeforeTranslate) return prev;
            const currentDelta = prev.translationDelta[axis];
            const change = value - currentDelta;
            
            const deltaToApply = {
                dLat: axis === 'dLat' ? change : 0,
                dLon: axis === 'dLon' ? change : 0,
                dAlt: axis === 'dAlt' ? change : 0,
            };

            const newPoints = prev.points.map(p => {
                if (p && prev.selectedPoints.has(p.id)) {
                    return {
                        ...p,
                        lat: p.lat + deltaToApply.dLat,
                        lon: p.lon + deltaToApply.dLon,
                        alt: (p.alt !== null && p.alt !== undefined) ? p.alt + deltaToApply.dAlt : p.alt,
                    };
                }
                return p;
            });
    
            return { 
                ...prev,
                points: newPoints,
                translationDelta: {
                    ...prev.translationDelta,
                    [axis]: value
                }
            };
        }, false);
    }, [setState]);

    const setAttributeQuery = useCallback((query: AttributeQuery | null) => {
        setState(prev => ({ ...(prev || initialState), attributeQuery: query }));
    }, [setState]);

    const setSelectionAddMode = useCallback((mode: boolean) => {
        setState(prev => ({ ...(prev || initialState), selectionAddMode: mode }), true);
    }, [setState]);

    const applyBatchSelection = useCallback((newIds: Set<string>) => {
        console.log('applyBatchSelection called with newIds:', Array.from(newIds));
        setState(prev => {
            if (!prev) {
                console.log('applyBatchSelection - prev is null, returning initialState');
                return initialState;
            }

            // Validate input
            if (!newIds || newIds.size === 0) {
                console.warn('No IDs provided for batch selection');
                return prev;
            }

            console.log('Current state:', {
                selectedPoints: Array.from(prev.selectedPoints),
                selectionMode: prev.selectionMode,
                addMode: prev.selectionAddMode,
            });
            
            // Ensure we're working with valid point IDs
            const validIds = new Set(
                Array.from(newIds).filter(id => 
                    prev.points.some(point => point.id === id)
                )
            );

            console.log('Valid IDs for selection:', Array.from(validIds));

            let finalSelectedPoints: Set<string>;

            if (prev.selectionAddMode) {
                finalSelectedPoints = new Set([...Array.from(prev.selectedPoints), ...Array.from(validIds)]);
                console.log('Add mode - combined selection:', Array.from(finalSelectedPoints));
            } else {
                finalSelectedPoints = validIds;
                console.log('Replace mode - new selection:', Array.from(finalSelectedPoints));
            }

            if (finalSelectedPoints.size === 0) {
                console.warn('No points selected after operation');
            }
            
            const newState = {
                ...prev,
                selectedPoints: finalSelectedPoints,
                selectionMode: 'batch-edit' as SelectionMode
            };

            console.log('Updating state with:', {
                selectionMode: newState.selectionMode,
                selectedPointsCount: newState.selectedPoints.size
            });

            return newState;
        }, true);
    }, [setState]);

    const applyAttributeSelection = useCallback(() => {
        setState(prev => {
            if (!prev || !prev.attributeQuery) {
                console.warn('No attribute query to apply');
                return prev;
            }
            
            console.log('Applying attribute selection with query:', prev.attributeQuery);
            const { field, operator, value, values, min, max } = prev.attributeQuery;
            let newSelectedPoints = new Set<string>();

            // If in add mode, start with current selection
            if (prev.selectionAddMode) {
                console.log('Using existing selection as base:', Array.from(prev.selectedPoints));
                newSelectedPoints = new Set(prev.selectedPoints);
            }

            const matchingPoints = new Set<string>();
            console.log('Evaluating points for field:', field);
            
            prev.points.forEach(point => {
                if (!point.id) {
                    console.warn('Point without ID found:', point);
                    return;
                }

                const pointValue = point.attributes[field];
                console.log('Evaluating point:', { id: point.id, value: pointValue });
                let match = false;

                switch (operator) {
                    case 'eq':
                        match = String(pointValue) === String(value);
                        break;
                    case 'neq':
                        match = String(pointValue) !== String(value);
                        break;
                    case 'in':
                        match = !!values?.some(v => String(v) === String(pointValue));
                        break;
                    case 'gte':
                        match = typeof pointValue === 'number' && typeof value === 'number' && pointValue >= value;
                        break;
                    case 'lte':
                        match = typeof pointValue === 'number' && typeof value === 'number' && pointValue <= value;
                        break;
                    case 'between':
                        match = typeof pointValue === 'number' && typeof min === 'number' && typeof max === 'number' && pointValue >= min && pointValue <= max;
                        break;
                }

                if (match) {
                    newSelectedPoints.add(point.id);
                }
            });

            let finalSelectedPoints: Set<string>;

            if (prev.selectionAddMode) {
              finalSelectedPoints = new Set(prev.selectedPoints);
              newSelectedPoints.forEach(id => finalSelectedPoints.add(id));
            } else {
              finalSelectedPoints = newSelectedPoints;
            }

            return {
                ...prev,
                selectedPoints: finalSelectedPoints,
                attributeQuery: null,
                selectionMode: finalSelectedPoints.size > 0 ? 'batch-edit' : 'single',
            };
        }, true);
    }, [setState]);
    
    const setRotationCenter = useCallback((coords: { lon: number, lat: number } | null) => {
        setState(prev => ({ ...(prev || initialState), rotationCenter: coords }), true);
    }, [setState]);

    const rotateSelectedPoints = useCallback((angle: number) => {
        setState(prev => {
            if (!prev || !prev.rotationCenter) return prev;
            
            const currentPoints = prev.points;
            const center = turf.point([prev.rotationCenter.lon, prev.rotationCenter.lat]);

            const newPoints = currentPoints.map(p => {
                if (prev.selectedPoints.has(p.id)) {
                    const pointToRotate = turf.point([p.lon, p.lat]);
                    const rotated = turf.transformRotate(pointToRotate, angle, { pivot: center });
                    return { ...p, lon: rotated.geometry.coordinates[0], lat: rotated.geometry.coordinates[1] };
                }
                return p;
            });
            return { ...prev, points: newPoints };
        }, false);
    }, [setState]);

    const applyRotation = useCallback(() => {
        setState(prev => {
            if (!prev || !prev.pointsBeforeRotate) return prev;
            const finalState = {
                ...(prev),
                pointsBeforeRotate: null,
                rotationCenter: null,
                selectionMode: 'single'
            };
            return {...finalState};
        });
    }, [setState]);

    const reverseFlightPoints = useCallback(() => {
        setState(prev => {
            if (!prev || !prev.points || prev.points.length < 2) return prev;
            const newPoints = [...prev.points].reverse();
            return { ...prev, points: newPoints };
        });
    }, [setState]);

    return {
        points: points || [],
        selectedPoints: selectedPoints || new Set(),
        originalHeaders: originalHeaders || [],
        history: state,
        canUndo,
        canRedo,
        undo,
        redo,
        resetHistory,
        finishPolygonSelection,
        updatePoint,
        updateSelectedPoints,
        togglePointSelection,
        clearSelection,
        selectAll,
        duplicateSelectedPoints,
        deleteSelectedPoints,
        isDrawing: isDrawing || false,
        setIsDrawing: (isDrawing: boolean) => setState(prev => ({...(prev || initialState), isDrawing}), true),
        drawnPolygon: drawnPolygon || [],
        setDrawnPolygon: (polygon) => setState(prev => ({ ...(prev || initialState), drawnPolygon: typeof polygon === 'function' ? polygon(prev?.drawnPolygon || []) : polygon }), true),
        selectionMode: selectionMode || 'single',
        setSelectionMode,
        translationLock: translationLock || { lat: false, lon: false, alt: false },
        setTranslationLock,
        translateSelectedPoints,
        translationDelta: translationDelta || { dLat: 0, dLon: 0, dAlt: 0 },
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
        selectionAddMode: state?.selectionAddMode || false,
        setSelectionAddMode,
        reverseFlightPoints,
    };
};
