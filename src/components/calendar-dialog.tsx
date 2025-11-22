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
import { useState, useMemo } from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Droplets, Scissors, Shovel, Camera, Bug, Beaker, History, Sprout, Plus, Skull } from 'lucide-react';
import type { Plant, PlantEvent, UserProfile } from '@/app/page';
import { ScrollArea } from './ui/scroll-area';
import * as LucideIcons from 'lucide-react';

const defaultEventIcons: Record<PlantEvent['type'], React.ReactElement> = {
  riego: <Droplets className="h-5 w-5 text-blue-500" />,
  poda: <Scissors className="h-5 w-5 text-gray-500" />,
  transplante: <Shovel className="h-5 w-5 text-orange-500" />,
  foto: <Camera className="h-5 w-5 text-purple-500" />,
  plaga: <Bug className="h-5 w-5 text-red-500" />,
  fertilizante: <Beaker className="h-5 w-5 text-green-500" />,
  nota: <History className="h-5 w-5 text-yellow-500" />,
  revivida: <Plus className="h-5 w-5 text-green-500" />,
  fallecida: <Skull className="h-5 w-5 text-red-500" />,
  esqueje: <Sprout className="h-5 w-5 text-cyan-500" />,
};

const defaultStatIcons: Record<PlantEvent['type'], React.ReactElement> = {
    riego: <Droplets className="h-4 w-4 text-blue-500" />,
    poda: <Scissors className="h-4 w-4 text-gray-500" />,
    transplante: <Shovel className="h-4 w-4 text-orange-500" />,
    foto: <Camera className="h-4 w-4 text-purple-500" />,
    plaga: <Bug className="h-4 w-4 text-red-500" />,
    fertilizante: <Beaker className="h-4 w-4 text-green-500" />,
    nota: <History className="h-4 w-4 text-yellow-500" />,
    revivida: <Plus className="h-4 w-4 text-green-500" />,
    fallecida: <Skull className="h-4 w-4 text-red-500" />,
    esqueje: <Sprout className="h-4 w-4 text-cyan-500" />,
};

const getIcon = (iconName: string, className: string): React.ReactElement => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <Sprout className={className} />;
};


export function CalendarDialog({ isOpen, setIsOpen, plants, userProfile }: { isOpen: boolean, setIsOpen: (val: boolean) => void, plants: Plant[], userProfile: UserProfile | null }) {
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
    
    const eventIcons = useMemo(() => {
        const customIcons = userProfile?.eventIconConfiguration;
        if (!customIcons) return defaultEventIcons;

        const mergedIcons: any = { ...defaultEventIcons };
        for (const key in customIcons) {
            const eventType = key as PlantEvent['type'];
            const iconName = customIcons[eventType];
            if (iconName) {
                mergedIcons[eventType] = getIcon(iconName, "h-5 w-5");
            }
        }
        return mergedIcons;
    }, [userProfile]);

    const statIcons = useMemo(() => {
        const customIcons = userProfile?.eventIconConfiguration;
        if (!customIcons) return defaultStatIcons;

        const mergedIcons: any = { ...defaultStatIcons };
        for (const key in customIcons) {
            const eventType = key as PlantEvent['type'];
            const iconName = customIcons[eventType];
            if (iconName) {
                mergedIcons[eventType] = getIcon(iconName, "h-4 w-4");
            }
        }
        return mergedIcons;
    }, [userProfile]);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-3xl w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>Calendario de Cuidados</DialogTitle>
                    <DialogDescription>
                        Visualiza los eventos de tus plantas y planifica cuidados futuros.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-4">
                  <div className="flex flex-col md:flex-row gap-6">
                      <div className='flex flex-col items-center gap-4'>
                          <Calendar
                              mode="single"
                              selected={date}
                              onSelect={setDate}
                              className="rounded-md border self-center"
                              locale={es}
                              modifiers={{ daysWithEvents }}
                              modifiersStyles={{ daysWithEvents: { borderColor: 'hsl(var(--primary))', borderWidth: '2px', borderRadius: '9999px' } }}
                          />
                           <div className="w-full max-w-[350px] p-4 border rounded-lg">
                               <h4 className="font-semibold mb-3 text-center">Resumen Mensual</h4>
                               <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                  {Object.keys(statIcons).map((type) => {
                                      const eventType = type as PlantEvent['type'];
                                      return monthlyStats[eventType] > 0 && (
                                          <div key={type} className="flex flex-col items-center justify-center p-1 bg-secondary/50 rounded-md">
                                              {statIcons[eventType]}
                                              <span className='font-bold text-lg'>{monthlyStats[type]}</span>
                                              <span className='capitalize text-muted-foreground'>{type}</span>
                                          </div>
                                      )
                                  })}
                               </div>
                               {Object.keys(monthlyStats).length === 0 && <p className="text-sm text-muted-foreground text-center">Sin eventos este mes.</p>}
                           </div>
                      </div>
                      <div className="mt-4 md:mt-0 flex-1">
                          <h3 className="font-semibold mb-2">Eventos para el {date ? format(date, "d 'de' MMMM", { locale: es }) : ''}</h3>
                          <div className='p-2 border rounded-md min-h-[200px] flex-1'>
                              {selectedDayEvents.length > 0 ? selectedDayEvents.map(event => (
                                  <div key={event.id} className="flex items-start gap-3 p-2 mb-2 rounded-md bg-secondary/50">
                                      {eventIcons[event.type as PlantEvent['type']]}
                                      <div>
                                          <p className="font-semibold">{event.plantName}</p>
                                          <p className="text-sm text-muted-foreground capitalize">{event.type}: {event.note}</p>
                                      </div>
                                  </div>
                              )) : <p className="text-sm text-muted-foreground text-center py-4">No hay eventos para este día.</p>}
                          </div>
                      </div>
                  </div>
                </ScrollArea>
                 <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
