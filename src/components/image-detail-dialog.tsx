'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useEffect, useState } from 'react';
import type { EmblaCarouselType } from 'embla-carousel-react'


interface ImageDetailDialogProps {
  images: { imageUrl: string; date: string }[];
  startIndex: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ImageDetailDialog({
  images,
  startIndex,
  isOpen,
  setIsOpen,
}: ImageDetailDialogProps) {
  const [api, setApi] = useState<EmblaCarouselType>()

  useEffect(() => {
    if (api && isOpen) {
      api.scrollTo(startIndex, true);
    }
  }, [api, isOpen, startIndex]);


  if (!isOpen || !images || images.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl w-full p-2 bg-transparent border-none shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Vista detallada de la galería</DialogTitle>
          <DialogDescription>
            Un carrusel para navegar por las imágenes de la planta seleccionada.
          </DialogDescription>
        </DialogHeader>
        <Carousel setApi={setApi} className='w-full h-full' opts={{startIndex}}>
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                 <div className="relative aspect-auto w-full h-[80vh]">
                    <Image
                      src={image.imageUrl}
                      alt={`Vista detallada de la imagen ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
              </CarouselItem>
            ))}
          </CarouselContent>
           <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
