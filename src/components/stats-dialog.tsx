'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import type { Plant } from '@/app/page';
import { Leaf, Heart, HeartCrack, DollarSign, Gift, ArrowRightLeft, Sun, Home, Download, Skull } from 'lucide-react';

export function StatsDialog({ isOpen, setIsOpen, plants }: any) {
  const stats = useMemo(() => {
    const total = plants.length;
    const alive = plants.filter((p:Plant) => p.status === 'viva').length;
    const deceased = plants.filter((p:Plant) => p.status === 'fallecida').length;
    const traded = plants.filter((p: Plant) => p.status === 'intercambiada').length;
    const acquisition = plants.reduce((acc:any, p:Plant) => {
      acc[p.acquisitionType] = (acc[p.acquisitionType] || 0) + 1;
      return acc;
    }, {});
    const location = plants.reduce((acc:any, p:Plant) => {
      acc[p.location] = (acc[p.location] || 0) + 1;
      return acc;
    }, {});

    return { total, alive, deceased, traded, acquisition, location };
  }, [plants]);

  const exportToCsv = () => {
    const headers = [
        "ID", "Nombre", "Fecha Adquisicion", "Estado", "Ultimo Riego", "Tipo Comienzo", 
        "Ubicacion", "Tipo Adquisicion", "Precio", "Regalo De", "Rescatada De", 
        "Fuente Intercambio", "Destino Intercambio", "Ultima Foto", "Notas"
    ];
    
    const rows = plants.map((p: Plant) => [
        p.id,
        `"${p.name?.replace(/"/g, '""')}"`,
        p.date,
        p.status,
        p.lastWatered || "",
        p.startType,
        p.location,
        p.acquisitionType,
        p.price || "",
        p.giftFrom || "",
        p.rescuedFrom || "",
        p.exchangeSource || "",
        p.exchangeDest || "",
        p.lastPhotoUpdate || "",
        `"${p.notes?.replace(/"/g, '""') || ""}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="p-4 bg-background rounded-lg border flex items-center gap-4">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Estadísticas del Jardín</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          <StatCard icon={Leaf} label="Plantas Totales" value={stats.total} color="bg-green-500" />
          <StatCard icon={Heart} label="Vivas" value={stats.alive} color="bg-blue-500" />
          <StatCard icon={HeartCrack} label="Fallecidas" value={stats.deceased} color="bg-red-500" />
          <StatCard icon={DollarSign} label="Compradas" value={stats.acquisition.compra || 0} color="bg-yellow-500" />
          <StatCard icon={Gift} label="Regaladas" value={stats.acquisition.regalo || 0} color="bg-pink-500" />
          <StatCard icon={ArrowRightLeft} label="Intercambiadas" value={stats.acquisition.intercambio || 0} color="bg-purple-500" />
          <StatCard icon={Skull} label="Rescatadas" value={stats.acquisition.rescatada || 0} color="bg-gray-500" />
          <StatCard icon={Sun} label="Exterior" value={stats.location.exterior || 0} color="bg-orange-500" />
          <StatCard icon={Home} label="Interior" value={stats.location.interior || 0} color="bg-indigo-500" />
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={exportToCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar a CSV
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    