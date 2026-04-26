import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Zone, AllocationPlan } from '../store/useStore';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

interface ZoneMapProps {
  zones: Zone[];
  plan: AllocationPlan | null;
}

// Fix Leaflet's default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored icons based on priority
const createIcon = (color: string, isStale: boolean, isPlaceholder: boolean) => {
  if (isPlaceholder) {
    return new L.DivIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:#9ca3af; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold;">?</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  const borderStyle = isStale ? '2px dashed white' : '2px solid white';
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%; border:${borderStyle}; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

function BoundsUpdater({ zones }: { zones: Zone[] }) {
  const map = useMap();
  useEffect(() => {
    if (zones.length > 0) {
      const bounds = L.latLngBounds(zones.map(z => [z.lat, z.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zones, map]);
  return null;
}

export default function ZoneMap({ zones, plan }: ZoneMapProps) {
  const { t } = useTranslation();
  // Center roughly on Uttarakhand if zones empty
  const defaultCenter: [number, number] = [30.3, 78.0];

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer center={defaultCenter} zoom={8} className="h-full w-full rounded-lg overflow-hidden border border-slate-200">
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <BoundsUpdater zones={zones} />
        
        {zones.map(zone => {
          // Determine color based on priority score
          let baseColor = '#22c55e';
          if (zone.priorityScore >= 0.7) baseColor = '#ef4444';
          else if (zone.priorityScore >= 0.4) baseColor = '#f97316';

          const isPlaceholder = zone.data_source === 'placeholder';
          const isStale = zone.data_source === 'stale';
          const icon = createIcon(baseColor, isStale, isPlaceholder);

          // Find allocation if any
          const allocation = plan?.zoneAllocations.find(a => a.zoneId === zone.id);

          return (
            <Marker key={zone.id} position={[zone.lat, zone.lng]} icon={icon}>
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <h3 className="font-bold text-slate-800">{zone.name}</h3>
                  <div className="text-sm text-slate-600 mb-2">
                    {t('dashboard.priority_col')} <span className="font-semibold">{(zone.priorityScore).toFixed(2)}</span>
                  </div>
                  
                  {allocation ? (
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                      <p className="font-medium mb-1">{t('dashboard.allocated_resources')}</p>
                      <ul className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2 text-xs">
                        <li>{t('dashboard.food')} {allocation.assignedResources.food}</li>
                        <li>{t('dashboard.med')} {allocation.assignedResources.medicine}</li>
                        <li>{t('dashboard.shelter')} {allocation.assignedResources.shelterKits}</li>
                        <li>{t('dashboard.teams')} {allocation.assignedResources.rescueTeams}</li>
                      </ul>
                      <p className="text-xs text-slate-500 mb-2">
                        <strong>{t('dashboard.eta')}</strong> {allocation.estimatedETA} {t('sync.minutes_short')}
                      </p>
                      <p className="text-xs text-slate-700 italic border-l-2 border-blue-400 pl-2">
                        "{allocation.justification}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">{t('dashboard.no_allocation')}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
