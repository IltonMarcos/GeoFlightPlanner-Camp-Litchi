
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { COORD_PATTERNS } from '@/lib/csv-helpers';

interface Mappings {
  lat?: string;
  lon?: string;
  alt?: string;
  heading?: string;
  gimbalPitch?: string;
}

interface ImportDialogProps {
  isOpen: boolean;
  file: File;
  onClose: () => void;
  onSubmit: (mappings: { lat: string; lon: string; alt?: string; heading?: string; gimbalPitch?: string; }) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, file, onClose, onSubmit }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Mappings>({});
  const [error, setError] = useState<string>('');

  const autoDetectColumns = useCallback((detectedHeaders: string[]) => {
    let autoLat, autoLon, autoAlt, autoHeading, autoGimbalPitch;
    for (const header of detectedHeaders) {
      if (!autoLon && COORD_PATTERNS.lon.test(header)) autoLon = header;
      if (!autoLat && COORD_PATTERNS.lat.test(header)) autoLat = header;
      if (!autoAlt && COORD_PATTERNS.alt.test(header)) autoAlt = header;
      if (!autoHeading && /heading/i.test(header)) autoHeading = header;
      if (!autoGimbalPitch && /gimbal.*pitch/i.test(header)) autoGimbalPitch = header;
    }
    setMappings({ lat: autoLat, lon: autoLon, alt: autoAlt, heading: autoHeading, gimbalPitch: autoGimbalPitch });
  }, []);

  useEffect(() => {
    if (file) {
      Papa.parse(file, { header: true, skipEmptyLines: 'greedy', preview: 1,
        complete: (results) => {
          let detectedHeaders = (results.meta.fields || []) as string[];
          if (detectedHeaders.length === 0) {
            // Fallback: parse first row without headers to infer column count
            const alt = Papa.parse(file, { header: false, preview: 1, skipEmptyLines: 'greedy' });
            const cols = Array.isArray(alt.data?.[0]) ? (alt.data[0] as any[]).length : 0;
            detectedHeaders = Array.from({length: cols}, (_, i) => `col_${i+1}`);
          }
          setHeaders(detectedHeaders);
          autoDetectColumns(detectedHeaders);
        }, });
    }
  }, [file, autoDetectColumns]);
  
  const handleMappingChange = (coord: keyof Mappings, value: string) => {
    setMappings(prev => ({ ...prev, [coord]: value === 'none' ? undefined : value }));
  };

  const handleSubmit = () => {
    if (!mappings.lat || !mappings.lon) {
      setError('As colunas de Latitude e Longitude são obrigatórias.');
      return;
    }
    setError('');
    onSubmit({ lat: mappings.lat, lon: mappings.lon, alt: mappings.alt, heading: mappings.heading, gimbalPitch: mappings.gimbalPitch });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mapeamento de Colunas CSV</DialogTitle>
          <DialogDescription>
            Confirme ou selecione as colunas para latitude, longitude, altitude e orientação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lon-col" className="text-right">
              Longitude*
            </Label>
            <Select onValueChange={(value) => handleMappingChange('lon', value)} value={mappings.lon}>
              <SelectTrigger id="lon-col" className="col-span-3">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {headers.map(h => <SelectItem key={`lon-${h}`} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lat-col" className="text-right">
              Latitude*
            </Label>
            <Select onValueChange={(value) => handleMappingChange('lat', value)} value={mappings.lat}>
              <SelectTrigger id="lat-col" className="col-span-3">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {headers.map(h => <SelectItem key={`lat-${h}`} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="alt-col" className="text-right">
              Altitude
            </Label>
             <Select onValueChange={(value) => handleMappingChange('alt', value)} value={mappings.alt}>
              <SelectTrigger id="alt-col" className="col-span-3">
                <SelectValue placeholder="Coluna opcional" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="none">Nenhuma</SelectItem>
                {headers.map(h => <SelectItem key={`alt-${h}`} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="heading-col" className="text-right">
              Heading (deg)
            </Label>
             <Select onValueChange={(value) => handleMappingChange('heading', value)} value={mappings.heading}>
              <SelectTrigger id="heading-col" className="col-span-3">
                <SelectValue placeholder="Coluna opcional" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="none">Nenhuma</SelectItem>
                {headers.map(h => <SelectItem key={`heading-${h}`} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gimbal-col" className="text-right">
              Gimbal Pitch
            </Label>
             <Select onValueChange={(value) => handleMappingChange('gimbalPitch', value)} value={mappings.gimbalPitch}>
              <SelectTrigger id="gimbal-col" className="col-span-3">
                <SelectValue placeholder="Coluna opcional" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="none">Nenhuma</SelectItem>
                {headers.map(h => <SelectItem key={`gimbal-${h}`} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive col-span-4 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
