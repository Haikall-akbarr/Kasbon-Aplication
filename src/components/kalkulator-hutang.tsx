// src/components/kalkulator-hutang.tsx
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
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
  deskripsi: z.string().optional(), // Add optional description field
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
      deskripsi: '', // Default description
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
      // Check if debt with the same name already exists and is not 'Lunas'
      const existingHutangIndex = daftarHutang.findIndex(
        (h) => h.nama.toLowerCase() === data.nama.toLowerCase() && h.status !== StatusHutang.LUNAS
      );

      if (existingHutangIndex !== -1) {
        // Update existing debt amount, date, status, and description
        setDaftarHutang((prev) =>
          prev.map((hutang, index) =>
            index === existingHutangIndex
              ? {
                  ...hutang,
                  nominal: hutang.nominal + data.nominal,
                  tanggal: data.tanggal, // Update tanggal to the new entry's date
                  status: data.status, // Update status to the new entry's status
                  // Update description: use new one if provided, otherwise keep old
                  deskripsi: data.deskripsi || hutang.deskripsi,
                }
              : hutang
          )
        );
        toast({
          title: 'Sukses',
          description: `Jumlah hutang untuk ${data.nama} berhasil diperbarui.`,
        });
      } else {
        // Add new debt with a unique ID
        const newHutang: Hutang = {
          ...data,
          id: new Date().getTime().toString(), // Simple unique ID generation
        };
        setDaftarHutang((prev) => [...prev, newHutang]);
        toast({ title: 'Sukses', description: 'Data hutang baru berhasil ditambahkan.' });
      }
    }
    form.reset({ // Reset form with default values
      nama: '',
      tanggal: new Date(),
      nominal: 0,
      status: StatusHutang.BELUM_LUNAS,
      deskripsi: '', // Reset description
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
      deskripsi: hutang.deskripsi || '', // Populate description
    });
  };

  const handleCancelEdit = () => {
     setEditingId(null);
     form.reset({ // Reset form to defaults
       nama: '',
       tanggal: new Date(),
       nominal: 0,
       status: StatusHutang.BELUM_LUNAS,
       deskripsi: '', // Reset description
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
        return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900';
      case StatusHutang.LUNAS_SEBAGIAN:
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900';
      case StatusHutang.BELUM_LUNAS:
        return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900';
      default:
        return 'text-foreground bg-background';
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-center text-primary-foreground bg-primary p-4 rounded-t-xl">
            📝 Kasbon temen Guweh
          </CardTitle>
          <CardDescription className="text-center pt-2 text-muted-foreground">
            Masukkan detail hutang Anda di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Apply items-start to the grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <FormField
                  control={form.control}
                  name="nama"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Budi Santoso" {...field} className="rounded-lg shadow-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tanggal"
                  render={({ field }) => (
                    <FormItem className="flex flex-col"> {/* Keep flex-col for label above button */}
                       <FormLabel>Tanggal</FormLabel>
                       <Popover>
                         <PopoverTrigger asChild>
                           <FormControl>
                             <Button
                               variant={'outline'}
                               className={cn(
                                 'w-full pl-3 text-left font-normal rounded-lg shadow-sm', // Removed justify-start, text-left handles it
                                 !field.value && 'text-muted-foreground'
                               )}
                             >
                               {field.value ? (
                                 format(field.value, 'PPP', { locale: id })
                               ) : (
                                 <span>Pilih tanggal</span>
                               )}
                               <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                             </Button>
                           </FormControl>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0 rounded-lg shadow-lg" align="start">
                           <Calendar
                             mode="single"
                             selected={field.value}
                             onSelect={field.onChange}
                             disabled={(date) =>
                               date > new Date() || date < new Date('1900-01-01')
                             }
                             initialFocus
                             locale={id}
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
                      <FormLabel>Nominal</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                             Rp
                           </span>
                           <Input
                              type="number"
                              placeholder="Contoh: 500000"
                              {...field}
                              className="pl-8 rounded-lg shadow-sm"
                           />
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
                          <SelectTrigger className="rounded-lg shadow-sm">
                            <SelectValue placeholder="Pilih status hutang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg shadow-lg">
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
                {/* Add Description Field */}
                 <FormField
                  control={form.control}
                  name="deskripsi"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2"> {/* Span across two columns on medium screens */}
                      <FormLabel>Deskripsi (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contoh: Pinjam buat makan siang, Beli jajan sore"
                          className="rounded-lg shadow-sm resize-none" // Added resize-none
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                 {editingId && (
                   <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-lg shadow-sm">
                     Batal
                   </Button>
                 )}
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-md">
                   {editingId ? <Edit2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingId ? 'Simpan Perubahan' : 'Tambah Hutang'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

       <Card className="shadow-lg rounded-xl">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-xl md:text-2xl font-semibold text-primary-foreground">Daftar Hutang</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="whitespace-nowrap">Nama</TableHead>
                   <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                   <TableHead className="whitespace-nowrap">Deskripsi</TableHead> {/* Add Description Header */}
                   <TableHead className="text-right whitespace-nowrap">Nominal</TableHead>
                   <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                   <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {daftarHutang.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center text-muted-foreground py-8"> {/* Updated colSpan to 6 */}
                       Belum ada data hutang.
                     </TableCell>
                   </TableRow>
                 ) : (
                   daftarHutang.map((hutang) => (
                     <TableRow key={hutang.id} className="hover:bg-muted/50 transition-colors duration-150">
                       <TableCell className="font-medium">{hutang.nama}</TableCell>
                       <TableCell>{format(new Date(hutang.tanggal), 'dd MMMM yyyy', { locale: id })}</TableCell>
                       <TableCell className="max-w-xs truncate text-muted-foreground">{hutang.deskripsi || '-'}</TableCell> {/* Add Description Cell */}
                       <TableCell className="text-right">{formatCurrency(hutang.nominal)}</TableCell>
                        <TableCell className="text-center">
                           <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-semibold shadow-sm",
                              getStatusClass(hutang.status)
                            )}>
                              {hutang.status}
                           </span>
                       </TableCell>
                       <TableCell className="text-right space-x-1">
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(hutang)} className="text-primary hover:text-primary/80 h-9 w-9 rounded-md shadow-sm hover:shadow-md transition-all">
                           <Edit2 className="h-4 w-4" />
                           <span className="sr-only">Edit</span>
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(hutang.id)} className="text-destructive hover:text-destructive/80 h-9 w-9 rounded-md shadow-sm hover:shadow-md transition-all">
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
         <CardFooter className="flex justify-end bg-secondary p-4 rounded-b-xl border-t border-border">
          <div className="text-lg md:text-xl font-bold text-secondary-foreground">
            Total Hutang (Belum Lunas/Sebagian): {formatCurrency(totalHutang)}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
