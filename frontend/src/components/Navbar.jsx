import React, { useState, useEffect, useRef } from 'react';
import './navbar.css';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/image.png';
import useLiveStats from '../hooks/useLiveStats';

const ALERT_RISKS = new Set(['moderate', 'high', 'critical']);

const riskColor = { critical: '#dc2626', high: '#ea580c', moderate: '#d97706' };

const riskIcon = { critical: '🚨', high: '⚠️', moderate: '⚡' };

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);
    const { floodRisk, location, loading } = useLiveStats();
    const navigate = useNavigate();

    const riskKey = (floodRisk || '').toLowerCase();
    const hasAlert = ALERT_RISKS.has(riskKey);

    useEffect(() => {
        const userData = localStorage.getItem('userData');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('adminData');
        localStorage.removeItem('adminToken');
        setUser(null);
        navigate('/');
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const getLiveWarningMessage = () => {
        const place = location || 'Gampaha';
        if (loading || floodRisk === 'Unknown') return `Monitoring live flood levels for ${place}...`;
        switch (floodRisk?.toUpperCase()) {
            case 'CRITICAL': return `CRITICAL FLOOD WARNING: Immediate evacuation guidance may apply in ${place}`;
            case 'HIGH': return `HIGH FLOOD RISK: Flooding is possible in ${place}`;
            case 'MODERATE': return `MODERATE FLOOD RISK: Monitor rainfall and water levels in ${place}`;
            case 'LOW': return `LOW FLOOD RISK: Conditions are stable but being monitored in ${place}`;
            case 'NONE': return `Conditions normal: no flood risk detected from the latest update in ${place}`;
            default: return `Live flood risk data is updating for ${place}`;
        }
    };

    return (
        <>
        <div className={`emergency-ribbon risk-${(floodRisk || 'unknown').toLowerCase()}`}>
            <div className="emergency-ribbon-content">
                <span>{getLiveWarningMessage()}</span>
                <span><a href="tel:1990">Ambulance: 1990</a></span>
                <span><a href="tel:119">Police Emergency: 119</a></span>
                <span><a href="tel:0112691111">National Hospital Colombo: 011 2691111</a></span>
                <span><a href="tel:117">Disaster Management Centre: 117</a></span>
                <span><a href="https://www.dmc.gov.lk/" target="_blank" rel="noreferrer">Disaster Management Centre Website</a></span>
                <span><Link to="/map">Open Flood Map</Link></span>
                <span><Link to="/predictions">Check Predictions</Link></span>
            </div>
        </div>
        <nav className="navbar">
            <div className="navbar-brand">
             <Link to="/">
                <img src={logo} alt="FloodGuard" className="nav-logo" />
             </Link>   
            </div>
            <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
                <NavLink to="/" end onClick={toggleMenu}>Home</NavLink>
                <NavLink to="/predictions" onClick={toggleMenu}>Predictions</NavLink>
                <NavLink to="/weather" onClick={toggleMenu}>Weather</NavLink>
                <NavLink to="/donate" onClick={toggleMenu}>Donate</NavLink>
            </div>
            {/* Notification Bell — only for logged-in users */}
            {user && (
                <div className="notif-wrapper" ref={notifRef}>
                    <button
                        className={`notif-bell ${hasAlert ? 'notif-bell--alert' : ''}`}
                        onClick={() => setNotifOpen((o) => !o)}
                        aria-label="Flood risk notifications"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        {hasAlert && <span className="notif-badge" />}
                    </button>

                    {notifOpen && (
                        <div className="notif-dropdown">
                            <div className="notif-header">
                                <span>Flood Alerts</span>
                                <span className="notif-zone">{location || 'Gampaha'}</span>
                            </div>
                            {hasAlert ? (
                                <div className="notif-item notif-item--alert" style={{ borderLeftColor: riskColor[riskKey] }}>
                                    <span className="notif-item-icon">{riskIcon[riskKey]}</span>
                                    <div>
                                        <p className="notif-item-title" style={{ color: riskColor[riskKey] }}>
                                            {floodRisk?.toUpperCase()} RISK
                                        </p>
                                        <p className="notif-item-msg">{getLiveWarningMessage()}</p>
                                        <Link to="/predictions" className="notif-item-link" onClick={() => setNotifOpen(false)}>
                                            View Predictions →
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="notif-item notif-item--safe">
                                    <span className="notif-item-icon">✅</span>
                                    <div>
                                        <p className="notif-item-title">All Clear</p>
                                        <p className="notif-item-msg">No flood risk detected in {location || 'Gampaha'}. Conditions are normal.</p>
                                    </div>
                                </div>
                            )}
                            <div className="notif-footer">
                                Live data · updates every 60s
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="navbar-auth">
                {user ? (
                    <div className="user-profile-menu">
                        <Link to="/profile" className="user-welcome" style={{ textDecoration: 'none', transition: 'background 0.2s', cursor: 'pointer' }}>
                            <span className="user-avatar">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                            Hi, {user.name.split(' ')[0]}
                        </Link>
                        <button onClick={handleLogout} className="btn-logout">Logout</button>
                    </div>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register" className="btn-signup">Sign Up</Link>
                    </>
                )}
            </div>
            <button className="menu-icon" onClick={toggleMenu}>
                <i className="fas fa-bars"></i>
            </button>
        </nav>
        </>
    );
};

export default Navbar;
