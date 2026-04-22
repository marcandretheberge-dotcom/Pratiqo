import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Trophy, CreditCard, ChevronRight, BookOpen, TrendingUp, Wallet, MapPin, Loader2, Calendar, Star, Award, ShieldCheck, Target, Zap, LayoutDashboard, Settings, UserCircle, Users, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, Timestamp, setDoc } from 'firebase/firestore';
import { StudentProfile, ProgressData, Teacher } from '../types';
import { AssignmentHub } from './AssignmentHub';
import { TeacherAgenda } from './TeacherAgenda';

const PROGRESS_DATA = [
  { day: 'Lun', score: 65 },
  { day: 'Mar', score: 68 },
  { day: 'Mer', score: 75 },
  { day: 'Jeu', score: 72 },
  { day: 'Ven', score: 85 },
  { day: 'Sam', score: 90 },
  { day: 'Dim', score: 92 },
];

interface BookingWithTeacher {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  status: string;
  studentLevel?: string;
  teachingMode?: string;
}

export function Dashboard({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingWithTeacher[]>([]);
  const [teacherBookings, setTeacherBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'student' | 'teacher'>('student');
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch/Initialize Student Profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists() && docSnap.data().streak !== undefined) {
        setProfile(docSnap.data() as StudentProfile);
      } else {
        // Initialize minimal profile if missing
        const newProfile: StudentProfile = {
          id: user.uid,
          name: user.displayName || 'Utilisateur',
          email: user.email || '',
          activeSubscriptions: [],
          progress: {},
          badges: [
            { id: '1', icon: '🔥', name: 'Première Pratique', date: new Date().toISOString() }
          ],
          streak: 1,
          milestones: [
            { id: '1', title: 'Première session', completed: true },
            { id: '2', title: '5 leçons complétées', completed: false },
            { id: '3', title: 'Maître de discipline', completed: false },
            { id: '4', title: 'Série de 30 jours', completed: false },
          ]
        };
        await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
        setProfile(newProfile);
      }
    });

    // Check if Teacher
    const unsubTeacher = onSnapshot(doc(db, 'teachers', user.uid), (docSnap) => {
      setIsTeacher(docSnap.exists());
    });

    // Fetch Bookings
    const qBookings = query(
      collection(db, 'bookings'),
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubBookings = onSnapshot(qBookings, async (snapshot) => {
      const bookingList: BookingWithTeacher[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        const teacherSnap = await getDoc(doc(db, 'teachers', data.teacherId));
        const teacherData = teacherSnap.data();

        bookingList.push({
          id: d.id,
          teacherId: data.teacherId,
          teacherName: teacherData?.name || 'Professeur',
          date: data.date,
          time: data.time,
          status: data.status,
          studentLevel: data.studentLevel,
          teachingMode: data.teachingMode,
        });
      }
      setBookings(bookingList);
    }, (error) => handleFirestoreError(error, 'list', '/bookings'));

    // Fetch Teacher side bookings
    const qTBookings = query(
      collection(db, 'bookings'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubTBookings = onSnapshot(qTBookings, async (snapshot) => {
      const list = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        const studentSnap = await getDoc(doc(db, 'users', data.studentId));
        const studentData = studentSnap.data();
        list.push({ id: d.id, ...data, studentName: studentData?.name || 'Élève' });
      }
      setTeacherBookings(list);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubBookings();
      unsubTeacher();
      unsubTBookings();
    };
  }, [user]);

  if (!user || loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center p-12 text-center">
        <Loader2 size={48} className="text-brand-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Initialisation de votre univers...</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Strategic Header & Mode Switcher */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de Bord</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-sm text-slate-500 font-medium capitalize">{viewMode === 'student' ? 'Espace Élève' : 'Espace Professionnel'}</span>
             <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
             <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">Niveau 12</span>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
           <button 
             onClick={() => setViewMode('student')}
             className={cn(
               "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
               viewMode === 'student' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
             )}
           >
             Apprendre
           </button>
           {isTeacher && (
             <button 
               onClick={() => setViewMode('teacher')}
               className={cn(
                 "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                 viewMode === 'teacher' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
               )}
             >
               Gérer
             </button>
           )}
        </div>
      </section>

      {viewMode === 'student' ? (
        <StudentView profile={profile} bookings={bookings} onNavigate={onNavigate} />
      ) : (
        <TeacherView teacherBookings={teacherBookings} onNavigate={onNavigate} />
      )}
    </div>
  );
}

function StudentView({ profile, bookings, onNavigate }: { profile: StudentProfile | null; bookings: BookingWithTeacher[]; onNavigate: (tab: any) => void }) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column: Progress Hub (Pillar 3) */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-6 rounded-3xl text-white shadow-xl shadow-orange-100 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2">
                    <Flame size={24} className="animate-pulse" />
                    <span className="text-3xl font-bold">{profile?.streak || 1}</span>
                 </div>
                 <div>
                    <h4 className="font-bold text-lg leading-tight">Série de jours</h4>
                    <p className="text-xs opacity-80 font-medium">Continuez comme ça !</p>
                 </div>
              </div>
              <Flame size={120} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform duration-700" />
           </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden relative group">
              <div className="flex justify-between items-start">
                 <div>
                    <h4 className="font-bold text-slate-900 mb-1">XP Total</h4>
                    <p className="text-3xl font-bold text-brand-primary">4,520</p>
                 </div>
                 <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-brand-primary">
                    <Zap size={24} fill="currentColor" />
                 </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Niveau 13</span>
                 <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">480 XP restants</span>
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-brand-primary w-2/3"></div>
           </div>
        </div>

        <AssignmentHub mode="student" />

        {/* Milestone Path (Duolingo Style) */}
        <section className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 space-y-8">
           <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Votre Chemin de Maîtrise</h3>
              <p className="text-xs text-slate-500 font-medium">Complétez les défis pour débloquer de nouveaux badges</p>
           </div>

           <div className="flex flex-col items-center gap-12 py-8 relative">
              {/* Connector Line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-slate-200 rounded-full" />
              
              {profile?.milestones.map((m, idx) => (
                 <motion.div 
                   key={m.id}
                   whileHover={{ scale: 1.05 }}
                   className="relative z-10"
                 >
                    <div className={cn(
                      "w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl transition-all",
                      m.completed 
                        ? "bg-brand-primary border-brand-primary/20 text-white" 
                        : "bg-white border-slate-200 text-slate-300"
                    )}>
                       {m.completed ? <Award size={32} /> : <Target size={32} />}
                    </div>
                    
                    <div className={cn(
                       "absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-4 py-2 rounded-2xl border shadow-lg",
                       idx % 2 === 0 ? "left-24 mr-auto" : "right-24 ml-auto",
                       m.completed ? "bg-white border-brand-primary text-slate-900" : "bg-slate-50 border-slate-200 text-slate-400"
                    )}>
                       <p className="text-[10px] font-bold uppercase tracking-widest">{m.completed ? 'Terminé' : 'À débloquer'}</p>
                       <p className="text-sm font-bold">{m.title}</p>
                    </div>
                 </motion.div>
              ))}
           </div>
        </section>

      </div>

      {/* Right Column: Badges & Social (Pillar 3/6) */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
         {/* Badges Collection */}
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Collection de Badges</h3>
               <span className="text-[10px] font-bold text-brand-primary">{profile?.badges.length || 0} Acquis</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
               {profile?.badges.map(badge => (
                  <div key={badge.id} className="group relative">
                     <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-100 group-hover:scale-110 transition-transform cursor-pointer">
                        {badge.icon}
                     </div>
                     <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-md transition-opacity whitespace-nowrap z-50">
                        {badge.name}
                     </div>
                  </div>
               ))}
               {[...Array(2)].map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 border border-slate-100 border-dashed">
                     <Trophy size={20} />
                  </div>
               ))}
            </div>
         </div>

         {/* Upcoming Lessons (Professional side) */}
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
             <div className="flex items-center justify-between border-b border-slate-50 pb-4">
               <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Ma Semaine</h3>
               <Calendar size={14} className="text-slate-400" />
             </div>
             
             <div className="space-y-3">
                {bookings.length > 0 ? bookings.slice(0, 3).map(b => (
                   <div key={b.id} className="flex flex-col p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-primary transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                         <span className="text-[10px] font-bold text-slate-900">{b.teacherName}</span>
                         <span className="text-[9px] font-bold text-brand-primary uppercase tracking-tighter">{b.time}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(b.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}</p>
                   </div>
                )) : (
                   <div className="text-center py-8">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Aucune leçon prévue</p>
                       <button onClick={() => onNavigate('explore')} className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">Trouver un mentor</button>
                   </div>
                )}
             </div>
         </div>

         {/* Safety & Verification Card (Pillar 6) */}
         <div className="bg-teal-900 rounded-3xl p-6 text-white space-y-4">
            <ShieldCheck size={32} className="text-teal-400" />
            <h4 className="font-bold text-lg leading-tight">Votre sécurité est notre priorité</h4>
            <p className="text-xs opacity-80 leading-relaxed">Tous nos professeurs sont vérifiés et les paiements sont sécurisés par Stripe.</p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all">En savoir plus</button>
         </div>
      </div>
    </div>
  );
}

function TeacherView({ teacherBookings, onNavigate }: { teacherBookings: any[]; onNavigate: (tab: any) => void }) {
  // Derive students from teacherBookings
  const uniqueStudents = Array.from(new Map(teacherBookings.map(b => [b.studentId, b])).values());

  return (
    <div className="grid grid-cols-12 gap-6">
       {/* Detailed Stats (Pillar 2) */}
       <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <StatMini icon={<Wallet size={16} />} label="Revenus" value="$1,240" sub="+12% vs mois dernier" />
             <StatMini icon={<Users size={16} />} label="Élèves Actifs" value={uniqueStudents.length.toString()} sub="2 nouveaux profils" />
             <StatMini icon={<Star size={16} />} label="Note Moy." value="4.9" sub="24 avis vérifiés" />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Activité Mensuelle</h3>
                <div className="flex gap-2">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <div className="w-2 h-2 bg-brand-primary rounded-full"></div> Revenus
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full"></div> Nouveaux Élèves
                   </div>
                </div>
             </div>
             <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={PROGRESS_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#1D9E75" strokeWidth={3} fillOpacity={0.1} fill="#1D9E75" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <TeacherAgenda bookings={teacherBookings} />

          <AssignmentHub mode="teacher" />

          {/* Student Management (Pillar 2) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Élèves sous supervision</h3>
                <span className="text-[10px] font-bold text-slate-400 capitalize">{uniqueStudents.length} actifs</span>
             </div>
             <div className="divide-y divide-slate-50">
                {uniqueStudents.length > 0 ? uniqueStudents.map((s, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand-primary group-hover:bg-teal-50 transition-all">
                           <UserCircle size={20} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-slate-900">{s.studentName}</p>
                           <p className="text-[10px] text-slate-400 font-medium">Niveau: {s.studentLevel || 'Débutant'} • {s.time}</p>
                        </div>
                     </div>
                     <div className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border bg-teal-50 text-teal-600 border-teal-100"
                     )}>
                        À jour
                     </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
                    Aucun élève pour le moment.
                  </div>
                )}
             </div>
          </div>
       </div>

       {/* Sidebar Teacher Hub (Pillar 4) */}
       <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
             <div className="relative z-10 space-y-6">
                <div>
                   <h3 className="text-2xl font-bold leading-tight">Pro Plan</h3>
                   <p className="text-xs opacity-70 mt-2 leading-relaxed">Débloquez les paiements automatiques et le suivi élève illimité.</p>
                </div>
                <div className="text-3xl font-bold">$29<span className="text-sm font-normal opacity-60">/mois</span></div>
                <button className="w-full py-4 bg-brand-primary hover:bg-brand-secondary rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">S'abonner maintenant</button>
             </div>
             <Trophy size={140} className="absolute -bottom-8 -right-8 opacity-10" />
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
             <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest border-b border-slate-100 pb-3">Actions Pro</h3>
             <div className="grid grid-cols-2 gap-3">
                <ProAction icon={<Calendar size={18} />} label="Agenda" />
                <ProAction icon={<BookOpen size={18} />} label="Devoirs" />
                <ProAction icon={<CreditCard size={18} />} label="Factures" />
                <ProAction icon={<Settings size={18} />} label="Config." />
             </div>
          </div>

          {/* Review Stats (Pillar 6) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Confiance Client</h3>
                <Star size={16} className="text-amber-400 fill-amber-400" />
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                   <span>Avis positifs</span>
                   <span>98%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-brand-primary w-[98%]"></div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">"Vos avis sont vérifiés pour garantir une marketplace saine et transparente."</p>
             </div>
          </div>
       </div>
    </div>
  );
}

function StatMini({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
   return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
         <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="text-slate-300">{icon}</div>
         </div>
         <p className="text-2xl font-bold text-slate-900">{value}</p>
         <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">{sub}</p>
      </div>
   );
}

function ProAction({ icon, label }: { icon: React.ReactNode; label: string }) {
   return (
      <button className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-primary hover:bg-teal-50 transition-all gap-2 group">
         <div className="text-slate-400 group-hover:text-brand-primary transition-colors">{icon}</div>
         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </button>
   );
}
