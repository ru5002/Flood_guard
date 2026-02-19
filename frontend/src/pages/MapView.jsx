import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/mapview.css";

const MapView = () => {
  return (
    <div style={{ height: "100vh", position: "relative" }}>
      
      {/* STATUS CARD */}
      <div className="status-card">
        <span className="dot"></span>
        <strong>System Active</strong>
        <p>Monitoring Gampaha District</p>
        <small>Last update: Just now</small>
      </div>

      {/* MAP */}
      <MapContainer
        center={[7.0873, 79.9990]}
        zoom={9}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[7.0873, 79.9990]}>
          <Popup>Gampaha Monitoring Station</Popup>
        </Marker>
      </MapContainer>

    </div>
  );
};

export default MapView;
