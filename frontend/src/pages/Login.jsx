import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/auth.css';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EyeIcon = ({ open }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
);

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const email = formData.email.trim();

        try {
            // Logic to check if user is admin or regular user
            // 1. Try Admin Login
            try {
                const adminResponse = await axios.post('/api/admin/auth/login', {
                    email,
                    password: formData.password
                });
                
                if (adminResponse.status === 200) {
                    // Admin Login Success
                    console.log('Admin login success', adminResponse.data);
                    localStorage.setItem('adminToken', adminResponse.data.token);
                    localStorage.setItem('adminData', JSON.stringify(adminResponse.data.admin));
                    navigate('/admin/dashboard');
                    return; // Stop execution
                }
            } catch (adminError) {
                // If not an admin (401 or 404), continue to try as a user
                // We only proceed if it's a "not found" or "unauthorized" which might mean they are a regular user
                if (adminError.response && adminError.response.status !== 401 && adminError.response.status !== 404) {
                     console.error("Admin login error:", adminError);
                     // If it's a server error (500), we probably shouldn't try user login, but for now let's fall through
                }
            }

            // 2. Try User Login (Regular User)
            try {
                const userResponse = await axios.post('/api/users/login', {
                    email,
                    password: formData.password
                });

                if (userResponse.status === 200) {
                     // User Login Success
                    console.log('User login success', userResponse.data);
                    localStorage.setItem('userToken', userResponse.data.token);
                    localStorage.setItem('userData', JSON.stringify(userResponse.data.user));
                    // Redirect to Home page instead of Map
                    navigate('/');
                    return;
                }
            } catch (userError) {
                // Both Admin and User login failed
                console.error("User login error:", userError.response?.data || userError.message);
                const d = userError.response?.data;
                const backendMsg = d?.message || d?.error;
                setError(backendMsg || 'Invalid email or password.');
            }

        } catch (err) {
            console.error('Login error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
             <Navbar />
            <div className="auth-container">
                <div className="auth-form-section">
                    <h2>Welcome<br />Back!</h2>
                    {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
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
                        <div className="form-group password-field-wrap">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <EyeIcon open={showPassword} />
                            </button>
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </form>
                    <div className="auth-footer">
                        <label className="remember-me">
                            <input type="checkbox" /> Remember me for 30 days
                        </label>
                        <button
                            type="button"
                            className="forgot-password"
                            onClick={() => setShowForgotModal(true)}
                        >
                            Forgot Password?
                        </button>
                        <p>You do not have account yet? <Link to="/register" className="sign-up-link">Sign up</Link></p>
                    </div>

                    {/* Forgot Password Modal */}
                    {showForgotModal && (
                        <div className="fp-modal-backdrop" onClick={() => setShowForgotModal(false)}>
                            <div className="fp-modal" onClick={e => e.stopPropagation()}>
                                <div className="fp-modal-icon">🔑</div>
                                <h3>Forgot Your Password?</h3>
                                <p>Contact your administrator to reset your password:</p>
                                <a href="mailto:admin@floodguard.lk" className="fp-email-link">
                                    admin@floodguard.lk
                                </a>
                                <button className="fp-close-btn" onClick={() => setShowForgotModal(false)}>
                                    Got it
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="auth-image-section">
                    <div className="auth-image-overlay"></div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Login;
