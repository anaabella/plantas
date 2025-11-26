'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type EmblaCarouselType } from '@/components/ui/carousel';
import { useEffect, useState } from 'react';
import type { Plant, PlantEvent } from '@/app/page';
import { format, formatDistanceStrict, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from './ui/button';
import { Trash2, CalendarIcon } from 'lucide-react';
import { useUser } from '@/firebase';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

interface GalleryImage {
    imageUrl: string;
    date: string;
    attempt?: number;
    event?: PlantEvent;
    isMain?: boolean;
    isFromGallery?: boolean;
}

interface ImageDetailDialogProps {
  images: GalleryImage[];
  startIndex: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  plant: Plant | null;
  onDeleteImage: (imageUrl: string) => void;
  onUpdateImageDate: (imageUrl: string, newDate: string) => void;
}

export function ImageDetailDialog({
  images,
  startIndex,
  isOpen,
  setIsOpen,
  plant,
  onDeleteImage,
  onUpdateImageDate
}: ImageDetailDialogProps) {
  const { user } = useUser();
  const [api, setApi] = useState<EmblaCarouselType>()

  useEffect(() => {
    if (api && isOpen) {
      api.scrollTo(startIndex, true);
    }
  }, [api, isOpen, startIndex]);

  const getAcquisitionDateForAttempt = (attempt: number | undefined) => {
    if (!plant || !attempt) return plant?.date;
    const revivalEvent = (plant.events || []).find(e => e.type === 'revivida' && e.attempt === attempt);
    return revivalEvent?.date || plant.date;
  }

  if (!isOpen || !images || images.length === 0) return null;

  const isOwner = plant && user && plant.ownerId === user.uid;

  const handleDateSelect = (imageUrl: string, newDate: Date | undefined) => {
    if (newDate && isOwner) {
      onUpdateImageDate(imageUrl, newDate.toISOString());
    }
  }

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
            {images.map((image, index) => {
              const acquisitionDate = getAcquisitionDateForAttempt(image.attempt);
              const timeSinceAcquisition = acquisitionDate
                ? formatDistanceStrict(parseISO(image.date), parseISO(acquisitionDate), { locale: es, unit: 'day' }).split(' ')[0] === '0'
                  ? 'el día que la conseguí'
                  : `a los ${formatDistanceStrict(parseISO(image.date), parseISO(acquisitionDate), { locale: es })}`
                : '';
              
              const eventTitle = image.event ? `Foto del evento: ${image.event.type}` : null;
              const eventNote = image.event?.note;

              return (
                <CarouselItem key={image.imageUrl}>
                  <div className="relative aspect-auto w-full h-[80vh] flex flex-col items-center justify-center">
                      <Image
                        src={image.imageUrl}
                        alt={`Vista detallada de la imagen ${index + 1}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-[90%] bg-black/60 text-white text-sm py-2 px-4 rounded-full text-center">
                          {eventTitle && <p className="font-bold capitalize">{eventTitle}</p>}
                          {eventNote && <p className="text-xs italic">"{eventNote}"</p>}
                          <div className='flex items-center justify-center gap-2 mt-1'>
                            <span>{timeSinceAcquisition} ({format(parseISO(image.date), 'dd/MM/yy')})</span>
                            {isOwner && (
                               <Popover>
                                <PopoverTrigger asChild>
                                  <button className='bg-transparent border-none p-0 h-auto'>
                                    <CalendarIcon className="h-4 w-4 text-white/80 hover:text-white transition-colors" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={parseISO(image.date)}
                                    onSelect={(newDate) => handleDateSelect(image.imageUrl, newDate)}
                                    initialFocus
                                    locale={es}
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                      </div>

                      {isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="absolute top-4 left-4 z-10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente esta foto.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteImage(image.imageUrl)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
           <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
