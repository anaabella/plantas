
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Sprout, Gift, DollarSign, Calendar, Trash2, Camera,
  Leaf, Flower2, Droplets, HeartCrack, X, Save,
  Sun, Home, BarChart3, Clock, Upload, Download,
  History, Scissors, Bug, Beaker, Shovel, AlertCircle,
  ArrowRightLeft, RefreshCcw, Baby
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

// Types
type PlantEvent = {
  id: number;
  type: string;
  date: string;
  note: string;
};

type Plant = {
  id: string;
  name: string;
  image: string | null;
  acquisitionType: 'compra' | 'regalo' | 'intercambio' | 'robado';
  exchangeSource?: string;
  price?: string;
  date: string;
  status: 'viva' | 'fallecida' | 'intercambiada';
  exchangeDest?: string;
  startType: 'planta' | 'gajo' | 'raiz';
  location: 'interior' | 'exterior';
  lastWatered: string;
  notes?: string;
  events: PlantEvent[];
  giftFrom?: string;
  stolenFrom?: string;
};


export default function PlantManagerFinal() {
  // --- Estados ---
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('details'); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialFormData: Plant = {
    id: '',
    name: '',
    image: null,
    acquisitionType: 'compra', // compra, regalo, intercambio, robado
    exchangeSource: '', // "Llegó a cambio de X"
    price: '',
    date: new Date().toISOString().split('T')[0],
    status: 'viva', // viva, fallecida, intercambiada
    exchangeDest: '', // "Se fue a cambio de Y" (Solo si se fue toda la planta)
    startType: 'planta',
    location: 'interior',
    lastWatered: new Date().toISOString().split('T')[0],
    notes: '',
    events: [],
    giftFrom: '',
    stolenFrom: '',
  };

  // Estado del formulario
  const [formData, setFormData] = useState<Plant>(initialFormData);

  // Estado para nuevo evento
  const [newEvent, setNewEvent] = useState({
    type: 'riego',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // --- Efectos ---
  useEffect(() => {
    const savedPlants = localStorage.getItem('my-garden-final');
    if (savedPlants) {
      setPlants(JSON.parse(savedPlants));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('my-garden-final', JSON.stringify(plants));
  }, [plants]);

  // --- Helpers ---
  const getWateringStatus = (lastWateredDate: string | undefined) => {
    if (!lastWateredDate) return { color: 'text-stone-400', text: 'Sin registro', days: 0 };
    const last = new Date(lastWateredDate);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)); 
    if (diffDays <= 3) return { color: 'text-blue-500', bg: 'bg-blue-50', days: diffDays };
    if (diffDays <= 7) return { color: 'text-amber-500', bg: 'bg-amber-50', days: diffDays };
    return { color: 'text-red-500', bg: 'bg-red-50', days: diffDays };
  };

  const formatCurrency = (val: number | string | undefined) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(val) || 0);

  // --- Acciones ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const savePlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      setPlants(plants.map(p => p.id === formData.id ? formData : p));
    } else {
      setPlants([{ ...formData, id: Date.now().toString(), events: [] }, ...plants]);
    }
    closeModal();
  };

  const addEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const eventToAdd = { ...newEvent, id: Date.now() };
    let updatedFormData = { ...formData, events: [eventToAdd, ...(formData.events || [])] };
    
    if (newEvent.type === 'riego') updatedFormData.lastWatered = newEvent.date;
    
    setFormData(updatedFormData);
    if (formData.id) setPlants(plants.map(p => p.id === formData.id ? updatedFormData : p));
    setNewEvent({ ...newEvent, note: '' });
  };

  const deleteEvent = (eventId: number) => {
    const updatedEvents = formData.events.filter(ev => ev.id !== eventId);
    const updatedFormData = { ...formData, events: updatedEvents };
    setFormData(updatedFormData);
    if (formData.id) setPlants(plants.map(p => p.id === formData.id ? updatedFormData : p));
  };

  const waterPlantDirectly = (e: React.MouseEvent, plant: Plant) => {
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    const newEvent: PlantEvent = { id: Date.now(), type: 'riego', date: today, note: 'Riego rápido' };
    const updatedPlant = { ...plant, lastWatered: today, events: [newEvent, ...(plant.events || [])]};
    setPlants(plants.map(p => p.id === plant.id ? updatedPlant : p));
  };

  const openModal = (plant: Plant | null = null) => {
    setActiveTab('details');
    if (plant) {
      setFormData({ ...plant, events: plant.events || [] });
    } else {
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);
  const deletePlant = (id: string) => { if (window.confirm('¿Eliminar esta planta permanentemente?')) { setPlants(plants.filter(p => p.id !== id)); closeModal(); }};
  
  // Import/Export
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plants));
    const a = document.createElement('a'); a.href = dataStr; a.download = "mi_jardin_final.json"; a.click();
  };
  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { const imp = JSON.parse(ev.target?.result as string); if(window.confirm(`¿Cargar ${imp.length} plantas?`)) setPlants(imp); } catch(e){alert("Error archivo");}};
    reader.readAsText(file);
  };

  // Stats
  const stats = {
    spent: plants.filter(p => p.acquisitionType === 'compra').reduce((a, b) => a + parseFloat(b.price || '0'), 0),
    alive: plants.filter(p => p.status === 'viva').length,
    offspring: plants.reduce((acc, curr) => acc + (curr.events?.filter(e => e.type === 'hijito').length || 0), 0),
    total: plants.length
  };

  // --- Render ---
  const filteredPlants = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (filterStatus === 'viva') matchFilter = p.status === 'viva';
    if (filterStatus === 'fallecida') matchFilter = p.status === 'fallecida';
    if (filterStatus === 'intercambiada') matchFilter = p.status === 'intercambiada';
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-primary">
              <Leaf className="fill-primary" size={24} />
              <h1 className="text-xl font-bold">Mi Jardín</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowStats(!showStats)} variant="ghost" size="icon" className={showStats ? 'bg-secondary' : ''}><BarChart3 size={20}/></Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon"><Upload size={20}/><input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json"/></Button>
              <Button onClick={exportData} variant="ghost" size="icon"><Download size={20}/></Button>
              <Button onClick={() => openModal()}><Plus size={18}/> <span className="hidden sm:inline">Planta</span></Button>
            </div>
          </div>
          
          {showStats && (
            <div className="mb-3 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
               <Card className="text-center">
                 <CardHeader className="p-2 pb-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Inversión</CardTitle></CardHeader>
                 <CardContent className="p-2 pt-0"><p className="text-lg font-bold text-green-700">{formatCurrency(stats.spent)}</p></CardContent>
               </Card>
               <Card className="text-center">
                 <CardHeader className="p-2 pb-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Hijos Dados</CardTitle></CardHeader>
                 <CardContent className="p-2 pt-0"><p className="text-lg font-bold text-indigo-600">{stats.offspring}</p></CardContent>
               </Card>
               <Card className="text-center">
                 <CardHeader className="p-2 pb-0"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Vivas</CardTitle></CardHeader>
                 <CardContent className="p-2 pt-0"><p className="text-lg font-bold text-green-600">{stats.alive}</p></CardContent>
               </Card>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
               <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-9"/>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-auto">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="all">Todas</SelectItem>
                 <SelectItem value="viva">🌱 Vivas</SelectItem>
                 <SelectItem value="intercambiada">🚫 Ya no la tengo</SelectItem>
                 <SelectItem value="fallecida">🥀 Memoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlants.map(plant => {
          const w = getWateringStatus(plant.lastWatered);
          const hijitosCount = plant.events?.filter(e => e.type === 'hijito').length || 0;
          
          return (
            <Card key={plant.id} onClick={() => openModal(plant)} className={`overflow-hidden cursor-pointer hover:shadow-md transition-all group ${plant.status === 'fallecida' ? 'opacity-70' : ''} ${plant.status === 'intercambiada' ? 'opacity-90' : ''}`}>
               <div className="aspect-square relative bg-secondary overflow-hidden">
                  {plant.image ? (
                    <Image src={plant.image} alt={plant.name} fill className={`object-cover transition-transform group-hover:scale-105 ${plant.status === 'fallecida' ? 'grayscale' : ''}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/50"><Leaf size={48}/></div>
                  )}
                  
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
                    {plant.location === 'exterior' ? <Sun size={12} className="text-amber-500"/> : <Home size={12} className="text-blue-500"/>}
                  </div>

                  {plant.status === 'fallecida' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px]"><HeartCrack size={16} className="mr-2"/> EN MEMORIA</div>}
                  {plant.status === 'intercambiada' && <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px] text-center px-4"><ArrowRightLeft size={16} className="mr-2"/> INTERCAMBIADA</div>}
               </div>
               
               <div className="p-3">
                  <div className="flex justify-between items-start">
                     <h3 className="font-bold truncate">{plant.name}</h3>
                     {plant.status === 'viva' && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${w.bg} ${w.color}`}>
                           <Clock size={10}/> {w.days === 0 ? 'HOY' : `${w.days}d`}
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                     <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{plant.startType}</Badge>
                        {plant.acquisitionType === 'compra' && <Badge variant="outline">{formatCurrency(plant.price)}</Badge>}
                        {plant.acquisitionType === 'regalo' && <Badge variant="outline" className="border-purple-300 text-purple-600">De: {plant.giftFrom}</Badge>}
                        {plant.acquisitionType === 'intercambio' && <Badge variant="outline" className="border-indigo-300 text-indigo-600">Por: {plant.exchangeSource}</Badge>}
                        {plant.acquisitionType === 'robado' && <Badge variant="destructive" className="border-red-300 text-red-600">De: {plant.stolenFrom}</Badge>}
                     </div>
                  </div>

                  {plant.status === 'viva' && (
                    <Button onClick={(e) => waterPlantDirectly(e, plant)} variant="secondary" size="sm" className="mt-3 w-full">
                       <Droplets size={14}/> Regar Hoy
                    </Button>
                  )}
               </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b flex-row justify-between items-center">
            <DialogTitle>{formData.id ? formData.name : 'Nueva Planta'}</DialogTitle>
             <Button onClick={closeModal} variant="ghost" size="icon" className="rounded-full"><X size={20}/></Button>
          </DialogHeader>

          {formData.id && (
            <div className="flex border-b">
              <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Detalles</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Bitácora <Badge variant="secondary">{formData.events?.length || 0}</Badge>
              </button>
            </div>
          )}

          <div className="overflow-y-auto p-5 flex-1">
            {activeTab === 'details' && (
               <form onSubmit={savePlant} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="relative w-full sm:w-32 h-32 bg-secondary border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary">
                        {formData.image ? (
                          <>
                            <Image src={formData.image} alt="plant" fill className="object-cover"/>
                            <Button type="button" onClick={() => setFormData({...formData, image: null})} variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6"><X size={12}/></Button>
                          </>
                        ) : (
                          <>
                            <Camera className="text-muted-foreground"/>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                          </>
                        )}
                     </div>
                     <div className="flex-1 space-y-2">
                        <Input required name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre de la planta" />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Select name="status" value={formData.status} onValueChange={(v) => handleInputChange({target: {name: 'status', value: v}} as any)}>
                            <SelectTrigger className={formData.status === 'intercambiada' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viva">🌱 Viva</SelectItem>
                                <SelectItem value="intercambiada">🚫 Se fue toda</SelectItem>
                                <SelectItem value="fallecida">🥀 Fallecida</SelectItem>
                            </SelectContent>
                          </Select>
                           <Select name="location" value={formData.location} onValueChange={(v) => handleInputChange({target: {name: 'location', value: v}} as any)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="interior">🏠 Interior</SelectItem>
                                <SelectItem value="exterior">☀️ Exterior</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {formData.status === 'intercambiada' && (
                          <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded-md">
                             Solo usa esto si ya no tienes la planta. Si solo diste un gajo, déjala en "Viva" y anótalo en la Bitácora.
                          </div>
                        )}
                     </div>
                  </div>

                   <div>
                    <label className="text-sm font-medium text-muted-foreground">Origen</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <Select name="startType" value={formData.startType} onValueChange={(v) => handleInputChange({target: {name: 'startType', value: v}} as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="planta">Planta Completa</SelectItem>
                                <SelectItem value="gajo">Gajo / Esqueje</SelectItem>
                                <SelectItem value="raiz">Raíz / Bulbo</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select name="acquisitionType" value={formData.acquisitionType} onValueChange={(v) => handleInputChange({target: {name: 'acquisitionType', value: v}} as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="compra">Comprado</SelectItem>
                                <SelectItem value="regalo">Regalo</SelectItem>
                                <SelectItem value="intercambio">Intercambio</SelectItem>
                                <SelectItem value="robado">Robado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>

                  {formData.acquisitionType === 'compra' && <Input name="price" value={formData.price} onChange={handleInputChange} placeholder="Precio (ARS)" type="number" />}
                  {formData.acquisitionType === 'regalo' && <Input name="giftFrom" value={formData.giftFrom} onChange={handleInputChange} placeholder="Regalo de..." />}
                  {formData.acquisitionType === 'intercambio' && <Input name="exchangeSource" value={formData.exchangeSource} onChange={handleInputChange} placeholder="A cambio de..." />}
                  {formData.acquisitionType === 'robado' && <Input name="stolenFrom" value={formData.stolenFrom} onChange={handleInputChange} placeholder="Robado de..." />}

                  <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Notas generales sobre la planta..."/>

                  <DialogFooter>
                    {formData.id && <Button type="button" variant="destructive" onClick={() => deletePlant(formData.id!)}>Eliminar</Button>}
                    <Button type="submit">Guardar</Button>
                  </DialogFooter>
               </form>
            )}

            {activeTab === 'history' && (
              <div>
                <form onSubmit={addEvent} className="mb-4 space-y-2 p-3 bg-secondary rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <Select name="type" value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="riego">💧 Riego</SelectItem>
                            <SelectItem value="fertilizante">🧪 Fertilizante</SelectItem>
                            <SelectItem value="poda">✂️ Poda</SelectItem>
                            <SelectItem value="plaga">🐞 Plaga</SelectItem>
                            <SelectItem value="transplante">🪴 Transplante</SelectItem>
                            <SelectItem value="hijito">👶 Hijito</SelectItem>
                            <SelectItem value="otro">🗒️ Otro</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} />
                  </div>
                  <Textarea value={newEvent.note} onChange={(e) => setNewEvent({...newEvent, note: e.target.value})} placeholder="Nota del evento..."/>
                  <Button type="submit" className="w-full">Añadir a Bitácora</Button>
                </form>
                
                <div className="space-y-2">
                  {formData.events.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-2 border-b">
                      <div className="text-xs text-center text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('es-AR', {day:'numeric'})}<br/>
                          {new Date(event.date).toLocaleDateString('es-AR', {month:'short'})}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{event.type}</p>
                        <p className="text-sm text-muted-foreground">{event.note}</p>
                      </div>
                      <Button onClick={() => deleteEvent(event.id)} variant="ghost" size="icon" className="h-6 w-6"><Trash2 size={12}/></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
