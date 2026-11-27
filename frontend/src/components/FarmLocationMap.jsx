import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
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

const vertexIcon = L.divIcon({
  className: "custom-vertex-handle",
  html: `<div style="width:12px;height:12px;background:#15803d;border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.4);cursor:grab;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const walkingPointIcon = L.divIcon({
  className: "custom-walking-handle",
  html: `<div style="width:10px;height:10px;background:#3b82f6;border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,0.4);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

function MapViewport({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, Math.max(map.getZoom(), 14));
    }
  }, [center, map]);

  return null;
}

function MapClickListener({ onMapClick, enabled = true }) {
  useMapEvents({
    click(event) {
      if (enabled) {
        onMapClick?.([event.latlng.lat, event.latlng.lng]);
      }
    }
  });

  return null;
}

export default function FarmLocationMap({
  center,
  boundaryPath = [],
  onCenterChange,
  onMapClick,
  onVertexMove,
  overlays = [],
  selectedOverlayId = "",
  onOverlaySelect,
  interactive = true,
  drawingMode = false,
  showHint = true,
  mapType = "standard", // "standard" or "satellite"
  onMapTypeToggle
}) {
  const [activeLayer, setActiveLayer] = useState(mapType);
  const mapCenter = center && Number.isFinite(center[0]) && Number.isFinite(center[1]) ? center : INDIA_VIEW;

  useEffect(() => {
    if (mapType) setActiveLayer(mapType);
  }, [mapType]);

  const toggleLayer = (layer) => {
    setActiveLayer(layer);
    onMapTypeToggle?.(layer);
  };

  return (
    <div className="farm-location-map-wrap" style={{ position: "relative" }}>
      {/* Map Layer Switcher (Standard vs Satellite) */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1000,
        display: "flex",
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "6px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        overflow: "hidden",
        border: "1px solid #cbd5e1"
      }}>
        <button
          type="button"
          onClick={() => toggleLayer("standard")}
          style={{
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: "600",
            border: "none",
            background: activeLayer === "standard" ? "#166534" : "#ffffff",
            color: activeLayer === "standard" ? "#ffffff" : "#475569",
            cursor: "pointer"
          }}
        >
          🗺 Standard Map
        </button>
        <button
          type="button"
          onClick={() => toggleLayer("satellite")}
          style={{
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: "600",
            border: "none",
            borderLeft: "1px solid #cbd5e1",
            background: activeLayer === "satellite" ? "#166534" : "#ffffff",
            color: activeLayer === "satellite" ? "#ffffff" : "#475569",
            cursor: "pointer"
          }}
        >
          🛰 Satellite View
        </button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={center ? 15 : 5}
        scrollWheelZoom
        className="farm-location-map"
      >
        {activeLayer === "satellite" ? (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        <MapViewport center={center} />
        <MapClickListener onMapClick={onMapClick} enabled={interactive} />

        {/* Center / Location Marker */}
        {center && Number.isFinite(center[0]) && Number.isFinite(center[1]) && !drawingMode && (
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

        {/* Drawn Polygon Boundary */}
        {boundaryPath.length >= 3 && (
          <Polygon
            positions={boundaryPath}
            pathOptions={{
              color: "#16a34a",
              fillColor: "#22c55e",
              fillOpacity: 0.25,
              weight: 2
            }}
          />
        )}

        {/* Unclosed Boundary Polyline (when fewer than 3 points or while drawing) */}
        {boundaryPath.length >= 2 && boundaryPath.length < 3 && (
          <Polyline
            positions={boundaryPath}
            pathOptions={{ color: "#16a34a", dashArray: "6, 6", weight: 2 }}
          />
        )}

        {/* Vertex Markers for boundary editing */}
        {interactive && boundaryPath.map((pt, idx) => (
          <Marker
            key={`vertex-${idx}`}
            position={pt}
            icon={drawingMode ? walkingPointIcon : vertexIcon}
            draggable={interactive}
            eventHandlers={{
              dragend(event) {
                const pos = event.target.getLatLng();
                onVertexMove?.(idx, [pos.lat, pos.lng]);
              }
            }}
          />
        ))}

        {/* Plot Overlays (Digital Twin & multiple plots) */}
        {overlays.map((overlay) => (
          overlay.path?.length >= 3 ? (
            <Polygon
              key={overlay.id}
              positions={overlay.path}
              pathOptions={{
                color: overlay.id === selectedOverlayId ? "#16a34a" : "#64748b",
                fillColor: overlay.id === selectedOverlayId ? "#22c55e" : "#94a3b8",
                fillOpacity: overlay.id === selectedOverlayId ? 0.35 : 0.15,
                weight: overlay.id === selectedOverlayId ? 3 : 1
              }}
              eventHandlers={{
                click: () => onOverlaySelect?.(overlay.id)
              }}
            >
              <Tooltip sticky>
                <div>
                  <strong>{overlay.label}</strong>
                  {overlay.crop && <div>Crop: {overlay.crop}</div>}
                  {overlay.area && <div>Area: {overlay.area} {overlay.areaUnit || "acres"}</div>}
                </div>
              </Tooltip>
            </Polygon>
          ) : null
        ))}
      </MapContainer>

      {!center && showHint && (
        <span className="farm-map-hint">Click on the map or enter coordinates to mark your farm location.</span>
      )}
    </div>
  );
}
