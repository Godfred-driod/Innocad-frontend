// auth.js — shared authentication helper for all InnoCAD pages
(function () {
  'use strict';

  // ── CONFIG ───────────────────────────────────────────────
 const API = 'https://api.innocadservices.com/api';
  const TOKEN_KEY = 'innocad_token';
  const USER_KEY = 'innocad_user';

  // ── TOKEN HELPERS ────────────────────────────────────────
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch (e) {
      return null;
    }
  }

  function saveAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
  }

  // ── PROTECTED PAGE GUARD ─────────────────────────────────
  // Call this on pages that require login
  function requireLogin() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }

  // Call this on pages that require admin
  function requireAdmin() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    if (!isAdmin()) {
      window.location.href = 'user-dashboard.html';
      return false;
    }
    return true;
  }

  // ── API REQUEST HELPER ───────────────────────────────────
  // Use this instead of fetch() directly — handles token automatically
  async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
      });

      // Token expired — try to refresh
      if (res.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          // Retry the original request with new token
          headers['Authorization'] = `Bearer ${getToken()}`;
          const retryRes = await fetch(`${API}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include'
          });
          return retryRes.json();
        } else {
          // Refresh failed — log out
          clearAuth();
          window.location.href = 'login.html';
          return null;
        }
      }

      return res.json();
    } catch (err) {
      console.error('API request failed:', err);
      throw err;
    }
  }

  // ── REFRESH TOKEN ────────────────────────────────────────
  async function tryRefreshToken() {
    try {
      const res = await fetch(`${API}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        const user = getUser();
        saveAuth(data.data.accessToken, user);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ── LOGOUT ───────────────────────────────────────────────
  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    clearAuth();
    window.location.href = 'login.html';
  }

  // ── NAV UPDATE ───────────────────────────────────────────
  // Updates the login icon in the nav based on auth state
  // Call this on every page that has a nav
  function updateNav() {
    const user = getUser();
    const navLogin = document.querySelector('.nav-login');
    if (!navLogin) return;

    if (user) {
      const firstName = user.name.split(' ')[0];
      const destination = user.role === 'admin' ? 'admin.html' : 'user-dashboard.html';
      const label = user.role === 'admin' ? 'Admin Panel' : `Hi, ${firstName}`;

      navLogin.href = destination;
      navLogin.setAttribute('aria-label', label);
      navLogin.innerHTML = `
        <span style="
          font-size: 13px;
          font-weight: 600;
          color: var(--accent);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${label}
        </span>
      `;
    } else {
      navLogin.href = 'login.html';
      navLogin.setAttribute('aria-label', 'Login');
      navLogin.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="8" r="3" stroke="#0f172a" stroke-width="1.5"/>
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }

  // ── TOAST NOTIFICATION ───────────────────────────────────
  function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.getElementById('innocad-toast');
    if (existing) existing.remove();

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#1f3c88',
      warning: '#f59e0b'
    };

    const toast = document.createElement('div');
    toast.id = 'innocad-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      font-family: "Segoe UI", system-ui, sans-serif;
      box-shadow: 0 8px 32px rgba(15,23,42,0.15);
      z-index: 9999;
      max-width: 320px;
      animation: toastSlide 0.3s ease;
    `;

    // Add animation style
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `
        @keyframes toastSlide {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ── FORMAT HELPERS ───────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function formatAmount(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
  }

  function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ── EXPOSE PUBLIC API ────────────────────────────────────
  window.InnoCAD = {
    API,
    getToken,
    getUser,
    saveAuth,
    clearAuth,
    isLoggedIn,
    isAdmin,
    requireLogin,
    requireAdmin,
    apiRequest,
    logout,
    updateNav,
    showToast,
    formatDate,
    formatAmount,
    formatStatus
  };

  // Auto-update nav on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNav);
  } else {
    updateNav();
  }

})();