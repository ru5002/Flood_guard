import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// Center focused on Gampaha District
const gampahaCenter = {
  lat: 7.0917,
  lng: 79.9997,
};

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
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
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
      setLocations(updatedLocations);
    };

    fetchWeather();
  }, []);

  return (
    <LoadScript googleMapsApiKey="AIzaSyBdleQbPDLVo0yDo80U3p-pFu8-BP_7Tjc">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={gampahaCenter}
        zoom={11}
        options={{
          disableDefaultUI: true,
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }],
            },
            {
              featureType: "water",
              elementType: "geometry.fill",
              stylers: [{ color: "#cce0ff" }],
            },
            {
              elementType: "labels.text.fill",
              stylers: [{ color: "#000000" }],
            },
          ],
        }}
      >
        {locations.map((loc, index) => (
            <Marker
                key={index}
                position={{ lat: loc.lat, lng: loc.lng }}
                onClick={() => setSelectedLocation(loc)}
                title={loc.name}
            />
        ))}

        {selectedLocation && (
            <InfoWindow
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                onCloseClick={() => setSelectedLocation(null)}
            >
                <div style={{ padding: "12px 14px", textAlign: "center", minWidth: "160px", fontFamily: "'Inter', system-ui, sans-serif" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "600", color: "#111827", borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', letterSpacing: '-0.01em' }}>{selectedLocation.name}</h3>
                    {selectedLocation.temp !== null ? (
                        <>
                             {/* Flex container for Icon and Temp */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                                {selectedLocation.icon && (
                                    <img 
                                        src={selectedLocation.icon} 
                                        alt={selectedLocation.condition} 
                                        style={{ width: "48px", height: "48px" }} 
                                    />
                                )}
                                <span style={{ fontSize: "28px", fontWeight: "300", color: "#111827", marginLeft: "8px", letterSpacing: "-0.04em" }}>
                                    {selectedLocation.temp}°C
                                </span>
                            </div>
                            <div style={{ textTransform: "capitalize", fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                                {selectedLocation.description}
                            </div>
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                                Humidity: <strong style={{ color: "#374151" }}>{selectedLocation.humidity}%</strong>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: '10px', color: '#9ca3af', fontSize: '13px' }}>Loading weather data...</div>
                    )}
                </div>
            </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}

