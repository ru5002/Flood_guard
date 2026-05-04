import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

// Fix for missing marker icons in react-leaflet
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const gampahaCenter = [7.0917, 79.9997];

const gampahaAreas = [
  { name: "Gampaha", lat: 7.091, lng: 79.993 },
  { name: "Negombo", lat: 7.208, lng: 79.835 },
  { name: "Minuwangoda", lat: 7.167, lng: 79.953 },
  { name: "Wattala", lat: 6.989, lng: 79.889 },
  { name: "Ja-Ela", lat: 7.0766, lng: 79.8907 },
  { name: "Kelaniya", lat: 6.9538, lng: 79.9149 }
];

const DEFAULT_WEATHER_API_KEY = 'bd5e378503939ddaee76f12ad7a97608'; 

const MOCK_MAP_DATA = {
    "Gampaha": { temp: 30, condition: "Clear", description: "clear sky", humidity: 70, icon: "01d" },
    "Negombo": { temp: 29, condition: "Clouds", description: "scattered clouds", humidity: 75, icon: "03d" },
    "Minuwangoda": { temp: 28, condition: "Rain", description: "light rain", humidity: 82, icon: "10d" },
    "Wattala": { temp: 29, condition: "Clouds", description: "broken clouds", humidity: 78, icon: "04d" },
    "Ja-Ela": { temp: 28, condition: "Thunderstorm", description: "thunderstorm", humidity: 85, icon: "11d" },
    "Kelaniya": { temp: 30, condition: "Clear", description: "clear sky", humidity: 68, icon: "01d" }
};

export default function GamapahaWeatherMap() {
  const [locations, setLocations] = useState(
    gampahaAreas.map(area => ({ ...area, temp: null, condition: null, description: null, humidity: null, icon: null }))
  );

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      let apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
      if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
          apiKey = DEFAULT_WEATHER_API_KEY;
      }

      const updatedLocations = await Promise.all(
        gampahaAreas.map(async (area) => {
          try {
            const response = await axios.get(
              "https://api.openweathermap.org/data/2.5/weather",
              {
                params: {
                  lat: area.lat,
                  lon: area.lng,
                  units: "metric",
                  appid: apiKey
                }
              }
            );
            return {
              ...area,
              temp: Math.round(response.data.main.temp),
              condition: response.data.weather[0].main,
              description: response.data.weather[0].description,
              humidity: response.data.main.humidity,
              icon: `http://openweathermap.org/img/w/${response.data.weather[0].icon}.png`
            };
          } catch (error) {
            console.error(`Failed to fetch weather for ${area.name}:`, error);
            const mock = MOCK_MAP_DATA[area.name] || { temp: 28, condition: "Clouds", description: "scattered clouds", humidity: 75, icon: "03d" };
            return {
                ...area,
                temp: mock.temp,
                condition: mock.condition,
                description: mock.description,
                humidity: mock.humidity,
                icon: `http://openweathermap.org/img/w/${mock.icon}.png`
            };
          }
        })
      );
      if (isMounted) setLocations(updatedLocations);
    };

    fetchWeather();
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
      <MapContainer
        center={gampahaCenter}
        zoom={11}
        style={{ width: "100%", height: "100%", minHeight: "500px" }}
      >
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc, index) => (
            <Marker key={index} position={[loc.lat, loc.lng]}>
                <Popup>
                    <div style={{ textAlign: "center", minWidth: "120px", fontFamily: "inherit" }}>
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#111" }}>{loc.name}</h3>
                        {loc.temp !== null ? (
                            <>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px" }}>
                                    {loc.icon && (
                                        <img 
                                            src={loc.icon} 
                                            alt={loc.condition} 
                                            style={{ width: "40px", height: "40px" }} 
                                        />
                                    )}
                                    <span style={{ fontSize: "24px", fontWeight: "300", color: "#111", marginLeft: "4px" }}>
                                        {loc.temp}°C
                                    </span>
                                </div>
                                <div style={{ textTransform: "capitalize", fontSize: "12px", color: "#666", marginBottom: "2px" }}>
                                    {loc.description}
                                </div>
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                    <strong>Humidity:</strong> {loc.humidity}%
                                </div>
                            </>
                        ) : (
                            <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>Loading...</p>
                        )}
                    </div>
                </Popup>
            </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
