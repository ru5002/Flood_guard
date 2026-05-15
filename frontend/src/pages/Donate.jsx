import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/donate.css';

const amounts = [500, 1000, 2500, 5000];

const MealIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
);

const MedicalIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
);

const ShelterIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
);

const SchoolIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="12" y1="7" x2="12" y2="13"/>
        <line x1="9" y1="10" x2="15" y2="10"/>
    </svg>
);

const impactItems = [
    { Icon: MealIcon,    color: '#d97706', bg: '#fef3c7', amount: 'LKR 1,000',  desc: 'Provides a hot meal pack for a family of four.' },
    { Icon: MedicalIcon, color: '#dc2626', bg: '#fee2e2', amount: 'LKR 2,500',  desc: 'Supplies an emergency medical kit for flood victims.' },
    { Icon: ShelterIcon, color: '#0891b2', bg: '#e0f2fe', amount: 'LKR 5,000',  desc: 'Contributes to temporary shelter setup and maintenance.' },
    { Icon: SchoolIcon,  color: '#16a34a', bg: '#dcfce7', amount: 'LKR 10,000', desc: 'Helps rebuild a damaged classroom for children.' },
];

const Donate = () => {
    const [selectedAmount, setSelectedAmount] = useState(1000);
    const [customAmount, setCustomAmount] = useState('');

    const displayAmount = customAmount || selectedAmount;

    const handleDonate = () => {
        alert(`Thank you for your generous donation of LKR ${displayAmount}!`);
    };

    return (
        <div className="page-wrapper">
            <Navbar />

            {/* Hero banner */}
            <section className="donate-hero">
                <div className="donate-hero-inner">
                    <span className="donate-hero-badge">Gampaha District Relief Fund</span>
                    <h1>Every Rupee Saves a Life</h1>
                    <p>
                        Provide emergency supplies, shelter, and recovery assistance to
                        families affected by floods in Gampaha.
                    </p>
                </div>
            </section>

            {/* Main content */}
            <div className="donate-body">
                {/* Left — Donation form */}
                <div className="donate-form-col">
                    <div className="donation-card">
                        <div className="donation-card-header">
                            <h2>Make a Donation</h2>
                            <p>Choose an amount or enter your own</p>
                        </div>

                        <div className="amount-grid">
                            {amounts.map((amount) => (
                                <button
                                    key={amount}
                                    className={`amount-btn ${selectedAmount === amount && !customAmount ? 'active' : ''}`}
                                    onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                                >
                                    <span className="amount-currency">LKR</span>
                                    <span className="amount-value">{amount.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>

                        <div className="custom-amount">
                            <span className="custom-amount-prefix">LKR</span>
                            <input
                                type="number"
                                placeholder="Enter custom amount"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                            />
                        </div>

                        <div className="donate-summary">
                            <span>You are donating</span>
                            <strong>LKR {Number(displayAmount).toLocaleString()}</strong>
                        </div>

                        <button className="donate-submit-btn" onClick={handleDonate}>
                            Donate Now
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                        </button>

                        <div className="secure-badge">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                            <span>256-bit SSL &middot; Secure Payment</span>
                        </div>
                    </div>
                </div>

                {/* Right — Impact cards */}
                <div className="donate-info-col">
                    <h2 className="impact-heading">Your Impact</h2>
                    <p className="impact-subheading">See how your contribution makes a difference</p>

                    <div className="impact-grid">
                        {impactItems.map((item, i) => (
                            <div className="impact-card" key={i}>
                                <span
                                    className="impact-icon"
                                    style={{ background: item.bg, color: item.color }}
                                >
                                    <item.Icon />
                                </span>
                                <div>
                                    <strong>{item.amount}</strong>
                                    <p>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Social‑proof strip */}
                    <div className="donors-strip">
                        <div className="donor-avatars">
                            {[
                                { letter: 'A', color: '#0e7490' },
                                { letter: 'S', color: '#16a34a' },
                                { letter: 'K', color: '#d97706' },
                                { letter: 'R', color: '#dc2626' },
                            ].map((d, i) => (
                                <span
                                    className="donor-avatar"
                                    key={i}
                                    style={{ background: d.color }}
                                >
                                    {d.letter}
                                </span>
                            ))}
                        </div>
                        <p><strong>2,340+</strong> people have donated this season</p>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Donate;
