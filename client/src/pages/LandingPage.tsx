import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Bot, WifiOff, ShieldCheck, Activity, Globe, HeartHandshake, Map, BarChart3, Database, Shield, Zap, UserPlus, LogIn, User as UserIcon, LogOut } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import AuthModal from '../components/AuthModal';
import { useStore } from '../store/useStore';

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useStore();
  const [scrollY, setScrollY] = useState(0);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean, mode: 'login' | 'signup', role: 'user' | 'admin' }>({
    isOpen: false,
    mode: 'login',
    role: 'user'
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('auth') === 'required' && !user) {
      setAuthModal({ isOpen: true, mode: 'login', role: 'user' });
      // Clean up URL
      navigate('/', { replace: true });
    }
  }, [location, user, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Bot className="w-8 h-8 text-blue-400" />,
      title: t('landing.f1_title'),
      description: t('landing.f1_desc')
    },
    {
      icon: <WifiOff className="w-8 h-8 text-indigo-400" />,
      title: t('landing.f2_title'),
      description: t('landing.f2_desc')
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
      title: t('landing.f3_title'),
      description: t('landing.f3_desc')
    },
    {
      icon: <Map className="w-8 h-8 text-amber-400" />,
      title: t('landing.f4_title'),
      description: t('landing.f4_desc')
    },
    {
      icon: <Zap className="w-8 h-8 text-rose-400" />,
      title: t('landing.f5_title'),
      description: t('landing.f5_desc')
    },
    {
      icon: <Database className="w-8 h-8 text-cyan-400" />,
      title: t('landing.f6_title'),
      description: t('landing.f6_desc')
    }
  ];

  return (
    <div className="min-h-screen bg-[#050B14] text-slate-50 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Animated Glowing Orbs Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[150px] mix-blend-screen animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/10 blur-[150px] mix-blend-screen"
          style={{ transform: `translateY(-${scrollY * 0.1}px)` }}
        />
        <div 
          className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-screen"
        />
      </div>

      {/* Header (Glassmorphism) */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-[#050B14]/80 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'} px-6 md:px-12 lg:px-24 flex items-center justify-between`}>
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo(0,0)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">{t('app.title')}</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:block">
            <LanguageToggle />
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:-translate-y-0.5"
              >
                Launch Your App
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link 
                to="/profile"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all group"
                title="Profile"
              >
                <UserIcon size={18} className="group-hover:scale-110 transition-transform" />
              </Link>
              <button 
                onClick={() => logout()}
                className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all group"
                title={t('auth.logout')}
              >
                <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setAuthModal({ isOpen: true, mode: 'login',role:"user" })}
                className="text-white font-bold text-sm hover:text-blue-400 transition-colors px-4 py-2"
              >
                {t('auth.login')}
              </button>
              <button 
                onClick={() => setAuthModal({ isOpen: true, mode: 'signup',role:"user" })}
                className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-2.5 rounded-full font-bold transition-all duration-300 backdrop-blur-md hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-0.5"
              >
                {t('auth.signup')}
                <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="pt-32 pb-16 relative z-10">
        {/* Hero Section */}
        <section className="px-6 py-12 md:py-24 lg:px-24 flex flex-col items-center text-center max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-8 animate-fade-in-up backdrop-blur-md hover:bg-blue-500/20 transition-colors cursor-default">
            <Globe className="w-4 h-4" />
            {t('landing.hero_tag')}
          </div>
          
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-blue-100 to-slate-500 mb-8 leading-[1.05] animate-fade-in-up animation-delay-100 pb-2">
            {t('landing.hero_title')}
          </h2>
          
          <p className="text-lg md:text-2xl text-slate-400 max-w-4xl mx-auto mb-12 animate-fade-in-up animation-delay-200 leading-relaxed font-light">
            {t('landing.hero_desc')}<strong className="text-white font-medium"> {t('landing.hero_desc_bold')}</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up animation-delay-300">
            {user ? (
              <Link 
                to="/dashboard"
                className="group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-5 rounded-full text-lg font-black shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 border border-blue-400/30 tracking-tight"
              >
                Go to Dashboard Page
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                  onClick={() => setAuthModal({ isOpen: true, mode: 'login', role: 'user' })}
                  className="group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-5 rounded-full text-lg font-black shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 border border-blue-400/30 tracking-tight"
                >
                  {t('auth.login')}
                  <LogIn className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </button>
                <button 
                  onClick={() => setAuthModal({ isOpen: true, mode: 'signup', role: 'user' })}
                  className="group flex items-center justify-center gap-3 bg-[#0A1220] hover:bg-[#111C30] text-white px-10 py-5 rounded-full text-lg font-black shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/10 tracking-tight"
                >
                  {t('auth.signup')}
                  <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform text-indigo-400" />
                </button>
                <Link 
                  to="/dashboard"
                  className="group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600 hover:to-indigo-600 text-blue-400 hover:text-white px-10 py-5 rounded-full text-lg font-black shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-blue-500/30 tracking-tight backdrop-blur-md"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Dashboard Preview / Mockup Illustration */}
        <section className="px-6 py-12 flex justify-center animate-fade-in-up animation-delay-300">
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl shadow-2xl shadow-blue-900/20 transform hover:-translate-y-2 transition-transform duration-700 hover:shadow-blue-500/20">
            <div className="rounded-xl overflow-hidden bg-[#0A1220] border border-white/5 aspect-[16/9] flex items-center justify-center relative">
              {/* Abstract Map UI representation */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-[#0A1220] to-[#0A1220]"></div>
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
              
              <div className="z-10 flex flex-col items-center opacity-50">
                <BarChart3 className="w-16 h-16 text-blue-400 mb-4" />
                <p className="text-blue-400 font-mono tracking-widest uppercase">{t('landing.system_initialized')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="px-6 py-24 md:px-12 lg:px-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-sm font-bold tracking-widest uppercase text-blue-500 mb-3">{t('landing.tech_subtitle')}</h2>
              <h3 className="text-4xl md:text-5xl font-black mb-6 text-white">{t('landing.tech_title')}</h3>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">{t('landing.tech_desc')}</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500 group backdrop-blur-md hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <h4 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-300 transition-colors">{feature.title}</h4>
                  <p className="text-slate-400 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Comprehensive Footer */}
      <footer className="relative z-10 px-6 py-16 md:px-12 lg:px-24 border-t border-white/10 bg-black/50 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-6 h-6 text-blue-500" />
              <span className="text-xl font-bold text-white tracking-tight">{t('app.title')}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 pr-4">
              {t('landing.footer_desc')}
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 cursor-pointer transition-colors"><Globe className="w-4 h-4"/></div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-indigo-500/20 hover:text-indigo-400 cursor-pointer transition-colors"><Shield className="w-4 h-4"/></div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">{t('landing.footer_platform')}</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_p1')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_p2')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_p3')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_p4')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{t('landing.footer_resources')}</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_r1')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_r2')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_r3')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_r4')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{t('landing.footer_initiative')}</h4>
            <ul className="space-y-4 text-slate-400 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_i1')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_i2')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_i3')}</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">{t('landing.footer_i4')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <HeartHandshake className="w-4 h-4 text-rose-500" />
            <span>{t('landing.footer_tagline')}</span>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} {t('landing.footer_copyright')}
          </p>
        </div>
      </footer>

      <AuthModal 
        isOpen={authModal.isOpen} 
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        initialMode={authModal.mode}
        initialRole={authModal.role}
      />
    </div>
  );
}
