import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/donate.css';

const amounts = [500, 1000, 2500, 5000];

const impactItems = [
    { icon: '🍲', amount: 'LKR 1,000', desc: 'Provides a hot meal pack for a family of four.' },
    { icon: '💊', amount: 'LKR 2,500', desc: 'Supplies an emergency medical kit for flood victims.' },
    { icon: '⛺', amount: 'LKR 5,000', desc: 'Contributes to temporary shelter setup and maintenance.' },
    { icon: '🏫', amount: 'LKR 10,000', desc: 'Helps rebuild a damaged classroom for children.' },
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
                                <span className="impact-icon">{item.icon}</span>
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
                            {['A','S','K','R'].map((letter, i) => (
                                <span className="donor-avatar" key={i}>{letter}</span>
                            ))}
                        </div>
                        <p><strong>2,340+</strong> people have donated this season</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Donate;
