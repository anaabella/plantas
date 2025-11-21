'use client';

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Save, Droplets, Scissors, Shovel, Camera, Bug, Beaker, History, X, Upload, Pencil, Skull, ArrowRightLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Plant, PlantEvent } from '@/app/page';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { CameraCaptureDialog } from './camera-capture-dialog';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageDetailDialog } from './image-detail-dialog';


// Función para comprimir imágenes
const compressImage = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
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

export const EditPlantDialog = memo(function EditPlantDialog({ plant, isOpen, setIsOpen, onSave, onDelete }: any) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [editedPlant, setEditedPlant] = useState(plant);
  
  const [newEventNote, setNewEventNote] = useState("");
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  
  useEffect(() => {
    setEditedPlant(plant);
  }, [plant, isOpen]);

  const handleOpenImageDetail = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsImageDetailOpen(true);
  };
  
  const handleChange = (field: keyof Plant, value: any) => {
    setEditedPlant({ ...editedPlant, [field]: value });
  };
  
  const handleSave = () => {
    onSave(plant.id, editedPlant);
    // Vuelve a la pestaña de bitácora después de guardar
  };
  
  const handleAddEvent = async (event: Omit<PlantEvent, 'id' | 'note'> & { note?: string }, statusChange?: Plant['status']) => {
    if (!firestore || !user || !editedPlant) return;
    const newEvent = { ...event, id: new Date().getTime().toString(), note: event.note || '' };
    let updatedEvents = [...(editedPlant.events || []), newEvent];
    // Sort events after adding to make sure they are in order
    updatedEvents = updatedEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const plantRef = doc(firestore, 'plants', editedPlant.id);
    const updatePayload: Partial<Plant> = { events: updatedEvents };

    if (event.type === 'riego') {
        updatePayload.lastWatered = event.date;
    }
    if (event.type === 'foto' && event.note) {
        updatePayload.lastPhotoUpdate = event.date;
        updatePayload.image = event.note; // Update main image to the latest one
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

  const handleAddNoteConfirm = () => {
    if (!newEventNote) return;
    handleAddEvent({ type: 'nota', date: newEventDate, note: newEventNote });
    setNewEventNote("");
    setNewEventDate(new Date().toISOString().split('T')[0]);
    setIsNotePopoverOpen(false);
  };

  const handleStatusChange = (status: Plant['status'], note: string) => {
      handleAddEvent({ type: 'nota', date: new Date().toISOString().split('T')[0], note }, status);
  }
  
  const handlePhotoCaptured = (photoDataUri: string) => {
    handleAddEvent({type: 'foto', date: new Date().toISOString().split('T')[0], note: photoDataUri});
    setIsCameraOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        compressImage(file, (compressedDataUrl) => {
            handleAddEvent({type: 'foto', date: new Date().toISOString().split('T')[0], note: compressedDataUrl});
        });
    }
  };

  const galleryImages = useMemo(() => {
    if (!editedPlant) return [];
    // Include the main image if it exists
    const mainImage = editedPlant.image ? [{ imageUrl: editedPlant.image, date: editedPlant.lastPhotoUpdate || editedPlant.createdAt?.toDate()?.toISOString() || editedPlant.date }] : [];
    // Get all photos from events
    const eventPhotos = (editedPlant.events || [])
      .filter(e => e.type === 'foto' && e.note)
      .map(e => ({ imageUrl: e.note, date: e.date }));
    
    // Combine, create a Set to remove duplicates by imageUrl, then convert back to array
    const allImages = [...mainImage, ...eventPhotos];
    const uniqueImages = Array.from(new Set(allImages.map(img => img.imageUrl)))
        .map(url => allImages.find(img => img.imageUrl === url)!);

    // Sort by date, most recent first
    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [editedPlant]);


  const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'rescatada'];
  const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
  const locationOptions: Plant['location'][] = ['interior', 'exterior'];
  const statusOptions: Plant['status'][] = ['viva', 'fallecida', 'intercambiada'];

  const eventIcons: { [key in PlantEvent['type']]: React.ReactElement } = {
    riego: <Droplets className="h-4 w-4 text-blue-500" />,
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
            <div className='flex justify-between items-center'>
                <TabsList>
                    <TabsTrigger value="log">Bitácora</TabsTrigger>
                    <TabsTrigger value="gallery">Galería</TabsTrigger>
                    <TabsTrigger value="edit">Editar</TabsTrigger>
                </TabsList>
            </div>
            <ScrollArea className="h-[60vh] p-1 mt-4">
                <TabsContent value="log" className='p-1'>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Eventos Rápidos</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
                        <Button variant="outline" size="sm" onClick={() => handleQuickAddEvent('poda')}><Scissors className="mr-1 h-4 w-4"/>Podar</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAddEvent('transplante')}><Shovel className="mr-1 h-4 w-4"/>Transplantar</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAddEvent('fertilizante')}><Beaker className="mr-1 h-4 w-4"/>Fertilizar</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAddEvent('plaga')}><Bug className="mr-1 h-4 w-4"/>Plaga</Button>
                        <Button variant="outline" size="sm" onClick={() => handleAddEvent({type: 'nota', date: new Date().toISOString().split('T')[0], note: 'Se intercambió un gajo'})}><ArrowRightLeft className="mr-1 h-4 w-4"/>Intercambié gajo</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleStatusChange('fallecida', 'La planta ha fallecido')}><Skull className="mr-1 h-4 w-4"/>Falleció</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleStatusChange('intercambiada', 'La planta fue intercambiada')}><ArrowRightLeft className="mr-1 h-4 w-4"/>Intercambié</Button>
                        <Popover open={isNotePopoverOpen} onOpenChange={setIsNotePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm"><History className="mr-1 h-4 w-4"/>Añadir Nota</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Nueva Nota</h4>
                                    <p className="text-sm text-muted-foreground">Añade una nota al historial de la planta.</p>
                                </div>
                                <div className="grid gap-2">
                                    <Input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                                    <Textarea value={newEventNote} onChange={(e) => setNewEventNote(e.target.value)} placeholder="Escribe tu nota aquí..." />
                                    <Button onClick={handleAddNoteConfirm}>Guardar Nota</Button>
                                </div>
                                </div>
                            </PopoverContent>
                        </Popover>
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
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveEvent(event.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
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
                            <div key={index} className="relative aspect-square w-full rounded-md overflow-hidden border group cursor-pointer" onClick={() => handleOpenImageDetail(image.imageUrl)}>
                                <Image src={image.imageUrl} alt={`Gallery image ${index + 1}`} fill className="object-cover" />
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
                     <div className="flex justify-end mt-6">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className='mr-2'><Trash2 className="h-4 w-4 mr-2"/>Eliminar Planta</Button>
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
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
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
        imageUrl={selectedImageUrl}
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
