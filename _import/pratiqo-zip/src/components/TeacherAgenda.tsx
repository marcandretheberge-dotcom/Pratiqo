import React, { useState } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, User, MapPin, Video, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface TeacherAgendaProps {
  bookings: any[];
}

export function TeacherAgenda({ bookings }: TeacherAgendaProps) {
  const [selectedDay, setSelectedDay] = useState(new Date().toDateString());
  
  // Format days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const filteredBookings = bookings.filter(b => {
    // Map existing mock dates like "Lun 20" to comparison logic
    // or use real dates if available. For now, we'll just show all bookings for the demo
    return true; 
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Agenda Professionnel</h3>
        <div className="flex items-center gap-2">
           <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-colors"><ChevronLeft size={16} /></button>
           <span className="text-xs font-bold text-slate-600">Avril 2026</span>
           <button className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="flex border-b border-slate-50">
        {weekDays.map((d, i) => (
          <button 
            key={i}
            onClick={() => setSelectedDay(d.toDateString())}
            className={cn(
              "flex-1 py-4 flex flex-col items-center gap-1 transition-all border-b-2",
              selectedDay === d.toDateString() 
                ? "border-brand-primary bg-teal-50/30" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <span className="text-[9px] font-bold uppercase">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
            <span className={cn("text-sm font-bold", selectedDay === d.toDateString() ? "text-brand-primary" : "text-slate-900")}>
              {d.getDate()}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
        {filteredBookings.length > 0 ? filteredBookings.map((b, idx) => (
          <motion.div 
            key={b.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex gap-4 group"
          >
            <div className="flex flex-col items-center gap-2">
               <span className="text-[10px] font-bold text-slate-400 tracking-tighter">{b.time}</span>
               <div className="w-px flex-1 bg-slate-100 group-last:bg-transparent" />
            </div>
            
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:border-brand-primary/30 hover:bg-white transition-all cursor-pointer">
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                        <User size={16} />
                     </div>
                     <span className="text-sm font-bold text-slate-900">{b.studentName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {b.teachingMode === 'online' ? <Video size={10} /> : <MapPin size={10} />}
                        {b.teachingMode === 'online' ? 'Ligne' : 'Présentiel'}
                     </div>
                     <div className="w-1 h-1 bg-slate-200 rounded-full" />
                     <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                        {b.studentLevel || 'Standard'}
                     </div>
                  </div>
               </div>
               
               <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                    b.status === 'booked' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    {b.status === 'booked' ? 'À venir' : 'Payé'}
                  </span>
                  <button className="text-slate-300 hover:text-brand-primary transition-colors">
                     <CheckCircle2 size={18} />
                  </button>
               </div>
            </div>
          </motion.div>
        )) : (
          <div className="py-12 text-center">
             <Calendar size={32} className="mx-auto text-slate-100 mb-2" />
             <p className="text-xs text-slate-400 font-medium">Aucun cours prévu pour ce jour.</p>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">4 heures réservées cette semaine</span>
         <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">Voir l'agenda complet</button>
      </div>
    </div>
  );
}
