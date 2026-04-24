import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* Fix marker icons with Vite bundling */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function InteractiveOrderMap({ latitude, longitude, customerName }) {
  if (!latitude || !longitude) return null;

  const center = [Number(latitude), Number(longitude)];

  return (
    <div className="h-56 overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
      <MapContainer center={center} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle center={center} radius={120} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.2 }} />
        <Marker position={center}>
          <Popup>
            موقع العميل: {customerName || 'عميل'}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
