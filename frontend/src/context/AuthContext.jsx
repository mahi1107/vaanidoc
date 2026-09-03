import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getStoredUser, setStoredUser, removeToken, clearPatientSessionCodes, fetchCurrentUser, fetchAuthStatus } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setTokenState] = useState(() => getToken());
  const [authRequired, setAuthRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [portalMode, setPortalMode] = useState('patient'); // 'patient' | 'operations'

  useEffect(() => {
    const initAuth = async () => {
      try {
        const status = await fetchAuthStatus().catch(() => ({ auth_required: true }));
        setAuthRequired(status.auth_required);

        if (getToken()) {
          const profile = await fetchCurrentUser().catch(() => null);
          if (profile) {
            setUser(profile);
            setStoredUser(profile);
            // If admin or asha_worker, portal mode can be operations
            if (profile.role === 'admin' || profile.role === 'asha_worker') {
              setPortalMode('operations');
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setTokenState(null);
      removeToken();
      clearPatientSessionCodes();
      setPortalMode('patient');
    };

    window.addEventListener('vaanidoc:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('vaanidoc:unauthorized', handleUnauthorized);
  }, []);

  const handleLoginSuccess = (userData, tokenStr) => {
    // Clear any previous patient session codes before setting new patient data
    clearPatientSessionCodes();
    setUser(userData);
    setTokenState(tokenStr);
    setStoredUser(userData);
    if (userData.role === 'admin' || userData.role === 'asha_worker') {
      setPortalMode('operations');
    } else {
      setPortalMode('patient');
    }
  };

  const handleLogout = () => {
    removeToken();
    clearPatientSessionCodes();
    setUser(null);
    setTokenState(null);
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    setStoredUser(updatedUser);
  };

  const isStaff = user?.role === 'admin' || user?.role === 'asha_worker';
  const isAdmin = user?.role === 'admin';
  const isAsha = user?.role === 'asha_worker';
  const isPatient = user?.role === 'patient';
  const isAuthenticated = !!user && !!token;
  const isStaffAuthenticated = isAuthenticated && isStaff;
  const isPatientAuthenticated = isAuthenticated && isPatient;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      authRequired,
      loading,
      portalMode,
      setPortalMode,
      loginSuccess: handleLoginSuccess,
      updateUser: handleUpdateUser,
      logout: handleLogout,
      isAuthenticated,
      isStaffAuthenticated,
      isPatientAuthenticated,
      isStaff,
      isAdmin,
      isAsha,
      isPatient
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
