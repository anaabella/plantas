'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, CheckSquare } from 'lucide-react';
import Image from 'next/image';
import type { WishlistItem } from '@/app/page';

interface WishlistDetailDialogProps {
  item: WishlistItem;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onGotIt: (item: WishlistItem) => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
}

export function WishlistDetailDialog({
  item,
  isOpen,
  setIsOpen,
  onGotIt,
  onEdit,
  onDelete,
}: WishlistDetailDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{item.name}</DialogTitle>
          {item.notes && (
            <DialogDescription>{item.notes}</DialogDescription>
          )}
        </DialogHeader>

        <div className="relative aspect-square w-full my-4 rounded-lg overflow-hidden">
          <Image
            src={item.image || 'https://placehold.co/400x500/A0D995/333333?text=?'}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            unoptimized={true}
          />
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button onClick={() => onGotIt(item)} className="w-full">
            <CheckSquare className="mr-2 h-4 w-4" /> La he conseguido
          </Button>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => onEdit(item)}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará "{item.name}" de tu lista de deseos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(item.id)}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
