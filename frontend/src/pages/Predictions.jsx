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

const FALLBACK = [
    { _id: '1',  location: 'Gampaha Town',  prediction: 'Heavy Rain Expected',        riskLevel: 'High',     rainfallMm: 45, floodProbability: 72, confidence: 80 },
    { _id: '2',  location: 'Negombo',        prediction: 'Light Showers',               riskLevel: 'Low',      rainfallMm: 12, floodProbability: 18, confidence: 85 },
    { _id: '3',  location: 'Wattala',        prediction: 'Clear Sky',                   riskLevel: 'None',     rainfallMm: 0,  floodProbability: 3,  confidence: 92 },
    { _id: '4',  location: 'Ja-Ela',         prediction: 'Overcast with Moderate Rain', riskLevel: 'Moderate', rainfallMm: 25, floodProbability: 40, confidence: 78 },
    { _id: '5',  location: 'Minuwangoda',    prediction: 'Thunderstorms',               riskLevel: 'High',     rainfallMm: 50, floodProbability: 80, confidence: 76 },
    { _id: '6',  location: 'Katunayake',     prediction: 'Light Rain',                  riskLevel: 'Low',      rainfallMm: 8,  floodProbability: 12, confidence: 88 },
    { _id: '7',  location: 'Kelaniya',       prediction: 'Partly Cloudy',               riskLevel: 'None',     rainfallMm: 2,  floodProbability: 8,  confidence: 90 },
    { _id: '8',  location: 'Ragama',         prediction: 'Heavy Rain',                  riskLevel: 'High',     rainfallMm: 40, floodProbability: 65, confidence: 77 },
    { _id: '9',  location: 'Mirigama',       prediction: 'Clear Sky',                   riskLevel: 'None',     rainfallMm: 0,  floodProbability: 2,  confidence: 95 },
    { _id: '10', location: 'Divulapitiya',   prediction: 'Light Showers',               riskLevel: 'Low',      rainfallMm: 10, floodProbability: 15, confidence: 83 }
];

const Predictions = () => {
    const [predictions, setPredictions]   = useState([]);
    const [summary, setSummary]           = useState(null);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [generatedAt, setGeneratedAt]   = useState(null);
    const [modelVersion, setModelVersion] = useState('');

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                setLoading(true);
                setError(null);

                const [predRes, sumRes] = await Promise.all([
                    fetch(`${API_BASE}/api/predictions/latest`),
                    fetch(`${API_BASE}/api/predictions/summary`)
                ]);

                const predData = await predRes.json();
                const sumData  = await sumRes.json();

                if (!predData.success) throw new Error(predData.message || 'Failed to load predictions');

                setPredictions(predData.predictions);
                setGeneratedAt(predData.generatedAt);
                setModelVersion(predData.modelVersion || '');
                if (sumData.success) setSummary(sumData.summary);
            } catch (err) {
                console.error('Predictions fetch error:', err);
                setError('Could not reach prediction service – showing local data.');
                setPredictions(FALLBACK);
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, []);

    const getRiskColor = (risk) => RISK_COLORS[risk] || RISK_COLORS.None;

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="predictions-container">

                {/* ── Left panel ── */}
                <div className="predictions-list-section">
                    <div className="predictions-header">
                        <h2>Disaster Predictions</h2>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="date-badge">
                                {generatedAt
                                    ? `Updated ${new Date(generatedAt).toLocaleString()}`
                                    : new Date().toLocaleDateString()}
                            </span>
                            {modelVersion && (
                                <span className="date-badge" style={{ background: '#f0fdf4', color: '#15803d' }}>
                                    {modelVersion}
                                </span>
                            )}
                        </div>

                        {/* Risk summary pills */}
                        {summary && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                                {summary.filter(s => s.count > 0).map(s => (
                                    <span
                                        key={s.riskLevel}
                                        style={{
                                            background: getRiskColor(s.riskLevel),
                                            color: '#fff',
                                            borderRadius: '9999px',
                                            padding: '2px 10px',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    >
                                        {s.riskLevel}: {s.count}
                                    </span>
                                ))}
                            </div>
                        )}

                        {error && (
                            <p style={{ color: '#ca8a04', fontSize: '12px', marginTop: '8px' }}>⚠ {error}</p>
                        )}
                    </div>

                    <div className="districts-list">
                        {loading ? (
                            <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>
                                Loading predictions…
                            </p>
                        ) : (
                            predictions.map((item) => (
                                <div key={item._id || item.location} className="prediction-card">
                                    <div className="prediction-info">
                                        <h3>{item.location}</h3>
                                        <div className="prediction-stat">
                                            <span className="weather-status">{item.prediction}</span>
                                        </div>
                                        <div className="prediction-meta">
                                            <span>Rainfall: {item.rainfallMm ?? 0} mm</span>
                                            {item.floodProbability != null && (
                                                <span style={{ marginLeft: '10px' }}>
                                                    Flood prob: {item.floodProbability}%
                                                </span>
                                            )}
                                            {item.confidence != null && (
                                                <span style={{ marginLeft: '10px', opacity: 0.75 }}>
                                                    Confidence: {item.confidence}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        className="risk-badge"
                                        style={{ backgroundColor: getRiskColor(item.riskLevel) }}
                                    >
                                        {item.riskLevel} Risk
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Map panel ── */}
                <div className="predictions-image-section">
                    <GamapahaWeatherMap />
                </div>
            </div>
        </div>
    );
};

export default Predictions;
