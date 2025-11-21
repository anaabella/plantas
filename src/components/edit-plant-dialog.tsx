'use client';

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
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
  AlertDialogTrigger,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Scissors, Shovel, Camera, Bug, Beaker, History, X, Upload, Skull, ArrowRightLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Plant, PlantEvent } from '@/app/page';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { CameraCaptureDialog } from './camera-capture-dialog';
import { ScrollArea } from './ui/scroll-area';
import NextImage from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageDetailDialog } from './image-detail-dialog';
import { useToast } from '@/hooks/use-toast';


// Función para comprimir imágenes
const compressImage = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Comprimir a JPEG con calidad 0.7
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
};

// Componente para los botones de eventos rápidos con menú contextual
const QuickEventButton = ({
  eventType,
  plantEvents,
  onAdd,
  onRemove,
  children,
  variant = 'outline',
  size = 'sm',
}: {
  eventType: PlantEvent['type'];
  plantEvents: PlantEvent[];
  onAdd: (type: PlantEvent['type']) => void;
  onRemove: (eventId: string) => void;
  children: React.ReactNode;
  variant?: 'outline' | 'destructive';
  size?: 'sm';
}) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  
  const findLastEventId = () => {
    const lastEvent = plantEvents
      ?.filter(e => e.type === eventType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      [0];
    return lastEvent?.id;
  };

  const handleRemoveClick = () => {
    const lastEventId = findLastEventId();
    if (lastEventId) {
      setIsAlertOpen(true);
    }
  };

  const confirmRemove = () => {
    const lastEventId = findLastEventId();
    if (lastEventId) {
      onRemove(lastEventId);
    }
    setIsAlertOpen(false);
  };
  
  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <ContextMenu>
        <ContextMenuTrigger>
          <Button variant={variant} size={size} onClick={() => onAdd(eventType)}>
            {children}
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleRemoveClick} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar último
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar último evento de "{eventType}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará el evento más reciente de este tipo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmRemove}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


export const EditPlantDialog = memo(function EditPlantDialog({ plant, isOpen, setIsOpen, onSave, onDelete }: any) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [editedPlant, setEditedPlant] = useState(plant);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [imageDetailStartIndex, setImageDetailStartIndex] = useState(0);
  
  useEffect(() => {
    setEditedPlant(plant);
  }, [plant, isOpen]);

  const handleOpenImageDetail = (index: number) => {
    setImageDetailStartIndex(index);
    setIsImageDetailOpen(true);
  };
  
  const handleChange = (field: keyof Plant, value: any) => {
    setEditedPlant({ ...editedPlant, [field]: value });
  };
  
  const handleSave = () => {
    onSave(plant.id, editedPlant);
  };
  
  const handleAddEvent = async (event: Omit<PlantEvent, 'id' | 'note'> & { note?: string, imageData?: string }, statusChange?: Plant['status']) => {
    if (!firestore || !user || !editedPlant) return;
    
    const eventNote = event.type === 'foto' ? "Se añadió una nueva foto" : (event.note || '');
    const newEvent: PlantEvent = { ...event, id: new Date().getTime().toString(), note: eventNote };
    
    let updatedEvents = [...(editedPlant.events || []), newEvent];
    // Sort events after adding to make sure they are in order
    updatedEvents = updatedEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const plantRef = doc(firestore, 'plants', editedPlant.id);
    const updatePayload: Partial<Plant> = { events: updatedEvents };

    if (event.type === 'riego') {
        updatePayload.lastWatered = event.date;
    }
    if (event.type === 'foto' && event.imageData) {
        updatePayload.lastPhotoUpdate = event.date;
        updatePayload.image = event.imageData; // Update main image to the latest one
        // Add image to gallery structure
        const newGalleryEntry = { imageUrl: event.imageData, date: event.date };
        const currentGallery = editedPlant.gallery || [];
        // Prevent duplicates
        if (!currentGallery.some(g => g.imageUrl === newGalleryEntry.imageUrl)) {
            updatePayload.gallery = [newGalleryEntry, ...currentGallery];
        }
        toast({ title: 'Nueva foto añadida' });
    }
    if (statusChange) {
        updatePayload.status = statusChange;
    }

    await updateDoc(plantRef, updatePayload);
    setEditedPlant({ ...editedPlant, ...updatePayload });
  };
  
  const handleRemoveEvent = async (eventId: string) => {
    if (!firestore || !user || !editedPlant) return;
    const updatedEvents = editedPlant.events.filter((e: PlantEvent) => e.id !== eventId);
    const plantRef = doc(firestore, 'plants', editedPlant.id);
    await updateDoc(plantRef, { events: updatedEvents });
    setEditedPlant({ ...editedPlant, events: updatedEvents });
    toast({title: "Evento eliminado"});
  };

  const handleQuickAddEvent = (type: PlantEvent['type']) => {
    let note = "";
    switch (type) {
        case 'poda': note = "Poda de mantenimiento realizada."; break;
        case 'transplante': note = "Movida a una maceta más grande."; break;
        case 'fertilizante': note = "Nutrientes añadidos."; break;
        case 'plaga': note = "Se detectó y trató una plaga."; break;
        default: note = "Evento registrado."; break;
    }
    handleAddEvent({ type, date: new Date().toISOString().split('T')[0], note });
  };

  const handleStatusChange = (status: Plant['status'], note: string) => {
      handleAddEvent({ type: 'nota', date: new Date().toISOString().split('T')[0], note }, status);
  }
  
  const handlePhotoCaptured = (photoDataUri: string) => {
    handleAddEvent({type: 'foto', date: new Date().toISOString().split('T')[0], imageData: photoDataUri});
    setIsCameraOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        compressImage(file, (compressedDataUrl) => {
            handleAddEvent({type: 'foto', date: new Date().toISOString().split('T')[0], imageData: compressedDataUrl});
        });
    }
  };

  const galleryImages = useMemo(() => {
    if (!editedPlant) return [];
    
    let allImages = [...(editedPlant.gallery || [])];

    if (allImages.length === 0) {
        const eventPhotos = (editedPlant.events || [])
            .filter(e => e.type === 'foto' && e.note && e.note.startsWith('data:image'))
            .map(e => ({ imageUrl: e.note, date: e.date }));
        allImages.push(...eventPhotos);
    }

    if (editedPlant.image && !allImages.some(img => img.imageUrl === editedPlant.image)) {
        allImages.push({ 
            imageUrl: editedPlant.image, 
            date: editedPlant.lastPhotoUpdate || editedPlant.createdAt?.toDate()?.toISOString() || editedPlant.date 
        });
    }
    
    const uniqueImages = Array.from(new Set(allImages.map(img => img.imageUrl)))
        .map(url => allImages.find(img => img.imageUrl === url)!);

    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [editedPlant]);


  const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'rescatada'];
  const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
  const locationOptions: Plant['location'][] = ['interior', 'exterior'];
  const statusOptions: Plant['status'][] = ['viva', 'fallecida', 'intercambiada'];

  const eventIcons: { [key in PlantEvent['type']]: React.ReactElement } = {
    riego: <Scissors className="h-4 w-4 text-blue-500" />,
    poda: <Scissors className="h-4 w-4 text-gray-500" />,
    transplante: <Shovel className="h-4 w-4 text-orange-500" />,
    foto: <Camera className="h-4 w-4 text-purple-500" />,
    plaga: <Bug className="h-4 w-4 text-red-500" />,
    fertilizante: <Beaker className="h-4 w-4 text-green-500" />,
    nota: <History className="h-4 w-4 text-yellow-500" />,
  };
  
  if (!editedPlant) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-2xl sm:text-3xl font-bold font-headline">{editedPlant.name}</DialogTitle>
          <DialogDescription>Modifica los detalles o revisa el historial.</DialogDescription>
        </DialogHeader>

         <Tabs defaultValue="log" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="log">Bitácora</TabsTrigger>
                <TabsTrigger value="gallery">Galería</TabsTrigger>
                <TabsTrigger value="edit">Editar</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[60vh] p-1 mt-4">
                <TabsContent value="log" className='p-1'>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Eventos Rápidos</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                        <QuickEventButton eventType='poda' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent}><Scissors className="mr-1 h-4 w-4"/>Podar</QuickEventButton>
                        <QuickEventButton eventType='transplante' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent}><Shovel className="mr-1 h-4 w-4"/>Transplantar</QuickEventButton>
                        <QuickEventButton eventType='fertilizante' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent}><Beaker className="mr-1 h-4 w-4"/>Fertilizar</QuickEventButton>
                        <QuickEventButton eventType='plaga' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent}><Bug className="mr-1 h-4 w-4"/>Plaga</QuickEventButton>
                        
                        <Button variant="outline" size="sm" onClick={() => handleAddEvent({type: 'nota', date: new Date().toISOString().split('T')[0], note: 'Se intercambió un gajo'})}><ArrowRightLeft className="mr-1 h-4 w-4"/>Intercambié gajo</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleStatusChange('fallecida', 'La planta ha fallecido')}><Skull className="mr-1 h-4 w-4"/>Falleció</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleStatusChange('intercambiada', 'La planta fue intercambiada')}><ArrowRightLeft className="mr-1 h-4 w-4"/>Intercambié</Button>
                    </div>
                    <div className="space-y-3">
                        {editedPlant.events?.map((event: PlantEvent) => (
                            <div key={event.id} className="flex items-start justify-between p-2 rounded-md bg-secondary/50">
                                <div className="flex items-start gap-3">
                                    {eventIcons[event.type]}
                                    <div>
                                        <p className="font-semibold capitalize">{event.type}</p>
                                        <p className="text-sm text-muted-foreground">{event.note}</p>
                                        <p className="text-xs text-muted-foreground/70">{format(parseISO(event.date), "d 'de' MMMM, yyyy", { locale: es })}</p>
                                    </div>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Seguro que quieres eliminar este evento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveEvent(event.id)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                        {(!editedPlant.events || editedPlant.events?.length === 0) && <p className="text-sm text-center text-muted-foreground py-4">No hay eventos registrados.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="gallery" className='p-1'>
                    <div className="flex gap-2 mb-4">
                        <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                        <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Subir
                        </Button>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setIsCameraOpen(true)}>
                            <Camera className="mr-2 h-4 w-4" /> Capturar
                        </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {galleryImages.map((image, index) => (
                            <div key={index} className="relative aspect-square w-full rounded-md overflow-hidden border group cursor-pointer" onClick={() => handleOpenImageDetail(index)}>
                                <NextImage src={image.imageUrl} alt={`Gallery image ${index + 1}`} fill className="object-cover" unoptimized />
                                <div className="absolute bottom-0 w-full bg-black/60 text-white text-center text-xs py-0.5">
                                    {format(parseISO(image.date), 'dd/MM/yy', { locale: es })}
                                </div>
                            </div>
                        ))}
                    </div>
                    {galleryImages.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No hay fotos en la galería.</p>}
                </TabsContent>
                <TabsContent value="edit" className='p-1'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                        <div className="space-y-4">
                            <InputGroup label="Nombre de la Planta" value={editedPlant.name} onChange={(e:any) => handleChange('name', e.target.value)} />
                            <InputGroup type="date" label="Fecha de Adquisición" value={editedPlant.date.split('T')[0]} onChange={(e:any) => handleChange('date', e.target.value)} />
                            <SelectGroup label="Tipo de Adquisición" value={editedPlant.acquisitionType} onValueChange={(v:any) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                            {editedPlant.acquisitionType === 'compra' && <InputGroup label="Precio" value={editedPlant.price} onChange={(e:any) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                            {editedPlant.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={editedPlant.giftFrom} onChange={(e:any) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" />}
                            {editedPlant.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={editedPlant.exchangeSource} onChange={(e:any) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" />}
                            {editedPlant.acquisitionType === 'rescatada' && <InputGroup label="Rescatada de" value={editedPlant.rescuedFrom} onChange={(e:any) => handleChange('rescuedFrom', e.target.value)} placeholder="Ubicación" />}
                            <TextareaGroup label="Notas Generales" value={editedPlant.notes} onChange={(e:any) => handleChange('notes', e.target.value)} />
                        </div>
                        <div className="space-y-4">
                            <SelectGroup label="Comienzo como" value={editedPlant.startType} onValueChange={(v:any) => handleChange('startType', v)} options={startTypeOptions} />
                            <SelectGroup label="Ubicación" value={editedPlant.location} onValueChange={(v:any) => handleChange('location', v)} options={locationOptions} />
                            <SelectGroup label="Estado Actual" value={editedPlant.status} onValueChange={(v:any) => handleChange('status', v)} options={statusOptions} />
                            {editedPlant.status === 'intercambiada' && <InputGroup label="Destino del Intercambio" value={editedPlant.exchangeDest} onChange={(e:any) => handleChange('exchangeDest', e.target.value)} placeholder="Ej: amigo, vivero" />}
                        </div>
                    </div>
                     <div className="mt-6 flex justify-between items-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente la planta y todos sus datos.
                              </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(plant.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar Cambios</Button>
                    </div>
                </TabsContent>
            </ScrollArea>
        </Tabs>
        
      </DialogContent>
    </Dialog>
    <CameraCaptureDialog 
        isOpen={isCameraOpen} 
        setIsOpen={setIsCameraOpen}
        onPhotoCaptured={handlePhotoCaptured}
    />
    <ImageDetailDialog 
        isOpen={isImageDetailOpen} 
        setIsOpen={setIsImageDetailOpen}
        images={galleryImages}
        startIndex={imageDetailStartIndex}
    />
    </>
  );
});

const InputGroup = ({ label, type = "text", value, onChange, placeholder }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
  </div>
);

const TextareaGroup = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Textarea value={value || ''} onChange={onChange} placeholder={placeholder} />
  </div>
);

const SelectGroup = ({ label, value, onValueChange, options }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>{value ? value.charAt(0).toUpperCase() + value.slice(1) : `Select ${label}`}</SelectTrigger>
      <SelectContent>
        {options.map((option: string) => (
          <SelectItem key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
