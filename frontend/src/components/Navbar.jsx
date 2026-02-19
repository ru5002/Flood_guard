import React, { useState } from 'react';
import './navbar.css';
import { Link } from 'react-router-dom';
import logo from '../assets/image.png';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
        <div className="emergency-ribbon">
            <div className="emergency-ribbon-content">
                <span>⚠️ Flood Warning: Heavy rains expected in Gampaha District</span>
                <span>🚑 1990 – Suwa Seriya</span>
                <span>🚓 Police Emergency: 119</span>
                <span>🏥 National Hospital Colombo: 011 2691111</span>
                <span>🆘 Disaster Management Centre: 117</span>
            </div>
        </div>
        <nav className="navbar">
            <div className="navbar-brand">
             <Link to="/"><img src={logo} alt="FloodGuard" className="nav-logo" /></Link>   
            </div>
            <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
                <Link to="/" onClick={toggleMenu}>Home</Link>
                <Link to="/weather" onClick={toggleMenu}>Weather</Link>
                <Link to="/predictions" onClick={toggleMenu}>Predictions</Link>
                <Link to="/donate" onClick={toggleMenu}>Donate</Link>
            </div>
            <div className="navbar-auth">
                <Link to="/login">Login</Link>
                <Link to="/register" className="btn-signup">Sign Up</Link>
            </div>
            <button className="menu-icon" onClick={toggleMenu}>
                <i className="fas fa-bars"></i>
            </button>
        </nav>
        </>
    );
};

export default Navbar;
