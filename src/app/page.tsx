'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Gift, DollarSign, Trash2, Camera, 
  Leaf, Flower2, Droplets, HeartCrack, X, Save, 
  Sun, Home, BarChart3, Clock, Upload, Download,
  Scissors, Bug, Beaker, Shovel, AlertCircle,
  ArrowRightLeft, RefreshCcw, Baby, Sprout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function PlantManagerFinal() {
  // --- Estados ---
  const [plants, setPlants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('details'); 
  const fileInputRef = useRef(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    image: null,
    acquisitionType: 'purchased', // purchased, gifted, traded
    exchangeSource: '', // "Llegó a cambio de X"
    price: '',
    date: new Date().toISOString().split('T')[0],
    status: 'viva', // viva, fallecida, intercambiada
    exchangeDest: '', // "Se fue a cambio de Y" (Solo si se fue toda la planta)
    startType: 'raiz',
    location: 'interior',
    lastWatered: new Date().toISOString().split('T')[0],
    notes: '',
    events: []
  });

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
  const getWateringStatus = (lastWateredDate) => {
    if (!lastWateredDate) return { color: 'text-muted-foreground', bg: 'bg-muted', days: 0 };
    const last = new Date(lastWateredDate);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return { color: 'text-blue-500', bg: 'bg-blue-100', days: diffDays };
    if (diffDays <= 7) return { color: 'text-amber-500', bg: 'bg-amber-100', days: diffDays };
    return { color: 'text-destructive', bg: 'bg-destructive/10', days: diffDays };
  };
  

  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val || 0);

  // --- Acciones ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const savePlant = (e) => {
    e.preventDefault();
    if (formData.id) {
      setPlants(plants.map(p => p.id === formData.id ? formData : p));
    } else {
      setPlants([{ ...formData, id: Date.now().toString(), events: [] }, ...plants]);
    }
    closeModal();
  };

  const addEvent = (e) => {
    e.preventDefault();
    if (!newEvent.note.trim()) return;
    const eventToAdd = { ...newEvent, id: Date.now() };
    let updatedFormData = { ...formData, events: [eventToAdd, ...(formData.events || [])] };
    
    if (newEvent.type === 'riego') updatedFormData.lastWatered = newEvent.date;
    
    setFormData(updatedFormData);
    if (formData.id) setPlants(plants.map(p => p.id === formData.id ? updatedFormData : p));
    setNewEvent({ ...newEvent, note: '' });
  };

  const deleteEvent = (eventId) => {
    const updatedEvents = formData.events.filter(ev => ev.id !== eventId);
    const updatedFormData = { ...formData, events: updatedEvents };
    setFormData(updatedFormData);
    if (formData.id) setPlants(plants.map(p => p.id === formData.id ? updatedFormData : p));
  };

  const waterPlantDirectly = (e, plant) => {
    e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    const newEventToAdd = { id: Date.now(), type: 'riego', date: today, note: 'Riego rápido' };
    const updatedPlant = { ...plant, lastWatered: today, events: [newEventToAdd, ...(plant.events || [])]};
    setPlants(plants.map(p => p.id === plant.id ? updatedPlant : p));
  };

  const openModal = (plant = null) => {
    setActiveTab('details');
    if (plant) {
      setFormData({ ...plant, events: plant.events || [] });
    } else {
      setFormData({
        id: null, name: '', image: null, acquisitionType: 'purchased', exchangeSource: '', price: '',
        date: new Date().toISOString().split('T')[0], status: 'viva', exchangeDest: '',
        startType: 'raiz', location: 'interior', lastWatered: new Date().toISOString().split('T')[0], notes: '', events: []
      });
    }
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);
  const deletePlant = (id) => { if (window.confirm('¿Eliminar esta planta permanentemente?')) { setPlants(plants.filter(p => p.id !== id)); closeModal(); }};
  
  // Import/Export
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plants));
    const a = document.createElement('a'); a.href = dataStr; a.download = "mi_jardin_final.json"; a.click();
  };
  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { const imp = JSON.parse(ev.target.result as string); if(window.confirm(`¿Cargar ${imp.length} plantas?`)) setPlants(imp); } catch(e){alert("Error archivo");}};
    reader.readAsText(file);
  };

  // Stats
  const stats = {
    spent: plants.filter(p => p.acquisitionType === 'purchased').reduce((a, b) => a + parseFloat(b.price || '0'), 0),
    alive: plants.filter(p => p.status === 'viva').length,
    offspring: plants.reduce((acc, curr) => acc + (curr.events?.filter(e => e.type === 'hijito').length || 0), 0),
    total: plants.length
  };

  // --- Render ---
  const filteredPlants = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (filterStatus === 'alive') matchFilter = p.status === 'viva';
    if (filterStatus === 'dead') matchFilter = p.status === 'fallecida';
    if (filterStatus === 'traded') matchFilter = p.status === 'intercambiada';
    return matchSearch && matchFilter;
  });

  const getEventIcon = (type) => {
    const iconMap = {
      riego: <Droplets className="text-blue-500" />,
      poda: <Scissors className="text-orange-500" />,
      transplante: <Shovel className="text-yellow-600" />,
      plaga: <Bug className="text-red-500" />,
      abono: <Beaker className="text-green-600" />,
      floracion: <Flower2 className="text-pink-500" />,
      hijito: <Baby className="text-indigo-500" />,
      otro: <AlertCircle className="text-gray-500" />,
    };
    return iconMap[type] || <AlertCircle className="text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-primary">
              <Sprout className="text-primary" size={24} />
              <h1 className="text-xl font-bold">Mi Jardín</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowStats(!showStats)} className={`${showStats ? 'bg-accent/10 text-accent' : ''}`}><BarChart3 size={20}/></Button>
              <Button variant="ghost" size="icon" onClick={() => fileInputRef.current.click()}><Upload size={20}/><input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json"/></Button>
              <Button variant="ghost" size="icon" onClick={exportData}><Download size={20}/></Button>
              <Button onClick={() => openModal()}>
                <Plus size={18}/> <span className="hidden sm:inline">Planta</span>
              </Button>
            </div>
          </div>
          
          {/* Stats Panel */}
          {showStats && (
            <div className="mb-3 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
               <Card className="p-2 text-center">
                 <p className="text-xs uppercase font-bold text-muted-foreground">Inversión</p>
                 <p className="text-lg font-bold text-primary">{formatCurrency(stats.spent)}</p>
               </Card>
               <Card className="p-2 text-center">
                 <p className="text-xs uppercase font-bold text-muted-foreground">Hijos Dados</p>
                 <p className="text-lg font-bold text-accent">{stats.offspring}</p>
               </Card>
               <Card className="p-2 text-center">
                 <p className="text-xs uppercase font-bold text-muted-foreground">Vivas</p>
                 <p className="text-lg font-bold text-primary">{stats.alive}</p>
               </Card>
            </div>
          )}

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
               <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-lg"/>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-auto bg-muted/50">
                    <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="alive">🌱 Vivas</SelectItem>
                    <SelectItem value="traded">🚫 Ya no la tengo</SelectItem>
                    <SelectItem value="dead">🥀 Memoria</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlants.map(plant => {
          const w = getWateringStatus(plant.lastWatered);
          const hijitosCount = plant.events?.filter(e => e.type === 'hijito').length || 0;
          
          return (
            <Card key={plant.id} onClick={() => openModal(plant)} className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all group ${plant.status === 'fallecida' ? 'opacity-70' : ''} ${plant.status === 'intercambiada' ? 'opacity-90' : ''}`}>
               <div className="h-48 relative bg-muted overflow-hidden">
                  {plant.image ? (
                    <img src={plant.image} alt={plant.name} className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${plant.status === 'fallecida' ? 'grayscale' : ''}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/30"><Leaf size={48}/></div>
                  )}
                  
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm">
                    {plant.location === 'exterior' ? <Sun size={12} className="text-amber-500"/> : <Home size={12} className="text-blue-500"/>}
                  </div>

                  {plant.status === 'fallecida' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px]"><HeartCrack size={16} className="mr-2"/> EN MEMORIA</div>}
                  
                  {plant.status === 'intercambiada' && <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center text-white font-bold text-sm tracking-widest backdrop-blur-[1px] text-center px-4"><ArrowRightLeft size={16} className="mr-2"/> PLANTA INTERCAMBIADA</div>}
               </div>
               
               <div className="p-3">
                  <div className="flex justify-between items-start">
                     <h3 className="font-bold text-foreground truncate">{plant.name}</h3>
                     {plant.status === 'viva' && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${w.bg} ${w.color}`}>
                           <Clock size={12}/> {w.days === 0 ? 'HOY' : `${w.days}d`}
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                     <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{plant.startType}</Badge>
                        <span className="flex items-center gap-1">
                            {plant.acquisitionType === 'purchased' && <><DollarSign size={12}/> {plant.price}</>}
                            {plant.acquisitionType === 'gifted' && <><Gift size={12} className="text-purple-500"/> Regalo</>}
                            {plant.acquisitionType === 'traded' && <><RefreshCcw size={12} className="text-indigo-500"/> Trueque</>}
                        </span>
                     </div>
                     
                     {hijitosCount > 0 && (
                       <Badge variant="outline" className="text-accent-foreground bg-accent/20 border-accent/30 w-fit mt-1">
                         <Baby size={12} className="mr-1"/> {hijitosCount} hijito{hijitosCount > 1 ? 's' : ''} dados
                       </Badge>
                     )}

                     {plant.acquisitionType === 'traded' && plant.exchangeSource && (
                        <p className="text-indigo-600 italic flex items-center gap-1 mt-1 text-xs"><ArrowRightLeft size={10}/> Llegó por: {plant.exchangeSource}</p>
                     )}
                  </div>

                  {plant.status === 'viva' && (
                    <Button onClick={(e) => waterPlantDirectly(e, plant)} variant="outline" size="sm" className="mt-3 w-full">
                       <Droplets size={14}/> REGAR HOY
                    </Button>
                  )}
               </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
           <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
              
              <DialogHeader className="p-4 border-b flex-row justify-between items-center">
                 <DialogTitle>{formData.id ? formData.name : 'Nueva Planta'}</DialogTitle>
              </DialogHeader>

              {formData.id ? (
                <Tabs defaultValue="details" onValueChange={setActiveTab} value={activeTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-4">
                        <TabsTrigger value="details">Detalles</TabsTrigger>
                        <TabsTrigger value="history">Bitácora <Badge variant="secondary" className="ml-2">{formData.events?.length || 0}</Badge></TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="overflow-y-auto p-5 flex-1 mt-0">
                        <PlantForm/>
                    </TabsContent>
                    <TabsContent value="history" className="overflow-y-auto p-5 flex-1 mt-0">
                        <HistoryLog/>
                    </TabsContent>
                </Tabs>
              ) : (
                <div className="overflow-y-auto p-5 flex-1">
                    <PlantForm/>
                </div>
              )}

           </DialogContent>
        </Dialog>
      )}

    </div>
  );

  function PlantForm() {
    return (
        <form onSubmit={savePlant} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={`relative w-full sm:w-32 h-32 bg-muted border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden ${!formData.image && 'cursor-pointer hover:border-primary'}`}>
                    {formData.image ? (
                    <>
                        <img src={formData.image} alt={formData.name} className="w-full h-full object-cover"/>
                        <Button type="button" size="icon" variant="destructive" onClick={() => setFormData({...formData, image: null})} className="absolute top-1 right-1 h-6 w-6"><X size={12}/></Button>
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
                        <select name="status" value={formData.status} onChange={handleInputChange} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="viva">🌱 Viva</option>
                            <option value="intercambiada">🚫 Se fue toda</option>
                            <option value="fallecida">🥀 Fallecida</option>
                        </select>
                        <select name="location" value={formData.location} onChange={handleInputChange} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="interior">🏠 Interior</option>
                            <option value="exterior">☀️ Exterior</option>
                        </select>
                    </div>
                    
                    {formData.status === 'intercambiada' ? (
                    <div className="text-xs text-accent bg-accent/10 p-2 rounded-md">
                        Solo usa esto si ya no tienes la planta. Si solo diste un gajo, déjala en "Viva" y anótalo en la Bitácora.
                    </div>
                    ) : null}

                    {formData.status === 'fallecida' ? (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                        En modo "Fallecida", la planta se moverá a un archivo histórico.
                    </div>
                    ) : null}
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium">Origen</label>
                <div className="grid grid-cols-2 gap-2">
                    <select name="acquisitionType" value={formData.acquisitionType} onChange={handleInputChange} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="purchased">🛒 Comprada</option>
                        <option value="gifted">🎁 Regalo</option>
                        <option value="traded">🤝 Intercambio</option>
                    </select>
                    <select name="startType" value={formData.startType} onChange={handleInputChange} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="raiz">🌱 Planta completa</option>
                        <option value="gajo">✂️ Gajo/Hoja</option>
                        <option value="semilla">🌰 Semilla</option>
                    </select>
                </div>
            </div>

            {formData.acquisitionType === 'purchased' && <Input name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="Precio (ej: 1500)" />}
            {formData.acquisitionType === 'traded' && <Input name="exchangeSource" value={formData.exchangeSource} onChange={handleInputChange} placeholder="Llegó a cambio de..." />}
            {formData.status === 'intercambiada' && <Input name="exchangeDest" value={formData.exchangeDest} onChange={handleInputChange} placeholder="Se fue a cambio de..." />}
            
            <div className="grid grid-cols-2 gap-2">
                <Input type="date" name="date" value={formData.date} onChange={handleInputChange} />
                {formData.status === 'viva' && <Input type="date" name="lastWatered" value={formData.lastWatered} onChange={handleInputChange} />}
            </div>

            <Textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Notas generales sobre la planta..." />
            
            <DialogFooter className="pt-4 border-t">
                {formData.id && <Button type="button" variant="destructive" onClick={() => deletePlant(formData.id)}><Trash2/>Eliminar</Button>}
                <Button type="submit" className="flex-1"><Save/> Guardar cambios</Button>
            </DialogFooter>
        </form>
    );
  }

  function HistoryLog() {
    return (
      <div className="space-y-4">
        {/* Formulario nuevo evento */}
        <form onSubmit={addEvent} className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <select value={newEvent.type} onChange={(e) => setNewEvent({...newEvent, type: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="riego">💧 Riego</option>
                    <option value="poda">✂️ Poda</option>
                    <option value="transplante">🪴 Transplante</option>
                    <option value="plaga">🐛 Plaga</option>
                    <option value="abono">🧪 Abono</option>
                    <option value="floracion">🌸 Floración</option>
                    <option value="hijito">👶 Hijito dado</option>
                    <option value="otro">💬 Otro</option>
                </select>
                <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} />
            </div>
            <Textarea value={newEvent.note} onChange={(e) => setNewEvent({...newEvent, note: e.target.value})} placeholder="Añadir una nota sobre el evento..." />
            <Button type="submit" size="sm" className="w-full"><Plus/> Añadir a Bitácora</Button>
        </form>

        {/* Lista de eventos */}
        <div className="space-y-2">
            {formData.events && formData.events.map(event => (
                <div key={event.id} className="flex gap-3 items-start p-2 bg-background rounded-md border">
                    <div className="pt-1">{getEventIcon(event.type)}</div>
                    <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{event.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">{event.note}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEvent(event.id)}>
                        <X size={14}/>
                    </Button>
                </div>
            ))}
            {(!formData.events || formData.events.length === 0) && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No hay eventos registrados.</p>
              </div>
            )}
        </div>
      </div>
    );
  }
}
