import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HiOutlineMapPin } from 'react-icons/hi2';
import { DEFAULT_CENTER } from '../utils/constants';

/* Fix default marker icons in Vite/Webpack bundlers */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationMarker({ position, onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);
  return null;
}

export default function MapPicker({ onLocationSelect, initialPosition }) {
  const [position, setPosition] = useState(initialPosition || null);
  const [locating, setLocating] = useState(false);

  const handleSelect = async (lat, lng) => {
    setPosition([lat, lng]);
    let address = '';
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      );
      const data = await res.json();
      address = data.display_name || '';
    } catch {
      address = '';
    }
    onLocationSelect(lat, lng, address);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSelect(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={getCurrentLocation}
        disabled={locating}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
      >
        <HiOutlineMapPin className="h-5 w-5" />
        {locating ? 'جاري تحديد الموقع...' : 'موقعي الحالي'}
      </button>

      <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={initialPosition || DEFAULT_CENTER}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onLocationSelect={handleSelect} />
          <FlyToLocation position={position} />
        </MapContainer>
      </div>

      {position && (
        <p className="text-xs text-slate-400">
          الإحداثيات: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}
