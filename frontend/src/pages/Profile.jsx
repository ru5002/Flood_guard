import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';
import '../styles/auth.css'; // Reusing auth CSS for styling

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        zone: '',
        alertsEnabled: true
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('userData');
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            setFormData({
                name: parsed.name || '',
                email: parsed.email || '',
                phone: parsed.phone || '',
                zone: parsed.zone || 'Gampaha',
                alertsEnabled: parsed.alertsEnabled !== false
            });
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? checked : value 
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await axios.put(`/api/users/${user.id}`, formData);
            if (response.status === 200) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                localStorage.setItem('userData', JSON.stringify(response.data.user));
                setUser(response.data.user);
            }
        } catch (error) {
            console.error('Failed to update profile', error);
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="auth-container" style={{ padding: '40px 20px', minHeight: '60vh' }}>
                <div className="auth-form-section" style={{ margin: '0 auto' }}>
                    <h2>Profile Settings</h2>
                    <p className="auth-subtitle">Update your personal information and alert preferences</p>
                    
                    {message.text && (
                        <div className="error-message" style={{
                            color: message.type === 'success' ? '#15803d' : 'red', 
                            marginBottom: '15px', 
                            padding: '10px', 
                            background: message.type === 'success' ? '#dcfce7' : '#fee2e2', 
                            borderRadius: '4px'
                        }}>
                            {message.text}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Full Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Phone Number (For SMS Alerts)</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Monitoring Zone</label>
                            <select 
                                name="zone" 
                                value={formData.zone} 
                                onChange={handleChange} 
                                style={{ width: '100%', padding: '12px', border: '1.5px solid #e1e1e1', borderRadius: '8px', fontSize: '1rem' }}
                                required
                            >
                                <option value="Gampaha">Gampaha</option>
                                <option value="Ja-Ela">Ja-Ela</option>
                                <option value="Attanagalla">Attanagalla</option>
                                <option value="Nittambuwa">Nittambuwa</option>
                                <option value="Veyangoda">Veyangoda</option>
                                <option value="Negombo">Negombo</option>
                                <option value="Katunayake">Katunayake</option>
                                <option value="Minuwangoda">Minuwangoda</option>
                                <option value="Divulapitiya">Divulapitiya</option>
                                <option value="Mirigama">Mirigama</option>
                                <option value="Wattala">Wattala</option>
                                <option value="Kelaniya">Kelaniya</option>
                                <option value="Peliyagoda">Peliyagoda</option>
                                <option value="Kiribathgoda">Kiribathgoda</option>
                                <option value="Kadawatha">Kadawatha</option>
                                <option value="Ragama">Ragama</option>
                                <option value="Biyagama">Biyagama</option>
                                <option value="Dompe">Dompe</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <input 
                                type="checkbox" 
                                name="alertsEnabled" 
                                id="alertsEnabled"
                                checked={formData.alertsEnabled} 
                                onChange={handleChange} 
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="alertsEnabled" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>Receive SMS Flood Alerts</label>
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '20px' }}>
                            {loading ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Profile;
