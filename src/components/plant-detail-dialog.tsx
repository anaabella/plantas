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
import type { Plant } from '@/types';
import { Gift, RefreshCw, ShoppingBag, Skull, Droplets, Sun, Scissors, HeartCrack, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ImageComparisonSlider from './image-comparison-slider';
import { Input } from './ui/input';

interface PlantDetailDialogProps {
  plant: Plant | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onUpdatePlant: (updatedPlant: Plant) => void;
}

const acquisitionIcons = {
  purchased: <ShoppingBag className="h-5 w-5" />,
  gifted: <Gift className="h-5 w-5" />,
  traded: <RefreshCw className="h-5 w-5" />,
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
  
  const galleryImages = useMemo(() => {
    if (!plant) return [];
    // Combine the main image with the gallery images
    const allImages = [{ imageUrl: plant.imageUrl, date: plant.acquisitionDate }, ...(plant.gallery || [])];
    // Sort by date descending
    return allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [plant]);

  if (!plant) return null;

  const handleDeceasedToggle = () => {
    onUpdatePlant({ ...plant, isDeceased: !plant.isDeceased });
    setIsOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = {
          imageUrl: reader.result as string,
          date: new Date().toISOString(),
        };
        const updatedPlant = {
          ...plant,
          gallery: [...(plant.gallery || []), newImage],
          imageUrl: newImage.imageUrl, // Also update the main image
        };
        onUpdatePlant(updatedPlant);
      };
      reader.readAsDataURL(file);
    }
  };

  const acquisitionType = plant.acquisitionType;
  const Icon = acquisitionIcons[acquisitionType];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-headline">{plant.name}</DialogTitle>
          <DialogDescription>
            Acquired on {format(new Date(plant.acquisitionDate), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Columna Izquierda: Galería y Comparador */}
          <div className="space-y-4">
            <h3 className="font-headline text-lg font-semibold">Growth Gallery</h3>
             <div className="relative h-64 w-full rounded-lg overflow-hidden mb-4 border">
              <Image
                src={plant.imageUrl}
                alt={`Main image of ${plant.name}`}
                fill
                className="object-cover"
                data-ai-hint={plant.imageHint}
              />
              {plant.isDeceased && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex flex-col items-center text-white">
                    <HeartCrack className="h-16 w-16" />
                    <p className="mt-2 text-lg font-bold font-headline">At Rest</p>
                  </div>
                </div>
              )}
            </div>

            {galleryImages.length > 1 && (
              <Carousel opts={{ align: "start" }} className="w-full px-12">
                <CarouselContent>
                  {galleryImages.map((image, index) => (
                    <CarouselItem key={index} className="basis-1/3">
                      <div className="p-1">
                        <div
                          className="relative aspect-square w-full cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-primary"
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
                 <h4 className="font-headline text-md font-semibold">Before & After</h4>
                <ImageComparisonSlider before={beforeImage} after={afterImage} />
                <Button variant="outline" size="sm" onClick={() => { setBeforeImage(null); setAfterImage(null); }}>
                  Clear Comparison
                </Button>
              </div>
            )}
             <div className="space-y-2">
                <label htmlFor="image-upload" className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted">
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Upload New Photo</span>
                </label>
                <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          {/* Columna Derecha: Información */}
          <div className="space-y-4">
             <div className="flex items-center space-x-3 bg-secondary p-3 rounded-md">
              <div className="text-primary">{Icon}</div>
              <div>
                <p className="font-semibold capitalize">{acquisitionType}</p>
                {plant.acquisitionType === 'purchased' && plant.price && (
                  <p className="text-sm text-muted-foreground">${plant.price.toFixed(2)}</p>
                )}
                {plant.acquisitionType === 'traded' && (
                  <p className="text-sm text-muted-foreground">{plant.tradeReason}</p>
                )}
                 {plant.acquisitionType === 'gifted' && (
                  <p className="text-sm text-muted-foreground">A lovely gift!</p>
                )}
              </div>
            </div>
          
            <Separator />

            <div className="space-y-4">
              <InfoSection icon={<Sun className="h-5 w-5" />} title="Leaf Details">
                {plant.leafInfo}
              </InfoSection>
              <InfoSection icon={<Droplets className="h-5 w-5" />} title="Root Details">
                {plant.rootInfo}
              </InfoSection>
              <InfoSection icon={<Scissors className="h-5 w-5" />} title="Clipping Details">
                {plant.clippingInfo}
              </InfoSection>
            </div>
          </div>
        </div>

        <DialogFooter className="col-span-1 md:col-span-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <Button
            variant={plant.isDeceased ? 'default' : 'destructive'}
            onClick={handleDeceasedToggle}
            className={!plant.isDeceased ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}
          >
            <Skull className="mr-2 h-4 w-4" />
            {plant.isDeceased ? 'Revive Plant' : 'Mark as Deceased'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
