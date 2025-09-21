
export type PointAttributeValue = string | number | boolean | null;

export interface FeaturePoint {
  id: string;
  lat: number;
  lon: number;
  alt: number;
  heading?: number;
  gimbalPitch?: number;
  [key: string]: any;
}

export type SelectionMode = 'single' | 'polygon' | 'all' | 'translate' | 'clear' | 'batch-edit' | 'attribute' | 'rotate';

export type ViewMode = 'side-by-side' | 'map-only' | 'attributes-only';

// --- Attribute Selection ---
export type FieldType = 'number' | 'string' | 'other';

export type FieldStats = {
  min?: number;
  max?: number;
  uniqueValues?: Set<string>;
};

export type SchemaField = {
  name: string;
  type: FieldType;
  stats: FieldStats;
};

export type DatasetSchema = {
  fields: SchemaField[];
};

export type AttributeOperator = 'between' | 'gte' | 'lte' | 'eq' | 'neq' | 'in';

export type AttributeQuery = {
  field: string;
  operator: AttributeOperator;
  value?: PointAttributeValue;
  min?: number;
  max?: number;
  values?: PointAttributeValue[];
};
