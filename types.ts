export type Discipline =
  | "Musique"
  | "Arts Martiaux"
  | "Langues"
  | "Danse"
  | "Sports"
  | "Scolaire";

export type TeachingMode = "online" | "person" | "both";

export interface Teacher {
  id: string;
  /** Compte Supabase (auth) lié à la fiche professeur — messagerie, etc. */
  userId?: string | null;
  name: string;
  discipline: string;
  /** Disciplines secondaires (ordre = `created_at` sur `teacher_disciplines`, sans la première entrée). */
  additionalDisciplines?: { disciplineId: string; specialite: string }[];
  category: Discipline;
  rating: number;
  reviews: number;
  distance: number;
  pricePerLesson: number;
  monthlySubscription?: number;
  bio: string;
  imageUrl: string;
  availability: string[];
  location: {
    lat: number;
    lng: number;
    /** Quartier affiché avant réservation (plan Entreprise / carte progressive) */
    neighborhood?: string;
    /** Adresse complète après réservation confirmée */
    address?: string;
  };
  isVerified: boolean;
  teachingMode: TeachingMode;
  languages: string[];
  levels: string[];
  /** Cours à domicile (paramètres profil) */
  homeLessonEnabled?: boolean;
  homeLessonPrice?: number;
  homeLessonRadiusKm?: number;
  homeLessonMinDuration?: number;
  homeLessonRequiresConfirmation?: boolean;
  /** Si distance élève → prof &gt; 20 km, durée min 2 h */
  homeLessonForce2hOver20km?: boolean;
  /** Plan profil (profiles.plan), renseigné côté Explore via API — lecture seule marketplace */
  profilePlan?: string | null;
  /** Colonnes `teachers` — confiance progressive */
  verificationLevel?: number | null;
  identityVerified?: boolean;
  diplomaVerified?: boolean;
  phoneVerified?: boolean;
}

export interface ProgressData {
  date: string;
  score: number;
  milestone?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  activeSubscriptions: {
    teacherId: string;
    startDate: string;
    remainingLessons: number;
    price: number;
  }[];
  progress: Record<string, ProgressData[]>;
  badges: { id: string; icon: string; name: string; date: string }[];
  streak: number;
  milestones: { id: string; title: string; completed: boolean }[];
}

export interface Assignment {
  id: string;
  teacherId: string;
  studentId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "pending" | "submitted" | "reviewed";
  createdAt: string;
  feedback?: string;
}

export interface PratiqoNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "booking" | "message" | "assignment" | "system";
  read: boolean;
  createdAt: string;
  link?: string;
}

