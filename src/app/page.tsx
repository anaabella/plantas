'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Sprout, ListTodo, LogIn, LogOut, Users, Carrot, BarChart3,
  Calendar as CalendarIcon, Droplets, Camera, HeartCrack, Leaf, AlertCircle, Moon, Sun, Monitor,
  Gift, ShoppingBag, RefreshCw, Heart, Package, Clock, Scissors, Circle, Skull
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
  AlertDialogFooter,
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
import { collection, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, doc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPlantDialog } from '@/components/add-plant-dialog';
import { EditPlantDialog } from '@/components/edit-plant-dialog';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';
import { WishlistFormDialog } from '@/components/wishlist-form-dialog';
import { CalendarDialog } from '@/components/calendar-dialog';
import { StatsDialog } from '@/components/stats-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { WishlistDetailDialog } from '@/components/wishlist-detail-dialog';

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
  acquisitionType: 'compra' | 'regalo' | 'intercambio' | 'rescatada';
  price?: string;
  giftFrom?: string;
  rescuedFrom?: string;
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
  plantId?: string; // To link to the original plant
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
  const [plantToAddFromWishlist, setPlantToAddFromWishlist] = useState<Partial<Plant> | null>(null);

  const [isWishlistFormOpen, setIsWishlistFormOpen] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState<WishlistItem | null>(null);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const [isWishlistDetailOpen, setIsWishlistDetailOpen] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

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
      
      // If added from wishlist, remove from wishlist
      if (plantToAddFromWishlist && plantToAddFromWishlist.id) {
        await handleDeleteWishlistItem(plantToAddFromWishlist.id);
        setPlantToAddFromWishlist(null);
      }
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
       // Also update the selected plant if it's the one being edited, to reflect changes in detail view
      if (selectedPlant && selectedPlant.id === plantId) {
        setSelectedPlant(prev => prev ? { ...prev, ...updatedData } : null);
      }
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
      setIsWishlistDetailOpen(false);
      setSelectedWishlistItem(null);
    } catch (error: any) {
      console.error("Error deleting wishlist item:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar: ${error.message}` });
    }
  };
  
  const handleToggleWishlist = async (plant: Plant) => {
    if (!user || !firestore) {
        toast({ variant: "destructive", title: "Necesitas iniciar sesión", description: "Inicia sesión para añadir plantas a tu lista de deseos." });
        return;
    }

    const wishlistRef = collection(firestore, `users/${user.uid}/wishlist`);
    const q = query(wishlistRef, where("plantId", "==", plant.id));
    const existing = await getDocs(q);

    if (existing.empty) {
        // Add to wishlist
        await addDoc(wishlistRef, {
            name: plant.name,
            image: plant.image,
            plantId: plant.id
        });
        toast({ 
            title: "¡Añadido a tus deseos!",
            description: `Se ha notificado a ${plant.ownerName || 'el dueño'} que te interesa su planta ${plant.name}.`
        });
    } else {
        // Remove from wishlist
        const batch = writeBatch(firestore);
        existing.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        toast({ title: "Eliminado de tus deseos" });
    }
  };

  const handleGotItFromWishlist = (item: WishlistItem) => {
    setPlantToAddFromWishlist({
      id: item.id,
      name: item.name,
      image: item.image,
    });
    setIsWishlistDetailOpen(false);
    setIsAddDialogOpen(true);
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
    setIsWishlistDetailOpen(false); // Close detail if editing
    setIsWishlistFormOpen(true);
  };

  const openWishlistDetail = (item: WishlistItem) => {
    setSelectedWishlistItem(item);
    setIsWishlistDetailOpen(true);
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

  const wishlistPlantIds = useMemo(() => {
      return new Set(wishlist.map(item => item.plantId));
  }, [wishlist]);

  // -- Main Render --
  return (
    <div className="min-h-screen bg-secondary/50 font-body text-foreground">
      <Header
        view={view}
        onViewChange={setView}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onAddPlant={() => { setPlantToAddFromWishlist(null); setIsAddDialogOpen(true); }}
        onOpenWishlist={() => setView('wishlist')}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
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
          <PlantsGrid
            plants={filteredPlants}
            onPlantClick={openPlantDetails}
            isLoading={isCommunityLoading}
            isCommunity={true}
            onToggleWishlist={handleToggleWishlist}
            wishlistPlantIds={wishlistPlantIds}
            user={user}
          />
        )}
        {view === 'wishlist' && (
          <WishlistGrid
            items={filteredWishlist}
            onItemClick={openWishlistDetail}
            onAddNew={() => openWishlistForm(undefined)}
          />
        )}
      </main>
      
      {/* Dialogs */}
      <AddPlantDialog
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
        onSave={handleAddPlant}
        initialData={plantToAddFromWishlist}
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
        onUpdatePlant={(id:string, data:any) => handleUpdatePlant(id, data)}
        isCommunityView={view === 'community'}
      />
      <WishlistFormDialog
        isOpen={isWishlistFormOpen}
        setIsOpen={setIsWishlistFormOpen}
        onSave={handleSaveWishlistItem}
        item={editingWishlistItem}
      />
       {selectedWishlistItem && (
        <WishlistDetailDialog
          item={selectedWishlistItem}
          isOpen={isWishlistDetailOpen}
          setIsOpen={setIsWishlistDetailOpen}
          onGotIt={handleGotItFromWishlist}
          onEdit={openWishlistForm}
          onDelete={handleDeleteWishlistItem}
        />
      )}
      <CalendarDialog
        isOpen={isCalendarOpen}
        setIsOpen={setIsCalendarOpen}
        plants={plants}
      />
      <StatsDialog
        isOpen={isStatsOpen}
        setIsOpen={setIsStatsOpen}
        plants={plants}
      />
    </div>
  );
}

// Header Component
function Header({ view, onViewChange, user, onLogin, onLogout, onAddPlant, onOpenWishlist, onOpenCalendar, onOpenStats, isUserLoading }: any) {
  const { setTheme } = useTheme();
  
  const NavButton = ({ activeView, targetView, icon: Icon, children, ...props }: any) => (
    <Button
      variant={activeView === targetView ? "secondary" : "ghost"}
      onClick={() => onViewChange(targetView)}
      className="flex items-center gap-2"
      {...props}
    >
      <Icon className="h-5 w-5" />
      <span className="hidden sm:inline">{children}</span>
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-4 flex items-center">
          <Sprout className="h-6 w-6 text-primary" />
          <h1 className="ml-2 hidden font-headline text-xl font-bold sm:block">PlantPal</h1>
        </div>
        
        <nav className="flex flex-1 items-center justify-start gap-1 sm:gap-2">
          {user && <NavButton activeView={view} targetView="my-plants" icon={Leaf}>Mis Plantas</NavButton>}
          <NavButton activeView={view} targetView="community" icon={Users}>Comunidad</NavButton>
          {user && (
            <Button variant="ghost" size="icon" onClick={onAddPlant} className="sm:hidden">
              <Plus className="h-5 w-5" />
            </Button>
          )}
           {user && (
            <Button variant="outline" onClick={onAddPlant} className="hidden sm:flex">
              <Plus className="h-5 w-5 mr-2" />Añadir Planta
            </Button>
          )}
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          {user && <Button variant="ghost" size="icon" onClick={onOpenCalendar}><CalendarIcon className="h-5 w-5" /></Button>}
          <Separator orientation="vertical" className="h-6 mx-1 sm:mx-2" />
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
                    <Button variant="ghost" className="w-full justify-start" onClick={onOpenWishlist}><ListTodo className="mr-2 h-4 w-4" />Lista de Deseos</Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={onOpenStats}><BarChart3 className="mr-2 h-4 w-4" />Estadísticas</Button>
                    <Separator className='my-1' />
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
            <Button onClick={handleLogin}><LogIn className="mr-2 h-4 w-4" />Acceder</Button>
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
                        <CarouselItem key={plant.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
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
                                         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4">
                                            <h3 className="font-headline text-md sm:text-lg font-bold text-white truncate">{plant.name}</h3>
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
function PlantsGrid({ plants, onPlantClick, isLoading, isCommunity = false, onToggleWishlist, wishlistPlantIds, user }: any) {
  
  const acquisitionIcons: { [key in Plant['acquisitionType']]: React.ReactElement } = {
    compra: <ShoppingBag className="h-4 w-4" />,
    regalo: <Gift className="h-4 w-4" />,
    intercambio: <RefreshCw className="h-4 w-4" />,
    rescatada: <Heart className="h-4 w-4" />,
  };

  const startIcons: { [key in Plant['startType']]: React.ReactElement } = {
      planta: <Sprout className="h-4 w-4" />,
      gajo: <Scissors className="h-4 w-4" />,
      raiz: <Package className="h-4 w-4" />,
      semilla: <Circle className="h-4 w-4" />,
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-[350px] sm:h-[450px] w-full rounded-lg" />)}
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
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
      {plants.map((plant: Plant) => {
        const isInWishlist = wishlistPlantIds?.has(plant.id);
        
        return (
            <div key={plant.id} className="group">
                <div className="relative overflow-hidden rounded-lg">
                <div className="cursor-pointer" onClick={() => onPlantClick(plant)}>
                    <Image
                        src={plant.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                        alt={plant.name}
                        width={400}
                        height={500}
                        className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
                {plant.status !== 'viva' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex flex-col items-center text-white/90">
                            {plant.status === 'fallecida' && <HeartCrack className="h-8 w-8 sm:h-10 sm:w-10" />}
                            {plant.status === 'intercambiada' && <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10" />}
                            <p className="mt-2 font-semibold capitalize text-sm sm:text-base">{plant.status}</p>
                        </div>
                    </div>
                )}
                {isCommunity && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 flex items-center justify-between gap-2">
                     <div onClick={() => onPlantClick(plant)} className='flex items-center gap-2 cursor-pointer flex-grow min-w-0'>
                        <Avatar className="h-8 w-8 border-2 border-background">
                           <AvatarImage src={plant.ownerPhotoURL} />
                           <AvatarFallback>{plant.ownerName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                            <h3 className="font-headline text-md sm:text-lg font-bold text-white truncate">{plant.name}</h3>
                            <span className="text-xs text-white/80 hidden sm:inline truncate">{plant.ownerName}</span>
                        </div>
                     </div>
                     {user && (
                         <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0 text-white hover:text-red-400 hover:bg-white/20" onClick={() => onToggleWishlist(plant)}>
                           <Heart className={`h-5 w-5 transition-all ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                         </Button>
                     )}
                   </div>
                )}
              </div>
              <div className="p-2 bg-transparent">
                  {!isCommunity ? (
                    <>
                        <h3 className="font-headline text-lg font-bold truncate cursor-pointer" onClick={() => onPlantClick(plant)}>{plant.name}</h3>
                        <div className="mt-1 space-y-1 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{formatDistanceToNow(new Date(plant.date), { locale: es, addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center gap-2 capitalize">
                                {acquisitionIcons[plant.acquisitionType] || <Sprout className="h-4 w-4"/>}
                                <span>
                                    {plant.acquisitionType === 'compra' && plant.price ? `Costó $${plant.price}` : plant.acquisitionType}
                                </span>
                            </div>
                             <div className="flex items-center gap-2 capitalize">
                                {startIcons[plant.startType] || <Sprout className="h-4 w-4"/>}
                                <span>{plant.startType}</span>
                            </div>
                        </div>
                        <div className='mt-2'>
                            <Badge variant={plant.status === 'viva' ? 'secondary' : 'destructive'} className='capitalize'>{plant.status}</Badge>
                        </div>
                    </>
                  ) : null }
              </div>
            </div>
        );
      })}
    </div>
  );
}

// Wishlist Grid
function WishlistGrid({ items, onItemClick, onAddNew }: any) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <ListTodo className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Tu lista de deseos está vacía</h3>
        <p className="mt-1 text-sm text-muted-foreground">Añade las plantas que te gustaría tener.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={onAddNew}><Plus className="mr-2 h-4 w-4"/>Añadir Manualmente</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-right mb-4">
        <Button onClick={onAddNew}><Plus className="mr-2 h-4 w-4"/>Añadir Manualmente</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {items.map((item: WishlistItem) => (
          <div key={item.id} className="group relative cursor-pointer" onClick={() => onItemClick(item)}>
            <div className="relative overflow-hidden rounded-lg">
                <Image
                    src={item.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                    alt={item.name}
                    width={400}
                    height={500}
                    className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
                />
            </div>
            <div className="p-2 bg-transparent">
               <h3 className="font-headline text-lg font-bold truncate">{item.name}</h3>
               {item.notes && <p className="text-sm text-muted-foreground truncate">{item.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
