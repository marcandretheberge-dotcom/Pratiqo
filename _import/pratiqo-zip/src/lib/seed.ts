import { db } from './firebase';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { TEACHERS } from '../constants';

export async function seedTeachers() {
  for (const teacher of TEACHERS) {
    try {
      const teacherRef = doc(db, 'teachers', teacher.id);
      const snap = await getDoc(teacherRef);
      
      if (!snap.exists()) {
        await setDoc(teacherRef, teacher);
        
        // Also create a user profile for the teacher to allow messages
        const userRef = doc(db, 'users', teacher.id);
        await setDoc(userRef, {
          id: teacher.id,
          name: teacher.name,
          email: `${teacher.name.toLowerCase().replace(' ', '.')}@example.com`,
          role: 'teacher',
          photoUrl: teacher.imageUrl
        });
      }
    } catch (e) {
      console.error("Error seeding teacher", teacher.id, e);
    }
  }
}

export async function seedStudentProgress(userId: string) {
  try {
    const q = query(collection(db, 'student_progress'), where('studentId', '==', userId));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      const demoProgress = [
        {
          studentId: userId,
          teacherId: 't1',
          subject: 'Piano',
          score: 85,
          notes: "Excellent travail sur la sonate de Mozart. La fluidité s'améliore nettement.",
          date: serverTimestamp(),
          achievements: ["Lecture fluide", "Rythme maîtrisé"]
        },
        {
          studentId: userId,
          teacherId: 't2',
          subject: 'Karaté',
          score: 45,
          notes: "Bon début pour la ceinture jaune. Concentre-toi sur la posture de base.",
          date: serverTimestamp(),
          achievements: ["Endurance", "Kata initial"]
        }
      ];

      for (const p of demoProgress) {
        await addDoc(collection(db, 'student_progress'), p);
      }
    }
  } catch (e) {
    console.error("Error seeding progress", e);
  }
}
