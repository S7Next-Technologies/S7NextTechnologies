// ═══════════════════════════════════════════════════════════════════════════
// S7NEXTTECHNOLOGIES - COMPLETE PRODUCTION FRONTEND (REVAMPED)
// White Theme | Indigo + Gold + Emerald Accents
// Features: Homepage, About, Courses, My Courses, My Apps, Admin Panel
// ═══════════════════════════════════════════════════════════════════════════
import logoImg from './logo.png';
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// ─── CONFIGURATION ────────────────────────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY;

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
};

let firebaseApp, auth, googleProvider;
try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.warn('Firebase not configured:', e.message);
}

// ─── COLOR PALETTE (WHITE THEME) ──────────────────────────────────────────
const C = {
  // Backgrounds
  bg: '#F8F9FF',
  bgAlt: '#FFFFFF',
  bgSection: '#F0F2FF',
  // Primary
  indigo: '#4F46E5',
  indigoDark: '#3730A3',
  indigoLight: '#818CF8',
  indigoXLight: '#EEF2FF',
  // Accent
  gold: '#F59E0B',
  goldDark: '#B45309',
  goldLight: '#FDE68A',
  goldXLight: '#FFFBEB',
  // Success
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldLight: '#34D399',
  emeraldXLight: '#ECFDF5',
  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  // Borders
  border: '#E2E8F0',
  borderFocus: '#4F46E5',
  // Cards
  card: '#FFFFFF',
  cardHover: '#F8FAFF',
  // Dark (for admin/nav)
  dark: '#0F172A',
  darkCard: '#1E293B',
  white: '#FFFFFF',
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg};color:${C.textPrimary};font-family:'Outfit',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${C.bg}}
::-webkit-scrollbar-thumb{background:${C.indigo};border-radius:3px}
@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes modalIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,0.3)}50%{box-shadow:0 0 0 10px rgba(79,70,229,0)}}
.animate-fadeUp{animation:fadeUp 0.6s ease forwards}
.animate-fadeIn{animation:fadeIn 0.4s ease forwards}
.animate-float{animation:float 3s ease-in-out infinite}
.animate-modal{animation:modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards}
.animate-slideDown{animation:slideDown 0.35s ease forwards}
`;

// ═══════════════════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class API {
  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error === 'Invalid or expired token') {
          const refreshed = await API.refreshToken();
          if (refreshed) return API.request(endpoint, options);
        }
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (error) { throw error; }
  }

  static async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const data = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).then(r => r.json());
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch { localStorage.clear(); window.location.href = '/'; return false; }
  }

  static async register(name, email, password) { return API.request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }); }
  static async login(email, password) { return API.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  static async googleAuth(idToken) { return API.request('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }); }
  static async sendOTP(phone) { return API.request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }); }
  static async verifyOTP(phone, code, name) { return API.request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code, name }) }); }
  static async getCourses() { return API.request('/courses'); }
  static async getProfile() { return API.request('/user/profile'); }
  static async updateProfile(data) { return API.request('/user/profile', { method: 'PUT', body: JSON.stringify(data) }); }
  static async uploadAvatar(file) {
    const formData = new FormData(); formData.append('avatar', file);
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/user/avatar`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    return res.json();
  }
  static async getEnrollments() { return API.request('/user/enrollments'); }
  static async updateProgress(courseId, progress) { return API.request(`/user/progress/${courseId}`, { method: 'PUT', body: JSON.stringify({ progress }) }); }
  static async createPaymentOrder(courseId) { return API.request('/payment/create-order', { method: 'POST', body: JSON.stringify({ courseId }) }); }
  static async verifyPayment(orderId, paymentId, signature, courseId, dev) { return API.request('/payment/verify', { method: 'POST', body: JSON.stringify({ orderId, paymentId, signature, courseId, dev }) }); }
  static async adminLogin(email, password) { return API.request('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  static async getAdminStats() { return API.request('/admin/stats'); }
  static async getAllEnrollments() { return API.request('/admin/enrollments'); }
  static async addCourse(courseData) { return API.request('/admin/courses', { method: 'POST', body: JSON.stringify(courseData) }); }
  static async updateCourse(courseId, courseData) { return API.request(`/admin/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(courseData) }); }
  static async deleteCourse(courseId) { return API.request(`/admin/courses/${courseId}`, { method: 'DELETE' }); }
  // My Apps
  static async getApps() { return API.request('/apps'); }
  static async addApp(appData) { return API.request('/admin/apps', { method: 'POST', body: JSON.stringify(appData) }); }
  static async updateApp(appId, appData) { return API.request(`/admin/apps/${appId}`, { method: 'PUT', body: JSON.stringify(appData) }); }
  static async deleteApp(appId) { return API.request(`/admin/apps/${appId}`, { method: 'DELETE' }); }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Logo = ({ size = 48 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <img
      src={logoImg}
      alt="S7Next Technologies"
      style={{
        height: 60,        // ← change this number to make it bigger/smaller
        width: 'auto',
        objectFit: 'contain',
      }}
    />
    <div>
      <div style={{
        fontFamily: 'Playfair Display',
        fontWeight: 700,
        fontSize: 18,      // ← change this to make text bigger/smaller
        background: `linear-gradient(135deg, #4F46E5, #F59E0B)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: 0.5,
      }}>
        S7NEXT
      </div>
      <div style={{
        fontFamily: 'Outfit',
        fontSize: 9,
        color: '#10B981',
        letterSpacing: 3,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        TECHNOLOGIES
      </div>
    </div>
  </div>
);

const Btn = ({ children, variant = 'primary', onClick, style = {}, disabled, small }) => {
  const [hover, setHover] = useState(false);
  const variants = {
    primary: { background: hover ? C.indigoDark : C.indigo, color: C.white, boxShadow: hover ? `0 8px 24px rgba(79,70,229,0.35)` : `0 4px 14px rgba(79,70,229,0.2)` },
    emerald: { background: hover ? C.emeraldDark : C.emerald, color: C.white, boxShadow: hover ? `0 8px 24px rgba(16,185,129,0.35)` : `0 4px 14px rgba(16,185,129,0.15)` },
    gold: { background: hover ? C.goldDark : C.gold, color: C.white, fontWeight: 700, boxShadow: hover ? `0 8px 24px rgba(245,158,11,0.35)` : `0 4px 14px rgba(245,158,11,0.15)` },
    outline: { background: hover ? C.indigoXLight : 'transparent', color: C.indigo, border: `1.5px solid ${C.indigo}`, boxShadow: 'none' },
    outlineGray: { background: hover ? C.bgSection : 'transparent', color: C.textSecondary, border: `1.5px solid ${C.border}`, boxShadow: 'none' },
    danger: { background: hover ? '#b91c1c' : '#DC2626', color: C.white, boxShadow: 'none' },
    ghost: { background: hover ? C.bgSection : 'transparent', color: C.textSecondary, border: 'none', boxShadow: 'none' },
  };
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Outfit', fontWeight: 600, borderRadius: 10, padding: small ? '8px 18px' : '12px 26px', fontSize: small ? 13 : 14, opacity: disabled ? 0.5 : 1, transition: 'all 0.2s ease', letterSpacing: 0.3, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, icon, ...props }) => {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: C.textMuted }}>{icon}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ width: '100%', padding: icon ? '12px 12px 12px 40px' : '12px 16px', background: focus ? C.indigoXLight : C.bgAlt, border: `1.5px solid ${focus ? C.indigo : C.border}`, borderRadius: 10, color: C.textPrimary, fontSize: 14, fontFamily: 'Outfit', outline: 'none', boxShadow: focus ? `0 0 0 3px rgba(79,70,229,0.1)` : 'none', transition: 'all 0.2s ease' }} {...props}
        />
      </div>
    </div>
  );
};

const Modal = ({ open, onClose, title, children, width = 500 }) => {
  if (!open) return null;
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="animate-modal" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', boxShadow: `0 30px 80px rgba(15,23,42,0.2)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: C.textPrimary }}>{title}</h2>
          <button onClick={onClose} style={{ background: C.bgSection, border: 'none', borderRadius: 8, color: C.textMuted, cursor: 'pointer', padding: '6px 10px', fontSize: 16, transition: 'all 0.2s' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: C.emerald, error: '#EF4444', info: C.indigo };
  return (
    <div className="animate-slideDown" style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 2000, background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${colors[type]}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 300, boxShadow: `0 12px 40px rgba(15,23,42,0.15)` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[type], flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: C.textSecondary, flex: 1, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  );
};

const Badge = ({ text, color = C.emerald, small }) => (
  <span style={{ display: 'inline-block', padding: small ? '2px 8px' : '4px 12px', borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: `${color}18`, color, border: `1px solid ${color}33` }}>{text}</span>
);

const ProgressBar = ({ progress, label, color = C.emerald }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{progress}%</span>
    </div>
    <div style={{ height: 6, background: C.bgSection, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 3, transition: 'width 1s ease' }} />
    </div>
  </div>
);

// Section header used across pages
const SectionHeader = ({ label, title, subtitle, align = 'center' }) => (
  <div style={{ textAlign: align, marginBottom: 56 }}>
    {label && (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.indigoXLight, border: `1px solid ${C.indigo}33`, borderRadius: 20, padding: '6px 16px', marginBottom: 16 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.indigo }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.indigo }}>{label}</span>
      </div>
    )}
    <h2 style={{ fontFamily: 'Playfair Display', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, color: C.textPrimary, marginBottom: 16, lineHeight: 1.2 }}>{title}</h2>
    {subtitle && <p style={{ fontSize: 17, color: C.textSecondary, maxWidth: 560, margin: align === 'center' ? '0 auto' : 0, lineHeight: 1.7 }}>{subtitle}</p>}
    <div style={{ width: 60, height: 4, background: `linear-gradient(90deg, ${C.indigo}, ${C.gold})`, borderRadius: 2, margin: align === 'center' ? '20px auto 0' : '20px 0 0' }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// COURSE CARD
// ═══════════════════════════════════════════════════════════════════════════

const CourseCard = ({ course, onEnroll, onView, enrolled, progress = 0 }) => {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = getCourseImage(course.title);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? C.cardHover : C.card,
        border: `1.5px solid ${hover ? course.color : C.border}`,
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hover
          ? `0 20px 60px rgba(0,0,0,0.1)`
          : `0 2px 12px rgba(0,0,0,0.05)`,
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {/* Top colour bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${course.color}, ${course.color}66)` }} />

      {/* Badge */}
      {course.tag && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <Badge text={course.tag} color={course.color} />
        </div>
      )}

      <div style={{ padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>

          {/* ── Course icon / image ── */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `${course.color}15`,
              border: `1px solid ${course.color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              flexShrink: 0,
              overflow: 'hidden',
              padding: imageUrl && !imgError ? 8 : 0,
            }}
          >
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={course.title}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              // Fallback to emoji if no image matched or image failed to load
              course.icon
            )}
          </div>

          <div style={{ flex: 1, paddingRight: 60 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 6, lineHeight: 1.3, paddingRight: course.tag ? 90 : 0 }}>
              {course.title}
            </h3>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{course.tagline}</p>
          </div>
        </div>

        {/* Meta pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: C.textMuted, background: C.bgSection, padding: '3px 10px', borderRadius: 6, fontWeight: 500 }}>
            📅 {course.duration}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, background: C.bgSection, padding: '3px 10px', borderRadius: 6, fontWeight: 500 }}>
            📚 {course.modules} modules
          </span>
        </div>

        {/* Progress bar (enrolled courses) */}
        {enrolled && (
          <div style={{ marginBottom: 16 }}>
            <ProgressBar progress={progress} label="Progress" color={course.color} />
          </div>
        )}

        {/* Price + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Playfair Display', color: course.color }}>
            ₹{course.price?.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="outlineGray" small onClick={(e) => { e.stopPropagation(); onView(course); }}>
              Details
            </Btn>
            {!enrolled && (
              <Btn variant="primary" small onClick={(e) => { e.stopPropagation(); onEnroll(course); }}>
                Enroll →
              </Btn>
            )}
            {enrolled && <Btn variant="emerald" small>Continue ▶</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════════════

const Navbar = ({ page, setPage, user, setShowAuth, setShowProfile }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'courses', label: 'Courses' },
    { id: 'myapps', label: 'Our Projects' },
    ...(user ? [{ id: 'mycourses', label: 'My Learning' }] : []),
  ];

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900, background: scrolled ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent', padding: '0 24px', transition: 'all 0.3s ease', boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.07)' : 'none' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => setPage('home')} style={{ cursor: 'pointer' }}><Logo size={42} /></div>
        <div style={{ display: 'flex', gap: 2 }}>
          {navLinks.map(link => (
            <button key={link.id} onClick={() => setPage(link.id)} style={{ background: page === link.id ? C.indigoXLight : 'transparent', border: 'none', color: page === link.id ? C.indigo : C.textSecondary, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit', fontSize: 14, fontWeight: page === link.id ? 700 : 500, transition: 'all 0.2s ease' }}>{link.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              {user.email === 's7nexttechnologies@gmail.com' && user.role === 'admin' && (
                <Btn variant="gold" small onClick={() => setPage('admin')}>👑 Admin</Btn>
              )}
              <div onClick={() => setShowProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 40, padding: '6px 14px 6px 6px', transition: 'all 0.2s' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.indigo}, ${C.gold})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.white, overflow: 'hidden' }}>
                  {user.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : user.name[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{user.name.split(' ')[0]}</span>
              </div>
            </>
          ) : (
            <>
              <Btn variant="outlineGray" small onClick={() => setShowAuth('login')}>Sign In</Btn>
              <Btn variant="primary" small onClick={() => setShowAuth('register')}>Get Started</Btn>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════

const Footer = ({ setPage }) => (
  <footer style={{ background: C.dark, color: C.white, padding: '64px 24px 32px' }}>
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
        {/* Brand */}
        <div>
          <Logo size={44} showText dark />
          <p style={{ marginTop: 16, fontSize: 14, color: '#94A3B8', lineHeight: 1.8, maxWidth: 280 }}>
            A technology-driven startup delivering end-to-end software engineering solutions, emerging technology services, and industry-aligned training programs.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {['LinkedIn', 'GitHub'].map(s => (
              <div key={s} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#94A3B8', fontWeight: 600, transition: 'all 0.2s' }}>{s[0]}</div>
            ))}
          </div>
        </div>
        {/* Links */}
        {[
          { title: 'Company', links: [['Home', 'home'], ['About Us', 'about'], ['Our Projects', 'myapps']] },
          { title: 'Learning', links: [['All Courses', 'courses'], ['My Learning', 'mycourses']] },
          { title: 'Contact', links: [['s7nexttechnologies@gmail.com', null], ['+91 7022036867', null], ['Hyderabad, India', null]] },
        ].map(col => (
          <div key={col.title}>
            <h4 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748B', marginBottom: 20 }}>{col.title}</h4>
            {col.links.map(([label, pg]) => (
              <div key={label} onClick={() => pg && setPage(pg)} style={{ fontSize: 14, color: '#94A3B8', marginBottom: 12, cursor: pg ? 'pointer' : 'default', transition: 'color 0.2s' }}
                onMouseEnter={e => { if(pg) e.target.style.color = C.white; }} onMouseLeave={e => { if(pg) e.target.style.color = '#94A3B8'; }}>
                {label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 13, color: '#475569' }}>© {new Date().getFullYear()} S7Next Technologies. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11, background: `${C.indigo}33`, color: C.indigoLight, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>🔒 SSL Secured</span>
          <span style={{ fontSize: 11, background: `${C.emerald}22`, color: C.emeraldLight, padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>✅ ISO Certified</span>
        </div>
      </div>
    </div>
  </footer>
);

// ═══════════════════════════════════════════════════════════════════════════
// HOME PAGE — Matches reference design
// ═══════════════════════════════════════════════════════════════════════════

const FeatureCard = ({ icon, title, items, accent }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: C.white, border: `1.5px solid ${hover ? accent : C.border}`, borderRadius: 20, padding: 32, transition: 'all 0.3s ease', boxShadow: hover ? `0 16px 48px rgba(0,0,0,0.1)` : `0 2px 12px rgba(0,0,0,0.04)`, transform: hover ? 'translateY(-4px)' : 'none', cursor: 'default' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20, border: `1px solid ${accent}25` }}>{icon}</div>
      <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 700, color: accent, marginBottom: 16, cursor: 'pointer', textDecoration: hover ? 'underline' : 'none' }}>{title}</h3>
      <ul style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.5 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${accent}15`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <span style={{ fontSize: 9, color: accent, fontWeight: 900 }}>✓</span>
            </div>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const WhyCard = ({ icon, title, items, accent }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: C.white, border: `1.5px solid ${hover ? accent : C.border}`, borderRadius: 20, padding: 36, transition: 'all 0.3s ease', boxShadow: hover ? `0 16px 48px rgba(0,0,0,0.1)` : `0 2px 12px rgba(0,0,0,0.04)`, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${accent}12`, border: `2px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px', transition: 'all 0.3s' }}>{icon}</div>
      <h3 style={{ fontFamily: 'Playfair Display', fontSize: 19, fontWeight: 700, color: C.textPrimary, marginBottom: 20 }}>{title}</h3>
      <ul style={{ listStyle: 'none', textAlign: 'left', display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: C.textSecondary }}>
            <span style={{ color: accent, fontWeight: 900, fontSize: 14 }}>✓</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const StatCard = ({ value, label, color }) => (
  <div style={{ textAlign: 'center', padding: '32px 24px', background: C.white, borderRadius: 20, border: `1.5px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
    <div style={{ fontFamily: 'Playfair Display', fontSize: 42, fontWeight: 900, color, marginBottom: 8 }}>{value}</div>
    <div style={{ fontSize: 14, color: C.textSecondary, fontWeight: 500 }}>{label}</div>
  </div>
);

const HomePage = ({ courses, onEnroll, user, setPage }) => {
  const offerCards = [
    {
      icon: '🎓', title: 'Industry-Focused Training Programs', accent: C.indigo,
      items: ['IT & Non-IT Courses with industry experts', 'Hands-on Projects and real-world scenarios', '100% Placement Support with our partner network', 'Certification guidance and exam preparation', 'Continuous learning and skill upgrade paths'],
    },
    {
      icon: '👥', title: 'Payroll and Staffing Services', accent: C.gold,
      items: ['Hassle-free payroll management for companies of all sizes', 'Contractor payment support and compliance management', 'Flexible staffing solutions for project-based needs', 'Employee benefits administration', 'Multi-state payroll tax compliance'],
    },
    {
      icon: '💼', title: 'Job-Ready Support', accent: C.emerald,
      items: ['Bench Recruitment for immediate placement', 'Resume Marketing to top employers', 'Interview Preparation with mock sessions', 'Career counseling and path guidance', 'Soft skills and communication training'],
    },
    {
      icon: '🏛️', title: 'Campus Hiring Drives', accent: C.indigo,
      items: ['College Collaborations for talent pipeline', 'Bulk Hiring Campaigns for large organizations', 'Internship-to-Hire Programs'],
    },
    {
      icon: '📄', title: 'Resume Marketing Services', accent: C.gold,
      items: ['Professional resume creation tailored to your target roles', 'Resume distribution across leading job portals', 'Keyword optimization for better ATS score'],
    },
    {
      icon: '🎓', title: 'College Connect', accent: C.emerald,
      items: ['Bridging the gap between students and industry opportunities', 'Campus recruitment drives and placement support', 'Skill development workshops and seminars'],
    },
  ];

  const whyCards = [
    {
      icon: '🚀', title: 'Placement-Driven Approach', accent: C.indigo,
      items: ['Dedicated placement cell', '300+ recruiter network', 'Weekly interview opportunities', 'Personalized career roadmap', 'Post-placement support'],
    },
    {
      icon: '🧑‍💻', title: 'Real-Time Projects & Expert Mentorship', accent: C.gold,
      items: ['Project-based training', 'Corporate trainers with industry experience', 'Industry-relevant curriculum', 'One-on-one mentorship sessions', 'Portfolio development guidance'],
    },
    {
      icon: '🏢', title: 'Trusted by Companies & Colleges', accent: C.emerald,
      items: ['Partnerships with 50+ institutions', 'Corporate tie-ups across IT & Non-IT', 'Proven track record of success', 'Industry recognition and awards', 'Long-standing reputation'],
    },
  ];

  return (
    <div>
      {/* ── HERO ── */}
      <section style={{ paddingTop: 100, minHeight: '100vh', display: 'flex', alignItems: 'center', background: `linear-gradient(160deg, ${C.indigoXLight} 0%, ${C.white} 60%, ${C.goldXLight} 100%)`, position: 'relative', overflow: 'hidden' }}>
        {/* Background decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${C.indigo}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${C.emerald}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '80px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div className="animate-fadeUp">
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, color: C.textPrimary, lineHeight: 1.15, marginBottom: 24 }}>
              Igniting Careers.{' '}
              <span style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Empowering Businesses.</span>{' '}
              Transforming Futures.
            </h1>
            <p style={{ fontSize: 17, color: C.textSecondary, lineHeight: 1.8, marginBottom: 36, maxWidth: 520 }}>
              At S7Next Technologies, we bridge the gap between talent and opportunity — equipping job seekers, professionals, and organizations with the skills and support they need to thrive.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Btn variant="primary" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => setPage('courses')}>🚀 Explore Courses</Btn>
              <Btn variant="outline" style={{ padding: '14px 32px', fontSize: 15 }} onClick={() => setPage('about')}>Learn More →</Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 44 }}>
              {[['500+', 'Students Trained'], ['50+', 'Partner Companies'], ['95%', 'Placement Rate']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: 28, fontWeight: 900, color: C.indigo }}>{val}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Hero Visual */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="animate-float">
            {[
              { icon: '🎯', label: 'Placement Focused', color: C.indigo },
              { icon: '🤝', label: 'Industry Network', color: C.gold },
              { icon: '💡', label: 'Real Projects', color: C.emerald },
              { icon: '🏆', label: 'Certified Trainers', color: C.indigo },
            ].map((item) => (
              <div key={item.label} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WE OFFER ── */}
      <section style={{ padding: '100px 24px', background: C.bgSection }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <SectionHeader label="Services" title="What We Offer" subtitle="Comprehensive solutions across training, staffing, and career development designed to deliver real outcomes." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {offerCards.map((card, i) => <FeatureCard key={i} {...card} />)}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section style={{ padding: '100px 24px', background: C.white }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <SectionHeader label="Our Edge" title="Why Choose Us" subtitle="Three pillars that set us apart and ensure your success." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {whyCards.map((card, i) => <WhyCard key={i} {...card} />)}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '80px 24px', background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.indigoDark} 100%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', opacity: 0.4 }} />
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, position: 'relative' }}>
          {[['500+', 'Students Trained', C.gold], ['50+', 'Partner Companies', C.emerald], ['95%', 'Placement Rate', C.indigoLight], ['5+', 'Courses Available', C.goldLight]].map(([val, lbl, col]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Playfair Display', fontSize: 44, fontWeight: 900, color: col }}>{val}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 6 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED COURSES ── */}
      <section style={{ padding: '100px 24px', background: C.bgSection }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <SectionHeader label="Learning" title="Featured Courses" subtitle="Start your journey with our most popular industry-aligned programs." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24, marginBottom: 40 }}>
            {courses.slice(0, 3).map(c => <CourseCard key={c.id} course={c} onEnroll={onEnroll} onView={() => {}} />)}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Btn variant="primary" style={{ padding: '14px 36px', fontSize: 15 }} onClick={() => setPage('courses')}>View All Courses →</Btn>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: '80px 24px', background: C.white }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center', background: `linear-gradient(135deg, ${C.indigoXLight}, ${C.goldXLight})`, border: `1.5px solid ${C.indigo}22`, borderRadius: 28, padding: '56px 48px', boxShadow: '0 20px 60px rgba(79,70,229,0.1)' }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 36, fontWeight: 900, color: C.textPrimary, marginBottom: 16 }}>Ready to Transform Your Career?</h2>
          <p style={{ fontSize: 16, color: C.textSecondary, marginBottom: 32, lineHeight: 1.7 }}>Join hundreds of professionals who've already accelerated their careers with S7Next Technologies.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn variant="primary" style={{ padding: '14px 32px' }} onClick={() => setPage('courses')}>Get Started Today →</Btn>
            <Btn variant="outlineGray" style={{ padding: '14px 32px' }} onClick={() => setPage('about')}>Learn More</Btn>
          </div>
        </div>
      </section>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT PAGE — Beautified
// ═══════════════════════════════════════════════════════════════════════════

const AboutPage = () => {
  const services = [
    { icon: '💻', title: 'Application & Software Development', desc: 'End-to-end development of web, mobile, cloud-native, and enterprise applications using Python, AI/ML, automation, and modern frameworks.', color: C.indigo },
    { icon: '🧪', title: 'Testing & Quality Engineering', desc: 'Manual and automated testing including functional, performance, security, and regression testing for production-grade reliability.', color: C.emerald },
    { icon: '⚙️', title: 'DevOps & Deployment Services', desc: 'CI/CD pipeline setup, cloud deployment, containerization, infrastructure automation, monitoring, and production support.', color: C.gold },
    { icon: '🤖', title: 'Emerging Technologies Solutions', desc: 'AI, Machine Learning, Data Science, Robotics, Automation, Analytics, and cloud-based architectures aligned with current industry demands.', color: C.indigo },
    { icon: '🎓', title: 'Training, Coaching & Internship Programs', desc: 'Structured coaching and hands-on internship programs in Python, Data Science, AI/ML, Agile, DevOps, and Robotics with real-time project exposure.', color: C.emerald },
    { icon: '📋', title: 'Documentation & Compliance Services', desc: 'Complete professional documentation: SRS, FDD/TDD, Architecture Diagrams, Test Plans, QA Reports, Training Manuals, and Tender-ready documents.', color: C.gold },
    { icon: '🔍', title: 'Consultation & Lifecycle Support', desc: 'Expert consulting from ideation and feasibility analysis through development, deployment, optimization, and long-term maintenance.', color: C.indigo },
  ];

  return (
    <div style={{ paddingTop: 72 }}>
      {/* Hero */}
      <section style={{ padding: '80px 24px', background: `linear-gradient(160deg, ${C.indigoXLight} 0%, ${C.white} 60%)`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.white, border: `1px solid ${C.indigo}33`, borderRadius: 20, padding: '8px 18px', marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.indigo }}>🏢 About S7Next Technologies</span>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, color: C.textPrimary, lineHeight: 1.2, marginBottom: 24 }}>
            Engineering Tomorrow's Solutions,{' '}
            <span style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Today.</span>
          </h1>
          <p style={{ fontSize: 18, color: C.textSecondary, lineHeight: 1.8, marginBottom: 40 }}>
            A technology-driven startup focused on delivering end-to-end software engineering solutions, emerging technology services, and industry-aligned training and internship programs.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: '80px 24px', background: C.white }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <SectionHeader label="Our Mission" title="Bridging Talent & Opportunity" subtitle="" align="left" />
            <p style={{ fontSize: 16, color: C.textSecondary, lineHeight: 1.9, marginBottom: 20 }}>
              S7NextTechnologies partners with organizations, startups, and academic institutions to design, develop, test, deploy, and maintain scalable solutions using modern and next-generation technologies.
            </p>
            <p style={{ fontSize: 16, color: C.textSecondary, lineHeight: 1.9, marginBottom: 28 }}>
              Our goal is to help businesses enhance operational efficiency while simultaneously building future-ready talent through real-world project exposure.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['Innovation', C.indigo], ['Quality', C.emerald], ['Reliability', C.gold]].map(([val, col]) => (
                <span key={val} style={{ background: `${col}15`, color: col, border: `1px solid ${col}33`, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>✦ {val}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { icon: '🎯', title: 'Our Vision', text: 'To be India\'s most trusted technology and talent development partner, shaping careers and businesses for the digital era.', color: C.indigo },
              { icon: '💪', title: 'Our Commitment', text: 'We work closely with clients to deliver customized, secure, and scalable solutions ensuring seamless integration across all phases.', color: C.emerald },
              { icon: '🌟', title: 'Our Approach', text: 'Real-world project exposure, industry-aligned curriculum, and dedicated mentorship that produces job-ready professionals.', color: C.gold },
            ].map(item => (
              <div key={item.title} style={{ background: C.bgSection, border: `1.5px solid ${C.border}`, borderLeft: `4px solid ${item.color}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: item.color, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6 }}>{item.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section style={{ padding: '80px 24px', background: C.bgSection }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <SectionHeader label="Services" title="Our Key Services" subtitle="Comprehensive technology services covering the full lifecycle from ideation to maintenance." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {services.map((s, i) => (
              <div key={i} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', transition: 'all 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)'; }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${s.color}12`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: 17, fontWeight: 700, color: s.color, marginBottom: 10 }}>➢ {s.title}</h3>
                <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Services detail */}
      <section style={{ padding: '60px 24px', background: C.white }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 24, padding: 40 }}>
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: 22, color: C.textPrimary, marginBottom: 20 }}>📋 Documentation Includes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['Software Requirement Specification (SRS)', 'Functional & Technical Design Documents (FDD/TDD)', 'Architecture Diagrams & Deployment Documents', 'Test Plans, Test Cases & QA Reports', 'Project Proposals & Statements of Work (SOW)', 'Training Manuals & Internship Project Reports', 'Tender-ready documentation', 'Compliance documents (where applicable)'].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: C.textSecondary }}>
                <span style={{ color: C.emerald, fontWeight: 900, flexShrink: 0 }}>✓</span>{item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.indigoDark} 100%)` }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 36, fontWeight: 900, color: C.white, marginBottom: 16 }}>Let's Build Together</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 1.7 }}>We welcome the opportunity to discuss how S7NextTechnologies can support your organization's technology initiatives and skill development programs.</p>
          <Btn variant="gold" style={{ padding: '14px 36px', fontSize: 15 }} onClick={() => window.open('mailto:s7nexttechnologies@gmail.com')}>📧 Get In Touch</Btn>
        </div>
      </section>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COURSES PAGE
// ═══════════════════════════════════════════════════════════════════════════

const SyllabusModule = ({ module, accent, defaultOpen = false, moduleNumber }) => {
  const [open, setOpen] = useState(defaultOpen);
  
  // Auto-assign theme colors based on module number
  const themeColors = [
    { bg: '#ECFDF5', border: '#10B981', text: '#059669', icon: '🌱' },
    { bg: '#EEF2FF', border: '#4F46E5', text: '#3730A3', icon: '⚡' },
    { bg: '#FFFBEB', border: '#F59E0B', text: '#B45309', icon: '🔥' },
    { bg: '#F3E8FF', border: '#8B5CF6', text: '#6D28D9', icon: '🚀' },
    { bg: '#CFFAFE', border: '#06B6D4', text: '#0E7490', icon: '💎' },
  ];
  
  const theme = themeColors[(moduleNumber - 1) % themeColors.length];
  const topics = Array.isArray(module.topics) ? module.topics : [];

  return (
    <div style={{ border: `1.5px solid ${open ? theme.border : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s ease', marginBottom: 12 }}>
      {/* Header */}
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: open ? theme.bg : C.white, cursor: 'pointer', transition: 'background 0.2s', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <span style={{ fontSize: 22 }}>{theme.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{module.module}</div>
          </div>
          <span style={{ fontSize: 11, background: `${theme.border}18`, color: theme.text, border: `1px solid ${theme.border}33`, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
            {topics.length} topics
          </span>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: open ? theme.border : C.bgSection, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, marginLeft: 12 }}>
          <span style={{ fontSize: 12, color: open ? C.white : C.textMuted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block', transition: 'transform 0.25s' }}>▼</span>
        </div>
      </div>
      
      {/* Topics list */}
      {open && (
        <div style={{ padding: '4px 20px 20px', background: C.white, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: topics.length > 6 ? 'repeat(2, 1fr)' : '1fr', gap: '10px 24px', marginTop: 14 }}>
            {topics.map((topic, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: theme.bg, borderRadius: 10, border: `1px solid ${theme.border}22` }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: C.white, fontWeight: 900 }}>✓</span>
                </div>
                <span style={{ fontSize: 13.5, color: C.textPrimary, lineHeight: 1.5, fontWeight: 500, flex: 1 }}>{topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
// ─── HARDCODED SYLLABUSES ─────────────────────────────────────────────────
const COURSE_SYLLABUSES = {
  // Match this key to your course title (lowercase, trimmed)
  'python basic to advanced': [
    {
      title: 'Python Beginner',
      level: 'beginner',
      subtitle: 'Foundation concepts — zero to writing real programs',
      topics: [
        'Python Introduction',
        'Installing Python and Setting Up Environment',
        'Variables and Data Types',
        'Input and Output Functions',
        'Conditional Statements',
        'Loops',
        'Functions',
        'Data Structures',
        'String Manipulations',
        'Exception Handling',
      ],
    },
    {
      title: 'Python Intermediate',
      level: 'intermediate',
      subtitle: 'Core skills — writing professional Python code',
      topics: [
        'File Handling',
        'OOP Concepts (Object-Oriented Programming)',
        'Modules and Packages',
        'Libraries',
        'Decorators and Generators',
        'Lambda Functions',
        'REST API Integration',
        'Multithreading and Multiprocessing',
      ],
    },
    {
      title: 'Python Advanced',
      level: 'advanced',
      subtitle: 'Expert topics — industry-level Python engineering',
      topics: [
        'Advanced OOP',
        'Advanced Data Manipulation',
        'Machine Learning',
        'Web Development',
        'Web Scraping',
        'Cloud Computing',
        'Automation',
        'Microservices and API Development',
        'CI/CD, Docker, Kubernetes',
      ],
    },
  ],
};
const COURSE_IMAGES = {
  // Keys are lowercase substrings matched against course title
  'python':        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  'data science':  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg',
  'machine learning': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg',
  'ai':            'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg',
  'web development': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg',
  'flask':         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg',
  'django':        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg',
  'automation':    'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg',
  'api':           'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg',
  'robotics':      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/raspberrypi/raspberrypi-original.svg',
  'gaming':        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pygame/pygame-original.svg',
  'micropython':   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
};

// Helper: resolve the right image URL for a course based on its title
const getCourseImage = (title = '') => {
  const lower = title.toLowerCase();
  const matchedKey = Object.keys(COURSE_IMAGES).find(k => lower.includes(k));
  return matchedKey ? COURSE_IMAGES[matchedKey] : null;
};
const CourseDetailModal = ({ course, onClose, onEnroll }) => {
  const [activeTab, setActiveTab] = useState('overview');
  if (!course) return null;
  const CourseDetailModalIconExample = ({ course }) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getCourseImage(course.title);
  return (
    <div
      style={{
        width: 72, height: 72, borderRadius: 18,
        background: `${course.color}15`,
        border: `1px solid ${course.color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 38, flexShrink: 0, overflow: 'hidden',
        padding: imageUrl && !imgError ? 10 : 0,
      }}
    >
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={course.title}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : course.icon}
    </div>
  );
};
  // Parse syllabus — supports both array of module objects and legacy topics array
  const hasSyllabus = Array.isArray(course.syllabus) && course.syllabus.length > 0;
const defaultModules = (() => {
  if (hasSyllabus) return course.syllabus;
  
  // ✅ Check hardcoded syllabuses first
  const key = (course.title || '').toLowerCase().trim();
  if (COURSE_SYLLABUSES[key]) return COURSE_SYLLABUSES[key];
  
  // Fallback: split topics array into 3 equal groups
  const topics = Array.isArray(course.topics) ? course.topics : [];
  if (topics.length === 0) return [];
  const third = Math.ceil(topics.length / 3);
  return [
    { title: 'Beginner',     level: 'beginner',     subtitle: 'Foundation concepts', topics: topics.slice(0, third) },
    { title: 'Intermediate', level: 'intermediate',  subtitle: 'Core skills',         topics: topics.slice(third, third * 2) },
    { title: 'Advanced',     level: 'advanced',      subtitle: 'Expert topics',       topics: topics.slice(third * 2) },
  ].filter(m => m.topics.length > 0);
})();

  const tabs = [
    { id: 'overview', label: '📋 Overview' },
    ...(defaultModules.length > 0 ? [{ id: 'syllabus', label: '📚 Syllabus' }] : []),
  ];

  return (
    <Modal open onClose={onClose} title={course.title} width={760}>
      {/* Course Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24, padding: '20px', background: `${course.color}08`, border: `1px solid ${course.color}22`, borderRadius: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: `${course.color}15`, border: `1px solid ${course.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, flexShrink: 0, overflow: 'hidden', padding: getCourseImage(course.title) ? 10 : 0 }}>
        {getCourseImage(course.title)
          ? <img src={getCourseImage(course.title)} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : course.icon}
      </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {course.tag && <Badge text={course.tag} color={course.color} />}
            {course.level && <Badge text={course.level} color={C.textMuted} />}
          </div>
          <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 12, lineHeight: 1.6 }}>{course.tagline}</p>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: C.textMuted, flexWrap: 'wrap' }}>
            <span>📅 {course.duration}</span>
            <span>📚 {course.modules} modules</span>
            <span>👥 {course.enrolled_count || 0} enrolled</span>
            {defaultModules.length > 0 && <span>🎯 {defaultModules.length} levels</span>}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      {tabs.length > 1 && (
        <div style={{ display: 'flex', background: C.bgSection, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeTab === t.id ? C.white : 'transparent', color: activeTab === t.id ? C.indigo : C.textMuted, fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, transition: 'all 0.2s', boxShadow: activeTab === t.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {course.description && (
            <div style={{ background: C.bgSection, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>About This Course</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8 }}>{course.description}</p>
            </div>
          )}
          {/* Quick syllabus preview on overview */}
          {defaultModules.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Course Structure</h3>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(defaultModules.length, 3)}, 1fr)`, gap: 12 }}>
                {defaultModules.map((mod, i) => {
                  const levelColors = { beginner: [C.emerald, C.emeraldXLight], intermediate: [C.indigo, C.indigoXLight], advanced: [C.gold, C.goldXLight] };
                  const key = (mod.level || mod.title || '').toLowerCase();
                  const matchKey = Object.keys(levelColors).find(k => key.includes(k)) || 'intermediate';
                  const [col, bg] = levelColors[matchKey];
                  const icons = { beginner: '🌱', intermediate: '⚡', advanced: '🔥' };
                  return (
                    <div key={i} style={{ background: bg, border: `1.5px solid ${col}33`, borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{icons[matchKey] || '📚'}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: col, marginBottom: 4 }}>{mod.title}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{(Array.isArray(mod.topics) ? mod.topics : (mod.topics || '').split(',')).filter(Boolean).length} topics</div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setActiveTab('syllabus')} style={{ width: '100%', marginTop: 12, padding: '10px', background: 'transparent', border: `1.5px dashed ${C.border}`, borderRadius: 10, color: C.indigo, fontFamily: 'Outfit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                View Full Syllabus →
              </button>
            </div>
          )}
        </div>
      )}

      {/* SYLLABUS TAB */}
{activeTab === 'syllabus' && (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
      This course is structured into <strong style={{ color: C.textPrimary }}>{defaultModules.length} progressive levels</strong>. Click each module to expand the full syllabus.
    </div>
    {defaultModules.map((mod, i) => (
      <SyllabusModule 
        key={i} 
        module={mod} 
        accent={course.color || C.indigo} 
        defaultOpen={i === 0}
        moduleNumber={i + 1}  // ← ADD THIS LINE
      />
    ))}
  </div>
)}

      {/* Price & Enroll — always visible at bottom */}
      <div style={{ background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 20, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Course Price</div>
            <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Playfair Display', color: course.color }}>₹{course.price?.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>+ ₹{Math.round(course.price * 0.18).toLocaleString()} GST (18%)</div>
          </div>
          {onEnroll && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Btn variant="outlineGray" small onClick={() => setActiveTab('syllabus')}>View Syllabus</Btn>
              <Btn variant="primary" onClick={() => { onEnroll(course); onClose(); }}>Enroll Now →</Btn>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const CoursesPage = ({ courses, onEnroll, enrolledIds }) => {
  const [search, setSearch] = useState('');
  const [viewingCourse, setViewingCourse] = useState(null);
  const filtered = courses.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ paddingTop: 72 }}>
      <section style={{ padding: '60px 24px 40px', background: `linear-gradient(160deg, ${C.indigoXLight}, ${C.white})`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <SectionHeader label="Learning" title="All Courses" subtitle="Master in-demand skills with our industry-aligned programs." />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search courses..."
            style={{ display: 'block', width: '100%', maxWidth: 480, margin: '0 auto', padding: '14px 20px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, color: C.textPrimary, fontSize: 14, fontFamily: 'Outfit', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
          />
        </div>
      </section>
      <section style={{ padding: '60px 24px', background: C.bgSection }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {filtered.map(c => <CourseCard key={c.id} course={c} onEnroll={onEnroll} onView={setViewingCourse} enrolled={enrolledIds.includes(c.id)} />)}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <p style={{ fontSize: 16 }}>No courses found matching "{search}"</p>
            </div>
          )}
        </div>
      </section>
      {viewingCourse && <CourseDetailModal course={viewingCourse} onClose={() => setViewingCourse(null)} onEnroll={onEnroll} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MY COURSES PAGE
// ═══════════════════════════════════════════════════════════════════════════

const MyCoursesPage = ({ enrollments, courses, onUpdateProgress }) => {
  const myList = enrollments.map(e => ({ ...courses.find(c => c.id === e.course_id), ...e }));
  return (
    <div style={{ paddingTop: 72 }}>
      <section style={{ padding: '60px 24px 40px', background: `linear-gradient(160deg, ${C.indigoXLight}, ${C.white})`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <SectionHeader label="My Learning" title="My Enrolled Courses" subtitle="Track your progress and continue where you left off." />
        </div>
      </section>
      <section style={{ padding: '60px 24px', background: C.bgSection }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          {myList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>📚</div>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 28, color: C.textPrimary, marginBottom: 12 }}>No Courses Yet</h2>
              <p style={{ color: C.textMuted, marginBottom: 28 }}>Browse our courses and start your learning journey!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
              {myList.map(c => (
                <div key={c.id} style={{ background: C.white, border: `1.5px solid ${c.color || C.border}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${c.color}, ${c.color}66)` }} />
                  <div style={{ padding: 28 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                      <span style={{ fontSize: 32 }}>{c.icon}</span>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{c.title}</h3>
                        <span style={{ fontSize: 12, color: C.textMuted }}>{c.duration}</span>
                      </div>
                    </div>
                    <ProgressBar progress={c.progress || 0} label={`${Math.round(((c.progress || 0) / 100) * (c.modules || 0))} / ${c.modules} modules`} color={c.color || C.indigo} />
                    <Btn variant="primary" small style={{ marginTop: 20, width: '100%' }} onClick={() => onUpdateProgress(c.course_id, Math.min(100, (c.progress || 0) + 10))}>
                      {c.progress === 0 ? '▶ Start Learning' : c.progress >= 100 ? '✅ Review Course' : '▶ Continue Learning'}
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MY APPS PAGE — Portfolio of built projects
// ═══════════════════════════════════════════════════════════════════════════

const AppCard = ({ app }) => {
  const [hover, setHover] = useState(false);
  const accentColor = app.color || C.indigo;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? C.cardHover : C.white, border: `1.5px solid ${hover ? accentColor : C.border}`, borderRadius: 20, overflow: 'hidden', transition: 'all 0.3s ease', transform: hover ? 'translateY(-5px)' : 'none', boxShadow: hover ? `0 20px 50px rgba(0,0,0,0.1)` : `0 4px 20px rgba(0,0,0,0.05)` }}>
      {/* Cover image or gradient */}
      <div style={{ height: 200, background: app.cover_image ? `url(${app.cover_image}) center/cover` : `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${C.border}` }}>
        {!app.cover_image && <span style={{ fontSize: 56 }}>{app.icon || '💻'}</span>}
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, fontWeight: 700, color: C.textPrimary, flex: 1, marginRight: 10 }}>{app.name}</h3>
          {app.status && <Badge text={app.status} color={app.status === 'Live' ? C.emerald : app.status === 'Beta' ? C.gold : C.indigo} small />}
        </div>
        <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.7, marginBottom: 16, minHeight: 60 }}>{app.description}</p>
        {app.tech_stack && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {(typeof app.tech_stack === 'string' ? app.tech_stack.split(',') : app.tech_stack).map((tech, i) => (
              <span key={i} style={{ fontSize: 11, background: `${accentColor}12`, color: accentColor, padding: '3px 10px', borderRadius: 20, border: `1px solid ${accentColor}28`, fontWeight: 600 }}>{tech.trim()}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {app.live_url && <Btn variant="primary" small onClick={() => window.open(app.live_url, '_blank')} style={{ flex: 1 }}>🚀 Live Demo</Btn>}
          {app.github_url && <Btn variant="outlineGray" small onClick={() => window.open(app.github_url, '_blank')} style={{ flex: 1 }}>🔗 GitHub</Btn>}
        </div>
      </div>
    </div>
  );
};

const MyAppsPage = ({ apps, loading }) => (
  <div style={{ paddingTop: 72 }}>
    <section style={{ padding: '60px 24px 40px', background: `linear-gradient(160deg, ${C.indigoXLight}, ${C.white})`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader label="Our Work" title="Projects & Applications" subtitle="Real-world applications built by our team — showcasing the quality and range of our engineering capabilities." />
      </div>
    </section>
    <section style={{ padding: '60px 24px', background: C.bgSection }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>Loading projects...</div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🛠️</div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 28, color: C.textPrimary, marginBottom: 12 }}>No Projects Yet</h2>
            <p style={{ color: C.textMuted }}>Projects will appear here once they are added by an admin.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28 }}>
            {apps.map(app => <AppCard key={app.id} app={app} />)}
          </div>
        )}
      </div>
    </section>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// AUTH MODAL
// ═══════════════════════════════════════════════════════════════════════════

const AuthModal = ({ mode, onClose, onAuth }) => {
  const [tab, setTab] = useState(mode || 'login');
  const [authMethod, setAuthMethod] = useState('email');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEmailAuth = async () => {
    setLoading(true); setError('');
    try {
      const data = tab === 'register' ? await API.register(form.name, form.email, form.password) : await API.login(form.email, form.password);
      localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
      onAuth(data.user); onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    if (!auth) { setError('Firebase not configured'); return; }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const data = await API.googleAuth(idToken);
      localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
      onAuth(data.user); onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleSendOTP = async () => {
    setLoading(true); setError('');
    try {
      const result = await API.sendOTP(form.phone);
      if (result.otp) alert(`Demo OTP: ${result.otp}`);
      setStep(2);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    setLoading(true); setError('');
    try {
      const data = await API.verifyOTP(form.phone, form.otp, form.name);
      localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken);
      onAuth(data.user); onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title={tab === 'login' ? 'Welcome Back' : 'Create Account'} width={460}>
      <div style={{ display: 'flex', background: C.bgSection, borderRadius: 12, padding: 4, marginBottom: 28 }}>
        {['login', 'register'].map(t => (
          <button key={t} onClick={() => { setTab(t); setStep(1); setError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: tab === t ? C.white : 'transparent', color: tab === t ? C.indigo : C.textMuted, fontFamily: 'Outfit', fontWeight: 700, fontSize: 14, transition: 'all 0.2s', boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
            {t === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>
      {error && <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12, marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 500 }}>{error}</div>}
      <button onClick={handleGoogleAuth} disabled={loading} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', color: C.textSecondary, fontSize: 14, fontFamily: 'Outfit', fontWeight: 600, marginBottom: 10, transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = C.bgSection} onMouseLeave={e => e.currentTarget.style.background = C.white}>
        <span style={{ fontSize: 20 }}>🔵</span> Continue with Google
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['email', 'phone'].map(m => (
          <button key={m} onClick={() => { setAuthMethod(m); setStep(1); setError(''); }} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1.5px solid ${authMethod === m ? C.indigo : C.border}`, background: authMethod === m ? C.indigoXLight : 'transparent', color: authMethod === m ? C.indigo : C.textMuted, fontFamily: 'Outfit', fontSize: 13, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
            {m === 'email' ? '📧 Email' : '📱 Phone'}
          </button>
        ))}
      </div>
      {authMethod === 'email' ? (
        <>
          {tab === 'register' && <Input label="Full Name" icon="👤" value={form.name} onChange={upd('name')} placeholder="Your full name" />}
          <Input label="Email" type="email" icon="📧" value={form.email} onChange={upd('email')} placeholder="you@example.com" />
          <Input label="Password" type="password" icon="🔑" value={form.password} onChange={upd('password')} placeholder="••••••••" />
          <Btn variant="primary" style={{ width: '100%', marginTop: 8 }} onClick={handleEmailAuth} disabled={loading}>
            {loading ? 'Loading...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
          </Btn>
        </>
      ) : step === 1 ? (
        <>
          {tab === 'register' && <Input label="Full Name" icon="👤" value={form.name} onChange={upd('name')} placeholder="Your full name" />}
          <Input label="Phone" type="tel" icon="📱" value={form.phone} onChange={upd('phone')} placeholder="+91 98765 43210" />
          <Btn variant="primary" style={{ width: '100%' }} onClick={handleSendOTP} disabled={loading}>{loading ? 'Sending...' : 'Send OTP →'}</Btn>
        </>
      ) : (
        <>
          <div style={{ background: C.emeraldXLight, border: `1px solid ${C.emerald}33`, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: C.emeraldDark, fontWeight: 500 }}>✅ OTP sent to {form.phone}</div>
          <Input label="Enter OTP" icon="🔐" value={form.otp} onChange={upd('otp')} placeholder="6-digit code" maxLength={6} />
          <Btn variant="primary" style={{ width: '100%' }} onClick={handleVerifyOTP} disabled={loading}>{loading ? 'Verifying...' : 'Verify & Continue →'}</Btn>
        </>
      )}
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE MODAL
// ═══════════════════════════════════════════════════════════════════════════

const ProfileModal = ({ user, onClose, onSave, onLogout }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [preview, setPreview] = useState(user.avatar);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = async e => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try { const data = await API.uploadAvatar(file); setPreview(data.avatarUrl); }
    catch (err) { alert('Upload failed: ' + err.message); }
    setUploading(false);
  };

  const handleSave = async () => {
    try { await API.updateProfile(form); onSave({ ...user, ...form, avatar: preview }); setEditing(false); }
    catch (err) { alert('Update failed: ' + err.message); }
  };

  return (
    <Modal open onClose={onClose} title="My Profile" width={520}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: `linear-gradient(135deg, ${C.indigo}, ${C.gold})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: C.white, overflow: 'hidden', border: `3px solid ${C.border}`, boxShadow: '0 8px 24px rgba(79,70,229,0.2)' }}>
            {uploading ? '⏳' : preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : user.name[0]?.toUpperCase()}
          </div>
          {editing && <button onClick={() => fileRef.current.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: C.indigo, border: '2px solid white', color: C.white, cursor: 'pointer', fontSize: 12 }}>✏️</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, color: C.textPrimary }}>{user.name}</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{user.email}</div>
      </div>
      {editing ? (
        <>
          <Input label="Name" icon="👤" value={form.name} onChange={upd('name')} />
          <Input label="Email" type="email" icon="📧" value={form.email} onChange={upd('email')} />
          <Input label="Phone" type="tel" icon="📱" value={form.phone} onChange={upd('phone')} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="primary" style={{ flex: 1 }} onClick={handleSave}>Save</Btn>
            <Btn variant="outlineGray" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </>
      ) : (
        <>
          {[['👤 Name', user.name], ['📧 Email', user.email], ['📱 Phone', user.phone || 'Not set']].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Btn variant="primary" style={{ flex: 1 }} onClick={() => setEditing(true)}>Edit Profile</Btn>
            <Btn variant="danger" style={{ flex: 1 }} onClick={() => { onLogout(); onClose(); }}>Sign Out</Btn>
          </div>
        </>
      )}
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════

const PaymentModal = ({ course, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);

  const loadRazorpay = () => new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true); script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePay = async () => {
    setProcessing(true);
    try {
      const orderData = await API.createPaymentOrder(course.id);
      if (orderData.dev) {
        setTimeout(async () => {
          await API.verifyPayment(orderData.orderId, 'mock_payment_id', 'mock_signature', course.id, true);
          setProcessing(false); onSuccess();
        }, 2000);
        return;
      }
      const res = await loadRazorpay();
      if (!res) { alert('Razorpay SDK failed'); setProcessing(false); return; }
      const rzp = new window.Razorpay({
        key: orderData.keyId, amount: orderData.amount, currency: orderData.currency,
        name: 'S7NextTechnologies', description: course.title, order_id: orderData.orderId,
        handler: async response => {
          try {
            await API.verifyPayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, course.id);
            setProcessing(false); onSuccess();
          } catch { alert('Payment verification failed'); setProcessing(false); }
        },
        theme: { color: C.indigo },
      });
      rzp.open(); setProcessing(false);
    } catch (err) { alert('Payment failed: ' + err.message); setProcessing(false); }
  };

  return (
    <Modal open onClose={onClose} title="Complete Enrollment" width={460}>
      <div style={{ background: `${course.color}0d`, border: `1.5px solid ${course.color}22`, borderRadius: 16, padding: 20, marginBottom: 28, display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 32 }}>{course.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{course.title}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{course.duration} · {course.modules} modules</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Playfair Display', color: course.color }}>₹{course.price?.toLocaleString()}</div>
      </div>
      <div style={{ marginBottom: 24 }}>
        {[['Course fee', `₹${course.price?.toLocaleString()}`], ['GST (18%)', `₹${Math.round(course.price * 0.18).toLocaleString()}`]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.textMuted, marginBottom: 8 }}><span>{l}</span><span>{v}</span></div>
        ))}
        <div style={{ height: 1, background: C.border, margin: '16px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
          <span style={{ color: C.textPrimary }}>Total</span>
          <span style={{ color: course.color, fontFamily: 'Playfair Display' }}>₹{Math.round(course.price * 1.18).toLocaleString()}</span>
        </div>
      </div>
      <Btn variant="primary" style={{ width: '100%', padding: '14px' }} onClick={handlePay} disabled={processing}>
        {processing ? '⏳ Processing...' : `Pay ₹${Math.round(course.price * 1.18).toLocaleString()} Securely`}
      </Btn>
      <p style={{ textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 12 }}>🔒 Secured by Razorpay</p>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PANEL — Full course management + My Apps management
// ═══════════════════════════════════════════════════════════════════════════

const CourseFormModal = ({ initialData, onClose, onSave, title }) => {
  const empty = { title: '', tagline: '', description: '', price: '', duration: '', level: 'Intermediate', icon: '🐍', color: '#4F46E5', modules: 40, tag: 'New', topics: '' };
  const [form, setForm] = useState(initialData ? {
    ...initialData,
    topics: Array.isArray(initialData.topics) ? initialData.topics.join(', ') : (initialData.topics || ''),
  } : empty);

  // Structured syllabus: 3 modules — Beginner, Intermediate, Advanced
  const defaultSyllabus = [
    { title: 'Beginner', level: 'beginner', subtitle: 'Foundation concepts', topics: '' },
    { title: 'Intermediate', level: 'intermediate', subtitle: 'Core skills', topics: '' },
    { title: 'Advanced', level: 'advanced', subtitle: 'Expert topics', topics: '' },
  ];
  const [syllabus, setSyllabus] = useState(() => {
    if (initialData?.syllabus && Array.isArray(initialData.syllabus) && initialData.syllabus.length > 0) {
      return initialData.syllabus.map(m => ({
        ...m,
        topics: Array.isArray(m.topics) ? m.topics.join(', ') : (m.topics || ''),
      }));
    }
    return defaultSyllabus;
  });
  const [formTab, setFormTab] = useState('basic');
  const [saving, setSaving] = useState(false);

  const updateSyllabusModule = (idx, field, value) => {
    setSyllabus(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: parseInt(form.price) || 0,
        modules: parseInt(form.modules) || 40,
        topics: form.topics.split(',').map(t => t.trim()).filter(Boolean),
        syllabus: syllabus.map(m => ({
          ...m,
          topics: m.topics.split(',').map(t => t.trim()).filter(Boolean),
        })).filter(m => m.topics.length > 0),
      });
    } finally { setSaving(false); }
  };

  const moduleColors = {
    beginner:     { border: C.emerald, bg: C.emeraldXLight, icon: '🌱' },
    intermediate: { border: C.indigo,  bg: C.indigoXLight,  icon: '⚡' },
    advanced:     { border: C.gold,    bg: C.goldXLight,    icon: '🔥' },
  };

  return (
    <Modal open onClose={onClose} title={title || 'Course'} width={740}>
      {/* Form Tab switcher */}
      <div style={{ display: 'flex', background: C.bgSection, borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {[['basic', '⚙️ Basic Info'], ['syllabus', '📚 Syllabus Modules']].map(([id, label]) => (
          <button key={id} onClick={() => setFormTab(id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: formTab === id ? C.white : 'transparent', color: formTab === id ? C.indigo : C.textMuted, fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, transition: 'all 0.2s', boxShadow: formTab === id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>

        {/* ── BASIC INFO TAB ── */}
        {formTab === 'basic' && (
          <div>
            <Input label="Course Title *" icon="📚" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Complete Python Masterclass" />
            <Input label="Tagline *" icon="✨" value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Short compelling description" />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Full course description..." style={{ width: '100%', padding: 12, background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontFamily: 'Outfit', fontSize: 14, minHeight: 90, outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Price (₹) *" type="number" icon="💰" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="2999" />
              <Input label="Duration" icon="📅" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="12 weeks" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Level</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} style={{ width: '100%', padding: 12, background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontFamily: 'Outfit', fontSize: 14, outline: 'none' }}>
                  {['All Levels', 'Beginner', 'Beginner+', 'Intermediate', 'Advanced'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <Input label="Modules Count" type="number" icon="📚" value={form.modules} onChange={e => setForm({ ...form, modules: e.target.value })} placeholder="40" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Icon (emoji)" icon="🎨" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🐍" />
              <Input label="Accent Color (hex)" icon="🎨" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="#4F46E5" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Tag</label>
              <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} style={{ width: '100%', padding: 12, background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontFamily: 'Outfit', fontSize: 14, outline: 'none' }}>
                {['New', 'Bestseller', 'Popular', 'Hot', 'Trending', 'Unique'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ background: C.indigoXLight, border: `1px solid ${C.indigo}33`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: C.indigo }}>
              💡 Switch to the <strong>Syllabus Modules</strong> tab to add Beginner, Intermediate & Advanced topics.
            </div>
          </div>
        )}

        {/* ── SYLLABUS MODULES TAB ── */}
        {formTab === 'syllabus' && (
          <div>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
              Add the syllabus for each level. Enter topics separated by commas. These will appear as expandable sections in the course detail page.
            </p>
            {syllabus.map((mod, idx) => {
              const theme = moduleColors[mod.level] || moduleColors.intermediate;
              return (
                <div key={idx} style={{ border: `1.5px solid ${theme.border}44`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                  {/* Module header */}
                  <div style={{ background: theme.bg, padding: '14px 20px', borderBottom: `1px solid ${theme.border}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{theme.icon}</span>
                    <div style={{ flex: 1 }}>
                      <Input label="" value={mod.title} onChange={e => updateSyllabusModule(idx, 'title', e.target.value)} placeholder="Module name e.g., Beginner" style={{ marginBottom: 0 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Input label="" value={mod.subtitle} onChange={e => updateSyllabusModule(idx, 'subtitle', e.target.value)} placeholder="Subtitle e.g., Foundation concepts" style={{ marginBottom: 0 }} />
                    </div>
                  </div>
                  {/* Topics textarea */}
                  <div style={{ padding: '16px 20px', background: C.white }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Topics for {mod.title} (comma-separated)
                    </label>
                    <textarea
                      value={mod.topics}
                      onChange={e => updateSyllabusModule(idx, 'topics', e.target.value)}
                      placeholder={
                        mod.level === 'beginner'
                          ? 'Python Introduction, Variables and Data Types, Loops, Functions, Data Structures...'
                          : mod.level === 'intermediate'
                          ? 'File Handling, OOP Concepts, Modules and Packages, Decorators, REST API Integration...'
                          : 'Advanced OOP, Machine Learning, Web Development, Cloud Computing, CI/CD Docker...'
                      }
                      style={{ width: '100%', padding: 12, background: C.bgSection, border: `1.5px solid ${theme.border}44`, borderRadius: 10, color: C.textPrimary, fontFamily: 'Outfit', fontSize: 13, minHeight: 100, outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
                    />
                    {/* Live preview of topics count */}
                    {mod.topics && (
                      <div style={{ marginTop: 8, fontSize: 11, color: theme.border, fontWeight: 600 }}>
                        ✓ {mod.topics.split(',').filter(t => t.trim()).length} topics added
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Add extra module button */}
            <button onClick={() => setSyllabus([...syllabus, { title: `Module ${syllabus.length + 1}`, level: 'intermediate', subtitle: '', topics: '' }])}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: `1.5px dashed ${C.border}`, borderRadius: 12, color: C.indigo, fontFamily: 'Outfit', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              + Add Another Module
            </button>
          </div>
        )}

      </div>{/* end scrollable area */}

      {/* Sticky Save bar */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <Btn variant="primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving || !form.title || !form.price}>
          {saving ? '⏳ Saving...' : '✅ Save Course'}
        </Btn>
        <Btn variant="outlineGray" style={{ flex: 1 }} onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
};

const AppFormModal = ({ initialData, onClose, onSave, title }) => {
  const empty = { name: '', description: '', icon: '💻', color: '#4F46E5', tech_stack: '', live_url: '', github_url: '', cover_image: '', status: 'Live', category: 'Web App' };
  const [form, setForm] = useState(initialData ? { ...initialData, tech_stack: Array.isArray(initialData.tech_stack) ? initialData.tech_stack.join(', ') : (initialData.tech_stack || '') } : empty);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...form, tech_stack: form.tech_stack.split(',').map(t => t.trim()).filter(Boolean) });
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={title || 'Project'} width={700}>
      <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Project Name *" icon="💻" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Awesome App" />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: 12, background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontFamily: 'Outfit', fontSize: 14, outline: 'none' }}>
              {['Live', 'Beta', 'In Development', 'Archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>Description *</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this project do?" style={{ width: '100%', padding: 12, background: C.bgSection, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontFamily: 'Outfit', fontSize: 14, minHeight: 90, outline: 'none', resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Icon (emoji)" icon="🎨" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="💻" />
          <Input label="Accent Color (hex)" icon="🎨" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="#4F46E5" />
        </div>
        <Input label="Tech Stack (comma-separated)" icon="🛠️" value={form.tech_stack} onChange={e => setForm({ ...form, tech_stack: e.target.value })} placeholder="React, Node.js, MongoDB..." />
        <Input label="Live URL" icon="🚀" value={form.live_url} onChange={e => setForm({ ...form, live_url: e.target.value })} placeholder="https://myapp.com" />
        <Input label="GitHub URL" icon="🔗" value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/..." />
        <Input label="Cover Image URL" icon="🖼️" value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="https://... (optional)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Btn variant="primary" onClick={handleSave} disabled={saving || !form.name || !form.description}>
            {saving ? '⏳ Saving...' : '✅ Save Project'}
          </Btn>
          <Btn variant="outlineGray" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
};

const AdminPanel = ({ onClose }) => {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showAddApp, setShowAddApp] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (message, type = 'success') => setToast({ message, type });

  const loadData = async (currentTab) => {
    setLoading(true);
    try {
      if (currentTab === 'overview') {
        const [s, e] = await Promise.all([API.getAdminStats(), API.getAllEnrollments()]);
        setStats(s); setEnrollments(e);
      } else if (currentTab === 'courses') {
        setCourses(await API.getCourses());
      } else if (currentTab === 'apps') {
        setApps(await API.getApps());
      }
    } catch (e) { notify('Failed to load data', 'error'); }
    setLoading(false);
  };

  useEffect(() => { loadData(tab); }, [tab]);

  const handleAddCourse = async (data) => {
    try { await API.addCourse(data); notify('Course added!'); setShowAddCourse(false); loadData('courses'); }
    catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const handleEditCourse = async (data) => {
    try { await API.updateCourse(editCourse.id, data); notify('Course updated!'); setEditCourse(null); loadData('courses'); }
    catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Delete this course permanently?')) return;
    try { await API.deleteCourse(id); notify('Course deleted!'); loadData('courses'); }
    catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const handleAddApp = async (data) => {
    try { await API.addApp(data); notify('Project added!'); setShowAddApp(false); loadData('apps'); }
    catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const handleEditApp = async (data) => {
    try { await API.updateApp(editApp.id, data); notify('Project updated!'); setEditApp(null); loadData('apps'); }
    catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const handleDeleteApp = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await API.deleteApp(id); notify('Project deleted!'); loadData('apps'); }
    catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'courses', label: '📚 Courses' },
    { id: 'apps', label: '💻 Projects' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#F1F5F9', overflowY: 'auto' }}>
      <style>{GS}</style>
      {/* Admin Header */}
      <div style={{ background: C.dark, padding: '0 28px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Logo size={38} showText dark />
            <span style={{ fontFamily: 'Outfit', fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', background: `${C.gold}22`, padding: '4px 10px', borderRadius: 6 }}>Admin Console</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: tab === t.id ? 'rgba(79,70,229,0.2)' : 'transparent', color: tab === t.id ? C.indigoLight : '#94A3B8', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, transition: 'all 0.2s' }}>{t.label}</button>
            ))}
          </div>
          <Btn variant="outlineGray" small onClick={onClose} style={{ color: '#94A3B8', borderColor: '#334155' }}>✕ Exit Admin</Btn>
        </div>
      </div>

      <div style={{ padding: '40px 28px', maxWidth: 1400, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted, fontSize: 16 }}>⏳ Loading...</div>}

        {/* ── OVERVIEW ── */}
        {!loading && tab === 'overview' && stats && (
          <div>
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 30, fontWeight: 900, color: C.textPrimary, marginBottom: 32 }}>Dashboard Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 36 }}>
              {[
                { icon: '👥', val: stats.totalStudents, label: 'Total Students', color: C.indigo },
                { icon: '📚', val: stats.totalCourses, label: 'Total Courses', color: C.gold },
                { icon: '📋', val: stats.totalEnrollments, label: 'Enrollments', color: C.emerald },
                { icon: '💰', val: `₹${((stats.totalRevenue || 0) / 1000).toFixed(1)}K`, label: 'Total Revenue', color: '#8B5CF6' },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: 26, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: 32, fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 24 }}>Recent Enrollments</h3>
              {enrollments.length === 0 ? (
                <p style={{ color: C.textMuted }}>No enrollments yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {enrollments.slice(0, 10).map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.bgSection, borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{e.icon || '📚'}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{e.user_name || 'Student'}</div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>{e.course_title}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.emerald }}>₹{e.amount_paid?.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{new Date(e.enrolled_at).toLocaleDateString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COURSES ── */}
        {!loading && tab === 'courses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontFamily: 'Playfair Display', fontSize: 30, fontWeight: 900, color: C.textPrimary, marginBottom: 4 }}>Manage Courses</h1>
                <p style={{ fontSize: 14, color: C.textMuted }}>Add, edit, or delete courses from your platform</p>
              </div>
              <Btn variant="primary" onClick={() => setShowAddCourse(true)}>+ Add New Course</Btn>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {courses.map(course => (
                <div key={course.id} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: 22, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `${course.color}15`, border: `1px solid ${course.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, overflow: 'hidden' }}>
                    {(() => {
                      const COURSE_IMAGES = {
                        'python': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
                        'automation': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg',
                        'api': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg',
                        'data science': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg',
                        'machine learning': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg',
                        'ai': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg',
                        'web': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg',
                        'flask': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg',
                        'django': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg',
                        'robotics': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/raspberrypi/raspberrypi-original.svg',
                        'gaming': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/arduino/arduino-original.svg',
                        'micropython': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/raspberrypi/raspberrypi-original.svg',
                      };
                      const title = (course.title || '').toLowerCase();
                      const matchedKey = Object.keys(COURSE_IMAGES).find(k => title.includes(k));
                      if (matchedKey) {
                        return (
                          <img
                            src={COURSE_IMAGES[matchedKey]}
                            alt={course.title}
                            style={{ width: 38, height: 38, objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = course.icon || '📚'; }}
                          />
                        );
                      }
                      return course.icon || '📚';
                    })()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{course.title}</div>
                      {course.tag && <Badge text={course.tag} color={course.color} small />}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textMuted }}>
                      <span>💰 ₹{course.price?.toLocaleString()}</span>
                      <span>📅 {course.duration}</span>
                      <span>🎯 {course.level}</span>
                      <span>📚 {course.modules} modules</span>
                      <span>👥 {course.enrolled_count || 0} enrolled</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="outline" small onClick={() => setEditCourse(course)}>✏️ Edit</Btn>
                    <Btn variant="danger" small onClick={() => handleDeleteCourse(course.id)}>🗑️ Delete</Btn>
                  </div>
                </div>
              ))}
              {courses.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: C.textMuted }}>No courses yet. Add your first course!</div>}
            </div>
          </div>
        )}

        {/* ── APPS / PROJECTS ── */}
        {!loading && tab === 'apps' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontFamily: 'Playfair Display', fontSize: 30, fontWeight: 900, color: C.textPrimary, marginBottom: 4 }}>Manage Projects</h1>
                <p style={{ fontSize: 14, color: C.textMuted }}>Add and manage projects displayed in the "Our Projects" page</p>
              </div>
              <Btn variant="primary" onClick={() => setShowAddApp(true)}>+ Add New Project</Btn>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {apps.map(app => (
                <div key={app.id} style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: 22, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                  {app.cover_image
                    ? <img src={app.cover_image} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 12, flexShrink: 0, border: `1px solid ${C.border}` }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 16, background: `${app.color || C.indigo}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{app.icon || '💻'}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{app.name}</div>
                      {app.status && <Badge text={app.status} color={app.status === 'Live' ? C.emerald : C.gold} small />}
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, lineHeight: 1.5 }}>{app.description?.slice(0, 100)}{app.description?.length > 100 ? '...' : ''}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(Array.isArray(app.tech_stack) ? app.tech_stack : (app.tech_stack || '').split(',')).slice(0, 4).map((t, i) => (
                        <span key={i} style={{ fontSize: 10, background: C.bgSection, color: C.textMuted, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{t.trim()}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="outline" small onClick={() => setEditApp(app)}>✏️ Edit</Btn>
                    <Btn variant="danger" small onClick={() => handleDeleteApp(app.id)}>🗑️ Delete</Btn>
                  </div>
                </div>
              ))}
              {apps.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: C.textMuted }}>No projects yet. Add your first project!</div>}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddCourse && <CourseFormModal title="Add New Course" onClose={() => setShowAddCourse(false)} onSave={handleAddCourse} />}
      {editCourse && <CourseFormModal title={`Edit: ${editCourse.title}`} initialData={editCourse} onClose={() => setEditCourse(null)} onSave={handleEditCourse} />}
      {showAddApp && <AppFormModal title="Add New Project" onClose={() => setShowAddApp(false)} onSave={handleAddApp} />}
      {editApp && <AppFormModal title={`Edit: ${editApp.name}`} initialData={editApp} onClose={() => setEditApp(null)} onSave={handleEditApp} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showPayment, setShowPayment] = useState(null);
  const [toast, setToast] = useState(null);

  const isAdmin = user?.email === 's7nexttechnologies@gmail.com' && user?.role === 'admin';

  useEffect(() => {
    API.getCourses().then(setCourses).catch(() => {});
    loadApps();
    const token = localStorage.getItem('accessToken');
    if (token) {
      API.getProfile().then(setUser).catch(() => localStorage.clear());
      API.getEnrollments().then(setEnrollments).catch(() => {});
    }
  }, []);

  const loadApps = async () => {
    setAppsLoading(true);
    try { setApps(await API.getApps()); }
    catch { setApps([]); }
    setAppsLoading(false);
  };

  const handleAuth = userData => {
    setUser(userData);
    API.getEnrollments().then(setEnrollments).catch(() => {});
    setToast({ message: `Welcome, ${userData.name}! 🎉`, type: 'success' });
  };

  const handleLogout = () => {
    localStorage.clear(); setUser(null); setEnrollments([]); setPage('home');
    setToast({ message: 'Signed out successfully', type: 'info' });
  };

  const handleEnrollClick = course => {
    if (!user) { setShowAuth('register'); setToast({ message: 'Please sign in to enroll', type: 'info' }); return; }
    setShowPayment(course);
  };

  const handleEnrollSuccess = () => {
    setShowPayment(null);
    API.getEnrollments().then(setEnrollments).catch(() => {});
    setToast({ message: '🎉 Successfully enrolled!', type: 'success' });
    setPage('mycourses');
  };

  const handleUpdateProgress = async (courseId, newProgress) => {
    await API.updateProgress(courseId, newProgress).catch(() => {});
    API.getEnrollments().then(setEnrollments).catch(() => {});
  };

  const enrolledIds = enrollments.map(e => e.course_id);
  const showAdminPage = page === 'admin' && isAdmin;
  const noNavPages = ['admin'];

  if (showAdminPage) {
    return <AdminPanel onClose={() => setPage('home')} />;
  }

  return (
    <>
      <style>{GS}</style>
      <Navbar page={page} setPage={setPage} user={user} setShowAuth={setShowAuth} setShowProfile={setShowProfile} />

      {/* Page Content */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {page === 'home' && <HomePage courses={courses} onEnroll={handleEnrollClick} user={user} setPage={setPage} />}
          {page === 'about' && <AboutPage />}
          {page === 'courses' && <CoursesPage courses={courses} onEnroll={handleEnrollClick} enrolledIds={enrolledIds} />}
          {page === 'mycourses' && user && <MyCoursesPage enrollments={enrollments} courses={courses} onUpdateProgress={handleUpdateProgress} />}
          {page === 'mycourses' && !user && (
            <div style={{ paddingTop: 72, padding: '100px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 28, color: C.textPrimary, marginBottom: 12 }}>Please Sign In</h2>
              <p style={{ color: C.textMuted, marginBottom: 28 }}>Sign in to view your enrolled courses.</p>
              <Btn variant="primary" onClick={() => setShowAuth('login')}>Sign In →</Btn>
            </div>
          )}
          {page === 'myapps' && <MyAppsPage apps={apps} loading={appsLoading} />}
          {page === 'admin' && !isAdmin && (
            <div style={{ paddingTop: 72, padding: '100px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
              <h2 style={{ fontFamily: 'Playfair Display', fontSize: 28, color: C.textPrimary, marginBottom: 12 }}>Unauthorized Access</h2>
              <p style={{ color: C.textMuted, marginBottom: 28 }}>Only authorized S7Next administrators can access this area.</p>
              <Btn variant="primary" onClick={() => setPage('home')}>Return to Home</Btn>
            </div>
          )}
        </div>
        <Footer setPage={setPage} />
      </div>

      {/* Global Modals */}
      {showAuth && <AuthModal mode={showAuth} onClose={() => setShowAuth(null)} onAuth={handleAuth} />}
      {showProfile && user && <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={u => { setUser(u); setToast({ message: 'Profile updated ✅', type: 'success' }); }} onLogout={handleLogout} />}
      {showPayment && <PaymentModal course={showPayment} onClose={() => setShowPayment(null)} onSuccess={handleEnrollSuccess} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}