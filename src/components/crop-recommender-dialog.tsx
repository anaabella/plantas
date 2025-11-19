'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { recommendCrops, type CropRecommenderOutput } from '@/ai/flows/vegetable-recommender-flow';


export function CropRecommenderDialog({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (isOpen: boolean) => void }) {
    const [userQuery, setUserQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<CropRecommenderOutput | null>(null);

    const handleRecommend = async () => {
        if (!userQuery) return;
        setIsLoading(true);
        setRecommendations(null);
        try {
            const result = await recommendCrops({ userQuery });
            setRecommendations(result);
        } catch (error) {
            console.error(error);
            // Mostrar toast de error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Asistente de Huerta</DialogTitle>
                    <DialogDescription>Describe tu espacio (ej. "balcón soleado", "patio con sombra") y la IA te recomendará qué frutas y hortalizas plantar.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea 
                        placeholder="Tengo un pequeño balcón que recibe sol directo por la mañana..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                    />
                    <Button onClick={handleRecommend} disabled={isLoading || !userQuery}>
                        {isLoading ? 'Pensando...' : 'Obtener Recomendaciones'}
                    </Button>
                </div>
                {isLoading && <div className="mt-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>}
                {recommendations && (
                    <div className="mt-4 space-y-3">
                        <h3 className="font-semibold">Aquí tienes algunas sugerencias:</h3>
                        {recommendations.recommendations.map((rec, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                                <h4 className="font-bold">{rec.name}</h4>
                                <p className="text-sm text-muted-foreground"><strong>Cosecha:</strong> {rec.timeToHarvest}</p>
                                <p className="text-sm text-muted-foreground"><strong>Ubicación:</strong> {rec.plantingLocation}</p>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
