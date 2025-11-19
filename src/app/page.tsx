
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Search, Sprout, Gift, DollarSign, Calendar, Trash2, Camera,
  Leaf, Flower2, Droplets, HeartCrack, X, Save,
  Sun, Home, BarChart3, Clock, Upload, Download,
  History, Scissors, Bug, Beaker, Shovel, AlertCircle,
  ArrowRightLeft, RefreshCcw, Baby, Moon, SunDim, ListTodo, CheckCircle, Bot, LogIn, LogOut
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
import { diagnosePlant, type DiagnosePlantOutput } from '@/ai/flows/diagnose-plant-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirebase, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';


// Types
type PlantEvent = {
  id: string;
  type: string;
  date: string;
  note: string;
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
}


export default function PlantManagerFinal() {
  // --- Estados ---
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosePlantOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wishlistImageInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  // --- Firebase ---
  const { firestore, auth } = useFirebase();
  const { user, isLoading: isLoadingUser } = useUser();
  const userId = user?.uid;

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .catch((error) => {
        // Handle Errors here.
        if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-blocked') {
            console.error("Error with redirect result: ", error);
        }
      });
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


  const wishlistRef = useMemoFirebase(() => userId && !isLoadingUser ? collection(firestore, 'users', userId, 'wishlist') : null, [firestore, userId, isLoadingUser]);
  const wishlistQuery = useMemoFirebase(() => wishlistRef ? query(wishlistRef, orderBy('name')) : null, [wishlistRef]);
  const { data: wishlistData, isLoading: isLoadingWishlist } = useCollection<WishlistItem>(wishlistQuery);
  const wishlist = wishlistData || [];

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The useUser hook will handle the user state update
    } catch (error: any) {
        if (error.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
        } else if (error.code !== 'auth/cancelled-popup-request') {
            console.error("Error signing in with Google: ", error);
        }
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  
  const initialFormData: Omit<Plant, 'id' | 'createdAt' | 'ownerId'> = {
    name: '',
    image: null,
    acquisitionType: 'compra', // compra, regalo, intercambio, robado
    exchangeSource: '', // "Llegó a cambio de X"
    price: '',
    date: new Date().toISOString().split('T')[0],
    status: 'viva', // viva, fallecida, intercambiada
    exchangeDest: '', // "Se fue a cambio de Y" (Solo si se fue toda la planta)
    startType: 'planta',
    location: 'interior',
    lastWatered: new Date().toISOString().split('T')[0],
    notes: '',
    events: [],
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
        status: 'viva',
        ownerId: userId,
        ownerName: user?.displayName,
        ownerPhotoURL: user?.photoURL,
        lastPhotoUpdate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp() 
      };
      addDocumentNonBlocking(plantsCollectionRef, dataToSave);
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

  const openModal = (plant: Partial<Plant> | null = null) => {
    if (!userId) {
      alert("Por favor, inicia sesión para añadir o editar plantas.");
      return;
    }
    setDiagnosisResult(null);
    setActiveTab('details');
    if (plant) {
      if (plant.ownerId !== userId) {
        alert("Solo puedes editar las plantas que te pertenecen.");
        return;
      }
      setFormData({ ...plant, events: plant.events || [] });
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
        description: `Nombre: ${formData.name}. Notas: ${formData.notes}`,
      });
      setDiagnosisResult(result);
    } catch (error) {
      console.error('Error al diagnosticar la planta:', error);
      alert('Ocurrió un error al intentar obtener el diagnóstico. Por favor, intenta de nuevo.');
    }
    setIsDiagnosing(false);
  };


  // Import/Export
  const exportData = () => {
    const userPlants = plants.filter(p => p.ownerId === userId);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userPlants));
    const a = document.createElement('a'); a.href = dataStr; a.download = "mi_jardin_final.json"; a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore || !userId) return;
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { 
        try { 
            const importedPlants = JSON.parse(ev.target?.result as string);
            const plantsCollectionRef = collection(firestore, 'plants'); 
            if(window.confirm(`¿Importar ${importedPlants.length} plantas a tu colección?`)) {
                importedPlants.forEach((p: any) => {
                    const dataToSave = { 
                      ...p, 
                      ownerId: userId,
                      ownerName: user?.displayName,
                      ownerPhotoURL: user?.photoURL,
                      createdAt: serverTimestamp() 
                    };
                    delete dataToSave.id;
                    addDocumentNonBlocking(plantsCollectionRef, dataToSave);
                });
            }
        } catch(e){
            alert("Error al leer el archivo. Asegúrate de que es un archivo JSON válido.");
        }
    };
    reader.readAsText(file);
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
  const filteredPlants = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (filterStatus === 'viva') matchFilter = p.status === 'viva';
    if (filterStatus === 'fallecida') matchFilter = p.status === 'fallecida';
    if (filterStatus === 'intercambiada') matchFilter = p.status === 'intercambiada';
    return matchSearch && matchFilter;
  });

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

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
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
                  <Button onClick={() => setShowWishlist(true)} variant="ghost" size="icon"><ListTodo size={20}/></Button>
                  <Button onClick={() => setShowStats(!showStats)} variant="ghost" size="icon" className={showStats ? 'bg-secondary' : ''}><BarChart3 size={20}/></Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon"><Upload size={20}/><input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json"/></Button>
                  <Button onClick={exportData} variant="ghost" size="icon"><Download size={20}/></Button>
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
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {(isLoadingPlants && plants.length === 0) && Array.from({length: 10}).map((_, i) => (
             <Card key={i} className="overflow-hidden">
                 <div className="aspect-square relative bg-secondary animate-pulse"></div>
                 <div className="p-3">
                     <div className="h-5 w-3/4 bg-secondary animate-pulse rounded-md"></div>
                     <div className="mt-2 h-4 w-1/2 bg-secondary animate-pulse rounded-md"></div>
                 </div>
             </Card>
        ))}
        {filteredPlants.map(plant => {
          const w = getWateringStatus(plant.lastWatered);
          const photoUpdateNeeded = needsPhotoUpdate(plant.lastPhotoUpdate, plant.date);
          const isOwner = plant.ownerId === userId;
          
          return (
            <Card key={plant.id} onClick={() => openModal(plant)} className={`overflow-hidden cursor-pointer hover:shadow-md transition-all group ${plant.status === 'fallecida' ? 'opacity-70' : ''} ${plant.status === 'intercambiada' ? 'opacity-90' : ''}`}>
               <div className="aspect-square relative bg-secondary overflow-hidden">
                  {plant.image ? (
                    <Image src={plant.image} alt={plant.name} fill className={`object-cover transition-transform group-hover:scale-105 ${plant.status === 'fallecida' ? 'grayscale' : ''}`} sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/50"><Leaf size={48}/></div>
                  )}
                  
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
                    {plant.location === 'exterior' ? <Sun size={12} className="text-amber-500"/> : <Home size={12} className="text-blue-500"/>}
                  </div>

                   {plant.ownerPhotoURL && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Image src={plant.ownerPhotoURL} alt={plant.ownerName || 'dueño'} width={28} height={28} className="absolute top-2 left-2 rounded-full border-2 border-background shadow-md" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>De: {plant.ownerName || 'Anónimo'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {photoUpdateNeeded && isOwner && plant.status === 'viva' && (
                    <div className="absolute bottom-2 left-2 bg-amber-500/90 text-white backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm animate-pulse">
                      <Camera size={12} />
                      <span>Actualizar Foto</span>
                    </div>
                  )}

                  {plant.status === 'fallecida' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px]"><HeartCrack size={16} className="mr-2"/> EN MEMORIA</div>}
                  {plant.status === 'intercambiada' && <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px] text-center px-4"><ArrowRightLeft size={16} className="mr-2"/> INTERCAMBIADA</div>}
               </div>
               
               <div className="p-3">
                  <div className="flex justify-between items-start">
                     <h3 className="font-bold truncate">{plant.name}</h3>
                     {plant.status === 'viva' && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${w.bg} ${w.color}`}>
                           <Clock size={10}/> {w.days === 0 ? 'HOY' : `${w.days}d`}
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                     <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{plant.startType}</Badge>
                        {plant.acquisitionType === 'compra' && <Badge variant="outline">{formatCurrency(plant.price)}</Badge>}
                        {plant.acquisitionType === 'regalo' && <Badge variant="outline" className="border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">De: {plant.giftFrom}</Badge>}
                        {plant.acquisitionType === 'intercambio' && <Badge variant="outline" className="border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400">Por: {plant.exchangeSource}</Badge>}
                        {plant.acquisitionType === 'robado' && <Badge variant="destructive" className="border-red-300 text-red-600 dark:border-red-700 dark:text-red-400">De: {plant.stolenFrom}</Badge>}
                     </div>
                  </div>

               </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b flex-row justify-between items-center">
            <DialogTitle>{formData.id ? formData.name : 'Nueva Planta'}</DialogTitle>
             <Button onClick={closeModal} variant="ghost" size="icon" className="rounded-full flex-shrink-0"><X size={20}/></Button>
          </DialogHeader>

          {formData.id && (
            <div className="flex border-b">
              <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Detalles</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Bitácora <Badge variant="secondary">{formData.events?.length || 0}</Badge>
              </button>
               <button onClick={() => setActiveTab('diagnosis')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'diagnosis' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Diagnóstico IA <Bot size={16} />
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
                           <Select name="location" value={formData.location} onValueChange={(v) => handleInputChange({target: {name: 'location', value: v}} as any)}>
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

            {activeTab === 'history' && (
              <div>
                <TooltipProvider>
                  <div className="mb-6 p-3 bg-secondary rounded-lg">
                      <p className="text-sm font-medium text-center mb-3 text-muted-foreground">Registro Rápido de Eventos</p>
                      <div className="grid grid-cols-5 gap-2 text-center">
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
                <Button onClick={handleDiagnosis} disabled={isDiagnosing || !formData.image}>
                  {isDiagnosing ? 'Analizando...' : <><Bot className="mr-2" /> Analizar Salud de la Planta</>}
                </Button>
                
                {!formData.image && (
                    <p className="text-sm text-muted-foreground mt-4">Debes tener una foto de la planta para poder analizarla.</p>
                )}

                {isDiagnosing && (
                  <div className="mt-6 space-y-2">
                    <div className="animate-pulse rounded-full bg-muted h-8 w-3/4 mx-auto"></div>
                    <div className="animate-pulse rounded-md bg-muted h-20 w-full mx-auto"></div>
                     <div className="animate-pulse rounded-md bg-muted h-20 w-full mx-auto"></div>
                  </div>
                )}
                
                {diagnosisResult && (
                  <div className="mt-6 text-left space-y-4">
                    <Alert variant={diagnosisResult.diagnosis.isHealthy ? 'default' : 'destructive'}>
                       <AlertTitle className="font-bold flex items-center gap-2">
                         {diagnosisResult.diagnosis.isHealthy ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                        Veredicto: {diagnosisResult.diagnosis.isHealthy ? 'Planta Sana' : 'Necesita Atención'}
                      </AlertTitle>
                      <AlertDescription>
                        {diagnosisResult.diagnosis.isHealthy ? '¡Tu planta parece estar en buena forma!' : 'Tu planta podría necesitar algo de ayuda.'}
                      </AlertDescription>
                    </Alert>

                    <div>
                      <h4 className="font-bold text-lg mb-2">Identificación</h4>
                      <p className="text-sm"><span className="font-semibold">Nombre Común:</span> {diagnosisResult.identification.commonName}</p>
                      <p className="text-sm"><span className="font-semibold">Nombre Científico:</span> {diagnosisResult.identification.latinName}</p>
                    </div>

                     <div>
                      <h4 className="font-bold text-lg mb-2">Diagnóstico</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{diagnosisResult.diagnosis.diagnosis}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-lg mb-2">Recomendaciones</h4>
                       <p className="text-sm text-muted-foreground whitespace-pre-wrap">{diagnosisResult.diagnosis.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Wishlist Sheet */}
      <Dialog open={showWishlist} onOpenChange={setShowWishlist}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Lista de Deseos</DialogTitle>
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
    </div>
  );
}

    