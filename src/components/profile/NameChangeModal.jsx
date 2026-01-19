import React, { useState } from 'react';
import { X, User, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';

const NameChangeModal = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || '');

    if (!isOpen) return null;

    const handleUpdateName = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Update Name in Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { name: name }
            });
            if (authError) throw authError;

            // Update Name in user_roles table
            const { error: roleError } = await supabase
                .from('user_roles')
                .update({ name: name })
                .eq('user_id', currentUser.id);

            if (roleError) console.warn('Could not update name in user_roles:', roleError);

            toast.success('Name updated successfully');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to update name');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal glass" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <User className="text-primary" size={24} />
                        <h2>Edit Public Name</h2>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleUpdateName} className="profile-form">
                    <div className="form-section">
                        <label>New Public Name</label>
                        <div className="input-with-icon">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                className="brand-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Update Name
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NameChangeModal;
