'use client';
import {
  Dialog,
  DialogContent,
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
        <div className="relative aspect-auto w-full h-[80vh]">
          <Image
            src={imageUrl}
            alt="Vista detallada de la imagen"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
