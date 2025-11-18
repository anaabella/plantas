
'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Plant } from '@/types';
import { Gift, RefreshCw, ShoppingBag, Skull, Droplets, Sun, Scissors, HeartCrack } from 'lucide-react';
import { format } from 'date-fns';

interface PlantDetailDialogProps {
  plant: Plant | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onUpdatePlant: (updatedPlant: Plant) => void;
}

const acquisitionIcons = {
  purchased: <ShoppingBag className="h-5 w-5" />,
  gifted: <Gift className="h-5 w-5" />,
  traded: <RefreshCw className="h-5 w-5" />,
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

export function PlantDetailDialog({ plant, isOpen, setIsOpen, onUpdatePlant }: PlantDetailDialogProps) {
  if (!plant) return null;

  const handleDeceasedToggle = () => {
    onUpdatePlant({ ...plant, isDeceased: !plant.isDeceased });
    setIsOpen(false);
  };
  
  const acquisitionType = plant.acquisitionType;
  const Icon = acquisitionIcons[acquisitionType];

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
          <DialogDescription>
            Acquired on {format(plant.acquisitionDate, 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3 bg-secondary p-3 rounded-md">
            <div className="text-primary">{Icon}</div>
            <div>
              <p className="font-semibold capitalize">{acquisitionType}</p>
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
            <InfoSection icon={<Sun className="h-5 w-5" />} title="Leaf Details">
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
            <Skull className="mr-2 h-4 w-4" />
            {plant.isDeceased ? 'Revive Plant' : 'Mark as Deceased'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


    