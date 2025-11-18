'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { PlantCard } from '@/components/plant-card';
import { PlantDetailDialog } from '@/components/plant-detail-dialog';
import { initialPlants } from '@/lib/data';
import type { Plant } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    try {
      const storedPlants = localStorage.getItem('plantpal-plants');
      if (storedPlants) {
        const parsedPlants = JSON.parse(storedPlants).map((p: any) => ({...p, acquisitionDate: new Date(p.acquisitionDate)}));
        setPlants(parsedPlants);
      } else {
        setPlants(initialPlants);
      }
    } catch (error) {
      console.error("Failed to load plants from localStorage", error);
      setPlants(initialPlants);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('plantpal-plants', JSON.stringify(plants));
      } catch (error) {
        console.error("Failed to save plants to localStorage", error);
      }
    }
  }, [plants, isClient]);

  const handleCardClick = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDetailOpen(true);
  };

  const handlePlantAdd = (newPlant: Plant) => {
    setPlants((prevPlants) => [newPlant, ...prevPlants]);
    toast({
      title: "Plant Added!",
      description: `${newPlant.name} has joined your collection.`,
    });
  };

  const handleUpdatePlant = (updatedPlant: Plant) => {
    setPlants((prevPlants) =>
      prevPlants.map((p) => (p.id === updatedPlant.id ? updatedPlant : p))
    );
    const toastMessage = updatedPlant.isDeceased 
      ? `${updatedPlant.name} has gone to the big greenhouse in the sky.`
      : `${updatedPlant.name} has been revived!`;
    toast({
      title: "Plant Updated",
      description: toastMessage,
    });
  };

  if (!isClient) {
    return null;
  }
  
  const livingPlants = plants.filter(p => !p.isDeceased);
  const deceasedPlants = plants.filter(p => p.isDeceased);

  return (
    <>
      <div className="flex min-h-screen w-full flex-col bg-background font-body">
        <Header onPlantAdd={handlePlantAdd} />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <section>
              <h2 className="text-3xl font-bold font-headline mb-6">Your Greenhouse</h2>
              {livingPlants.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {livingPlants.map((plant) => (
                    <PlantCard
                      key={plant.id}
                      plant={plant}
                      onClick={() => handleCardClick(plant)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <h3 className="text-xl font-semibold">Your greenhouse is empty!</h3>
                  <p className="text-muted-foreground mt-2">Click "Add Plant" to start your collection.</p>
                </div>
              )}
            </section>
            
            {deceasedPlants.length > 0 && (
              <section className="mt-16">
                <h2 className="text-3xl font-bold font-headline mb-6">Memorial Garden</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {deceasedPlants.map((plant) => (
                    <PlantCard
                      key={plant.id}
                      plant={plant}
                      onClick={() => handleCardClick(plant)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
        <PlantDetailDialog
          plant={selectedPlant}
          isOpen={isDetailOpen}
          setIsOpen={setIsDetailOpen}
          onUpdatePlant={handleUpdatePlant}
        />
      </div>
    </>
  );
}
