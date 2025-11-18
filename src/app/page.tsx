
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
import { initialPlants } from '@/lib/data';
import type { Plant } from '@/types';
import { format } from 'date-fns';
import Image from 'next/image';

const PlantManager = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPlants = localStorage.getItem('plant-pal-plants');
    if (savedPlants) {
      setPlants(JSON.parse(savedPlants).map((p: any) => ({ ...p, acquisitionDate: new Date(p.acquisitionDate) })));
    } else {
      setPlants(initialPlants);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('plant-pal-plants', JSON.stringify(plants));
  }, [plants]);

  const handlePlantClick = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDetailOpen(true);
  };
  
  const handlePlantAdd = (newPlant: Plant) => {
    setPlants(prevPlants => [newPlant, ...prevPlants]);
  };
  
  const handleUpdatePlant = (updatedPlant: Plant) => {
    setPlants(prevPlants =>
      prevPlants.map(p => p.id === updatedPlant.id ? updatedPlant : p)
    );
    if(selectedPlant?.id === updatedPlant.id) {
      setSelectedPlant(updatedPlant);
    }
  };

  const getWateringStatus = (lastWateredDate: Date | string | undefined) => {
    if (!lastWateredDate) return { color: 'text-stone-400', text: 'No record', days: 0 };
    const last = new Date(lastWateredDate);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return { color: 'text-blue-500', bg: 'bg-blue-50', days: diffDays };
    if (diffDays <= 7) return { color: 'text-amber-500', bg: 'bg-amber-50', days: diffDays };
    return { color: 'text-red-500', bg: 'bg-red-50', days: diffDays };
  };

  const formatCurrency = (val: number | undefined) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const stats = {
    spent: plants.filter(p => p.acquisitionType === 'purchased').reduce((a, b) => a + (b.price || 0), 0),
    alive: plants.filter(p => !p.isDeceased).length,
  };

  const filteredPlants = plants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (filterStatus === 'alive') matchFilter = !p.isDeceased;
    if (filterStatus === 'dead') matchFilter = p.isDeceased;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex items-center">
            <Sprout className="h-6 w-6 text-primary" />
            <h1 className="ml-2 font-headline text-xl font-bold">PlantPal</h1>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
             <Button onClick={() => setShowStats(!showStats)} variant="ghost" size="icon"><BarChart3 size={20}/></Button>
             <Button onClick={() => alert("Export/Import not implemented yet")} variant="ghost" size="icon"><Upload size={20}/></Button>
             <Button onClick={() => alert("Export/Import not implemented yet")} variant="ghost" size="icon"><Download size={20}/></Button>
             <Button onClick={() => setIsDetailOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Button>
          </div>
        </div>
        {showStats && (
            <div className="container pb-4">
              <div className="grid grid-cols-2 gap-4">
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <p className="text-2xl font-bold">{formatCurrency(stats.spent)}</p>
                   </CardContent>
                 </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium">Living Plants</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <p className="text-2xl font-bold">{stats.alive}</p>
                   </CardContent>
                 </Card>
              </div>
            </div>
        )}
        <div className="container pb-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search plants..." className="w-full pl-9"/>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    <SelectItem value="alive">🌱 Living</SelectItem>
                    <SelectItem value="dead">🥀 Deceased</SelectItem>
                  </SelectContent>
                </Select>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPlants.map((plant) => {
            const w = getWateringStatus(new Date());

            return (
              <Card
                key={plant.id}
                className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-accent/20 hover:shadow-xl hover:-translate-y-1"
                onClick={() => handlePlantClick(plant)}
              >
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={plant.imageUrl}
                    alt={`Image of ${plant.name}`}
                    fill
                    className={`object-cover ${plant.isDeceased ? 'grayscale' : ''}`}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    data-ai-hint={plant.imageHint}
                  />
                  {plant.isDeceased && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <HeartCrack className="h-12 w-12 text-white/80" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="font-headline truncate">{plant.name}</CardTitle>
                  <div className="flex justify-between items-center">
                     {plant.isDeceased ? (
                        <Badge variant="destructive" className="w-fit bg-accent/80 text-accent-foreground">At Rest</Badge>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Acquired: {format(plant.acquisitionDate, 'MMM d, yyyy')}
                        </p>
                      )}
                      {!plant.isDeceased && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${w.bg} ${w.color}`}>
                           <Clock size={10}/> {w.days === 0 ? 'TODAY' : `${w.days}d`}
                        </div>
                     )}
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </main>

       <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={handleUpdatePlant}
      />
    </div>
  );
};

function InfoSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-muted-foreground pt-1">{icon}</div>
      <div>
        <h4 className="font-semibold font-headline">{title}</h4>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

const acquisitionIcons = {
  purchased: <DollarSign className="h-5 w-5" />,
  gifted: <Gift className="h-5 w-5" />,
  traded: <RefreshCcw className="h-5 w-5" />,
};


function PlantDetailDialog({ plant, isOpen, setIsOpen, onUpdatePlant }: { plant: Plant | null, isOpen: boolean, setIsOpen: (isOpen: boolean) => void, onUpdatePlant: (plant: Plant) => void }) {
  if (!plant) return null;

  const handleDeceasedToggle = () => {
    onUpdatePlant({ ...plant, isDeceased: !plant.isDeceased });
    setIsOpen(false);
  };

  const Icon = acquisitionIcons[plant.acquisitionType];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="relative h-64 w-full rounded-lg overflow-hidden mb-4">
            <Image
              src={plant.imageUrl}
              alt={`Image of ${plant.name}`}
              fill
              className="object-cover"
              data-ai-hint={plant.imageHint}
            />
            {plant.isDeceased && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center text-white">
                  <HeartCrack className="h-16 w-16" />
                  <p className="mt-2 text-lg font-bold font-headline">At Rest</p>
                </div>
              </div>
            )}
          </div>
          <DialogTitle className="text-3xl font-bold font-headline">{plant.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Acquired on {format(plant.acquisitionDate, 'MMMM d, yyyy')}
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3 bg-secondary p-3 rounded-md">
            <div className="text-primary">{Icon}</div>
            <div>
              <p className="font-semibold capitalize">{plant.acquisitionType}</p>
              {plant.acquisitionType === 'purchased' && plant.price && (
                <p className="text-sm text-muted-foreground">${plant.price.toFixed(2)}</p>
              )}
              {plant.acquisitionType === 'traded' && (
                <p className="text-sm text-muted-foreground">{plant.tradeReason}</p>
              )}
               {plant.acquisitionType === 'gifted' && (
                <p className="text-sm text-muted-foreground">A lovely gift!</p>
              )}
            </div>
          </div>
        
          <Separator />

          <div className="space-y-4">
            <InfoSection icon={<Leaf className="h-5 w-5" />} title="Leaf Details">
              {plant.leafInfo}
            </InfoSection>
            <InfoSection icon={<Droplets className="h-5 w-5" />} title="Root Details">
              {plant.rootInfo}
            </InfoSection>
            <InfoSection icon={<Scissors className="h-5 w-5" />} title="Clipping Details">
              {plant.clippingInfo}
            </InfoSection>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <Button
            variant={plant.isDeceased ? 'default' : 'destructive'}
            onClick={handleDeceasedToggle}
            className={!plant.isDeceased ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {plant.isDeceased ? 'Revive Plant' : 'Mark as Deceased'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PlantManager;


    