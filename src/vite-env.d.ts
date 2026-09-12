/// <reference types="vite/client" />

declare module "*.json" {
  const value: GeoJSON.FeatureCollection;
  export default value;
}
