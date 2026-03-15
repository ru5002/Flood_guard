import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/home.css';
import useLiveStats from '../hooks/useLiveStats';
import HERO_IMAGE from '../assets/flood.png';

const DMC_GUIDANCE_URL = 'https://www.dmc.gov.lk/index.php?id=60&lang=en&option=com_content&view=article';

const riskClass = (level) => {
    const map = {
        Normal: 'pill-success', Low: 'pill-success', None: 'pill-success',
        Moderate: 'pill-warning', High: 'pill-danger', Critical: 'pill-danger',
        Unknown: 'pill-warning', Checking: 'pill-warning'
    };
    return map[level] || 'pill-warning';
};

const MonitoringIcon = ({ dark }) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={dark ? '#ffffff' : '#1a6b5a'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 5V3M12 21v-2M5 12H3M21 12h-2"/>
    </svg>
);

const AiIcon = ({ dark }) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={dark ? '#ffffff' : '#1a6b5a'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="3"/>
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01"/>
        <path d="M6 14h12"/>
        <path d="M8 6V4M16 6V4"/>
    </svg>
);

const SmsIcon = ({ dark }) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={dark ? '#ffffff' : '#1a6b5a'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        <circle cx="18" cy="5" r="3" fill={dark ? '#22c55e' : '#22c55e'} stroke="none"/>
    </svg>
);

const features = [
    {
        IconComponent: MonitoringIcon,
        tag: 'Live Data',
        title: 'Real-Time Monitoring',
        desc: 'Live weather and rainfall-related updates are shown for selected flood-prone locations in Gampaha District.',
        dark: true,
    },
    {
        IconComponent: AiIcon,
        tag: 'Flood Model',
        title: 'Flood Risk Predictions',
        desc: 'FloodGuard uses weather data and a trained machine-learning model to estimate risk levels for selected areas.',
        dark: false,
    },
    {
        IconComponent: SmsIcon,
        tag: 'SMS Alerts',
        title: 'SMS Alert Dispatch',
        desc: 'When risk becomes high, registered users with phone numbers can receive warning messages through Twilio.',
        dark: false,
    },
];

const stats = [
    { value: '10',    label: 'Areas Monitored' },
    { value: '1',     label: 'District Focus' },
    { value: 'Live',  label: 'Weather Data Checks' },
    { value: '74.5%', label: 'Trained Model Accuracy' },
];

const Home = () => {
    const { temp, condition, humidity, wind, location, floodRisk, loading } = useLiveStats();
    const displayRisk = loading || floodRisk === 'Unknown' ? 'Checking' : floodRisk;

    const getLiveRiskMessage = (risk) => {
        switch (risk) {
            case 'Critical': return (
                <>
                    CRITICAL flood warning. Move to higher ground immediately and follow{' '}
                    <a href={DMC_GUIDANCE_URL} target="_blank" rel="noreferrer">
                        official DMC evacuation guidance
                    </a>.
                </>
            );
            case 'High': return 'High flood risk detected from the latest live update. Prepare for possible evacuation.';
            case 'Moderate': return 'Moderate flood risk detected. Stay alert and avoid low-lying areas.';
            case 'Low': return 'Low flood risk from the latest live update. Keep monitoring conditions.';
            case 'None': return 'No flood risk detected from the latest live update.';
            default: return 'Checking live rainfall and gauge updates...';
        }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="home-main">
                {/* Location Risk Alert */}
                <div className={`location-risk-banner ${(floodRisk || 'unknown').toLowerCase()}`}>
                    <div className="banner-content">
                        <div className="banner-icon" aria-hidden="true">!</div>
                        <div className="banner-copy">
                            <div className="banner-topline">
                                <span className="banner-kicker">Live location alert</span>
                                <span className="banner-severity">{displayRisk}</span>
                            </div>
                            <h2>Your Location ({location || 'Gampaha'})</h2>
                            <p>{loading ? getLiveRiskMessage('Unknown') : getLiveRiskMessage(floodRisk)}</p>
                        </div>
                    </div>
                </div>

                {/* ── Hero ── */}
                <section className="hero-section">
                    <div className="hero-inner">

                        {/* Left */}
                        <div className="hero-left">
                            <div className="hero-live-badge">
                                <span className="live-dot"></span>
                                Live Monitoring Active &nbsp;·&nbsp; 📍 {location || 'Gampaha'}
                            </div>

                            <h1 className="hero-title">
                                Predict. Alert.<br />
                                Prevent <em className="accent-word">Disasters.</em>
                            </h1>

                            <p className="hero-desc">
                                Flood risk prediction for selected locations in Gampaha District, supported by live weather data and SMS alerts.
                            </p>

                            <div className="hero-actions">
                                <Link to="/map" className="btn-dark">
                                    View Live Map
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                                </Link>
                                <Link to="/predictions" className="btn-outline-dark">
                                    Check Predictions
                                </Link>
                            </div>

                            <div className="hero-social-proof">
                                <div className="avatar-stack">
                                    {['H','K','S','R','M'].map((l,i) => (
                                        <span className="avatar-chip" key={i}>{l}</span>
                                    ))}
                                </div>
                                <span className="social-text">
                                    <strong>FloodGuard</strong> student project &nbsp;·&nbsp; Gampaha District focus
                                </span>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="hero-right">
                            <div className="hero-img-wrap">
                                <img src={HERO_IMAGE} alt="Aerial flood view" className="hero-img" />

                                {/* Floating live card */}
                                <div className="floating-card">
                                    {loading ? (
                                        <span className="fc-loading">Loading…</span>
                                    ) : (
                                        <>
                                            <div className="fc-row">
                                                <span className="fc-label">Temperature</span>
                                                <span className="fc-value">{temp !== null ? `${temp}°C` : '—'}</span>
                                            </div>
                                            <div className="fc-row">
                                                <span className="fc-label">Humidity</span>
                                                <span className="fc-value">{humidity !== null ? `${humidity}%` : '—'}</span>
                                            </div>
                                            <div className="fc-divider"></div>
                                            <div className="fc-risk-row">
                                                <span className="fc-label">Flood Risk</span>
                                                <span className={`fc-risk-pill ${riskClass(floodRisk)}`}>
                                                    {floodRisk === 'Unknown' ? 'Checking' : floodRisk || 'Checking'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Accuracy badge */}
                                <div className="accuracy-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a6b5a" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    Model trained for project use
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Stats row ── */}
                <section className="stats-section">
                    <div className="stats-inner">
                        {stats.map((s, i) => (
                            <React.Fragment key={i}>
                                <div className="stat-block">
                                    <span className="stat-number">{s.value}</span>
                                    <span className="stat-label">{s.label}</span>
                                </div>
                                {i < stats.length - 1 && <div className="stat-divider-v" />}
                            </React.Fragment>
                        ))}
                    </div>
                </section>

                {/* ── Features ── */}
                <section className="features-section">
                    <div className="features-header">
                        <p className="features-tag">What We Offer</p>
                        <h2 className="features-title">Comprehensive Flood Warning Services</h2>
                        <p className="features-sub">
                            Every layer of FloodGuard works together to give communities the time they need to stay safe.
                        </p>
                    </div>

                    <div className="features-grid">
                        {features.map((f, i) => (
                            <div className={`feature-card ${f.dark ? 'feature-card--dark' : ''}`} key={i}>
                                <div className="card-top-row">
                                    <span className="card-tag">{f.tag}</span>
                                    <span className="card-arrow">↗</span>
                                </div>
                                <div className="card-icon">
                                    <f.IconComponent dark={f.dark} />
                                </div>
                                <h3 className="card-title">{f.title}</h3>
                                <p className="card-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA Banner ── */}
                <section className="cta-section">
                    <div className="cta-inner">
                        <div className="cta-text">
                            <h2>Ready to stay ahead of floods?</h2>
                            <p>Register now to receive zone-specific SMS alerts before the next flood event.</p>
                        </div>
                        <div className="cta-actions">
                            <Link to="/register" className="btn-dark">Register for Alerts →</Link>
                            <Link to="/donate" className="btn-outline-dark">Support Relief Fund</Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
};

export default Home;
