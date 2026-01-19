import React, { useState } from 'react';
import { Settings as SettingsIcon, Plane, DollarSign, Building, Plus, Edit, Trash2, X, Link as LinkIcon, Save, Phone, User, Shield, Users, Lock, CheckCircle, Ban, AlertTriangle, Mail, Key } from 'lucide-react';
import { useFlights } from '../context/FlightContext';
import { useAuth } from '../context/AuthContext';
import RoleEditor from '../components/RoleEditor';

const Settings = () => {
    const { airlines, addAirline, updateAirline, deleteAirline, agencies, addAgency, updateAgency, deleteAgency, hasPermission, resolveUserName } = useFlights();
    const { createNewUser, userRole } = useAuth();
    const [showAirlineModal, setShowAirlineModal] = useState({ show: false, airline: null });
    const [showAgencyModal, setShowAgencyModal] = useState({ show: false, agency: null });

    // Airline Form Data
    const [formData, setFormData] = useState({
        name: '',
        ticketTemplate: '',
        manifestTemplate: '',
        manifestUs: '',
        manifestAirport: ''
    });

    // Agency Form Data
    const [agencyForm, setAgencyForm] = useState({
        name: '',
        phone: '',
        managerName: '',
        managerPhone: ''
    });

    const { prices, updatePrices } = useFlights();
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceForm, setPriceForm] = useState({ adult: 0, child: 0, infant: 0, tax: 0, surcharge: 0 });
    const [selectedAirlineForPricing, setSelectedAirlineForPricing] = useState(null);

    // User Management Data
    const { users, addUser, updateUser, toggleUserStatus, refreshData } = useFlights();
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Staff',
        agencyName: ''
    });
    const [userFormError, setUserFormError] = useState('');

    const handleAddUser = () => {
        setUserForm({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'Staff',
            agencyName: ''
        });
        setUserFormError('');
        setShowUserModal(true);
    };

    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setUserFormError('');

        if (userForm.password !== userForm.confirmPassword) {
            setUserFormError('Passwords do not match');
            return;
        }

        if (userForm.password.length < 6) {
            setUserFormError('Password must be at least 6 characters');
            return;
        }

        if (!userForm.email.includes('@')) {
            setUserFormError('Please enter a valid email address');
            return;
        }

        setIsCreatingUser(true);

        try {
            await createNewUser(userForm.email, userForm.password, userForm.role, userForm.name, userForm.agencyName);
            await refreshData();
            setShowUserModal(false);
            setUserForm({ name: '', email: '', password: '', confirmPassword: '', role: 'Staff', agencyName: '' });
        } catch (error) {
            const errorMessage = error.message || error.error_description || '';
            if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('already been registered')) {
                setUserFormError('This email is already registered');
            } else if (errorMessage.includes('Invalid email') || errorMessage.includes('email format')) {
                setUserFormError('Invalid email format');
            } else if (errorMessage.includes('Password')) {
                setUserFormError('Password must be at least 6 characters');
            } else {
                setUserFormError(errorMessage || 'Failed to create user. Please try again.');
            }
        }

        setIsCreatingUser(false);
    };

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: '',
        message: '',
        type: 'danger', // danger, success, warning
        action: null
    });

    const handleToggleUserStatus = (user) => {
        const isDeactivating = user.active;
        setConfirmModal({
            show: true,
            title: isDeactivating ? 'Deactivate User?' : 'Activate User?',
            message: isDeactivating
                ? `Are you sure you want to deactivate ${user.name}? They will lose access to the system immediately.`
                : `Are you sure you want to activate ${user.name}? They will regain access to the system.`,
            type: isDeactivating ? 'danger' : 'success',
            action: () => {
                toggleUserStatus(user.id);
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    const handleEditPrices = (airline = null) => {
        const targetAirline = airline || airlines[0];
        if (targetAirline) {
            setSelectedAirlineForPricing(targetAirline);
            setPriceForm({
                adult: targetAirline.adultPrice || 0,
                child: targetAirline.childPrice || 0,
                infant: targetAirline.infantPrice || 0,
                tax: targetAirline.tax || 0,
                surcharge: targetAirline.surcharge || 0
            });
            setShowPriceModal(true);
        }
    };

    const handleSavePrices = (e) => {
        e.preventDefault();
        if (selectedAirlineForPricing) {
            updateAirline(selectedAirlineForPricing.id, {
                ...selectedAirlineForPricing,
                adultPrice: Number(priceForm.adult),
                childPrice: Number(priceForm.child),
                infantPrice: Number(priceForm.infant),
                tax: Number(priceForm.tax),
                surcharge: Number(priceForm.surcharge)
            });
        }
        setShowPriceModal(false);
    };

    const handleEditAirline = (airline) => {
        setFormData({ ...airline });
        setShowAirlineModal({ show: true, airline });
    };

    const handleAddAirline = () => {
        setFormData({
            name: '',
            defaultFlightNumber: '',
            defaultBookingReference: '',
            ticketTemplate: '',
            manifestTemplate: '',
            manifestUs: '',
            manifestAirport: ''
        });
        setShowAirlineModal({ show: true, airline: null });
    };

    const handleSaveAirline = (e) => {
        e.preventDefault();
        if (showAirlineModal.airline) {
            updateAirline(showAirlineModal.airline.id, formData);
        } else {
            addAirline(formData);
        }
        setShowAirlineModal({ show: false, airline: null });
    };

    const handleDeleteAirline = (id) => {
        setConfirmModal({
            show: true,
            title: 'Delete Airline?',
            message: 'Are you sure you want to delete this airline? This action cannot be undone.',
            type: 'danger',
            action: () => {
                deleteAirline(id);
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    // Agency Handlers
    const handleAddAgency = () => {
        setAgencyForm({ name: '', phone: '', managerName: '', managerPhone: '' });
        setShowAgencyModal({ show: true, agency: null });
    };

    const handleEditAgency = (agency) => {
        setAgencyForm({ ...agency });
        setShowAgencyModal({ show: true, agency });
    };

    const handleSaveAgency = (e) => {
        e.preventDefault();
        if (showAgencyModal.agency) {
            updateAgency(showAgencyModal.agency.id, agencyForm);
        } else {
            addAgency(agencyForm);
        }
        setShowAgencyModal({ show: false, agency: null });
    };

    const handleDeleteAgency = (id) => {
        setConfirmModal({
            show: true,
            title: 'Delete Agency?',
            message: 'Are you sure you want to delete this agency? This action cannot be undone.',
            type: 'danger',
            action: () => {
                deleteAgency(id);
                setConfirmModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    const [activeTab, setActiveTab] = useState('airlines');

    const formatAuditDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'airlines':
                return (
                    <div className="settings-card w-full">
                        <div className="card-header">
                            <div className="flex items-center gap-3 flex-1">
                                <Plane size={24} className="text-primary" />
                                <h2>Manage Airlines</h2>
                            </div>
                            {hasPermission('settings', 'airline_create') && (
                                <button className="btn-icon-circle primary" onClick={handleAddAirline} title="Add Airline">
                                    <Plus size={18} />
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            <p className="text-muted mb-4">Register new airlines with custom document templates.</p>
                            <div className="iron-scroll-container">
                                <div className="iron-scroll-content">
                                    <div className="airlines-list" style={{ minWidth: '600px' }}>
                                        {airlines.map(airline => (
                                            <div key={airline.id} className="airline-item">
                                                <div className="airline-info">
                                                    <h4>{airline.name}</h4>
                                                    <div className="template-badges">
                                                        {airline.ticketTemplate && <span className="badge-template" title="Ticket Template Configured">TK</span>}
                                                        {airline.manifestUs && <span className="badge-template" title="Manifest US Configured">US</span>}
                                                        {airline.manifestAirport && <span className="badge-template" title="Manifest Airport Configured">AP</span>}
                                                    </div>
                                                    {airline.updatedAt && (
                                                        <div className="audit-badge mt-1">
                                                            <span>Last updated: {formatAuditDate(airline.updatedAt)} by {resolveUserName(airline.updatedBy)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="airline-actions">
                                                    {airline.id !== 'fly24_default' && (
                                                        <>
                                                            {hasPermission('settings', 'airline_update') && (
                                                                <button className="btn-icon-sm edit" onClick={() => handleEditAirline(airline)}>
                                                                    <Edit size={14} />
                                                                </button>
                                                            )}
                                                            {hasPermission('settings', 'airline_delete') && (
                                                                <button className="btn-icon-sm delete" onClick={() => handleDeleteAirline(airline.id)}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'prices':
                return (
                    <div className="settings-card w-full">
                        <div className="card-header">
                            <div className="flex items-center gap-3 flex-1">
                                <DollarSign size={24} className="text-primary" />
                                <h2>Pricing by Airline</h2>
                            </div>
                        </div>
                        <div className="card-body">
                            <p className="text-muted mb-4">Configure prices specific to each airline.</p>
                            {airlines.length === 0 ? (
                                <div className="empty-state text-center py-6 text-muted">
                                    <p>No airlines added yet. Add an airline to configure pricing.</p>
                                </div>
                            ) : (
                                <div className="iron-scroll-container">
                                    <div className="iron-scroll-content">
                                        <div className="table-container" style={{ margin: 0, border: 'none' }}>
                                            <table className="passenger-table">
                                                <thead>
                                                    <tr>
                                                        <th className="col-name" style={{ minWidth: '200px', textAlign: 'left' }}>Airline</th>
                                                        <th>Adult</th>
                                                        <th>Child</th>
                                                        <th>Infant</th>
                                                        <th>Tax</th>
                                                        <th>Surcharge</th>
                                                        <th style={{ minWidth: '250px' }}>Last Updated</th>
                                                        <th className="col-actions">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {airlines.map(airline => (
                                                        <tr key={airline.id}>
                                                            <td className="font-medium" style={{ textAlign: 'left' }}>{airline.name}</td>
                                                            <td>${airline.adultPrice || 0}</td>
                                                            <td>${airline.childPrice || 0}</td>
                                                            <td>${airline.infantPrice || 0}</td>
                                                            <td>${airline.tax || 0}</td>
                                                            <td>${airline.surcharge || 0}</td>
                                                            <td>
                                                                {airline.updatedAt ? (
                                                                    <div className="text-xs text-muted">
                                                                        {formatAuditDate(airline.updatedAt)} by {resolveUserName(airline.updatedBy)}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td className="col-actions">
                                                                {hasPermission('settings', 'pricing_edit') && (
                                                                    <button className="btn-icon-sm edit" onClick={() => handleEditPrices(airline)} title="Edit Pricing">
                                                                        <Edit size={14} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'agencies':
                return (
                    <div className="settings-card w-full">
                        <div className="card-header">
                            <div className="flex items-center gap-3 flex-1">
                                <Building size={24} className="text-primary" />
                                <h2>Agency Management</h2>
                            </div>
                            {hasPermission('settings', 'agency_create') && (
                                <button className="btn-icon-circle primary" onClick={handleAddAgency} title="Add Agency">
                                    <Plus size={18} />
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            <p className="text-muted mb-4">Manage trusted travel agencies and representatives.</p>
                            {agencies.length === 0 ? (
                                <div className="empty-state text-center py-6 text-muted">
                                    <p>No agencies added yet.</p>
                                </div>
                            ) : (
                                <div className="iron-scroll-container">
                                    <div className="iron-scroll-content">
                                        <div className="airlines-list" style={{ minWidth: '600px' }}>
                                            {agencies.map(agency => (
                                                <div key={agency.id} className="airline-item">
                                                    <div className="airline-info">
                                                        <h4>{agency.name}</h4>
                                                        <div className="text-xs text-muted flex gap-3">
                                                            <span><Phone size={10} className="inline" /> {agency.phone || '-'}</span>
                                                            {agency.managerName && <span><User size={10} className="inline" /> {agency.managerName}</span>}
                                                        </div>
                                                        {agency.updatedAt && (
                                                            <div className="audit-badge mt-1">
                                                                <span>Last updated: {formatAuditDate(agency.updatedAt)} by {resolveUserName(agency.updatedBy)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="airline-actions">
                                                        {hasPermission('settings', 'agency_update') && (
                                                            <button className="btn-icon-sm edit" onClick={() => handleEditAgency(agency)}>
                                                                <Edit size={14} />
                                                            </button>
                                                        )}
                                                        {hasPermission('settings', 'agency_delete') && (
                                                            <button className="btn-icon-sm delete" onClick={() => handleDeleteAgency(agency.id)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="settings-card w-full">
                        <div className="card-header">
                            <div className="flex items-center gap-3 flex-1">
                                <Users size={24} className="text-primary" />
                                <h2>User Management</h2>
                            </div>
                            {hasPermission('settings', 'user_create') && (
                                <button className="btn-icon-circle primary" onClick={handleAddUser} title="Add User">
                                    <Plus size={18} />
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            <p className="text-muted mb-4">Manage system access, roles, and account status.</p>
                            {users.length === 0 ? (
                                <div className="empty-state text-center py-6 text-muted">
                                    <p>No users added yet.</p>
                                </div>
                            ) : (
                                <div className="iron-scroll-container">
                                    <div className="iron-scroll-content">
                                        <div className="airlines-list" style={{ minWidth: '600px' }}>
                                            {users.map(user => (
                                                <div key={user.id} className="airline-item">
                                                    <div className="airline-info">
                                                        <h4>{user.name}</h4>
                                                        <div className="text-xs text-muted flex gap-3 items-center">
                                                            <span className="flex items-center gap-1"><Shield size={10} /> {user.role}</span>
                                                            {user.agencyName && <span className="flex items-center gap-1"><Building size={10} /> {user.agencyName}</span>}
                                                            <span className="flex items-center gap-1"><User size={10} /> {user.username || user.email?.split('@')[0]}</span>
                                                        </div>
                                                    </div>
                                                    <div className="airline-actions flex items-center gap-2">
                                                        <span
                                                            className={`badge-status ${user.active ? 'active' : 'inactive'}`}
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '4px',
                                                                background: user.active ? 'rgba(5, 150, 105, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                                                color: user.active ? '#059669' : '#64748b',
                                                                border: `1px solid ${user.active ? '#059669' : '#e2e8f0'}`,
                                                                marginRight: '0.5rem'
                                                            }}
                                                        >
                                                            {user.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                        <button
                                                            className={`btn-icon-sm ${user.active ? 'delete' : 'edit'}`}
                                                            onClick={() => {
                                                                const perm = user.active ? 'user_deactivate' : 'user_activate';
                                                                if (hasPermission('settings', perm)) {
                                                                    handleToggleUserStatus(user);
                                                                } else {
                                                                    toast.error('You do not have permission to perform this action');
                                                                }
                                                            }}
                                                            title={user.active ? "Deactivate User" : "Activate User"}
                                                            disabled={user.active ? !hasPermission('settings', 'user_deactivate') : !hasPermission('settings', 'user_activate')}
                                                            style={{ opacity: (user.active ? !hasPermission('settings', 'user_deactivate') : !hasPermission('settings', 'user_activate')) ? 0.5 : 1 }}
                                                        >
                                                            {user.active ? <Ban size={14} /> : <CheckCircle size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div >
                );
            case 'roles':
                return <RoleEditor />;
            default:
                return null;
        }
    };

    return (
        <div className="settings-page">
            <header className="page-header">
                <h1 className="page-title">Application Settings</h1>
            </header>

            <div className="iron-scroll-container" style={{ marginBottom: '2rem' }}>
                <div className="iron-scroll-content">
                    <div className="settings-tabs" style={{ borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
                        {(hasPermission('settings', 'airline_create') || hasPermission('settings', 'airline_delete')) && (
                            <button
                                className={`tab-item ${activeTab === 'airlines' ? 'active' : ''}`}
                                onClick={() => setActiveTab('airlines')}
                            >
                                <Plane size={16} className="inline mr-2" /> Airlines
                            </button>
                        )}
                        {hasPermission('settings', 'pricing_edit') && (
                            <button
                                className={`tab-item ${activeTab === 'prices' ? 'active' : ''}`}
                                onClick={() => setActiveTab('prices')}
                            >
                                <DollarSign size={16} className="inline mr-2" /> Prices
                            </button>
                        )}
                        {(hasPermission('settings', 'agency_create') || hasPermission('settings', 'agency_delete')) && (
                            <button
                                className={`tab-item ${activeTab === 'agencies' ? 'active' : ''}`}
                                onClick={() => setActiveTab('agencies')}
                            >
                                <Building size={16} className="inline mr-2" /> Agencies
                            </button>
                        )}
                        {(userRole === 'Admin' || hasPermission('settings', 'user_create')) && (
                            <button
                                className={`tab-item ${activeTab === 'users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                <Users size={16} className="inline mr-2" /> Users
                            </button>
                        )}
                        {userRole === 'Admin' && (
                            <button
                                className={`tab-item ${activeTab === 'roles' ? 'active' : ''}`}
                                onClick={() => setActiveTab('roles')}
                            >
                                <Shield size={16} className="inline mr-2" /> Roles
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="settings-content">
                {renderContent()}
            </div>

            {/* Airline Modal */}
            {
                showAirlineModal.show && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-lg">
                            <div className="modal-header">
                                <h2>{showAirlineModal.airline ? 'Edit Airline' : 'Add New Airline'}</h2>
                                <button className="btn-icon-close" onClick={() => setShowAirlineModal({ show: false, airline: null })}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveAirline}>
                                {/* Row 1: Name, Prefix, PNR */}
                                <div className="grid-cols-3 mb-4">
                                    <div className="form-group">
                                        <label>Airline Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="e.g. Emirates"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Flight No. Prefix</label>
                                        <input
                                            type="text"
                                            value={formData.defaultFlightNumber}
                                            onChange={(e) => setFormData({ ...formData, defaultFlightNumber: e.target.value })}
                                            placeholder="e.g. EK"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Default PNR</label>
                                        <input
                                            type="text"
                                            value={formData.defaultBookingReference}
                                            onChange={(e) => setFormData({ ...formData, defaultBookingReference: e.target.value })}
                                            placeholder="e.g. AIEW07"
                                        />
                                    </div>
                                </div>

                                <h4 className="section-title-sm mb-3">Template Configuration (Direct Links)</h4>

                                {/* Row 2: Ticket & General Manifest */}
                                <div className="grid-cols-2 mb-3">
                                    <div className="form-group">
                                        <label><LinkIcon size={14} /> Ticket Template URL</label>
                                        <input
                                            type="text"
                                            value={formData.ticketTemplate}
                                            onChange={(e) => setFormData({ ...formData, ticketTemplate: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><LinkIcon size={14} /> General Manifest URL</label>
                                        <input
                                            type="text"
                                            value={formData.manifestTemplate}
                                            onChange={(e) => setFormData({ ...formData, manifestTemplate: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                {/* Row 3: US & Airport Manifests */}
                                <div className="grid-cols-2">
                                    <div className="form-group">
                                        <label><LinkIcon size={14} /> Manifest (US) URL</label>
                                        <input
                                            type="text"
                                            value={formData.manifestUs}
                                            onChange={(e) => setFormData({ ...formData, manifestUs: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><LinkIcon size={14} /> Manifest (Airport) URL</label>
                                        <input
                                            type="text"
                                            value={formData.manifestAirport}
                                            onChange={(e) => setFormData({ ...formData, manifestAirport: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions mt-6">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAirlineModal({ show: false, airline: null })}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <Save size={18} /> Save Airline
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Agency Modal */}
            {
                showAgencyModal.show && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-lg">
                            <div className="modal-header">
                                <h2>{showAgencyModal.agency ? 'Edit Agency' : 'Add New Agency'}</h2>
                                <button className="btn-icon-close" onClick={() => setShowAgencyModal({ show: false, agency: null })}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveAgency}>
                                {/* All fields in 2x2 grid */}
                                <div className="grid-cols-2 mb-4">
                                    <div className="form-group">
                                        <label>Agency Name</label>
                                        <input
                                            type="text"
                                            value={agencyForm.name}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                                            required
                                            placeholder="e.g. Skyline Travels"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Agency Phone</label>
                                        <input
                                            type="text"
                                            value={agencyForm.phone}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
                                            placeholder="+1 234..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Manager Name</label>
                                        <input
                                            type="text"
                                            value={agencyForm.managerName}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, managerName: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Manager Phone</label>
                                        <input
                                            type="text"
                                            value={agencyForm.managerPhone}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, managerPhone: e.target.value })}
                                            placeholder="+1 234..."
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions mt-6">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAgencyModal({ show: false, agency: null })}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <Save size={18} /> Save Agency
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Price Modal */}
            {
                showPriceModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>
                                    {selectedAirlineForPricing ? `Edit ${selectedAirlineForPricing.name} Prices` : 'Edit Airline Prices'}
                                </h2>
                                <button className="btn-icon-close" onClick={() => setShowPriceModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSavePrices}>
                                <h4 className="section-title-sm mb-3">Base Fares ($)</h4>
                                <div className="grid-cols-2">
                                    <div className="form-group">
                                        <label>Adult Price</label>
                                        <input
                                            type="number"
                                            value={priceForm.adult}
                                            onChange={(e) => setPriceForm({ ...priceForm, adult: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Child Price</label>
                                        <input
                                            type="number"
                                            value={priceForm.child}
                                            onChange={(e) => setPriceForm({ ...priceForm, child: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Infant Price</label>
                                        <input
                                            type="number"
                                            value={priceForm.infant}
                                            onChange={(e) => setPriceForm({ ...priceForm, infant: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <h4 className="section-title-sm mb-3 mt-4">Additional Charges ($)</h4>
                                <div className="grid-cols-2">
                                    <div className="form-group">
                                        <label>Default Tax</label>
                                        <input
                                            type="number"
                                            value={priceForm.tax}
                                            onChange={(e) => setPriceForm({ ...priceForm, tax: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Default Surcharge</label>
                                        <input
                                            type="number"
                                            value={priceForm.surcharge}
                                            onChange={(e) => setPriceForm({ ...priceForm, surcharge: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions mt-6">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowPriceModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <Save size={18} /> Save Prices
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* User Modal */}
            {
                showUserModal && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-lg">
                            <div className="modal-header">
                                <h2>Add New User</h2>
                                <button className="btn-icon-close" onClick={() => setShowUserModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveUser}>
                                <div className="grid-cols-2 mb-4">
                                    <div className="form-group">
                                        <label><User size={14} /> Full Name</label>
                                        <input
                                            type="text"
                                            value={userForm.name}
                                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                            required
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><Mail size={14} /> Email Address</label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                            required
                                            placeholder="john@example.com"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div className="grid-cols-3 mb-4">
                                    <div className="form-group">
                                        <label><Lock size={14} /> Password</label>
                                        <input
                                            type="password"
                                            value={userForm.password}
                                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                            required
                                            placeholder="Min 6 characters"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><Lock size={14} /> Confirm Password</label>
                                        <input
                                            type="password"
                                            value={userForm.confirmPassword}
                                            onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                            required
                                            placeholder="Repeat password"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><Building size={14} /> Agency (Optional)</label>
                                        <select
                                            value={userForm.agencyName}
                                            onChange={(e) => setUserForm({ ...userForm, agencyName: e.target.value })}
                                        >
                                            <option value="">No Specific Agency</option>
                                            {agencies.map(agency => (
                                                <option key={agency.id} value={agency.name}>{agency.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label><Shield size={14} /> Role</label>
                                        <select
                                            value={userForm.role}
                                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Staff">Staff</option>
                                        </select>
                                    </div>
                                </div>

                                {userFormError && (
                                    <div className="error-banner mb-4">
                                        <AlertTriangle size={16} />
                                        <span>{userFormError}</span>
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)} disabled={isCreatingUser}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={isCreatingUser}>
                                        {isCreatingUser ? 'Creating...' : <><Save size={18} /> Create User</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            {
                confirmModal.show && (
                    <div className="modal-overlay">
                        <div className="modal-content text-center p-8" style={{ maxWidth: '400px', padding: '2rem' }}>
                            <div
                                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${confirmModal.type === 'danger' ? 'bg-danger-light text-danger' : 'bg-success-light text-success'
                                    }`}
                            >
                                <AlertTriangle size={32} />
                            </div>

                            <h2 className="mb-2 text-lg font-bold text-main">{confirmModal.title}</h2>

                            <p className="mb-6 text-muted text-sm">{confirmModal.message}</p>

                            <div className="flex justify-center mt-6">
                                <button
                                    className="btn"
                                    style={{
                                        backgroundColor: '#f1f5f9',
                                        color: '#334155',
                                        border: '1px solid #e2e8f0',
                                        fontWeight: 600,
                                        padding: '0 2rem',
                                        height: '48px',
                                        borderRadius: '8px',
                                        flex: 1
                                    }}
                                    onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    style={{
                                        backgroundColor: confirmModal.type === 'danger' ? '#ef4444' : '#22c55e',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0 2rem',
                                        height: '48px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                                        marginLeft: '12px',
                                        flex: 1
                                    }}
                                    onClick={confirmModal.action}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Settings;
