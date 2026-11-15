import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_VIEW = [20.5937, 78.9629];
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function MapViewport({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, Math.max(map.getZoom(), 14));
    }
  }, [center, map]);

  return null;
}

function MapClickListener({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.([event.latlng.lat, event.latlng.lng]);
    }
  });

  return null;
}

export default function FarmLocationMap({
  center,
  boundaryPath = [],
  onCenterChange,
  onMapClick,
  overlays = [],
  selectedOverlayId = "",
  onOverlaySelect,
  interactive = true,
  showHint = true
}) {
  const mapCenter = center || INDIA_VIEW;

  return (
    <div className="farm-location-map-wrap">
      <MapContainer
        center={mapCenter}
        zoom={center ? 14 : 5}
        scrollWheelZoom
        className="farm-location-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport center={center} />
        <MapClickListener onMapClick={onMapClick} />
        {center && (
          <Marker
            position={center}
            icon={markerIcon}
            draggable={interactive}
            eventHandlers={{
              dragend(event) {
                const position = event.target.getLatLng();
                onCenterChange?.([position.lat, position.lng]);
              }
            }}
          />
        )}
        {boundaryPath.length >= 3 && (
          <Polygon positions={boundaryPath} pathOptions={{ color: "#27864b", fillOpacity: 0.2 }} />
        )}
        {overlays.map((overlay) => (
          overlay.path?.length >= 3 ? (
            <Polygon
              key={overlay.id}
              positions={overlay.path}
              pathOptions={{
                color: overlay.id === selectedOverlayId ? "#1f7540" : "#748197",
                fillOpacity: overlay.id === selectedOverlayId ? 0.32 : 0.14
              }}
              eventHandlers={{
                click: () => onOverlaySelect?.(overlay.id)
              }}
            >
              <Tooltip sticky>{overlay.label}</Tooltip>
            </Polygon>
          ) : null
        ))}
      </MapContainer>
      {!center && showHint && (
        <span className="farm-map-hint">Choose a point on the map or enter coordinates to mark your farm.</span>
      )}
    </div>
  );
}
