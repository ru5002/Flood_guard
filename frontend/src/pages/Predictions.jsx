import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import GamapahaWeatherMap from '../components/GamapahaWeatherMap';
import '../styles/predictions.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const RISK_COLORS = {
    Critical: '#7c3aed',
    High:     '#dc2626',
    Moderate: '#ea580c',
    Low:      '#ca8a04',
    None:     '#16a34a'
};

const RISK_ORDER = { None: 0, Low: 1, Moderate: 2, High: 3, Critical: 4 };

const normalizePercent = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return number > 1 ? number : number * 100;
};

const normalizeLocation = (value = '') =>
    value.toLowerCase().replace(/[^a-z0-9]/g, '');

const sameLocation = (left = '', right = '') => {
    const a = normalizeLocation(left);
    const b = normalizeLocation(right);

    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
};

const getRegisteredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('userData')) || null;
    } catch {
        return null;
    }
};

const getLocationAlert = (prediction, userZone) => {
    if (!prediction) return null;

    const risk = prediction.riskLevel;
    const location = prediction.location || userZone || 'your area';
    const rainfall = Number.isFinite(Number(prediction.rainfall))
        ? `${Number(prediction.rainfall).toFixed(1)}mm`
        : 'current rainfall';

    if (risk === 'Critical' || risk === 'High') {
        return {
            level: 'high',
            title: `Flood warning for ${location}`,
            message: `Flooding is possible near ${location}. Rainfall is around ${rainfall} and flood risk is high. Move to a safe place, avoid low-lying roads, and follow evacuation instructions from local authorities.`
        };
    }

    if (risk === 'Moderate') {
        return {
            level: 'moderate',
            title: `Flood watch for ${location}`,
            message: `Moderate flood risk is detected near ${location}. Keep emergency items ready, monitor updates, and avoid river banks or low-lying areas.`
        };
    }

    return null;
};

const dominantRiskSignal = (item = {}) => {
    const riverRank = RISK_ORDER[item.riverRisk] ?? RISK_ORDER[item.officialRiskLevel] ?? 0;
    const rainfallRank = RISK_ORDER[item.rainfallRisk] ?? 0;
    const rainfall = Number(item.rainfall ?? 0);
    const forecastRain = Number(item.forecastTotalRainfall ?? 0);

    if (riverRank >= rainfallRank && riverRank > 0) return 'river';
    if (rainfallRank > 0 || rainfall > 0 || forecastRain > 0) return 'rainfall';
    return 'stable';
};

const riskFromLiveData = (liveData) => {
    const modelRisk = liveData.prediction?.day1?.riskLevel || 'None';
    const officialRisk = liveData.irrigationSnapshot?.officialRisk;
    if (!officialRisk) return modelRisk;
    return (RISK_ORDER[officialRisk] || 0) > (RISK_ORDER[modelRisk] || 0) ? officialRisk : modelRisk;
};

const liveDunamaleCard = (liveData) => {
    const displayRisk = riskFromLiveData(liveData);
    const dayOne = liveData.prediction?.day1 || {};
    const probability = dayOne.probabilities?.[displayRisk] ?? dayOne.probabilities?.[dayOne.riskLevel] ?? 0;

    return {
        _id: 'live-dunamale',
        location: 'Dunamale',
        district: 'Gampaha',
        prediction: `Official gauge + Random Forest: ${displayRisk} risk detected`,
        riskLevel: displayRisk,
        modelRiskLevel: dayOne.riskLevel,
        officialRiskLevel: liveData.irrigationSnapshot?.officialRisk,
        waterLevel: liveData.irrigationSnapshot?.waterLevelM ?? liveData.reading?.waterLevel ?? dayOne.predictedWaterLevel ?? 0,
        rainfall: liveData.irrigationSnapshot?.rainfallMm ?? liveData.reading?.rainfall ?? 0,
        confidence: dayOne.confidence ?? 0,
        floodProbability: probability,
        sourceLabel: liveData.isLiveIrrigation ? 'Irrigation Department live gauge' : 'Live prediction'
    };
};

const distanceKm = (a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (value) => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

const FALLBACK = [
    { _id: '1',  location: 'Gampaha',       predictionText: 'Heavy Rain Expected - Flood Possible', riskLevel: 'High',     waterLevel: 2.85, floodProbability: 0.72 },
    { _id: '2',  location: 'Negombo',       predictionText: 'Light Showers',                        riskLevel: 'Low',      waterLevel: 1.15, floodProbability: 0.18 },
    { _id: '3',  location: 'Wattala',       predictionText: 'Clear Sky',                            riskLevel: 'None',     waterLevel: 0.50, floodProbability: 0.03 },
    { _id: '4',  location: 'Ja-Ela',        predictionText: 'Overcast with Moderate Rain',          riskLevel: 'Moderate', waterLevel: 1.55, floodProbability: 0.40 },
    { _id: '5',  location: 'Minuwangoda',   predictionText: 'Thunderstorms - Immediate Risk',       riskLevel: 'Critical', waterLevel: 3.42, floodProbability: 0.90 },
    { _id: '6',  location: 'Katunayake',    predictionText: 'Light Rain',                           riskLevel: 'Low',      waterLevel: 0.98, floodProbability: 0.12 }
];

const Predictions = () => {
    const [predictions, setPredictions]     = useState([]);
    const [summary, setSummary]             = useState(null);
    const [loading, setLoading]             = useState(true);
    const [liveLoading, setLiveLoading]     = useState(false);
    const [error, setError]                 = useState(null);
    const [generatedAt, setGeneratedAt]     = useState(null);
    const [modelVersion, setModelVersion]   = useState('');
    const [livePrediction, setLivePrediction] = useState(null);
    const [isLiveWeather, setIsLiveWeather] = useState(true);
    const [isLiveIrrigation, setIsLiveIrrigation] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [userCoords, setUserCoords] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle');
    const [smsStatus, setSmsStatus] = useState(null);
    const registeredUser = getRegisteredUser();

    const requestUserLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('unsupported');
            return;
        }
        setLocationStatus('requesting');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserCoords({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setLocationStatus('granted');
            },
            () => setLocationStatus('denied'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };

    useEffect(() => {
        requestUserLocation();
    }, []);

    const fetchPredictions = async () => {
        try {
            console.log('Fetching fresh predictions data...');
            if (predictions.length === 0) setLoading(true);
            setLiveLoading(true);

            const [predRes, sumRes, liveRes, zoneRes] = await Promise.all([
                fetch(`${API_BASE}/api/predictions/latest?_t=${Date.now()}`),
                fetch(`${API_BASE}/api/predictions/summary?_t=${Date.now()}`),
                fetch(`${API_BASE}/api/predictions/live?_t=${Date.now()}`).catch(() => ({ json: () => ({ success: false }) })),
                fetch(`${API_BASE}/api/predictions/official-zones?_t=${Date.now()}`).catch(() => ({ json: () => ({ success: false }) }))
            ]);

            const predData = await predRes.json();
            const sumData  = await sumRes.json();
            const liveData = await liveRes.json();
            const zoneData = await zoneRes.json();

            console.log('Live prediction response:', liveData);

            if (!predData.success) throw new Error(predData.message || 'Failed to load predictions');

            let finalPreds = predData.predictions;

            if (zoneData?.success && zoneData.predictions?.length) {
                finalPreds = zoneData.predictions;
                setIsLiveIrrigation(true);
                setIsLiveWeather(true);
            }

            // Handle Live Prediction Mapping
            if (liveData.success && !(zoneData?.success && zoneData.predictions?.length)) {
                setLivePrediction(liveData.prediction);
                setIsLiveWeather(liveData.isLiveWeather || liveData.isLiveIrrigation);
                setIsLiveIrrigation(Boolean(liveData.isLiveIrrigation));
                const liveCard = liveDunamaleCard(liveData);
                finalPreds = [
                    liveCard,
                    ...finalPreds.filter(p => !['Gampaha', 'Dunamale'].includes(p.location))
                ];
            }

            if (userCoords && finalPreds.length) {
                const withDistance = finalPreds.map(item => ({
                    ...item,
                    distanceKm: distanceKm(userCoords, item)
                }));
                withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
                withDistance[0] = { ...withDistance[0], isNearest: true };
                finalPreds = withDistance;
            }

            setPredictions(finalPreds);
            setGeneratedAt(new Date(liveData.generatedAt || Date.now()));
            setModelVersion(predData.modelVersion || liveData.prediction?.modelVersion || 'rf-aththanagalu-climate-v3');
            if (sumData.success) setSummary(sumData.summary);
            setError(null);
            console.log('Successfully updated predictions state.');
        } catch (err) {
            console.error('Predictions fetch error:', err);
            setError('System link interrupted. Operating on localized data cache.');
            if (predictions.length === 0) setPredictions(FALLBACK);
        } finally {
            setLoading(false);
            setLiveLoading(false);
        }
    };

    useEffect(() => {
        fetchPredictions();
        const interval = setInterval(fetchPredictions, 60000); // 60s Auto-refresh
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!userCoords || predictions.length === 0) return;
        setPredictions(current => {
            const sorted = current
                .map(item => ({
                    ...item,
                    isNearest: false,
                    distanceKm: distanceKm(userCoords, item)
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm);
            if (sorted[0]) sorted[0] = { ...sorted[0], isNearest: true };
            return sorted;
        });
    }, [userCoords]);

    useEffect(() => {
        if (!registeredUser?.id || !registeredUser?.zone || predictions.length === 0) return;

        const matchedPrediction = predictions.find(item => sameLocation(item.location, registeredUser.zone));
        const alert = getLocationAlert(matchedPrediction, registeredUser.zone);
        if (!alert) return;

        const alertKey = [
            'floodguard-alert',
            registeredUser.id,
            matchedPrediction.location,
            matchedPrediction.riskLevel
        ].join(':');

        if (sessionStorage.getItem(alertKey)) {
            setSmsStatus('Alert already checked for this session.');
            return;
        }

        sessionStorage.setItem(alertKey, 'pending');
        fetch(`${API_BASE}/api/users/${registeredUser.id}/location-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: matchedPrediction.location,
                riskLevel: matchedPrediction.riskLevel,
                rainfall: matchedPrediction.rainfall,
                floodProbability: matchedPrediction.floodProbability
            })
        })
            .then(res => res.json())
            .then(data => {
                sessionStorage.setItem(alertKey, 'done');
                setSmsStatus(data.message || 'SMS alert checked.');
            })
            .catch(() => {
                sessionStorage.removeItem(alertKey);
                setSmsStatus('SMS alert check failed.');
            });
    }, [predictions, registeredUser?.id, registeredUser?.zone]);

    const getRiskColor = (risk) => RISK_COLORS[risk] || RISK_COLORS.None;

    const getEnhancedReason = (item) => {
        if (item.sourceLabel) {
            const official = item.officialRiskLevel ? ` Official threshold status is ${item.officialRiskLevel}.` : '';
            return `${item.sourceLabel}: water level ${Number(item.waterLevel || 0).toFixed(2)}m and rainfall ${Number(item.rainfall || 0).toFixed(1)}mm.${official}`;
        }
        if (item.mappedGauge) {
            const distance = Number.isFinite(item.distanceKm) ? ` This area is ${item.distanceKm.toFixed(1)}km from your current location.` : '';
            const modelNote = item.analysisType === 'official_gauge_rf_supported'
                ? ' RF model support is strongest here because this is the Aththanagalu Oya context.'
                : ' This uses official gauge thresholds only; the RF model is not trained for this river basin yet.';
            const signal = dominantRiskSignal(item);
            const driver = signal === 'river'
                ? ' The current risk is mainly driven by the mapped river gauge level, not local rainfall.'
                : signal === 'rainfall'
                    ? ' The current risk is mainly driven by rainfall or short-term forecast rainfall.'
                    : ' River level and rainfall are currently within stable ranges.';
            return `Mapped to official ${item.mappedGauge} gauge on ${item.mappedBasin}. Water level ${Number(item.waterLevel || 0).toFixed(2)}m. Local live rainfall is ${Number(item.rainfall || 0).toFixed(1)}mm from ${item.rainfallSource || 'weather data'}.${driver}${distance}${modelNote}`;
        }
        const risk = item.riskLevel?.toUpperCase();
        if (risk === 'CRITICAL') {
            return "Immediate Risk: Water level is above danger threshold and flood probability is very high.";
        }
        if (risk === 'HIGH') {
            return "High Risk: Heavy rainfall or rising water level detected.";
        }
        if (risk === 'MODERATE') {
            return "Moderate Risk: Rainfall increasing / Monitor water level.";
        }
        return "Stable: Water level and rainfall trend are within safe range.";
    };

    const getEnhancedCondition = (risk, item = {}) => {
        const r = risk?.toUpperCase();
        const signal = dominantRiskSignal(item);
        if (r === 'CRITICAL') return signal === 'rainfall' ? "Critical Rainfall / Flood Risk" : "Critical River Level / Flood Risk";
        if (r === 'HIGH') return signal === 'rainfall' ? "Heavy Rainfall / Flood Possible" : "High River Level / Flood Possible";
        if (r === 'MODERATE') return signal === 'rainfall' ? "Rainfall Increasing" : "River Level Rising";
        if (r === 'LOW') return "Low Risk / Continue Monitoring";
        return "Clear / Stable Conditions";
    };

    const getWeatherIcon = (risk = '') => {
        const r = risk.toUpperCase();
        if (r === 'CRITICAL' || r === 'HIGH') return '⛈️';
        if (r === 'MODERATE') return '🌧️';
        if (r === 'LOW') return '🌦️';
        return '☀️';
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loader"></div>
                <p>Analyzing rainfall and river patterns using Random Forest model...</p>
                <small>Processing temporal sequences for Gampaha District</small>
            </div>
        );
    }

    const highRiskCount = predictions.filter(p => ['High', 'Critical'].includes(p.riskLevel)).length;
    const avgProb = predictions.length > 0 
        ? predictions.reduce((acc, p) => acc + (p.floodProbability || 0), 0) / predictions.length 
        : 0;
    const registeredPrediction = registeredUser?.zone
        ? predictions.find(item => sameLocation(item.location, registeredUser.zone))
        : null;
    const registeredAlert = getLocationAlert(registeredPrediction, registeredUser?.zone);
    const currentFocusPrediction = predictions.find(p => p.isNearest)
        || predictions.find(p => sameLocation(p.location, selectedLocation || ''))
        || predictions.find(p => sameLocation(p.location, 'Gampaha'))
        || predictions[0];
    const displayLiveRisk = currentFocusPrediction?.riskLevel
        || livePrediction?.current?.riskLevel
        || livePrediction?.day1?.riskLevel
        || 'None';

    return (
        <div className="dashboard-container">
            <Navbar />
            
            <main className="dashboard-main">
                {/* Status Bar */}
                <div className="status-bar">
                    <div className="system-status" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={`status-dot ${error ? 'offline' : 'online'}`}></span>
                        {error ? 'AI Prediction Service Offline' : 'AI Prediction Service Online (RF + Official Gauge Data)'}
                        {isLiveIrrigation && !error && (
                            <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                                Irrigation Dept live gauge
                            </span>
                        )}
                        {!isLiveWeather && !error && (
                            <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#ea580c', background: '#ffe4e6', padding: '2px 6px', borderRadius: '4px' }}>
                                Using latest dataset values
                            </span>
                        )}
                    </div>
                    <div className="last-updated" style={{ display: 'flex', alignItems: 'center' }}>
                        {liveLoading && <span className="sync-pulse" style={{ display: 'inline-block', marginRight: '8px' }}>🔄</span>}
                        Last Sync: {generatedAt ? generatedAt.toLocaleTimeString() : '--:--'}
                        {locationStatus !== 'granted' && (
                            <button
                                onClick={requestUserLocation}
                                style={{ marginLeft: '12px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', background: '#0f766e', color: 'white', border: 'none', fontSize: '0.8rem' }}
                            >
                                Use My Location
                            </button>
                        )}
                        <button 
                            onClick={fetchPredictions} 
                            disabled={liveLoading} 
                            style={{ marginLeft: '12px', padding: '4px 10px', borderRadius: '4px', cursor: liveLoading ? 'wait' : 'pointer', background: '#3b82f6', color: 'white', border: 'none', fontSize: '0.8rem' }}
                        >
                            {liveLoading ? 'Refreshing...' : 'Refresh Live'}
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <label>Monitored Zones</label>
                        <div className="value">{predictions.length}</div>
                    </div>
                    <div className="stat-card">
                        <label>High Risk Areas</label>
                        <div className="value" style={{ color: highRiskCount > 0 ? '#ef4444' : 'inherit' }}>{highRiskCount}</div>
                    </div>
                    <div className="stat-card">
                        <label>Avg. Probability</label>
                        <div className="value">{(avgProb * 100).toFixed(1)}%</div>
                    </div>
                    <div className="stat-card">
                        <label>Model Stability</label>
                        <div className="value">92.4%</div>
                    </div>
                </div>

                {/* Live Banner */}
                {registeredUser?.zone && (
                    <div className={`location-alert-card ${registeredAlert?.level || 'clear'}`}>
                        <div>
                            <span className="location-alert-label">Your registered location</span>
                            <h3>{registeredAlert?.title || `No active flood alert for ${registeredUser.zone}`}</h3>
                        </div>
                        <p>
                            {registeredAlert?.message || `Current prediction for ${registeredUser.zone} is not high or moderate. Keep monitoring if rainfall changes.`}
                        </p>
                        {registeredAlert && smsStatus && (
                            <small className="location-alert-sms-status">{smsStatus}</small>
                        )}
                    </div>
                )}

                <div className={`live-banner risk-${displayLiveRisk.toLowerCase()}`}>
                    <div className="banner-icon">📍</div>
                    <div className="banner-content">
                        <strong>Current Focus: {predictions.find(p => p.isNearest)?.location || selectedLocation || 'Gampaha District'}</strong>
                        <p>
                            {currentFocusPrediction ?
                                `Current combined risk: ${displayLiveRisk}. ${getEnhancedReason(currentFocusPrediction)}` :
                                livePrediction ?
                                    `Random Forest Analysis: Day 1 (Tomorrow): ${livePrediction.day1?.riskLevel} | Day 2: ${livePrediction.day2?.riskLevel}` :
                                    'Official gauge readings are mapped to each relevant area. RF support is strongest for Aththanagalu Oya zones.'}
                        </p>
                        <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                            Model: The model uses the latest 14 days of rainfall and water-level trends to predict the next 2 days. Old datasets cannot directly predict future dates without recent input.
                        </small>
                    </div>
                </div>

                <div className="content-layout">
                    {/* List Section */}
                    <section className="predictions-list">
                        <header className="list-header">
                            <h2>Zone Analysis</h2>
                            {error && <div className="warning-note">⚠ {error}</div>}
                        </header>

                        <div className="cards-stack">
                            {predictions.map((item) => (
                                <div 
                                    key={item._id || item.location} 
                                    className={`prediction-card ${selectedLocation === item.location ? 'selected' : ''}`}
                                    onClick={() => setSelectedLocation(item.location)}
                                >
                                    <div className="card-top">
                                        <div className="loc-info">
                                            <h3>{getWeatherIcon(item.riskLevel)} {item.location}</h3>
                                            <span className="district-tag">{item.district || 'Gampaha'}</span>
                                            {item.isNearest && (
                                                <span className="district-tag" style={{ marginLeft: '6px', background: '#dbeafe', color: '#1d4ed8' }}>
                                                    Your nearest area
                                                </span>
                                            )}
                                            {Number.isFinite(item.distanceKm) && (
                                                <span className="district-tag" style={{ marginLeft: '6px', background: '#ecfdf5', color: '#047857' }}>
                                                    {item.distanceKm.toFixed(1)}km away
                                                </span>
                                            )}
                                        </div>
                                        <div className={`risk-badge level-${(item.riskLevel || 'none').toLowerCase()}`}>
                                            {item.riskLevel}
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        <p className="pred-text" style={{ fontWeight: '600', color: '#1e293b' }}>
                                            {getEnhancedCondition(item.riskLevel, item)}
                                        </p>
                                        <p className="pred-text" style={{ fontSize: '11px', fontStyle: 'italic', marginBottom: '12px' }}>
                                            <strong>Reason:</strong> {getEnhancedReason(item)}
                                        </p>
                                        {item.mappedGauge && (
                                            <p className="pred-text" style={{ fontSize: '11px', marginTop: '-4px', marginBottom: '12px', color: '#64748b' }}>
                                                Official gauge used: <strong>{item.mappedGauge}</strong> ({item.mappedBasin})
                                                {Number.isFinite(item.distanceKm) ? ` | ${item.distanceKm.toFixed(1)}km from your location` : ''}
                                                {Number.isFinite(Number(item.gaugeRainfall)) ? ` | Gauge rain: ${Number(item.gaugeRainfall).toFixed(1)}mm` : ''}
                                            </p>
                                        )}
                                        
                                        <div className="metrics">
                                            <div className="metric">
                                                <span>Water Level</span>
                                                <strong>{item.waterLevel?.toFixed(2) || '0.00'}m</strong>
                                            </div>
                                            <div className="metric">
                                                <span>Rainfall</span>
                                                <strong>{Number(item.rainfall ?? 0).toFixed(1)}mm</strong>
                                            </div>
                                            <div className="metric">
                                                <span>Distance</span>
                                                <strong>
                                                    {Number.isFinite(item.distanceKm)
                                                        ? `${item.distanceKm.toFixed(1)}km`
                                                        : locationStatus === 'denied'
                                                            ? 'Permission needed'
                                                            : 'Detecting...'}
                                                </strong>
                                            </div>
                                            <div className="metric" style={{ opacity: 0.8 }}>
                                                <span>Analysis</span>
                                                <strong>{item.analysisType === 'official_gauge_rf_supported' ? 'RF + Gauge' : 'Gauge Only'}</strong>
                                            </div>
                                        </div>

                                        <div className="signal-breakdown">
                                            <span className="signal-label">Signal breakdown:</span>
                                            <span
                                                className="signal-pill"
                                                style={{ background: `${RISK_COLORS[item.riverRisk] || RISK_COLORS.None}22`, color: RISK_COLORS[item.riverRisk] || RISK_COLORS.None, borderColor: `${RISK_COLORS[item.riverRisk] || RISK_COLORS.None}55` }}
                                            >
                                                Now (gauge) — {item.riverRisk || 'None'}
                                            </span>
                                            <span
                                                className="signal-pill"
                                                style={{ background: `${RISK_COLORS[item.rainfallRisk] || RISK_COLORS.None}22`, color: RISK_COLORS[item.rainfallRisk] || RISK_COLORS.None, borderColor: `${RISK_COLORS[item.rainfallRisk] || RISK_COLORS.None}55` }}
                                            >
                                                12h forecast — {item.rainfallRisk || 'None'}
                                            </span>
                                        </div>

                                        <div className="prob-section">
                                            <div className="prob-label">
                                                <span>Flood Probability</span>
                                                <span>{normalizePercent(item.floodProbability || 0).toFixed(0)}%</span>
                                            </div>
                                            <div className="progress-bg">
                                                <div 
                                                    className={`progress-bar risk-${(item.riskLevel || 'none').toLowerCase()}`}
                                                    style={{ width: `${Math.min(100, normalizePercent(item.floodProbability || 0))}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Map Section */}
                    <section className="map-view">
                        <GamapahaWeatherMap 
                            predictions={predictions} 
                            activeLocation={selectedLocation}
                            onMarkerClick={(loc) => setSelectedLocation(loc)}
                        />
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Predictions;
