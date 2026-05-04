import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Bell, Home, Send, Clock, BarChart2 } from 'lucide-react';
import '../../styles/admin.css';

const RISK_LEVELS = ['Critical', 'High', 'Moderate', 'Low'];

const RISK_COLORS = {
    Critical: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
    High:     { bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
    Moderate: { bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
    Low:      { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
};

const STATUS_COLORS = {
    SENT:      '#16a34a',
    SIMULATED: '#2563eb',
    FAILED:    '#dc2626',
};

const AdminAlertsManagement = () => {
    const [zones, setZones]             = useState([]);
    const [stats, setStats]             = useState(null);
    const [logs, setLogs]               = useState([]);
    const [logPage, setLogPage]         = useState(1);
    const [logTotal, setLogTotal]       = useState(0);
    const [logPages, setLogPages]       = useState(1);
    const [loading, setLoading]         = useState(true);
    const [dispatching, setDispatching] = useState(false);
    const [result, setResult]           = useState(null);
    const [tab, setTab]                 = useState('dispatch');

    const [form, setForm] = useState({
        zone:          '',
        riskLevel:     'High',
        title:         '',
        customMessage: '',
    });

    const navigate = useNavigate();

    const authHeader = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
    });

    useEffect(() => {
        if (!localStorage.getItem('adminData')) { navigate('/admin/login'); return; }
        loadZones();
        loadStats();
        loadLogs(1);
    }, [navigate]);

    const loadZones = async () => {
        try {
            const r = await fetch('/api/alerts/zones', { headers: authHeader() });
            const d = await r.json();
            if (d.success) setZones(d.zones);
        } catch {}
    };

    const loadStats = async () => {
        try {
            const r = await fetch('/api/alerts/stats', { headers: authHeader() });
            const d = await r.json();
            if (d.success) setStats(d);
        } catch {}
        setLoading(false);
    };

    const loadLogs = async (page = 1) => {
        try {
            const r = await fetch(`/api/alerts/history?page=${page}&limit=10`, { headers: authHeader() });
            const d = await r.json();
            if (d.success) {
                setLogs(d.logs);
                setLogTotal(d.total);
                setLogPages(d.pages);
                setLogPage(page);
            }
        } catch {}
    };

    const handleDispatch = async (e) => {
        e.preventDefault();
        if (!form.zone) return alert('Please select a zone.');
        setDispatching(true);
        setResult(null);
        try {
            const r = await fetch('/api/alerts/dispatch', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(form),
            });
            const d = await r.json();
            setResult(d);
            if (d.success) {
                loadStats();
                loadLogs(1);
                setForm(f => ({ ...f, title: '', customMessage: '' }));
            }
        } catch (err) {
            setResult({ success: false, message: err.message });
        }
        setDispatching(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin/login');
    };

    const riskStyle = (level) => RISK_COLORS[level] || { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };

    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div className="admin-logo"><h1>FLOODGUARD ADMIN</h1></div>
                <nav className="admin-nav">
                    <NavLink to="/admin/dashboard" className={({isActive}) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} /> Dashboard
                    </NavLink>
                    <NavLink to="/admin/users" className={({isActive}) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                        <Users size={18} /> Users
                    </NavLink>
                    <NavLink to="/admin/alerts" className={({isActive}) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                        <Bell size={18} /> SMS Alerts
                    </NavLink>
                    <Link to="/" className="admin-nav-link">
                        <Home size={18} /> Back to Site
                    </Link>
                </nav>
            </aside>

            <main className="admin-main">
                <div className="admin-header">
                    <div className="admin-header-left">
                        <h1>SMS Alert Dispatch</h1>
                        <p>Send zone-based flood warnings to registered users</p>
                    </div>
                    <button onClick={handleLogout} className="btn-logout">Logout</button>
                </div>

                {/* Stats row */}
                {stats && (
                    <div className="stats-grid" style={{ marginBottom: '24px' }}>
                        <div className="stat-card">
                            <div className="stat-info">
                                <h3>Total Sent</h3>
                                <p className="stat-number">{stats.total}</p>
                            </div>
                        </div>
                        {stats.byStatus?.map(s => (
                            <div className="stat-card" key={s._id}>
                                <div className="stat-info">
                                    <h3>{s._id}</h3>
                                    <p className="stat-number" style={{ color: STATUS_COLORS[s._id] }}>{s.count}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {[['dispatch', Send, 'Dispatch Alert'], ['history', Clock, 'History'], ['stats', BarChart2, 'By Zone']].map(([key, Icon, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: tab === key ? '#111' : '#f3f4f6',
                                color: tab === key ? '#fff' : '#374151',
                                fontWeight: 600, fontSize: '13px',
                            }}
                        >
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>

                {/* Dispatch Tab */}
                {tab === 'dispatch' && (
                    <div className="dashboard-sections">
                        <div className="dashboard-section" style={{ maxWidth: '560px' }}>
                            <h2>Compose Alert</h2>
                            <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Target Zone *</label>
                                    <select
                                        value={form.zone}
                                        onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px' }}
                                    >
                                        <option value="">-- Select zone --</option>
                                        <option value="ALL">ALL ZONES (broadcast)</option>
                                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Risk Level *</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {RISK_LEVELS.map(level => {
                                            const s = riskStyle(level);
                                            const active = form.riskLevel === level;
                                            return (
                                                <button
                                                    type="button"
                                                    key={level}
                                                    onClick={() => setForm(f => ({ ...f, riskLevel: level }))}
                                                    style={{
                                                        padding: '6px 16px', borderRadius: '9999px', cursor: 'pointer',
                                                        border: `2px solid ${active ? s.color : s.border}`,
                                                        background: active ? s.color : s.bg,
                                                        color: active ? '#fff' : s.color,
                                                        fontWeight: 600, fontSize: '13px',
                                                    }}
                                                >
                                                    {level}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Alert Title (optional)</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder={`${form.riskLevel} Flood Alert - ${form.zone || 'Zone'}`}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
                                        Custom Message <span style={{ fontWeight: 400, color: '#9ca3af' }}>(leave blank for auto-generated)</span>
                                    </label>
                                    <textarea
                                        value={form.customMessage}
                                        onChange={e => setForm(f => ({ ...f, customMessage: e.target.value }))}
                                        rows={3}
                                        placeholder="Auto-generated based on risk level and zone..."
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {form.zone && (
                                    <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase' }}>Message Preview</p>
                                        <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                                            {form.customMessage || ({
                                                Critical: `FLOOD ALERT - CRITICAL: Severe flooding imminent in ${form.zone}. EVACUATE IMMEDIATELY. Avoid all water bodies. Call DMC: 117.`,
                                                High:     `FLOOD WARNING - HIGH RISK: Significant flooding expected in ${form.zone}. Move valuables upstairs. Stay alert. DMC: 117.`,
                                                Moderate: `FLOOD ADVISORY - MODERATE: Elevated flood risk in ${form.zone}. Monitor river levels. Avoid low-lying areas. DMC: 117.`,
                                                Low:      `FLOOD WATCH - LOW RISK: Minor flooding possible in ${form.zone}. Stay informed and avoid unnecessary travel near waterways.`,
                                            }[form.riskLevel] || '')}
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={dispatching}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                        background: dispatching ? '#9ca3af' : '#111', color: '#fff',
                                        fontWeight: 700, fontSize: '14px',
                                    }}
                                >
                                    <Send size={16} />
                                    {dispatching ? 'Dispatching...' : 'Send Alert Now'}
                                </button>
                            </form>

                            {result && (
                                <div style={{
                                    marginTop: '16px', padding: '14px 16px', borderRadius: '8px',
                                    background: result.success ? '#f0fdf4' : '#fef2f2',
                                    border: `1.5px solid ${result.success ? '#86efac' : '#fca5a5'}`,
                                }}>
                                    <p style={{ margin: 0, fontWeight: 700, color: result.success ? '#15803d' : '#dc2626', fontSize: '14px' }}>
                                        {result.success ? 'Alert Dispatched' : 'Dispatch Failed'}
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#374151' }}>{result.message}</p>
                                    {result.results && (
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                                            Sent: {result.results.sent} | Simulated: {result.results.simulated} | Failed: {result.results.failed} | Total: {result.results.total}
                                            {!result.twilioActive && <span style={{ color: '#2563eb' }}> (simulation mode - no Twilio credentials)</span>}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {tab === 'history' && (
                    <div className="dashboard-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2>Alert History ({logTotal} total)</h2>
                            <button onClick={() => loadLogs(1)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>
                                Refresh
                            </button>
                        </div>
                        {logs.length === 0 ? (
                            <p style={{ color: '#9ca3af' }}>No alerts sent yet.</p>
                        ) : (
                            <>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                                                {['Phone', 'Zone', 'Risk', 'Status', 'Title', 'Sent At'].map(h => (
                                                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((log, i) => (
                                                <tr key={log._id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{log.phoneNumber}</td>
                                                    <td style={{ padding: '10px 12px' }}>{log.zone || '-'}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        {log.riskLevel ? (
                                                            <span style={{ ...riskStyle(log.riskLevel), padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                                                                {log.riskLevel}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <span style={{ color: STATUS_COLORS[log.status], fontWeight: 600, fontSize: '12px' }}>{log.status}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.alertTitle || '-'}</td>
                                                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{new Date(log.sentAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {logPages > 1 && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '16px', justifyContent: 'center' }}>
                                        {Array.from({ length: logPages }, (_, i) => i + 1).map(p => (
                                            <button key={p} onClick={() => loadLogs(p)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', cursor: 'pointer', background: p === logPage ? '#111' : '#fff', color: p === logPage ? '#fff' : '#374151', fontSize: '13px' }}>{p}</button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Stats Tab */}
                {tab === 'stats' && stats && (
                    <div className="dashboard-sections">
                        <div className="dashboard-section">
                            <h2>Alerts by Zone</h2>
                            <div className="zone-list" style={{ marginTop: '12px' }}>
                                {stats.byZone?.length ? stats.byZone.map(z => (
                                    <div key={z._id} className="zone-item">
                                        <span className="zone-name">{z._id}</span>
                                        <span className="zone-count">{z.count} alerts</span>
                                    </div>
                                )) : <p style={{ color: '#9ca3af' }}>No data yet.</p>}
                            </div>
                        </div>
                        <div className="dashboard-section">
                            <h2>Alerts by Risk Level</h2>
                            <div className="zone-list" style={{ marginTop: '12px' }}>
                                {stats.byRisk?.length ? stats.byRisk.map(r => {
                                    const s = riskStyle(r._id);
                                    return (
                                        <div key={r._id} className="zone-item">
                                            <span style={{ ...s, padding: '2px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>{r._id}</span>
                                            <span className="zone-count">{r.count} alerts</span>
                                        </div>
                                    );
                                }) : <p style={{ color: '#9ca3af' }}>No data yet.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminAlertsManagement;
