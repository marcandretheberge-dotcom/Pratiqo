/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Explore } from './components/Explore';
import { Dashboard } from './components/Dashboard';
import { MapView } from './components/MapView';
import { Messages } from './components/Messages';
import { BookingModal } from './components/BookingModal';
import { TeacherProfile } from './components/TeacherProfile';
import { AppTab, Teacher } from './types';
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { TEACHERS } from './constants';
import { db } from './lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [userLocation, setUserLocation] = useState<{ city: string; coords: string } | null>(null);

  useEffect(() => {
    // Seed initial data if empty
    const seedData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'teachers'));
        if (querySnapshot.empty) {
          const batch = writeBatch(db);
          TEACHERS.forEach((teacher) => {
            const teacherRef = doc(collection(db, 'teachers'), teacher.id);
            batch.set(teacherRef, teacher);
          });
          await batch.commit();
          console.log("Database seeded with initial teachers");
        }
      } catch (error) {
        console.error("Error seeding database:", error);
      }
    };
    seedData();
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ city: 'Détectée', coords: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`);
            const data = await res.json();
            if (data.city || data.locality) {
              setUserLocation({ city: data.city || data.locality, coords: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
            }
          } catch (e) {
            console.warn("Geocoding error", e);
          }
        },
        (error) => {
          console.warn("Geolocation blocked or error", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setNotification({ type: 'success', message: 'Paiement réussi ! Merci pour votre confiance.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
      setNotification({ type: 'error', message: 'Paiement annulé.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      searchQuery={searchQuery} 
      setSearchQuery={setSearchQuery}
      userLocation={userLocation}
    >
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[200]"
          >
            <div className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl border",
              notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
            )}>
              {notification.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              <span className="text-sm font-bold">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'explore' && (
        <Explore 
          onBook={setBookingTeacher} 
          onViewProfile={setSelectedTeacherProfile}
          onNavigate={setActiveTab} 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery} 
        />
      )}
      {activeTab === 'map' && (
        <MapView 
          onBook={setBookingTeacher} 
          onNavigate={setActiveTab} 
          searchQuery={searchQuery} 
          userLocation={userLocation}
        />
      )}
      {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
      {activeTab === 'messages' && <Messages />}

      <AnimatePresence>
        {selectedTeacherProfile && (
          <TeacherProfile
            teacher={selectedTeacherProfile}
            onClose={() => setSelectedTeacherProfile(null)}
            onBook={() => {
              setBookingTeacher(selectedTeacherProfile);
              setSelectedTeacherProfile(null);
            }}
            onNavigate={setActiveTab}
          />
        )}
        {bookingTeacher && (
          <BookingModal 
            teacher={bookingTeacher} 
            onClose={() => setBookingTeacher(null)} 
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}
