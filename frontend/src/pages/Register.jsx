import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/auth.css';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const locationOptions = [
    'Gampaha',
    'Negombo',
    'Minuwangoda',
    'Wattala',
    'Ja-Ela',
    'Kelaniya',
    'Ragama',
    'Mirigama',
    'Divulapitiya',
    'Katunayake',
    'Dunamale'
];

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        phone: '',
        zone: '',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            // Map frontend fields to backend schema (username -> name)
            const payload = {
                name: formData.username,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                zone: formData.zone,
                address: formData.address
            };
            
            const response = await axios.post('/api/users/register', payload);
            
            if (response.status === 201) {
                console.log('User registered success:', response.data);
                navigate('/login'); // Redirect to login page on success
            }
        } catch (err) {
            console.error('Registration failed:', err);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
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
                    {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', padding: '10px', background: '#fee2e2', borderRadius: '4px'}}>{error}</div>}
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
                            <select
                                name="zone"
                                value={formData.zone}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select your location</option>
                                {locationOptions.map((location) => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <textarea
                                name="address"
                                placeholder="Address or nearest landmark"
                                value={formData.address}
                                onChange={handleChange}
                                rows="3"
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
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
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
            <Footer />
        </div>
    );
};

export default Register;
