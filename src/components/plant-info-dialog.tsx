'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PlantInfoDisplay } from './plant-info-display';

export function PlantInfoDialog({ isOpen, setIsOpen, plantName, info, isLoading }: any) {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Información sobre: {plantName}</DialogTitle>
                    <DialogDescription>
                        Aquí tienes detalles y consejos de cuidado generados por IA.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto p-1">
                    {isLoading && <Skeleton className="h-40 w-full" />}
                    {info && <PlantInfoDisplay info={info} />}
                    {!isLoading && !info && <p>No se pudo cargar la información.</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}
