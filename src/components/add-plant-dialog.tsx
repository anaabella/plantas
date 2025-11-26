'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useRef, memo, useEffect, useMemo, useCallback } from 'react';
import type { Plant, UserProfile } from '@/app/page';
import { Camera, Upload, Flower2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { ImageCropDialog } from './image-crop-dialog';

const getEmptyPlant = () => ({
  name: '',
  type: '',
  date: new Date().toISOString().split('T')[0],
  status: 'viva' as Plant['status'],
  image: '',
  startType: 'planta' as Plant['startType'],
  location: 'exterior' as Plant['location'],
  acquisitionType: 'regalo' as Plant['acquisitionType'],
  price: '',
  giftFrom: '',
  exchangeSource: '',
  rescuedFrom: '',
  notes: '',
});

const InputGroup = memo(({ label, type = "text", value, onChange, placeholder, listId }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} list={listId} />
    </div>
));
InputGroup.displayName = 'InputGroup';

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

const AddPlantForm = memo(({ onSave, initialData, onCancel, userProfile, plants, isSaving }: any) => {
  const [plant, setPlant] = useState(() => initialData ? { ...getEmptyPlant(), ...initialData } : getEmptyPlant());
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

   useEffect(() => {
    if (initialData) {
      setPlant(currentPlant => ({ ...getEmptyPlant(), ...currentPlant, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field: keyof Plant, value: any) => {
    setPlant(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = () => {
    if (!plant.date || (!plant.name && !plant.image)) {
      alert("La fecha es obligatoria. Debes proporcionar un nombre o una imagen para la planta.");
      return;
    }
    const newPlantData: Partial<Plant> = { ...plant };
    
    if (plant.acquisitionType !== 'compra') delete newPlantData.price;
    if (plant.acquisitionType !== 'regalo') delete newPlantData.giftFrom;
    if (plant.acquisitionType !== 'intercambio') delete newPlantData.exchangeSource;
    if (plant.acquisitionType !== 'rescatada') delete newPlantData.rescuedFrom;

    onSave(newPlantData);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImageToCrop(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = "";
  };
  
  const triggerFileUpload = () => {
    setCropAspect(undefined);
    uploadInputRef.current?.click();
  }

  const triggerCameraCapture = () => {
    setCropAspect(undefined);
    captureInputRef.current?.click();
  }

  const handleCroppedImage = (croppedImageDataUrl: string) => {
    handleChange('image', croppedImageDataUrl);
    setImageToCrop(null);
  }
  
  const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'rescatada'];
  const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
  const locationOptions: Plant['location'][] = ['interior', 'exterior'];

  const uniqueTypes = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.type).filter(Boolean))), [plants]);
  const uniqueGiftFrom = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.giftFrom).filter(Boolean))), [plants]);
  const uniqueExchangeSource = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.exchangeSource).filter(Boolean))), [plants]);
  const uniqueRescuedFrom = useMemo(() => Array.from(new Set(plants.map((p: Plant) => p.rescuedFrom).filter(Boolean))), [plants]);

  return (
    <>
      <datalist id="plant-types">
        {uniqueTypes.map(type => <option key={type} value={type} />)}
      </datalist>
      <datalist id="gift-from-list">
        {uniqueGiftFrom.map(name => <option key={name} value={name} />)}
      </datalist>
      <datalist id="exchange-source-list">
        {uniqueExchangeSource.map(source => <option key={source} value={source} />)}
      </datalist>
      <datalist id="rescued-from-list">
        {uniqueRescuedFrom.map(location => <option key={location} value={location} />)}
      </datalist>

      <ScrollArea className='max-h-[70vh]'>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="space-y-4">
                  <InputGroup label="Nombre de la Planta" value={plant.name} onChange={(e:any) => handleChange('name', e.target.value)} />
                  <InputGroup label="Tipo (ej. Monstera, Hoya)" value={plant.type} onChange={(e:any) => handleChange('type', e.target.value)} listId="plant-types" />
                  <InputGroup type="date" label="Fecha de Adquisición" value={plant.date} onChange={(e:any) => handleChange('date', e.target.value)} />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectGroup label="Tipo de Adquisición" value={plant.acquisitionType} onValueChange={(v: any) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                      <div className='self-end'>
                          {plant.acquisitionType === 'compra' && <InputGroup label="Precio" value={plant.price} onChange={(e:any) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                          {plant.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={plant.giftFrom} onChange={(e:any) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" listId="gift-from-list" />}
                          {plant.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={plant.exchangeSource} onChange={(e:any) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" listId="exchange-source-list" />}
                          {plant.acquisitionType === 'rescatada' && <InputGroup label="Rescatada de" value={plant.rescuedFrom} onChange={(e:any) => handleChange('rescuedFrom', e.target.value)} placeholder="Ubicación" listId="rescued-from-list" />}
                      </div>
                  </div>
              </div>
              <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Imagen</label>
                       <div className="grid gap-2 grid-cols-1">
                          <Button variant="outline" onClick={triggerFileUpload}>Subir Imagen</Button>
                          {isMobile && (
                              <Button variant="outline" onClick={triggerCameraCapture}>Tomar Foto</Button>
                          )}
                      </div>
                      <Input type="file" accept="image/*" onChange={handleFileChange} ref={uploadInputRef} className="hidden" />
                      <Input type="file" accept="image/*" capture="environment" onChange={handleFileChange} ref={captureInputRef} className="hidden" />
                  </div>
  
                  {plant.image && <img src={plant.image} alt="Previsualización" className="rounded-lg object-cover w-full h-28" />}

                  <SelectGroup label="Comienzo como" value={plant.startType} onValueChange={(v: any) => handleChange('startType', v)} options={startTypeOptions} />
                  <SelectGroup label="Ubicación" value={plant.location} onValueChange={(v: any) => handleChange('location', v)} options={locationOptions} />
              </div>
          </div>
          <div className='p-4 pt-0 space-y-4'>
           <Textarea placeholder="Notas adicionales sobre la planta..." value={plant.notes} onChange={(e:any) => handleChange('notes', e.target.value)} />
          </div>
      </ScrollArea>
      <DialogFooter className='p-4 pt-0'>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Planta"}
        </Button>
      </DialogFooter>

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

export const AddPlantDialog = ({ isOpen, setIsOpen, onSave, initialData, userProfile, plants }: any) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
        if (!isSaving && isOpen) {
            e.preventDefault();
            e.returnValue = ''; // For modern browsers
            return ''; // For old browsers
        }
    }, [isSaving, isOpen]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        } else {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isOpen, handleBeforeUnload]);

  const handleSave = async (plantData: any) => {
    setIsSaving(true);
    try {
      await onSave(plantData);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>Añadir Nueva Planta</DialogTitle>
            <DialogDescription>
              Rellena los detalles de tu nueva compañera verde.
            </DialogDescription>
          </DialogHeader>
          <AddPlantForm 
            onSave={handleSave} 
            initialData={initialData} 
            onCancel={() => setIsOpen(false)} 
            userProfile={userProfile} 
            plants={plants}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
  );
};
