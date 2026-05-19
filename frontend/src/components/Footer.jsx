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
                            <span className="emg-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                            </span>
                            <span>Disaster Management Centre</span>
                            <strong>117</strong>
                        </li>
                        <li>
                            <span className="emg-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                </svg>
                            </span>
                            <span>Police Emergency</span>
                            <strong>119</strong>
                        </li>
                        <li>
                            <span className="emg-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                            </span>
                            <span>Suwa Seriya Ambulance</span>
                            <strong>1990</strong>
                        </li>
                        <li>
                            <span className="emg-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                                </svg>
                            </span>
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
