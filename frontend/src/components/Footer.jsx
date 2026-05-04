import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-inner">

                {/* Brand column */}
                <div className="footer-col footer-brand-col">
                    <div className="footer-logo">FloodGuard</div>
                    <p className="footer-tagline">
                        AI-powered flood prediction and early warning system for Gampaha District, Sri Lanka.
                        Protecting communities before floodwaters rise.
                    </p>
                    <div className="footer-badge">
                        <span className="footer-live-dot"></span>
                        Live Monitoring Active
                    </div>
                </div>

                {/* Quick links */}
                <div className="footer-col">
                    <h4 className="footer-heading">Quick Links</h4>
                    <ul className="footer-links">
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/map">Live Map</Link></li>
                        <li><Link to="/weather">Weather</Link></li>
                        <li><Link to="/predictions">Predictions</Link></li>
                        <li><Link to="/donate">Donate</Link></li>
                    </ul>
                </div>

                {/* Account */}
                <div className="footer-col">
                    <h4 className="footer-heading">Account</h4>
                    <ul className="footer-links">
                        <li><Link to="/register">Register for Alerts</Link></li>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/admin/login">Admin Portal</Link></li>
                    </ul>
                </div>

                {/* Emergency contacts */}
                <div className="footer-col">
                    <h4 className="footer-heading">Emergency Contacts</h4>
                    <ul className="footer-emergency">
                        <li>
                            <span className="emg-icon">🆘</span>
                            <span>Disaster Management Centre</span>
                            <strong>117</strong>
                        </li>
                        <li>
                            <span className="emg-icon">🚓</span>
                            <span>Police Emergency</span>
                            <strong>119</strong>
                        </li>
                        <li>
                            <span className="emg-icon">🚑</span>
                            <span>Suwa Seriya Ambulance</span>
                            <strong>1990</strong>
                        </li>
                        <li>
                            <span className="emg-icon">🏥</span>
                            <span>National Hospital</span>
                            <strong>011 269 1111</strong>
                        </li>
                    </ul>
                </div>

            </div>

            {/* Bottom bar */}
            <div className="footer-bottom">
                <span>© {year} FloodGuard · Gampaha District, Sri Lanka</span>
                <span className="footer-bottom-right">
                    Built for PUSL3190 Computing Project &nbsp;·&nbsp; BSc (Hons) Software Engineering
                </span>
            </div>
        </footer>
    );
};

export default Footer;
