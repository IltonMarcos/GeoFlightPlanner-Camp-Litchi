import Papa from 'papaparse';
import type { FeaturePoint, PointAttributeValue, DatasetSchema, SchemaField, FieldStats, FieldType } from './types';
import { randomId } from './uuid';

export const COORD_PATTERNS = {
  lon: /^(lon|lng|long|x|longitude)$/i,
  lat: /^(lat|y|latitude)$/i,
  alt: /^(alt|z|height|elev|altitude|altitude\(m\))$/i,
};

const parseAndNormalize = (value: string): number | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const num = parseFloat(value.replace(',', '.'));
  return isNaN(num) ? null : num;
};

const inferFieldType = (value: string): FieldType => {
  if (value === null || value === undefined || value.trim() === '') return 'other';
  const num = Number(value.replace(',', '.'));
  if (!isNaN(num) && value.trim() !== '') return 'number';
  return 'string';
}

const inferSchema = (data: Record<string, string>[], headers: string[]): DatasetSchema => {
    const fields: SchemaField[] = headers.map(name => ({
        name,
        type: 'other', // Start as 'other'
        stats: { uniqueValues: new Set() }
    }));

    if (data.length === 0) return { fields };

    // Infer types from the first few rows
    const sample = data.slice(0, 100);
    fields.forEach(field => {
        for(const row of sample) {
            const value = row[field.name];
            const type = inferFieldType(value);
            if(type === 'number') {
                field.type = 'number';
                break;
            }
             if(type === 'string') {
                field.type = 'string';
            }
        }
    });

    // Calculate stats
    fields.forEach(field => {
        if (field.type === 'number') {
            let min = Infinity, max = -Infinity;
            data.forEach(row => {
                const value = parseAndNormalize(row[field.name]);
                if (value !== null) {
                    if (value < min) min = value;
                    if (value > max) max = value;
                }
            });
            field.stats.min = min === Infinity ? undefined : min;
            field.stats.max = max === -Infinity ? undefined : max;
        } else if (field.type === 'string') {
             data.forEach(row => {
                const value = row[field.name];
                if (value !== null && value !== undefined) {
                    field.stats.uniqueValues?.add(value);
                }
            });
        }
    });

    return { fields };
}


export const parseCsv = (
    file: File,
    mappings: { lat: string; lon: string; alt?: string; heading?: string; gimbalPitch?: string; }
): Promise<{ points: FeaturePoint[]; headers: string[]; schema: DatasetSchema }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];

        const { lat: latCol, lon: lonCol, alt: altCol, heading: headingCol, gimbalPitch: gimbalPitchCol } = mappings;

        if (!lonCol || !latCol) {
          return reject(new Error('As colunas de longitude e latitude são obrigatórias.'));
        }
        if (!headers.includes(lonCol) || !headers.includes(latCol)) {
          return reject(new Error('As colunas de coordenadas mapeadas não foram encontradas no arquivo.'));
        }
        
        const schema = inferSchema(data, headers);
        
        console.log('CSV parsing: data sample', data.slice(0, 3));
        console.log('CSV parsing: mappings', mappings);

        const points: FeaturePoint[] = data
          .map((row) => {
            const lon = parseAndNormalize(row[lonCol!]);
            const lat = parseAndNormalize(row[latCol!]);

            if (lon === null || lat === null || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
              console.warn('Invalid coordinates:', { lon, lat, row });
              return null;
            }

            const alt = altCol ? parseAndNormalize(row[altCol]) : 0;
            const heading = headingCol ? parseAndNormalize(row[headingCol]) : 0;
            const gimbalPitch = gimbalPitchCol ? parseAndNormalize(row[gimbalPitchCol]) : 0;

            const attributes: Record<string, PointAttributeValue> = {};
            for (const key in row) {
              const schemaField = schema.fields.find(f => f.name === key);
              if (schemaField?.type === 'number') {
                  attributes[key] = parseAndNormalize(row[key]);
              } else {
                  attributes[key] = row[key];
              }
            }
            // Overwrite coordinate attributes to ensure consistency
            attributes[latCol] = lat;
            attributes[lonCol] = lon;
            if (altCol) attributes[altCol] = alt;
            if (headingCol) attributes[headingCol] = heading;
            if (gimbalPitchCol) attributes[gimbalPitchCol] = gimbalPitch;

            const point = {
              id: randomId(),
              lon,
              lat,
              alt: alt ?? 0,
              heading: heading ?? 0,
              gimbalPitch: gimbalPitch ?? 0,
              attributes: attributes,
            };
            
            console.log('CSV parsing: created point', point);
            return point;
          })
          .filter((p): p is FeaturePoint => p !== null);

        console.log('CSV parsing: final points', points);
        resolve({ points, headers, schema });
      },
      error: (error) => reject(error),
    });
  });
};

export const generateCsv = (points: FeaturePoint[], headers: string[]): string => {
  let lonCol = '', latCol = '', altCol: string | undefined;

  for (const header of headers) {
      if (COORD_PATTERNS.lon.test(header)) lonCol = header;
      if (COORD_PATTERNS.lat.test(header)) latCol = header;
      if (COORD_PATTERNS.alt.test(header)) altCol = header;
  }

  const data = points.map(point => {
    const row: Record<string, any> = { ...point.attributes };
    if (lonCol) row[lonCol] = point.lon;
    if (latCol) row[latCol] = point.lat;
    if (altCol) row[altCol] = point.alt ?? '';
    
    // Ensure original column order
    const orderedRow: Record<string, any> = {};
    for (const header of headers) {
        orderedRow[header] = row[header];
    }
    return orderedRow;
  });
  
  return Papa.unparse(data, { columns: headers });
};
