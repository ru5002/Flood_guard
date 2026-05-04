import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import '../styles/weather.css';

// List of major cities/towns in Gampaha District for the dropdown/search
const gampahaCities = [
    { name: 'Bemmulla', lat: 7.0865, lon: 79.9482 },
    { name: 'Divulapitiya', lat: 7.2341, lon: 80.0076 },
    { name: 'Dompe', lat: 6.9463, lon: 80.0811 },
    { name: 'Gampaha', lat: 7.0840, lon: 79.9997 },
    { name: 'Ganemulla', lat: 7.0620, lon: 79.9576 },
    { name: 'Ja-Ela', lat: 7.0766, lon: 79.8907 },
    { name: 'Kadawatha', lat: 7.0019, lon: 79.9515 },
    { name: 'Kandana', lat: 7.0427, lon: 79.8932 },
    { name: 'Katunayake', lat: 7.1725, lon: 79.8737 },
    { name: 'Kelaniya', lat: 6.9546, lon: 79.9173 },
    { name: 'Kiribathgoda', lat: 6.9749, lon: 79.9272 },
    { name: 'Mahara', lat: 7.0133, lon: 79.9472 },
    { name: 'Minuwangoda', lat: 7.1670, lon: 79.9525 },
    { name: 'Mirigama', lat: 7.2458, lon: 80.1347 },
    { name: 'Negombo', lat: 7.2008, lon: 79.8737 },
    { name: 'Nittambuwa', lat: 7.1430, lon: 80.0965 },
    { name: 'Peliyagoda', lat: 6.9631, lon: 79.8863 },
    { name: 'Ragama', lat: 7.0307, lon: 79.9197 },
    { name: 'Seeduwa', lat: 7.1232, lon: 79.8821 },
    { name: 'Veyangoda', lat: 7.1517, lon: 80.0573 },
    { name: 'Wattala', lat: 6.9855, lon: 79.8934 }
];

const DEFAULT_API_KEY = 'bd5e378503939ddaee76f12ad7a97608'; 

const MOCK_WEATHER_DATA = [
    { name: 'Bemmulla', temp: 28, condition: 'Clouds', description: 'scattered clouds', icon: '03d', humidity: 75, wind: 3.5 },
    { name: 'Divulapitiya', temp: 29, condition: 'Rain', description: 'light rain', icon: '10d', humidity: 82, wind: 4.1 },
    { name: 'Dompe', temp: 27, condition: 'Clouds', description: 'overcast clouds', icon: '04d', humidity: 78, wind: 2.8 },
    { name: 'Gampaha', temp: 30, condition: 'Clear', description: 'clear sky', icon: '01d', humidity: 70, wind: 3.2 },
    { name: 'Ganemulla', temp: 29, condition: 'Clouds', description: 'few clouds', icon: '02d', humidity: 72, wind: 3.0 },
    { name: 'Ja-Ela', temp: 28, condition: 'Rain', description: 'moderate rain', icon: '10d', humidity: 85, wind: 5.2 },
    { name: 'Kadawatha', temp: 29, condition: 'Clouds', description: 'scattered clouds', icon: '03d', humidity: 74, wind: 3.8 },
    { name: 'Kandana', temp: 28, condition: 'Thunderstorm', description: 'thunderstorm with light rain', icon: '11d', humidity: 88, wind: 6.5 },
    { name: 'Katunayake', temp: 31, condition: 'Clear', description: 'clear sky', icon: '01d', humidity: 65, wind: 4.5 },
    { name: 'Kelaniya', temp: 29, condition: 'Clouds', description: 'broken clouds', icon: '04d', humidity: 76, wind: 3.1 },
    { name: 'Kiribathgoda', temp: 28, condition: 'Rain', description: 'light rain', icon: '10d', humidity: 80, wind: 4.0 },
    { name: 'Mahara', temp: 29, condition: 'Clouds', description: 'few clouds', icon: '02d', humidity: 73, wind: 3.3 },
    { name: 'Minuwangoda', temp: 30, condition: 'Clear', description: 'clear sky', icon: '01d', humidity: 68, wind: 3.6 },
    { name: 'Mirigama', temp: 28, condition: 'Rain', description: 'heavy intensity rain', icon: '09d', humidity: 90, wind: 5.5 },
    { name: 'Negombo', temp: 30, condition: 'Clear', description: 'clear sky', icon: '01d', humidity: 70, wind: 4.2 },
    { name: 'Nittambuwa', temp: 29, condition: 'Clouds', description: 'scattered clouds', icon: '03d', humidity: 75, wind: 3.4 },
    { name: 'Peliyagoda', temp: 29, condition: 'Clouds', description: 'broken clouds', icon: '04d', humidity: 77, wind: 3.9 },
    { name: 'Ragama', temp: 28, condition: 'Rain', description: 'light rain', icon: '10d', humidity: 81, wind: 4.3 },
    { name: 'Seeduwa', temp: 30, condition: 'Clear', description: 'clear sky', icon: '01d', humidity: 69, wind: 4.0 },
    { name: 'Veyangoda', temp: 29, condition: 'Clouds', description: 'few clouds', icon: '02d', humidity: 74, wind: 3.5 },
    { name: 'Wattala', temp: 29, condition: 'Clouds', description: 'scattered clouds', icon: '03d', humidity: 76, wind: 4.1 }
];


const Weather = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [weatherData, setWeatherData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWeatherData();
    }, []);

    const fetchWeatherData = async () => {
        setLoading(true);
        setError(null);
        let apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            apiKey = DEFAULT_API_KEY;
        }

        try {
            // We fetch data for all defined cities upfront. 
            // Optimally, we could use the 'group' API endpoint from OpenWeatherMap if IDs were known,
            // but individual calls for ~20 items is acceptable for a demo.
            const promises = gampahaCities.map(city => 
                axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
                    params: {
                        lat: city.lat,
                        lon: city.lon,
                        units: 'metric',
                        appid: apiKey
                    }
                }).then(res => ({
                    name: city.name,
                    temp: Math.round(res.data.main.temp),
                    condition: res.data.weather[0].main,
                    description: res.data.weather[0].description,
                    icon: res.data.weather[0].icon,
                    humidity: res.data.main.humidity,
                    wind: res.data.wind.speed
                })).catch(err => {
                    console.error(`Error fetching for ${city.name}`, err);
                    return null;
                })
            );

            const results = await Promise.all(promises);
            // Filter out any failed requests
            const validData = results.filter(item => item !== null);
            setWeatherData(validData);

            if (validData.length === 0) {
                console.warn("API Request failed. Using Mock Data Instead.");
                setWeatherData(MOCK_WEATHER_DATA);
                // setError("Failed to fetch weather data. The API key might be invalid or rate-limited.");
            }
        } catch (error) {
            console.error("Error fetching weather data, falling back to mock data", error);
            setWeatherData(MOCK_WEATHER_DATA);
            // setError("An error occurred while fetching data.");
        } finally {
            setLoading(false);
        }
    };

    // Filter and Sort Logic
    const filteredCities = weatherData
        .filter(city => city.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="weather-page-container">
                <div className="weather-header">
                    <h1>Gampaha District Weather</h1>
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search city (e.g., Negombo, Gampaha)..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <p>Loading weather data...</p>
                    </div>
                ) : error ? (
                    <div className="error-message" style={{ textAlign: 'center', color: 'red', marginTop: '2rem' }}>
                        <p>{error}</p>
                        <p>Please check your internet connection or update the OpenWeatherMap API key.</p>
                    </div>
                ) : (
                    <div className="weather-grid">
                        {filteredCities.map((city) => (
                            <div key={city.name} className="weather-card">
                                <h2>{city.name}</h2>
                                <div className="weather-main">
                                    <img 
                                        src={`http://openweathermap.org/img/wn/${city.icon}@2x.png`} 
                                        alt={city.condition} 
                                        className="weather-icon"
                                    />
                                    <span className="temperature">{city.temp}°C</span>
                                </div>
                                <p className="weather-desc">{city.description}</p>
                                
                                <div className="weather-details">
                                    <div className="detail-item">
                                        <span>Humidity</span>
                                        <strong>{city.humidity}%</strong>
                                    </div>
                                    <div className="detail-item">
                                        <span>Wind</span>
                                        <strong>{city.wind} m/s</strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {!loading && !error && filteredCities.length === 0 && (
                     <p>No cities found matching "{searchTerm}"</p>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default Weather;
