import { useState, useEffect, useMemo } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Bell,
    Home,
    Send,
    Clock,
    BarChart2,
    Radio,
    ShieldAlert,
    MessageSquareText,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    MapPin,
    Activity,
} from 'lucide-react';
import '../../styles/admin.css';

const RISK_LEVELS = ['Critical', 'High', 'Moderate', 'Low'];
const STATUS_LEVELS = ['SENT', 'SIMULATED', 'FAILED'];

const RISK_GUIDANCE = {
    Critical: {
        title: 'Immediate Flood Risk',
        action: 'Use when evacuation or immediate movement to higher ground is required.',
        checklist: ['Confirm zone and recipient coverage', 'Use clear evacuation wording', 'Include DMC 117 for official help'],
        message: (zone) => `FLOOD ALERT - CRITICAL: Severe flooding is possible in ${zone}. Move to higher ground immediately and follow official evacuation guidance. DMC: 117.`,
    },
    High: {
        title: 'High Flood Warning',
        action: 'Use when flooding is likely and residents should prepare to move quickly.',
        checklist: ['Warn residents early', 'Advise avoiding canals and low roads', 'Ask users to protect essentials'],
        message: (zone) => `FLOOD WARNING - HIGH RISK: Flooding is possible in ${zone}. Keep essentials ready, avoid low-lying roads, and prepare to evacuate if water rises. DMC: 117.`,
    },
    Moderate: {
        title: 'Moderate Flood Advisory',
        action: 'Use when conditions are worsening and residents should monitor closely.',
        checklist: ['Keep wording calm but firm', 'Mention monitoring river/drain levels', 'Reduce unnecessary travel'],
        message: (zone) => `FLOOD ADVISORY - MODERATE: Flood risk is increasing in ${zone}. Monitor updates, avoid low-lying areas, and keep emergency items ready. DMC: 117.`,
    },
    Low: {
        title: 'Low Flood Watch',
        action: 'Use for awareness when flooding is not expected but monitoring continues.',
        checklist: ['Use informational wording', 'Avoid creating unnecessary alarm', 'Remind users to follow updates'],
        message: (zone) => `FLOOD WATCH - LOW RISK: Minor flooding is possible in ${zone}. Stay informed and avoid unnecessary travel near waterways.`,
    },
};

const riskClass = (level) => `risk-${String(level || 'low').toLowerCase()}`;
const statusClass = (status) => `status-${String(status || 'unknown').toLowerCase()}`;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

const AdminAlertsManagement = () => {
    const [zones, setZones] = useState([]);
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logPage, setLogPage] = useState(1);
    const [logTotal, setLogTotal] = useState(0);
    const [logPages, setLogPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [dispatching, setDispatching] = useState(false);
    const [result, setResult] = useState(null);
    const [tab, setTab] = useState('dispatch');
    const [historyFilters, setHistoryFilters] = useState({ zone: '', status: '' });

    const [form, setForm] = useState({
        zone: '',
        riskLevel: 'High',
        title: '',
        customMessage: '',
    });

    const navigate = useNavigate();

    const authHeader = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
    });

    useEffect(() => {
        if (!localStorage.getItem('adminData')) {
            navigate('/admin/login');
            return;
        }
        loadZones();
        loadStats();
        loadLogs(1);
    }, [navigate]);

    const loadZones = async () => {
        try {
            const response = await fetch('/api/alerts/zones', { headers: authHeader() });
            const data = await response.json();
            if (data.success) setZones(data.zones);
        } catch (error) {
            console.error('Error loading zones:', error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetch('/api/alerts/stats', { headers: authHeader() });
            const data = await response.json();
            if (data.success) setStats(data);
        } catch (error) {
            console.error('Error loading alert stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async (page = 1, filters = historyFilters) => {
        try {
            const params = new URLSearchParams({ page, limit: 10 });
            if (filters.zone) params.set('zone', filters.zone);
            if (filters.status) params.set('status', filters.status);

            const response = await fetch(`/api/alerts/history?${params}`, { headers: authHeader() });
            const data = await response.json();
            if (data.success) {
                setLogs(data.logs);
                setLogTotal(data.total);
                setLogPages(data.pages || 1);
                setLogPage(page);
            }
        } catch (error) {
            console.error('Error loading alert history:', error);
        }
    };

    const refreshConsole = () => {
        loadZones();
        loadStats();
        loadLogs(logPage);
    };

    const handleDispatch = async (event) => {
        event.preventDefault();
        if (!form.zone) return alert('Please select a zone.');

        setDispatching(true);
        setResult(null);

        try {
            const response = await fetch('/api/alerts/dispatch', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(form),
            });
            const data = await response.json();
            setResult(data);

            if (data.success) {
                loadStats();
                loadLogs(1);
                setForm((current) => ({ ...current, title: '', customMessage: '' }));
            }
        } catch (err) {
            setResult({ success: false, message: err.message });
        } finally {
            setDispatching(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin/login');
    };

    const statusCount = (status) => stats?.byStatus?.find((item) => item._id === status)?.count || 0;
    const selectedGuidance = RISK_GUIDANCE[form.riskLevel] || RISK_GUIDANCE.Low;
    const messageTarget = form.zone === 'ALL' ? 'all registered flood zones' : (form.zone || 'the selected zone');
    const previewMessage = form.customMessage.trim() || selectedGuidance.message(messageTarget);
    const messageSegments = Math.max(1, Math.ceil(previewMessage.length / 160));
    const gatewayLabel = result ? (result.twilioActive ? 'Live SMS enabled' : 'Simulation mode') : 'Gateway checked on dispatch';

    const sortedRiskStats = useMemo(() => (
        [...(stats?.byRisk || [])].sort((a, b) => RISK_LEVELS.indexOf(a._id) - RISK_LEVELS.indexOf(b._id))
    ), [stats]);

    const maxZoneAlerts = Math.max(...(stats?.byZone || []).map((item) => item.count), 1);
    const maxRiskAlerts = Math.max(...sortedRiskStats.map((item) => item.count), 1);

    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <h1>FLOODGUARD ADMIN</h1>
                </div>
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
            </aside>

            <main className="admin-main">
                <div className="admin-header">
                    <div className="admin-header-left">
                        <span className="admin-kicker">Emergency Communications</span>
                        <h1>SMS Alert Dispatch</h1>
                        <p>Send zone-based flood warnings to registered users.</p>
                    </div>
                    <div className="admin-header-right">
                        <button onClick={refreshConsole} className="admin-secondary-button">
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                        <button onClick={handleLogout} className="btn-logout">Logout</button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading alert console...</div>
                ) : (
                    <>
                        <div className="admin-status-row">
                            <div className="admin-status-card success">
                                <Radio size={18} />
                                <div>
                                    <span>Dispatch Gateway</span>
                                    <strong>{gatewayLabel}</strong>
                                </div>
                            </div>
                            <div className="admin-status-card">
                                <MapPin size={18} />
                                <div>
                                    <span>Active Alert Zones</span>
                                    <strong>{zones.length}</strong>
                                </div>
                            </div>
                            <div className="admin-status-card warning">
                                <Activity size={18} />
                                <div>
                                    <span>Recent Dispatches</span>
                                    <strong>{stats?.recent?.length || 0}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="stats-grid sms-stats-grid">
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Total Logs</h3>
                                    <p className="stat-number">{stats?.total || 0}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Sent</h3>
                                    <p className="stat-number success-number">{statusCount('SENT')}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Simulated</h3>
                                    <p className="stat-number info-number">{statusCount('SIMULATED')}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Failed</h3>
                                    <p className="stat-number danger-number">{statusCount('FAILED')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="admin-tabs">
                            {[
                                ['dispatch', Send, 'Dispatch Alert'],
                                ['history', Clock, 'History'],
                                ['stats', BarChart2, 'Analytics'],
                            ].map(([key, Icon, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={`admin-tab ${tab === key ? 'active' : ''}`}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'dispatch' && (
                            <div className="alert-compose-layout">
                                <section className="dashboard-section admin-panel compose-panel">
                                    <div className="panel-heading">
                                        <div>
                                            <span className="admin-kicker">Manual Dispatch</span>
                                            <h2>Compose Alert</h2>
                                        </div>
                                        <MessageSquareText size={22} />
                                    </div>

                                    <form onSubmit={handleDispatch} className="alert-form">
                                        <div className="form-group">
                                            <label>Target Zone *</label>
                                            <select
                                                value={form.zone}
                                                onChange={(e) => setForm((current) => ({ ...current, zone: e.target.value }))}
                                                required
                                            >
                                                <option value="">Select zone</option>
                                                <option value="ALL">All zones broadcast</option>
                                                {zones.map((zoneName) => (
                                                    <option key={zoneName} value={zoneName}>{zoneName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Risk Level *</label>
                                            <div className="risk-button-grid">
                                                {RISK_LEVELS.map((level) => (
                                                    <button
                                                        type="button"
                                                        key={level}
                                                        onClick={() => setForm((current) => ({ ...current, riskLevel: level }))}
                                                        className={`risk-button ${riskClass(level)} ${form.riskLevel === level ? 'selected' : ''}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Alert Title</label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                                                placeholder={`${form.riskLevel} Flood Alert - ${form.zone || 'Zone'}`}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                Custom Message
                                                <span> leave blank to use the safe template</span>
                                            </label>
                                            <textarea
                                                value={form.customMessage}
                                                onChange={(e) => setForm((current) => ({ ...current, customMessage: e.target.value }))}
                                                rows={4}
                                                placeholder="Auto-generated based on risk level and target zone."
                                            />
                                        </div>

                                        <div className={`message-preview ${riskClass(form.riskLevel)}`}>
                                            <div className="preview-header">
                                                <span>SMS Preview</span>
                                                <span>{previewMessage.length} chars / {messageSegments} SMS</span>
                                            </div>
                                            <p>{previewMessage}</p>
                                        </div>

                                        <button type="submit" disabled={dispatching} className="admin-primary-button full-width">
                                            <Send size={17} />
                                            {dispatching ? 'Dispatching...' : 'Send Alert Now'}
                                        </button>
                                    </form>

                                    {result && (
                                        <div className={`dispatch-result ${result.success ? 'success' : 'failed'}`}>
                                            {result.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                            <div>
                                                <strong>{result.success ? 'Dispatch Completed' : 'Dispatch Failed'}</strong>
                                                <p>{result.message}</p>
                                                {result.results && (
                                                    <span>
                                                        Sent {result.results.sent} / Simulated {result.results.simulated} / Failed {result.results.failed} / Total {result.results.total}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <section className="dashboard-section admin-panel guidance-panel">
                                    <div className={`risk-guidance-card ${riskClass(form.riskLevel)}`}>
                                        <ShieldAlert size={24} />
                                        <div>
                                            <span>{form.riskLevel} protocol</span>
                                            <h3>{selectedGuidance.title}</h3>
                                            <p>{selectedGuidance.action}</p>
                                        </div>
                                    </div>

                                    <div className="readiness-list">
                                        {selectedGuidance.checklist.map((item) => (
                                            <div key={item}>
                                                <CheckCircle2 size={16} />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="quick-zone-picker">
                                        <div className="section-mini-heading">
                                            <span>Quick Zone Pick</span>
                                            <p>Choose one of the active registered zones.</p>
                                        </div>
                                        <div className="quick-zone-grid">
                                            {zones.slice(0, 8).map((zoneName) => (
                                                <button
                                                    type="button"
                                                    key={zoneName}
                                                    onClick={() => setForm((current) => ({ ...current, zone: zoneName }))}
                                                    className={form.zone === zoneName ? 'selected' : ''}
                                                >
                                                    {zoneName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {tab === 'history' && (
                            <section className="dashboard-section admin-panel">
                                <div className="panel-heading">
                                    <div>
                                        <span className="admin-kicker">Audit Trail</span>
                                        <h2>Alert History ({logTotal} total)</h2>
                                    </div>
                                    <button onClick={() => loadLogs(1)} className="admin-secondary-button">
                                        <RefreshCw size={16} />
                                        Refresh
                                    </button>
                                </div>

                                <div className="history-toolbar">
                                    <select
                                        value={historyFilters.zone}
                                        onChange={(e) => setHistoryFilters((current) => ({ ...current, zone: e.target.value }))}
                                    >
                                        <option value="">All Zones</option>
                                        {zones.map((zoneName) => (
                                            <option key={zoneName} value={zoneName}>{zoneName}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={historyFilters.status}
                                        onChange={(e) => setHistoryFilters((current) => ({ ...current, status: e.target.value }))}
                                    >
                                        <option value="">All Statuses</option>
                                        {STATUS_LEVELS.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => loadLogs(1, historyFilters)} className="admin-primary-button compact">Apply</button>
                                    <button
                                        onClick={() => {
                                            const emptyFilters = { zone: '', status: '' };
                                            setHistoryFilters(emptyFilters);
                                            loadLogs(1, emptyFilters);
                                        }}
                                        className="admin-secondary-button"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {logs.length === 0 ? (
                                    <p className="muted-copy">No alerts match the selected filters.</p>
                                ) : (
                                    <>
                                        <div className="admin-table-wrap">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Phone</th>
                                                        <th>Zone</th>
                                                        <th>Risk</th>
                                                        <th>Status</th>
                                                        <th>Title</th>
                                                        <th>Sent At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {logs.map((log, index) => (
                                                        <tr key={log._id || index}>
                                                            <td className="mono-cell">{log.phoneNumber}</td>
                                                            <td>{log.zone || '-'}</td>
                                                            <td>
                                                                {log.riskLevel ? (
                                                                    <span className={`risk-badge ${riskClass(log.riskLevel)}`}>{log.riskLevel}</span>
                                                                ) : '-'}
                                                            </td>
                                                            <td>
                                                                <span className={`status-pill ${statusClass(log.status)}`}>{log.status}</span>
                                                            </td>
                                                            <td className="truncate-cell">{log.alertTitle || '-'}</td>
                                                            <td>{formatDateTime(log.sentAt)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {logPages > 1 && (
                                            <div className="pagination">
                                                <span>Page {logPage} of {logPages}</span>
                                                <div className="pagination-buttons">
                                                    <button
                                                        onClick={() => loadLogs(logPage - 1)}
                                                        disabled={logPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                    <button
                                                        onClick={() => loadLogs(logPage + 1)}
                                                        disabled={logPage === logPages}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>
                        )}

                        {tab === 'stats' && stats && (
                            <div className="dashboard-sections">
                                <section className="dashboard-section admin-panel">
                                    <h2>Alerts by Zone</h2>
                                    <div className="analytics-list">
                                        {stats.byZone?.length ? stats.byZone.map((zoneStat) => (
                                            <div key={zoneStat._id} className="analytics-row">
                                                <div className="analytics-row-label">
                                                    <span>{zoneStat._id}</span>
                                                    <strong>{zoneStat.count} alerts</strong>
                                                </div>
                                                <div className="analytics-bar">
                                                    <span style={{ width: `${Math.max(8, (zoneStat.count / maxZoneAlerts) * 100)}%` }} />
                                                </div>
                                            </div>
                                        )) : <p className="muted-copy">No zone analytics yet.</p>}
                                    </div>
                                </section>

                                <section className="dashboard-section admin-panel">
                                    <h2>Alerts by Risk Level</h2>
                                    <div className="analytics-list">
                                        {sortedRiskStats.length ? sortedRiskStats.map((riskStat) => (
                                            <div key={riskStat._id} className="analytics-row">
                                                <div className="analytics-row-label">
                                                    <span className={`risk-badge ${riskClass(riskStat._id)}`}>{riskStat._id}</span>
                                                    <strong>{riskStat.count} alerts</strong>
                                                </div>
                                                <div className={`analytics-bar ${riskClass(riskStat._id)}`}>
                                                    <span style={{ width: `${Math.max(8, (riskStat.count / maxRiskAlerts) * 100)}%` }} />
                                                </div>
                                            </div>
                                        )) : <p className="muted-copy">No risk analytics yet.</p>}
                                    </div>
                                </section>

                                <section className="dashboard-section admin-panel">
                                    <h2>Recent Dispatches</h2>
                                    <div className="recent-list">
                                        {stats.recent?.length ? stats.recent.map((item) => (
                                            <div key={item._id} className="recent-item">
                                                <AlertTriangle size={17} />
                                                <div>
                                                    <strong>{item.alertTitle || `${item.riskLevel || 'Flood'} Alert`}</strong>
                                                    <span>{item.zone || 'Unknown zone'} - {formatDateTime(item.sentAt)}</span>
                                                </div>
                                                <span className={`status-pill ${statusClass(item.status)}`}>{item.status}</span>
                                            </div>
                                        )) : <p className="muted-copy">No recent dispatches yet.</p>}
                                    </div>
                                </section>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminAlertsManagement;
