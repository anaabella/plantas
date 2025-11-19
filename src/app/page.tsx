'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Search, Sprout, Gift, DollarSign, Calendar as CalendarIcon, Trash2, Camera,
  Leaf, Flower2, Droplets, HeartCrack, X, Save,
  Sun, Home, BarChart3, Clock,
  History, Scissors, Bug, Beaker, Shovel, AlertCircle,
  ArrowRightLeft, RefreshCcw, Baby, Moon, SunDim, ListTodo, CheckCircle, Bot, LogIn, LogOut, Users, User, Heart, ArrowLeft, Info, Lightbulb, Thermometer, GalleryHorizontal, Carrot, Palmtree
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getPlantInfo, type PlantInfoOutput, diagnosePlant, type DiagnosePlantOutput } from '@/ai/flows/diagnose-plant-flow';
import { recommendCrops, type CropRecommenderOutput } from '@/ai/flows/vegetable-recommender-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy, where, arrayUnion } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
type PlantEvent = {
  id: string;
  type: string;
  date: string;
  note: string;
};

type PlantGalleryItem = {
  imageUrl: string;
  date: string;
};

type Plant = {
  id: string;
  name: string;
  image: string | null;
  acquisitionType: 'compra' | 'regalo' | 'intercambio' | 'robado';
  exchangeSource?: string;
  price?: string;
  date: string;
  status: 'viva' | 'fallecida' | 'intercambiada';
  exchangeDest?: string;
  startType: 'planta' | 'gajo' | 'raiz' | 'semilla';
  location: 'interior' | 'exterior';
  lastWatered: string;
  notes?: string;
  events: PlantEvent[];
  gallery?: PlantGalleryItem[];
  giftFrom?: string;
  stolenFrom?: string;
  lastPhotoUpdate?: string;
  createdAt: any;
  ownerId: string;
  ownerName?: string;
  ownerPhotoURL?: string;
};

type WishlistItem = {
  id: string;
  name: string;
  notes: string;
  image: string | null;
};

type UserProfileType = {
  uid: string;
  displayName?: string;
  photoURL?: string;
}

export default function PlantManagerFinal() {
  // --- Estados ---
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showPlantInfo, setShowPlantInfo] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showVeggieRecommender, setShowVeggieRecommender] = useState(false);
  const [selectedPlantInfo, setSelectedPlantInfo] = useState<Plant | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosePlantOutput | null>(null);
  const wishlistImageInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState('community'); // 'community' o 'mine'
  const [viewingProfile, setViewingProfile] = useState<UserProfileType | null>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);


  // --- Firebase ---
  const { firestore, auth } = useFirebase();
  const { user, isLoading: isLoadingUser } = useUser();
  const userId = user?.uid;

  useEffect(() => {
    if (!auth) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      getRedirectResult(auth)
        .catch((error) => {
          // Handle Errors here.
          if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-blocked') {
              console.error("Error with redirect result: ", error);
          }
        });
    }
  }, [auth]);

  const plantsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'plants');
  }, [firestore]);
  
  const plantsQuery = useMemoFirebase(() => {
    if (!plantsRef) return null;
    return query(plantsRef, orderBy('createdAt', 'desc'));
  }, [plantsRef]);
  
  const { data: plantsData, isLoading: isLoadingPlants } = useCollection<Plant>(plantsQuery);
  const plants = plantsData || [];


  const wishlistRef = useMemoFirebase(() => (userId && !isLoadingUser) ? collection(firestore, 'users', userId, 'wishlist') : null, [firestore, userId, isLoadingUser]);
  const wishlistQuery = useMemoFirebase(() => wishlistRef ? query(wishlistRef, orderBy('name')) : null, [wishlistRef]);
  const { data: wishlistData, isLoading: isLoadingWishlist } = useCollection<WishlistItem>(wishlistQuery);
  const wishlist = wishlistData || [];

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
      // The useUser hook will handle the user state update
    } catch (error: any) {
        if (error.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
        } else if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
            console.error("Error signing in with Google: ", error);
        }
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  
  const initialFormData: Omit<Plant, 'id' | 'createdAt' | 'ownerId' | 'ownerName' | 'ownerPhotoURL'> = {
    name: '',
    image: null,
    acquisitionType: 'compra',
    exchangeSource: '', 
    price: '',
    date: new Date().toISOString().split('T')[0],
    status: 'viva',
    exchangeDest: '',
    startType: 'planta',
    location: 'interior',
    lastWatered: new Date().toISOString().split('T')[0],
    notes: '',
    events: [],
    gallery: [],
    giftFrom: '',
    stolenFrom: '',
    lastPhotoUpdate: new Date().toISOString().split('T')[0],
  };

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<Plant>>(initialFormData);
  const [newWishlistItem, setNewWishlistItem] = useState<Omit<WishlistItem, 'id'>>({ name: '', notes: '', image: null });


  // --- Helpers ---
  const getWateringStatus = (lastWateredDate: string | undefined) => {
    if (!lastWateredDate) return { color: 'text-stone-400', text: 'Sin registro', days: 0 };
    const last = new Date(lastWateredDate);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 3) return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/50', days: diffDays };
    if (diffDays <= 7) return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/50', days: diffDays };
    return { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/50', days: diffDays };
  };

  const needsPhotoUpdate = (lastUpdate: string | undefined, acquisitionDate: string) => {
    if (!lastUpdate) return false;
    const last = new Date(lastUpdate);
    const now = new Date();
    
    // Check if acquisitionDate is a valid date string before creating a Date object
    if (!acquisitionDate || isNaN(new Date(acquisitionDate).getTime())) return false;
    const acqDate = new Date(acquisitionDate);
  
    // Don't ask for an update if the plant is less than 90 days old
    const ageInDays = (now.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 90) return false;
  
    const diffTime = now.getTime() - last.getTime();
    if (diffTime < 0) return false;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 90;
};

  const formatCurrency = (val: number | string | undefined) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(val) || 0);

  // --- Acciones ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resizeAndCompressImage = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
  
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Comprimir a JPEG con calidad 0.7
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (data: any) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      resizeAndCompressImage(file, (dataUrl) => {
        if(setter === setFormData) {
           setter((prev: any) => ({ ...prev, image: dataUrl, lastPhotoUpdate: new Date().toISOString().split('T')[0] }));
        } else {
           setter((prev: any) => ({ ...prev, image: dataUrl }));
        }
      });
    }
  };
  
  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !firestore || !formData.id) return;
    const file = e.target.files[0];
  
    resizeAndCompressImage(file, (dataUrl) => {
      const newGalleryItem: PlantGalleryItem = {
        imageUrl: dataUrl,
        date: new Date().toISOString(),
      };
  
      const plantDocRef = doc(firestore, 'plants', formData.id!);
      updateDocumentNonBlocking(plantDocRef, {
        gallery: arrayUnion(newGalleryItem),
        lastPhotoUpdate: new Date().toISOString().split('T')[0], // Also update the main photo update timestamp
        image: dataUrl // Also update the main image to the latest one
      });
  
      // Update local state to reflect the change immediately
      setFormData(prev => ({
        ...prev,
        gallery: [...(prev.gallery || []), newGalleryItem],
        image: dataUrl,
        lastPhotoUpdate: new Date().toISOString().split('T')[0]
      }));
    });
  };

  const savePlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userId) return;
    
    const plantsCollectionRef = collection(firestore, 'plants');

    if (formData.id) {
       const plantDocRef = doc(plantsCollectionRef, formData.id);
       const dataToUpdate = { ...formData };
       delete dataToUpdate.id; // Don't save id inside the document
       updateDocumentNonBlocking(plantDocRef, dataToUpdate);
    } else {
      const dataToSave = { 
        ...formData, 
        ownerId: userId,
        ownerName: user?.displayName,
        ownerPhotoURL: user?.photoURL,
        createdAt: serverTimestamp() 
      };
      addDocumentNonBlocking(plantsCollectionRef, dataToSave as Omit<Plant, 'id'>);
    }
    closeModal();
  };
  
  const addEvent = (type: string, note?: string) => {
    if (!formData.id || !firestore) return;
    const plantsCollectionRef = collection(firestore, 'plants');
  
    const eventToAdd = {
      type,
      note: note || `Evento de ${type} registrado.`,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0]
    };
  
    const updatedEvents = [eventToAdd, ...(formData.events || [])];
    const updatedFormData = { ...formData, events: updatedEvents };
  
    setFormData(updatedFormData);
    const plantDocRef = doc(plantsCollectionRef, formData.id);
    updateDocumentNonBlocking(plantDocRef, { events: updatedEvents });
  };
  
  const deleteEvent = (eventId: string) => {
    if (!formData.id || !firestore) return;
    const plantsCollectionRef = collection(firestore, 'plants');
  
    const updatedEvents = formData.events?.filter(ev => ev.id !== eventId);
    const updatedFormData = { ...formData, events: updatedEvents };
  
    setFormData(updatedFormData);
    const plantDocRef = doc(plantsCollectionRef, formData.id);
    updateDocumentNonBlocking(plantDocRef, { events: updatedEvents });
  };

  const handlePlantClick = (plant: Plant) => {
    if (plant.ownerId === userId) {
      openModal(plant);
    } else {
      setSelectedPlantInfo(plant);
      setShowPlantInfo(true);
    }
  };

  const openModal = (plant: Partial<Plant> | null = null) => {
    if (!userId) {
      alert("Por favor, inicia sesión para añadir o editar plantas.");
      return;
    }
    setDiagnosisResult(null);
    setActiveTab('details');
    if (plant) {
      setFormData({ ...plant, events: plant.events || [], gallery: plant.gallery || [] });
    } else {
      setFormData(initialFormData);
    }
    setShowModal(true);
  };
  
  const convertWishlistItemToPlant = (item: WishlistItem) => {
    if (!userId) {
      alert("Por favor, inicia sesión para realizar esta acción.");
      return;
    }
    setShowWishlist(false);
    const plantFromWishlist = {
      ...initialFormData,
      name: item.name,
      image: item.image,
      notes: item.notes,
    };
    setFormData(plantFromWishlist);
    setShowModal(true);
    // Optionally remove from wishlist
    if (item.id) deleteWishlistItem(item.id);
  };

  const closeModal = () => setShowModal(false);
  const deletePlant = (id: string) => { 
    if (window.confirm('¿Eliminar esta planta permanentemente?') && firestore) { 
      deleteDocumentNonBlocking(doc(collection(firestore, 'plants'), id));
      closeModal(); 
    }
  };
  
  // Wishlist Actions
  const addWishlistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWishlistItem.name.trim() && wishlistRef) {
      addDocumentNonBlocking(wishlistRef, newWishlistItem);
      setNewWishlistItem({ name: '', notes: '', image: null });
    }
  };

  const addPlantToWishlist = (plant: Plant) => {
    if (!wishlistRef) {
      alert("Por favor, inicia sesión para añadir a tu lista de deseos.");
      return;
    }
    const item = {
      name: plant.name,
      notes: `Visto en el jardín de ${plant.ownerName || 'alguien'}.`,
      image: plant.image,
    };
    addDocumentNonBlocking(wishlistRef, item);
     alert(`${plant.name} añadido a tu lista de deseos!`);
  };



  const deleteWishlistItem = (id: string) => {
    if (wishlistRef) {
        deleteDocumentNonBlocking(doc(wishlistRef, id));
    }
  };

  // AI Actions
  const handleDiagnosis = async () => {
    if (!formData.image) {
      alert('Por favor, sube una imagen de la planta primero.');
      return;
    }
    setIsDiagnosing(true);
    setDiagnosisResult(null);
    try {
      const result = await diagnosePlant({
        photoDataUri: formData.image,
        description: `El usuario quiere un diagnóstico para su planta llamada ${formData.name}. Notas adicionales: ${formData.notes || 'Ninguna'}.`
      });
      setDiagnosisResult(result);
    } catch (error) {
      console.error('Error al diagnosticar la planta:', error);
      alert('Ocurrió un error al intentar obtener el diagnóstico. Por favor, intenta de nuevo.');
    }
    setIsDiagnosing(false);
  };

  // Stats for the logged-in user
  const userPlants = useMemo(() => plants.filter(p => p.ownerId === userId), [plants, userId]);
  const stats = useMemo(() => ({
    spent: userPlants.filter(p => p.acquisitionType === 'compra').reduce((a, b) => a + parseFloat(b.price || '0'), 0),
    alive: userPlants.filter(p => p.status === 'viva').length,
    offspring: userPlants.reduce((acc, curr) => acc + (curr.events?.filter(e => e.type === 'hijito').length || 0), 0),
    total: userPlants.length
  }), [userPlants]);

  // --- Render ---
  const filteredPlants = useMemo(() => {
    let sourcePlants: Plant[];

    if (currentView === 'mine') {
        sourcePlants = plants.filter(p => p.ownerId === userId);
    } else {
        // Filter for community view: plants that don't belong to the current user and have an owner name.
        sourcePlants = plants.filter(p => p.ownerId !== userId && p.ownerName);
    }

    return sourcePlants.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        let matchFilter = true;
        if (filterStatus === 'viva') matchFilter = p.status === 'viva';
        if (filterStatus === 'fallecida') matchFilter = p.status === 'fallecida';
        if (filterStatus === 'intercambiada') matchFilter = p.status === 'intercambiada';
        return matchSearch && matchFilter;
    });
}, [plants, currentView, userId, searchTerm, filterStatus]);


  const PlantCard = ({ plant, view }: { plant: Plant, view: 'mine' | 'community' }) => {
    const w = getWateringStatus(plant.lastWatered);
    const photoUpdateNeeded = needsPhotoUpdate(plant.lastPhotoUpdate, plant.date);
    const isOwner = plant.ownerId === userId;

    const daysAlive = useMemo(() => {
        if (plant.status !== 'fallecida') return null;

        const deathEvent = plant.events?.find(e => e.type === 'fallecio');
        const acquisitionDate = new Date(plant.date);
        
        // Use death event date if available, otherwise use today as approximation if no death event found
        const deathDate = deathEvent ? new Date(deathEvent.date) : new Date();

        if (isNaN(acquisitionDate.getTime()) || isNaN(deathDate.getTime())) return null;

        const diffTime = Math.abs(deathDate.getTime() - acquisitionDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [plant.status, plant.date, plant.events]);
  
    const handleWishlistClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      addPlantToWishlist(plant);
    };
  
    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewingProfile({ uid: plant.ownerId, displayName: plant.ownerName, photoURL: plant.ownerPhotoURL });
    }
  
    return (
      <Card onClick={() => handlePlantClick(plant)} className={`overflow-hidden cursor-pointer hover:shadow-md transition-all group ${plant.status === 'fallecida' ? 'opacity-70' : ''} ${plant.status === 'intercambiada' ? 'opacity-90' : ''}`}>
         <div className="aspect-square relative bg-secondary overflow-hidden">
            {plant.image ? (
              <Image src={plant.image} alt={plant.name} fill className={`object-cover transition-transform group-hover:scale-105 ${plant.status === 'fallecida' ? 'grayscale' : ''}`} sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/50"><Leaf size={48}/></div>
            )}
            
            {view === 'mine' && (
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
                {plant.location === 'exterior' ? <Sun size={12} className="text-amber-500"/> : <Home size={12} className="text-blue-500"/>}
              </div>
            )}
  
            {photoUpdateNeeded && isOwner && plant.status === 'viva' && (
               <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={(e) => { e.stopPropagation(); openModal(plant); setActiveTab('gallery'); }} className="absolute bottom-2 left-2 bg-amber-500/90 text-white backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm animate-pulse">
                        <Camera size={12} />
                        <span>Actualizar Foto</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>¡Hace más de 90 días que no subes una foto! Añade una a la galería.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
  
            {view === 'community' && user && !isOwner && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={handleWishlistClick} variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 hover:bg-background/80 text-rose-500 hover:text-rose-600 rounded-full h-8 w-8">
                                <Heart />
                             </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Añadir a mi lista de deseos</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
  
            {plant.status === 'fallecida' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px]"><HeartCrack size={16} className="mr-2"/> EN MEMORIA</div>}
            {plant.status === 'intercambiada' && <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px] text-center px-4"><ArrowRightLeft size={16} className="mr-2"/> INTERCAMBIADA</div>}
         </div>
         
         <div className="p-3">
             <h3 className="font-bold truncate">{plant.name}</h3>
            {view === 'mine' ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {plant.status === 'viva' && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${w.bg} ${w.color}`}>
                           <Clock size={10}/> {w.days === 0 ? 'HOY' : `${w.days}d`}
                        </div>
                    )}
                     {plant.status === 'fallecida' && daysAlive !== null && (
                         <Badge variant="destructive">Vivió {daysAlive} días</Badge>
                     )}
                    <Badge variant="secondary" className="capitalize">{plant.startType}</Badge>
                    {plant.acquisitionType === 'compra' && <Badge variant="outline">{formatCurrency(plant.price)}</Badge>}
                    {plant.acquisitionType === 'regalo' && <Badge variant="outline" className="border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">De: {plant.giftFrom}</Badge>}
                    {plant.acquisitionType === 'intercambio' && <Badge variant="outline" className="border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400">Por: {plant.exchangeSource}</Badge>}
                    {plant.acquisitionType === 'robado' && <Badge variant="destructive" className="border-red-300 text-red-600 dark:border-red-700 dark:text-red-400">De: {plant.stolenFrom}</Badge>}
                </div>
            ) : (
              <button onClick={handleProfileClick} className="flex items-center gap-2 mt-1 group">
                  {plant.ownerPhotoURL && <Image src={plant.ownerPhotoURL} alt={plant.ownerName || 'dueño'} width={20} height={20} className="rounded-full" />}
                  <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">{plant.ownerName || 'Anónimo'}</p>
              </button>
            )}
         </div>
      </Card>
    );
  };

  if (isLoadingUser) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex items-center gap-2 text-primary">
                <Sprout className="animate-spin" size={32} />
                <p className="text-xl font-bold">Cargando tu jardín...</p>
            </div>
        </div>
    )
  }

  if (viewingProfile) {
    return <UserProfileView profile={viewingProfile} allPlants={plants} firestore={firestore} currentUserId={userId} onBack={() => setViewingProfile(null)} />;
  }


  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-primary">
              <Leaf className="fill-primary" size={24} />
              <h1 className="text-xl font-bold">Jardín Comunitario</h1>
            </div>
            <div className="flex gap-1 sm:gap-2 items-center">
              <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="ghost" size="icon">
                <SunDim className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              {user ? (
                <>
                  <Button onClick={() => setShowVeggieRecommender(true)} variant="ghost" size="icon"><Carrot size={20}/></Button>
                  <Button onClick={() => setShowCalendar(true)} variant="ghost" size="icon"><CalendarIcon size={20}/></Button>
                  <Button onClick={() => setShowWishlist(true)} variant="ghost" size="icon"><ListTodo size={20}/></Button>
                  <Button onClick={() => setShowStats(!showStats)} variant="ghost" size="icon" className={showStats ? 'bg-secondary' : ''}><BarChart3 size={20}/></Button>
                  <Button onClick={() => openModal()}><Plus size={18}/> <span className="hidden sm:inline">Planta</span></Button>
                  <Button onClick={handleSignOut} variant="outline"><LogOut size={18} /> <span className="hidden sm:inline">Salir</span></Button>
                  {user.photoURL && <Image src={user.photoURL} alt={user.displayName || 'user'} width={32} height={32} className="rounded-full" />}
                </>
              ) : (
                <Button onClick={handleGoogleSignIn}><LogIn size={18}/> <span className="hidden sm:inline">Entrar con Google</span></Button>
              )}
            </div>
          </div>
          
          {showStats && user && (
            <div className="mb-3 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
               <Card className="text-center">
                 <CardHeader className="p-2 pb-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Inversión</CardTitle></CardHeader>
                 <CardContent className="p-2 pt-0"><p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(stats.spent)}</p></CardContent>
               </Card>
               <Card className="text-center">
                 <CardHeader className="p-2 pb-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Hijos Dados</CardTitle></CardHeader>
                 <CardContent className="p-2 pt-0"><p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.offspring}</p></CardContent>
               </Card>
               <Card className="text-center">
                 <CardHeader className="p-2 pb-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Vivas</CardTitle></CardHeader>
                 <CardContent className="p-2 pt-0"><p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.alive}</p></CardContent>
               </Card>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
               <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-9"/>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-auto">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="all">Todas</SelectItem>
                 <SelectItem value="viva">🌱 Vivas</SelectItem>
                 <SelectItem value="intercambiada">🚫 Ya no la tengo</SelectItem>
                 <SelectItem value="fallecida">🥀 Memoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-center border-b mt-4">
            <button onClick={() => setCurrentView('community')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${currentView === 'community' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:bg-accent/50'}`}>
                <Users size={16} /> Jardín Comunitario
            </button>
            {user && (
                <button onClick={() => setCurrentView('mine')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${currentView === 'mine' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:bg-accent/50'}`}>
                    <User size={16} /> Mis Plantas
                </button>
            )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-4">
        {(isLoadingPlants && filteredPlants.length === 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({length: 10}).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                    <div className="aspect-square relative bg-secondary animate-pulse"></div>
                    <div className="p-3">
                        <div className="h-5 w-3/4 bg-secondary animate-pulse rounded-md"></div>
                        <div className="mt-2 h-4 w-1/2 bg-secondary animate-pulse rounded-md"></div>
                    </div>
                </Card>
            ))}
            </div>
        )}
        
        {(!isLoadingPlants && filteredPlants.length === 0) && (
            <div className="text-center py-20">
                <p className="text-muted-foreground">{currentView === 'mine' ? 'Aún no has añadido ninguna planta.' : 'Nadie en la comunidad ha añadido plantas aún.'}</p>
                 {currentView === 'mine' && user && (
                    <Button onClick={() => openModal()} className="mt-4"><Plus size={18}/> Añadir mi primera planta</Button>
                 )}
            </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPlants.map(plant => <PlantCard key={plant.id} plant={plant} view={currentView} />)}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b flex-row justify-between items-center">
            <DialogTitle>{formData.id ? formData.name : 'Nueva Planta'}</DialogTitle>
             <Button onClick={closeModal} variant="ghost" size="icon" className="rounded-full flex-shrink-0"><X size={20}/></Button>
          </DialogHeader>

          {formData.id && (
            <div className="flex border-b">
              <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'details' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Detalles</button>
              <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'gallery' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Galería <Badge variant="secondary">{formData.gallery?.length || 0}</Badge>
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Bitácora <Badge variant="secondary">{formData.events?.length || 0}</Badge>
              </button>
               <button onClick={() => setActiveTab('diagnosis')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'diagnosis' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <Bot size={16}/> Diagnóstico
              </button>
               <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'info' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <Info size={16}/> Info IA
              </button>
            </div>
          )}

          <div className="overflow-y-auto p-5 flex-1">
            {activeTab === 'details' && (
               <form onSubmit={savePlant} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="relative w-full sm:w-32 h-32 bg-secondary border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary">
                        {formData.image ? (
                          <>
                            <Image src={formData.image} alt="plant" fill className="object-cover" sizes="128px"/>
                            <Button type="button" onClick={() => setFormData({...formData, image: null})} variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6"><X size={12}/></Button>
                          </>
                        ) : (
                          <>
                            <Camera className="text-muted-foreground"/>
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setFormData)} className="absolute inset-0 opacity-0 cursor-pointer"/>
                          </>
                        )}
                     </div>
                     <div className="flex-1 space-y-2">
                        <Input required name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre de la planta" />
                        
                        <div className="grid grid-cols-2 gap-2">
                          {formData.id ? (
                            <Select name="status" value={formData.status} onValueChange={(v) => handleInputChange({target: {name: 'status', value: v}} as any)}>
                              <SelectTrigger className={formData.status === 'intercambiada' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:border-indigo-700 dark:text-indigo-400' : ''}>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="viva">🌱 Viva</SelectItem>
                                  <SelectItem value="intercambiada">🚫 Se fue toda</SelectItem>
                                  <SelectItem value="fallecida">🥀 Fallecida</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                             <Input value="🌱 Viva" disabled className="bg-muted"/>
                          )}
                           <Select name="location" value={formData.location} onValueChange={(v) => handleInputChange({target: {name: 'location', value: v}}as any)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="interior">🏠 Interior</SelectItem>
                                <SelectItem value="exterior">☀️ Exterior</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {formData.status === 'intercambiada' && (
                          <div className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/50 dark:text-indigo-400 p-2 rounded-md">
                             Solo usa esto si ya no tienes la planta. Si solo diste un gajo, déjala en "Viva" y anótalo en la Bitácora.
                          </div>
                        )}
                     </div>
                  </div>

                   <div>
                    <label className="text-sm font-medium text-muted-foreground">Origen</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <Select name="startType" value={formData.startType} onValueChange={(v) => handleInputChange({target: {name: 'startType', value: v}} as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="planta">Planta Completa</SelectItem>
                                <SelectItem value="gajo">Gajo / Esqueje</SelectItem>
                                <SelectItem value="raiz">Raíz / Bulbo</SelectItem>
                                <SelectItem value="semilla">Semilla</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select name="acquisitionType" value={formData.acquisitionType} onValueChange={(v) => handleInputChange({target: {name: 'acquisitionType', value: v}} as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="compra">Comprado</SelectItem>
                                <SelectItem value="regalo">Regalo</SelectItem>
                                <SelectItem value="intercambio">Intercambio</SelectItem>
                                <SelectItem value="robado">Robado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>

                  {formData.acquisitionType === 'compra' && <Input name="price" value={formData.price} onChange={handleInputChange} placeholder="Precio (ARS)" type="number" />}
                  {formData.acquisitionType === 'regalo' && <Input name="giftFrom" value={formData.giftFrom} onChange={handleInputChange} placeholder="Regalo de..." />}
                  {formData.acquisitionType === 'intercambio' && <Input name="exchangeSource" value={formData.exchangeSource} onChange={handleInputChange} placeholder="A cambio de..." />}
                  {formData.acquisitionType === 'robado' && <Input name="stolenFrom" value={formData.stolenFrom} onChange={handleInputChange} placeholder="Robado de..." />}

                  <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Notas generales sobre la planta..."/>

                  <DialogFooter>
                    {formData.id && <Button type="button" variant="destructive" onClick={() => deletePlant(formData.id!)}>Eliminar</Button>}
                    <Button type="submit">Guardar</Button>
                  </DialogFooter>
               </form>
            )}

            {activeTab === 'gallery' && (
              <div>
                <Button type="button" className="w-full mb-4" onClick={() => galleryImageInputRef.current?.click()}>
                  <Camera className="mr-2" /> Añadir Foto a la Galería
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={galleryImageInputRef}
                  className="hidden"
                  onChange={handleGalleryImageUpload}
                />
                
                {(!formData.gallery || formData.gallery.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Aún no hay fotos en la galería. ¡Sube la primera para empezar a documentar su crecimiento!
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {[...(formData.gallery || [])].reverse().map((item, index) => (
                    <div key={index} className="relative aspect-square group">
                      <Image src={item.imageUrl} alt={`Foto de ${formData.name}`} fill className="object-cover rounded-md" sizes="150px" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-1 rounded-b-md">
                        {new Date(item.date).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <TooltipProvider>
                  <div className="mb-6 p-3 bg-secondary rounded-lg">
                      <p className="text-sm font-medium text-center mb-3 text-muted-foreground">Registro Rápido de Eventos</p>
                      <div className="grid grid-cols-6 gap-2 text-center">
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full flex flex-col items-center justify-center gap-1" onClick={() => addEvent('poda', 'Poda realizada')}>
                                      <Scissors size={20} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Poda</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full flex flex-col items-center justify-center gap-1" onClick={() => addEvent('plaga', 'Tratamiento de plaga')}>
                                      <Bug size={20} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Plaga</p></TooltipContent>
                          </Tooltip>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full flex flex-col items-center justify-center gap-1" onClick={() => addEvent('transplante', 'Planta transplantada')}>
                                      <Shovel size={20} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Transplante</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full flex flex-col items-center justify-center gap-1" onClick={() => addEvent('hijito', 'Nuevo hijito separado')}>
                                      <Baby size={20} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Hijito</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full flex flex-col items-center justify-center gap-1" onClick={() => addEvent('florecio', 'La planta ha florecido')}>
                                      <Flower2 size={20} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Floreció</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-14 w-14 rounded-full flex flex-col items-center justify-center gap-1" onClick={() => addEvent('fertilizante', 'Se aplicó fertilizante')}>
                                      <Beaker size={20} />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Fertilizar</p></TooltipContent>
                          </Tooltip>
                      </div>
                  </div>
                </TooltipProvider>

                <div className="space-y-2">
                  {formData.events?.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No hay eventos registrados.</p>
                  )}
                  {formData.events?.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-2 border-b">
                      <div className="text-xs text-center text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('es-AR', {day:'numeric'})}<br/>
                          {new Date(event.date).toLocaleDateString('es-AR', {month:'short'})}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{event.type}</p>
                        <p className="text-sm text-muted-foreground">{event.note}</p>
                      </div>
                      <Button onClick={() => deleteEvent(event.id)} variant="ghost" size="icon" className="h-6 w-6"><Trash2 size={12}/></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
             {activeTab === 'diagnosis' && (
              <div className="text-center">
                {!formData.image && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Falta la foto</AlertTitle>
                    <AlertDescription>
                      Necesitas subir una foto de la planta en la pestaña "Detalles" para poder diagnosticarla.
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={handleDiagnosis} disabled={isDiagnosing || !formData.image} className="mb-4">
                  {isDiagnosing ? 'Analizando...' : 'Diagnosticar Planta'}
                </Button>

                {isDiagnosing && (
                    <div className="space-y-4 py-4">
                        <div className="h-4 bg-muted rounded w-1/4 mx-auto animate-pulse"></div>
                        <div className="h-24 bg-muted rounded-md animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-1/3 mx-auto animate-pulse"></div>
                        <div className="h-12 bg-muted rounded w-full animate-pulse"></div>
                    </div>
                )}
                
                {diagnosisResult && (
                  <div className="space-y-4 text-left p-4 bg-secondary rounded-lg animate-in fade-in-50">
                    <Alert variant={diagnosisResult.identification.isPlant ? 'default' : 'destructive'}>
                      <AlertTitle>Identificación</AlertTitle>
                      <AlertDescription>
                        {diagnosisResult.identification.isPlant 
                          ? `Creo que es una **${diagnosisResult.identification.commonName}** (*${diagnosisResult.identification.latinName}*).`
                          : "No parece ser una planta."}
                      </AlertDescription>
                    </Alert>

                     <Alert variant={diagnosisResult.diagnosis.isHealthy ? 'default' : 'destructive'}>
                        <AlertTitle>Diagnóstico de Salud</AlertTitle>
                        <AlertDescription>{diagnosisResult.diagnosis.diagnosis}</AlertDescription>
                    </Alert>

                     <Alert>
                        <AlertTitle>Recomendaciones</AlertTitle>
                        <AlertDescription>{diagnosisResult.diagnosis.recommendation}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'info' && (
              <PlantInfoTabContent plant={formData} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Wishlist Sheet */}
      <Dialog open={showWishlist} onOpenChange={setShowWishlist}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Mi Lista de Deseos</DialogTitle>
            </DialogHeader>
            <form onSubmit={addWishlistItem} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                    <Input value={newWishlistItem.name} onChange={(e) => setNewWishlistItem(p => ({...p, name: e.target.value}))} placeholder="Nombre de la planta deseada" required/>
                    <Textarea value={newWishlistItem.notes} onChange={(e) => setNewWishlistItem(p => ({...p, notes: e.target.value}))} placeholder="Notas (dónde la viste, precio, etc.)" rows={2}/>
                     <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" className="relative w-full">
                            <Camera size={16} className="mr-2"/>
                            Subir foto
                            <input type="file" accept="image/*" ref={wishlistImageInputRef} onChange={(e) => handleImageUpload(e, setNewWishlistItem)} className="absolute inset-0 opacity-0 cursor-pointer"/>
                        </Button>
                        {newWishlistItem.image && (
                            <Button type="button" size="sm" variant="destructive" onClick={() => setNewWishlistItem(p => ({...p, image: null}))}>
                                <Trash2 size={16} className="mr-2"/>
                                Quitar foto
                            </Button>
                        )}
                    </div>
                </div>
                <Button type="submit" className="self-stretch"><Plus size={20}/></Button>
            </form>
            <div className="max-h-64 overflow-y-auto space-y-2 pt-4">
              {wishlist.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Tu lista de deseos está vacía.</p>}
              {wishlist.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 bg-secondary rounded-md">
                   {item.image ? (
                     <Image src={item.image} alt={item.name} width={48} height={48} className="rounded-md object-cover"/>
                   ) : (
                     <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><Sprout size={24}/></div>
                   )}
                   <div className="flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                   </div>
                   <TooltipProvider>
                     <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => convertWishlistItemToPlant(item)}><CheckCircle size={18} className="text-green-600"/></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>¡La conseguí!</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => deleteWishlistItem(item.id)}><Trash2 size={18} className="text-red-600"/></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Eliminar de la lista</p></TooltipContent>
                      </Tooltip>
                   </TooltipProvider>
                </div>
              ))}
            </div>
        </DialogContent>
      </Dialog>
      
      {/* Calendar Dialog */}
      <CalendarDialog 
        isOpen={showCalendar}
        onOpenChange={setShowCalendar}
        userPlants={userPlants}
      />

      {/* Plant Info Dialog */}
      <PlantInfoDialog 
        plant={selectedPlantInfo}
        isOpen={showPlantInfo}
        onOpenChange={setShowPlantInfo}
      />

       {/* Vegetable Recommender Dialog */}
       <CropRecommenderDialog
        isOpen={showVeggieRecommender}
        onOpenChange={setShowVeggieRecommender}
      />
    </div>
  );
}


function UserProfileView({ profile, allPlants, firestore, currentUserId, onBack }: { profile: UserProfileType, allPlants: Plant[], firestore: any, currentUserId: string | undefined, onBack: () => void }) {
    const [activeTab, setActiveTab] = useState('plants');

    const userPlants = useMemo(() => allPlants.filter(p => p.ownerId === profile.uid), [allPlants, profile.uid]);
    
    const userWishlistRef = useMemoFirebase(() => (firestore && profile.uid) ? collection(firestore, 'users', profile.uid, 'wishlist') : null, [firestore, profile.uid]);
    const userWishlistQuery = useMemoFirebase(() => userWishlistRef ? query(userWishlistRef, orderBy('name')) : null, [userWishlistRef]);
    const { data: userWishlistData, isLoading: isLoadingWishlist } = useCollection<WishlistItem>(userWishlistQuery);
    const userWishlist = userWishlistData || [];

    const isMyProfile = profile.uid === currentUserId;

    const addPlantToMyWishlist = (plant: Plant | WishlistItem) => {
        if (!currentUserId || !firestore) {
            alert("Por favor, inicia sesión para añadir a tu lista de deseos.");
            return;
        }
        const myWishlistRef = collection(firestore, 'users', currentUserId, 'wishlist');
        const item = {
            name: plant.name,
            notes: `Visto en el perfil de ${profile.displayName || 'alguien'}.`,
            image: plant.image || null,
        };
        addDocumentNonBlocking(myWishlistRef, item);
        alert(`${plant.name} añadido a tu lista de deseos!`);
    };


    return (
        <div className="max-w-4xl mx-auto p-4">
            <Button onClick={onBack} variant="outline" className="mb-4"><ArrowLeft size={16} /> Volver</Button>
            
            <div className="flex items-center gap-4 mb-6">
                {profile.photoURL && <Image src={profile.photoURL} alt={profile.displayName || 'user'} width={80} height={80} className="rounded-full" />}
                <div>
                    <h1 className="text-3xl font-bold">{isMyProfile ? 'Mi Perfil' : `Perfil de ${profile.displayName}`}</h1>
                    <p className="text-muted-foreground">{userPlants.length} plantas en su colección.</p>
                </div>
            </div>

            <div className="flex justify-center border-b mt-4">
                 <button onClick={() => setActiveTab('plants')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'plants' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:bg-accent/50'}`}>
                    <Sprout size={16} /> Las Plantas de {isMyProfile ? 'mí' : profile.displayName?.split(' ')[0]}
                </button>
                <button onClick={() => setActiveTab('wishlist')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'wishlist' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:bg-accent/50'}`}>
                    <ListTodo size={16} /> Lista de Deseos
                </button>
            </div>
            
            <div className="py-6">
                {activeTab === 'plants' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {userPlants.map(plant => (
                            <Card key={plant.id} className="overflow-hidden group">
                               <div className="aspect-square relative bg-secondary overflow-hidden">
                                  {plant.image ? (
                                    <Image src={plant.image} alt={plant.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary/50"><Leaf size={48}/></div>
                                  )}
                                  {!isMyProfile && (
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                 <Button onClick={() => addPlantToMyWishlist(plant)} variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 hover:bg-background/80 text-rose-500 hover:text-rose-600 rounded-full h-8 w-8">
                                                    <Heart />
                                                 </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Añadir a mi lista de deseos</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                  )}
                               </div>
                               <div className="p-3">
                                  <h3 className="font-bold truncate">{plant.name}</h3>
                               </div>
                            </Card>
                        ))}
                         {userPlants.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">Este jardín aún no tiene plantas.</p>}
                    </div>
                )}
                 {activeTab === 'wishlist' && (
                    <div className="space-y-2">
                        {isLoadingWishlist && <p>Cargando lista de deseos...</p>}
                        {userWishlist.map(item => (
                            <div key={item.id} className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                               {item.image ? (
                                 <Image src={item.image} alt={item.name} width={56} height={56} className="rounded-md object-cover"/>
                               ) : (
                                 <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center text-muted-foreground"><Sprout size={28}/></div>
                               )}
                               <div className="flex-1">
                                  <p className="font-bold">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                               </div>
                               {!isMyProfile && (
                                  <TooltipProvider>
                                     <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="sm" variant="outline" onClick={() => addPlantToMyWishlist(item)}><Heart className="mr-2" size={16}/> Querer</Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Añadir a mi lista de deseos</p></TooltipContent>
                                      </Tooltip>
                                   </TooltipProvider>
                               )}
                            </div>
                        ))}
                        {!isLoadingWishlist && userWishlist.length === 0 && <p className="text-muted-foreground text-center py-10">La lista de deseos está vacía.</p>}
                    </div>
                 )}
            </div>

        </div>
    );
}

function PlantInfoTabContent({ plant }: { plant: Partial<Plant> }) {
    const [info, setInfo] = useState<PlantInfoOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (plant && plant.name && !info) { // Fetch only if we have a plant name and no info yet
            const fetchInfo = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const result = await getPlantInfo({ plantName: plant.name! });
                    setInfo(result);
                } catch (err) {
                    console.error("Error fetching plant info:", err);
                    setError("No se pudo cargar la información. Intenta de nuevo más tarde.");
                }
                setIsLoading(false);
            };
            fetchInfo();
        }
    }, [plant, info]);

    const getSeason = (date: Date) => {
        const month = date.getMonth();
        // South Hemisphere seasons
        if (month >= 8 && month <= 10) return 'Primavera'; // Sep, Oct, Nov
        if (month >= 11 || month <= 1) return 'Verano'; // Dec, Jan, Feb
        if (month >= 2 && month <= 4) return 'Otoño'; // Mar, Apr, May
        return 'Invierno'; // Jun, Jul, Aug
    };
    const currentSeason = getSeason(new Date());

    if (isLoading) {
        return (
            <div className="space-y-4 py-4">
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                <div className="h-24 bg-muted rounded-md animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                <div className="h-12 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                <div className="h-8 bg-muted rounded w-full animate-pulse"></div>
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-red-500">{error}</p>;
    }

    if (!info) {
        return <p className="text-center text-muted-foreground">No hay información disponible.</p>;
    }

    return (
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
                <h3 className="font-semibold mb-3 border-b pb-2">Cuidados Básicos</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex gap-3 items-start"><Sun className="text-amber-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Luz:</span> {info.careInfo.light}</div></div>
                    <div className="flex gap-3 items-start"><Droplets className="text-blue-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Riego:</span> {info.careInfo.water}</div></div>
                    <div className="flex gap-3 items-start"><Thermometer className="text-red-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Temperatura:</span> {info.careInfo.temperature}</div></div>
                </div>
            </div>
             <div>
                <h3 className="font-semibold mb-3 border-b pb-2">Información General</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex gap-3 items-start"><Palmtree className="text-green-600 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Altura Máxima:</span> {info.generalInfo.maxHeight}</div></div>
                    <div className="flex gap-3 items-start"><CalendarIcon className="text-purple-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Época de Floración:</span> {info.generalInfo.bloomSeason}</div></div>
                    <div className="flex gap-3 items-start"><Flower2 className="text-pink-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Colores de Flores:</span> {info.generalInfo.flowerColors}</div></div>
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-3 border-b pb-2">Consejos de Temporada</h3>
                <div className="space-y-3 text-sm">
                    <div className={`flex gap-3 items-start p-2 rounded-md ${info.seasonalCare.fertilize.includes(currentSeason) ? 'bg-green-100 dark:bg-green-900/50' : ''}`}>
                        <Beaker className="text-green-600 mt-0.5 flex-shrink-0" size={18}/> 
                        <div>
                            <span className="font-medium">Fertilizar:</span> {info.seasonalCare.fertilize}
                            {info.seasonalCare.fertilize.includes(currentSeason) && <span className="text-xs font-bold text-green-700 dark:text-green-300 ml-2">(¡Ahora!)</span>}
                        </div>
                    </div>
                    <div className={`flex gap-3 items-start p-2 rounded-md ${info.seasonalCare.prune.includes(currentSeason) ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                        <Scissors className="text-blue-600 mt-0.5 flex-shrink-0" size={18}/> 
                        <div>
                           <span className="font-medium">Podar:</span> {info.seasonalCare.prune}
                           {info.seasonalCare.prune.includes(currentSeason) && <span className="text-xs font-bold text-blue-700 dark:text-blue-300 ml-2">(¡Ahora!)</span>}
                        </div>
                    </div>
                    <div className={`flex gap-3 items-start p-2 rounded-md ${info.seasonalCare.repot.includes(currentSeason) ? 'bg-yellow-100 dark:bg-yellow-900/50' : ''}`}>
                        <RefreshCcw className="text-yellow-700 mt-0.5 flex-shrink-0" size={18}/> 
                        <div>
                           <span className="font-medium">Transplantar:</span> {info.seasonalCare.repot}
                           {info.seasonalCare.repot.includes(currentSeason) && <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300 ml-2">(¡Ahora!)</span>}
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-2 border-b pb-2">Dato Curioso</h3>
                <div className="flex gap-3 items-start text-sm">
                  <Lightbulb className="text-yellow-500 mt-0.5 flex-shrink-0" size={18}/>
                  <p>{info.funFact}</p>
                </div>
            </div>
        </div>
    );
}


function PlantInfoDialog({ plant, isOpen, onOpenChange }: { plant: Plant | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const [info, setInfo] = useState<PlantInfoOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && plant && !info) {
            const fetchInfo = async () => {
                setIsLoading(true);
                try {
                    const result = await getPlantInfo({ plantName: plant.name });
                    setInfo(result);
                } catch (error) {
                    console.error("Error fetching plant info:", error);
                }
                setIsLoading(false);
            };
            fetchInfo();
        } else if (!isOpen) {
            setInfo(null);
            setIsLoading(false);
        }
    }, [isOpen, plant, info]);

    const getSeason = (date: Date) => {
      const month = date.getMonth();
      // South Hemisphere seasons
      if (month >= 8 && month <= 10) return 'Primavera'; // Sep, Oct, Nov
      if (month >= 11 || month <= 1) return 'Verano'; // Dec, Jan, Feb
      if (month >= 2 && month <= 4) return 'Otoño'; // Mar, Apr, May
      return 'Invierno'; // Jun, Jul, Aug
    };

    const currentSeason = getSeason(new Date());

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                {plant && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl">{plant.name}</DialogTitle>
                             <p className="text-sm text-muted-foreground">De: {plant.ownerName}</p>
                        </DialogHeader>
                        
                        {isLoading && (
                            <div className="space-y-4 py-4">
                                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                                <div className="h-24 bg-muted rounded-md animate-pulse"></div>
                                <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                                <div className="h-12 bg-muted rounded w-full animate-pulse"></div>
                                <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div>
                                <div className="h-8 bg-muted rounded w-full animate-pulse"></div>
                            </div>
                        )}

                        {info && (
                             <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div>
                                    <h3 className="font-semibold mb-3 border-b pb-2">Cuidados Básicos</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex gap-3 items-start"><Sun className="text-amber-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Luz:</span> {info.careInfo.light}</div></div>
                                        <div className="flex gap-3 items-start"><Droplets className="text-blue-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Riego:</span> {info.careInfo.water}</div></div>
                                        <div className="flex gap-3 items-start"><Thermometer className="text-red-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Temperatura:</span> {info.careInfo.temperature}</div></div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-3 border-b pb-2">Información General</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex gap-3 items-start"><Palmtree className="text-green-600 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Altura Máxima:</span> {info.generalInfo.maxHeight}</div></div>
                                        <div className="flex gap-3 items-start"><CalendarIcon className="text-purple-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Época de Floración:</span> {info.generalInfo.bloomSeason}</div></div>
                                        <div className="flex gap-3 items-start"><Flower2 className="text-pink-500 mt-0.5 flex-shrink-0" size={18}/> <div><span className="font-medium">Colores de Flores:</span> {info.generalInfo.flowerColors}</div></div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-3 border-b pb-2">Consejos de Temporada</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className={`flex gap-3 items-start p-2 rounded-md ${info.seasonalCare.fertilize.includes(currentSeason) ? 'bg-green-100 dark:bg-green-900/50' : ''}`}>
                                            <Beaker className="text-green-600 mt-0.5 flex-shrink-0" size={18}/> 
                                            <div>
                                                <span className="font-medium">Fertilizar:</span> {info.seasonalCare.fertilize}
                                                {info.seasonalCare.fertilize.includes(currentSeason) && <span className="text-xs font-bold text-green-700 dark:text-green-300 ml-2">(¡Ahora!)</span>}
                                            </div>
                                        </div>
                                        <div className={`flex gap-3 items-start p-2 rounded-md ${info.seasonalCare.prune.includes(currentSeason) ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                                            <Scissors className="text-blue-600 mt-0.5 flex-shrink-0" size={18}/> 
                                            <div>
                                               <span className="font-medium">Podar:</span> {info.seasonalCare.prune}
                                               {info.seasonalCare.prune.includes(currentSeason) && <span className="text-xs font-bold text-blue-700 dark:text-blue-300 ml-2">(¡Ahora!)</span>}
                                            </div>
                                        </div>
                                        <div className={`flex gap-3 items-start p-2 rounded-md ${info.seasonalCare.repot.includes(currentSeason) ? 'bg-yellow-100 dark:bg-yellow-900/50' : ''}`}>
                                            <RefreshCcw className="text-yellow-700 mt-0.5 flex-shrink-0" size={18}/> 
                                            <div>
                                               <span className="font-medium">Transplantar:</span> {info.seasonalCare.repot}
                                               {info.seasonalCare.repot.includes(currentSeason) && <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300 ml-2">(¡Ahora!)</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 border-b pb-2">Dato Curioso</h3>
                                    <div className="flex gap-3 items-start text-sm">
                                      <Lightbulb className="text-yellow-500 mt-0.5 flex-shrink-0" size={18}/>
                                      <p>{info.funFact}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function CalendarDialog({ isOpen, onOpenChange, userPlants }: { isOpen: boolean, onOpenChange: (open: boolean) => void, userPlants: Plant[] }) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
    const [seasonalInfo, setSeasonalInfo] = useState<PlantInfoOutput | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);

    const selectedPlant = userPlants.find(p => p.id === selectedPlantId);

    useEffect(() => {
        if (selectedPlant) {
            const fetchInfo = async () => {
                setIsLoadingInfo(true);
                setSeasonalInfo(null);
                try {
                    const result = await getPlantInfo({ plantName: selectedPlant.name });
                    setSeasonalInfo(result);
                } catch (error) {
                    console.error("Error fetching plant info for calendar:", error);
                }
                setIsLoadingInfo(false);
            };
            fetchInfo();
        } else {
            setSeasonalInfo(null);
        }
    }, [selectedPlant]);
  
    const allEvents = useMemo(() => {
      return userPlants.flatMap(plant => 
        (plant.events || []).map(event => ({
          ...event,
          plantName: plant.name,
          plantImage: plant.image,
        }))
      );
    }, [userPlants]);
  
    const eventsByDate = useMemo(() => {
      const grouped: { [key: string]: typeof allEvents } = {};
      allEvents.forEach(event => {
        const eventDate = format(parseISO(event.date), 'yyyy-MM-dd');
        if (!grouped[eventDate]) {
          grouped[eventDate] = [];
        }
        grouped[eventDate].push(event);
      });
      return grouped;
    }, [allEvents]);
  
    const selectedDayEvents = useMemo(() => {
      if (!date) return [];
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      return eventsByDate[selectedDateStr] || [];
    }, [date, eventsByDate]);
  
    const eventDays = useMemo(() => {
      return Object.keys(eventsByDate).map(dateStr => parseISO(dateStr));
    }, [eventsByDate]);
  
    const getIconForEvent = (type: string) => {
        switch (type) {
            case 'poda': return <Scissors size={16} className="text-blue-500"/>;
            case 'plaga': return <Bug size={16} className="text-red-500"/>;
            case 'transplante': return <Shovel size={16} className="text-yellow-700"/>;
            case 'hijito': return <Baby size={16} className="text-green-500"/>;
            case 'florecio': return <Flower2 size={16} className="text-pink-500"/>;
            case 'fertilizante': return <Beaker size={16} className="text-green-600"/>;
            default: return <Sprout size={16} className="text-gray-400"/>;
        }
    }

    const getSeason = (date: Date) => {
        const month = date.getMonth();
        if (month >= 8 && month <= 10) return 'Primavera';
        if (month >= 11 || month <= 1) return 'Verano';
        if (month >= 2 && month <= 4) return 'Otoño';
        return 'Invierno';
    };
    const currentSeason = getSeason(new Date());
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Calendario de Cuidados</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border justify-center"
                  locale={es}
                  modifiers={{ event: eventDays }}
                  modifiersStyles={{ event: { border: `2px solid hsl(var(--primary))` } }}
                />
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3 text-lg">Recomendaciones del Mes</h3>
                     <Select onValueChange={setSelectedPlantId} value={selectedPlantId || ''}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una planta..." />
                        </SelectTrigger>
                        <SelectContent>
                            {userPlants.filter(p => p.status === 'viva').map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {isLoadingInfo && <p className="text-sm text-muted-foreground mt-4 text-center">Buscando recomendaciones...</p>}
                    
                    {seasonalInfo && (
                        <div className="space-y-3 text-sm mt-4">
                           <div className={`flex gap-3 items-start p-2 rounded-md ${seasonalInfo.seasonalCare.fertilize.includes(currentSeason) ? 'bg-green-100 dark:bg-green-900/50' : ''}`}>
                                <Beaker className="text-green-600 mt-0.5 flex-shrink-0" size={18}/> 
                                <div>
                                    <span className="font-medium">Fertilizar:</span> {seasonalInfo.seasonalCare.fertilize}
                                    {seasonalInfo.seasonalCare.fertilize.includes(currentSeason) && <span className="text-xs font-bold text-green-700 dark:text-green-300 ml-2">(¡Ahora!)</span>}
                                </div>
                            </div>
                            <div className={`flex gap-3 items-start p-2 rounded-md ${seasonalInfo.seasonalCare.prune.includes(currentSeason) ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                                <Scissors className="text-blue-600 mt-0.5 flex-shrink-0" size={18}/> 
                                <div>
                                   <span className="font-medium">Podar:</span> {seasonalInfo.seasonalCare.prune}
                                   {seasonalInfo.seasonalCare.prune.includes(currentSeason) && <span className="text-xs font-bold text-blue-700 dark:text-blue-300 ml-2">(¡Ahora!)</span>}
                                </div>
                            </div>
                             <div className={`flex gap-3 items-start p-2 rounded-md ${seasonalInfo.seasonalCare.repot.includes(currentSeason) ? 'bg-yellow-100 dark:bg-yellow-900/50' : ''}`}>
                                <RefreshCcw className="text-yellow-700 mt-0.5 flex-shrink-0" size={18}/> 
                                <div>
                                   <span className="font-medium">Transplantar:</span> {seasonalInfo.seasonalCare.repot}
                                   {seasonalInfo.seasonalCare.repot.includes(currentSeason) && <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300 ml-2">(¡Ahora!)</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              <h3 className="font-bold text-lg border-b pb-2 sticky top-0 bg-background/95 backdrop-blur-sm">
                Eventos para el {date ? format(date, "d 'de' MMMM", { locale: es }) : '...'}
              </h3>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map(event => (
                  <div key={event.id} className="flex gap-4 items-start bg-secondary p-3 rounded-lg">
                    {event.plantImage && <Image src={event.plantImage} alt={event.plantName} width={48} height={48} className="rounded-md object-cover" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                         {getIconForEvent(event.type)}
                         <span className="font-semibold capitalize">{event.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        En <span className="font-medium">{event.plantName}</span>
                      </p>
                       <p className="text-sm mt-1">{event.note}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No se registraron eventos para este día.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
}

function CropRecommenderDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<CropRecommenderOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleRecommendation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setResult(null);
        try {
            const recommendations = await recommendCrops({ userQuery: query });
            setResult(recommendations);
        } catch (error) {
            console.error("Error getting crop recommendations:", error);
            alert('Hubo un error al obtener las recomendaciones. Intenta de nuevo.');
        }
        setIsLoading(false);
    };
    
    // Reset state when closing dialog
    useEffect(() => {
      if (!isOpen) {
        setQuery('');
        setResult(null);
        setIsLoading(false);
      }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Asistente de Huerta</DialogTitle>
                    <p className="text-sm text-muted-foreground pt-1">
                        Describe tu espacio y la IA te recomendará qué frutas y verduras plantar.
                    </p>
                </DialogHeader>

                <form onSubmit={handleRecommendation} className="flex items-start gap-2">
                    <Textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ej: Tengo un balcón pequeño con sol por la mañana..."
                        rows={2}
                        required
                    />
                    <Button type="submit" disabled={isLoading} className="self-stretch">
                        {isLoading ? 'Pensando...' : 'Recomendar'}
                    </Button>
                </form>

                <div className="max-h-80 overflow-y-auto space-y-4 pt-4">
                    {isLoading && (
                       <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                               <div key={i} className="p-4 border rounded-lg animate-pulse">
                                   <div className="h-5 w-1/3 bg-muted rounded-md mb-2"></div>
                                   <div className="h-4 w-full bg-muted rounded-md mb-1"></div>
                                   <div className="h-4 w-3/4 bg-muted rounded-md"></div>
                               </div>
                            ))}
                       </div>
                    )}
                    {result && result.recommendations.map((rec, index) => (
                        <Card key={index} className="animate-in fade-in-50">
                           <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Carrot size={20} className="text-primary"/>
                                {rec.name}
                            </CardTitle>
                           </CardHeader>
                           <CardContent className="space-y-2 text-sm">
                               <p><span className="font-semibold">Cosecha en:</span> {rec.timeToHarvest}</p>
                               <p><span className="font-semibold">Ideal para:</span> {rec.plantingLocation}</p>
                           </CardContent>
                        </Card>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
  
  
  

    
