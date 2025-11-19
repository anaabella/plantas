'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Sprout, ListTodo, Bot, LogIn, LogOut, Users, Carrot, BarChart3,
  Calendar as CalendarIcon, Droplets, Camera, HeartCrack, Leaf, AlertCircle, Moon, Sun, Monitor
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  getRedirectResult,
} from 'firebase/auth';
import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, doc, onSnapshot } from 'firebase/firestore';
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
import { PlantInfoDialog } from '@/components/plant-info-dialog';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { differenceInDays } from 'date-fns';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

type View = 'my-plants' | 'community' | 'wishlist';

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

  // -- Data fetching effects --
  const userPlantsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'plants'), where('ownerId', '==', user.uid));
  }, [user, firestore]);
  
  useEffect(() => {
    if (!userPlantsQuery) {
      setPlants([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = onSnapshot(userPlantsQuery, snapshot => {
      const userPlants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      setPlants(userPlants);
      setIsLoading(false);
    }, error => {
      console.error("Error fetching user plants:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userPlantsQuery]);

  const communityPlantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Excluye las plantas del usuario actual de la vista de comunidad
    return user ? query(collection(firestore, 'plants'), where('ownerId', '!=', user.uid)) : query(collection(firestore, 'plants'));
  }, [firestore, user]);

  useEffect(() => {
    if (!communityPlantsQuery) {
        setCommunityPlants([]);
        setIsCommunityLoading(false);
        return;
    }
    setIsCommunityLoading(true);
    const unsubscribe = onSnapshot(communityPlantsQuery, snapshot => {
      const allPlants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      setCommunityPlants(allPlants);
      setIsCommunityLoading(false);
    }, error => {
      console.error("Error fetching community plants:", error);
      setIsCommunityLoading(false);
    });
    return () => unsubscribe();
  }, [communityPlantsQuery]);

  const wishlistQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/wishlist`);
  }, [user, firestore]);

  useEffect(() => {
    if (!wishlistQuery) {
        setWishlist([]);
        return;
    }
    const unsubscribe = onSnapshot(wishlistQuery, snapshot => {
      const userWishlist = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem));
      setWishlist(userWishlist);
    }, error => {
      console.error("Error fetching wishlist:", error);
    });
    return () => unsubscribe();
  }, [wishlistQuery]);

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .catch((error) => {
        console.error("Firebase redirect error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          toast({
            variant: "destructive",
            title: "Dominio no autorizado",
            description: "El dominio de esta aplicación no está autorizado para el inicio de sesión. Por favor, añádelo en la configuración de autenticación de tu proyecto de Firebase.",
            duration: 10000,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error de inicio de sesión",
            description: "No se pudo completar el inicio de sesión. Revisa la consola para más detalles.",
          });
        }
      });
  }, [auth, toast]);

  // -- Auth Handlers --
  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Error initiating sign-in redirect:", error);
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: "No se pudo iniciar el proceso de autenticación con Google.",
      });
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast({ title: "Has cerrado sesión." });
  };

  // -- Plant Handlers --
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
    if (!firestore || !user) return;
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
    if (!firestore || !user) return;
    try {
      await deleteDoc(doc(firestore, 'plants', plantId));
      toast({ title: "Planta eliminada" });
    } catch (error: any) {
      console.error("Error deleting plant:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar la planta: ${error.message}` });
    }
  };

  // -- Wishlist Handlers --
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

  // -- UI Handlers --
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
          setPlantInfo(null);
      } finally {
          setIsPlantInfoLoading(false);
      }
  };

  // -- Computed Data --
  const filteredPlants = useMemo(() => {
    const source = view === 'my-plants' ? plants : communityPlants;
    if (!searchTerm) return source;
    return source.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [plants, communityPlants, view, searchTerm]);
  
  const filteredWishlist = useMemo(() => {
    if (!searchTerm) return wishlist;
    return wishlist.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [wishlist, searchTerm]);

  const plantsNeedingAttention = useMemo(() => {
    const today = new Date();
    return plants
        .filter(plant => plant.status === 'viva')
        .map(plant => {
            const needsWatering = !plant.lastWatered || differenceInDays(today, new Date(plant.lastWatered)) > 7;
            const needsPhoto = !plant.lastPhotoUpdate || differenceInDays(today, new Date(plant.lastPhotoUpdate)) > 30;
            return { plant, needsWatering, needsPhoto };
        })
        .filter(item => item.needsWatering || item.needsPhoto);
  }, [plants]);

  // -- Main Render --
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
        
        {view === 'my-plants' && plantsNeedingAttention.length > 0 && (
            <AttentionSection plantsNeedingAttention={plantsNeedingAttention} onPlantClick={openPlantEditor} />
        )}

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
            onAddNew={() => openWishlistForm(undefined)}
            onSave={handleSaveWishlistItem}
          />
        )}
      </main>
      
      {/* Dialogs */}
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
          onSave={handleUpdatePlant}
          onDelete={handleDeletePlant}
        />
      )}
       <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={(id, data) => handleUpdatePlant(id, data)}
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

// Header Component
function Header({ view, onViewChange, user, onLogin, onLogout, onAddPlant, onOpenWishlist, onOpenCalendar, onOpenStats, onOpenCropRecommender, isUserLoading }: any) {
  const { setTheme } = useTheme();
  
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
              <PopoverTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Usuario'} />
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="p-2 text-center">
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Separator />
                <div className="p-1">
                    <Button variant="ghost" className="w-full justify-start" onClick={onAddPlant}><Plus className="mr-2 h-4 w-4" />Añadir Planta</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 mr-2" />
                          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 mr-2" />
                          Cambiar Tema
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Claro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          Oscuro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          Sistema
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="destructive" className="w-full justify-start mt-1" onClick={onLogout}><LogOut className="mr-2 h-4 w-4" />Cerrar Sesión</Button>
                </div>
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

// Attention Section
function AttentionSection({ plantsNeedingAttention, onPlantClick }: any) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold font-headline mb-4 flex items-center">
                <AlertCircle className="mr-2 h-6 w-6 text-yellow-500" />
                Necesitan Atención
            </h2>
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {plantsNeedingAttention.map(({ plant, needsWatering, needsPhoto }: any) => (
                        <CarouselItem key={plant.id} className="pl-4 md:basis-1/3 lg:basis-1/4">
                            <div className="p-1">
                                <div onClick={() => onPlantClick(plant)} className="cursor-pointer group">
                                    <div className="relative overflow-hidden rounded-lg border">
                                        <Image
                                            src={plant.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                                            alt={plant.name}
                                            width={400}
                                            height={500}
                                            className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute top-0 right-0 m-2 flex flex-col gap-2">
                                            {needsWatering && (
                                                <div className="p-2 rounded-full bg-blue-500/80 text-white" title="Necesita Riego">
                                                    <Droplets className="h-5 w-5" />
                                                </div>
                                            )}
                                            {needsPhoto && (
                                                <div className="p-2 rounded-full bg-purple-500/80 text-white" title="Necesita Foto">
                                                    <Camera className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                            <h3 className="font-headline text-lg font-bold text-white truncate">{plant.name}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
            <Separator className="mt-8"/>
        </div>
    );
}


// Plants Grid
function PlantsGrid({ plants, onPlantClick, isLoading, isCommunity = false }: any) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[350px] w-full rounded-lg" />)}
      </div>
    );
  }

  if (plants.length === 0 && !isLoading) {
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

// Wishlist Grid
function WishlistGrid({ items, onEdit, onDelete, onAddNew, onSave }: any) {
  const [isAiSearchOpen, setIsAiSearchOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { identifyPlant } = require('@/ai/flows/identify-plant-flow');

  const handleAiSearchClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const photoDataUri = e.target?.result as string;
      if (!photoDataUri) return;
      
      setIsAiLoading(true);
      try {
        const result = await identifyPlant({ photoDataUri });
        if (result.isPlant) {
          onSave({ name: result.commonName, notes: `Nombre científico: ${result.latinName}` });
          toast({ title: "¡Planta Identificada!", description: `${result.commonName} ha sido añadida a tu lista de deseos.` });
        } else {
          toast({ variant: 'destructive', title: "No es una planta", description: "La IA no pudo identificar una planta en la imagen." });
        }
      } catch (error) {
        console.error("Error identifying plant:", error);
        toast({ variant: 'destructive', title: "Error de IA", description: "No se pudo identificar la planta." });
      } finally {
        setIsAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };
  
  if (items.length === 0 && !isAiLoading) {
    return (
      <div className="text-center py-16">
        <ListTodo className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Tu lista de deseos está vacía</h3>
        <p className="mt-1 text-sm text-muted-foreground">Añade las plantas que te gustaría tener.</p>
        <div className="mt-6 flex justify-center gap-4">
            <Button onClick={onAddNew}><Plus className="mr-2 h-4 w-4"/>Añadir Manualmente</Button>
            <Button variant="outline" onClick={handleAiSearchClick} disabled={isAiLoading}>
                <Bot className="mr-2 h-4 w-4" /> {isAiLoading ? 'Identificando...' : 'Buscar por Foto (IA)'}
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-right flex justify-end gap-4">
        <Button onClick={onAddNew}><Plus className="mr-2 h-4 w-4"/>Añadir Manualmente</Button>
        <Button variant="outline" onClick={handleAiSearchClick} disabled={isAiLoading}>
            <Bot className="mr-2 h-4 w-4" /> {isAiLoading ? 'Identificando...' : 'Buscar por Foto (IA)'}
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
       {isAiLoading && <p className="text-center text-muted-foreground">Identificando planta con IA...</p>}
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
