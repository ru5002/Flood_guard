import React from 'react';
import Navbar from '../components/Navbar';
import GamapahaWeatherMap from '../components/GamapahaWeatherMap';
import '../styles/predictions.css';

const Predictions = () => {
    const predictions = [
        { id: 1, name: "Gampaha Town", prediction: "Heavy Rain Expected", risk: "High", rainfall: "45mm" },
        { id: 2, name: "Negombo", prediction: "Light Showers", risk: "Low", rainfall: "12mm" },
        { id: 3, name: "Wattala", prediction: "Clear Sky", risk: "None", rainfall: "0mm" },
        { id: 4, name: "Ja-Ela", prediction: "Overcast", risk: "Moderate", rainfall: "25mm" },
        { id: 5, name: "Minuwangoda", prediction: "Thunderstorms", risk: "High", rainfall: "50mm" },
        { id: 6, name: "Katunayake", prediction: "Light Rain", risk: "Low", rainfall: "8mm" },
        { id: 7, name: "Kelaniya", prediction: "Cloudy", risk: "None", rainfall: "2mm" },
        { id: 8, name: "Ragama", prediction: "Heavy Rain", risk: "High", rainfall: "40mm" },
        { id: 9, name: "Mirigama", prediction: "Clear Sky", risk: "None", rainfall: "0mm" },
        { id: 10, name: "Divulapitiya", prediction: "Light Showers", risk: "Low", rainfall: "10mm" }
    ];

    const getRiskColor = (risk) => {
        switch(risk.toLowerCase()) {
            case 'high': return '#dc2626'; // Red
            case 'moderate': return '#ea580c'; // Orange
            case 'low': return '#ca8a04'; // Yellow
            default: return '#16a34a'; // Green
        }
    };

    return (
        <div className="page-wrapper">
             <Navbar />
            <div className="predictions-container">
                <div className="predictions-list-section">
                    <div className="predictions-header">
                        <h2>Disaster Predictions</h2>
                        <span className="date-badge">{new Date().toLocaleDateString()}</span>
                    </div>
                    
                    <div className="districts-list">
                        {predictions.map((item) => (
                            <div key={item.id} className="prediction-card">
                                <div className="prediction-info">
                                    <h3>{item.name}</h3>
                                    <div className="prediction-stat">
                                        <span className="weather-status">{item.prediction}</span>
                                    </div>
                                    <div className="prediction-meta">
                                        <span>Rainfall: {item.rainfall}</span>
                                    </div>
                                </div>
                                <div className="risk-badge" style={{ backgroundColor: getRiskColor(item.risk) }}>
                                    {item.risk} Risk
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="predictions-image-section">
                    <GamapahaWeatherMap />
                </div>
            </div>
        </div>
    );
};

export default Predictions;
