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
import { useMemo } from 'react';
import type { Plant } from '@/app/page';
import { Leaf, Heart, HeartCrack, DollarSign } from 'lucide-react';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea } from './ui/scroll-area';

export function StatsDialog({ isOpen, setIsOpen, plants }: any) {
  const stats = useMemo(() => {
    const total = plants.length;
    const alive = plants.filter((p:Plant) => p.status === 'viva').length;
    const deceased = plants.filter((p:Plant) => p.status === 'fallecida').length;
    const traded = plants.filter((p: Plant) => p.status === 'intercambiada').length;
    
    const acquisition = plants.reduce((acc:any, p:Plant) => {
      acc[p.acquisitionType] = (acc[p.acquisitionType] || 0) + 1;
      return acc;
    }, {});

    const statusData = [
        { name: 'Vivas', value: alive, fill: 'hsl(var(--chart-2))' },
        { name: 'Fallecidas', value: deceased, fill: 'hsl(var(--destructive))' },
        { name: 'Intercambiadas', value: traded, fill: 'hsl(var(--chart-4))' }
    ];

    const acquisitionData = Object.entries(acquisition).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number,
        fill: `hsl(var(--chart-${index + 1}))`
    }));
    
    const totalSpent = plants
      .filter((p: Plant) => p.acquisitionType === 'compra' && p.price)
      .reduce((sum: number, p: Plant) => sum + parseFloat(p.price || '0'), 0);

    return { total, alive, deceased, traded, acquisition, totalSpent, statusData, acquisitionData };
  }, [plants]);


  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-4 bg-secondary/50 rounded-lg border flex items-center gap-4">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  const chartConfig = {
    value: { label: 'Plantas' },
    Vivas: { label: 'Vivas', color: 'hsl(var(--chart-2))' },
    Fallecidas: { label: 'Fallecidas', color: 'hsl(var(--destructive))' },
    Intercambiadas: { label: 'Intercambiadas', color: 'hsl(var(--chart-4))' },
    Compra: { label: 'Compra', color: 'hsl(var(--chart-1))' },
    Regalo: { label: 'Regalo', color: 'hsl(var(--chart-2))' },
    Intercambio: { label: 'Intercambio', color: 'hsl(var(--chart-3))' },
    Rescatada: { label: 'Rescatada', color: 'hsl(var(--chart-5))' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
        <DialogHeader>
            <DialogTitle>Estadísticas del Jardín</DialogTitle>
            <DialogDescription>Un resumen visual de tu colección de plantas.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 py-4">
            <StatCard icon={Leaf} label="Plantas Totales" value={stats.total} color="bg-green-500" />
            <StatCard icon={Heart} label="Vivas" value={stats.alive} color="bg-blue-500" />
            <StatCard icon={HeartCrack} label="Fallecidas" value={stats.deceased} color="bg-red-500" />
            <StatCard 
              icon={DollarSign} 
              label="Gastos Totales" 
              value={`$${stats.totalSpent.toFixed(2)}`} 
              color="bg-yellow-500" 
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Card>
                  <CardHeader>
                      <CardTitle>Estado de las Plantas</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ChartContainer config={chartConfig} className="w-full h-[200px]">
                          <ResponsiveContainer>
                              <BarChart data={stats.statusData} layout="vertical" margin={{ left: 20 }}>
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
                                  <ChartTooltip
                                      cursor={{ fill: 'hsl(var(--muted))' }}
                                      content={<ChartTooltipContent hideLabel />}
                                  />
                                  <Bar dataKey="value" radius={5} />
                              </BarChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Origen de las Plantas</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ChartContainer config={chartConfig} className="w-full h-[200px]">
                          <ResponsiveContainer>
                              <BarChart data={stats.acquisitionData} layout="vertical" margin={{ left: 20 }}>
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
                                  <ChartTooltip
                                      cursor={{ fill: 'hsl(var(--muted))' }}
                                      content={<ChartTooltipContent hideLabel />}
                                  />
                                  <Bar dataKey="value" radius={5} />
                              </BarChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
              </Card>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
