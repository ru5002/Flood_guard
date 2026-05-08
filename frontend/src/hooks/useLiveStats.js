import { useState, useEffect } from 'react';
import axios from 'axios';

const OWM_KEY = 'bd5e378503939ddaee76f12ad7a97608'; // same key used in Weather page

// Default coords: Gampaha town centre
const DEFAULT_LAT = 7.084;
const DEFAULT_LON = 79.9997;

/**
 * useLiveStats hook
 * 1. Gets the user's browser geolocation (falls back to Gampaha centre)
 * 2. Fetches current weather from OpenWeatherMap
 * 3. Fetches the latest flood predictions from the backend
 * Returns { temp, condition, humidity, wind, location, riverStatus, floodRisk, loading }
 */
export default function useLiveStats() {
  const [stats, setStats] = useState({
    temp: 29,
    condition: 'Clouds',
    humidity: 76,
    wind: 3.5,
    rainfall: 0,
    location: 'Gampaha',
    riverStatus: 'Normal',
    floodRisk: 'Low',
    loading: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat, lon, apiKey) {
      // Try backend proxy first (no CORS issues, fastest)
      try {
        const res = await axios.get('/api/weather/current', {
          params: { lat, lon },
          timeout: 6000,
        });
        if (res.data?.temp !== undefined) return res.data;
      } catch (_) { /* ignore */ }

      // Fallback: direct OpenWeatherMap call
      try {
        const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
          params: { lat, lon, units: 'metric', appid: apiKey },
          timeout: 6000,
        });
        const w = res.data;
        return {
          temp: Math.round(w.main.temp),
          condition: w.weather?.[0]?.main || '',
          humidity: w.main.humidity,
          wind: w.wind?.speed,
          rainfall: w.rain?.['1h'] || w.rain?.['3h'] || 0,
          location: w.name || 'Gampaha',
        };
      } catch (e) {
        console.warn('OWM call failed:', e.message);
      }

      return null; // keep existing fallback values
    }

    async function fetchData(lat, lon) {
      try {
        let apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') apiKey = OWM_KEY;

        const [weatherResult, predRes, liveRes] = await Promise.allSettled([
          fetchWeather(lat, lon, apiKey),
          axios.get('/api/predictions/latest'),
          axios.get('/api/predictions/live')
        ]);

        if (cancelled) return;

        const update = { loading: false };

        // Weather
        if (weatherResult.status === 'fulfilled' && weatherResult.value) {
          const w = weatherResult.value;
          Object.assign(update, {
            temp: w.temp, condition: w.condition, humidity: w.humidity,
            wind: w.wind, rainfall: w.rainfall, location: w.location,
          });
        }

        // Live Predictions (Override for Map/Home)
        let liveRisk = null;
        if (liveRes.status === 'fulfilled' && liveRes.value && liveRes.value.data && liveRes.value.data.success) {
            liveRisk = liveRes.value.data.prediction?.prediction;
        }

        // Predictions
        if (predRes.status === 'fulfilled') {
          const preds = predRes.value.data?.predictions || [];
          if (preds.length) {
            const riskOrder = { Critical: 4, High: 3, Moderate: 2, Low: 1, None: 0 };
            
            // If live API is active and we are near Gampaha, incorporate it
            if (liveRisk && update.location === 'Gampaha') {
                update.floodRisk = liveRisk;
                update.riverStatus = 'Active';
            } else {
                const sorted = [...preds].sort(
                  (a, b) => (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0)
                );
                const top = sorted[0];
                update.floodRisk = top.riskLevel || 'Low';
                update.riverStatus = top.riverRisk || 'Normal';
                if (update.riverStatus === 'None') update.riverStatus = 'Normal';
            }
          }
        } else if (liveRisk && update.location === 'Gampaha') {
            update.floodRisk = liveRisk;
        } else if (predRes.status === 'rejected') {
            // Fallback state if API is completely unreachable
            update.floodRisk = 'High';
        }


        setStats(s => ({ ...s, ...update }));
      } catch (err) {
        console.error('useLiveStats error:', err);
      }
    }

    // Start fetching with defaults immediately
    fetchData(DEFAULT_LAT, DEFAULT_LON);

    // Also try geolocation in background — update if we get a better location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchData(pos.coords.latitude, pos.coords.longitude),
        () => {},  // already fetched with defaults above
        { timeout: 3000 }
      );
    }

    return () => { cancelled = true; };
  }, []);

  return stats;
}
