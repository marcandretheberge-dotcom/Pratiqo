import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, CheckCircle2, Circle, Clock, Loader2, Plus, Send, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { Teacher, StudentProfile, Assignment } from '../types';
import { cn } from '../lib/utils';
import { notificationService } from '../services/notificationService';

interface AssignmentHubProps {
  mode: 'student' | 'teacher';
}

export function AssignmentHub({ mode }: AssignmentHubProps) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  
  // Create form state
  const [newAssignment, setNewAssignment] = useState({
    studentId: '',
    title: '',
    description: '',
    dueDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'assignments'),
      where(mode === 'student' ? 'studentId' : 'teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Assignment[];
      setAssignments(list);
      setLoading(false);
    });

    if (mode === 'teacher') {
      // Fetch students who have booked this teacher
      const fetchStudents = async () => {
        const qBookings = query(collection(db, 'bookings'), where('teacherId', '==', user.uid));
        const bookingSnap = await getDocs(qBookings);
        const studentIds = Array.from(new Set(bookingSnap.docs.map(d => d.data().studentId)));
        
        const studentsList = [];
        for (const id of studentIds) {
          const userSnap = await doc(db, 'users', id);
          // Simplified: normally we'd get data, but let's just use the ID for now
          // or fetch properly
          studentsList.push({ id, name: `Élève ${id.slice(0, 4)}` });
        }
        setStudents(studentsList);
      };
      fetchStudents();
    }

    return unsubscribe;
  }, [user, mode]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAssignment.studentId || !newAssignment.title) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'assignments'), {
        teacherId: user.uid,
        studentId: newAssignment.studentId,
        title: newAssignment.title,
        description: newAssignment.description,
        dueDate: newAssignment.dueDate,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Notify student
      await notificationService.sendNotification({
        userId: newAssignment.studentId,
        title: 'Nouveau devoir !',
        message: `Votre professeur vous a assigné : ${newAssignment.title}`,
        type: 'assignment'
      });

      setShowCreate(false);
      setNewAssignment({ studentId: '', title: '', description: '', dueDate: '' });
    } catch (error) {
      console.error('Error creating assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Assignment['status']) => {
    try {
      await updateDoc(doc(db, 'assignments', id), { status });
      
      const assignment = assignments.find(a => a.id === id);
      if (assignment) {
        // Notify the other party
        const targetId = mode === 'student' ? assignment.teacherId : assignment.studentId;
        const msg = mode === 'student' 
          ? `Un élève a soumis son devoir : ${assignment.title}`
          : `Votre devoir "${assignment.title}" a été revu.`;

        await notificationService.sendNotification({
          userId: targetId,
          title: mode === 'student' ? 'Devoir soumis' : 'Devoir revu',
          message: msg,
          type: 'assignment'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Chargement des devoirs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-xl font-bold text-slate-900">Devoirs & Pratiques</h3>
           <p className="text-xs text-slate-500">Suivez vos objectifs et restez motivé</p>
        </div>
        {mode === 'teacher' && (
          <button 
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-secondary transition-all"
          >
            <Plus size={16} /> Assigné
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleCreateAssignment}
            className="bg-white border border-brand-primary/20 rounded-3xl p-6 space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Élève</label>
                  <select 
                    required
                    value={newAssignment.studentId}
                    onChange={e => setNewAssignment({...newAssignment, studentId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all"
                  >
                    <option value="">Sélectionner un élève</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Échéance</label>
                  <input 
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all"
                  />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Titre du devoir</label>
               <input 
                 required
                 placeholder="Ex: Gammes mineures, Chapitre 4..."
                 value={newAssignment.title}
                 onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase">Description / Instructions</label>
               <textarea 
                 rows={3}
                 placeholder="Détaillez les exercices à réaliser..."
                 value={newAssignment.description}
                 onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-primary transition-all resize-none"
               />
            </div>
            <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all">Annuler</button>
               <button 
                 disabled={isSubmitting}
                 className="bg-brand-primary text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
               >
                 {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Créer le devoir
               </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {assignments.length > 0 ? assignments.map((a, idx) => (
          <motion.div 
            key={a.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 rounded-3xl p-5 flex items-start gap-4 hover:shadow-lg transition-all group"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              a.status === 'pending' ? "bg-amber-50 text-amber-500" :
              a.status === 'submitted' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
            )}>
              {a.status === 'reviewed' ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900">{a.title}</h4>
                <div className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  a.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                  a.status === 'submitted' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                )}>
                  {a.status === 'pending' ? 'À faire' : a.status === 'submitted' ? 'Soumis' : 'Terminé'}
                </div>
              </div>
              
              <p className="text-xs text-slate-500 line-clamp-2">{a.description || 'Aucune instruction supplémentaire.'}</p>
              
              <div className="flex items-center gap-4 pt-2">
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <Calendar size={12} /> {a.dueDate ? `Échéance: ${a.dueDate}` : 'Pas d\'échéance'}
                 </div>
                 {a.status === 'pending' && mode === 'student' && (
                    <button 
                      onClick={() => handleUpdateStatus(a.id, 'submitted')}
                      className="ml-auto text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                    >
                      Marquer comme fait <ChevronRight size={10} />
                    </button>
                 )}
                 {a.status === 'submitted' && mode === 'teacher' && (
                    <button 
                      onClick={() => handleUpdateStatus(a.id, 'reviewed')}
                      className="ml-auto text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
                    >
                      Valider le devoir <ChevronRight size={10} />
                    </button>
                 )}
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
             <FileText size={48} className="mx-auto text-slate-100 mb-4" />
             <p className="text-slate-400 font-medium">Aucun devoir pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
