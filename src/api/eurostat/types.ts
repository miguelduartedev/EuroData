export interface EurostatDimension {
  category: {
    index: Record<string, number>;
    label?: Record<string, string>;
  };
}

export interface EurostatJsonStatDataset {
  id: string[];
  size: number[];
  dimension: Record<string, EurostatDimension>;
  value?: Record<string, number | null> | Array<number | null>;
  status?: Record<string, string> | Array<string | null>;
}

export interface MetricConfiguration {
  datasetId: string;
  filters: Record<string, string>;
  unit: string;
}
