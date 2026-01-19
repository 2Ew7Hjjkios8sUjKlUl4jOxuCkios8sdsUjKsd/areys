import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFlights } from '../context/FlightContext';
import { Plane, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import Loader from '../components/Loader';

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isLogin && password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                navigate('/');
            } else {
                setError('Registration is currently disabled.');
                return;
                // const result = await register(email, password);

                if (result.requiresEmailConfirmation) {
                    setError('Registration successful! Please check your email and click the confirmation link before signing in.');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err.message || err.error_description || '';

            if (err.code === 'email_not_confirmed' || errorMessage.includes('Email not confirmed') || errorMessage.includes('email_not_confirmed')) {
                setError('Email not confirmed. Please check your email and click the confirmation link before signing in.');
            } else if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid email or password')) {
                setError('Invalid email or password');
            } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
                setError('Email already registered');
            } else if (errorMessage.includes('Invalid email') || errorMessage.includes('email format')) {
                setError('Invalid email format');
            } else if (errorMessage.includes('Password')) {
                setError('Password must be at least 6 characters');
            } else if (errorMessage.includes('signup_disabled')) {
                setError('Registration is currently disabled');
            } else {
                setError(errorMessage || 'Authentication failed. Please try again.');
            }
        }

        setLoading(false);
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
                    <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p className="text-muted">
                        {isLogin
                            ? 'Sign in to access your flight management dashboard'
                            : 'Register to start managing your flights'}
                    </p>
                </div>

                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label><Mail size={14} /> Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><Lock size={14} /> Abdisamed</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        {isLogin && (
                            <div className="forgot-password-link">
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => navigate('/forgot-password')}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label><Lock size={14} /> Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? <Loader text={isLogin ? 'Signing in...' : 'Creating account...'} /> : (
                            <>
                                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </>
                        )}
                    </button>
                </form>

                {/* <div className="login-footer">
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        >
                            {isLogin ? 'Create Account' : 'Sign In'}
                        </button>
                    </p>
                </div> */}
            </div>
        </div>
    );
};

export default LoginPage;
