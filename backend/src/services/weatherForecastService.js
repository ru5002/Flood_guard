const { fetchRainForecastByCoords } = require('./liveWeatherService');

const FORECAST_ZONES = [
  { name: 'Gampaha City', aliases: ['Gampaha'], lat: 7.0873, lon: 79.9990 },
  { name: 'Ja-Ela', aliases: ['Ja Ela'], lat: 7.0778, lon: 79.8919 },
  { name: 'Attanagalla', aliases: ['Attanagalla', 'Attanagalla'], lat: 7.1119, lon: 80.1330 },
  { name: 'Nittambuwa', aliases: [], lat: 7.1430, lon: 80.0965 },
  { name: 'Veyangoda', aliases: [], lat: 7.1517, lon: 80.0573 },
  { name: 'Negombo', aliases: [], lat: 7.2083, lon: 79.8358 },
  { name: 'Katunayake', aliases: [], lat: 7.1699, lon: 79.8884 },
  { name: 'Minuwangoda', aliases: [], lat: 7.1667, lon: 79.9500 },
  { name: 'Divulapitiya', aliases: [], lat: 7.2239, lon: 80.0150 },
  { name: 'Mirigama', aliases: [], lat: 7.2458, lon: 80.1347 },
  { name: 'Wattala', aliases: [], lat: 6.9892, lon: 79.8933 },
  { name: 'Kelaniya', aliases: [], lat: 6.9546, lon: 79.9173 },
  { name: 'Peliyagoda', aliases: [], lat: 6.9631, lon: 79.8863 },
  { name: 'Kiribathgoda', aliases: [], lat: 6.9749, lon: 79.9272 },
  { name: 'Kadawatha', aliases: [], lat: 7.0019, lon: 79.9515 },
  { name: 'Ragama', aliases: [], lat: 7.0307, lon: 79.9197 },
  { name: 'Biyagama', aliases: [], lat: 6.9408, lon: 79.9889 },
  { name: 'Dompe', aliases: [], lat: 6.9463, lon: 80.0811 },
];

const normalizeZoneName = (value = '') => value.trim().toLowerCase().replace(/[\s-]+/g, '');

const resolveForecastZone = (zoneName = 'Gampaha') => {
  const normalized = normalizeZoneName(zoneName);
  return FORECAST_ZONES.find((zone) =>
    normalizeZoneName(zone.name) === normalized ||
    zone.aliases.some((alias) => normalizeZoneName(alias) === normalized)
  ) || FORECAST_ZONES[0];
};

const summarizeForecast = (zone, items, hoursAhead = 12) => {
  const cutoff = Date.now() + hoursAhead * 60 * 60 * 1000;
  const upcoming = items.filter((item) => new Date(item.dt_txt).getTime() <= cutoff);
  const relevant = upcoming.length ? upcoming : items.slice(0, Math.ceil(hoursAhead / 3));

  const totalRainMm = relevant.reduce((sum, item) => sum + Number(item.rain?.['3h'] || 0), 0);
  const maxPop = Math.max(...relevant.map((item) => Number(item.pop || 0)), 0);
  const rainySlot = relevant.find((item) =>
    Number(item.rain?.['3h'] || 0) > 0 ||
    item.weather?.some((w) => ['Rain', 'Thunderstorm', 'Drizzle'].includes(w.main))
  );

  const rainExpected = totalRainMm >= 1 || maxPop >= 0.55 || Boolean(rainySlot);
  let severity = 'Low';
  if (totalRainMm >= 20 || maxPop >= 0.85) severity = 'High';
  else if (totalRainMm >= 8 || maxPop >= 0.7) severity = 'Moderate';

  return {
    zone: zone.name,
    hoursAhead,
    rainExpected,
    severity: rainExpected ? severity : 'None',
    totalRainMm: Number(totalRainMm.toFixed(1)),
    probability: Number((maxPop * 100).toFixed(0)),
    expectedAt: rainySlot?.dt_txt || relevant[0]?.dt_txt || null,
    condition: rainySlot?.weather?.[0]?.description || relevant[0]?.weather?.[0]?.description || 'forecast unavailable',
  };
};

const fetchRainForecast = async (zoneName = 'Gampaha', hoursAhead = 12) => {
  const zone = resolveForecastZone(zoneName);
  try {
    const forecast = await fetchRainForecastByCoords(zone.lat, zone.lon, hoursAhead);
    return {
      zone: zone.name,
      hoursAhead,
      rainExpected: forecast.rainExpected,
      severity: forecast.severity,
      totalRainMm: forecast.totalRainMm,
      probability: forecast.probability,
      expectedAt: forecast.expectedAt,
      condition: forecast.condition,
      rainNext3h: forecast.rainNext3h,
      rainNext6h: forecast.rainNext6h,
      rainNext12h: forecast.rainNext12h,
      source: forecast.source,
      cache: forecast.cache,
    };
  } catch (error) {
    return {
      zone: zone.name,
      hoursAhead,
      rainExpected: false,
      severity: 'Unavailable',
      totalRainMm: 0,
      probability: 0,
      expectedAt: null,
      condition: 'forecast unavailable',
      rainNext3h: 0,
      rainNext6h: 0,
      rainNext12h: 0,
      source: 'OpenWeather unavailable',
      error: error.message,
    };
  }
};

const fetchAllRainForecasts = async (hoursAhead = 12) => {
  const results = await Promise.all(
    FORECAST_ZONES.map((zone) => fetchRainForecast(zone.name, hoursAhead).catch((error) => ({
      zone: zone.name,
      rainExpected: false,
      severity: 'Unavailable',
      error: error.message,
    })))
  );

  return results;
};

module.exports = {
  FORECAST_ZONES,
  fetchRainForecast,
  fetchAllRainForecasts,
  resolveForecastZone,
};
