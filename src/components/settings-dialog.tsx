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
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

export function SettingsDialog({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        if (!user || !firestore) return;
        const userRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            const userData = doc.data();
            if (userData && userData.tags) {
                setTags(userData.tags);
            }
        });
        return () => unsubscribe();
    }, [user, firestore]);

    const handleAddTag = async () => {
        if (!newTag.trim() || !user || !firestore) return;
        const userRef = doc(firestore, 'users', user.uid);
        const updatedTags = [...tags, newTag.trim()];
        await updateDoc(userRef, { tags: updatedTags });
        setNewTag('');
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!user || !firestore) return;
        const userRef = doc(firestore, 'users', user.uid);
        const updatedTags = tags.filter(tag => tag !== tagToRemove);
        await updateDoc(userRef, { tags: updatedTags });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>Ajustes</DialogTitle>
                    <DialogDescription>
                        Personaliza tus etiquetas y las opciones de la aplicación.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="tags" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="tags">Etiquetas</TabsTrigger>
                        <TabsTrigger value="events">Eventos</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="h-[400px] p-1 mt-4">
                        <TabsContent value="tags">
                           <div className='p-1'>
                             <h4 className="font-semibold mb-2">Gestionar Etiquetas</h4>
                             <div className="flex gap-2 mb-4">
                                 <Input 
                                     value={newTag} 
                                     onChange={(e) => setNewTag(e.target.value)} 
                                     placeholder="Nueva etiqueta..."
                                     onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                 />
                                 <Button onClick={handleAddTag}>Añadir</Button>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                 {tags.map(tag => (
                                     <div key={tag} className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-sm">
                                         <span>{tag}</span>
                                         <button onClick={() => handleRemoveTag(tag)} className='text-muted-foreground hover:text-foreground'>
                                             <X className="h-4 w-4" />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                             {tags.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No tienes etiquetas personalizadas.</p>}
                           </div>
                        </TabsContent>
                        <TabsContent value="events">
                             <div className='p-1'>
                               <h4 className="font-semibold mb-2">Personalizar Iconos de Eventos</h4>
                                <p className='text-sm text-muted-foreground text-center py-8'>Próximamente...</p>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
