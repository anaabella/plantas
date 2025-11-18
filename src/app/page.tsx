'use client';

import { useState, useEffect } from 'react';
import { initialPlants } from '@/lib/data';
import { Header } from '@/components/header';
import { PlantCard } from '@/components/plant-card';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';
import type { Plant } from '@/types';

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    // In a real app, you'd fetch this from a database.
    // We'll use local storage to persist changes for this demo.
    const savedPlants = localStorage.getItem('plant-pal-plants');
    if (savedPlants) {
      setPlants(JSON.parse(savedPlants).map((p: Plant) => ({...p, acquisitionDate: new Date(p.acquisitionDate)})));
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
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header onPlantAdd={handlePlantAdd} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => handlePlantClick(plant)}
            />
          ))}
        </div>
      </div>
      <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={handleUpdatePlant}
      />
    </main>
  );
}
