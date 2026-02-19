import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/auth.css';
import { Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        phone: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Register Data:', formData);
        // Add register logic here
    };

    return (
        <div className="page-wrapper">
             <Navbar />
            <div className="auth-container">
                <div className="auth-form-section">
                    <h2>Welcome to FloodGuard!</h2>
                    <p className="auth-subtitle">
                        Create an account to get real-time alerts to your mobile
                    </p>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                name="username"
                                placeholder="Your Name"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="tel"
                                name="phone"
                                placeholder="Phone Number"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="auth-btn">Create Account</button>
                        <div className="auth-footer">
                            <label>
                                <input type="checkbox" /> Remember me for 30 days
                            </label>
                            <Link to="/forgot-password">Forgot Password?</Link>
                            <p>You already have account? <Link to="/login">Log in</Link></p>
                        </div>
                    </form>
                </div>
                <div className="auth-image-section">
                    <div className="placeholder-image"></div>
                </div>
            </div>
        </div>
    );
};

export default Register;
