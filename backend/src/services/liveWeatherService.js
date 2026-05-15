const OPENWEATHER_CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

const weatherApiKey = () =>
  process.env.OPENWEATHER_API_KEY ||
  process.env.OPENWEATHER_KEY ||
  'bd5e378503939ddaee76f12ad7a97608';

const roundCoord = (value) => Number(value).toFixed(4);

const cacheKey = (...parts) => parts.join(':');

const getCached = async (key, loader) => {
  const existing = cache.get(key);
  if (existing && Date.now() - existing.savedAt < CACHE_TTL_MS) {
    return { ...existing.value, cache: 'hit' };
  }

  const value = await loader();
  cache.set(key, { savedAt: Date.now(), value });
  return { ...value, cache: 'miss' };
};

const withTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`OpenWeather returned HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchCurrentWeather = async (lat, lon) => {
  const key = cacheKey('current', roundCoord(lat), roundCoord(lon));

  return getCached(key, async () => {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units: 'metric',
      appid: weatherApiKey(),
    });
    const data = await withTimeout(`${OPENWEATHER_CURRENT_URL}?${params}`);

    return {
      temp: Number(data.main?.temp || 0),
      condition: data.weather?.[0]?.main || '',
      description: data.weather?.[0]?.description || data.weather?.[0]?.main || 'weather unavailable',
      humidity: Number(data.main?.humidity || 0),
      wind: Number(data.wind?.speed || 0),
      rainfall: Number(data.rain?.['1h'] || data.rain?.['3h'] || 0),
      location: data.name || 'Gampaha',
      source: 'OpenWeather current weather',
      fetchedAt: new Date().toISOString(),
    };
  });
};

const totalRainForWindow = (items, hoursAhead) => {
  const cutoff = Date.now() + hoursAhead * 60 * 60 * 1000;
  const relevant = items.filter((item) => new Date(item.dt_txt).getTime() <= cutoff);
  return relevant.reduce((sum, item) => sum + Number(item.rain?.['3h'] || 0), 0);
};

const summarizeForecast = (items, hoursAhead = 12) => {
  const cutoff = Date.now() + hoursAhead * 60 * 60 * 1000;
  const upcoming = items.filter((item) => new Date(item.dt_txt).getTime() <= cutoff);
  const relevant = upcoming.length ? upcoming : items.slice(0, Math.ceil(hoursAhead / 3));

  const totalRainMm = totalRainForWindow(items, hoursAhead);
  const rainNext3h = totalRainForWindow(items, 3);
  const rainNext6h = totalRainForWindow(items, 6);
  const rainNext12h = totalRainForWindow(items, 12);
  const maxPop = Math.max(...relevant.map((item) => Number(item.pop || 0)), 0);
  const rainySlot = relevant.find((item) =>
    Number(item.rain?.['3h'] || 0) > 0 ||
    item.weather?.some((weather) => ['Rain', 'Thunderstorm', 'Drizzle'].includes(weather.main))
  );

  const rainExpected = totalRainMm >= 1 || maxPop >= 0.55 || Boolean(rainySlot);
  let severity = 'None';
  if (rainExpected) {
    severity = 'Low';
    if (totalRainMm >= 20 || maxPop >= 0.85) severity = 'High';
    else if (totalRainMm >= 8 || maxPop >= 0.7) severity = 'Moderate';
  }

  return {
    rainExpected,
    severity,
    totalRainMm: Number(totalRainMm.toFixed(1)),
    rainNext3h: Number(rainNext3h.toFixed(1)),
    rainNext6h: Number(rainNext6h.toFixed(1)),
    rainNext12h: Number(rainNext12h.toFixed(1)),
    probability: Number((maxPop * 100).toFixed(0)),
    expectedAt: rainySlot?.dt_txt || relevant[0]?.dt_txt || null,
    condition: rainySlot?.weather?.[0]?.description || relevant[0]?.weather?.[0]?.description || 'forecast unavailable',
  };
};

const fetchRainForecastByCoords = async (lat, lon, hoursAhead = 12) => {
  const key = cacheKey('forecast', roundCoord(lat), roundCoord(lon), hoursAhead);

  return getCached(key, async () => {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units: 'metric',
      appid: weatherApiKey(),
    });
    const data = await withTimeout(`${OPENWEATHER_FORECAST_URL}?${params}`, 10000);
    return {
      ...summarizeForecast(data?.list || [], hoursAhead),
      source: 'OpenWeather 5-day forecast',
      fetchedAt: new Date().toISOString(),
    };
  });
};

module.exports = {
  fetchCurrentWeather,
  fetchRainForecastByCoords,
  summarizeForecast,
};
