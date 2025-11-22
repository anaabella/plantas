'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { AddPlantDialog } from '@/components/add-plant-dialog';
import { useState } from 'react';
import type { Plant } from '@/types';

interface HeaderProps {
  onPlantAdd: (newPlant: Plant) => void;
}

export function Header({ onPlantAdd }: HeaderProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex items-center">
            <Logo />
            <h1 className="ml-2 font-headline text-xl font-bold">PlantPal</h1>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plant
            </Button>
          </div>
        </div>
      </header>
      <AddPlantDialog
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
        onPlantAdd={onPlantAdd}
      />
    </>
  );
}
