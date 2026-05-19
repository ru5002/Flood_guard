import { useState, useEffect } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Bell, Home, Megaphone, RefreshCw, UserCog, CheckCircle2, MessageCircle, UserRoundPlus, LogOut } from 'lucide-react';
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
            const response = await fetch('/api/admin/users/stats', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
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
                <Link to="/admin/dashboard" className="admin-logo">
                    <img src="/floodguard-logo.png" alt="FloodGuard" className="admin-logo-mark" />
                    <span className="admin-logo-text">
                        <span className="admin-logo-name">FloodGuard</span>
                        <span className="admin-logo-tag">Admin Console</span>
                    </span>
                </Link>
                <nav className="admin-nav">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} />
                        Dashboard
                    </NavLink>
                    <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                        <Users size={18} />
                        Users
                    </NavLink>
                    <NavLink to="/admin/alerts" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                        <Bell size={18} />
                        SMS Alerts
                    </NavLink>
                    <Link to="/" className="admin-nav-link">
                        <Home size={18} />
                        Back to Site
                    </Link>
                </nav>
                <button className="btn-logout admin-sidebar-logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                </button>
            </aside>

            <main className="admin-main admin-dashboard-page">
                <div className="dashboard-hero">
                    <div>
                        <span className="admin-kicker">Admin Overview</span>
                        <h1>Dashboard</h1>
                        <p>Welcome back, {admin?.name || 'Admin'}. Review users, alert coverage, and recent activity.</p>
                    </div>
                    <div className="dashboard-hero-actions">
                        <button onClick={fetchStats} className="admin-secondary-button">
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                        <button onClick={handleLogout} className="btn-logout">Logout</button>
                    </div>
                </div>

                <div className="admin-content">
                    <div className="dashboard-metrics">
                        <div className="dashboard-metric-card tone-blue">
                            <div className="metric-icon"><Users size={18} /></div>
                            <span>Total Users</span>
                            <strong>{stats?.totalUsers || 0}</strong>
                        </div>

                        <div className="dashboard-metric-card tone-green">
                            <div className="metric-icon"><CheckCircle2 size={18} /></div>
                            <span>Active Users</span>
                            <strong>{stats?.activeUsers || 0}</strong>
                        </div>

                        <div className="dashboard-metric-card tone-cyan">
                            <div className="metric-icon"><MessageCircle size={18} /></div>
                            <span>Alerts Enabled</span>
                            <strong>{stats?.alertsEnabledCount || 0}</strong>
                        </div>

                        <div className="dashboard-metric-card tone-amber">
                            <div className="metric-icon"><UserRoundPlus size={18} /></div>
                            <span>New 30 Days</span>
                            <strong>{stats?.recentRegistrations || 0}</strong>
                        </div>
                    </div>

                    <div className="dashboard-clean-grid">
                        <section className="dashboard-clean-panel dashboard-zone-panel">
                            <div className="dashboard-panel-title">
                                <div>
                                    <h2>Users by Zone</h2>
                                    <p>Registered residents grouped by saved location.</p>
                                </div>
                            </div>
                            <div className="zone-list">
                                {stats?.usersByZone?.length ? stats.usersByZone.map((zone) => (
                                    <div key={zone._id} className="zone-item">
                                        <span className="zone-name">{zone._id}</span>
                                        <span className="zone-count">{zone.count} users</span>
                                    </div>
                                )) : (
                                    <p className="muted-copy">No zone data available yet.</p>
                                )}
                            </div>
                        </section>

                        <section className="dashboard-clean-panel dashboard-actions-panel">
                            <div className="dashboard-panel-title">
                                <div>
                                    <h2>Quick Actions</h2>
                                    <p>Common admin tasks.</p>
                                </div>
                            </div>
                            <div className="quick-actions">
                                <Link to="/admin/users" className="action-btn">
                                    <UserCog size={18} />
                                    Manage Users
                                </Link>
                                <Link to="/admin/alerts" className="action-btn">
                                    <Megaphone size={18} />
                                    Send SMS Alert
                                </Link>
                                <button className="action-btn" onClick={fetchStats}>
                                    <RefreshCw size={18} />
                                    Refresh Stats
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
