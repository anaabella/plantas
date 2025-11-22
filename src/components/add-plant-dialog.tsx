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
import { Camera, Upload } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { ImageCropDialog } from './image-crop-dialog';


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
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Detect mobile device on client-side
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageToCrop(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow selecting the same file again
    if (event.target) {
        event.target.value = "";
    }
  };

  const handleCroppedImage = (croppedImageDataUrl: string) => {
      handleChange('image', croppedImageDataUrl);
      setImageToCrop(null); // Close crop dialog
  }
  
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
                          <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <Button variant="outline" onClick={() => uploadInputRef.current?.click()}>
                                    <Upload className="h-4 w-4 mr-2" /> Subir
                                </Button>
                                {isMobile && (
                                    <Button variant="outline" onClick={() => captureInputRef.current?.click()}>
                                        <Camera className="h-4 w-4 mr-2" /> Capturar
                                    </Button>
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
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar Planta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {imageToCrop && (
        <ImageCropDialog 
            isOpen={!!imageToCrop}
            setIsOpen={() => setImageToCrop(null)}
            imageSrc={imageToCrop}
            onCropComplete={handleCroppedImage}
        />
      )}
    </>
  );
});