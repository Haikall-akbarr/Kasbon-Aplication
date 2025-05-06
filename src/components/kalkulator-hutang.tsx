// src/components/kalkulator-hutang.tsx
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, Edit2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale'; // Import Indonesian locale

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Define the status options
const StatusHutang = {
  BELUM_LUNAS: 'Belum Lunas',
  LUNAS_SEBAGIAN: 'Lunas Sebagian',
  LUNAS: 'Lunas',
} as const;

type StatusHutangKey = keyof typeof StatusHutang;
type StatusHutangValue = (typeof StatusHutang)[StatusHutangKey];

// Define the Zod schema for form validation
const formSchema = z.object({
  id: z.string().optional(), // Optional for adding, required for editing
  nama: z.string().min(1, { message: 'Nama wajib diisi' }),
  tanggal: z.date({ required_error: 'Tanggal wajib diisi' }),
  nominal: z.coerce
    .number()
    .positive({ message: 'Nominal harus lebih dari 0' }),
  status: z.nativeEnum(StatusHutang),
});

type FormValues = z.infer<typeof formSchema>;

interface Hutang extends FormValues {
  id: string; // Make ID required for Hutang interface
}

export default function KalkulatorHutang() {
  const [daftarHutang, setDaftarHutang] = useState<Hutang[]>([]);
  const [totalHutang, setTotalHutang] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama: '',
      tanggal: new Date(),
      nominal: 0,
      status: StatusHutang.BELUM_LUNAS,
    },
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const storedHutang = localStorage.getItem('daftarHutang');
    if (storedHutang) {
      try {
        const parsedData = JSON.parse(storedHutang) as Hutang[];
        // Ensure dates are parsed correctly
        const validData = parsedData.map(h => ({
          ...h,
          tanggal: new Date(h.tanggal),
        }))
        setDaftarHutang(validData);
      } catch (error) {
        console.error("Failed to parse stored data:", error);
        localStorage.removeItem('daftarHutang'); // Clear invalid data
      }
    }
  }, []);

  // Save data to localStorage whenever daftarHutang changes
  useEffect(() => {
    localStorage.setItem('daftarHutang', JSON.stringify(daftarHutang));
    hitungTotalHutang();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarHutang]);

  // Calculate total debt whenever the list changes
   const hitungTotalHutang = () => {
    const total = daftarHutang.reduce((sum, hutang) => {
      // Only sum debts that are not fully paid
      return hutang.status !== StatusHutang.LUNAS ? sum + hutang.nominal : sum;
    }, 0);
    setTotalHutang(total);
  };


  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (editingId) {
      // Update existing debt
      setDaftarHutang((prev) =>
        prev.map((hutang) =>
          hutang.id === editingId ? { ...data, id: editingId } : hutang
        )
      );
      toast({ title: 'Sukses', description: 'Data hutang berhasil diperbarui.' });
      setEditingId(null); // Exit editing mode
    } else {
      // Add new debt with a unique ID
      const newHutang: Hutang = {
        ...data,
        id: new Date().getTime().toString(), // Simple unique ID generation
      };
      setDaftarHutang((prev) => [...prev, newHutang]);
      toast({ title: 'Sukses', description: 'Data hutang baru berhasil ditambahkan.' });
    }
    form.reset({ // Reset form with default values
      nama: '',
      tanggal: new Date(),
      nominal: 0,
      status: StatusHutang.BELUM_LUNAS,
    });
  };

  const handleDelete = (id: string) => {
    setDaftarHutang((prev) => prev.filter((hutang) => hutang.id !== id));
     toast({
      title: 'Terhapus',
      description: 'Data hutang telah dihapus.',
      variant: 'destructive',
    });
  };

  const handleEdit = (hutang: Hutang) => {
    setEditingId(hutang.id);
    form.reset({ // Populate form with existing data
      ...hutang,
      tanggal: new Date(hutang.tanggal), // Ensure date is a Date object
    });
  };

  const handleCancelEdit = () => {
     setEditingId(null);
     form.reset({ // Reset form to defaults
       nama: '',
       tanggal: new Date(),
       nominal: 0,
       status: StatusHutang.BELUM_LUNAS,
     });
   };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0, // Remove decimal places
    }).format(amount);
  };

  // Get status color
 const getStatusClass = (status: StatusHutangValue) => {
    switch (status) {
      case StatusHutang.LUNAS:
        return 'text-green-600 bg-green-100'; // Using direct Tailwind class for green
      case StatusHutang.LUNAS_SEBAGIAN:
        return 'text-yellow-600 bg-yellow-100'; // Direct Tailwind for yellow
      case StatusHutang.BELUM_LUNAS:
        return 'text-red-600 bg-red-100'; // Direct Tailwind for red
      default:
        return 'text-foreground bg-background';
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-center text-primary-foreground bg-primary p-4 rounded-t-lg">
            📝 Kalkulator Hutang
          </CardTitle>
          <CardDescription className="text-center pt-2 text-muted-foreground">
            Masukkan detail hutang Anda di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nama"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama (Pemberi/Peminjam)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Budi Santoso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tanggal"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                       <FormLabel>Tanggal</FormLabel>
                       <Popover>
                         <PopoverTrigger asChild>
                           <FormControl>
                             <Button
                               variant={'outline'}
                               className={cn(
                                 'w-full pl-3 text-left font-normal',
                                 !field.value && 'text-muted-foreground'
                               )}
                             >
                               {field.value ? (
                                 format(field.value, 'PPP', { locale: id }) // Use Indonesian locale
                               ) : (
                                 <span>Pilih tanggal</span>
                               )}
                               <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                             </Button>
                           </FormControl>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <Calendar
                             mode="single"
                             selected={field.value}
                             onSelect={field.onChange}
                             disabled={(date) =>
                               date > new Date() || date < new Date('1900-01-01')
                             }
                             initialFocus
                             locale={id} // Use Indonesian locale
                           />
                         </PopoverContent>
                       </Popover>
                       <FormMessage />
                     </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nominal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominal (Rp)</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                           <Input type="number" placeholder="Contoh: 500000" {...field} className="pl-8"/>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status hutang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(StatusHutang).map(([key, value]) => (
                             <SelectItem key={key} value={value}>
                               {value}
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                 {editingId && (
                   <Button type="button" variant="outline" onClick={handleCancelEdit}>
                     Batal
                   </Button>
                 )}
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                   {editingId ? <Edit2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingId ? 'Simpan Perubahan' : 'Tambah Hutang'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-semibold">Daftar Hutang</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Nama</TableHead>
                   <TableHead>Tanggal</TableHead>
                   <TableHead className="text-right">Nominal</TableHead>
                   <TableHead className="text-center">Status</TableHead>
                   <TableHead className="text-right">Aksi</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {daftarHutang.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                       Belum ada data hutang.
                     </TableCell>
                   </TableRow>
                 ) : (
                   daftarHutang.map((hutang) => (
                     <TableRow key={hutang.id}>
                       <TableCell className="font-medium">{hutang.nama}</TableCell>
                       <TableCell>{format(new Date(hutang.tanggal), 'dd MMMM yyyy', { locale: id })}</TableCell>
                       <TableCell className="text-right">{formatCurrency(hutang.nominal)}</TableCell>
                        <TableCell className="text-center">
                           <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              getStatusClass(hutang.status)
                            )}>
                              {hutang.status}
                           </span>
                       </TableCell>
                       <TableCell className="text-right space-x-1">
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(hutang)} className="text-blue-500 hover:text-blue-700 h-8 w-8">
                           <Edit2 className="h-4 w-4" />
                           <span className="sr-only">Edit</span>
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(hutang.id)} className="text-red-500 hover:text-red-700 h-8 w-8">
                           <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Hapus</span>
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </div>
        </CardContent>
         <CardFooter className="flex justify-end bg-secondary p-4 rounded-b-lg">
          <div className="text-lg md:text-xl font-bold text-secondary-foreground">
            Total Hutang (Belum Lunas/Sebagian): {formatCurrency(totalHutang)}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}