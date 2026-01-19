import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Plane } from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSent(true);
            toast.success('Password reset link sent to your email!');
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.message || 'Failed to send reset link');
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
                    <h1>Forgot Password</h1>
                    <p className="text-muted">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                {!sent ? (
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label><Mail size={14} /> Email Address</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                        </button>

                        <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <Link to="/login" className="back-to-login" style={{ fontSize: '0.875rem' }}>
                                <ArrowLeft size={16} />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                ) : (
                    <div className="login-body text-center" style={{ padding: '2rem 0' }}>
                        <div className="success-icon-wrapper" style={{ marginBottom: '1.5rem' }}>
                            <Mail size={48} className="text-secondary" />
                        </div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Check your email</h2>
                        <p className="text-muted" style={{ marginBottom: '2rem' }}>
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                        <Link to="/login" className="btn btn-primary w-full">
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
