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
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CircleDotDashed, Zap } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';


export function CameraCaptureDialog({ isOpen, setIsOpen, onPhotoCaptured }: { isOpen: boolean, setIsOpen: (val: boolean) => void, onPhotoCaptured: (dataUri: string) => void }) {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const cleanupCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCapturedImage(null); // Reset captured image when dialog opens
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Acceso a la Cámara Denegado',
                        description: 'Por favor, activa los permisos de cámara en tu navegador para usar esta función.',
                    });
                }
            };
            getCameraPermission();
        } else {
            cleanupCamera();
        }

        return () => {
            cleanupCamera();
        };
    }, [isOpen, toast, cleanupCamera]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            if (context) {
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = video.videoWidth;
                let height = video.videoHeight;
    
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                context.drawImage(video, 0, 0, width, height);
                
                // Get the compressed image data from the canvas
                const dataUri = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
                setCapturedImage(dataUri);
                cleanupCamera();
            }
        }
    };

    const handleConfirm = () => {
        if(capturedImage) {
            onPhotoCaptured(capturedImage);
        }
    }
    
    const handleRetake = () => {
        setCapturedImage(null);
        // Re-request camera permission and stream
        const getCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Error de Cámara',
                    description: 'No se pudo reactivar la cámara.',
                });
            }
        };
        getCameraPermission();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Capturar Foto</DialogTitle>
                    <DialogDescription>Apunta con la cámara a tu planta y captura la mejor foto.</DialogDescription>
                </DialogHeader>
                
                {/* Canvas oculto para procesar la imagen */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden flex items-center justify-center">
                    {capturedImage ? (
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                    ) : (
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    )}

                    {!capturedImage && hasCameraPermission === null && (
                        <div className="absolute text-white flex flex-col items-center">
                           <CircleDotDashed className="h-8 w-8 animate-spin"/>
                           <p className="mt-2">Iniciando cámara...</p>
                        </div>
                    )}
                </div>

                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Acceso a la Cámara Requerido</AlertTitle>
                        <AlertDescription>
                            Necesitamos permiso para usar la cámara. Por favor, habilítalo en la configuración de tu navegador y recarga la página.
                        </AlertDescription>
                    </Alert>
                )}
                
                <DialogFooter>
                    {capturedImage ? (
                        <div className='w-full flex justify-between'>
                            <Button variant="outline" onClick={handleRetake}>Tomar Otra</Button>
                            <Button onClick={handleConfirm}>Confirmar Foto</Button>
                        </div>
                    ) : (
                        <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
                           <Zap className="mr-2 h-4 w-4" /> Capturar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    