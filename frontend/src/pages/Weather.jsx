import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import '../styles/weather.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const RELEVANT_AREAS = [
    { name: 'Gampaha City', lat: 7.0873, lon: 79.9990, river: 'Aththanagalu Oya' },
    { name: 'Ja-Ela', lat: 7.0778, lon: 79.8919, river: 'Aththanagalu Oya lower basin' },
    { name: 'Attanagalla', lat: 7.1119, lon: 80.1330, river: 'Aththanagalu Oya upper basin' },
    { name: 'Nittambuwa', lat: 7.1430, lon: 80.0965, river: 'Aththanagalu Oya upper basin' },
    { name: 'Veyangoda', lat: 7.1517, lon: 80.0573, river: 'Aththanagalu Oya influence' },
    { name: 'Negombo', lat: 7.2083, lon: 79.8358, river: 'Maha Oya / lagoon area' },
    { name: 'Katunayake', lat: 7.1699, lon: 79.8884, river: 'Maha Oya / low-lying airport zone' },
    { name: 'Minuwangoda', lat: 7.1667, lon: 79.9500, river: 'Maha Oya catchment influence' },
    { name: 'Divulapitiya', lat: 7.2239, lon: 80.0150, river: 'Maha Oya catchment' },
    { name: 'Mirigama', lat: 7.2458, lon: 80.1347, river: 'Maha Oya upper catchment' },
    { name: 'Wattala', lat: 6.9892, lon: 79.8933, river: 'Kelani coastal floodplain' },
    { name: 'Kelaniya', lat: 6.9546, lon: 79.9173, river: 'Kelani Ganga' },
    { name: 'Peliyagoda', lat: 6.9631, lon: 79.8863, river: 'Kelani Ganga' },
    { name: 'Kiribathgoda', lat: 6.9749, lon: 79.9272, river: 'Kelani Ganga' },
    { name: 'Kadawatha', lat: 7.0019, lon: 79.9515, river: 'Kelani Ganga influence' },
    { name: 'Ragama', lat: 7.0307, lon: 79.9197, river: 'Kelani coastal floodplain' },
    { name: 'Biyagama', lat: 6.9408, lon: 79.9889, river: 'Kelani Ganga' },
    { name: 'Dompe', lat: 6.9463, lon: 80.0811, river: 'Kelani upper floodplain' },
];

const distanceKm = (a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (value) => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

const riskFromRainfall = (rainfall = 0, humidity = 0) => {
    if (rainfall >= 20) return 'Heavy rain';
    if (rainfall >= 8) return 'Rain increasing';
    if (rainfall >= 1) return 'Light rain';
    if (humidity >= 90) return 'Very humid';
    return 'Stable';
};

const Weather = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [weatherData, setWeatherData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [userCoords, setUserCoords] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserCoords({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            () => setUserCoords(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    }, []);

    const fetchWeatherData = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_BASE}/api/predictions/official-zones`, {
                timeout: 20000,
            });

            const officialRows = response.data?.predictions || [];
            const results = officialRows.map((row) => {
                const area = RELEVANT_AREAS.find((item) => item.name === row.location) || {
                    name: row.location,
                    lat: row.latitude,
                    lon: row.longitude,
                    river: row.mappedBasin,
                };
                const rainfall = Number(row.rainfall || 0);
                const humidity = Number(row.humidity || 0);

                return {
                    ...area,
                    lat: row.latitude ?? area.lat,
                    lon: row.longitude ?? area.lon,
                    river: row.mappedBasin || area.river,
                    temp: row.temperature == null ? null : Number(row.temperature),
                    condition: row.weatherCondition || 'Weather',
                    description: row.weatherCondition || row.prediction || 'Live weather reading',
                    humidity,
                    wind: row.windSpeed == null ? null : Number(row.windSpeed),
                    rainfall,
                    risk: riskFromRainfall(rainfall, humidity),
                    sourceFallback: row.rainfallSource !== 'OpenWeather current weather',
                    rainfallSource: row.rainfallSource,
                    forecastRain12h: row.forecastRain12h,
                    forecastSeverity: row.forecastSeverity,
                };
            });

            setWeatherData(results);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Weather fetch error:', err);
            setWeatherData([]);
            setError('Live weather data is unavailable right now. Please restart the backend or check the weather API connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeatherData();
        const interval = setInterval(fetchWeatherData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const filteredCities = useMemo(() => {
        const rows = weatherData
            .filter(city => city.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!userCoords) return rows.sort((a, b) => a.name.localeCompare(b.name));

        return rows
            .map(city => ({ ...city, distanceKm: distanceKm(userCoords, city) }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .map((city, index) => ({ ...city, isNearest: index === 0 }));
    }, [weatherData, searchTerm, userCoords]);

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="weather-page-container">
                <section className="weather-header">
                    <div className="weather-kicker">Live OpenWeather data for flood-relevant Gampaha zones</div>
                    <h1>Gampaha District Weather</h1>
                    <p>
                        Focused on the same areas used in FloodGuard predictions, so rainfall and wind data support the flood-risk view.
                    </p>

                    <div className="weather-actions">
                        <input
                            type="text"
                            placeholder="Search relevant area..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="refresh-weather" onClick={fetchWeatherData} disabled={loading}>
                            {loading ? 'Refreshing...' : 'Refresh Live'}
                        </button>
                    </div>

                    <div className="weather-status-row">
                        <span className="live-dot"></span>
                        {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Preparing live readings'}
                        {userCoords ? <span>Your nearest area is highlighted</span> : <span>Allow location to highlight your nearest area</span>}
                    </div>
                </section>

                {loading ? (
                    <div className="loading-container">
                        <p>Loading live weather data...</p>
                    </div>
                ) : error ? (
                    <div className="error-message">
                        <p>{error}</p>
                    </div>
                ) : (
                    <section className="weather-grid">
                        {filteredCities.map((city) => (
                            <article key={city.name} className={`weather-card ${city.isNearest ? 'nearest' : ''}`}>
                                <div className="weather-card-top">
                                    <div>
                                        <h2>{city.name}</h2>
                                        <p>{city.river}</p>
                                    </div>
                                    {city.isNearest && <span className="nearest-badge">Nearest</span>}
                                </div>

                                <div className="weather-main">
                                    <img
                                        src={`https://openweathermap.org/img/wn/${city.rainfall >= 8 ? '10d' : '04d'}@2x.png`}
                                        alt={city.condition}
                                        className="weather-icon"
                                    />
                                    <span className="temperature">{city.temp == null ? '--' : Math.round(city.temp)}&deg;C</span>
                                </div>

                                <p className="weather-desc">{city.description}</p>

                                <div className="weather-details">
                                    <div className="detail-item">
                                        <span>Rainfall</span>
                                        <strong>{city.rainfall.toFixed(1)} mm</strong>
                                    </div>
                                    <div className="detail-item">
                                        <span>Humidity</span>
                                        <strong>{city.humidity}%</strong>
                                    </div>
                                    <div className="detail-item">
                                        <span>Wind</span>
                                        <strong>{city.wind == null ? '--' : city.wind.toFixed(1)} m/s</strong>
                                    </div>
                                    <div className="detail-item">
                                        <span>Status</span>
                                        <strong>{city.risk}</strong>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {!loading && !error && filteredCities.length === 0 && (
                    <p className="empty-weather">No relevant area found for "{searchTerm}"</p>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Weather;
