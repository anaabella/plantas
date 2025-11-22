'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, memo } from 'react';

export const WishlistFormDialog = memo(function WishlistFormDialog({ isOpen, setIsOpen, onSave, item }: any) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setNotes(item.notes || '');
    } else {
      setName('');
      setNotes('');
    }
  }, [item, isOpen]);

  const handleSubmit = () => {
    if (!name) {
      alert("El nombre es obligatorio.");
      return;
    }
    onSave({ name, notes }, item?.id);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Editar Deseo" : "Nuevo Deseo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input placeholder="Nombre de la planta" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Notas (dónde encontrarla, precio, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

    