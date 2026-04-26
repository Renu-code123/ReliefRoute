import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Map, List, MapPin, Warehouse, MessageSquare, Bot, ShieldCheck, Menu, X, Home, LogOut, Cloud, RefreshCw, ArrowLeft, Activity, User as UserIcon } from 'lucide-react';
import { useStore } from './store/useStore';
import LanguageToggle from './components/LanguageToggle';
import OfflineBanner from './components/OfflineBanner';
import { SyncStatusBar } from './components/SyncStatusBar';

import Dashboard from './pages/Dashboard';
import AllocationPlan from './pages/AllocationPlan';
import Zones from './pages/Zones';
import Depots from './pages/Depots';
import Messages from './pages/Messages';
import AIAssistant from './pages/AIAssistant';
import EquityAudit from './pages/EquityAudit';
import LandingPage from './pages/LandingPage';
import Profile from './pages/Profile';

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const links = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: Map },
    { to: '/allocation', label: t('nav.allocation'), icon: List },
    { to: '/zones', label: t('nav.zones'), icon: MapPin },
    { to: '/depots', label: t('nav.depots'), icon: Warehouse },
    { to: '/messages', label: t('nav.messages'), icon: MessageSquare },
    { to: '/ai-assistant', label: t('nav.ai_assistant'), icon: Bot },
    { to: '/audit', label: t('nav.audit'), icon: ShieldCheck },
    { to: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative inset-y-0 left-0 w-72 bg-[#0A1220] text-slate-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col border-r border-white/5 shadow-2xl`}>
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-[#0A1220] to-[#111C30]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Activity size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{t('app.title')}</h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/80 font-black">{t('nav.field_command')}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 py-6">
          <Link 
            to="/" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 bg-white/5 border border-white/10 text-white hover:bg-blue-600 transition-all group font-black text-xs uppercase tracking-widest"
          >
            <Home size={18} className="group-hover:scale-110 transition-transform" />
            <span>{t('nav.go_homepage')}</span>
          </Link>
          
          {links.map(link => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group ${
                  active 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-blue-400'}`}>
                  <Icon size={20} />
                </div>
                <span className="text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 bg-gradient-to-t from-black/20 to-transparent">
          <Link 
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl hover:bg-white/5 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-white truncate">{user?.email}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{user?.role}</p>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-300 group font-bold text-sm"
          >
            <div className="group-hover:rotate-12 transition-transform">
              <LogOut size={20} />
            </div>
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
}

function MainLayout() {
  const { fetchInitialData, isOnline, setOnlineStatus, syncQueue, pendingQueueCount } = useStore();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      syncQueue();
    };
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, syncQueue]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 flex-col">
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/50">
          {/* Top Header */}
          <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/30 hover:bg-rose-600 transition-all active:scale-95 group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">{t('nav.go_homepage')}</span>
              </Link>
              <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 hover:text-blue-600 hover:border-blue-200 transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                <div className="relative flex h-2 w-2">
                  {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                </div>
                <span className="text-xs font-semibold text-slate-600 hidden md:inline tracking-wide uppercase">
                  {isOnline ? t('status.online') : t('status.offline')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingQueueCount > 0 && (
                <button 
                  onClick={syncQueue}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all shadow-sm group active:scale-95"
                >
                  <Cloud size={16} className={isOnline ? "animate-pulse" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{pendingQueueCount} {t('nav.pending')}</span>
                </button>
              )}
              <LanguageToggle />
              <Link 
                to="/profile"
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm group"
                title="Profile"
              >
                <UserIcon size={18} className="group-hover:scale-110 transition-transform" />
              </Link>
              <button 
                onClick={() => {
                  useStore.getState().logout();
                  window.location.href = '/';
                }}
                className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm group"
                title={t('auth.logout')}
              >
                <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
        </header>
        <SyncStatusBar />
        <main className="flex-1 relative">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/allocation" element={<AllocationPlan />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/depots" element={<Depots />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/audit" element={<EquityAudit />} />
            <Route path="/profile" element={<Profile />} />
            {/* If inside layout but no route matches, go to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/?auth=required" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Use /* to allow MainLayout to handle all sub-routes like /dashboard, /allocation, etc. */}
        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
