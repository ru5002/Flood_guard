import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/home.css';
import heroImage from '../assets/hero-image.png'; 

const Home = () => {
    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="home-container">
                <section className="hero-section">
                    <div className="hero-content">
                        <h1>Advanced<br />Protection,<br />Data Driven.</h1>
                        <p>Discover our state-of-the-art flood forecasting and weather monitoring systems designed to keep you and your community safe.</p>
                        <Link to="/map" className="explore-btn">Explore Map</Link>
                    </div>
                    <div className="hero-graphic">
                       <img 
                            src={heroImage} 
                            alt="Community and safety" 
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/600x750?text=LUMIÈRE";
                            }}
                        />
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Home;
