import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userActive, setUserActive] = useState(null);
    const [currentUserAgency, setCurrentUserAgency] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login with email/password
    const login = async (email, password) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                // Handle email not confirmed error specifically
                if (error.message && (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed'))) {
                    const customError = new Error('Email not confirmed. Please check your email and click the confirmation link before signing in.');
                    customError.code = 'email_not_confirmed';
                    throw customError;
                }
                throw error;
            }

            // Fetch user role after login
            if (data.user) {
                const { data: roleData, error: roleError } = await supabase
                    .from('user_roles')
                    .select('role, active')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                if (!roleError && roleData) {
                    if (roleData.active === false) {
                        setUserActive(false);
                        setUserRole(roleData.role);
                        setCurrentUserAgency(roleData.agency_name);
                        return { user: data.user };
                    }
                    setUserRole(roleData.role);
                    setUserActive(true);
                    setCurrentUserAgency(roleData.agency_name);
                } else if (!roleError && !roleData) {
                    // No role found, create one (default to admin)
                    const { error: insertError } = await supabase
                        .from('user_roles')
                        .insert({
                            user_id: data.user.id,
                            email: data.user.email,
                            role: 'Admin',
                            created_by: data.user.id
                        });

                    if (!insertError) {
                        setUserRole('Admin');
                        setUserActive(true);
                    } else {
                        console.error('Error creating user role:', insertError);
                        setUserRole('Admin');
                        setUserActive(true);
                    }
                } else {
                    console.error('Error fetching user role:', roleError);
                    setUserRole('Admin');
                    setUserActive(true);
                }
            }

            return { user: data.user };
        } finally {
            setLoading(false);
        }
    };

    // Register new user (self-registration)
    const register = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/login`
            }
        });

        if (error) throw error;

        // Note: In Supabase, if email confirmation is enabled, data.user will be null
        // and data.session will be null until email is confirmed
        // We check if user exists and if not, it means email confirmation is required
        if (data.user) {
            // Email confirmation is disabled - user is immediately confirmed
            // Set default role as 'admin' for self-registered users
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: data.user.id,
                    email: email,
                    role: 'Admin',
                    created_by: data.user.id
                });

            if (roleError) {
                console.error('Error creating user role:', roleError);
                // Still set role locally even if DB insert fails
            }
            setUserRole('Admin');

            return { user: data.user, requiresEmailConfirmation: false };
        } else {
            // Email confirmation is required - user needs to confirm email before signing in
            // Still create the user role entry using the email as identifier (will link on confirmation)
            // Note: We can't insert into user_roles yet because we don't have user_id until confirmation
            // This is handled by a database trigger or we handle it after email confirmation
            return { user: null, requiresEmailConfirmation: true };
        }
    };

    // Create a new user (admin creating staff)
    // Note: For production, consider using a server-side function with service role key
    // This client-side approach uses signUp which may require email confirmation
    const createNewUser = async (email, password, role, name, agencyName) => {
        try {
            // Sign up the new user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password
            });

            if (signUpError) throw signUpError;

            if (!signUpData.user) {
                throw new Error('User creation failed');
            }

            const newUserId = signUpData.user.id;

            // Store role in user_roles table
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: newUserId,
                    email: email,
                    name: name,
                    role: role,
                    active: true,
                    created_by: currentUser.id,
                    agency_name: agencyName
                });

            if (roleError) {
                console.error('Error creating user role:', roleError);
                throw roleError;
            }

            // Store in managed_users table
            const { error: managedError } = await supabase
                .from('managed_users')
                .insert({
                    user_id: currentUser.id,
                    managed_user_id: newUserId,
                    name: name,
                    email: email,
                    role: role,
                    active: true
                });

            if (managedError) {
                console.error('Error creating managed user record:', managedError);
                // Don't throw - this is less critical
            }

            return { success: true, userId: newUserId };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    };

    // Logout
    const logout = async () => {
        setUserRole(null);
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    // Listen for auth state changes
    useEffect(() => {
        let isMounted = true;

        // Failsafe timeout
        const loadingTimeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('AuthContext: Loading timed out - forcing loading=false');
                setLoading(false);
            }
        }, 10000);

        // Unified session initialization
        const initSession = async (session) => {
            if (!isMounted) return;

            console.log('AuthContext: Initializing session...', session?.user?.email || 'no session');
            setCurrentUser(session?.user ?? null);

            if (session?.user) {
                try {
                    const { data: roleData } = await supabase
                        .from('user_roles')
                        .select('role, active')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (isMounted) {
                        if (roleData?.active === false) {
                            console.warn('AuthContext: User is deactivated, showing blocked screen');
                            setUserActive(false);
                            setUserRole(roleData.role);
                            setCurrentUserAgency(roleData.agency_name);
                        } else {
                            setUserRole(roleData?.role || 'Admin');
                            setUserActive(true);
                            setCurrentUserAgency(roleData?.agency_name || null);
                            console.log('AuthContext: Session ready with role:', roleData?.role || 'Admin');
                        }
                    }
                } catch (e) {
                    console.error('AuthContext: Role fetch error:', e);
                    if (isMounted) {
                        setUserRole('Admin');
                        setUserActive(true);
                    }
                }
            } else {
                setUserRole(null);
                setUserActive(true);
            }

            if (isMounted) {
                setLoading(false);
                clearTimeout(loadingTimeout);
            }
        };

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            console.log(`AuthContext: Auth event [${event}]`);

            // Check for session expiration (12h max or 2h inactivity)
            if (session) {
                const now = Date.now();
                const lastActive = parseInt(localStorage.getItem('last_active') || now.toString());
                const sessionStarted = parseInt(localStorage.getItem('session_started') || now.toString());

                const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000; // 2 hours
                const MAX_SESSION = 12 * 60 * 60 * 1000; // 12 hours

                if (now - lastActive > INACTIVITY_LIMIT || now - sessionStarted > MAX_SESSION) {
                    console.log('AuthContext: Session expired');
                    localStorage.removeItem('last_active');
                    localStorage.removeItem('session_started');
                    logout();
                    return;
                }

                localStorage.setItem('last_active', now.toString());
                if (event === 'SIGNED_IN' || !localStorage.getItem('session_started')) {
                    localStorage.setItem('session_started', now.toString());
                }
            } else {
                localStorage.removeItem('last_active');
                localStorage.removeItem('session_started');
            }

            // If it's an initial session or sign in, run the full init
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                initSession(session);
            } else {
                // For other events, just update user
                setCurrentUser(session?.user ?? null);
            }
        });

        // Proactive fallback
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted && loading) {
                console.log('AuthContext: getSession returned before event');
                initSession(session);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(loadingTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        currentUser,
        userRole,
        userActive,
        currentUserAgency,
        login,
        register,
        logout,
        createNewUser,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
