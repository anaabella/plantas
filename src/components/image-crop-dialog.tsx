'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useToast } from '@/hooks/use-toast';

// Constants
const ASPECT_RATIO = 1;
const MIN_DIMENSION = 150;

interface ImageCropDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedImageDataUrl: string) => void;
}

// Function to get the cropped image as a data URL
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('Failed to get 2D context'));
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for better compression
  });
}

export function ImageCropDialog({
  isOpen,
  setIsOpen,
  imageSrc,
  onCropComplete,
}: ImageCropDialogProps) {
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      ASPECT_RATIO,
      width,
      height
    );
    const centeredCrop = centerCrop(crop, width, height);
    setCrop(centeredCrop);
    setCompletedCrop(centeredCrop);
  }

  const handleCrop = async () => {
    if (completedCrop && imgRef.current) {
        if (completedCrop.width < MIN_DIMENSION || completedCrop.height < MIN_DIMENSION) {
            toast({
                variant: 'destructive',
                title: 'Recorte demasiado pequeño',
                description: `La imagen debe tener al menos ${MIN_DIMENSION}px de ancho y alto.`,
            });
            return;
        }
        try {
            const croppedDataUrl = await getCroppedImg(imgRef.current, completedCrop);
            onCropComplete(croppedDataUrl);
        } catch (error) {
            console.error("Error cropping image:", error);
            toast({
                variant: 'destructive',
                title: 'Error al recortar',
                description: 'No se pudo procesar la imagen. Inténtalo de nuevo.',
            });
        }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recortar Imagen</DialogTitle>
          <DialogDescription>
            Ajusta el recuadro para seleccionar la parte de la imagen que quieres usar.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 flex justify-center">
            {imageSrc && (
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={ASPECT_RATIO}
                    minWidth={MIN_DIMENSION}
                    circularCrop={false}
                >
                    <img
                        ref={imgRef}
                        alt="Crop preview"
                        src={imageSrc}
                        style={{ maxHeight: '70vh' }}
                        onLoad={onImageLoad}
                    />
                </ReactCrop>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCrop}>Recortar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
