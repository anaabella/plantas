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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { Trash2, Save, Scissors, Shovel, Camera, Bug, Beaker, History, X, Skull, ArrowRightLeft, Plus, RefreshCw, Sprout, Upload, Droplets, Info, Flower2, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Plant, PlantEvent, UserProfile } from '@/app/page';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import NextImage from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageDetailDialog } from './image-detail-dialog';
import { Separator } from './ui/separator';
import { ImageCropDialog } from './image-crop-dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import * as LucideIcons from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


interface QuickEventButtonProps extends ButtonProps {
  eventType: PlantEvent['type'];
  plantEvents: PlantEvent[];
  onAdd: (type: PlantEvent['type']) => void;
  onRemove: (eventId: string) => void;
  children: React.ReactNode;
  label: string;
}

const QuickEventButton = ({
  eventType,
  plantEvents,
  onAdd,
  onRemove,
  children,
  variant = 'outline',
  label,
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
  
  const button = (
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant={variant} size="sm" onClick={() => onAdd(eventType)} {...props} className="w-full justify-start">
                      {children}
                      <span className="ml-2 hidden sm:inline">{label}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent className='sm:hidden'>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

  return button;
};

const InputGroup = memo(({ label, type = "text", value, onChange, placeholder, listId }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} list={listId} />
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

const defaultEventIcons: Record<PlantEvent['type'], React.ReactElement> = {
  riego: <Droplets className="h-4 w-4 text-blue-500" />,
  poda: <Scissors className="h-4 w-4 text-gray-500" />,
  transplante: <Shovel className="h-4 w-4 text-orange-500" />,
  foto: <Camera className="h-4 w-4 text-purple-500" />,
  plaga: <Bug className="h-4 w-4 text-red-500" />,
  fertilizante: <Beaker className="h-4 w-4 text-green-500" />,
  nota: <History className="h-4 w-4 text-yellow-500" />,
  revivida: <Plus className="h-4 w-4 text-green-500" />,
  fallecida: <Skull className="h-4 w-4 text-red-500" />,
  esqueje: <Sprout className="h-4 w-4 text-cyan-500" />,
  floracion: <Flower2 className="h-4 w-4 text-pink-500" />,
};

const getIcon = (iconName: string, className: string): React.ReactElement => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <Sprout className={className} />;
};


export const EditPlantDialog = memo(function EditPlantDialog({ plant, isOpen, setIsOpen, onSave, onDelete, userProfile, plants }: { plant: Plant; isOpen: boolean; setIsOpen: (isOpen: boolean) => void; onSave: (id: string, data: Partial<Plant>) => void; onDelete: (id: string) => void; userProfile: UserProfile | null; plants: Plant[] }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [editedPlant, setEditedPlant] = useState(plant);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(4/5);
  const [isMobile, setIsMobile] = useState(false);
  
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const [isImageDetailOpen, setIsImageDetailOpen] = useState(false);
  const [imageDetailStartIndex, setImageDetailStartIndex] = useState(0);

  const [isNewAttemptOpen, setIsNewAttemptOpen] = useState(false);
  
  useEffect(() => {
    setEditedPlant(plant);
  }, [plant, isOpen]);

  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);
  
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
    
    const plantRef = doc(firestore, 'plants', editedPlant.id);
    const updatePayload: Partial<Plant> = { events: updatedEvents };

    if (event.type === 'riego') {
        updatePayload.lastWatered = event.date;
    }
    if (event.type === 'foto' && event.imageData) {
        updatePayload.lastPhotoUpdate = event.date;
        updatePayload.image = event.imageData;
        const newGalleryEntry = { imageUrl: event.imageData, date: event.date, attempt: currentAttempt };
        const currentGallery = editedPlant.gallery || [];
        if (!currentGallery.some(g => g.imageUrl === newGalleryEntry.imageUrl)) {
            updatePayload.gallery = [newGalleryEntry, ...currentGallery];
        }
    }
    if (statusChange) {
        updatePayload.status = statusChange;
    }

    await updateDoc(plantRef, updatePayload);
    setEditedPlant({ ...editedPlant, ...updatePayload });
  };

  const handleStatusChangeEvent = (status: Plant['status'], note: string) => {
      handleAddEvent({ type: status === 'fallecida' ? 'fallecida' : 'nota', date: new Date().toISOString().split('T')[0], note }, status);
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
    
    const updatedEvents = [...(editedPlant.events || []), deathEvent, revivalEvent];

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
  };

  const handleQuickAddEvent = (type: PlantEvent['type']) => {
    let note = "";
    switch (type) {
        case 'poda': note = "Poda de mantenimiento realizada."; break;
        case 'transplante': note = "Movida a una maceta más grande."; break;
        case 'fertilizante': note = "Nutrientes añadidos."; break;
        case 'plaga': note = "Se detectó y trató una plaga."; break;
        case 'esqueje': note = "Se ha tomado un esqueje de la planta."; break;
        case 'floracion': note = "La planta ha florecido."; break;
        default: note = "Evento registrado."; break;
    }
    handleAddEvent({ type, date: new Date().toISOString().split('T')[0], note });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageToCrop(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
        event.target.value = "";
    }
  };
  
  const triggerFileUpload = (aspect: number | undefined) => {
    setCropAspect(aspect);
    uploadInputRef.current?.click();
  }

  const triggerCameraCapture = (aspect: number | undefined) => {
    setCropAspect(aspect);
    captureInputRef.current?.click();
  }

  const handleCroppedImage = (croppedImageDataUrl: string) => {
    handleAddEvent({type: 'foto', date: new Date().toISOString().split('T')[0], imageData: croppedImageDataUrl});
    setImageToCrop(null);
  };
    
  const handleDeleteImage = async (imageUrlToDelete: string) => {
    if (!firestore || !user || !editedPlant) return;
    
    const updatedGallery = editedPlant.gallery?.filter(img => img.imageUrl !== imageUrlToDelete) || [];
    const updatePayload: Partial<Plant> = { gallery: updatedGallery };
    
    if (editedPlant.image === imageUrlToDelete) {
        updatePayload.image = updatedGallery.length > 0 ? updatedGallery[0].imageUrl : '';
    }

    const plantRef = doc(firestore, 'plants', editedPlant.id);
    await updateDoc(plantRef, updatePayload);
    
    setEditedPlant(prev => ({...prev, ...updatePayload }));

    if(updatedGallery.length === 0){
        setIsImageDetailOpen(false);
    }
  };

  const handleUpdateImageDate = async (imageUrl: string, newDate: string) => {
    if (!firestore || !user || !editedPlant) return;
    
    const updatedGallery = (editedPlant.gallery || []).map(img => 
      img.imageUrl === imageUrl ? { ...img, date: newDate } : img
    );

    const updatePayload: Partial<Plant> = { gallery: updatedGallery };

    const plantRef = doc(firestore, 'plants', editedPlant.id);
    await updateDoc(plantRef, updatePayload);
    
    setEditedPlant(prev => ({...prev, ...updatePayload }));
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
            date: plant.lastPhotoUpdate || plant.createdAt?.toDate?.()?.toISOString() || plant.date,
            attempt: (plant.events || []).reduce((max, e) => Math.max(max, e.attempt || 1), 1)
        });
    }
    
    const uniqueImages = Array.from(new Set(allImages.map(img => img.imageUrl)))
        .map(url => allImages.find(img => img.imageUrl === url)!);

    return uniqueImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const galleryImages = useMemo(() => getGalleryImages(editedPlant), [editedPlant]);

  const eventsByAttempt = useMemo(() => {
      const sortedEvents = [...(editedPlant.events || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const grouped: { [attempt: number]: PlantEvent[] } = {};
      
      sortedEvents.forEach((event: PlantEvent) => {
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

  const eventIcons = useMemo(() => {
    const customIcons = userProfile?.eventIconConfiguration;
    if (!customIcons) return defaultEventIcons;

    const mergedIcons: any = { ...defaultEventIcons };
    for (const key in customIcons) {
        const eventType = key as PlantEvent['type'];
        const iconName = customIcons[eventType];
        if (iconName) {
            mergedIcons[eventType] = getIcon(iconName, "h-4 w-4");
        }
    }
    return mergedIcons;
  }, [userProfile]);

  
  if (!editedPlant) return null;

  const uniqueTypes = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.type).filter(Boolean))), [plants]);
  const uniqueGiftFrom = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.giftFrom).filter(Boolean))), [plants]);
  const uniqueExchangeSource = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.exchangeSource).filter(Boolean))), [plants]);
  const uniqueRescuedFrom = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.rescuedFrom).filter(Boolean))), [plants]);

  return (
    <>
      <datalist id="plant-types-edit">
        {uniqueTypes.map(type => <option key={type} value={type} />)}
      </datalist>
      <datalist id="gift-from-list-edit">
        {uniqueGiftFrom.map(name => <option key={name} value={name} />)}
      </datalist>
      <datalist id="exchange-source-list-edit">
        {uniqueExchangeSource.map(source => <option key={source} value={source} />)}
      </datalist>
      <datalist id="rescued-from-list-edit">
        {uniqueRescuedFrom.map(location => <option key={location} value={location} />)}
      </datalist>

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
                      <div className="space-y-4 mb-6">
                        <h3 className="font-semibold px-1">Eventos Rápidos</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                           <QuickEventButton eventType='poda' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent} label="Poda"><Scissors/></QuickEventButton>
                           <QuickEventButton eventType='transplante' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent} label="Transplante"><Shovel/></QuickEventButton>
                           <QuickEventButton eventType='fertilizante' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent} label="Fertilizante"><Beaker/></QuickEventButton>
                           <QuickEventButton eventType='plaga' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent} label="Plaga"><Bug/></QuickEventButton>
                           <QuickEventButton eventType='esqueje' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent} label="Esqueje"><Sprout/></QuickEventButton>
                           <QuickEventButton eventType='floracion' plantEvents={editedPlant.events} onAdd={handleQuickAddEvent} onRemove={handleRemoveEvent} label="Floración"><Flower2/></QuickEventButton>
                           <QuickEventButton eventType='nota' plantEvents={editedPlant.events} onAdd={() => handleAddEvent({ type: 'nota', date: new Date().toISOString().split('T')[0], note: prompt("Añade una nota:") || "" })} onRemove={handleRemoveEvent} label="Nota"><Info/></QuickEventButton>
                        </div>
                        <div className='flex flex-col space-y-2'>
                           <Button variant="outline" size="sm" onClick={() => setIsNewAttemptOpen(true)}><RefreshCw className="mr-2 h-4 w-4"/>Nueva Oportunidad</Button>
                           <Button variant="destructive" size="sm" onClick={() => handleStatusChangeEvent('fallecida', 'La planta ha fallecido')}><Skull className="mr-2 h-4 w-4"/>Falleció</Button>
                           <Button variant="destructive" size="sm" onClick={() => handleStatusChangeEvent('intercambiada', 'La planta fue intercambiada')}><ArrowRightLeft className="mr-2 h-4 w-4"/>Intercambié</Button>
                        </div>
                      </div>
                      
                      <Accordion type="multiple" defaultValue={[`attempt-${currentAttempt}`]} className="w-full">
                          {eventsByAttempt.length > 0 ? (
                              eventsByAttempt.map(([attempt, events]) => (
                                <AccordionItem key={`attempt-${attempt}`} value={`attempt-${attempt}`}>
                                    <AccordionTrigger className="text-sm font-semibold text-muted-foreground">
                                        {Number(attempt) === currentAttempt ? 'Intento Actual' : `Intento Anterior #${attempt}`}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-2">
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
                                    </AccordionContent>
                                </AccordionItem>
                              ))
                          ) : (
                              <p className="text-sm text-center text-muted-foreground py-4">No hay eventos registrados.</p>
                          )}
                      </Accordion>
                  </TabsContent>
                  <TabsContent value="gallery" className='p-1'>
                      <div className="grid gap-2 mb-4 grid-cols-2">
                          <Button variant="outline" size="sm" onClick={() => triggerFileUpload(4/5)}>Subir Cuadrada</Button>
                          <Button variant="outline" size="sm" onClick={() => triggerFileUpload(undefined)}>Subir Libre</Button>
                          {isMobile && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => triggerCameraCapture(4/5)}>Captura Cuadrada</Button>
                              <Button variant="outline" size="sm" onClick={() => triggerCameraCapture(undefined)}>Captura Libre</Button>
                            </>
                          )}
                          <Input type="file" accept="image/*" onChange={handleFileChange} ref={uploadInputRef} className="hidden" />
                          <Input type="file" accept="image/*" capture="environment" onChange={handleFileChange} ref={captureInputRef} className="hidden" />
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
                             <InputGroup label="Tipo (ej. Monstera, Hoya)" value={editedPlant.type} onChange={(e:any) => handleChange('type', e.target.value)} listId="plant-types-edit" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <InputGroup type="date" label="Fecha de Adquisición" value={editedPlant.date.split('T')[0]} onChange={(e:any) => handleChange('date', e.target.value)} />
                               <SelectGroup label="Comienzo como" value={editedPlant.startType} onValueChange={(v:any) => handleChange('startType', v)} options={startTypeOptions} />
                          </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <SelectGroup label="Tipo de Adquisición" value={editedPlant.acquisitionType} onValueChange={(v:any) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                              <div className='self-end'>
                                  {editedPlant.acquisitionType === 'compra' && <InputGroup label="Precio" value={editedPlant.price} onChange={(e:any) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                                  {editedPlant.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={editedPlant.giftFrom} onChange={(e:any) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" listId="gift-from-list-edit"/>}
                                  {editedPlant.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={editedPlant.exchangeSource} onChange={(e:any) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" listId="exchange-source-list-edit"/>}
                                  {editedPlant.acquisitionType === 'rescatada' && <InputGroup label="Rescatada de" value={editedPlant.rescuedFrom} onChange={(e:any) => handleChange('rescuedFrom', e.target.value)} placeholder="Ubicación" listId="rescued-from-list-edit"/>}
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
      <ImageDetailDialog 
          isOpen={isImageDetailOpen} 
          setIsOpen={setIsImageDetailOpen}
          images={galleryImages}
          startIndex={imageDetailStartIndex}
          plant={plant}
          onDeleteImage={handleDeleteImage}
          onUpdateImageDate={handleUpdateImageDate}
      />
       <NewAttemptDialog 
          isOpen={isNewAttemptOpen}
          setIsOpen={setIsNewAttemptOpen}
          plant={plant}
          onSave={handleConfirmNewAttempt}
       />
       {imageToCrop && (
        <ImageCropDialog 
            isOpen={!!imageToCrop}
            setIsOpen={() => setImageToCrop(null)}
            imageSrc={imageToCrop}
            onCropComplete={handleCroppedImage}
            aspect={cropAspect}
        />
      )}
    </>
  );
});
