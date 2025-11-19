'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
  } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import type { Plant } from '@/app/page';

export function AddPlantDialog({ isOpen, setIsOpen, onSave }: any) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<Plant['status']>('viva');
  const [image, setImage] = useState('');
  const [startType, setStartType] = useState<Plant['startType']>('planta');
  const [location, setLocation] = useState<Plant['location']>('interior');
  const [acquisitionType, setAcquisitionType] = useState<Plant['acquisitionType']>('compra');
  const [price, setPrice] = useState('');
  const [giftFrom, setGiftFrom] = useState('');
  const [exchangeSource, setExchangeSource] = useState('');
  const [stolenFrom, setStolenFrom] = useState('');
  const [notes, setNotes] = useState('');


  const handleSubmit = () => {
    // Basic validation
    if (!name || !date) {
      alert("El nombre y la fecha son obligatorios.");
      return;
    }

    const newPlantData = {
      name,
      date,
      status,
      image,
      startType,
      location,
      acquisitionType,
      price: acquisitionType === 'compra' ? price : undefined,
      giftFrom: acquisitionType === 'regalo' ? giftFrom : undefined,
      exchangeSource: acquisitionType === 'intercambio' ? exchangeSource : undefined,
      stolenFrom: acquisitionType === 'robado' ? stolenFrom : undefined,
      notes,
      events: [],
    };
    
    onSave(newPlantData);
    
    // Reset form
    setName('');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('viva');
    setImage('');
    setStartType('planta');
    setLocation('interior');
    setAcquisitionType('compra');
    setPrice('');
    setGiftFrom('');
    setStolenFrom('');
    setExchangeSource('');
    setNotes('');

    setIsOpen(false);
  };
  
  const InputGroup = ({ label, type = "text", value, onChange, placeholder }: any) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} />
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

  const acquisitionTypeOptions: Plant['acquisitionType'][] = ['compra', 'regalo', 'intercambio', 'robado'];
  const startTypeOptions: Plant['startType'][] = ['planta', 'gajo', 'raiz', 'semilla'];
  const locationOptions: Plant['location'][] = ['interior', 'exterior'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Planta</DialogTitle>
          <DialogDescription>
            Rellena los detalles de tu nueva compañera verde.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
             <div className="space-y-4">
                <InputGroup label="Nombre de la Planta" value={name} onChange={(e:any) => setName(e.target.value)} />
                <InputGroup type="date" label="Fecha de Adquisición" value={date} onChange={(e:any) => setDate(e.target.value)} />
                 <SelectGroup label="Tipo de Adquisición" value={acquisitionType} onValueChange={setAcquisitionType} options={acquisitionTypeOptions} />
                 
                 {acquisitionType === 'compra' && <InputGroup label="Precio" value={price} onChange={(e:any) => setPrice(e.target.value)} placeholder="$0.00" />}
                 {acquisitionType === 'regalo' && <InputGroup label="Regalo de" value={giftFrom} onChange={(e:any) => setGiftFrom(e.target.value)} placeholder="Nombre" />}
                 {acquisitionType === 'intercambio' && <InputGroup label="Intercambio por" value={exchangeSource} onChange={(e:any) => setExchangeSource(e.target.value)} placeholder="Ej: un esqueje" />}
                {acquisitionType === 'robado' && <InputGroup label="Robado de" value={stolenFrom} onChange={(e:any) => setStolenFrom(e.target.value)} placeholder="Ubicación" />}

             </div>
             <div className="space-y-4">
                <InputGroup label="URL de la Imagen" value={image} onChange={(e:any) => setImage(e.target.value)} placeholder="https://example.com/plant.jpg" />
                {image && <img src={image} alt="Previsualización" className="rounded-lg object-cover w-full h-28" />}

                <SelectGroup label="Comienzo como" value={startType} onValueChange={setStartType} options={startTypeOptions} />
                <SelectGroup label="Ubicación" value={location} onValueChange={setLocation} options={locationOptions} />
             </div>
        </div>
        <Textarea placeholder="Notas adicionales sobre la planta..." value={notes} onChange={(e:any) => setNotes(e.target.value)} />

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Planta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
