'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { useState, useMemo } from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Droplets, Scissors, Shovel, Camera, Bug, Beaker, History } from 'lucide-react';
import type { Plant } from '@/app/page';

export function CalendarDialog({ isOpen, setIsOpen, plants }: any) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    const allEvents = useMemo(() => {
        return plants.flatMap((plant: Plant) => 
            (plant.events || []).map(event => ({ ...event, plantName: plant.name, plantId: plant.id }))
        );
    }, [plants]);

    const eventsByDay = useMemo(() => {
        const grouped: { [key: string]: typeof allEvents } = {};
        allEvents.forEach(event => {
            const day = format(parseISO(event.date), 'yyyy-MM-dd');
            if (!grouped[day]) {
                grouped[day] = [];
            }
            grouped[day].push(event);
        });
        return grouped;
    }, [allEvents]);

    const daysWithEvents = useMemo(() => {
        return Object.keys(eventsByDay).map(dayStr => new Date(dayStr + 'T12:00:00'));
    }, [eventsByDay]);

    const selectedDayEvents = date ? eventsByDay[format(date, 'yyyy-MM-dd')] || [] : [];
    
    const monthlyStats = useMemo(() => {
        if (!date) return {};
        const monthEvents = allEvents.filter(event => isSameMonth(parseISO(event.date), date));
        const stats = monthEvents.reduce((acc: any, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});
        return stats;
    }, [allEvents, date]);
    
    const eventIcons = {
        riego: <Droplets className="h-5 w-5 text-blue-500" />,
        poda: <Scissors className="h-5 w-5 text-gray-500" />,
        transplante: <Shovel className="h-5 w-5 text-orange-500" />,
        foto: <Camera className="h-5 w-5 text-purple-500" />,
        plaga: <Bug className="h-5 w-5 text-red-500" />,
        fertilizante: <Beaker className="h-5 w-5 text-green-500" />,
        nota: <History className="h-5 w-5 text-yellow-500" />,
    };

    const statIcons: { [key: string]: React.ReactNode } = {
        riego: <Droplets className="h-4 w-4 text-blue-500" />,
        poda: <Scissors className="h-4 w-4 text-gray-500" />,
        transplante: <Shovel className="h-4 w-4 text-orange-500" />,
        foto: <Camera className="h-4 w-4 text-purple-500" />,
        plaga: <Bug className="h-4 w-4 text-red-500" />,
        fertilizante: <Beaker className="h-4 w-4 text-green-500" />,
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>Calendario de Cuidados</DialogTitle>
                    <DialogDescription>
                        Visualiza los eventos de tus plantas y planifica cuidados futuros.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className='flex flex-col items-center'>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                            locale={es}
                            modifiers={{ daysWithEvents }}
                            modifiersStyles={{ daysWithEvents: { borderColor: 'hsl(var(--primary))', borderWidth: '2px', borderRadius: '9999px' } }}
                        />
                         <div className="mt-4 w-full p-4 border rounded-lg">
                             <h4 className="font-semibold mb-3 text-center">Resumen Mensual</h4>
                             <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                {Object.entries(statIcons).map(([type, icon]) => (
                                    monthlyStats[type] > 0 && (
                                        <div key={type} className="flex flex-col items-center justify-center p-1 bg-secondary/50 rounded-md">
                                            {icon}
                                            <span className='font-bold text-lg'>{monthlyStats[type]}</span>
                                            <span className='capitalize text-muted-foreground'>{type}</span>
                                        </div>
                                    )
                                ))}
                             </div>
                             {Object.keys(monthlyStats).length === 0 && <p className="text-sm text-muted-foreground text-center">Sin eventos este mes.</p>}
                         </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Eventos del día</h3>
                             <div className="max-h-[80vh] md:max-h-96 overflow-y-auto space-y-2 pr-2">
                                {selectedDayEvents.length > 0 ? selectedDayEvents.map(event => (
                                    <div key={event.id} className="flex items-start gap-3 p-2 rounded-md bg-secondary/50">
                                        {eventIcons[event.type]}
                                        <div>
                                            <p className="font-semibold">{event.plantName}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{event.type}: {event.note}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground text-center py-4">No hay eventos para este día.</p>}
                            </div>
                        </div>
                        <Separator />
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
