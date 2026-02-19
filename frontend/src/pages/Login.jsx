import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/auth.css';
import { Link } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Login Data:', formData);
        // Add login logic here
    };

    return (
        <div className="page-wrapper">
             <Navbar />
            <div className="auth-container">
                <div className="auth-form-section">
                    <h2>Welcome<br />Back!</h2>
                    <form onSubmit={handleSubmit}>
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
                        <button type="submit" className="auth-btn">Log In</button>
                    </form>
                    <div className="auth-footer">
                        <label className="remember-me">
                            <input type="checkbox" /> Remember me for 30 days
                        </label>
                        <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
                        <p>You do not have account yet? <Link to="/register" className="sign-up-link">Sign up</Link></p>
                    </div>
                </div>
                <div className="auth-image-section">
                    <div className="auth-image-overlay"></div>
                </div>
            </div>
        </div>
    );
};

export default Login;
