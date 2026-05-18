import { useEffect, useState } from 'react';
import axios from 'axios';

const OWM_KEY = 'bd5e378503939ddaee76f12ad7a97608';
const DEFAULT_LAT = 7.084;
const DEFAULT_LON = 79.9997;
const API_BASE = import.meta.env.VITE_API_URL || '';

const RISK_ORDER = {
  Unknown: -1,
  None: 0,
  Low: 1,
  Moderate: 2,
  High: 3,
  Critical: 4,
};

const normalizeLocation = (value = '') =>
  String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const sameLocation = (left = '', right = '') => {
  const a = normalizeLocation(left);
  const b = normalizeLocation(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
};

const highestRisk = (...risks) =>
  risks
    .filter((risk) => risk && RISK_ORDER[risk] !== undefined)
    .sort((a, b) => RISK_ORDER[b] - RISK_ORDER[a])[0] || 'None';

const getRegisteredLocation = () => {
  try {
    const user = JSON.parse(localStorage.getItem('userData') || 'null');
    return user?.zone || user?.address || '';
  } catch {
    return '';
  }
};

const distanceKm = (lat, lon, item) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !item?.latitude || !item?.longitude) {
    return Infinity;
  }
  const toRad = (value) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(item.latitude - lat);
  const dLon = toRad(item.longitude - lon);
  const lat1 = toRad(lat);
  const lat2 = toRad(item.latitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

const pickRelevantPrediction = (predictions = [], preferredLocation, lat, lon) => {
  if (!predictions.length) return null;

  if (preferredLocation) {
    const matched = predictions.find((item) => sameLocation(item.location, preferredLocation));
    if (matched) return matched;
  }

  const gampaha = predictions.find((item) => sameLocation(item.location, 'Gampaha'));
  if (gampaha) return gampaha;

  const nearest = [...predictions]
    .sort((a, b) => distanceKm(lat, lon, a) - distanceKm(lat, lon, b))[0];

  return nearest || predictions[0];
};

const parseLiveRisk = (liveData) =>
  liveData?.prediction?.current?.riskLevel
  || liveData?.prediction?.day1?.riskLevel
  || liveData?.irrigationSnapshot?.officialRisk
  || null;

const initialStats = {
  temp: null,
  condition: '',
  humidity: null,
  wind: null,
  rainfall: 0,
  location: getRegisteredLocation() || 'Gampaha',
  riverStatus: 'Checking',
  floodRisk: 'Unknown',
  riskSource: 'Checking live data',
  loading: true,
};

let sharedStats = initialStats;
let pollingStarted = false;
let requestInFlight = null;
const listeners = new Set();

const publishStats = (update) => {
  sharedStats = { ...sharedStats, ...update };
  listeners.forEach((listener) => listener(sharedStats));
};

async function fetchWeather(lat, lon, apiKey) {
  try {
    const res = await axios.get(`${API_BASE}/api/weather/current`, {
      params: { lat, lon },
      timeout: 6000,
    });
    if (res.data?.temp !== undefined) return res.data;
  } catch {
    // Fall back to direct OpenWeather below.
  }

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
  } catch (err) {
    console.warn('Weather lookup failed:', err.message);
  }

  return null;
}

async function fetchLiveStats(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    try {
      let apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
      if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') apiKey = OWM_KEY;

      const preferredLocation = getRegisteredLocation();

      const [weatherResult, zoneResult, liveResult, latestResult] = await Promise.allSettled([
        fetchWeather(lat, lon, apiKey),
        axios.get(`${API_BASE}/api/predictions/official-zones?_t=${Date.now()}`, { timeout: 9000 }),
        axios.get(`${API_BASE}/api/predictions/live?_t=${Date.now()}`, { timeout: 9000 }),
        axios.get(`${API_BASE}/api/predictions/latest?_t=${Date.now()}`, { timeout: 9000 }),
      ]);

      const update = {
        loading: false,
        location: preferredLocation || 'Gampaha',
      };

      if (weatherResult.status === 'fulfilled' && weatherResult.value) {
        const weather = weatherResult.value;
        Object.assign(update, {
          temp: weather.temp,
          condition: weather.condition,
          humidity: weather.humidity,
          wind: weather.wind,
          rainfall: weather.rainfall,
          location: preferredLocation || weather.location || 'Gampaha',
        });
      }

      const zonePredictions = zoneResult.status === 'fulfilled'
        ? zoneResult.value.data?.predictions || []
        : [];
      const latestPredictions = latestResult.status === 'fulfilled'
        ? latestResult.value.data?.predictions || []
        : [];
      const zonePrediction = pickRelevantPrediction(zonePredictions, preferredLocation, lat, lon);
      const latestPrediction = pickRelevantPrediction(latestPredictions, preferredLocation, lat, lon);
      const liveRisk = liveResult.status === 'fulfilled' && liveResult.value.data?.success
        ? parseLiveRisk(liveResult.value.data)
        : null;

      const zoneRisk = zonePrediction?.riskLevel || null;
      const latestRisk = latestPrediction?.riskLevel || null;
      const shouldBlendLiveRisk = !zonePrediction
        || sameLocation(zonePrediction.location, 'Gampaha')
        || sameLocation(zonePrediction.location, 'Gampaha City')
        || sameLocation(zonePrediction.location, 'Dunamale')
        || sameLocation(preferredLocation, 'Gampaha')
        || sameLocation(preferredLocation, 'Dunamale');

      const floodRisk = zonePrediction
        ? highestRisk(zoneRisk, shouldBlendLiveRisk ? liveRisk : null)
        : highestRisk(shouldBlendLiveRisk ? liveRisk : null, latestRisk);

      const sourcePrediction = zonePrediction || latestPrediction;
      Object.assign(update, {
        floodRisk,
        riverStatus: sourcePrediction?.riverRisk || liveRisk || floodRisk,
        riskSource: sourcePrediction?.source || (liveRisk ? 'Live prediction' : 'Latest prediction'),
        location: preferredLocation || sourcePrediction?.location || update.location || 'Gampaha',
        rainfall: sourcePrediction?.rainfall ?? sourcePrediction?.rainfallMm ?? update.rainfall ?? 0,
      });

      publishStats(update);
    } catch (err) {
      console.error('useLiveStats error:', err);
      publishStats({
        loading: false,
        floodRisk: 'Unknown',
        riverStatus: 'Unavailable',
        riskSource: 'Live risk data unavailable',
      });
    } finally {
      requestInFlight = null;
    }
  })();

  return requestInFlight;
}

const startPolling = () => {
  if (pollingStarted) return;
  pollingStarted = true;

  fetchLiveStats(DEFAULT_LAT, DEFAULT_LON);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchLiveStats(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { timeout: 3000, maximumAge: 30000 }
    );
  }

  setInterval(() => fetchLiveStats(DEFAULT_LAT, DEFAULT_LON), 60000);
};

export default function useLiveStats() {
  const [stats, setStats] = useState(sharedStats);

  useEffect(() => {
    listeners.add(setStats);
    setStats(sharedStats);
    startPolling();

    return () => {
      listeners.delete(setStats);
    };
  }, []);

  return stats;
}
