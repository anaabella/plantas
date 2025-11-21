'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';

interface ImageDetailDialogProps {
  imageUrl: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ImageDetailDialog({
  imageUrl,
  isOpen,
  setIsOpen,
}: ImageDetailDialogProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl w-full p-2 bg-transparent border-none shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Vista detallada de la imagen</DialogTitle>
          <DialogDescription>
            Una vista ampliada de la imagen de la planta seleccionada.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-auto w-full h-[80vh]">
          <Image
            src={imageUrl}
            alt="Vista detallada de la imagen"
            fill
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
