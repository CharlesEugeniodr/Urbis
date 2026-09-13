import React from 'react';
import { Lightbulb, Droplets, Zap, ShieldAlert, Car, Map as MapIcon, HelpCircle } from 'lucide-react';

export const CategoryIcon = ({ code, size = 20 }: { code: string, size?: number }) => {
  switch (code) {
    case 'LIGHTING': return <Lightbulb size={size} />;
    case 'WATER': return <Droplets size={size} />;
    case 'ENERGY': return <Zap size={size} />;
    case 'TRAFFIC_SIGNAL': return <Car size={size} />;
    case 'PAVEMENT': return <MapIcon size={size} />;
    case 'RESILIENCE': return <ShieldAlert size={size} />;
    default: return <HelpCircle size={size} />;
  }
};
