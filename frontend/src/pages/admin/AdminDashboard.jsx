import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Home } from 'lucide-react';
import '../../styles/admin.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const adminData = localStorage.getItem('adminData');
        if (!adminData) {
            navigate('/admin/login');
            return;
        }
        setAdmin(JSON.parse(adminData));
        fetchStats();
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:5000/api/admin/users/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminData');
                    navigate('/admin/login');
                    return;
                }
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin/login');
    };

    if (loading) {
        return (
            <div className="admin-container">
                <div className="loading">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <h1>FLOODGUARD ADMIN</h1>
                </div>
                <nav className="admin-nav">
                    <Link to="/admin/dashboard" className="admin-nav-link active">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link to="/admin/users" className="admin-nav-link">
                        <Users size={20} />
                        Users
                    </Link>
                    <Link to="/" className="admin-nav-link">
                        <Home size={20} />
                        Back to Site
                    </Link>
                </nav>
            </aside>

            <main className="admin-main">
                <div className="admin-header">
                    <div className="admin-header-left">
                        <h1>Dashboard</h1>
                    </div>
                    <div className="admin-header-right">
                        <span className="admin-role-badge">{admin?.role}</span>
                        <button onClick={handleLogout} className="btn-logout">Logout</button>
                    </div>
                </div>

                <div className="admin-content">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>Total Users</h3>
                                <p className="stat-number">{stats?.totalUsers || 0}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>Active Users</h3>
                                <p className="stat-number">{stats?.activeUsers || 0}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>Alerts Enabled</h3>
                                <p className="stat-number">{stats?.alertsEnabledCount || 0}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>New (30 days)</h3>
                                <p className="stat-number">{stats?.recentRegistrations || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-sections">
                        <div className="dashboard-section">
                            <h2>Users by Zone</h2>
                            <div className="zone-list">
                                {stats?.usersByZone?.map((zone) => (
                                    <div key={zone._id} className="zone-item">
                                        <span className="zone-name">{zone._id}</span>
                                        <span className="zone-count">{zone.count} users</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="dashboard-section">
                            <h2>Quick Actions</h2>
                            <div className="quick-actions">
                                <Link to="/admin/users" className="action-btn">
                                    <span>👥</span>
                                    Manage Users
                                </Link>
                                <button className="action-btn" onClick={fetchStats}>
                                    <span>🔄</span>
                                    Refresh Stats
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
