import React, { useState } from 'react';
import { X, Lock, Key, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';

const PasswordChangeModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    if (!isOpen) return null;

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            return toast.error('Passwords do not match');
        }

        setLoading(true);

        try {
            // In Supabase, we first need to re-authenticate or use the update service
            // However, supabase.auth.updateUser({ password: newPassword }) 
            // works if the session is active. To add a "wall", we verify it manually:

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: (await supabase.auth.getUser()).data.user.email,
                password: currentPassword,
            });

            if (signInError) throw new Error('Incorrect current password');

            const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
            if (pwdError) throw pwdError;

            toast.success('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-modal glass" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <Lock className="text-primary" size={24} />
                        <h2>Change Password</h2>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleUpdatePassword} className="profile-form">
                    <div className="form-section">
                        <label>Current Password</label>
                        <div className="input-with-icon">
                            <Key size={18} className="input-icon" />
                            <input
                                type="password"
                                className="brand-input"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                    </div>

                    <div className="divider"><span>New Password</span></div>

                    <div className="form-section">
                        <label>New Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                className="brand-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <label>Confirm New Password</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                className="brand-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordChangeModal;
