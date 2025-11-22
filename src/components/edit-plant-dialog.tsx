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
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Scissors, Shovel, Camera, Bug, Beaker, History, X, Upload, Skull, ArrowRightLeft, Plus, RefreshCw, Baby } from 'lucide-react';
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
import { Label } from './ui/label';
import { Separator } from './ui/separator';


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
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
};

interface QuickEventButtonProps extends ButtonProps {
  eventType: PlantEvent['type'];
  plantEvents: PlantEvent[];
  onAdd: (type: PlantEvent['type']) => void;
  onRemove: (eventId: string) => void;
  children: React.ReactNode;
}

const QuickEventButton = ({
  eventType,
  plantEvents,
  onAdd,
  onRemove,
  children,
  variant = 'outline',
  size = 'sm',
  ...props
}: QuickEventButtonProps) => {
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
          <Button variant={variant} size={size} onClick={() => onAdd(eventType)} {...props}>
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

const InputGroup = memo(({ label, type = "text", value, onChange, placeholder }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
    </div>
));
InputGroup.displayName = 'InputGroup';
  
const TextareaGroup = memo(({ label, value, onChange, placeholder }: any) => (
<div className="space-y-1">
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <Textarea value={value || ''} onChange={onChange} placeholder={placeholder} />
</div>
));
TextareaGroup.displayName = 'TextareaGroup';

const SelectGroup = memo(({ label, value, onValueChange, options }: any) => (
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
));
SelectGroup.displayName = 'SelectGroup';

const NewAttemptDialog = ({ isOpen, setIsOpen, plant, onSave }: any) => {
    const [newAttemptData, setNewAttemptData] = useState({
        date: new Date().toISOString().split('T')[0],
        startType: plant.startType,
        location: plant.location,
        acquisitionType: 'regalo' as Plant['acquisitionType'],
        price: '',
        giftFrom: '',
        exchangeSource: '',
        rescuedFrom: '',
        notes: '',
    });

    const handleChange = (field: string, value: any) => {
        setNewAttemptData(prev => ({...prev, [field]: value}));
    };

    const handleConfirm = () => {
        onSave(newAttemptData);
        setIsOpen(false);
    }
    
    const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
    const locationOptions: Plant['location'][] = ['interior', 'exterior'];
    const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'rescatada'];


    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¡Una Nueva Oportunidad!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Define los detalles para este nuevo comienzo. Los datos del intento anterior se guardarán como una nota.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="max-h-[60vh] p-4">
                    <div className="space-y-4">
                        <InputGroup label="Fecha del Nuevo Intento" type="date" value={newAttemptData.date} onChange={(e:any) => handleChange('date', e.target.value)} />
                        <SelectGroup label="Nuevo Comienzo como" value={newAttemptData.startType} onValueChange={(v:any) => handleChange('startType', v)} options={startTypeOptions} />
                        <SelectGroup label="Nueva Ubicación" value={newAttemptData.location} onValueChange={(v:any) => handleChange('location', v)} options={locationOptions} />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SelectGroup label="Tipo de Adquisición" value={newAttemptData.acquisitionType} onValueChange={(v:any) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                            <div className='self-end'>
                                {newAttemptData.acquisitionType === 'compra' && <InputGroup label="Precio" value={newAttemptData.price} onChange={(e:any) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                                {newAttemptData.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={newAttemptData.giftFrom} onChange={(e:any) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" />}
                                {newAttemptData.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={newAttemptData.exchangeSource} onChange={(e:any) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" />}
                                {newAttemptData.acquisitionType === 'rescatada' && <InputGroup label="Rescatada de" value={newAttemptData.rescuedFrom} onChange={(e:any) => handleChange('rescuedFrom', e.target.value)} placeholder="Ubicación" />}
                            </div>
                        </div>

                        <TextareaGroup label="Notas sobre el nuevo intento" value={newAttemptData.notes} onChange={(e:any) => handleChange('notes', e.target.value)} placeholder="Ej: Esqueje de la planta madre..." />
                    </div>
                </ScrollArea>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>Confirmar y Guardar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}


export const EditPlantDialog = memo(function EditPlantDialog({ plant, isOpen, setIsOpen, onSave, onDelete }: any) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [editedPlant, setEditedPlant] = useState(plant);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [imageDetailStartIndex, setImageDetailStartIndex] = useState(0);

  const [isNewAttemptOpen, setIsNewAttemptOpen] = useState(false);
  
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

  const currentAttempt = useMemo(() => {
    return (editedPlant.events || []).reduce((max: number, event: PlantEvent) => Math.max(max, event.attempt || 1), 0) || 1;
  }, [editedPlant.events]);
  
  const handleAddEvent = async (event: Omit<PlantEvent, 'id' | 'note' | 'attempt'> & { note?: string, imageData?: string }, statusChange?: Plant['status']) => {
    if (!firestore || !user || !editedPlant) return;
    
    const eventNote = event.type === 'foto' ? "Se añadió una nueva foto" : (event.note || '');
    const newEvent: PlantEvent = { ...event, id: new Date().getTime().toString(), note: eventNote, attempt: currentAttempt };
    
    let updatedEvents = [...(editedPlant.events || []), newEvent];
    updatedEvents = updatedEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const plantRef = doc(firestore, 'plants', editedPlant.id);
    const updatePayload: Partial<Plant> = { events: updatedEvents };

    if (event.type === 'riego') {
        updatePayload.lastWatered = event.date;
    }
    if (event.type === 'esqueje') {
        toast({ title: '¡Nuevo esqueje registrado!' });
    }
    if (event.type === 'foto' && event.imageData) {
        updatePayload.lastPhotoUpdate = event.date;
        updatePayload.image = event.imageData;
        const newGalleryEntry = { imageUrl: event.imageData, date: event.date, attempt: currentAttempt };
        const currentGallery = editedPlant.gallery || [];
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

  const handleStatusChangeEvent = (status: Plant['status'], note: string) => {
      const eventType = status === 'fallecida' ? 'fallecida' : 'nota';
      handleAddEvent({ type: eventType, date: new Date().toISOString().split('T')[0], note }, status);
  }

  const handleConfirmNewAttempt = async (newAttemptData: any) => {
    if (!firestore || !user || !editedPlant) return;

    const nextAttempt = currentAttempt + 1;
    
    const previousAttemptSummary = `
      Intento anterior (#${currentAttempt}):
      - Duró desde: ${format(parseISO(editedPlant.date), 'dd/MM/yyyy')} hasta ${format(new Date(), 'dd/MM/yyyy')}
      - Empezó como: ${editedPlant.startType}
      - Ubicación: ${editedPlant.location}
      - Adquisición: ${editedPlant.acquisitionType} (${
          editedPlant.acquisitionType === 'compra' ? `$${editedPlant.price}`
          : editedPlant.acquisitionType === 'regalo' ? `de ${editedPlant.giftFrom}`
          : editedPlant.acquisitionType === 'intercambio' ? `por ${editedPlant.exchangeSource}`
          : `de ${editedPlant.rescuedFrom}`
      })
      - Notas: ${editedPlant.notes || 'Ninguna'}
    `;

    const deathEvent: PlantEvent = {
        id: `${new Date().getTime()}-death`,
        type: 'fallecida',
        date: new Date().toISOString().split('T')[0],
        note: `Fin del intento #${currentAttempt}. ${newAttemptData.notes || ''}`,
        attempt: currentAttempt
    };
    
    const revivalEvent: PlantEvent = {
        id: `${new Date().getTime()}-revive`,
        type: 'revivida',
        date: newAttemptData.date,
        note: `Inicio del intento #${nextAttempt}. ${newAttemptData.notes || ''}`,
        attempt: nextAttempt
    };
    
    const updatedEvents = [...(editedPlant.events || []), deathEvent, revivalEvent]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const updatePayload: Partial<Plant> = {
        status: 'viva',
        date: newAttemptData.date,
        startType: newAttemptData.startType,
        location: newAttemptData.location,
        acquisitionType: newAttemptData.acquisitionType,
        price: newAttemptData.price,
        giftFrom: newAttemptData.giftFrom,
        exchangeSource: newAttemptData.exchangeSource,
        rescuedFrom: newAttemptData.rescuedFrom,
        notes: previousAttemptSummary, // Save old data here
        events: updatedEvents,
    };
    
    await onSave(plant.id, updatePayload);
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
        case 'esqueje': note = "Se ha tomado un esqueje de la planta."; break;
        default: note = "Evento registrado."; break;
    }
    handleAddEvent({ type, date: new Date().toISOString().split('T')[0], note });
  };
  
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

  const getGalleryImages = (plant: Plant | null) => {
    if (!plant) return [];
    
    let allImages = [...(plant.gallery || [])];

    if (allImages.length === 0) {
        const eventPhotos = (plant.events || [])
            .filter(e => e.type === 'foto' && e.note && e.note.startsWith('data:image'))
            .map(e => ({ imageUrl: e.note, date: e.date, attempt: e.attempt }));
        allImages.push(...eventPhotos);
    }

    if (plant.image && !allImages.some(img => img.imageUrl === plant.image)) {
        allImages.push({ 
            imageUrl: plant.image, 
            date: plant.lastPhotoUpdate || plant.createdAt?.toDate()?.toISOString() || plant.date,
            attempt: (plant.events || []).reduce((max, e) => Math.max(max, e.attempt || 1), 1)
        });
    }
    
    const uniqueImages = Array.from(new Set(allImages.map(img => img.imageUrl)))
        .map(url => allImages.find(img => img.imageUrl === url)!);

    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const galleryImages = useMemo(() => getGalleryImages(editedPlant), [editedPlant]);

  const eventsByAttempt = useMemo(() => {
    const grouped: { [attempt: number]: PlantEvent[] } = {};
    (editedPlant.events || []).forEach((event: PlantEvent) => {
        const attempt = event.attempt || 1;
        if (!grouped[attempt]) {
            grouped[attempt] = [];
        }
        grouped[attempt].push(event);
    });
    return Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a));
  }, [editedPlant.events]);


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
    revivida: <Plus className="h-4 w-4 text-green-500" />,
    fallecida: <Skull className="h-4 w-4 text-red-500" />,
    esqueje: <Baby className="h-4 w-4 text-cyan-500" />,
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
                        <QuickEventButton eventType='esqueje' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent}><Baby className="mr-1 h-4 w-4"/>Hacer Esqueje</QuickEventButton>
                        
                        <Button variant="outline" size="sm" onClick={() => setIsNewAttemptOpen(true)}><RefreshCw className="mr-1 h-4 w-4"/>Nueva Oportunidad</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleStatusChangeEvent('fallecida', 'La planta ha fallecido')}><Skull className="mr-1 h-4 w-4"/>Falleció</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleStatusChangeEvent('intercambiada', 'La planta fue intercambiada')}><ArrowRightLeft className="mr-1 h-4 w-4"/>Intercambié</Button>
                    </div>

                    <div className="space-y-6">
                        {eventsByAttempt.length > 0 ? (
                            eventsByAttempt.map(([attempt, events]) => (
                                <div key={`attempt-${attempt}`}>
                                    <div className="flex items-center mb-2">
                                        <Separator className="flex-grow" />
                                        <h4 className="px-4 text-sm font-semibold text-muted-foreground">{attempt}º Intento</h4>
                                        <Separator className="flex-grow" />
                                    </div>
                                    <div className="space-y-3">
                                        {events.map((event: PlantEvent) => (
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
                                                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveEvent(event.id)}>Eliminar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">No hay eventos registrados.</p>
                        )}
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
                    <div className="space-y-4 p-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <InputGroup label="Nombre de la Planta" value={editedPlant.name} onChange={(e:any) => handleChange('name', e.target.value)} />
                           <InputGroup label="Tipo (ej. Monstera, Hoya)" value={editedPlant.type} onChange={(e:any) => handleChange('type', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputGroup type="date" label="Fecha de Adquisición" value={editedPlant.date.split('T')[0]} onChange={(e:any) => handleChange('date', e.target.value)} />
                             <SelectGroup label="Comienzo como" value={editedPlant.startType} onValueChange={(v:any) => handleChange('startType', v)} options={startTypeOptions} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectGroup label="Tipo de Adquisición" value={editedPlant.acquisitionType} onValueChange={(v:any) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                            <div className='self-end'>
                                {editedPlant.acquisitionType === 'compra' && <InputGroup label="Precio" value={editedPlant.price} onChange={(e:any) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                                {editedPlant.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={editedPlant.giftFrom} onChange={(e:any) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" />}
                                {editedPlant.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={editedPlant.exchangeSource} onChange={(e:any) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" />}
                                {editedPlant.acquisitionType === 'rescatada' && <InputGroup label="Rescatada de" value={editedPlant.rescuedFrom} onChange={(e:any) => handleChange('rescuedFrom', e.target.value)} placeholder="Ubicación" />}
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <SelectGroup label="Ubicación" value={editedPlant.location} onValueChange={(v:any) => handleChange('location', v)} options={locationOptions} />
                           <SelectGroup label="Estado Actual" value={editedPlant.status} onValueChange={(v:any) => handleChange('status', v)} options={statusOptions} />
                        </div>
                         {editedPlant.status === 'intercambiada' && <InputGroup label="Destino del Intercambio" value={editedPlant.exchangeDest} onChange={(e:any) => handleChange('exchangeDest', e.target.value)} placeholder="Ej: amigo, vivero" />}

                        <TextareaGroup label="Notas Generales" value={editedPlant.notes} onChange={(e:any) => handleChange('notes', e.target.value)} />
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
        plant={plant}
    />
     <NewAttemptDialog 
        isOpen={isNewAttemptOpen}
        setIsOpen={setIsNewAttemptOpen}
        plant={plant}
        onSave={handleConfirmNewAttempt}
     />
    </>
  );
});
