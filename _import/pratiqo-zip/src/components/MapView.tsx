import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Navigation, Star, ChevronRight, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher } from '../types';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  styles: [
    {
      "featureType": "all",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#7c9bAD" }]
    },
    {
      "featureType": "all",
      "elementType": "labels.text.stroke",
      "stylers": [{ "visibility": "on" }, { "color": "#ffffff" }, { "lightness": 16 }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#fefefe" }, { "lightness": 20 }]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }]
    }
  ]
};

const DEFAULT_CENTER = { lat: 45.5017, lng: -73.5673 }; // Montréal

export function MapView({ 
  onBook, 
  onNavigate, 
  searchQuery,
  userLocation
}: { 
  onBook: (teacher: Teacher) => void, 
  onNavigate: (tab: any) => void,
  searchQuery: string,
  userLocation: { city: string; coords: string } | null
}) {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || ''
  });

  const center = useMemo(() => {
    if (userLocation?.coords) {
      const [lat, lng] = userLocation.coords.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return DEFAULT_CENTER;
  }, [userLocation]);

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

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.discipline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = async (teacher: Teacher) => {
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

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!apiKey) {
    return (
      <div className="h-[calc(100vh-180px)] rounded-3xl flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Clé API Google Maps manquante</h3>
        <p className="text-slate-500 max-w-sm mb-6">
          Pour activer la vue carte réelle, veuillez configurer votre <strong>VITE_GOOGLE_MAPS_API_KEY</strong> dans les paramètres du projet.
        </p>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-xs">
          VITE_GOOGLE_MAPS_API_KEY=votre_cle_ici
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-[calc(100vh-180px)] rounded-3xl flex items-center justify-center bg-rose-50 p-12 text-center">
        <p className="text-rose-600 font-bold">Erreur lors du chargement de Google Maps.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] relative rounded-3xl overflow-hidden border border-slate-200">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={MAP_OPTIONS}
        >
          {filteredTeachers.map((teacher) => (
            <Marker
              key={teacher.id}
              position={teacher.location || center}
              onClick={() => setSelectedTeacher(teacher)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: teacher.id === selectedTeacher?.id ? '#1D9E75' : '#ffffff',
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: '#1D9E75',
                scale: 12,
              }}
            />
          ))}

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={center}
              options={{
                zIndex: 100,
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: '#ffffff',
                scale: 8,
              }}
            />
          )}
        </GoogleMap>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-brand-primary" />
        </div>
      )}

      {/* Neighbor Map Badge */}
      <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl p-4 rounded-2xl flex items-center gap-4 z-10">
         <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
            <MapPin size={20} />
         </div>
         <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Zone Active</p>
            <p className="text-sm font-bold text-slate-900 leading-none">{userLocation?.city || 'Montréal, QC'}</p>
         </div>
      </div>

      {/* Floating Info Overlay */}
      <AnimatePresence>
        {selectedTeacher && (
          <motion.div 
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            className="absolute top-6 right-6 bottom-6 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-start gap-4 bg-slate-50/30">
               <img src={selectedTeacher.imageUrl} className="w-16 h-16 rounded-2xl border border-white shadow-md object-cover" alt="" referrerPolicy="no-referrer" />
               <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{selectedTeacher.name}</h3>
                  <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-1">{selectedTeacher.category}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-100">
                     <Star size={10} fill="currentColor" /> {selectedTeacher.rating}
                  </div>
               </div>
               <button onClick={() => setSelectedTeacher(null)} className="p-1 hover:bg-white rounded-xl transition-colors text-slate-300 hover:text-slate-600"><ChevronRight size={24} /></button>
            </div>
            
            <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
               <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Créneaux Disponibles</p>
                  <div className="flex flex-wrap gap-2">
                     {selectedTeacher.availability.map(slot => (
                        <span key={slot} className="text-[10px] bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-100 font-bold">{slot.split(' ')[0]}</span>
                     ))}
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-brand-primary">Tarif séance</p>
                  <p className="text-2xl font-bold text-slate-900">${selectedTeacher.pricePerLesson}<span className="text-xs text-slate-400 font-medium ml-1">/ h</span></p>
               </div>
               <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic text-slate-600 text-xs leading-relaxed">
                  "{selectedTeacher.bio}"
               </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 mt-auto flex flex-col gap-3">
               <button 
                 onClick={() => onBook(selectedTeacher)}
                 className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.15em] shadow-xl shadow-teal-100 hover:bg-brand-secondary transition-all flex items-center justify-center gap-3 active:scale-95"
               >
                  Réserver maintenant <ChevronRight size={16} />
               </button>
               <button 
                 onClick={() => handleStartChat(selectedTeacher)}
                 disabled={isStartingChat}
                 className="w-full bg-slate-50 text-slate-600 py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border border-slate-100"
               >
                  {isStartingChat ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                  Envoyer un message
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <button 
          onClick={() => map?.panTo(center)}
          className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:text-brand-primary hover:bg-slate-50 transition-all shadow-lg active:scale-95"
        >
          <Navigation size={20} />
        </button>
        <div className="h-px bg-slate-200 my-1 mx-2" />
        <button 
          onClick={() => map?.setZoom((map.getZoom() || 13) + 1)}
          className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:text-brand-primary hover:bg-slate-50 transition-all shadow-lg active:scale-95"
        >
          <span className="font-bold text-lg">+</span>
        </button>
        <button 
          onClick={() => map?.setZoom((map.getZoom() || 13) - 1)}
          className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:text-brand-primary hover:bg-slate-50 transition-all shadow-lg active:scale-95"
        >
          <span className="font-bold text-lg">-</span>
        </button>
      </div>
    </div>
  );
}
