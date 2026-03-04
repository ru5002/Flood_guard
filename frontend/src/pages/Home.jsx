import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/home.css';
import useLiveStats from '../hooks/useLiveStats';

const heroBg = 'https://img.freepik.com/premium-photo/rain-grass-natural-view_948735-44935.jpg';

/* Risk level → CSS modifier class */
const riskClass = (level) => {
    const map = { Normal: 'text-success', Low: 'text-success', None: 'text-success',
                  Moderate: 'text-warning', High: 'text-danger', Critical: 'text-danger' };
    return map[level] || '';
};

const Home = () => {
    const { temp, condition, humidity, wind, location, riverStatus, floodRisk, loading } = useLiveStats();

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="home-main">
                <section className="hero-section" style={{ backgroundImage: `url(${heroBg})` }}>
                    <div className="hero-overlay"></div>
                    <div className="hero-inner">
                        <div className="status-badge">
                            <span className="pulsing-dot"></span> Live Monitoring Active  -  📍 {location}
                        </div>
                        <h1 className="hero-title">Your Safety,<br />Our Priority.</h1>
                        <p className="hero-text">
                            Real-time flood monitoring, AI-powered weather predictions, 
                            and instant community alerts for Gampaha District.
                        </p>
                        <div className="hero-actions">
                            <Link to="/map" className="btn btn-primary">View Live Map</Link>
                            <Link to="/predictions" className="btn btn-outline">Check Predictions</Link>
                        </div>

                        <div className="stats-row">
                            {loading ? (
                                <span className="stat-loading">Loading live data…</span>
                            ) : (
                                <>
                                    <div className="stat-item">
                                        <span className="stat-value">{temp !== null ? `${temp}°C` : '—'}</span>
                                        <span className="stat-label">{condition || 'Temperature'}</span>
                                    </div>
                                    <div className="stat-divider"></div>
                                    <div className="stat-item">
                                        <span className="stat-value">{humidity !== null ? `${humidity}%` : '—'}</span>
                                        <span className="stat-label">Humidity</span>
                                    </div>
                                    <div className="stat-divider"></div>
                                    <div className="stat-item">
                                        <span className={`stat-value ${riskClass(floodRisk)}`}>{floodRisk}</span>
                                        <span className="stat-label">Flood Risk</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
                
                <section className="features-section">
                    <div className="features-inner">
                        <div className="feature-card">
                            <div className="feature-icon">🌊</div>
                            <h3>Real-time Monitoring</h3>
                            <p>Live water level tracking from multiple sensor points across the district.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🤖</div>
                            <h3>AI Predictions</h3>
                            <p>Machine learning models forecasting flood probabilities 24 hours in advance.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">📡</div>
                            <h3>Instant Alerts</h3>
                            <p>SMS and push notifications sent immediately when risk levels rise.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Home;