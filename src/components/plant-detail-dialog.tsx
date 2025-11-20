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
import { Gift, RefreshCw, ShoppingBag, Sun, Droplets, Scissors, HeartCrack, Upload, Skull } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ImageComparisonSlider from './image-comparison-slider';
import { Input } from './ui/input';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface PlantDetailDialogProps {
  plant: Plant | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onUpdatePlant: (id: string, updatedData: Partial<Plant>) => void;
}

const acquisitionIcons:any = {
  compra: <ShoppingBag className="h-5 w-5" />,
  regalo: <Gift className="h-5 w-5" />,
  intercambio: <RefreshCw className="h-5 w-5" />,
  rescatada: <Skull className="h-5 w-5" />,
};

function InfoSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-muted-foreground pt-1">{icon}</div>
      <div>
        <h4 className="font-semibold font-headline">{title}</h4>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

export function PlantDetailDialog({ plant, isOpen, setIsOpen, onUpdatePlant }: PlantDetailDialogProps) {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const firestore = useFirestore();

  const galleryImages = useMemo(() => {
    if (!plant) return [];
    const mainImage = plant.image ? [{ imageUrl: plant.image, date: plant.createdAt?.toDate()?.toISOString() || plant.date }] : [];
    const eventPhotos = (plant.events || [])
      .filter(e => e.type === 'foto' && e.note)
      .map(e => ({ imageUrl: e.note, date: e.date }));
    
    const allImages = [...mainImage, ...eventPhotos];
    
    return allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [plant]);

  if (!plant) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!firestore) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageUrl = reader.result as string;
        const newEvent = {
          id: new Date().getTime().toString(),
          type: 'foto',
          date: new Date().toISOString(),
          note: imageUrl,
        };
        const updatedEvents = [...(plant.events || []), newEvent];
        const updatedData = {
            image: imageUrl, // Update main image
            lastPhotoUpdate: newEvent.date,
            events: updatedEvents
        };
        onUpdatePlant(plant.id, updatedData);
      };
      reader.readAsDataURL(file);
    }
  };

  const acquisitionType = plant.acquisitionType;
  const Icon = acquisitionIcons[acquisitionType];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline">{plant.name}</DialogTitle>
          <DialogDescription>
            Adquirida el {format(parseISO(plant.date), 'd \'de\' MMMM, yyyy', { locale: es })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-headline text-lg font-semibold">Galería de Crecimiento</h3>
            
            {galleryImages.length > 0 ? (
                 <div className="relative h-64 w-full rounded-lg overflow-hidden mb-4 border">
                    <Image
                        src={galleryImages[0].imageUrl}
                        alt={`Main image of ${plant.name}`}
                        fill
                        className="object-cover"
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
            ) : (
                <div className="h-64 w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    Sin foto principal
                </div>
            )}

            {galleryImages.length > 1 && (
              <Carousel opts={{ align: "start" }} className="w-full px-12">
                <CarouselContent>
                  {galleryImages.map((image, index) => (
                    <CarouselItem key={index} className="basis-1/3">
                      <div className="p-1">
                        <div
                          className={`relative aspect-square w-full cursor-pointer rounded-md overflow-hidden border-2 hover:border-primary ${beforeImage === image.imageUrl || afterImage === image.imageUrl ? 'border-primary' : 'border-transparent'}`}
                          onClick={() => {
                            if (!beforeImage || (beforeImage && afterImage)) {
                              setBeforeImage(image.imageUrl);
                              setAfterImage(null);
                            } else {
                              setAfterImage(image.imageUrl);
                            }
                          }}
                        >
                          <Image src={image.imageUrl} alt={`Gallery image ${index + 1}`} fill className="object-cover" />
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}

            {beforeImage && afterImage && (
              <div className="space-y-2">
                 <h4 className="font-headline text-md font-semibold">Antes y Después</h4>
                <ImageComparisonSlider before={beforeImage} after={afterImage} />
                <Button variant="outline" size="sm" onClick={() => { setBeforeImage(null); setAfterImage(null); }}>
                  Limpiar Comparación
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
                <label htmlFor={`image-upload-${plant.id}`} className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted">
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Subir Nueva Foto</span>
                </label>
                <Input id={`image-upload-${plant.id}`} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center space-x-3 bg-secondary p-3 rounded-md">
              <div className="text-primary">{Icon}</div>
              <div>
                <p className="font-semibold capitalize">{acquisitionType}</p>
                {plant.acquisitionType === 'compra' && plant.price && <p className="text-sm text-muted-foreground">${plant.price}</p>}
                {plant.acquisitionType === 'intercambio' && <p className="text-sm text-muted-foreground">{plant.exchangeSource}</p>}
                {plant.acquisitionType === 'regalo' && <p className="text-sm text-muted-foreground">De: {plant.giftFrom || 'un amigo'}</p>}
                {plant.acquisitionType === 'rescatada' && <p className="text-sm text-muted-foreground">De: {plant.rescuedFrom || 'la calle'}</p>}
              </div>
            </div>
          
            <Separator />

            <div className="space-y-4">
                <InfoSection icon={<Sun className="h-5 w-5" />} title="Ubicación">
                    {plant.location}
                </InfoSection>
                 <InfoSection icon={<Scissors className="h-5 w-5" />} title="Comienzo como">
                    {plant.startType}
                </InfoSection>
              <InfoSection icon={<Droplets className="h-5 w-5" />} title="Notas">
                {plant.notes}
              </InfoSection>
            </div>
          </div>
        </div>

        <DialogFooter className="col-span-1 md:col-span-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
