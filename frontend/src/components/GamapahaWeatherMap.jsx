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
            return { ...area, temp: "N/A" };
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
                <div style={{ padding: "10px", textAlign: "center", minWidth: "150px" }}>
                    <h3 style={{ margin: "0 0 8px 0", color: "#333", borderBottom: '1px solid #eee', paddingBottom: '5px' }}>{selectedLocation.name}</h3>
                    {selectedLocation.temp !== null ? (
                        <>
                             {/* Flex container for Icon and Temp */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "5px" }}>
                                {selectedLocation.icon && (
                                    <img 
                                        src={selectedLocation.icon} 
                                        alt={selectedLocation.condition} 
                                        style={{ width: "50px", height: "50px" }} 
                                    />
                                )}
                                <span style={{ fontSize: "32px", fontWeight: "bold", color: "#000", marginLeft: "10px" }}>
                                    {selectedLocation.temp}°C
                                </span>
                            </div>
                            <div style={{ textTransform: "capitalize", fontSize: "14px", color: "#555", marginBottom: "4px" }}>
                                {selectedLocation.description}
                            </div>
                            <div style={{ fontSize: "13px", color: "#777" }}>
                                Humidity: <strong>{selectedLocation.humidity}%</strong>
                            </div>
                        </>
                    ) : (
                        <div style={{padding: '10px'}}>Loading weather data...</div>
                    )}
                </div>
            </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}

