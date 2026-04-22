import React, { useState } from 'react';
import { Clock, Calendar, CheckCircle2, ChevronRight, CreditCard, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Teacher } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { notificationService } from '../services/notificationService';

interface BookingModalProps {
  teacher: Teacher;
  onClose: () => void;
}

export function BookingModal({ teacher, onClose }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'info' | 'preferences' | 'calendar' | 'slots' | 'success'>('info');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [preferredMode, setPreferredMode] = useState<'online' | 'person'>(teacher.teachingMode === 'both' ? 'person' : (teacher.teachingMode as any));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = ['Lun 20', 'Mar 21', 'Mer 22', 'Jeu 23', 'Ven 24', 'Sam 25'];
  const times = ['09:00', '10:30', '14:00', '15:30', '17:00', '18:30'];

  const handleConfirmBooking = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour réserver.");
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData = {
        teacherId: teacher.id,
        studentId: user.uid,
        date: selectedDate,
        time: selectedTime,
        studentLevel: selectedLevel,
        teachingMode: preferredMode,
        status: 'booked',
        price: teacher.pricePerLesson,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      
      // Notify teacher
      await notificationService.sendNotification({
        userId: teacher.id,
        title: 'Nouvelle réservation !',
        message: `${user.displayName || 'Un élève'} a réservé un cours pour le ${selectedDate} à ${selectedTime}.`,
        type: 'booking'
      });

      setStep('success');
    } catch (error) {
      console.error("Booking error", error);
      handleFirestoreError(error, 'create', '/bookings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName: teacher.name,
          amount: teacher.pricePerLesson,
          successUrl: window.location.origin + '?payment=success',
          cancelUrl: window.location.origin + '?payment=cancel',
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Une erreur est survenue lors de l'initialisation du paiement. Vérifiez que votre STRIPE_SECRET_KEY est configurée dans les variables d'environnement.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Impossible de contacter le service de paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden relative shadow-2xl z-10 border border-slate-200"
      >
        <div className="p-6 space-y-6">
          {step === 'info' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-left p-4 bg-slate-50 rounded-xl border border-slate-100">
                <img src={teacher.imageUrl} className="w-14 h-14 rounded-lg object-cover border border-white shadow-sm" alt="" referrerPolicy="no-referrer" />
                <div className="text-left min-w-0">
                  <h2 className="text-lg font-bold text-slate-800 truncate">Cours d'essai avec {teacher.name.split(' ')[0]}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{teacher.discipline}</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-500 font-medium">
                  Le cours d'essai dure 45 minutes. C'est le moment idéal pour discuter de votre parcours et fixer vos premiers objectifs.
                </p>
                <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                   <div className="flex items-center gap-2">
                      <Clock size={14} className="text-indigo-500" />
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Durée : 45 min</span>
                   </div>
                   <span className="text-lg font-bold text-indigo-600">{teacher.pricePerLesson}€</span>
                </div>
              </div>
              <button 
                onClick={() => setStep('preferences')}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] hover:bg-slate-800"
              >
                Commencer
              </button>
            </div>
          )}

          {step === 'preferences' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Étape 1 : Vos Besoins</h2>
                <div className="w-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-brand-primary w-1/3"></div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Votre niveau actuel</p>
                    <div className="grid grid-cols-2 gap-2">
                       {teacher.levels.map(level => (
                          <button
                            key={level}
                            onClick={() => setSelectedLevel(level)}
                            className={cn(
                               "px-4 py-3 rounded-xl border text-left transition-all",
                               selectedLevel === level ? "border-brand-primary bg-teal-50 text-brand-primary shadow-sm" : "border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                             <p className="text-[10px] font-bold uppercase tracking-tighter leading-none mb-1 opacity-60">Niveau</p>
                             <p className="text-xs font-bold truncate">{level}</p>
                          </button>
                       ))}
                    </div>
                 </div>

                 {teacher.teachingMode === 'both' && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lieu du cours</p>
                       <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPreferredMode('person')}
                            className={cn(
                               "px-4 py-3 rounded-xl border text-left transition-all",
                               preferredMode === 'person' ? "border-brand-primary bg-teal-50 text-brand-primary shadow-sm" : "border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                             <p className="text-xs font-bold">À domicile</p>
                          </button>
                          <button
                            onClick={() => setPreferredMode('online')}
                            className={cn(
                               "px-4 py-3 rounded-xl border text-left transition-all",
                               preferredMode === 'online' ? "border-brand-primary bg-teal-50 text-brand-primary shadow-sm" : "border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                             <p className="text-xs font-bold">En ligne (Vidéo)</p>
                          </button>
                       </div>
                    </div>
                 )}
              </div>

              <button 
                disabled={!selectedLevel}
                onClick={() => setStep('calendar')}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-40"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 'calendar' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Étape 2 : Date</h2>
                <div className="text-[10px] font-bold text-slate-400">AVRIL 2026</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 group",
                      selectedDate === day ? "border-indigo-600 bg-indigo-600 text-white shadow-md" : "border-slate-100 bg-white hover:border-indigo-300"
                    )}
                  >
                    <span className={cn("text-[9px] font-bold uppercase tracking-widest", selectedDate === day ? "text-indigo-100" : "text-slate-400")}>{day.split(' ')[0]}</span>
                    <span className="text-sm font-bold">{day.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
              <button 
                disabled={!selectedDate}
                onClick={() => setStep('slots')}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 'slots' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <button onClick={() => setStep('calendar')} className="hover:text-indigo-600">Date</button>
                   <ChevronRight size={12} className="text-slate-300" />
                   <span>Heure</span>
                </h2>
                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{selectedDate} Avril</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "p-3 rounded-xl border text-sm font-bold transition-all",
                      selectedTime === time ? "border-indigo-600 bg-indigo-600 text-white shadow-md" : "border-slate-100 bg-white hover:border-indigo-300 text-slate-700"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <button 
                disabled={!selectedTime || isSubmitting}
                onClick={handleConfirmBooking}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-40 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Confirmer la réservation"
                )}
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Réservation confirmée !</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Votre rendez-vous avec {teacher.name} est enregistré.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-indigo-600">
                   <Calendar size={18} />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-800">{teacher.name}</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedDate} à {selectedTime}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePayment}
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><CreditCard size={18} /> Payer maintenant</>}
                </button>
                <button 
                  onClick={onClose}
                  className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Terminer
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
