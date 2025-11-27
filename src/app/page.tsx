'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Sprout, ListTodo, LogIn, LogOut, Users, Carrot, BarChart3,
  HeartCrack, Leaf, Moon, Sun,
  Gift, ShoppingBag, RefreshCw, Heart, Package, Clock, Scissors, Skull, Home, ArrowRightLeft, Pencil, Trash2, Bell, Baby, CalendarDays, Settings, Palette, Tags, Flower2, Camera, UserSquare
} from 'lucide-react';
import NextImage from 'next/image';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, doc, onSnapshot, getDocs, writeBatch, orderBy } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPlantDialog } from '@/components/add-plant-dialog';
import { EditPlantDialog } from '@/components/edit-plant-dialog';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';
import { WishlistFormDialog } from '@/components/wishlist-form-dialog';
import { StatsDialog } from '@/components/stats-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow, formatDistanceStrict, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { WishlistDetailDialog } from '@/components/wishlist-detail-dialog';
import { cn } from '@/lib/utils';
import { ImageDetailDialog } from '@/components/image-detail-dialog';
import { CalendarDialog } from '@/components/calendar-dialog';
import Link from 'next/link';
import { SettingsDialog } from '@/components/settings-dialog';
import { useToast } from '@/hooks/use-toast';

// Tipos
export type UserProfile = {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  tags?: string[];
  eventIconConfiguration?: Partial<Record<PlantEvent['type'], string>>;
};

export type Plant = {
  id: string;
  name: string;
  type?: string;
  date: string; // ISO date string
  status: 'viva' | 'fallecida' | 'intercambiada';
  lastWatered?: string;
  notes?: string;
  custodianOf?: string;
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
  type: 'riego' | 'poda' | 'transplante' | 'foto' | 'plaga' | 'fertilizante' | 'nota' | 'revivida' | 'fallecida' | 'esqueje' | 'floracion';
  date: string; // ISO date string
  note: string;
  attempt: number;
  imageUrl?: string;
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
  
  // State for debouncing search
  const [inputValue, setInputValue] = useState('');
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

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [imageDetailStartIndex, setImageDetailStartIndex] = useState(0);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [hasPushedState, setHasPushedState] = useState(false);

  // Debounce effect for search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(inputValue);
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  // Handle back button for modals
 useEffect(() => {
    const isAnyModalOpen = isAddDialogOpen || isEditDialogOpen || isDetailOpen || isWishlistFormOpen || isWishlistDetailOpen || isStatsOpen || isCalendarOpen || isSettingsOpen || isImageDetailOpen;

    const onPopState = (event: PopStateEvent) => {
        // Only act if we expect a modal to be open
        if (hasPushedState) {
            event.preventDefault();
            // Close all modals
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setIsDetailOpen(false);
            setIsWishlistFormOpen(false);
            setIsWishlistDetailOpen(false);
            setIsStatsOpen(false);
            setIsCalendarOpen(false);
            setIsSettingsOpen(false);
            setIsImageDetailOpen(false);
            
            // Reset the state so we can push again next time
            setHasPushedState(false); 
             if (window.history.state && window.history.state.modalOpen) {
                window.history.back();
            }
        }
    };
    
    // If a modal is opening and we haven't pushed a state yet, push one.
    if (isAnyModalOpen && !hasPushedState) {
        window.history.pushState({ modalOpen: true }, '');
        setHasPushedState(true);
    }
    
    // If all modals are closed and we think we pushed a state, it means the user closed it manually.
    // We should go back to remove our "fake" history entry.
    if (!isAnyModalOpen && hasPushedState) {
        if (window.history.state && window.history.state.modalOpen) {
           window.history.back();
        }
        setHasPushedState(false);
    }
    
    window.addEventListener('popstate', onPopState);
    
    return () => {
        window.removeEventListener('popstate', onPopState);
    };
}, [isAddDialogOpen, isEditDialogOpen, isDetailOpen, isWishlistFormOpen, isWishlistDetailOpen, isStatsOpen, isCalendarOpen, isSettingsOpen, isImageDetailOpen, hasPushedState]);


  // Fetch user profile for custom settings
    useEffect(() => {
        if (!user || !firestore) {
            setUserProfile(null);
            return;
        }
        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                setUserProfile({ id: doc.id, ...doc.data() } as UserProfile);
            }
        });
        return () => unsubscribe();
    }, [user, firestore]);

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
      
      const needsPhotoUpdate = (p: Plant) => {
          if (!p.image) return false;
          // Use a very old date as a fallback to prevent errors with new Date()
          const lastUpdate = p.lastPhotoUpdate || p.date || '1970-01-01';
          try {
              return differenceInMonths(new Date(), new Date(lastUpdate)) >= 3;
          } catch (e) {
              console.error("Invalid date for needsPhotoUpdate:", p);
              return false; // Treat as not needing update if date is invalid
          }
      };

      const needsCompletion = (p: Plant) => !p.name || p.name.trim() === '' || p.name.toLowerCase() === 'nose';

      userPlants.sort((a, b) => {
          const aNeedsUpdate = needsPhotoUpdate(a);
          const bNeedsUpdate = needsPhotoUpdate(b);
          if (aNeedsUpdate && !bNeedsUpdate) return -1;
          if (!aNeedsUpdate && bNeedsUpdate) return 1;

          const aNeedsCompletion = needsCompletion(a);
          const bNeedsCompletion = needsCompletion(b);
          if (aNeedsCompletion && !bNeedsCompletion) return -1;
          if (!aNeedsCompletion && bNeedsCompletion) return 1;

          if (a.status === 'viva' && b.status !== 'viva') return -1;
          if (a.status !== 'viva' && b.status === 'viva') return 1;
          
          return a.name.localeCompare(b.name);
      });
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
    return query(
      collection(firestore, 'plants'),
      orderBy("createdAt", "desc")
    );
  }, [firestore]);

  useEffect(() => {
    if (!communityPlantsQuery) {
        setCommunityPlants([]);
        setIsCommunityLoading(false);
        return;
    }
    setIsCommunityLoading(true);
    const unsubscribe = onSnapshot(communityPlantsQuery, snapshot => {
      let allPlants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      
      // Client-side filtering for status, name, and owner
      allPlants = allPlants.filter(plant => {
        const isAlive = plant.status === 'viva';
        const hasName = !!plant.name && plant.name.trim() !== '';
        const isNotOwnPlant = user ? plant.ownerId !== user.uid : true;
        return isAlive && hasName && isNotOwnPlant;
      });

      setCommunityPlants(allPlants);
      setIsCommunityLoading(false);
    }, error => {
      console.error("Error fetching community plants:", error);
      setIsCommunityLoading(false);
    });
    return () => unsubscribe();
  }, [communityPlantsQuery, user]); // Add user to dependency array for re-filtering on login/logout

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
      userWishlist.sort((a, b) => a.name.localeCompare(b.name));
      setWishlist(userWishlist);
    }, error => {
      console.error("Error fetching wishlist:", error);
    });
    return () => unsubscribe();
  }, [wishlistQuery]);

  // -- Auth Handlers --
  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, this is not an error, so we do nothing.
        return;
      }
      console.error("Error initiating sign-in popup:", error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  // -- Plant Handlers --
  const handleAddPlant = async (newPlantData: Omit<Plant, 'id' | 'createdAt' | 'ownerId' | 'events'>) => {
    if (!user || !firestore) return;
    try {
      const initialEvent: PlantEvent = {
        id: new Date().getTime().toString(),
        type: 'nota',
        date: newPlantData.date,
        note: `La planta fue adquirida.`,
        attempt: 1,
      };
      
      const now = new Date().toISOString();

      const plantDataWithMeta = {
        ...newPlantData,
        gallery: newPlantData.image ? [{ imageUrl: newPlantData.image, date: now }] : [],
        lastPhotoUpdate: newPlantData.image ? now : '',
        ownerId: user.uid,
        ownerName: user.displayName,
        ownerPhotoURL: user.photoURL,
        createdAt: serverTimestamp(),
        events: [initialEvent],
      };

      await addDoc(collection(firestore, 'plants'), plantDataWithMeta);
      
      toast({
        title: "Planta Añadida",
        description: `"${newPlantData.name}" ha sido añadida a tu colección.`,
      });

      if (plantToAddFromWishlist && plantToAddFromWishlist.id) {
        await handleDeleteWishlistItem(plantToAddFromWishlist.id);
      }
    } catch (error) {
      console.error("Error adding plant:", error);
    } finally {
        setIsAddDialogOpen(false);
        setPlantToAddFromWishlist(null);
    }
  };

  const handleUpdatePlant = async (plantId: string, updatedData: Partial<Plant>) => {
    if (!firestore || !user) return;
    try {
      const plantRef = doc(firestore, 'plants', plantId);
      await updateDoc(plantRef, updatedData);
      setIsEditDialogOpen(false);
      setEditingPlant(null);
       if (selectedPlant && selectedPlant.id === plantId) {
        setSelectedPlant(prev => prev ? { ...prev, ...updatedData } : null);
      }
    } catch (error) {
      console.error("Error updating plant:", error);
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    if (!firestore || !user) return;
    try {
        await deleteDoc(doc(firestore, 'plants', plantId));
        toast({
            title: "Planta eliminada",
            description: "Tu planta ha sido eliminada permanentemente.",
        });
    } catch (error) {
        console.error("Error deleting plant:", error);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar la planta. Inténtalo de nuevo.",
        });
    }
  };
  
  const handleClonePlant = useCallback((plant: Plant) => {
    if (!user) {
        return;
    }
    setPlantToAddFromWishlist({
      name: plant.name,
      type: plant.type,
      image: plant.image,
    });
    setIsDetailOpen(false); // Close detail view
    setTimeout(() => setIsAddDialogOpen(true), 150); // Short delay to allow dialog transition
  }, [user]);

  // -- Wishlist Handlers --
  const handleSaveWishlistItem = async (itemData: Omit<WishlistItem, 'id'>, id?: string) => {
    if (!user || !firestore) return;
    try {
      if (id) {
        await setDoc(doc(firestore, `users/${user.uid}/wishlist`, id), itemData, { merge: true });
      } else {
        await addDoc(collection(firestore, `users/${user.uid}/wishlist`), itemData);
      }
      setIsWishlistFormOpen(false);
      setEditingWishlistItem(null);
    } catch (error) {
      console.error("Error saving wishlist item:", error);
    }
  };

  const handleDeleteWishlistItem = async (id: string) => {
    if (!user || !firestore) return;
    try {
      await deleteDoc(doc(firestore, `users/${user.uid}/wishlist`, id));
      setIsWishlistDetailOpen(false);
      setSelectedWishlistItem(null);
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
    }
  };
  
  const handleToggleWishlist = async (plant: Plant) => {
    if (!user || !firestore) {
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
    } else {
        // Remove from wishlist
        const batch = writeBatch(firestore);
        existing.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
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

  
  const getGalleryImages = (plant: Plant | null) => {
    if (!plant) return [];
    
    // 1. Main plant image
    const mainImage = plant.image ? [{ 
        imageUrl: plant.image, 
        date: plant.lastPhotoUpdate || plant.createdAt?.toDate?.()?.toISOString() || plant.date,
        attempt: (plant.events || []).reduce((max, e) => Math.max(max, e.attempt || 1), 1),
        isMain: true
    }] : [];

    // 2. Images from 'foto' events (old system)
    const eventPhotos = (plant.events || [])
        .filter(e => e.type === 'foto' && e.note && e.note.startsWith('data:image'))
        .map(e => ({ imageUrl: e.note, date: e.date, attempt: e.attempt, event: e }));

    // 3. Images from the new event.imageUrl property
    const newEventPhotos = (plant.events || [])
        .filter(e => e.imageUrl)
        .map(e => ({ imageUrl: e.imageUrl!, date: e.date, attempt: e.attempt, event: e }));
    
    // 4. Images from the gallery property (for backward compatibility and general storage)
    const galleryPhotos = (plant.gallery || []).map(g => ({ ...g, isFromGallery: true }));

    // Combine all, ensuring main image is not duplicated if it's also in the gallery
    let allImages = [
        ...mainImage, 
        ...eventPhotos,
        ...newEventPhotos,
        ...galleryPhotos
    ];
    
    // Create a unique set of images based on URL to remove duplicates
    const uniqueImages = Array.from(new Map(allImages.map(img => [img.imageUrl, img])).values());

    // Sort images by date, newest first
    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  
  // -- Computed Data --
  const filteredPlants = useMemo(() => {
    const source = view === 'my-plants' ? plants : communityPlants;
    if (!searchTerm) return source;
    return source.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [plants, communityPlants, view, searchTerm]);
  
  const filteredWishlist = useMemo(() => {
    if (!searchTerm) return wishlist;
    return wishlist.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [wishlist, searchTerm]);

  const wishlistPlantIds = useMemo(() => {
      return new Set(wishlist.map(item => item.plantId));
  }, [wishlist]);
  
  const plantRenderData = useMemo(() => {
    const nameCounts: { [key: string]: { total: number, indices: { [plantId: string]: number } } } = {};
    const attemptCounts: { [plantId: string]: number } = {};
    const offspringCounts: { [plantId: string]: number } = {};
    const hasFlowered: { [plantId: string]: boolean } = {};


    // First sort by creation date to have a stable order for indexing
    const sortedPlants = [...plants].sort((a,b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));

    sortedPlants.forEach(plant => {
        const events = plant.events || [];
        // Count attempts
        const maxAttempt = events.reduce((max, event) => Math.max(max, event.attempt || 1), 0);
        attemptCounts[plant.id] = maxAttempt;

        // Count offspring
        offspringCounts[plant.id] = events.filter(e => e.type === 'esqueje').length;

        // Check for flowering
        hasFlowered[plant.id] = events.some(e => e.type === 'floracion');


        // Count name duplicates
        const nameKey = plant.name.toLowerCase();
        if (!nameCounts[nameKey]) {
            nameCounts[nameKey] = { total: 0, indices: {} };
        }
        nameCounts[nameKey].total++;
    });
    
    Object.keys(nameCounts).forEach(nameKey => {
        if (nameCounts[nameKey].total > 1) {
            let index = 1;
            sortedPlants.filter(p => p.name.toLowerCase() === nameKey).forEach(p => {
                nameCounts[nameKey].indices[p.id] = index++;
            });
        }
    });

    return { nameCounts, attemptCounts, offspringCounts, hasFlowered };
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
        onAddPlant={() => { setPlantToAddFromWishlist(null); setIsAddDialogOpen(true); }}
        onOpenWishlist={() => setView('wishlist')}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isUserLoading={isUserLoading}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={`Buscar en ${view === 'my-plants' ? 'mis plantas' : view === 'wishlist' ? 'mi lista de deseos' : 'la comunidad'}...`}
              className="pl-10"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        </div>
        
        {view === 'my-plants' && (
          <PlantsGrid 
              plants={filteredPlants} 
              onPlantClick={openPlantEditor} 
              isLoading={isLoading} 
              onDeletePlant={handleDeletePlant} 
              plantRenderData={plantRenderData}
              setIsDetailOpen={setIsDetailOpen}
              setIsEditDialogOpen={setIsEditDialogOpen}
          />
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
            onOpenImageDetail={(plant, index) => {
              setSelectedPlant(plant);
              setImageDetailStartIndex(index);
              setIsImageDetailOpen(true);
            }}
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
        userProfile={userProfile}
        plants={plants}
      />
      {editingPlant && (
        <EditPlantDialog
          plant={editingPlant}
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          onSave={handleUpdatePlant}
          onDelete={handleDeletePlant}
          userProfile={userProfile}
          plants={plants}
        />
      )}
       <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={handleUpdatePlant}
        onClonePlant={handleClonePlant}
        isCommunityView={true}
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
      <StatsDialog
        isOpen={isStatsOpen}
        setIsOpen={setIsStatsOpen}
        plants={plants}
      />
      <CalendarDialog
        isOpen={isCalendarOpen}
        setIsOpen={setIsCalendarOpen}
        plants={plants}
        userProfile={userProfile}
      />
       <SettingsDialog
        isOpen={isSettingsOpen}
        setIsOpen={setIsSettingsOpen}
        userProfile={userProfile}
      />
      <ImageDetailDialog 
        isOpen={isImageDetailOpen} 
        setIsOpen={setIsImageDetailOpen}
        images={getGalleryImages(selectedPlant)}
        startIndex={imageDetailStartIndex}
        plant={selectedPlant}
        onDeleteImage={() => {}} // No-op for community/main page view
        onUpdateImageDate={() => {}} // No-op
    />
    </div>
  );
}

// Header Component
const Header = ({ view, onViewChange, user, onLogin, onLogout, onAddPlant, onOpenStats, onOpenCalendar, onOpenWishlist, onOpenSettings, isUserLoading }: any) => {
  const { setTheme } = useTheme();

  const NavButton = ({ icon: Icon, children, ...props }: any) => (
    <Button {...props}>
      <Icon className="h-5 w-5" />
      <span className="hidden sm:inline">{children}</span>
    </Button>
  );
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-4 flex items-center">
          <Sprout className="h-6 w-6 text-primary" />
          <h1 className="ml-2 hidden font-headline text-xl font-bold sm:block">PlantPal</h1>
        </Link>
        
        <nav className="flex flex-1 items-center justify-start gap-1 sm:gap-2">
           {user && <NavButton variant={view === 'my-plants' ? "secondary" : "ghost"} icon={Leaf} onClick={() => onViewChange('my-plants')}>Mis Plantas</NavButton>}
           <NavButton variant={view === 'community' ? "secondary" : "ghost"} icon={Users} onClick={() => onViewChange('community')}>Comunidad</NavButton>
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
           {user && (
             <Button variant="outline" size="sm" onClick={onAddPlant}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Añadir Planta</span>
            </Button>
           )}
          {user && <Button variant="ghost" size="icon" onClick={onOpenCalendar}><CalendarDays className="h-5 w-5" /></Button>}
          {user && <Button variant="ghost" size="icon" onClick={onOpenStats}><BarChart3 className="h-5 w-5" /></Button>}
          {user && (
             <Button variant="ghost" size="icon" onClick={onOpenWishlist}>
                <ListTodo className="h-5 w-5" />
             </Button>
          )}

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

                    <Button variant="ghost" className="w-full justify-start mt-1" onClick={onOpenSettings}>
                      <Settings className="mr-2 h-4 w-4" />
                      Ajustes
                    </Button>
                    
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

// Plants Grid
function PlantsGrid({ plants, onPlantClick, isLoading, isCommunity = false, onToggleWishlist, wishlistPlantIds, user, onDeletePlant, plantRenderData, onOpenImageDetail, setIsDetailOpen, setIsEditDialogOpen }: any) {
  
  const [plantToDeleteId, setPlantToDeleteId] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

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
      semilla: <Sprout className="h-4 w-4" />,
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
  
  const handleDeleteClick = (e: React.MouseEvent, plantId: string) => {
    e.stopPropagation();
    setPlantToDeleteId(plantId);
    setIsAlertOpen(true);
  };
  
  const confirmDelete = () => {
    if (plantToDeleteId) {
        onDeletePlant(plantToDeleteId);
        if(setIsDetailOpen) setIsDetailOpen(false);
        if(setIsEditDialogOpen) setIsEditDialogOpen(false);
    }
    setPlantToDeleteId(null);
    setIsAlertOpen(false);
};


  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {plants.map((plant: Plant, index: number) => {
          const isInWishlist = wishlistPlantIds?.has(plant.id);
          
          let duplicateIndex = 0;
          if (!isCommunity && plant.name && plantRenderData.nameCounts[plant.name.toLowerCase()]?.total > 1) {
              duplicateIndex = plantRenderData.nameCounts[plant.name.toLowerCase()].indices[plant.id];
          }

          const attemptCount = isCommunity ? 0 : plantRenderData.attemptCounts[plant.id] || 1;
          const offspringCount = isCommunity ? 0 : plantRenderData.offspringCounts[plant.id] || 0;
          const hasFlowered = isCommunity ? false : plantRenderData.hasFlowered[plant.id];
          
          const needsCompletion = !isCommunity && (!plant.name || plant.name.trim() === '' || plant.name.toLowerCase() === 'nose');
          const needsPhotoUpdate = !isCommunity && plant.image && differenceInMonths(new Date(), new Date(plant.lastPhotoUpdate || plant.date || '1970-01-01')) >= 3;

          const cardContent = (
            <div
                className="group animation-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative overflow-hidden rounded-lg cursor-pointer" onClick={() => onPlantClick(plant)}>
                  <NextImage
                      src={plant.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                      alt={plant.name}
                      width={400}
                      height={500}
                      className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
                      unoptimized={true}
                  />
                  {needsCompletion && (
                        <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full z-10">
                            Completar datos
                        </div>
                   )}
                   {needsPhotoUpdate && !needsCompletion && (
                        <div className="absolute top-2 right-2 bg-blue-400 text-blue-900 text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
                            <Camera className="h-3 w-3"/> Actualizar foto
                        </div>
                   )}
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
                      <div className='flex items-center gap-2 flex-grow min-w-0'>
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={plant.ownerPhotoURL} />
                            <AvatarFallback>{plant.ownerName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className='min-w-0'>
                              <h3 className="font-headline text-md sm:text-lg font-bold text-white text-clip overflow-hidden whitespace-nowrap group-hover:underline">{plant.name}</h3>
                              <span className="text-xs text-white/80 hidden sm:inline truncate">{plant.ownerName}</span>
                          </div>
                      </div>
                      {user && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0 text-white hover:text-red-400 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onToggleWishlist(plant); }}>
                            <Heart className={`h-5 w-5 transition-all ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-2 bg-transparent">
                    {!isCommunity ? (
                      <>
                          <div className='flex items-baseline gap-2'>
                               <h3
                                className={cn(
                                    "font-headline text-lg font-bold text-clip overflow-hidden whitespace-nowrap cursor-pointer",
                                    plant.custodianOf && "text-primary"
                                )}
                                onClick={() => onPlantClick(plant)}
                                >
                                {plant.name}
                                </h3>
                              {duplicateIndex > 1 && (
                                <Badge variant='secondary' className='capitalize bg-purple-600/20 text-purple-700 dark:bg-purple-700/30 dark:text-purple-400 border-transparent'>
                                    #{duplicateIndex}
                                </Badge>
                              )}
                          </div>
                           {plant.custodianOf && <p className="text-xs text-muted-foreground flex items-center gap-1"><UserSquare className="h-3 w-3" /> Planta de {plant.custodianOf}</p>}
                          <div className="mt-2 space-y-1 text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatDistanceToNow(new Date(plant.date), { locale: es, addSuffix: true })}</span>
                              </div>
                              <div className="flex items-center gap-2 capitalize">
                                  {acquisitionIcons[plant.acquisitionType] || <Sprout className="h-4 w-4"/>}
                                  <span>
                                      {plant.acquisitionType === 'compra' && plant.price ? `Costó $${plant.price}` : 
                                      plant.acquisitionType === 'regalo' && plant.giftFrom ? `Regalo de ${plant.giftFrom}` :
                                      plant.acquisitionType === 'rescatada' && plant.rescuedFrom ? `Rescatada de ${plant.rescuedFrom}` :
                                      plant.acquisitionType}
                                  </span>
                              </div>
                              <div className="flex items-center gap-2 capitalize">
                                  {startIcons[plant.startType] || <Sprout className="h-4 w-4"/>}
                                  <span>{plant.startType}</span>
                              </div>
                          </div>
                          <div className='mt-2 flex flex-wrap gap-1'>
                              {attemptCount > 1 && <Badge variant='outline'>{attemptCount}ª Oportunidad</Badge>}
                              {offspringCount > 0 && <Badge variant='secondary' className='bg-cyan-500/20 text-cyan-600 border-transparent hover:bg-cyan-500/30 dark:bg-cyan-500/30 dark:text-cyan-400'><Sprout className="h-3 w-3 mr-1"/>{offspringCount}</Badge>}
                              {plant.type && <Badge variant='secondary' className='capitalize bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-400 border-transparent'>{plant.type}</Badge>}
                              {hasFlowered && <Badge variant='secondary' className='bg-pink-500/20 text-pink-600 border-transparent hover:bg-pink-500/30 dark:bg-pink-500/30 dark:text-pink-400'><Flower2 className="h-3 w-3 mr-1"/></Badge>}
                          </div>
                      </>
                    ) : null }
                </div>
              </div>
          );
          
          if (isCommunity) {
            return <div key={plant.id}>{cardContent}</div>;
          }

          return (
            <ContextMenu key={plant.id}>
                <ContextMenuTrigger>
                  {cardContent}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => handleDeleteClick(e as any, plant.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Planta
                  </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la planta y todos sus datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlantToDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {items.map((item: WishlistItem) => (
          <div key={item.id} className="group relative cursor-pointer" onClick={() => onItemClick(item)}>
            <div className="relative overflow-hidden rounded-lg">
                <NextImage
                    src={item.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                    alt={item.name}
                    width={400}
                    height={500}
                    className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
                    unoptimized={true}
                />
            </div>
            <div className="p-2 bg-transparent">
               <h3 className="font-headline text-lg font-bold text-clip overflow-hidden whitespace-nowrap">{item.name}</h3>
               {item.notes && <p className="text-sm text-muted-foreground truncate">{item.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
