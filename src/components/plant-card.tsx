'use client';

import Image from 'next/image';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Plant } from '@/types';
import { format } from 'date-fns';
import { Skull } from 'lucide-react';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
}

export function PlantCard({ plant, onClick }: PlantCardProps) {
  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-accent/20 hover:shadow-xl hover:-translate-y-1 animation-fade-in"
      onClick={onClick}
    >
      <div className="relative aspect-[4/5] w-full">
        <Image
          src={plant.imageUrl}
          alt={`Image of ${plant.name}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          data-ai-hint={plant.imageHint}
        />
        {plant.isDeceased && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Skull className="h-12 w-12 text-white/80" />
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="font-headline truncate">{plant.name}</CardTitle>
        {plant.isDeceased ? (
          <Badge variant="destructive" className="w-fit bg-accent/80 text-accent-foreground">At Rest</Badge>
        ) : (
          <p className="text-sm text-muted-foreground">
            Acquired: {format(plant.acquisitionDate, 'MMM d, yyyy')}
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
