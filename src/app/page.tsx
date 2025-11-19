'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Search, Sprout, Gift, DollarSign, Calendar as CalendarIcon, Trash2, Camera,
  Leaf, Flower2, Droplets, HeartCrack, X, Save,
  Sun, Home, BarChart3, Clock,
  History, Scissors, Bug, Beaker, Shovel, AlertCircle,
  ArrowRightLeft, RefreshCcw, Baby, Moon, SunDim, ListTodo, CheckCircle, Bot, LogIn, LogOut, Users, User, Heart, ArrowLeft, Info, Lightbulb, Thermometer, GalleryHorizontal, Carrot, Sparkles
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  getRedirectResult,
  signInWithRedirect
} from 'firebase/auth';
import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { onSnapshot, doc, collection, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import {
    setDocumentNonBlocking,
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getMonth, getYear, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { diagnosePlant, getPlantInfo, type DiagnosePlantOutput, type PlantInfoOutput } from '@/ai/flows/diagnose-plant-flow';
import { recommendCrops, type CropRecommenderOutput } from '@/ai/flows/vegetable-recommender-flow';
import { PlantCard } from '@/components/plant-card';
import { AddPlantDialog } from '@/components/add-plant-dialog';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';

// Tipos
type Plant = {
  id: string;
  name: string;
  date: string; // ISO date string
  status: 'viva' | 'fallecida' | 'intercambiada';
  lastWatered?: string;
  notes?: string;
  image?: string;
  startType: 'planta' | 'gajo' | 'raiz' | 'semilla';
  location: 'interior' | 'exterior';
  acquisitionType: 'compra' | 'regalo' | 'intercambio' | 'robado';
  price?: string;
  giftFrom?: string;
  stolenFrom?: string;
  exchangeSource?: string; // Motivo de intercambio si aplica
  exchangeDest?: string; // Destino del intercambio si aplica
  lastPhotoUpdate?: string; // ISO date string
  createdAt: any;
  events: PlantEvent[];
  gallery?: { imageUrl: string; date: string }[];
  ownerId: string;
  ownerName?: string;
  ownerPhotoURL?: string;
};

type PlantEvent = {
  id: string;
  type: 'riego' | 'poda' | 'transplante' | 'foto' | 'plaga' | 'fertilizante' | 'nota';
  date: string; // ISO date string
  note: string;
};

type WishlistItem = {
  id: string;
  name: string;
  notes?: string;
  image?: string;
};

type View = 'my-plants' | 'community' | 'wishlist' | 'stats';


// Componente Principal
export default function GardenApp() {
  const { user, isLoading: isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [communityPlants, setCommunityPlants] = useState<Plant[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommunityLoading, setIsCommunityLoading] = useState(true);
  
  const [view, setView] = useState<View>('my-plants');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isWishlistFormOpen, setIsWishlistFormOpen] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState<WishlistItem | null>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const [isCropRecommenderOpen, setIsCropRecommenderOpen] = useState(false);

  const [isPlantInfoOpen, setIsPlantInfoOpen] = useState(false);
  const [plantInfo, setPlantInfo] = useState<PlantInfoOutput | null>(null);
  const [isPlantInfoLoading, setIsPlantInfoLoading] = useState(false);
  const [currentPlantInfoName, setCurrentPlantInfoName] = useState("");


  // -- Efectos para carga de datos --
  useEffect(() => {
    if (user && firestore) {
      setIsLoading(true);
      const plantsQuery = query(collection(firestore, 'plants'), where('ownerId', '==', user.uid));
      const unsubscribe = onSnapshot(plantsQuery, snapshot => {
        const userPlants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
        setPlants(userPlants);
        setIsLoading(false);
      }, error => {
        console.error("Error fetching user plants:", error);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setPlants([]);
    }
  }, [user, firestore]);
  
  useEffect(() => {
    if (firestore) {
      setIsCommunityLoading(true);
      const communityQuery = query(collection(firestore, 'plants'));
      const unsubscribe = onSnapshot(communityQuery, snapshot => {
        const allPlants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
        setCommunityPlants(allPlants);
        setIsCommunityLoading(false);
      }, error => {
        console.error("Error fetching community plants:", error);
        setIsCommunityLoading(false);
      });
      return () => unsubscribe();
    }
  }, [firestore]);

  useEffect(() => {
    if (user && firestore) {
      const wishlistQuery = collection(firestore, `users/${user.uid}/wishlist`);
      const unsubscribe = onSnapshot(wishlistQuery, snapshot => {
        const userWishlist = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem));
        setWishlist(userWishlist);
      }, error => {
        console.error("Error fetching wishlist:", error);
      });
      return () => unsubscribe();
    } else {
      setWishlist([]);
    }
  }, [user, firestore]);


   useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .catch((error) => {
        console.error("Firebase redirect error:", error);
        toast({
          variant: "destructive",
          title: "Error de inicio de sesión",
          description: "No se pudo completar el inicio de sesión. Si el problema persiste, asegúrate de que este dominio esté autorizado en la configuración de Firebase.",
        });
      });
  }, [auth, toast]);

  // -- Handlers de Autenticación --
  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
        if (isMobile) {
            await signInWithRedirect(auth, provider);
        } else {
            await signInWithPopup(auth, provider);
        }
    } catch (error) {
        console.error("Error during sign-in:", error);
        toast({
            variant: "destructive",
            title: "Error al iniciar sesión",
            description: "No se pudo conectar con Google. Por favor, intenta de nuevo.",
        });
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast({ title: "Has cerrado sesión." });
  };

  // -- Handlers de Plantas --
  const handleAddPlant = async (newPlantData: Omit<Plant, 'id' | 'createdAt' | 'ownerId'>) => {
    if (!user || !firestore) return;
    try {
      await addDoc(collection(firestore, 'plants'), {
        ...newPlantData,
        ownerId: user.uid,
        ownerName: user.displayName,
        ownerPhotoURL: user.photoURL,
        createdAt: serverTimestamp(),
      });
      toast({ title: "¡Planta añadida!", description: `${newPlantData.name} se ha unido a tu jardín.` });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding plant:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo añadir la planta: ${error.message}` });
    }
  };

  const handleUpdatePlant = async (plantId: string, updatedData: Partial<Plant>) => {
    if (!firestore) return;
    try {
      const plantRef = doc(firestore, 'plants', plantId);
      await updateDoc(plantRef, updatedData);
      toast({ title: "Planta actualizada", description: "Los cambios se han guardado." });
      setIsEditDialogOpen(false);
      setEditingPlant(null);
    } catch (error: any) {
      console.error("Error updating plant:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo actualizar la planta: ${error.message}` });
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'plants', plantId));
      toast({ title: "Planta eliminada" });
    } catch (error: any) {
      console.error("Error deleting plant:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar la planta: ${error.message}` });
    }
  };

  const handleAddEvent = (plantId: string, event: Omit<PlantEvent, 'id'>) => {
    if (!editingPlant) return;
    const newEvent = { ...event, id: new Date().getTime().toString() };
    const updatedEvents = [...(editingPlant.events || []), newEvent];
    setEditingPlant({ ...editingPlant, events: updatedEvents });
  };
  
  const handleRemoveEvent = (eventId: string) => {
    if (!editingPlant) return;
    const updatedEvents = editingPlant.events.filter(e => e.id !== eventId);
    setEditingPlant({ ...editingPlant, events: updatedEvents });
  };
  
  const handleQuickAddEvent = (type: PlantEvent['type']) => {
    if (!editingPlant) return;
    let note = "";
    switch (type) {
        case 'riego': note = "Agua añadida."; break;
        case 'poda': note = "Poda de mantenimiento realizada."; break;
        case 'transplante': note = "Movida a una maceta más grande."; break;
        case 'fertilizante': note = "Nutrientes añadidos."; break;
        case 'plaga': note = "Se detectó y trató una plaga."; break;
        default: note = "Evento registrado."; break;
    }
    handleAddEvent(editingPlant.id, { type, date: new Date().toISOString(), note });
  };
  

  // -- Handlers de Wishlist --
  const handleSaveWishlistItem = async (itemData: Omit<WishlistItem, 'id'>, id?: string) => {
    if (!user || !firestore) return;
    try {
      if (id) {
        await setDoc(doc(firestore, `users/${user.uid}/wishlist`, id), itemData, { merge: true });
        toast({ title: "Artículo actualizado" });
      } else {
        await addDoc(collection(firestore, `users/${user.uid}/wishlist`), itemData);
        toast({ title: "Artículo añadido a tu lista de deseos" });
      }
      setIsWishlistFormOpen(false);
      setEditingWishlistItem(null);
    } catch (error: any) {
      console.error("Error saving wishlist item:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo guardar: ${error.message}` });
    }
  };

  const handleDeleteWishlistItem = async (id: string) => {
    if (!user || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `users/${user.uid}/wishlist`, id));
      toast({ title: "Artículo eliminado" });
    } catch (error: any) {
      console.error("Error deleting wishlist item:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar: ${error.message}` });
    }
  };

  // -- Handlers de UI --
  const openPlantDetails = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDetailOpen(true);
  };
  
  const openPlantEditor = (plant: Plant) => {
    setEditingPlant(plant);
    setIsEditDialogOpen(true);
  };

  const openWishlistForm = (item?: WishlistItem) => {
    setEditingWishlistItem(item || null);
    setIsWishlistFormOpen(true);
  };

  const handleFetchPlantInfo = async (plantName: string) => {
      if (!plantName) return;
      setIsPlantInfoLoading(true);
      setIsPlantInfoOpen(true);
      setCurrentPlantInfoName(plantName);
      try {
          const info = await getPlantInfo({ plantName });
          setPlantInfo(info);
      } catch (error) {
          console.error("Error fetching plant info:", error);
          toast({
              variant: "destructive",
              title: "Error de IA",
              description: "No se pudo obtener la información de la planta."
          });
          setPlantInfo(null); // Limpiar en caso de error
      } finally {
          setIsPlantInfoLoading(false);
      }
  };
  

  // -- Filtrado y Renderizado --
  const filteredPlants = useMemo(() => {
    const source = view === 'my-plants' ? plants : communityPlants.filter(p => p.ownerId !== user?.uid);
    if (!searchTerm) return source;
    return source.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [plants, communityPlants, user, view, searchTerm]);
  
  const filteredWishlist = useMemo(() => {
    if (!searchTerm) return wishlist;
    return wishlist.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [wishlist, searchTerm]);

  // -- Renderizado del componente --
  return (
    <div className="min-h-screen bg-secondary/50 font-body text-foreground">
      <Header
        view={view}
        onViewChange={setView}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onAddPlant={() => setIsAddDialogOpen(true)}
        onOpenWishlist={() => setView('wishlist')}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCropRecommender={() => setIsCropRecommenderOpen(true)}
        isUserLoading={isUserLoading}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={`Buscar en ${view === 'my-plants' ? 'mis plantas' : view === 'wishlist' ? 'mi lista de deseos' : 'la comunidad'}...`}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {view === 'my-plants' && (
          <PlantsGrid plants={filteredPlants} onPlantClick={openPlantEditor} isLoading={isLoading} />
        )}
        {view === 'community' && (
          <PlantsGrid plants={filteredPlants} onPlantClick={(plant) => {
              openPlantDetails(plant);
              handleFetchPlantInfo(plant.name);
            }} isLoading={isCommunityLoading} isCommunity={true} />
        )}
        {view === 'wishlist' && (
          <WishlistGrid
            items={filteredWishlist}
            onEdit={openWishlistForm}
            onDelete={handleDeleteWishlistItem}
            onAddNew={() => openWishlistForm()}
          />
        )}
      </main>
      
      {/* Diálogos */}
      <AddPlantDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onSave={handleAddPlant}
      />
      {editingPlant && (
        <EditPlantDialog
          plant={editingPlant}
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          onSave={(id, data) => handleUpdatePlant(id, data)}
          onDelete={handleDeletePlant}
          onAddEvent={handleAddEvent}
          onRemoveEvent={handleRemoveEvent}
          onQuickAddEvent={handleQuickAddEvent}
          onFetchInfo={handleFetchPlantInfo}
        />
      )}
      <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={() => {}}
      />
       {isPlantInfoOpen && (
            <PlantInfoDialog
                isOpen={isPlantInfoOpen}
                setIsOpen={setIsPlantInfoOpen}
                plantName={currentPlantInfoName}
                info={plantInfo}
                isLoading={isPlantInfoLoading}
            />
        )}
      <WishlistFormDialog
        isOpen={isWishlistFormOpen}
        setIsOpen={setIsWishlistFormOpen}
        onSave={handleSaveWishlistItem}
        item={editingWishlistItem}
      />
      <CalendarDialog
        isOpen={isCalendarOpen}
        setIsOpen={setIsCalendarOpen}
        plants={plants}
        onFetchPlantInfo={handleFetchPlantInfo}
        setPlantInfoOpen={setIsPlantInfoOpen}
      />
      <StatsDialog
        isOpen={isStatsOpen}
        setIsOpen={setIsStatsOpen}
        plants={plants}
      />
      <CropRecommenderDialog
        isOpen={isCropRecommenderOpen}
        setIsOpen={setIsCropRecommenderOpen}
      />
    </div>
  );
}

// Header
function Header({ view, onViewChange, user, onLogin, onLogout, onAddPlant, onOpenWishlist, onOpenCalendar, onOpenStats, onOpenCropRecommender, isUserLoading }: any) {
  const NavButton = ({ activeView, targetView, icon: Icon, children }: any) => (
    <Button
      variant={activeView === targetView ? "secondary" : "ghost"}
      onClick={() => onViewChange(targetView)}
      className="flex-col h-16 w-20 sm:flex-row sm:h-10 sm:w-auto sm:px-4"
    >
      <Icon className="h-5 w-5 mb-1 sm:mb-0 sm:mr-2" />
      <span className="text-xs sm:text-sm">{children}</span>
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden sm:flex items-center">
          <Sprout className="h-6 w-6 text-primary" />
          <h1 className="ml-2 font-headline text-xl font-bold">PlantPal</h1>
        </div>
        
        <nav className="flex-1 flex items-center justify-start gap-1">
          <NavButton activeView={view} targetView="my-plants" icon={Leaf}>Mis Plantas</NavButton>
          <NavButton activeView={view} targetView="community" icon={Users}>Comunidad</NavButton>
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={onOpenCropRecommender}><Carrot className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={onOpenCalendar}><CalendarIcon className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={onOpenWishlist}><ListTodo className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={onOpenStats}><BarChart3 className="h-5 w-5" /></Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          {isUserLoading ? (
            <Skeleton className="h-10 w-24" />
          ) : user ? (
            <Popover>
              <PopoverTrigger>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Usuario'} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="p-2 text-center">
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Separator />
                <Button variant="ghost" className="w-full justify-start mt-1" onClick={onAddPlant}><Plus className="mr-2 h-4 w-4" />Añadir Planta</Button>
                <Button variant="destructive" className="w-full justify-start mt-1" onClick={onLogout}><LogOut className="mr-2 h-4 w-4" />Cerrar Sesión</Button>
              </PopoverContent>
            </Popover>
          ) : (
            <Button onClick={onLogin}><LogIn className="mr-2 h-4 w-4" />Acceder</Button>
          )}
        </div>
      </div>
    </header>
  );
}


// Grid de Plantas
function PlantsGrid({ plants, onPlantClick, isLoading, isCommunity = false }: any) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[350px] w-full rounded-lg" />)}
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="text-center py-16">
        <Leaf className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{isCommunity ? "No hay plantas en la comunidad todavía" : "Aún no tienes plantas"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isCommunity ? "Sé el primero en compartir una planta." : "¡Añade tu primera planta para empezar!"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {plants.map((plant: Plant) => (
        <div key={plant.id} className="cursor-pointer group" onClick={() => onPlantClick(plant)}>
          <div className="relative overflow-hidden rounded-lg">
             <Image
                src={plant.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                alt={plant.name}
                width={400}
                height={500}
                className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
            />
            {plant.status === 'fallecida' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <HeartCrack className="h-12 w-12 text-white/80" />
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
               <h3 className="font-headline text-xl font-bold text-white truncate">{plant.name}</h3>
               {isCommunity && (
                 <div className="flex items-center gap-2 mt-1">
                   <Avatar className="h-6 w-6">
                     <AvatarImage src={plant.ownerPhotoURL} />
                     <AvatarFallback>{plant.ownerName?.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <span className="text-xs text-white/80">{plant.ownerName}</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Dialog para Editar Planta (más complejo)
function EditPlantDialog({ plant, isOpen, setIsOpen, onSave, onDelete, onAddEvent, onRemoveEvent, onQuickAddEvent, onFetchInfo }: any) {
  const [editedPlant, setEditedPlant] = useState(plant);
  const [newEventNote, setNewEventNote] = useState("");
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnosePlantOutput | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [plantInfo, setPlantInfo] = useState<PlantInfoOutput | null>(null);
  const [isInfoLoading, setIsInfoLoading] = useState(false);


  useEffect(() => {
    setEditedPlant(plant);
    setDiagnoseResult(null); // Reset diagnosis on new plant
    setPlantInfo(null); // Reset info on new plant
  }, [plant]);

  const handleChange = (field: keyof Plant, value: any) => {
    setEditedPlant({ ...editedPlant, [field]: value });
  };
  
  const handleAddNoteConfirm = () => {
      onAddEvent(plant.id, { type: 'nota', date: newEventDate, note: newEventNote });
      setNewEventNote("");
      setIsNotePopoverOpen(false);
  };

  const handleDiagnose = async () => {
    if (!editedPlant.image) {
      alert("Se necesita una imagen para el diagnóstico.");
      return;
    }
    setIsDiagnosing(true);
    try {
      const result = await diagnosePlant({
        photoDataUri: editedPlant.image,
        description: `La planta se llama ${editedPlant.name}. Notas adicionales: ${editedPlant.notes || 'ninguna'}`
      });
      setDiagnoseResult(result);
    } catch (error) {
      console.error(error);
      alert("Error al obtener el diagnóstico.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleFetchInfo = async () => {
      setIsInfoLoading(true);
      try {
          const info = await getPlantInfo({ plantName: editedPlant.name });
          setPlantInfo(info);
      } catch (error) {
          console.error("Error fetching plant info:", error);
      } finally {
          setIsInfoLoading(false);
      }
  };


  const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'robado'];
  const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
  const locationOptions: Plant['location'][] = ['interior', 'exterior'];
  const statusOptions: Plant['status'][] = ['viva', 'fallecida', 'intercambiada'];

  const eventIcons = {
    riego: <Droplets className="h-4 w-4 text-blue-500" />,
    poda: <Scissors className="h-4 w-4 text-gray-500" />,
    transplante: <Shovel className="h-4 w-4 text-orange-500" />,
    foto: <Camera className="h-4 w-4 text-purple-500" />,
    plaga: <Bug className="h-4 w-4 text-red-500" />,
    fertilizante: <Beaker className="h-4 w-4 text-green-500" />,
    nota: <History className="h-4 w-4 text-yellow-500" />,
  };
  
  if (!editedPlant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <Tabs defaultValue="details" className="w-full">
            <div className="flex justify-between items-start">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-3xl font-bold font-headline">{editedPlant.name}</DialogTitle>
                    <DialogDescription>Modifica los detalles de tu planta.</DialogDescription>
                </DialogHeader>
                <TabsList>
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                    <TabsTrigger value="log">Bitácora</TabsTrigger>
                    <TabsTrigger value="gallery">Galería</TabsTrigger>
                    <TabsTrigger value="ai-diag">Diagnóstico IA</TabsTrigger>
                    <TabsTrigger value="ai-info">Info IA</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="details" className="overflow-y-auto max-h-[70vh] p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna Izquierda */}
                    <div className="space-y-4">
                        <InputGroup label="Nombre de la Planta" value={editedPlant.name} onChange={(e) => handleChange('name', e.target.value)} />
                        <InputGroup type="date" label="Fecha de Adquisición" value={editedPlant.date} onChange={(e) => handleChange('date', e.target.value)} />
                        <SelectGroup label="Tipo de Adquisición" value={editedPlant.acquisitionType} onValueChange={(v) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                        {editedPlant.acquisitionType === 'compra' && <InputGroup label="Precio" value={editedPlant.price} onChange={(e) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                        {editedPlant.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={editedPlant.giftFrom} onChange={(e) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" />}
                        {editedPlant.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={editedPlant.exchangeSource} onChange={(e) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" />}
                         {editedPlant.acquisitionType === 'robado' && <InputGroup label="Robado de" value={editedPlant.stolenFrom} onChange={(e) => handleChange('stolenFrom', e.target.value)} placeholder="Ubicación" />}

                        <TextareaGroup label="Notas Generales" value={editedPlant.notes} onChange={(e) => handleChange('notes', e.target.value)} />
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-4">
                        <InputGroup label="URL de la Imagen" value={editedPlant.image} onChange={(e) => handleChange('image', e.target.value)} placeholder="https://example.com/plant.jpg" />
                        {editedPlant.image && <img src={editedPlant.image} alt={editedPlant.name} className="rounded-lg object-cover w-full h-40" />}
                        <SelectGroup label="Comienzo como" value={editedPlant.startType} onValueChange={(v) => handleChange('startType', v)} options={startTypeOptions} />
                        <SelectGroup label="Ubicación" value={editedPlant.location} onValueChange={(v) => handleChange('location', v)} options={locationOptions} />
                        <SelectGroup label="Estado Actual" value={editedPlant.status} onValueChange={(v) => handleChange('status', v)} options={statusOptions} />
                         {editedPlant.status === 'intercambiada' && <InputGroup label="Destino del Intercambio" value={editedPlant.exchangeDest} onChange={(e) => handleChange('exchangeDest', e.target.value)} placeholder="Ej: amigo, vivero" />}

                    </div>
                </div>
            </TabsContent>
            
            <TabsContent value="log" className="overflow-y-auto max-h-[70vh] p-1">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Eventos Recientes</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onQuickAddEvent('riego')}><Droplets className="mr-1 h-4 w-4"/>Regar</Button>
                        <Button variant="outline" size="sm" onClick={() => onQuickAddEvent('poda')}><Scissors className="mr-1 h-4 w-4"/>Podar</Button>
                        <Button variant="outline" size="sm" onClick={() => onQuickAddEvent('transplante')}><Shovel className="mr-1 h-4 w-4"/>Transplantar</Button>
                         <Button variant="outline" size="sm" onClick={() => onQuickAddEvent('fertilizante')}><Beaker className="mr-1 h-4 w-4"/>Fertilizar</Button>
                        <Button variant="outline" size="sm" onClick={() => onQuickAddEvent('plaga')}><Bug className="mr-1 h-4 w-4"/>Plaga</Button>
                        
                        <Popover open={isNotePopoverOpen} onOpenChange={setIsNotePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm"><History className="mr-1 h-4 w-4"/>Añadir Nota</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Nueva Nota</h4>
                                    <p className="text-sm text-muted-foreground">Añade una nota al historial de la planta.</p>
                                </div>
                                <div className="grid gap-2">
                                    <Input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                                    <Textarea value={newEventNote} onChange={(e) => setNewEventNote(e.target.value)} placeholder="Escribe tu nota aquí..." />
                                    <Button onClick={handleAddNoteConfirm}>Guardar Nota</Button>
                                </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="space-y-3">
                    {editedPlant.events?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((event: PlantEvent) => (
                        <div key={event.id} className="flex items-start justify-between p-2 rounded-md bg-secondary/50">
                            <div className="flex items-start gap-3">
                                {eventIcons[event.type]}
                                <div>
                                    <p className="font-semibold capitalize">{event.type}</p>
                                    <p className="text-sm text-muted-foreground">{event.note}</p>
                                    <p className="text-xs text-muted-foreground/70">{format(parseISO(event.date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveEvent(event.id)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {editedPlant.events?.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No hay eventos registrados.</p>}
                </div>
            </TabsContent>
            
            <TabsContent value="gallery">
                 <PlantDetailDialog plant={plant} isOpen={false} setIsOpen={()=>{}} onUpdatePlant={()=>{}} />
            </TabsContent>

            <TabsContent value="ai-diag" className="p-1">
                 <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold">Diagnóstico con IA</h3>
                    <p className="text-sm text-muted-foreground mb-4">Usa IA para analizar una foto de tu planta y obtener un diagnóstico de salud y recomendaciones.</p>
                    <Button onClick={handleDiagnose} disabled={isDiagnosing}>
                        {isDiagnosing ? "Analizando..." : <><Bot className="mr-2 h-4 w-4" /> Analizar Foto Principal</>}
                    </Button>
                </div>
                {isDiagnosing && <Skeleton className="h-40 w-full mt-4" />}
                {diagnoseResult && <AIDiagnosisResult result={diagnoseResult} />}
            </TabsContent>

             <TabsContent value="ai-info" className="p-1">
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold">Obtener Info con IA</h3>
                    <p className="text-sm text-muted-foreground mb-4">Obtén información detallada sobre tu planta, como cuidados, datos curiosos y más.</p>
                    <Button onClick={handleFetchInfo} disabled={isInfoLoading}>
                        {isInfoLoading ? "Buscando..." : <><Bot className="mr-2 h-4 w-4" /> Obtener Info de "{editedPlant.name}"</>}
                    </Button>
                </div>
                {isInfoLoading && <Skeleton className="h-40 w-full mt-4" />}
                {plantInfo && <PlantInfoDisplay info={plantInfo} />}
            </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mr-auto"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente la planta y todos sus datos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(plant.id)}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={() => onSave(plant.id, editedPlant)}><Save className="mr-2 h-4 w-4"/>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function AIDiagnosisResult({ result }: { result: DiagnosePlantOutput }) {
  if (!result) return null;
  const { identification, diagnosis } = result;

  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="p-3 rounded-lg border bg-background">
        <h4 className="font-semibold flex items-center"><Leaf className="mr-2 h-4 w-4 text-primary" />Identificación</h4>
        <p><strong>Nombre Común:</strong> {identification.commonName}</p>
        <p><strong>Nombre Latino:</strong> {identification.latinName}</p>
        {!identification.isPlant && <Badge variant="destructive" className="mt-2">No parece ser una planta</Badge>}
      </div>
      <div className="p-3 rounded-lg border bg-background">
        <h4 className="font-semibold flex items-center"><Heart className="mr-2 h-4 w-4 text-primary" />Diagnóstico de Salud</h4>
        <Badge variant={diagnosis.isHealthy ? 'default' : 'destructive'} className={diagnosis.isHealthy ? 'bg-green-500' : ''}>
            {diagnosis.isHealthy ? 'Saludable' : 'Necesita Atención'}
        </Badge>
        <p className="mt-2"><strong>Análisis:</strong> {diagnosis.diagnosis}</p>
        <p className="mt-2"><strong>Recomendación:</strong> {diagnosis.recommendation}</p>
      </div>
    </div>
  );
}


function PlantInfoDialog({ isOpen, setIsOpen, plantName, info, isLoading }: any) {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Información de: {plantName}</DialogTitle>
                    <DialogDescription>
                        Aquí tienes detalles y consejos de cuidado para tu planta, generados por IA.
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : info ? (
                    <PlantInfoDisplay info={info} />
                ) : (
                    <div className="py-8 text-center">
                        <p>No se pudo cargar la información.</p>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PlantInfoDisplay({ info }: { info: PlantInfoOutput }) {
    const currentMonth = format(new Date(), 'MMMM', { locale: es });

    const isCareSeason = (season: string) => {
        if (!season) return false;
        const lowerSeason = season.toLowerCase();
        const monthMap: { [key: string]: string[] } = {
            'invierno': ['diciembre', 'enero', 'febrero'],
            'primavera': ['marzo', 'abril', 'mayo'],
            'verano': ['junio', 'julio', 'agosto'],
            'otoño': ['septiembre', 'octubre', 'noviembre'],
        };
        for (const s of Object.keys(monthMap)) {
            if (lowerSeason.includes(s) && monthMap[s].includes(currentMonth)) {
                return true;
            }
        }
        return false;
    };
    
    return (
        <div className="space-y-4 py-4 text-sm">
            <div className="p-3 rounded-lg border">
                <h4 className="font-semibold font-headline flex items-center"><Lightbulb className="mr-2 h-4 w-4 text-primary" />Cuidados Básicos</h4>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li><strong>Luz:</strong> {info.careInfo.light}</li>
                    <li><strong>Riego:</strong> {info.careInfo.water}</li>
                    <li><strong>Temperatura:</strong> {info.careInfo.temperature}</li>
                </ul>
            </div>
            <div className="p-3 rounded-lg border">
                <h4 className="font-semibold font-headline flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-primary" />Cuidados Estacionales</h4>
                <div className="mt-2 space-y-2">
                    <div className={`p-2 rounded-md ${isCareSeason(info.seasonalCare.fertilize) ? 'bg-primary/20 border border-primary' : ''}`}>
                         <strong>Fertilizar:</strong> {info.seasonalCare.fertilize}
                         {isCareSeason(info.seasonalCare.fertilize) && <Badge className="ml-2">Ahora</Badge>}
                    </div>
                     <div className={`p-2 rounded-md ${isCareSeason(info.seasonalCare.prune) ? 'bg-primary/20 border border-primary' : ''}`}>
                         <strong>Podar:</strong> {info.seasonalCare.prune}
                          {isCareSeason(info.seasonalCare.prune) && <Badge className="ml-2">Ahora</Badge>}
                    </div>
                     <div className={`p-2 rounded-md ${isCareSeason(info.seasonalCare.repot) ? 'bg-primary/20 border border-primary' : ''}`}>
                         <strong>Transplantar:</strong> {info.seasonalCare.repot}
                         {isCareSeason(info.seasonalCare.repot) && <Badge className="ml-2">Ahora</Badge>}
                    </div>
                </div>
            </div>
             <div className="p-3 rounded-lg border">
                <h4 className="font-semibold font-headline flex items-center"><Info className="mr-2 h-4 w-4 text-primary" />Info General</h4>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                    <li><strong>Altura Máxima:</strong> {info.generalInfo.maxHeight}</li>
                    <li><strong>Época de Floración:</strong> {info.generalInfo.bloomSeason}</li>
                    <li><strong>Colores de Flores:</strong> {info.generalInfo.flowerColors}</li>
                </ul>
            </div>
             <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-accent-foreground">
                <h4 className="font-semibold font-headline flex items-center"><Sparkles className="mr-2 h-4 w-4 text-accent" />Dato Curioso</h4>
                <p className="mt-1 text-sm">{info.funFact}</p>
            </div>
        </div>
    );
}

// Dialog de Wishlist
function WishlistFormDialog({ isOpen, setIsOpen, onSave, item }: any) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setNotes(item.notes || '');
    } else {
      setName('');
      setNotes('');
    }
  }, [item, isOpen]);

  const handleSubmit = () => {
    if (!name) {
      alert("El nombre es obligatorio.");
      return;
    }
    onSave({ name, notes }, item?.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar Deseo" : "Nuevo Deseo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input placeholder="Nombre de la planta" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Notas (dónde encontrarla, precio, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WishlistGrid({ items, onEdit, onDelete, onAddNew }: any) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ListTodo className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Tu lista de deseos está vacía</h3>
        <p className="mt-1 text-sm text-muted-foreground">Añade las plantas que te gustaría tener.</p>
        <Button className="mt-6" onClick={onAddNew}><Plus className="mr-2 h-4 w-4"/>Añadir Artículo</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-right">
        <Button onClick={onAddNew}><Plus className="mr-2 h-4 w-4"/>Añadir Artículo</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item: WishlistItem) => (
          <div key={item.id} className="p-4 bg-background rounded-lg border flex flex-col">
            <div className="flex-grow">
              <h4 className="font-bold text-lg">{item.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(item)}>Editar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Eliminar</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                    <AlertDialogDescription>Se eliminará "{item.name}" de tu lista de deseos.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(item.id)}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function CalendarDialog({ isOpen, setIsOpen, plants, onFetchPlantInfo, setPlantInfoOpen }: any) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedPlantForInfo, setSelectedPlantForInfo] = useState<string | null>(null);

    const allEvents = useMemo(() => {
        return plants.flatMap((plant: Plant) => 
            (plant.events || []).map(event => ({ ...event, plantName: plant.name, plantId: plant.id }))
        );
    }, [plants]);

    const eventsByDay = useMemo(() => {
        const grouped: { [key: string]: typeof allEvents } = {};
        allEvents.forEach(event => {
            const day = format(parseISO(event.date), 'yyyy-MM-dd');
            if (!grouped[day]) {
                grouped[day] = [];
            }
            grouped[day].push(event);
        });
        return grouped;
    }, [allEvents]);

    const daysWithEvents = useMemo(() => {
        return Object.keys(eventsByDay).map(dayStr => new Date(dayStr + 'T12:00:00'));
    }, [eventsByDay]);

    const selectedDayEvents = date ? eventsByDay[format(date, 'yyyy-MM-dd')] || [] : [];
    
    const eventIcons = {
        riego: <Droplets className="h-5 w-5 text-blue-500" />,
        poda: <Scissors className="h-5 w-5 text-gray-500" />,
        transplante: <Shovel className="h-5 w-5 text-orange-500" />,
        foto: <Camera className="h-5 w-5 text-purple-500" />,
        plaga: <Bug className="h-5 w-5 text-red-500" />,
        fertilizante: <Beaker className="h-5 w-5 text-green-500" />,
        nota: <History className="h-5 w-5 text-yellow-500" />,
    };

    const handlePlantInfoSelect = (plantId: string) => {
        const plant = plants.find((p:Plant) => p.id === plantId);
        if (plant) {
            onFetchPlantInfo(plant.name);
        }
    };

     const exportToIcs = () => {
        let icsString = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PlantPal//NONSGML v1.0//EN\n';

        allEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const formattedDate = format(eventDate, "yyyyMMdd'T'HHmmss'Z'");
            const summary = `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}: ${event.plantName}`;
            
            icsString += 'BEGIN:VEVENT\n';
            icsString += `UID:${event.id}@plantpal.app\n`;
            icsString += `DTSTAMP:${formattedDate}\n`;
            icsString += `DTSTART;VALUE=DATE:${format(eventDate, 'yyyyMMdd')}\n`;
            icsString += `SUMMARY:${summary}\n`;
            icsString += `DESCRIPTION:${event.note.replace(/\n/g, '\\n')}\n`;
            icsString += 'END:VEVENT\n';
        });

        icsString += 'END:VCALENDAR';

        const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'plantpal_events.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Calendario de Cuidados</DialogTitle>
                    <DialogDescription>
                        Visualiza los eventos de tus plantas y planifica cuidados futuros.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            locale={es}
                            modifiers={{ daysWithEvents }}
                            modifiersStyles={{ daysWithEvents: { borderColor: 'hsl(var(--primary))', borderWidth: '2px', borderRadius: '9999px' } }}
                        />
                         <div className="mt-4">
                            <Button onClick={exportToIcs}>Exportar Eventos (.ics)</Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Eventos del día</h3>
                             <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                {selectedDayEvents.length > 0 ? selectedDayEvents.map(event => (
                                    <div key={event.id} className="flex items-start gap-3 p-2 rounded-md bg-secondary/50">
                                        {eventIcons[event.type]}
                                        <div>
                                            <p className="font-semibold">{event.plantName}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{event.type}: {event.note}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground text-center py-4">No hay eventos para este día.</p>}
                            </div>
                        </div>
                        <Separator />
                        <div>
                             <h3 className="font-semibold mb-2">Recomendaciones del Mes</h3>
                             <Select onValueChange={handlePlantInfoSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una planta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {plants.map((p:Plant) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StatsDialog({ isOpen, setIsOpen, plants }: any) {
  const stats = useMemo(() => {
    const total = plants.length;
    const alive = plants.filter((p:Plant) => p.status === 'viva').length;
    const deceased = plants.filter((p:Plant) => p.status === 'fallecida').length;
    const traded = plants.filter((p: Plant) => p.status === 'intercambiada').length;
    const acquisition = plants.reduce((acc:any, p:Plant) => {
      acc[p.acquisitionType] = (acc[p.acquisitionType] || 0) + 1;
      return acc;
    }, {});
    const location = plants.reduce((acc:any, p:Plant) => {
      acc[p.location] = (acc[p.location] || 0) + 1;
      return acc;
    }, {});

    return { total, alive, deceased, traded, acquisition, location };
  }, [plants]);

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-4 bg-background rounded-lg border flex items-center gap-4">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Estadísticas del Jardín</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          <StatCard icon={Leaf} label="Plantas Totales" value={stats.total} color="bg-green-500" />
          <StatCard icon={Heart} label="Vivas" value={stats.alive} color="bg-blue-500" />
          <StatCard icon={HeartCrack} label="Fallecidas" value={stats.deceased} color="bg-red-500" />
          <StatCard icon={DollarSign} label="Compradas" value={stats.acquisition.compra || 0} color="bg-yellow-500" />
          <StatCard icon={Gift} label="Regaladas" value={stats.acquisition.regalo || 0} color="bg-pink-500" />
          <StatCard icon={ArrowRightLeft} label="Intercambiadas" value={stats.acquisition.intercambio || 0} color="bg-purple-500" />
          <StatCard icon={Sun} label="Exterior" value={stats.location.exterior || 0} color="bg-orange-500" />
          <StatCard icon={Home} label="Interior" value={stats.location.interior || 0} color="bg-indigo-500" />
        </div>
      </DialogContent>
    </Dialog>
  );
}


function CropRecommenderDialog({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (isOpen: boolean) => void }) {
    const [userQuery, setUserQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<CropRecommenderOutput | null>(null);

    const handleRecommend = async () => {
        if (!userQuery) return;
        setIsLoading(true);
        setRecommendations(null);
        try {
            const result = await recommendCrops({ userQuery });
            setRecommendations(result);
        } catch (error) {
            console.error(error);
            // Mostrar toast de error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Asistente de Huerta</DialogTitle>
                    <DialogDescription>Describe tu espacio (ej. "balcón soleado", "patio con sombra") y la IA te recomendará qué plantar.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea 
                        placeholder="Tengo un pequeño balcón que recibe sol directo por la mañana..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                    />
                    <Button onClick={handleRecommend} disabled={isLoading || !userQuery}>
                        {isLoading ? 'Pensando...' : 'Obtener Recomendaciones'}
                    </Button>
                </div>
                {isLoading && <div className="mt-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>}
                {recommendations && (
                    <div className="mt-4 space-y-3">
                        <h3 className="font-semibold">Aquí tienes algunas sugerencias:</h3>
                        {recommendations.recommendations.map((rec, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                                <h4 className="font-bold">{rec.name}</h4>
                                <p className="text-sm text-muted-foreground"><strong>Cosecha:</strong> {rec.timeToHarvest}</p>
                                <p className="text-sm text-muted-foreground"><strong>Ubicación:</strong> {rec.plantingLocation}</p>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// -- Componentes de Formulario Genéricos --
const InputGroup = ({ label, type = "text", value, onChange, placeholder }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
  </div>
);

const TextareaGroup = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Textarea value={value || ''} onChange={onChange} placeholder={placeholder} />
  </div>
);

const SelectGroup = ({ label, value, onValueChange, options }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>{value ? value.charAt(0).toUpperCase() + value.slice(1) : `Select ${label}`}</SelectTrigger>
      <SelectContent>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
