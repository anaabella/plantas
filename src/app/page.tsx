'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Sprout, Gift, DollarSign, Calendar as CalendarIcon,
  Leaf, HeartCrack, ListTodo, Bot, LogIn, LogOut, Users, Carrot, BarChart3
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useUser, useAuth, useFirestore } from '@/firebase';
import { collection, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getPlantInfo, type PlantInfoOutput } from '@/ai/flows/diagnose-plant-flow';
import { AddPlantDialog } from '@/components/add-plant-dialog';
import { EditPlantDialog } from '@/components/edit-plant-dialog';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';
import { WishlistFormDialog } from '@/components/wishlist-form-dialog';
import { CalendarDialog } from '@/components/calendar-dialog';
import { StatsDialog } from '@/components/stats-dialog';
import { CropRecommenderDialog } from '@/components/crop-recommender-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


// Tipos
export type Plant = {
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

export type PlantEvent = {
  id: string;
  type: 'riego' | 'poda' | 'transplante' | 'foto' | 'plaga' | 'fertilizante' | 'nota';
  date: string; // ISO date string
  note: string;
};

export type WishlistItem = {
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

export function PlantInfoDialog({ isOpen, setIsOpen, plantName, info, isLoading }: any) {
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

export function PlantInfoDisplay({ info }: { info: PlantInfoOutput }) {
    const { Lightbulb, Calendar: CalendarIcon, Info, Sparkles } = require('lucide-react');
    const { Badge } = require('@/components/ui/badge');
    const { format, es } = require('date-fns');

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
