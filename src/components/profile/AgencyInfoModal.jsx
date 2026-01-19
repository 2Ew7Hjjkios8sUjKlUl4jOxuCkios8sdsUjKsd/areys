import React, { useState } from 'react';
import { X, Building, Info, Save } from 'lucide-react';
import { useFlights } from '../../context/FlightContext';

const AgencyInfoModal = ({ isOpen, onClose }) => {
    const { agencyName, agencyTagline, updateAgencyBranding } = useFlights();
    const [name, setName] = useState(agencyName);
    const [tagline, setTagline] = useState(agencyTagline);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateAgencyBranding(name, tagline);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="profile-modal glass">
                <div className="modal-header">
                    <div className="header-title">
                        <Building size={24} className="text-primary" />
                        <h2>Agency Information</h2>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-section">
                        <label>Agency Name</label>
                        <div style={{ position: 'relative' }}>
                            <Building size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="brand-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter Agency Name"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <label>Tagline</label>
                        <div style={{ position: 'relative' }}>
                            <Info size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="brand-input"
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                placeholder="Enter Tagline"
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgencyInfoModal;
