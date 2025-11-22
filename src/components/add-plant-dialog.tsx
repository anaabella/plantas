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
import { useState, useRef, memo, useEffect } from 'react';
import type { Plant } from '@/app/page';
import { CameraCaptureDialog } from './camera-capture-dialog';
import { Camera, Upload } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';

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

const emptyPlant = {
  name: '',
  type: '',
  date: new Date().toISOString().split('T')[0],
  status: 'viva' as Plant['status'],
  image: '',
  startType: 'planta' as Plant['startType'],
  location: 'interior' as Plant['location'],
  acquisitionType: 'compra' as Plant['acquisitionType'],
  price: '',
  giftFrom: '',
  exchangeSource: '',
  rescuedFrom: '',
  notes: '',
};

const InputGroup = memo(({ label, type = "text", value, onChange, placeholder }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
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


export const AddPlantDialog = memo(function AddPlantDialog({ isOpen, setIsOpen, onSave, initialData }: any) {
  const [plant, setPlant] = useState(emptyPlant);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setPlant(prev => ({
          ...emptyPlant,
          ...prev,
          name: initialData.name || '',
          type: initialData.type || '',
          image: initialData.image || '',
        }));
      } else {
        setPlant(emptyPlant);
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (field: keyof Plant, value: any) => {
    setPlant(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = () => {
    if (!plant.name || !plant.date) {
      alert("El nombre y la fecha son obligatorios.");
      return;
    }

    const newPlantData: Partial<Plant> = {
      ...plant,
    };
    
    if (plant.acquisitionType !== 'compra') delete newPlantData.price;
    if (plant.acquisitionType !== 'regalo') delete newPlantData.giftFrom;
    if (plant.acquisitionType !== 'intercambio') delete newPlantData.exchangeSource;
    if (plant.acquisitionType !== 'rescatada') delete newPlantData.rescuedFrom;

    onSave(newPlantData);
    setIsOpen(false);
  };

  const handlePhotoCaptured = (photoDataUri: string) => {
    handleChange('image', photoDataUri);
    setIsCameraOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      compressImage(file, (compressedDataUrl) => {
        handleChange('image', compressedDataUrl);
      });
    }
  };
  
  const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'rescatada'];
  const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
  const locationOptions: Plant['location'][] = ['interior', 'exterior'];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Planta</DialogTitle>
          <DialogDescription>
            Rellena los detalles de tu nueva compañera verde.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='max-h-[70vh]'>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <div className="space-y-4">
                    <InputGroup label="Nombre de la Planta" value={plant.name} onChange={(e:any) => handleChange('name', e.target.value)} />
                    <InputGroup label="Tipo (ej. Monstera, Hoya)" value={plant.type} onChange={(e:any) => handleChange('type', e.target.value)} />
                    <InputGroup type="date" label="Fecha de Adquisición" value={plant.date} onChange={(e:any) => handleChange('date', e.target.value)} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectGroup label="Tipo de Adquisición" value={plant.acquisitionType} onValueChange={(v: any) => handleChange('acquisitionType', v)} options={acquisitionTypeOptions} />
                        <div className='self-end'>
                            {plant.acquisitionType === 'compra' && <InputGroup label="Precio" value={plant.price} onChange={(e:any) => handleChange('price', e.target.value)} placeholder="$0.00" />}
                            {plant.acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={plant.giftFrom} onChange={(e:any) => handleChange('giftFrom', e.target.value)} placeholder="Nombre" />}
                            {plant.acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={plant.exchangeSource} onChange={(e:any) => handleChange('exchangeSource', e.target.value)} placeholder="Ej: un esqueje" />}
                            {plant.acquisitionType === 'rescatada' && <InputGroup label="Rescatada de" value={plant.rescuedFrom} onChange={(e:any) => handleChange('rescuedFrom', e.target.value)} placeholder="Ubicación" />}
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Imagen</label>
                        <div className="flex gap-2">
                             <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                            <Button variant="outline" className='w-full' onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2" /> Subir
                            </Button>
                            <Button variant="outline" className='w-full' onClick={() => setIsCameraOpen(true)}>
                                <Camera className="h-4 w-4 mr-2" /> Capturar
                            </Button>
                        </div>
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
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Planta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CameraCaptureDialog 
        isOpen={isCameraOpen} 
        setIsOpen={setIsCameraOpen}
        onPhotoCaptured={handlePhotoCaptured}
    />
    </>
  );
});
