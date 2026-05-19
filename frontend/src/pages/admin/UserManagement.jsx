import { useState, useEffect } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Bell,
    Home,
    UserPlus,
    Pencil,
    Lock,
    Unlock,
    Trash2,
    X,
    Search,
} from 'lucide-react';
import '../../styles/admin.css';

const PAGE_SIZE = 20;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [zone, setZone] = useState('');
    const [status, setStatus] = useState('');
    const [zones, setZones] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const adminData = localStorage.getItem('adminData');
        if (!adminData) {
            navigate('/admin/login');
            return;
        }
        fetchUsers();
        fetchZones();
    }, [navigate, search, zone, status, pagination.page]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const params = new URLSearchParams({
                page: pagination.page,
                limit: PAGE_SIZE,
                ...(search && { search }),
                ...(zone && { zone }),
                ...(status && { status }),
            });

            const response = await fetch(`/api/admin/users?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    navigate('/admin/login');
                    return;
                }
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchZones = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('/api/admin/users/zones', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setZones(data);
        } catch (error) {
            console.error('Error fetching zones:', error);
        }
    };

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete ${userName}?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                alert('User deleted successfully');
                fetchUsers();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin/login');
    };

    const firstItem = pagination.total ? ((pagination.page - 1) * PAGE_SIZE) + 1 : 0;
    const lastItem = Math.min(pagination.page * PAGE_SIZE, pagination.total);

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
            </aside>

            <main className="admin-main">
                <div className="admin-header">
                    <div className="admin-header-left">
                        <span className="admin-kicker">Registered Residents</span>
                        <h1>Users</h1>
                        <p>Manage contact details, alert permissions, zones, and account access.</p>
                    </div>
                    <div className="admin-header-right">
                        <button onClick={handleLogout} className="btn-logout">Logout</button>
                    </div>
                </div>

                <div className="admin-content">
                    <div className="users-header">
                        <div className="filters">
                            <label className="admin-search-field">
                                <Search size={17} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPagination((prev) => ({ ...prev, page: 1 }));
                                    }}
                                />
                            </label>
                            <select
                                value={zone}
                                onChange={(e) => {
                                    setZone(e.target.value);
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                }}
                                className="filter-select"
                            >
                                <option value="">All Zones</option>
                                {zones.map((z) => (
                                    <option key={z} value={z}>{z}</option>
                                ))}
                            </select>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                }}
                                className="filter-select"
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <button onClick={() => setShowAddModal(true)} className="btn-add-user">
                            <UserPlus size={17} />
                            Add User
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">Loading users...</div>
                    ) : (
                        <>
                            <div className="users-table-container">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Zone</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user._id}>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>{user.phone}</td>
                                                <td><span className="zone-badge">{user.zone}</span></td>
                                                <td>
                                                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                                                        {user.isActive ? 'active' : 'inactive'}
                                                    </span>
                                                </td>
                                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            onClick={() => setEditUser(user)}
                                                            className="btn-edit"
                                                            title="Edit"
                                                            aria-label={`Edit ${user.name}`}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(user._id, user.isActive)}
                                                            className="btn-toggle"
                                                            title={user.isActive ? 'Deactivate' : 'Activate'}
                                                            aria-label={user.isActive ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                                                        >
                                                            {user.isActive ? <Lock size={15} /> : <Unlock size={15} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user._id, user.name)}
                                                            className="btn-delete"
                                                            title="Delete"
                                                            aria-label={`Delete ${user.name}`}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pagination">
                                <span>
                                    Showing {firstItem} to {lastItem} of {pagination.total} users
                                </span>
                                <div className="pagination-buttons">
                                    <button
                                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                    >
                                        Previous
                                    </button>
                                    <span>Page {pagination.page} of {pagination.pages}</span>
                                    <button
                                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page === pagination.pages}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {showAddModal && (
                <UserModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchUsers();
                    }}
                    zones={zones}
                />
            )}

            {editUser && (
                <UserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSuccess={() => {
                        setEditUser(null);
                        fetchUsers();
                    }}
                    zones={zones}
                />
            )}
        </div>
    );
};

const UserModal = ({ user, onClose, onSuccess, zones }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        zone: user?.zone || '',
        address: user?.address || '',
        isActive: user?.isActive ?? true,
        alertsEnabled: user?.alertsEnabled ?? true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('adminToken');
            const url = user
                ? `/api/admin/users/${user._id}`
                : '/api/admin/users';

            const body = { ...formData };
            if (user && !formData.password) {
                delete body.password;
            }

            const response = await fetch(url, {
                method: user ? 'PUT' : 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Operation failed');
            }

            alert(data.message);
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{user ? 'Edit User' : 'Add New User'}</h2>
                    <button onClick={onClose} className="modal-close" aria-label="Close modal">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Phone *</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password {!user && '*'}</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!user}
                                placeholder={user ? 'Leave blank to keep current' : ''}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Zone *</label>
                            <select
                                value={formData.zone}
                                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                required
                            >
                                <option value="">Select Zone</option>
                                {zones.map((z) => (
                                    <option key={z} value={z}>{z}</option>
                                ))}
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Address</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                Active Account
                            </label>
                        </div>
                        <div className="form-group-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={formData.alertsEnabled}
                                    onChange={(e) => setFormData({ ...formData, alertsEnabled: e.target.checked })}
                                />
                                Alerts Enabled
                            </label>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Saving...' : (user ? 'Update User' : 'Add User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserManagement;
