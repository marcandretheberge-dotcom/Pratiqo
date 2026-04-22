import React from 'react';
import { Search, Map as MapIcon, LayoutDashboard, Bell, MessageSquare, Wallet, LogOut, LogIn, Compass, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { loginWithGoogle, logout } from '../lib/firebase';
import { Logo } from './Logo';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'explore' | 'map' | 'dashboard' | 'messages';
  setActiveTab: (tab: 'explore' | 'map' | 'dashboard' | 'messages') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  userLocation: { city: string; coords: string } | null;
}

export function Layout({ children, activeTab, setActiveTab, searchQuery, setSearchQuery, userLocation }: LayoutProps) {
  const { user, profile } = useAuth();

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 bg-[#0F172A] text-white flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800/50">
          <Logo variant="light" size="md" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarNavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
          />
          <SidebarNavButton 
            active={activeTab === 'explore'} 
            onClick={() => setActiveTab('explore')} 
            icon={<Search size={18} />} 
            label="Trouver un Professeur" 
          />
          <SidebarNavButton 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            icon={<MapIcon size={18} />} 
            label="Vue Carte" 
          />
          
          <div className="pt-6 pb-2 px-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connectivité</p>
          </div>
          
          <SidebarNavButton 
            active={activeTab === 'messages'} 
            onClick={() => setActiveTab('messages')} 
            icon={<MessageSquare size={18} />} 
            label="Messages" 
          />
          <SidebarNavButton 
            active={false} 
            onClick={() => {}} 
            icon={<Wallet size={18} />} 
            label="Paiements" 
          />
        </nav>

        <div className="p-4 border-t border-slate-800 bg-black/10">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-xl border border-slate-700" alt="" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{user.displayName}</p>
                <p className="text-xs text-teal-400 truncate capitalize font-medium">{profile?.role || 'Élève'}</p>
              </div>
              <button 
                onClick={() => logout()}
                className="text-slate-500 hover:text-white transition-colors"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-2 p-3 bg-[#1D9E75] hover:bg-[#15803D] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
            >
              <LogIn size={18} />
              <span>Se connecter</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'explore' && activeTab !== 'map') {
                    setActiveTab('explore');
                  }
                }}
                placeholder="Exploitez votre potentiel..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1D9E75] transition-all outline-none font-medium" 
              />
            </div>
          </div>
          
          {/* Mobile Brand */}
          <div className="md:hidden flex items-center">
            <Logo size="sm" showTagline={false} />
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-full">
               <MapPin size={12} className="text-brand-primary" />
               {userLocation?.city || 'Montréal, QC'}
            </div>
            
            {user && (
              <button className="md:hidden p-1 rounded-full border border-slate-200">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-full" alt="" referrerPolicy="no-referrer" />
              </button>
            )}

            <NotificationCenter />
            <button 
              onClick={() => setActiveTab('explore')}
              className="hidden sm:block px-6 py-2.5 bg-[#1D9E75] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-teal-100 transition-all active:scale-95"
            >
              Réserver
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#F8FAFC]">
          <div className="p-8 md:p-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center shrink-0">
          <MobileNavButton 
            active={activeTab === 'explore'} 
            onClick={() => setActiveTab('explore')}
            icon={<Search size={22} />}
          />
          <MobileNavButton 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')}
            icon={<MapIcon size={22} />}
          />
          <MobileNavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={22} />}
          />
          <MobileNavButton 
            active={activeTab === 'messages'} 
            onClick={() => setActiveTab('messages')}
            icon={<MessageSquare size={22} />}
          />
        </nav>
      </main>
    </div>
  );
}

function SidebarNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-sm font-semibold group",
        active 
          ? "bg-[#1D9E75] text-white shadow-lg shadow-teal-900/40" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn(
        "shrink-0 transition-colors",
        active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
      )}>
        {icon}
      </div>
      <span className="truncate tracking-tight">{label}</span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
      )}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3.5 transition-all rounded-2xl",
        active ? "text-[#1D9E75] bg-teal-50 shadow-inner" : "text-slate-400 hover:bg-slate-50"
      )}
    >
      {icon}
    </button>
  );
}
