'use client';
import {
  Baby, BarChart3, CalendarDays, Leaf, ListTodo, LogIn, LogOut, Moon, Plus,
  Search, Sprout, Sun, Users, Home, ArrowLeft
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';
import { ImageDetailDialog } from '@/components/image-detail-dialog';
import { WishlistDetailDialog } from '@/components/wishlist-detail-dialog';
import { StatsComponent } from '@/components/stats';
import NextImage from 'next/image';
import Link from 'next/link';

import type { Plant, WishlistItem } from '@/app/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { user, isLoading: isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const [view, setView] = useState<'plants' | 'wishlist'>('plants');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [imageDetailStartIndex, setImageDetailStartIndex] = useState(0);

  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null);
  const [isWishlistDetailOpen, setIsWishlistDetailOpen] = useState(false);
  
  // Fetch profile owner's data
  const userQuery = useMemoFirebase(() => firestore && userId ? query(collection(firestore, 'users'), where('__name__', '==', userId)) : null, [firestore, userId]);
  const {data: profileUsers, isLoading: isProfileUserLoading} = useCollection(userQuery);
  
  const profileUser = useMemo(() => (profileUsers && profileUsers.length > 0 ? profileUsers[0] : null), [profileUsers]);
  
  // Fetch profile owner's plants
  const userPlantsQuery = useMemoFirebase(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'plants'), where('ownerId', '==', userId), where('status', '==', 'viva'));
  }, [userId, firestore]);

  useEffect(() => {
    if (!userPlantsQuery) {
      setPlants([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = onSnapshot(userPlantsQuery, snapshot => {
      const userPlants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plant));
      userPlants.sort((a, b) => a.name.localeCompare(b.name));
      setPlants(userPlants);
      setIsLoading(false);
    }, error => {
      console.error("Error fetching user plants:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userPlantsQuery]);

  // Fetch profile owner's wishlist
  const wishlistQuery = useMemoFirebase(() => {
    if (!userId || !firestore) return null;
    return collection(firestore, `users/${userId}/wishlist`);
  }, [userId, firestore]);

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
  
  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      toast({ variant: 'destructive', title: 'Error al iniciar sesión' });
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast({ title: 'Has cerrado sesión.' });
  };
  
  const openPlantDetails = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDetailOpen(true);
  };
  
  const openWishlistDetail = (item: WishlistItem) => {
    setSelectedWishlistItem(item);
    setIsWishlistDetailOpen(true);
  };

  const getGalleryImages = (plant: Plant | null) => {
    if (!plant) return [];
    let allImages = [...(plant.gallery || [])];
    if (plant.image && !allImages.some(img => img.imageUrl === plant.image)) {
        allImages.push({ 
            imageUrl: plant.image, 
            date: plant.lastPhotoUpdate || plant.createdAt?.toDate?.()?.toISOString() || plant.date,
            attempt: (plant.events || []).reduce((max, e) => Math.max(max, e.attempt || 1), 1)
        });
    }
    const uniqueImages = Array.from(new Set(allImages.map(img => img.imageUrl)))
        .map(url => allImages.find(img => img.imageUrl === url)!);
    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (isProfileUserLoading) {
    return <div className="p-8"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full mt-4" /></div>;
  }
  
  if (!profileUser) {
    return <div className="text-center py-16">Usuario no encontrado</div>
  }

  return (
    <div className="min-h-screen bg-secondary/50 font-body text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link href="/" className="mr-auto flex items-center">
              <Sprout className="h-6 w-6 text-primary" />
              <h1 className="ml-2 hidden font-headline text-xl font-bold sm:block">PlantPal</h1>
            </Link>
            <div className="flex items-center justify-end gap-1 sm:gap-2">
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
                          <DropdownMenuItem onClick={() => setTheme("light")}>Claro</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTheme("dark")}>Oscuro</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTheme("system")}>Sistema</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="destructive" className="w-full justify-start mt-1" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Cerrar Sesión</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button onClick={handleLogin}><LogIn className="mr-2 h-4 w-4" />Acceder</Button>
              )}
            </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="h-24 w-24 mb-4 border-4 border-background shadow-md">
            <AvatarImage src={profileUser.photoURL || ''} alt={profileUser.displayName || ''} />
            <AvatarFallback>{profileUser.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold font-headline">{profileUser.displayName}</h1>
        </div>

        <div className="mb-8">
          <StatsComponent plants={plants} />
        </div>

        <div className="flex justify-center gap-2 mb-8 border-b">
            <Button variant={view === 'plants' ? 'link' : 'ghost'} onClick={() => setView('plants')} className={view === 'plants' ? 'border-b-2 border-primary rounded-none' : ''}>
                <Leaf className="mr-2 h-4 w-4" /> Colección
            </Button>
            <Button variant={view === 'wishlist' ? 'link' : 'ghost'} onClick={() => setView('wishlist')} className={view === 'wishlist' ? 'border-b-2 border-primary rounded-none' : ''}>
                <ListTodo className="mr-2 h-4 w-4" /> Lista de Deseos
            </Button>
        </div>

        {view === 'plants' && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                {isLoading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />) :
                plants.map((plant: Plant) => (
                    <div key={plant.id} className="group" onClick={() => openPlantDetails(plant)}>
                        <div className="relative overflow-hidden rounded-lg cursor-pointer">
                            <NextImage
                                src={plant.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
                                alt={plant.name}
                                width={400}
                                height={500}
                                className="object-cover w-full h-auto aspect-[4/5] transition-transform duration-300 group-hover:scale-105"
                                unoptimized={true}
                            />
                        </div>
                        <h3 className="font-headline text-lg font-bold truncate mt-2">{plant.name}</h3>
                    </div>
                ))}
            </div>
        )}

        {view === 'wishlist' && (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
                {isLoading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />) :
                wishlist.map((item: WishlistItem) => (
                    <div key={item.id} className="group relative cursor-pointer" onClick={() => openWishlistDetail(item)}>
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
                         <h3 className="font-headline text-lg font-bold truncate mt-2">{item.name}</h3>
                    </div>
                ))}
            </div>
        )}
      </main>

      <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={() => {}}
        onClonePlant={() => {}}
        isCommunityView={true}
      />
      <ImageDetailDialog 
        isOpen={isImageDetailOpen} 
        setIsOpen={setIsImageDetailOpen}
        images={getGalleryImages(selectedPlant)}
        startIndex={imageDetailStartIndex}
        plant={selectedPlant}
      />
      {selectedWishlistItem && (
        <WishlistDetailDialog
          item={selectedWishlistItem}
          isOpen={isWishlistDetailOpen}
          setIsOpen={setIsWishlistDetailOpen}
          onGotIt={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
    </div>
  );
}
