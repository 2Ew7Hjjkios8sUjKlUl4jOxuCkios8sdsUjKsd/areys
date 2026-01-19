import React, { useState, useEffect, useRef } from 'react';
import {
    MoreVertical,
    Users,
    Plane,
    Calendar,
    Phone,
    Baby,
    Download,
    Mail,
    MessageSquare,
    Trash2,
    Edit,
    Check,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
const PassengerList = ({
    passengers,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onRemove,
    onEdit,
    onDownloadTicket,
    hasPermission,
    resolveUserName
}) => {
    const { currentUser } = useAuth();
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);

    // Advanced Filtering States
    const [filterType, setFilterType] = useState('ALL');
    const [filterValue, setFilterValue] = useState('');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Close menu on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (openMenuId) setOpenMenuId(null);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [openMenuId]);

    // Derived Data for Filters
    const uniqueAgencies = React.useMemo(() => {
        const agencies = passengers.map(p => p.agency || 'Us');
        return [...new Set(agencies)].sort();
    }, [passengers]);

    const uniqueCreators = React.useMemo(() => {
        const creators = passengers.map(p => p.created_by);
        return [...new Set(creators)].map(id => ({ id, name: resolveUserName(id) })).sort((a, b) => a.name.localeCompare(b.name));
    }, [passengers, resolveUserName]);

    // Filtering Logic
    const filteredPassengers = React.useMemo(() => {
        if (filterType === 'ALL' || !filterValue) return passengers;

        return passengers.filter(p => {
            const val = filterValue.toLowerCase();
            switch (filterType) {
                case 'Name':
                    return p.name?.toLowerCase().includes(val);
                case 'Phone':
                    return (p.phone_number || p.phoneNumber || '').includes(val);
                case 'Occupancies':
                    if (val === 'adults') return p.type === 'Adult';
                    if (val === 'children') return p.type === 'Child';
                    if (val === 'infants') return p.infants && p.infants.length > 0;
                    if (val === 'male') return p.gender === 'M';
                    if (val === 'female') return p.gender === 'F';
                    return true;
                case 'Agencies':
                    return (p.agency || 'Us') === filterValue;
                case 'Users':
                    return p.created_by === filterValue;
                default:
                    return true;
            }
        });
    }, [passengers, filterType, filterValue]);

    if (passengers.length === 0) {
        return (
            <div className="empty-state">
                <Users size={48} className="text-muted mb-4" />
                <p>No tickets added yet. Add some to get started!</p>
            </div>
        );
    }

    const allSelected = filteredPassengers.length > 0 && selectedIds.length === filteredPassengers.length;

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        if (openMenuId === id) {
            setOpenMenuId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 5,
                left: rect.left - 140 // Offset to align left (rect.left is viewport relative)
            });
            setOpenMenuId(id);
        }
    };

    return (
        <div className="passenger-list">
            <div className="list-header">
                <div className="header-left-group">
                    <Users size={18} className="text-primary" />
                    <h3>Registered Passengers ({filteredPassengers.length})</h3>
                </div>
                <label className="select-all-label">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => onToggleSelectAll(filteredPassengers.map(p => p.id))}
                    />
                    <span>Select Filtered</span>
                </label>
            </div>

            {/* Advanced Filter Bar */}
            <div className="filter-bar shadow-sm">
                <div className="filter-group">
                    <Search size={18} className="text-muted" />
                    <select
                        className="filter-select"
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setFilterValue(''); }}
                    >
                        <option value="ALL">All</option>
                        <option value="Name">Name</option>
                        <option value="Phone">Phone</option>
                        <option value="Occupancies">Occupancy</option>
                        <option value="Agencies">Agency</option>
                        <option value="Users">Creator</option>
                    </select>
                </div>

                {filterType !== 'ALL' && (
                    <div className="filter-input-wrapper">
                        {filterType === 'Name' || filterType === 'Phone' ? (
                            <>
                                {filterType === 'Name' ? <Users size={16} className="filter-icon" /> : <Phone size={16} className="filter-icon" />}
                                <input
                                    type="text"
                                    placeholder={`Enter ${filterType.toLowerCase()}...`}
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                    autoFocus
                                />
                            </>
                        ) : filterType === 'Occupancies' ? (
                            <select
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="pl-12"
                                autoFocus
                            >
                                <option value="">Select Occupancy...</option>
                                <option value="adults">Adults</option>
                                <option value="children">Children</option>
                                <option value="infants">With Infants</option>
                                <option value="male">Male Only</option>
                                <option value="female">Female Only</option>
                            </select>
                        ) : filterType === 'Agencies' ? (
                            <select
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="pl-12"
                                autoFocus
                            >
                                <option value="">Select Agency...</option>
                                {uniqueAgencies.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        ) : filterType === 'Users' ? (
                            <select
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="pl-12"
                                autoFocus
                            >
                                <option value="">Select Creator...</option>
                                {uniqueCreators.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        ) : null}
                    </div>
                )}

                {filteredPassengers.length < passengers.length && (
                    <button className="btn-link text-primary" onClick={() => { setFilterType('ALL'); setFilterValue(''); }}>
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="iron-scroll-container">
                <div className="iron-scroll-content">
                    <div className="table-container" style={{ border: 'none', margin: 0 }}>
                        <table className="passenger-table">
                            <thead>
                                <tr>
                                    <th className="col-check">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={() => onToggleSelectAll(filteredPassengers.map(p => p.id))}
                                        />
                                    </th>
                                    <th className="col-no">No.</th>
                                    <th className="col-name">Name & Infants</th>
                                    <th className="col-agency">Agency</th>
                                    <th className="col-phone">Phone Number</th>
                                    <th className="col-creator">Creator</th>
                                    <th className="col-actions text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPassengers.map((p, index) => (
                                    <tr key={p.id} className={selectedIds.includes(p.id) ? 'selected' : ''}>
                                        <td className="col-check">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(p.id)}
                                                onChange={() => onToggleSelect(p.id)}
                                            />
                                        </td>
                                        <td className="col-no">{index + 1}</td>
                                        <td className="col-name">
                                            <div className="passenger-name-cell">
                                                <div className="main-passenger">
                                                    <span className="title-prefix">{p.type === 'Child' ? 'CH' : (p.gender === 'F' ? 'MRS' : 'MR')}</span>
                                                    <span className="full-name">{(p.name || "").toUpperCase()}</span>
                                                    {p.type === 'Child' && <span className="type-badge-sm child">CHILD</span>}
                                                </div>
                                                {p.infants && p.infants.length > 0 && (
                                                    <div className="infant-list-rows">
                                                        {p.infants.map((infant, idx) => (
                                                            <div key={infant.id || idx} className="infant-row-item">
                                                                <Baby size={12} className="text-accent" />
                                                                <span>IFNT {typeof infant === 'string' ? infant.toUpperCase() : infant.name?.toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="col-agency">
                                            <span className={`agency-badge ${p.agency?.toLowerCase() || 'us'}`}>
                                                {p.agency || 'Us'}
                                            </span>
                                        </td>
                                        <td className="col-phone">{p.phone_number || p.phoneNumber || '—'}</td>
                                        <td className="col-creator">
                                            <span className="creator-text">{resolveUserName(p.created_by)}</span>
                                        </td>
                                        <td className="col-actions text-right">
                                            <div className="passenger-actions-dropdown" ref={openMenuId === p.id ? menuRef : null}>
                                                <button
                                                    className="btn-kebab"
                                                    onClick={(e) => toggleMenu(e, p.id)}
                                                >
                                                    <MoreVertical size={20} color="#000000" strokeWidth={2.5} fill="#000000" />
                                                </button>
                                                {openMenuId === p.id && (
                                                    <div
                                                        className="dropdown-menu fixed-menu"
                                                        style={{
                                                            position: 'fixed',
                                                            top: `${menuPosition.top}px`,
                                                            left: `${menuPosition.left}px`,
                                                            right: 'auto',
                                                            zIndex: 9999,
                                                            minWidth: '160px'
                                                        }}
                                                    >
                                                        {(hasPermission('passenger', 'delete') || p.created_by === currentUser.id) && (
                                                            <button onClick={() => { onEdit(p); setOpenMenuId(null); }}>
                                                                <Edit size={14} /> Edit
                                                            </button>
                                                        )}
                                                        {hasPermission('generating', 'download') && (
                                                            <button onClick={() => { onDownloadTicket(p); setOpenMenuId(null); }}>
                                                                <Download size={14} /> Download
                                                            </button>
                                                        )}
                                                        <button onClick={() => { toast.success('Email feature coming soon!', { icon: '🚧' }); setOpenMenuId(null); }}>
                                                            <Mail size={14} /> Email
                                                        </button>
                                                        <button onClick={() => { toast.success('WhatsApp feature coming soon!', { icon: '🚧' }); setOpenMenuId(null); }}>
                                                            <MessageSquare size={14} /> WhatsApp
                                                        </button>
                                                        {(hasPermission('passenger', 'delete') || p.created_by === currentUser.id) && (
                                                            <>
                                                                <hr />
                                                                <button onClick={() => { onRemove(p.id); setOpenMenuId(null); }} className="delete">
                                                                    <Trash2 size={14} /> Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PassengerList;
