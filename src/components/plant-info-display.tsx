'use client';

import { Lightbulb, Thermometer, Droplets, Leaf, Flower, Palette, Sparkles, Sprout, Wind, Package } from 'lucide-react';

const InfoCard = ({ icon, title, children }: any) => (
    <div className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
        <div className="text-primary pt-1">{icon}</div>
        <div>
            <h5 className="font-semibold">{title}</h5>
            <p className="text-sm text-muted-foreground">{children}</p>
        </div>
    </div>
);

export function PlantInfoDisplay({ info }: any) {
    if (!info) return null;
    const { careInfo, seasonalCare, generalInfo, funFact } = info;
    return (
        <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-background space-y-3">
                    <h4 className="font-semibold flex items-center"><Sprout className="mr-2 h-4 w-4 text-primary" />Cuidados Básicos</h4>
                    <InfoCard icon={<Lightbulb size={20} />} title="Luz">{careInfo.light}</InfoCard>
                    <InfoCard icon={<Droplets size={20} />} title="Riego">{careInfo.water}</InfoCard>
                    <InfoCard icon={<Thermometer size={20} />} title="Temperatura">{careInfo.temperature}</InfoCard>
                </div>
                <div className="p-3 rounded-lg border bg-background space-y-3">
                    <h4 className="font-semibold flex items-center"><Leaf className="mr-2 h-4 w-4 text-primary" />Cuidados Estacionales</h4>
                    <InfoCard icon={<Package size={20} />} title="Fertilizar">{seasonalCare.fertilize}</InfoCard>
                    <InfoCard icon={<Wind size={20} />} title="Podar">{seasonalCare.prune}</InfoCard>
                    <InfoCard icon={<Package size={20} />} title="Transplantar">{seasonalCare.repot}</InfoCard>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-background space-y-3">
                    <h4 className="font-semibold flex items-center"><Flower className="mr-2 h-4 w-4 text-primary" />Floración y Crecimiento</h4>
                    <InfoCard icon={<Sprout size={20} />} title="Altura Máxima">{generalInfo.maxHeight}</InfoCard>
                    <InfoCard icon={<Flower size={20} />} title="Época de Floración">{generalInfo.bloomSeason}</InfoCard>
                    <InfoCard icon={<Palette size={20} />} title="Colores de Flores">{generalInfo.flowerColors}</InfoCard>
                </div>
                <div className="p-3 rounded-lg border bg-background space-y-3">
                     <h4 className="font-semibold flex items-center"><Sparkles className="mr-2 h-4 w-4 text-primary" />Dato Curioso</h4>
                     <p className="p-3 text-muted-foreground">{funFact}</p>
                </div>
            </div>
        </div>
    )
}
