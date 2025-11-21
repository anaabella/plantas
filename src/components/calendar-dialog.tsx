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
import { format, parseISO } from 'date-fns';
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
    
    const eventIcons = {
        riego: <Droplets className="h-5 w-5 text-blue-500" />,
        poda: <Scissors className="h-5 w-5 text-gray-500" />,
        transplante: <Shovel className="h-5 w-5 text-orange-500" />,
        foto: <Camera className="h-5 w-5 text-purple-500" />,
        plaga: <Bug className="h-5 w-5 text-red-500" />,
        fertilizante: <Beaker className="h-5 w-5 text-green-500" />,
        nota: <History className="h-5 w-5 text-yellow-500" />,
    };

     const exportToIcs = () => {
        let icsString = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PlantPal//NONSGML v1.0//EN\n';

        allEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const formattedDate = format(eventDate, "yyyyMMdd'T'HHmmss'Z'");
            const summary = `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}: ${event.plantName}`;
            
            icsString += 'BEGIN:VEVENT\n';
            icsString += `UID:${event.id}@plantpal.app\n`;
            icsString += `DTSTAMP:${formattedDate}\n`;
            icsString += `DTSTART;VALUE=DATE:${format(eventDate, 'yyyyMMdd')}\n`;
            icsString += `SUMMARY:${summary}\n`;
            icsString += `DESCRIPTION:${event.note.replace(/\n/g, '\\n')}\n`;
            icsString += 'END:VEVENT\n';
        });

        icsString += 'END:VCALENDAR';

        const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'plantpal_events.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                         <div className="mt-4">
                            <Button onClick={exportToIcs}>Exportar Eventos (.ics)</Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Eventos del día</h3>
                             <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
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
