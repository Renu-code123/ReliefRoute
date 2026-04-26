import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, UserPlus, LogIn, Mail, Eye, EyeOff, CheckCircle2, Instagram, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { API_BASE_URL } from '../config';
import { useGoogleLogin } from '@react-oauth/google';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialRole?: 'user' | 'admin';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', initialRole = 'user' }: AuthModalProps) {
  const { t } = useTranslation();
  const setUser = useStore(state => state.setUser);
  
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<'user' | 'admin'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialMode, initialRole]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: tokenResponse.access_token, // Note: backend needs to handle access_token if using useGoogleLogin
            role 
          })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess('Successfully Logged In!');
          setTimeout(() => {
            setUser({ ...data.user, token: data.token });
            onClose();
          }, 1500);
        } else {
          setError(data.error || 'Google Login failed');
        }
      } catch (err) {
        setError('Google Auth Error');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed'),
  });

  if (!isOpen) return null;

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t('auth.error_password_mismatch') || 'Passwords do not match');
      return;
    }

    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = { email, password, role };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        if (mode === 'login') {
          setSuccess('Successfully Logged In!');
          setTimeout(() => {
            setUser({ ...data.user, token: data.token });
            onClose();
          }, 1500);
        } else {
          setSuccess(t('auth.signup_success'));
          setTimeout(() => {
            setMode('login');
            setSuccess('');
            setPassword('');
            setConfirmPassword('');
          }, 2000);
        }
      } else {
        setError(data.error || t('auth.error_invalid'));
      }
    } catch (err) {
      setError(t('ai.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-[#050B14]/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className={`relative w-full ${mode === 'login' ? 'max-w-[380px]' : 'max-w-[400px]'} bg-[#0A1220]/95 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500`}>
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${mode === 'login' ? 'bg-blue-500' : 'bg-indigo-500'}`} />
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${mode === 'login' ? 'bg-indigo-500' : 'bg-purple-500'}`} />

        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all z-10"
        >
          <X size={18} />
        </button>

        <div className="p-6 md:p-8 relative">
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border transition-all duration-500 ${
              mode === 'login' 
                ? 'bg-blue-600/20 border-blue-500/20 text-blue-400' 
                : 'bg-indigo-600/20 border-indigo-500/20 text-indigo-400 rotate-3'
            }`}>
              {mode === 'login' ? <LogIn className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {mode === 'login' ? t('auth.login') : t('auth.signup')}
            </h2>
          </div>

          {/* Mode Tabs */}
          <div className="flex p-1 bg-white/5 rounded-2xl mb-4 border border-white/5">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'login' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              }`}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'signup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              }`}
            >
              {t('auth.signup')}
            </button>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setRole('user')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${
                role === 'user' 
                  ? 'bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              <User size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">As User</span>
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all ${
                role === 'admin' 
                  ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">As Admin</span>
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <p className="text-white font-bold">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/10 transition-all"
                  placeholder={t('auth.email')}
                />
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/10 transition-all"
                  placeholder={t('auth.password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {mode === 'signup' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors">
                      <Shield size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/10 transition-all"
                      placeholder={t('auth.confirm_password')}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center animate-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 ${
                  mode === 'login' 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                    {mode === 'login' ? t('auth.login') : t('auth.signup')}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Icon-only Social Logins */}
          <div className="mt-8 flex flex-col items-center">
            <div className="w-full h-px bg-white/5 mb-6 relative">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0A1220] px-3 text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">
                {mode === 'login' ? 'Login with others' : 'Signup with others'}
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => googleLogin()}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-blue-600/20 hover:border-blue-500/50 hover:text-blue-400 transition-all group"
                title="Continue with Google"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              
              <button 
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-pink-600/20 hover:border-pink-500/50 hover:text-pink-400 transition-all group"
                title="Instagram"
              >
                <Instagram size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
