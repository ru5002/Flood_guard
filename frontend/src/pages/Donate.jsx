import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/donate.css';

const Donate = () => {
    const [selectedAmount, setSelectedAmount] = useState(1000);
    const [customAmount, setCustomAmount] = useState('');

    const handleDonate = () => {
        alert(`Thank you for your generous donation of LKR ${customAmount || selectedAmount}!`);
    };

    return (
        <div className="page-wrapper">
             <Navbar />
            <div className="donate-container">
                <div className="donate-content">
                    <div className="donate-header">
                        <h1>Support Flood Relief</h1>
                        <p>Your contribution helps provide emergency supplies, shelter, and recovery assistance to families affected by floods in Gampaha.</p>
                    </div>

                    <div className="donation-card">
                        <h3>Select Amount (LKR)</h3>
                        <div className="amount-grid">
                            {[500, 1000, 2500, 5000].map((amount) => (
                                <button 
                                    key={amount}
                                    className={`amount-btn ${selectedAmount === amount && !customAmount ? 'active' : ''}`}
                                    onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>
                        <div className="custom-amount">
                            <input 
                                type="number" 
                                placeholder="Enter custom amount" 
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                            />
                        </div>

                        <button className="donate-submit-btn" onClick={handleDonate}>
                            Donate Now
                        </button>
                        
                        <div className="secure-badge">
                            <span>🔒Secure Payment</span>
                        </div>
                    </div>
                </div>

                <div className="donate-info-section">
                    <div className="impact-card">
                        <h2>Your Impact</h2>
                        <ul className="impact-list">
                            <li>
                                <span className="icon">🍲</span>
                                <div className="text">
                                    <strong>LKR 1,000</strong>
                                    <p>Provides a hot meal pack for a family of four.</p>
                                </div>
                            </li>
                            <li>
                                <span className="icon">💊</span>
                                <div className="text">
                                    <strong>LKR 2,500</strong>
                                    <p>Supplies an emergency medical kit for flood victims.</p>
                                </div>
                            </li>
                            <li>
                                <span className="icon">⛺</span>
                                <div className="text">
                                    <strong>LKR 5,000</strong>
                                    <p>Contributes to temporary shelter setup and maintenance.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Donate;
