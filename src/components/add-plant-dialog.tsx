'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Plant, AcquisitionType } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  acquisitionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date.',
  }),
  acquisitionType: z.enum(['purchased', 'gifted', 'traded']),
  price: z.string().optional(),
  tradeReason: z.string().optional(),
  rootInfo: z.string().optional(),
  leafInfo: z.string().optional(),
  clippingInfo: z.string().optional(),
  imageUrl: z.string().url({ message: 'Please enter a valid URL.' }),
}).refine(data => {
    if (data.acquisitionType === 'purchased') {
        return data.price !== undefined && data.price !== '' && !isNaN(parseFloat(data.price));
    }
    return true;
}, {
    message: 'Price is required for purchased plants.',
    path: ['price'],
}).refine(data => {
    if (data.acquisitionType === 'traded') {
        return data.tradeReason && data.tradeReason.length > 0;
    }
    return true;
}, {
    message: 'Trade reason is required for traded plants.',
    path: ['tradeReason'],
});

interface AddPlantDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onPlantAdd: (newPlant: Plant) => void;
}

export function AddPlantDialog({ isOpen, setIsOpen, onPlantAdd }: AddPlantDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      acquisitionDate: new Date().toISOString().split('T')[0],
      acquisitionType: 'purchased',
      price: '',
      tradeReason: '',
      rootInfo: '',
      leafInfo: '',
      clippingInfo: '',
      imageUrl: PlaceHolderImages[5].imageUrl,
    },
  });

  const acquisitionType = form.watch('acquisitionType');

  function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedImage = PlaceHolderImages.find(img => img.imageUrl === values.imageUrl);

    const newPlant: Plant = {
      id: new Date().getTime().toString(),
      name: values.name,
      acquisitionDate: new Date(values.acquisitionDate),
      acquisitionType: values.acquisitionType as AcquisitionType,
      imageUrl: values.imageUrl,
      imageHint: selectedImage ? selectedImage.imageHint : 'plant',
      isDeceased: false,
      price: values.acquisitionType === 'purchased' ? parseFloat(values.price!) : undefined,
      tradeReason: values.acquisitionType === 'traded' ? values.tradeReason : undefined,
      rootInfo: values.rootInfo,
      leafInfo: values.leafInfo,
      clippingInfo: values.clippingInfo,
    };
    onPlantAdd(newPlant);
    form.reset();
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] md:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a New Plant</DialogTitle>
          <DialogDescription>
            Fill in the details for your new plant companion.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monty the Monstera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acquisitionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plant image" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PlaceHolderImages.map((image) => (
                        <SelectItem key={image.id} value={image.imageUrl}>
                          {image.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acquisitionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>How did you get it?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="purchased" />
                        </FormControl>
                        <FormLabel className="font-normal">Purchased</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="gifted" />
                        </FormControl>
                        <FormLabel className="font-normal">Gifted</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="traded" />
                        </FormControl>
                        <FormLabel className="font-normal">Traded</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {acquisitionType === 'purchased' && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="25.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {acquisitionType === 'traded' && (
              <FormField
                control={form.control}
                name="tradeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traded for</FormLabel>
                    <FormControl>
                      <Input placeholder="A spider plant cutting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="rootInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Root Information</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes on the roots..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leafInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leaf Information</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes on the leaves..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clippingInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clipping Information</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes on clippings..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Plant</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
