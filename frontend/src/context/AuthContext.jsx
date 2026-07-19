import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    token: localStorage.getItem('token') || null,
    role: localStorage.getItem('role') || null,
    name: localStorage.getItem('name') || null,
    userId: localStorage.getItem('userId') || null,
    profileId: localStorage.getItem('profileId') || null,
    isAuthenticated: !!localStorage.getItem('token'),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Quick validation of existing session
    const token = localStorage.getItem('token');
    if (token) {
      // Decode JWT token basic details or keep session
      setAuthState({
        token,
        role: localStorage.getItem('role'),
        name: localStorage.getItem('name'),
        userId: localStorage.getItem('userId'),
        profileId: localStorage.getItem('profileId'),
        isAuthenticated: true,
      });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to authenticate');
    }

    const data = await response.json();
    
    // Save to local storage
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('name', data.name);
    localStorage.setItem('userId', String(data.user_id));
    if (data.profile_id) {
      localStorage.setItem('profileId', String(data.profile_id));
    } else {
      localStorage.removeItem('profileId');
    }

    setAuthState({
      token: data.access_token,
      role: data.role,
      name: data.name,
      userId: data.user_id,
      profileId: data.profile_id || null,
      isAuthenticated: true,
    });
  };

  const register = async (userData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return await response.json();
  };

  const logout = () => {
    localStorage.clear();
    setAuthState({
      token: null,
      role: null,
      name: null,
      userId: null,
      profileId: null,
      isAuthenticated: false,
    });
  };

  // Helper fetch function that appends JWT token automatically
  const authenticatedFetch = async (url, options = {}) => {
    const token = authState.token || localStorage.getItem('token');
    const headers = {
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      logout();
      window.location.href = '/login';
    }
    
    return response;
  };

  return (
    <AuthContext.Provider value={{ ...authState, loading, login, register, logout, authenticatedFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
