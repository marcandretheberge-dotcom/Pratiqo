import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, Calendar, CheckCircle2, ChevronRight, MessageSquare, Loader2, CreditCard, ShieldCheck, Video, Users, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher, Discipline, TeachingMode } from '../types';
import { CATEGORIES } from '../constants';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthProvider';

export function Explore({ 
  onBook, 
  onViewProfile,
  onNavigate, 
  searchQuery, 
  onSearchChange 
}: { 
  onBook: (teacher: Teacher) => void, 
  onViewProfile: (teacher: Teacher) => void,
  onNavigate: (tab: any) => void,
  searchQuery: string,
  onSearchChange: (q: string) => void
}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Discipline | 'All'>('All');
  const [teachingMode, setTeachingMode] = useState<TeachingMode | 'all'>('all');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const teacherList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Teacher[];
      setTeachers(teacherList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', '/teachers');
    });

    return unsubscribe;
  }, []);

  const filteredTeachers = teachers.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.discipline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = teachingMode === 'all' || t.teachingMode === teachingMode || t.teachingMode === 'both';
    const matchesVerified = !onlyVerified || t.isVerified;
    
    return matchesCategory && matchesSearch && matchesMode && matchesVerified;
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Trouver un Professeur</h2>
          <p className="text-sm text-slate-500 font-medium">Découvrez le mentor idéal pour vos ambitions</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all",
              showFilters ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            <Filter size={14} /> Filtres
          </button>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-brand-primary bg-teal-50 px-4 py-2 rounded-full border border-teal-100 uppercase tracking-[0.1em] leading-none">
            <CheckCircle2 size={12} />
            {filteredTeachers.length} disponibles
          </div>
        </div>
      </section>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode de cours</p>
                <div className="flex gap-2">
                  {(['all', 'online', 'person'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setTeachingMode(mode)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                        teachingMode === mode ? "bg-brand-primary border-brand-primary text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      {mode === 'all' ? 'Tous' : mode === 'online' ? 'Ligne' : 'Présentiel'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confiance & Sécurité</p>
                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                    onlyVerified ? "bg-white border-brand-primary text-brand-primary" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                  )}
                >
                  <span className="flex items-center gap-2"><ShieldCheck size={14} /> Profils Vérifiés</span>
                  {onlyVerified && <X size={12} />}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rayon d'action</p>
                <div className="h-2 bg-slate-200 rounded-full relative">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-brand-primary rounded-full"></div>
                  <div className="absolute -top-1.5 left-1/2 w-5 h-5 bg-white border-2 border-brand-primary rounded-full shadow-md"></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>0 km</span>
                  <span>50 km+</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Categories */}
      <section className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        <CategoryPill 
          label="Tous" 
          active={selectedCategory === 'All'} 
          onClick={() => setSelectedCategory('All')} 
        />
        {CATEGORIES.map(cat => (
          <CategoryPill 
            key={cat} 
            label={cat} 
            active={selectedCategory === cat} 
            onClick={() => setSelectedCategory(cat)} 
          />
        ))}
      </section>

      {/* Teacher List */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 min-h-[400px]">
        {loading ? (
           <div className="col-span-full flex items-center justify-center p-20">
             <Loader2 className="animate-spin text-brand-primary" size={32} />
           </div>
        ) : filteredTeachers.length === 0 ? (
           <div className="col-span-full text-center p-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun professeur trouvé</p>
              <button 
                onClick={() => {
                  setSelectedCategory('All');
                  setTeachingMode('all');
                  setOnlyVerified(false);
                  onSearchChange('');
                }}
                className="mt-4 text-brand-primary text-xs font-bold hover:underline"
              >
                Réinitialiser les filtres
              </button>
           </div>
        ) : (
          filteredTeachers.map((teacher, index) => (
            <TeacherCard 
              key={teacher.id} 
              teacher={teacher} 
              index={index} 
              onBook={() => onBook(teacher)}
              onViewProfile={() => onViewProfile(teacher)}
              onNavigate={onNavigate}
            />
          ))
        )}
      </section>

    </div>
  );
}

interface CategoryPillProps {
  key?: React.Key;
  label: string;
  active: boolean;
  onClick: () => void;
}

function CategoryPill({ label, active, onClick }: CategoryPillProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 rounded-2xl border transition-all whitespace-nowrap text-[10px] font-bold uppercase tracking-widest",
        active 
          ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-teal-100" 
          : "bg-white border-slate-200 text-slate-400 hover:border-brand-primary hover:text-brand-primary"
      )}
    >
      {label}
    </button>
  );
}

interface TeacherCardProps {
  key?: React.Key;
  teacher: Teacher;
  index: number;
  onBook: () => void;
  onViewProfile: () => void;
  onNavigate: (tab: any) => void;
}

function TeacherCard({ teacher, index, onBook, onViewProfile, onNavigate }: TeacherCardProps) {
  const { user } = useAuth();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert("Veuillez vous connecter pour envoyer un message.");
      return;
    }

    setIsStartingChat(true);
    try {
      const chatId = [user.uid, teacher.id].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participantIds: [user.uid, teacher.id],
          lastMessage: '',
          lastTimestamp: serverTimestamp()
        });
      }
      onNavigate('messages');
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onViewProfile}
      className="bg-white rounded-3xl overflow-hidden border border-slate-200 p-6 hover:border-brand-primary hover:shadow-2xl hover:shadow-teal-100/50 transition-all cursor-pointer flex gap-6 group relative"
    >
      <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-50 rounded-2xl flex-shrink-0 overflow-hidden border border-slate-100 relative">
        <img 
          src={teacher.imageUrl} 
          alt={teacher.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        {teacher.isVerified && (
          <div className="absolute top-1 left-1 bg-white rounded-lg p-1 shadow-md border border-slate-50 text-blue-500" title="Profil Vérifié">
            <ShieldCheck size={14} fill="currentColor" className="text-blue-50" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full border border-slate-100 shadow-sm transition-transform group-hover:scale-110">
          <Star size={10} className="text-amber-500 fill-amber-500" />
          <span className="font-bold text-slate-700">{teacher.rating}</span>
        </div>
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-brand-primary tracking-widest">
                {teacher.category}
              </span>
              {teacher.teachingMode === 'online' && <Video size={12} className="text-indigo-400" />}
              {teacher.teachingMode === 'person' && <Users size={12} className="text-emerald-400" />}
              {teacher.teachingMode === 'both' && <div className="flex gap-1"><Video size={10} className="text-indigo-300" /><Users size={10} className="text-emerald-300" /></div>}
            </div>
          </div>
          <h3 className="font-bold text-lg leading-tight text-slate-900 truncate group-hover:text-brand-primary transition-colors">
            {teacher.name}
          </h3>
          <p className="text-[12px] text-slate-500 font-medium -mt-1 leading-none">{teacher.discipline.split(',')[0]}</p>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
             <span className="flex items-center gap-1"><MapPin size={12} className="text-brand-primary" /> {teacher.distance}km</span>
             <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
             <span className="text-teal-600">Essai Offert</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
           <div className="text-lg font-bold text-brand-primary flex flex-col">
             <span>${teacher.pricePerLesson}<span className="text-[10px] text-slate-400 font-normal ml-0.5">/cours</span></span>
             <span className="text-[8px] text-slate-300 font-bold uppercase tracking-tighter -mt-1">{teacher.levels[0]}</span>
           </div>
           <div className="flex items-center gap-2">
             <button 
              onClick={handleStartChat}
              disabled={isStartingChat}
              className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-teal-50 rounded-2xl transition-all border border-transparent hover:border-teal-100"
              title="Envoyer un message"
             >
                <div className={cn(isStartingChat && "animate-spin")}>
                  <MessageSquare size={18} />
                </div>
             </button>
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onBook();
                }}
                className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all shadow-sm"
             >
                <ChevronRight size={18} />
             </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
