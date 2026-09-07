/// <reference types="vite/client" />

declare namespace GeoJSON {
  type Position = number[];
  interface Point { type: 'Point'; coordinates: Position; }
  interface Feature<G = Point, P = Record<string, unknown>> { type: 'Feature'; geometry: G; properties: P; }
  interface FeatureCollection<G = Point, P = Record<string, unknown>> { type: 'FeatureCollection'; features: Feature<G, P>[]; }
}
