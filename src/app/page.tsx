'use client';

import { useState } from 'react';
import { initialPlants } from '@/lib/data';
import type { Plant } from '@/types';
import { Header } from '@/components/header';
import { PlantCard } from '@/components/plant-card';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';

export default function HomePage() {
  const [plants, setPlants] = useState<Plant[]>(initialPlants);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
    setSelectedPlant(updatedPlant);
  };

  return (
    <>
      <Header onPlantAdd={handlePlantAdd} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => handlePlantClick(plant)}
            />
          ))}
        </div>
      </main>
      <PlantDetailDialog
        plant={selectedPlant}
        isOpen={isDetailOpen}
        setIsOpen={setIsDetailOpen}
        onUpdatePlant={handleUpdatePlant}
      />
    </>
  );
}
