import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFlights } from '../../context/FlightContext';
import {
    LayoutDashboard,
    PlusCircle,
    Search,
    Settings,
    LogOut,
    PlaneTakeoff,
    X,
    Activity,
    UserCircle,
    User,
    Building,
    Lock,
    ChevronUp
} from 'lucide-react';
import NameChangeModal from '../profile/NameChangeModal';
import PasswordChangeModal from '../profile/PasswordChangeModal';
import AgencyInfoModal from '../profile/AgencyInfoModal';

const Sidebar = ({ isOpen, onClose }) => {
    const { currentUser, logout, userRole } = useAuth();
    const { hasPermission, agencyName, agencyTagline } = useFlights();
    const navigate = useNavigate();
    const [isNameModalOpen, setIsNameModalOpen] = React.useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
    const [isAgencyModalOpen, setIsAgencyModalOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    // Close on mobile when link is clicked
    const handleLinkClick = () => {
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    // Get user initials for avatar
    const getInitials = () => {
        if (!currentUser?.email) return 'U';
        return currentUser.email.charAt(0).toUpperCase();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-container">
                    <PlaneTakeoff size={32} className="logo-icon" />
                    <div className="logo-text-col">
                        <span className="logo-text">{agencyName}</span>
                        <div className="brand-tagline">{agencyTagline}</div>
                    </div>
                </div>
                <button className="sidebar-close-mobile" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" onClick={handleLinkClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                {hasPermission('flight', 'create') && (
                    <NavLink to="/create-flight" onClick={handleLinkClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <PlusCircle size={20} />
                        <span>Create Flight</span>
                    </NavLink>
                )}
                <NavLink to="/search" onClick={handleLinkClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Search size={20} />
                    <span>Search Flight</span>
                </NavLink>
                <NavLink to="/activity-log" onClick={handleLinkClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Activity size={20} />
                    <span>Activity Log</span>
                </NavLink>
                <NavLink to="/settings" onClick={handleLinkClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Settings size={20} />
                    <span>Settings</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div
                    className={`user-profile ${isUserMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                    <div className="user-avatar">{getInitials()}</div>
                    <div className="user-info">
                        <span className="user-name">{currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User'}</span>
                        <span className="user-role">{userRole || 'Agent'}</span>
                    </div>
                    <ChevronUp size={14} className={`menu-arrow ${isUserMenuOpen ? 'rotated' : ''}`} />

                    {isUserMenuOpen && (
                        <div className="user-context-menu" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setIsNameModalOpen(true); setIsUserMenuOpen(false); }}>
                                <User size={14} /> Edit Name
                            </button>
                            <button onClick={() => { setIsPasswordModalOpen(true); setIsUserMenuOpen(false); }}>
                                <Lock size={14} /> Change Password
                            </button>
                            {userRole === 'Admin' && (
                                <button onClick={() => { setIsAgencyModalOpen(true); setIsUserMenuOpen(false); }}>
                                    <Building size={14} /> Edit Agency Info
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <button className="btn-logout" title="Logout" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </div>

            <NameChangeModal isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} />
            <PasswordChangeModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
            <AgencyInfoModal isOpen={isAgencyModalOpen} onClose={() => setIsAgencyModalOpen(false)} />
        </aside>
    );
};

export default Sidebar;
