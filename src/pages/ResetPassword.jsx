import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, Plane, Save } from 'lucide-react';
import { supabase } from '../supabase';
import { useFlights } from '../context/FlightContext';
import toast from 'react-hot-toast';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success('Password updated successfully!');
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-container">
                        <img
                            src="/logo_landscape.png"
                            alt="AREYS"
                            className="logo-img-landscape"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="logo-icon-fallback" style={{ display: 'none', alignItems: 'center', gap: '1rem' }}>
                            <Plane size={40} className="logo-icon" />
                            <div className="logo-text-col">
                                <span className="logo-text">AREYS</span>
                                <div className="brand-tagline">System Management</div>
                            </div>
                        </div>
                    </div>
                    <h1>Reset Password</h1>
                    <p className="text-muted">
                        Create a new secure password for your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label><Lock size={14} /> New Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><Lock size={14} /> Confirm New Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                <Save size={20} />
                                Reset Password
                            </>
                        )}
                    </button>

                    <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Link to="/login" className="back-to-login" style={{ fontSize: '0.875rem' }}>
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
