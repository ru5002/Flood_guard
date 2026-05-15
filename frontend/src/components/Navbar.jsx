import React, { useState, useEffect } from 'react';
import './navbar.css';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/image.png';
import useLiveStats from '../hooks/useLiveStats';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const { floodRisk, location, loading } = useLiveStats();
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('userData');
        if (userData) {
            setUser(JSON.parse(userData));
        }
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
                <span>Ambulance: 1990</span>
                <span>Police Emergency: 119</span>
                <span>National Hospital Colombo: 011 2691111</span>
                <span>Disaster Management Centre: 117</span>
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
            <div className="navbar-auth">
                {user ? (
                    <div className="user-profile-menu">
                        <Link to="/profile" className="user-welcome" style={{ textDecoration: 'none', transition: 'background 0.2s', cursor: 'pointer' }}>
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
