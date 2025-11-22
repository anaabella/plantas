'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from './ui/scroll-area';
import { StatsComponent } from './stats';
import type { Plant } from '@/app/page';

export function StatsDialog({ isOpen, setIsOpen, plants }: { isOpen: boolean, setIsOpen: (val: boolean) => void, plants: Plant[] }) {
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
        <DialogHeader>
            <DialogTitle>Estadísticas del Jardín</DialogTitle>
            <DialogDescription>Un resumen visual de tu colección de plantas.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6 -mr-6">
          <StatsComponent plants={plants} />
        </ScrollArea>
        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
