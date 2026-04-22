import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Star, MapPin, Video, Users, ShieldCheck, 
  BookOpen, Globe, Award, MessageSquare, 
  Clock, Calendar, ChevronRight, CheckCircle2, CreditCard
} from 'lucide-react';
import { Teacher } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TeacherProfileProps {
  teacher: Teacher;
  onClose: () => void;
  onBook: () => void;
  onNavigate: (tab: any) => void;
}

export function TeacherProfile({ teacher, onClose, onBook, onNavigate }: TeacherProfileProps) {
  const { user } = useAuth();

  const handleStartChat = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour envoyer un message.");
      return;
    }

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
      onClose();
    } catch (error) {
      console.error("Chat error", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] overflow-hidden relative shadow-2xl z-10 border border-slate-200 flex flex-col"
      >
        {/* Header/Banner */}
        <div className="relative h-48 sm:h-64 flex-shrink-0">
           <img 
             src={teacher.imageUrl} 
             className="w-full h-full object-cover blur-3xl opacity-20" 
             alt="" 
             referrerPolicy="no-referrer" 
           />
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
           <button 
             onClick={onClose}
             className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 text-slate-500 hover:text-slate-800 transition-all z-20"
           >
              <X size={20} />
           </button>

           <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col sm:flex-row items-end gap-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl relative flex-shrink-0">
                 <img src={teacher.imageUrl} className="w-full h-full object-cover" alt={teacher.name} referrerPolicy="no-referrer" />
                 {teacher.isVerified && (
                    <div className="absolute top-2 left-2 bg-white rounded-lg p-1.5 shadow-md text-blue-500">
                       <ShieldCheck size={18} fill="currentColor" className="text-blue-50" />
                    </div>
                 )}
              </div>
              <div className="flex-1 space-y-2 pb-2">
                 <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full">{teacher.category}</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                       <Star size={16} fill="currentColor" />
                       <span className="text-sm">{teacher.rating}</span>
                       <span className="text-slate-400 font-medium text-xs">(24 avis)</span>
                    </div>
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 leading-tight">{teacher.name}</h2>
                 <p className="text-slate-500 font-medium flex items-center gap-2">
                    <MapPin size={16} className="text-brand-primary" />
                    {teacher.distance}km de vous • {teacher.teachingMode === 'both' ? 'Hybride' : teacher.teachingMode === 'online' ? 'En ligne' : 'Présentiel'}
                 </p>
              </div>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
           {/* Quick Stats Grid */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickStat icon={<Clock className="text-indigo-500" />} label="Cours d'essai" value="45 min" />
              <QuickStat icon={<Globe className="text-emerald-500" />} label="Langues" value={teacher.languages.join(', ')} />
              <QuickStat icon={<Users className="text-rose-500" />} label="Niveaux" value={teacher.levels.length > 2 ? 'Tous niveaux' : teacher.levels[0]} />
              <QuickStat icon={<CreditCard className="text-teal-500" />} label="Tarif" value={`$${teacher.pricePerLesson}`} />
           </div>

           {/* About Section */}
           <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">À propos</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                 {teacher.name} est un(e) expert(e) passionné(e) par {teacher.discipline.toLowerCase()}. Avec plus de 8 ans d'expérience, sa méthode d'enseignement repose sur la pratique immédiate et l'adaptation aux objectifs spécifiques de chaque élève. Que vous soyez débutant ou que vous cherchiez à vous perfectionner, son accompagnement personnalisé vous aidera à progresser rapidement.
              </p>
           </div>

           {/* Syllabus / Focus Area */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">Spécialisations</h3>
                 <div className="flex flex-wrap gap-2">
                    {teacher.discipline.split(', ').map(d => (
                       <span key={d} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600">{d}</span>
                    ))}
                 </div>
              </div>
              <div className="space-y-4">
                 <h3 className="text-lg font-bold text-slate-900 border-l-4 border-brand-primary pl-4 uppercase tracking-wider text-sm">Ce que vous apprendrez</h3>
                 <ul className="space-y-2">
                    {['Bases fondamentales', 'Perfectionnement technique', 'Interprétation & Style', 'Confiance & Expression'].map(item => (
                       <li key={item} className="flex items-center gap-3 text-xs font-medium text-slate-600">
                          <CheckCircle2 size={14} className="text-teal-500" />
                          {item}
                       </li>
                    ))}
                 </ul>
              </div>
           </div>

           {/* Mode Selection Visualizer */}
           <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 space-y-1">
                 <h4 className="font-bold text-slate-900">Options de cours</h4>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pillar 1: Marketplace Hybride</p>
              </div>
              <div className="flex gap-4">
                 <div className={cn(
                   "flex flex-col items-center gap-2 p-4 rounded-2xl border bg-white transition-all",
                   (teacher.teachingMode === 'online' || teacher.teachingMode === 'both') ? "border-brand-primary text-brand-primary" : "opacity-30 border-slate-200"
                 )}>
                    <Video size={24} />
                    <span className="text-[10px] font-bold uppercase">En ligne</span>
                 </div>
                 <div className={cn(
                   "flex flex-col items-center gap-2 p-4 rounded-2xl border bg-white transition-all",
                   (teacher.teachingMode === 'person' || teacher.teachingMode === 'both') ? "border-brand-primary text-brand-primary" : "opacity-30 border-slate-200"
                 )}>
                    <Users size={24} />
                    <span className="text-[10px] font-bold uppercase">Présentiel</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Sticky Global Actions */}
        <div className="p-8 bg-white border-t border-slate-100 flex items-center gap-4 flex-shrink-0">
           <button 
             onClick={handleStartChat}
             className="p-4 bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-brand-primary rounded-2xl transition-all border border-transparent hover:border-teal-100"
           >
              <MessageSquare size={24} />
           </button>
           <button 
             onClick={onBook}
             className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
           >
              Réserver un cours d'essai
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </motion.div>
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
   return (
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
         <div className="flex items-center gap-2">
            {icon}
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
         </div>
         <p className="text-xs font-bold text-slate-900 truncate">{value}</p>
      </div>
   );
}
