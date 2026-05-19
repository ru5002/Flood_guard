const GAUGE_LAYER_URL = 'https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/gauges_2_view/FeatureServer/0/query';
const { fetchCurrentWeather, fetchRainForecastByCoords } = require('./liveWeatherService');

const GAMPHAHA_ZONES = [
  { location: 'Gampaha City', gauge: 'Dunamale', basin: 'Aththanagalu Oya', latitude: 7.0873, longitude: 79.9990 },
  { location: 'Ja-Ela', gauge: 'Dunamale', basin: 'Aththanagalu Oya', latitude: 7.0778, longitude: 79.8919 },
  { location: 'Attanagalla', gauge: 'Dunamale', basin: 'Aththanagalu Oya', latitude: 7.1119, longitude: 80.1330 },
  { location: 'Nittambuwa', gauge: 'Dunamale', basin: 'Aththanagalu Oya', latitude: 7.1430, longitude: 80.0965 },
  { location: 'Veyangoda', gauge: 'Dunamale', basin: 'Aththanagalu Oya', latitude: 7.1517, longitude: 80.0573 },
  { location: 'Negombo', gauge: 'Badalgama', basin: 'Maha Oya', latitude: 7.2083, longitude: 79.8358 },
  { location: 'Katunayake', gauge: 'Badalgama', basin: 'Maha Oya', latitude: 7.1699, longitude: 79.8884 },
  { location: 'Minuwangoda', gauge: 'Badalgama', basin: 'Maha Oya', latitude: 7.1667, longitude: 79.9500 },
  { location: 'Divulapitiya', gauge: 'Badalgama', basin: 'Maha Oya', latitude: 7.2239, longitude: 80.0150 },
  { location: 'Mirigama', gauge: 'Giriulla', basin: 'Maha Oya', latitude: 7.2458, longitude: 80.1347 },
  { location: 'Wattala', gauge: 'Nagalagam Street', basin: 'Kelani Ganga', latitude: 6.9892, longitude: 79.8933 },
  { location: 'Kelaniya', gauge: 'Nagalagam Street', basin: 'Kelani Ganga', latitude: 6.9546, longitude: 79.9173 },
  { location: 'Peliyagoda', gauge: 'Nagalagam Street', basin: 'Kelani Ganga', latitude: 6.9631, longitude: 79.8863 },
  { location: 'Kiribathgoda', gauge: 'Nagalagam Street', basin: 'Kelani Ganga', latitude: 6.9749, longitude: 79.9272 },
  { location: 'Kadawatha', gauge: 'Nagalagam Street', basin: 'Kelani Ganga', latitude: 7.0019, longitude: 79.9515 },
  { location: 'Ragama', gauge: 'Nagalagam Street', basin: 'Kelani Ganga', latitude: 7.0307, longitude: 79.9197 },
  { location: 'Biyagama', gauge: 'Hanwella', basin: 'Kelani Ganga', latitude: 6.9408, longitude: 79.9889 },
  { location: 'Dompe', gauge: 'Hanwella', basin: 'Kelani Ganga', latitude: 6.9463, longitude: 80.0811 },
];

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const riskFromThresholds = (waterLevel, thresholds = {}) => {
  const level = Number(waterLevel);
  if (!Number.isFinite(level)) return 'None';

  if (Number.isFinite(thresholds.major) && level >= thresholds.major) return 'Critical';
  if (Number.isFinite(thresholds.minor) && level >= thresholds.minor) return 'High';
  if (Number.isFinite(thresholds.alert) && level >= thresholds.alert) return 'Moderate';
  if (level >= 1.5) return 'Low';
  return 'None';
};

const mapGaugeFeature = (feature) => {
  const attrs = feature?.attributes || {};
  const thresholds = {
    alert: Number(attrs.alertpull),
    minor: Number(attrs.minorpull),
    major: Number(attrs.majorpull),
  };
  const waterLevel = Number(attrs.water_level);
  const rainfall = attrs.rain_fall == null ? 0 : Number(attrs.rain_fall);

  return {
    source: 'Irrigation Department ArcGIS',
    sourceUrl: 'https://slirrigation.maps.arcgis.com/apps/dashboards/2cffe83c9ff5497d97375498bdf3ff38',
    rainfallDashboardUrl: 'https://slirrigation.maps.arcgis.com/apps/dashboards/5c30e3fc436543ecbaa74b6f2835b67a',
    reservoirDashboardUrl: 'https://slirrigation.maps.arcgis.com/apps/dashboards/97be51156fa84712851286408eb09c45',
    station: attrs.gauge || 'Dunamale',
    basin: attrs.basin || 'Aththanagalu Oya',
    waterLevelM: Number.isFinite(waterLevel) ? waterLevel : null,
    rainfallMm: Number.isFinite(rainfall) ? rainfall : 0,
    recordedAt: toDate(attrs.EditDate || attrs.CreationDate),
    thresholds,
    officialRisk: riskFromThresholds(waterLevel, thresholds),
    coordinates: feature?.geometry
      ? { longitude: feature.geometry.x, latitude: feature.geometry.y }
      : null,
  };
};

const fetchDunamaleIrrigationSnapshot = async () => {
  const params = new URLSearchParams({
    f: 'json',
    where: "gauge='Dunamale' AND basin='Aththanagalu Oya'",
    outFields: 'basin,gauge,water_level,rain_fall,EditDate,CreationDate,alertpull,minorpull,majorpull',
    returnGeometry: 'true',
    orderByFields: 'EditDate DESC',
    resultRecordCount: '1',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let data;
  try {
    const response = await fetch(`${GAUGE_LAYER_URL}?${params}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`ArcGIS returned HTTP ${response.status}`);
    }
    data = await response.json();
  } finally {
    clearTimeout(timeout);
  }

  const feature = data?.features?.[0];
  if (!feature) {
    throw new Error('No Dunamale gauge record returned from Irrigation Department ArcGIS service.');
  }

  return mapGaugeFeature(feature);
};

const fetchGaugeFeatures = async (where, count = 500) => {
  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'basin,gauge,water_level,rain_fall,EditDate,CreationDate,alertpull,minorpull,majorpull',
    returnGeometry: 'true',
    orderByFields: 'EditDate DESC',
    resultRecordCount: String(count),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${GAUGE_LAYER_URL}?${params}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`ArcGIS returned HTTP ${response.status}`);
    const data = await response.json();
    return data.features || [];
  } finally {
    clearTimeout(timeout);
  }
};

const fetchLatestGaugeSnapshots = async () => {
  const features = await fetchGaugeFeatures('1=1', 1000);
  const latestByGauge = new Map();

  for (const feature of features) {
    const snapshot = mapGaugeFeature(feature);
    const key = `${snapshot.gauge || snapshot.station}|${snapshot.basin}`.toLowerCase();
    const existing = latestByGauge.get(key);
    if (!existing || (snapshot.recordedAt && existing.recordedAt && snapshot.recordedAt > existing.recordedAt)) {
      latestByGauge.set(key, snapshot);
    }
  }

  return Array.from(latestByGauge.values());
};

const fetchCurrentWeatherForZone = async (zone) => {
  try {
    const data = await fetchCurrentWeather(zone.latitude, zone.longitude);
    return {
      rainfallMm: data.rainfall,
      humidity: data.humidity,
      temperature: data.temp,
      windSpeed: data.wind,
      condition: data.description || data.condition,
      source: data.source,
      fetchedAt: data.fetchedAt,
      cache: data.cache,
    };
  } catch (err) {
    return {
      rainfallMm: null,
      humidity: null,
      temperature: null,
      windSpeed: null,
      condition: 'weather unavailable',
      source: 'OpenWeather unavailable',
      error: err.message,
    };
  }
};

const fetchRainForecastForZone = async (zone) => {
  try {
    return await fetchRainForecastByCoords(zone.latitude, zone.longitude, 12);
  } catch (err) {
    return {
      rainExpected: false,
      severity: 'Unavailable',
      totalRainMm: null,
      rainNext3h: null,
      rainNext6h: null,
      rainNext12h: null,
      probability: 0,
      condition: 'forecast unavailable',
      error: err.message,
    };
  }
};

const floodProbabilityFromSnapshot = (snapshot) => {
  const level = Number(snapshot?.waterLevelM || 0);
  const alert = Number(snapshot?.thresholds?.alert || 0);
  const minor = Number(snapshot?.thresholds?.minor || 0);
  const major = Number(snapshot?.thresholds?.major || 0);
  if (major && level >= major) return 0.95;
  if (minor && level >= minor) return 0.75;
  if (alert && level >= alert) return 0.55;
  if (alert && level > 0) return Math.min(0.45, Math.max(0.05, level / alert * 0.4));
  return 0.05;
};

const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const toRad = (value) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

const stableLocationOffset = (location = '') => {
  const hash = Array.from(location).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((hash % 9) - 4) / 100;
};

const riskRank = { None: 0, Low: 1, Moderate: 2, High: 3, Critical: 4, Unavailable: 0 };
const riskLabel = ['None', 'Low', 'Moderate', 'High', 'Critical'];

const rainfallRisk = (currentRainfall = 0, forecast = {}) => {
  const current = Number(currentRainfall || 0);
  const forecastRain = Number(forecast.totalRainMm || 0);
  const forecastProbability = Number(forecast.probability || 0);
  const maxRain = Math.max(current, forecastRain);

  if (maxRain >= 20 || forecastProbability >= 85 || forecast.severity === 'High') return 'High';
  if (maxRain >= 8 || forecastProbability >= 70 || forecast.severity === 'Moderate') return 'Moderate';
  if (maxRain >= 1 || forecastProbability >= 55 || forecast.severity === 'Low') return 'Low';
  return 'None';
};

const combineRiskSignals = (gauge, localRainfall, forecast) => {
  const riverRisk = gauge?.officialRisk || 'None';
  const rainRisk = rainfallRisk(localRainfall, forecast);
  const baseRank = riskRank[riverRisk] || 0;
  const rainRank = riskRank[rainRisk] || 0;
  const level = Number(gauge?.waterLevelM || 0);
  const alert = Number(gauge?.thresholds?.alert || 0);
  const nearAlert = alert > 0 && level >= alert * 0.85;

  let combinedRank = Math.max(baseRank, rainRank);
  if (nearAlert && rainRank >= 2) {
    combinedRank = Math.min(4, Math.max(combinedRank, baseRank + 1));
  }

  const drivers = [];
  if (baseRank > 0) drivers.push(`river level is ${riverRisk.toLowerCase()} at the mapped official gauge`);
  if (rainRank > 0) drivers.push(`${rainRisk.toLowerCase()} rainfall signal from live/forecast weather`);
  if (nearAlert) drivers.push('river level is close to the official alert threshold');
  if (!drivers.length) drivers.push('river level and rainfall are within safe range');

  return {
    riskLevel: riskLabel[combinedRank],
    riverRisk,
    rainRisk,
    drivers,
  };
};

const combinedFloodProbability = (gauge, localRainfall, forecast, riskLevel, zone) => {
  const gaugeProbability = floodProbabilityFromSnapshot(gauge);
  const currentRain = Number(localRainfall || 0);
  const forecastRain = Number(forecast?.totalRainMm || 0);
  const forecastProbability = Number(forecast?.probability || 0) / 100;
  const rainfallProbability = Math.min(0.65, (currentRain / 30) + (forecastRain / 60) + forecastProbability * 0.35);
  const riskBounds = {
    None: { min: 0.03, base: 0.04, max: 0.16 },
    Low: { min: 0.12, base: 0.18, max: 0.34 },
    Moderate: { min: 0.30, base: 0.38, max: 0.62 },
    High: { min: 0.55, base: 0.65, max: 0.86 },
    Critical: { min: 0.82, base: 0.9, max: 0.97 },
  }[riskLevel] || { min: 0.03, base: 0.04, max: 0.16 };

  const gaugeCoords = gauge?.coordinates
    ? { latitude: Number(gauge.coordinates.latitude), longitude: Number(gauge.coordinates.longitude) }
    : null;
  const zoneCoords = zone
    ? { latitude: Number(zone.latitude), longitude: Number(zone.longitude) }
    : null;
  const gaugeDistanceKm = distanceKm(zoneCoords, gaugeCoords);
  const distanceModifier = Number.isFinite(gaugeDistanceKm)
    ? Math.max(-0.05, 0.05 - Math.min(gaugeDistanceKm, 30) / 300)
    : 0;
  const localRainModifier = Math.min(0.05, currentRain / 200);
  const forecastModifier = Math.min(0.05, forecastRain / 240);
  const locationModifier = stableLocationOffset(zone?.location);

  const blendedProbability = Math.max(
    riskBounds.base,
    gaugeProbability,
    rainfallProbability,
    gaugeProbability + rainfallProbability * 0.2
  );
  const adjustedProbability = blendedProbability
    + distanceModifier
    + localRainModifier
    + forecastModifier
    + locationModifier;

  return Number(Math.min(riskBounds.max, Math.max(riskBounds.min, adjustedProbability)).toFixed(3));
};

const buildGampahaZonePredictions = async () => {
  const gauges = await fetchLatestGaugeSnapshots();
  const [weatherByZone, forecastByZone] = await Promise.all([
    Promise.all(GAMPHAHA_ZONES.map(fetchCurrentWeatherForZone)),
    Promise.all(GAMPHAHA_ZONES.map(fetchRainForecastForZone)),
  ]);

  return GAMPHAHA_ZONES.map((zone, index) => {
    const gauge = gauges.find((item) =>
      item.station?.toLowerCase() === zone.gauge.toLowerCase() &&
      item.basin?.toLowerCase() === zone.basin.toLowerCase()
    );
    const weather = weatherByZone[index] || {};
    const forecast = forecastByZone[index] || {};
    const localRainfall = Number.isFinite(weather.rainfallMm) ? weather.rainfallMm : (gauge?.rainfallMm ?? 0);
    const risk = combineRiskSignals(gauge, localRainfall, forecast);
    const floodProbability = combinedFloodProbability(gauge, localRainfall, forecast, risk.riskLevel, zone);

    return {
      _id: `official-${zone.location.toLowerCase().replace(/\s+/g, '-')}`,
      location: zone.location,
      district: 'Gampaha',
      mappedGauge: zone.gauge,
      mappedBasin: zone.basin,
      latitude: zone.latitude,
      longitude: zone.longitude,
      riskLevel: risk.riskLevel,
      riverRisk: risk.riverRisk,
      rainfallRisk: risk.rainRisk,
      analysisType: zone.basin === 'Aththanagalu Oya' ? 'official_gauge_rf_supported' : 'official_gauge_threshold',
      modelCoverage: zone.basin === 'Aththanagalu Oya'
        ? 'RF model calibrated for Aththanagalu Oya/Dunamale context'
        : 'Official gauge threshold analysis; RF model is not trained for this basin yet',
      waterLevel: gauge?.waterLevelM ?? 0,
      rainfall: localRainfall,
      gaugeRainfall: gauge?.rainfallMm ?? 0,
      rainfallSource: Number.isFinite(weather.rainfallMm) ? weather.source : 'Irrigation Department gauge rainfall',
      humidity: weather.humidity,
      temperature: weather.temperature,
      windSpeed: weather.windSpeed,
      weatherCondition: weather.condition,
      forecastRain3h: forecast.rainNext3h,
      forecastRain6h: forecast.rainNext6h,
      forecastRain12h: forecast.rainNext12h,
      forecastTotalRainfall: forecast.totalRainMm,
      forecastProbability: forecast.probability,
      forecastSeverity: forecast.severity,
      forecastCondition: forecast.condition,
      forecastExpectedAt: forecast.expectedAt,
      confidence: gauge ? (forecast.severity === 'Unavailable' ? 84 : 93) : 40,
      floodProbability,
      riskDrivers: risk.drivers,
      prediction: gauge
        ? `Official ${zone.gauge} gauge status: ${gauge.officialRisk}. Combined risk uses current rainfall and next 12-hour forecast.`
        : `No live official gauge reading available for ${zone.location}`,
      source: gauge ? 'Irrigation Department ArcGIS' : 'fallback_zone_mapping',
      recordedAt: gauge?.recordedAt,
      thresholds: gauge?.thresholds,
    };
  });
};

module.exports = {
  fetchDunamaleIrrigationSnapshot,
  fetchLatestGaugeSnapshots,
  buildGampahaZonePredictions,
  riskFromThresholds,
};
