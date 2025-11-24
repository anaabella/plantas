'use client';
import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { identifyPlant } from '@/ai/flows/identify-plant-flow';

interface IdentifyPlantDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onComplete: (data: { type: string; image: string }) => void;
}

export function IdentifyPlantDialog({
  isOpen,
  setIsOpen,
  onComplete,
}: IdentifyPlantDialogProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImage(result);
        handleIdentify(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdentify = async (imageDataUri: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await identifyPlant({ photoDataUri: imageDataUri });
      if (!result.isPlant) {
        setError('La imagen no parece ser una planta. Por favor, intenta con otra foto.');
        setIsLoading(false);
        setImage(null);
        return;
      }
      onComplete({ type: result.commonName, image: imageDataUri });
    } catch (err) {
      console.error(err);
      setError('No se pudo identificar la planta. Por favor, inténtalo de nuevo.');
    } finally {
        // Delay to allow user to see error
        setTimeout(() => {
             setIsLoading(false);
        }, 1000);
    }
  };

  const resetState = () => {
    setImage(null);
    setIsLoading(false);
    setError(null);
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Identificar Planta con IA</DialogTitle>
          <DialogDescription>
            Sube una foto de una planta y la IA intentará identificarla por ti.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          {!image && !isLoading && (
            <>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Subir Foto
              </Button>
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Identificando...</p>
              {image && <img src={image} alt="Identificando" className="mt-4 rounded-lg max-h-64 object-contain" />}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                <AlertTriangle className="h-8 w-8" />
                <p className="font-semibold">¡Error!</p>
                <p className="text-sm">{error}</p>
                <Button variant="outline" onClick={resetState} className="mt-4">Intentar de Nuevo</Button>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
