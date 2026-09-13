import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapOccurrences } from '../api/hooks';

export const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { data } = useMapOccurrences();

  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Free OSM-based style
        center: [-49.9, -6.07],
        zoom: 12
      });
      map.current.addControl(new maplibregl.NavigationControl());
    }

    if (data?.records && map.current) {
      data.records.forEach((rec: any) => {
        const color = rec.status === 'OPEN' ? '#e43b3b' : rec.status === 'RESOLVED' ? '#2dbd69' : '#f29b32';
        
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
          `<h4>${rec.categoryCode}</h4><p>Status: ${rec.status}</p>`
        );

        new maplibregl.Marker({ color })
          .setLngLat([rec.lon, rec.lat])
          .setPopup(popup)
          .addTo(map.current!);
      });
    }
  }, [data]);

  return <div className="map-container" ref={mapContainer} />;
};
