import Papa from 'papaparse';

export interface FlightPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  [key: string]: any; // Other properties from CSV
}

export interface ParsedFlightData {
  headers: string[];
  points: FlightPoint[];
}

/**
 * Parse CSV flight data
 * @param csvString - The CSV string to parse
 * @returns Promise with parsed flight data
 */
export const parseFlightCSV = (csvString: string): Promise<ParsedFlightData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          // Identify key columns (latitude, longitude, altitude)
          const headers = results.meta.fields || [];
          
          // Process data rows
          const points: FlightPoint[] = results.data
            .filter((row: any) => row.latitude !== null && row.longitude !== null)
            .map((row: any) => {
              return {
                latitude: parseFloat(row.latitude) || 0,
                longitude: parseFloat(row.longitude) || 0,
                altitude: parseFloat(row.altitude) || 0,
                ...row
              };
            });
          
          resolve({
            headers,
            points
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * Convert flight points to GeoJSON format for MapLibre
 * @param points - Array of flight points
 * @returns GeoJSON FeatureCollection
 */
export const pointsToGeoJSON = (points: FlightPoint[]): any => {
  // Create line string from points
  const lineString = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: points.map(point => [
            point.longitude,
            point.latitude,
            point.altitude
          ])
        }
      }
    ]
  };

  // Create waypoints from points
  const waypoints = {
    type: 'FeatureCollection',
    features: points.map((point, index) => ({
      type: 'Feature',
      properties: {
        id: index + 1,
        altitude: point.altitude,
        ...point
      },
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude, point.altitude]
      }
    }))
  };

  return { lineString, waypoints };
};