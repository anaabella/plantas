'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { X, Sprout, Flower2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import * as LucideIcons from 'lucide-react';
import { PlantEvent, UserProfile } from '@/app/page';

const eventTypes: PlantEvent['type'][] = ['riego', 'poda', 'transplante', 'foto', 'plaga', 'fertilizante', 'nota', 'revivida', 'fallecida', 'esqueje', 'floracion'];

const iconList = Object.keys(LucideIcons).filter(key => /^[A-Z]/.test(key) && key !== 'createReactComponent' && key !== 'LucideProps' && key !== 'Icon' && key !== 'Loader');

const getIcon = (iconName: string | undefined): React.ReactElement => {
    if (!iconName) return <Sprout className="h-5 w-5" />;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Sprout className="h-5 w-5" />;
};


export function SettingsDialog({ isOpen, setIsOpen, userProfile }: { isOpen: boolean, setIsOpen: (val: boolean) => void, userProfile: UserProfile | null }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [iconConfig, setIconConfig] = useState<Partial<Record<PlantEvent['type'], string>>>({});
    const [iconSearch, setIconSearch] = useState('');

    useEffect(() => {
        if (userProfile) {
            setIconConfig(userProfile.eventIconConfiguration || {});
        }
    }, [userProfile]);

    const handleIconChange = async (eventType: PlantEvent['type'], iconName: string) => {
        if (!user || !firestore) return;
        const userRef = doc(firestore, 'users', user.uid);
        const newIconConfig = { ...iconConfig, [eventType]: iconName };
        await updateDoc(userRef, { eventIconConfiguration: newIconConfig });
        setIconConfig(newIconConfig);
    }
    
    const filteredIcons = useMemo(() => {
        if (!iconSearch) return iconList.slice(0, 100); // Limit initial list
        return iconList.filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, 100);
    }, [iconSearch]);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>Ajustes</DialogTitle>
                    <DialogDescription>
                        Personaliza los iconos de los eventos de tus plantas.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="events" className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="events">Iconos de Eventos</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="h-[400px] p-1 mt-4">
                        <TabsContent value="events">
                             <div className='p-1 space-y-4'>
                               <h4 className="font-semibold mb-2">Personalizar Iconos de Eventos</h4>
                               {eventTypes.map(type => (
                                <div key={type} className="flex items-center justify-between">
                                    <div className='flex items-center gap-2'>
                                        {getIcon(iconConfig[type])}
                                        <span className='capitalize'>{type}</span>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm">Cambiar</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className='w-80'>
                                            <div className='space-y-2'>
                                                <Input 
                                                    placeholder='Buscar icono...'
                                                    value={iconSearch}
                                                    onChange={(e) => setIconSearch(e.target.value)}
                                                />
                                                <ScrollArea className='h-64'>
                                                    <div className='grid grid-cols-5 gap-2 p-2'>
                                                        {filteredIcons.map(iconName => (
                                                            <Button
                                                                key={iconName}
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    handleIconChange(type, iconName);
                                                                    setIconSearch('');
                                                                }}
                                                            >
                                                                {getIcon(iconName)}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                               ))}
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
