'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Plant } from '@/app/page';
import { Gift, RefreshCw, ShoppingBag, Sun, Home, Package, Scissors, HeartCrack, Upload, Skull, Copy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from './ui/input';
import { useFirestore, useUser } from '@/firebase';
import { ImageDetailDialog } from './image-detail-dialog';

interface PlantDetailDialogProps {
  plant: Plant | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onUpdatePlant: (id: string, updatedData: Partial<Plant>) => void;
  onClonePlant: (plant: Plant) => void;
  isCommunityView?: boolean;
}

const acquisitionIcons:any = {
  compra: <ShoppingBag className="h-5 w-5" />,
  regalo: <Gift className="h-5 w-5" />,
  intercambio: <RefreshCw className="h-5 w-5" />,
  rescatada: <Skull className="h-5 w-5" />,
};

const startIcons: { [key in Plant['startType']]: React.ReactElement } = {
    planta: <Sun className="h-5 w-5" />,
    gajo: <Scissors className="h-5 w-5" />,
    raiz: <Package className="h-5 w-5" />,
    semilla: <Home className="h-5 w-5" />,
};


function InfoSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-muted-foreground pt-1">{icon}</div>
      <div>
        <h4 className="font-semibold font-headline">{title}</h4>
        <p className="text-sm text-muted-foreground capitalize">{children}</p>
      </div>
    </div>
  );
}

export function PlantDetailDialog({ plant, isOpen, setIsOpen, onUpdatePlant, isCommunityView, onClonePlant }: PlantDetailDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [imageDetailStartIndex, setImageDetailStartIndex] = useState(0);

  const handleOpenImageDetail = (index: number) => {
    setImageDetailStartIndex(index);
    setIsImageDetailOpen(true);
  };

  const galleryImages = useMemo(() => {
    if (!plant) return [];
    
    // Use the dedicated gallery field first
    let allImages = [...(plant.gallery || [])];

    // Fallback to old event-based photos if gallery is empty
    if (allImages.length === 0) {
        const eventPhotos = (plant.events || [])
            .filter(e => e.type === 'foto' && e.note && e.note.startsWith('data:image'))
            .map(e => ({ imageUrl: e.note, date: e.date }));
        allImages.push(...eventPhotos);
    }

    // Include the main image if it's not already in the gallery
    if (plant.image && !allImages.some(img => img.imageUrl === plant.image)) {
        allImages.push({ 
            imageUrl: plant.image, 
            date: plant.lastPhotoUpdate || plant.createdAt?.toDate()?.toISOString() || plant.date 
        });
    }
    
    // Create a Set to remove duplicates by imageUrl, then convert back to array
    const uniqueImages = Array.from(new Set(allImages.map(img => img.imageUrl)))
        .map(url => allImages.find(img => img.imageUrl === url)!);

    // Sort by date, most recent first
    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [plant]);

  if (!plant) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore || isCommunityView || !user) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageUrl = reader.result as string;
        const newEvent = {
          id: new Date().getTime().toString(),
          type: 'foto' as const,
          date: new Date().toISOString(),
          note: "Se añadió una nueva foto",
        };
        const updatedEvents = [...(plant.events || []), newEvent];
        
        const newGalleryEntry = { imageUrl: imageUrl, date: newEvent.date };
        const currentGallery = plant.gallery || [];
        const updatedGallery = [newGalleryEntry, ...currentGallery];

        const updatedData = {
            image: imageUrl, // Update main image
            lastPhotoUpdate: newEvent.date,
            events: updatedEvents,
            gallery: updatedGallery
        };
        onUpdatePlant(plant.id, updatedData);
      };
      reader.readAsDataURL(file);
    }
  };

  const acquisitionType = plant.acquisitionType;
  const Icon = acquisitionIcons[acquisitionType];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline">{plant.name}</DialogTitle>
           <DialogDescription>
            {isCommunityView
                ? `De: ${plant.ownerName || 'un miembro de la comunidad'}`
                : `Adquirida el ${format(parseISO(plant.date), "d 'de' MMMM, yyyy", { locale: es })}`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-4">
              <div className="relative h-64 sm:h-96 w-full rounded-lg overflow-hidden mb-4 border">
                  <Image
                      src={galleryImages.length > 0 ? galleryImages[0].imageUrl : 'https://placehold.co/400x500/A0D995/333333?text=?'}
                      alt={`Main image of ${plant.name}`}
                      fill
                      className="object-cover"
                      unoptimized={true}
                  />
                  {plant.status === 'fallecida' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="flex flex-col items-center text-white">
                          <HeartCrack className="h-16 w-16" />
                          <p className="mt-2 text-lg font-bold font-headline">Descansando</p>
                      </div>
                      </div>
                  )}
              </div>
            
            {galleryImages.length > 1 && (
                <>
                    <h4 className="font-headline text-md font-semibold">Galería</h4>
                    <Carousel opts={{ align: "start" }} className="w-full px-12">
                        <CarouselContent>
                        {galleryImages.map((image, index) => (
                            <CarouselItem key={index} className="basis-1/2 sm:basis-1/3 md:basis-1/4">
                            <div className="p-1" onClick={() => handleOpenImageDetail(index)}>
                                <div className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-transparent cursor-pointer">
                                    <Image src={image.imageUrl} alt={`Gallery image ${index + 1}`} fill className="object-cover" />
                                    <div className="absolute bottom-0 w-full bg-black/50 text-white text-center text-xs py-0.5">
                                        {format(parseISO(image.date), 'dd/MM/yy')}
                                    </div>
                                </div>
                            </div>
                            </CarouselItem>
                        ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                </>
            )}

            {!isCommunityView && user?.uid === plant.ownerId && (
                <div className="space-y-2 pt-4">
                    <label htmlFor={`image-upload-${plant.id}`} className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted">
                        <Upload className="mr-2 h-4 w-4" />
                        <span>Subir Foto Actual</span>
                    </label>
                    <Input id={`image-upload-${plant.id}`} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
            )}
             
             {isCommunityView ? (
                <div className="pt-4">
                    <Button className="w-full" onClick={() => onClonePlant(plant)}>
                        <Copy className="mr-2 h-4 w-4" /> Yo la tengo
                    </Button>
                </div>
             ) : (
                <>
                    <Separator className="my-4" />
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 bg-secondary p-3 rounded-md">
                            <div className="text-primary">{Icon}</div>
                            <div>
                            <p className="font-semibold capitalize">Adoptada como {acquisitionType}</p>
                            {plant.acquisitionType === 'compra' && plant.price && <p className="text-sm text-muted-foreground">${plant.price}</p>}
                            {plant.acquisitionType === 'intercambio' && <p className="text-sm text-muted-foreground">{plant.exchangeSource}</p>}
                            {plant.acquisitionType === 'regalo' && <p className="text-sm text-muted-foreground">De: {plant.giftFrom || 'un amigo'}</p>}
                            {plant.acquisitionType === 'rescatada' && <p className="text-sm text-muted-foreground">De: {plant.rescuedFrom || 'la calle'}</p>}
                            </div>
                        </div>
                    
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoSection icon={<Sun className="h-5 w-5" />} title="Ubicación">
                                {plant.location}
                            </InfoSection>
                            <InfoSection icon={startIcons[plant.startType] || <Package className="h-5 w-5" />} title="Comienzo como">
                                {plant.startType}
                            </InfoSection>
                        </div>
                        {plant.notes && (
                            <InfoSection icon={<Home className="h-5 w-5" />} title="Notas">
                                {plant.notes}
                            </InfoSection>
                        )}
                    </div>
                </>
             )}
          </div>
        </div>

        <DialogFooter className="col-span-1 md:col-span-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
     <ImageDetailDialog 
        isOpen={isImageDetailOpen} 
        setIsOpen={setIsImageDetailOpen}
        images={galleryImages}
        startIndex={imageDetailStartIndex}
    />
    </>
  );
}
