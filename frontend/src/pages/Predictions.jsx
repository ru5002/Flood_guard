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
    { _id: '1',  location: 'Gampaha',       predictionText: 'Heavy Rain Expected - Flood Possible', riskLevel: 'High',     waterLevel: 2.85, floodProbability: 0.72 },
    { _id: '2',  location: 'Negombo',       predictionText: 'Light Showers',                        riskLevel: 'Low',      waterLevel: 1.15, floodProbability: 0.18 },
    { _id: '3',  location: 'Wattala',       predictionText: 'Clear Sky',                            riskLevel: 'None',     waterLevel: 0.50, floodProbability: 0.03 },
    { _id: '4',  location: 'Ja-Ela',        predictionText: 'Overcast with Moderate Rain',          riskLevel: 'Moderate', waterLevel: 1.55, floodProbability: 0.40 },
    { _id: '5',  location: 'Minuwangoda',   predictionText: 'Thunderstorms - Immediate Risk',       riskLevel: 'Critical', waterLevel: 3.42, floodProbability: 0.90 },
    { _id: '6',  location: 'Katunayake',    predictionText: 'Light Rain',                           riskLevel: 'Low',      waterLevel: 0.98, floodProbability: 0.12 }
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
                            <span className="date-badge" style={{ background: '#f8f4ff', color: '#6d28d9', borderColor: '#e9d5ff' }}>
                                v2.0-lstm-14d Model
                            </span>
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
                                            <span className="weather-status">{item.predictionText || item.prediction}</span>
                                        </div>
                                        <div className="prediction-meta">
                                            {item.waterLevel != null && (
                                                <span>Level: {item.waterLevel.toFixed(2)} m</span>
                                            )}
                                            {item.floodProbability != null && (
                                                <span style={{ marginLeft: '10px' }}>
                                                    Flood Prob: {(item.floodProbability * 100).toFixed(0)}%
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
                    <GamapahaWeatherMap predictions={predictions} />
                </div>
            </div>
        </div>
    );
};

export default Predictions;
