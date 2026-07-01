import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { connectSocket, getToken } from '@/lib/apiClient';
import { mergeGuestProfile, decayProfile } from '@/lib/behaviorTracker';

const AuthContext = createContext();

async function requestBrowserNotificationPermission(user) {
  if (!user || !('Notification' in window)) return;
  if (user.notification_permission) return;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    base44.auth.updateMe({ notification_permission: Notification.permission }).catch(() => {});
    return;
  }
  const permission = await Notification.requestPermission().catch(() => 'denied');
  base44.auth.updateMe({ notification_permission: permission }).catch(() => {});
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    if (!getToken()) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      connectSocket();
      mergeGuestProfile(currentUser).catch(() => {});
      decayProfile(currentUser).catch(() => {});
      requestBrowserNotificationPermission(currentUser);
    } catch (error) {
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        base44.auth.logout();
      } else {
        setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout();
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
