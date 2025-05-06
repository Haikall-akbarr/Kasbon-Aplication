// src/components/kalkulator-hutang.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, Edit2, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { PasswordDialog } from '@/components/password-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useGetHutangList,
  useAddHutang,
  useUpdateHutang,
  useDeleteHutang,
  findExistingHutangByName,
  type AddHutangInput,
  type UpdateHutangInput,
} from '@/hooks/useHutang';
import type { Hutang, StatusHutangValue } from '@/types/hutang';
import { StatusHutang } from '@/types/hutang';

// Define the Zod schema for form validation
const formSchema = z.object({
  nama: z.string().min(1, { message: 'Nama wajib diisi' }),
  tanggal: z.date({ required_error: 'Tanggal wajib diisi' }),
  nominal: z.coerce
    .number()
    .positive({ message: 'Nominal harus lebih dari 0' }),
  status: z.nativeEnum(StatusHutang),
  deskripsi: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PendingAction {
  type: 'add' | 'edit' | 'delete';
  data?: FormValues; // For add/edit
  id?: string;       // For edit/delete
}


export default function KalkulatorHutang() {
  const { data: daftarHutang = [], isLoading: isLoadingHutang, error: fetchError } = useGetHutangList();
  const addHutangMutation = useAddHutang();
  const updateHutangMutation = useUpdateHutang();
  const deleteHutangMutation = useDeleteHutang();

  const [totalHutang, setTotalHutang] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [initialDateSet, setInitialDateSet] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama: '',
      tanggal: new Date(), // Set to new Date() directly
      nominal: 0,
      status: StatusHutang.BELUM_LUNAS,
      deskripsi: '',
    },
  });

   useEffect(() => {
    // Set initial date only once if not editing and not already set
    if (!initialDateSet && !editingId) {
      const currentDateValue = form.getValues('tanggal');
      // Check if the date is a valid date object, otherwise set it.
      if (!(currentDateValue instanceof Date) || isNaN(currentDateValue.getTime())) {
        form.setValue('tanggal', new Date(), { shouldValidate: true, shouldDirty: true });
      }
      setInitialDateSet(true);
    }
  }, [form, editingId, initialDateSet]);


  const hitungTotalHutang = useCallback(() => {
    if (!daftarHutang) return;
    const total = daftarHutang.reduce((sum, hutang) => {
      return hutang.status !== StatusHutang.LUNAS ? sum + hutang.nominal : sum;
    }, 0);
    setTotalHutang(total);
  }, [daftarHutang]);

  useEffect(() => {
    hitungTotalHutang();
  }, [daftarHutang, hitungTotalHutang]);


  const executeAdd = async (data: FormValues) => {
    const existingHutang = findExistingHutangByName(daftarHutang, data.nama);

    try {
      if (existingHutang) {
        const updatePayload: UpdateHutangInput = {
          id: existingHutang.id,
          nominal: existingHutang.nominal + data.nominal,
          tanggal: data.tanggal, // Update tanggal to new entry's date
          status: data.status, // Update status to new entry's status
          deskripsi: data.deskripsi || existingHutang.deskripsi, // Update deskripsi
        };
        await updateHutangMutation.mutateAsync(updatePayload);
        toast({
          title: 'Sukses',
          description: `Jumlah hutang untuk ${data.nama} berhasil diperbarui.`,
        });
      } else {
        await addHutangMutation.mutateAsync(data as AddHutangInput);
        toast({ title: 'Sukses', description: 'Data hutang baru berhasil ditambahkan.' });
      }
      form.reset({
        nama: '',
        tanggal: new Date(),
        nominal: 0,
        status: StatusHutang.BELUM_LUNAS,
        deskripsi: '',
      });
      setInitialDateSet(false); // Reset for next new entry
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambahkan/memperbarui hutang.', variant: 'destructive' });
      console.error("Firebase add/update error:", error);
    }
  };

  const executeEdit = async (data: FormValues, id: string) => {
    try {
      const updatePayload: UpdateHutangInput = { id, ...data };
      await updateHutangMutation.mutateAsync(updatePayload);
      toast({ title: 'Sukses', description: 'Data hutang berhasil diperbarui.' });
      setEditingId(null);
      form.reset({
        nama: '',
        tanggal: new Date(),
        nominal: 0,
        status: StatusHutang.BELUM_LUNAS,
        deskripsi: '',
      });
      setInitialDateSet(false); // Reset for next new entry
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memperbarui hutang.', variant: 'destructive' });
      console.error("Firebase update error:", error);
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await deleteHutangMutation.mutateAsync(id);
      toast({
        title: 'Terhapus',
        description: 'Data hutang telah dihapus.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus hutang.', variant: 'destructive' });
      console.error("Firebase delete error:", error);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (editingId) {
      setPendingAction({ type: 'edit', data, id: editingId });
    } else {
      setPendingAction({ type: 'add', data });
    }
    setIsPasswordDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setPendingAction({ type: 'delete', id });
    setIsPasswordDialogOpen(true);
  };

  const handleEdit = (hutang: Hutang) => {
    setEditingId(hutang.id);
    form.reset({
      ...hutang,
      tanggal: new Date(hutang.tanggal), // Ensure date is a Date object
      deskripsi: hutang.deskripsi || '',
    });
    setInitialDateSet(true); // To prevent date reset by useEffect
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset({
      nama: '',
      tanggal: new Date(),
      nominal: 0,
      status: StatusHutang.BELUM_LUNAS,
      deskripsi: '',
    });
    setInitialDateSet(false); // Reset for next new entry
  };

  const handlePasswordConfirm = async () => {
    if (!pendingAction) return;

    setIsPasswordDialogOpen(false); // Close dialog immediately

    switch (pendingAction.type) {
      case 'add':
        if (pendingAction.data) await executeAdd(pendingAction.data);
        break;
      case 'edit':
        if (pendingAction.data && pendingAction.id) await executeEdit(pendingAction.data, pendingAction.id);
        break;
      case 'delete':
        if (pendingAction.id) await executeDelete(pendingAction.id);
        break;
    }
    setPendingAction(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  const isMutating = addHutangMutation.isPending || updateHutangMutation.isPending || deleteHutangMutation.isPending;

  if (fetchError) {
    return <div className="container mx-auto p-4 text-center text-destructive">Error memuat data: {(fetchError as Error).message}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="mb-8 shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold text-center text-primary-foreground bg-primary p-4 rounded-t-xl">
            📝 Kasbon temen Guweh
          </CardTitle>
          <CardDescription className="text-center pt-2 text-muted-foreground">
            Masukkan detail hutang Anda di bawah ini. Data akan disimpan online.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal rounded-lg shadow-sm',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value instanceof Date && !isNaN(field.value.getTime()) ? (
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
                            selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                 <FormField
                  control={form.control}
                  name="deskripsi"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Deskripsi (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contoh: Pinjam buat makan siang, Beli jajan sore"
                          className="rounded-lg shadow-sm resize-none"
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
                   <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-lg shadow-sm" disabled={isMutating}>
                     Batal Edit
                   </Button>
                 )}
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-md" disabled={isMutating}>
                   {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingId ? <Edit2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
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
                   <TableHead className="whitespace-nowrap">Deskripsi</TableHead>
                   <TableHead className="text-right whitespace-nowrap">Nominal</TableHead>
                   <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                   <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoadingHutang ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        Memuat data...
                      </TableCell>
                    </TableRow>
                 ) : daftarHutang.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                       Belum ada data hutang.
                     </TableCell>
                   </TableRow>
                 ) : (
                   daftarHutang.map((hutang) => (
                     <TableRow key={hutang.id} className="hover:bg-muted/50 transition-colors duration-150">
                       <TableCell className="font-medium">{hutang.nama}</TableCell>
                       <TableCell>{format(new Date(hutang.tanggal), 'dd MMMM yyyy', { locale: id })}</TableCell>
                       <TableCell className="max-w-xs truncate text-muted-foreground">{hutang.deskripsi || '-'}</TableCell>
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
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(hutang)} className="text-primary hover:text-primary/80 h-9 w-9 rounded-md shadow-sm hover:shadow-md transition-all" disabled={isMutating}>
                           <Edit2 className="h-4 w-4" />
                           <span className="sr-only">Edit</span>
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(hutang.id)} className="text-destructive hover:text-destructive/80 h-9 w-9 rounded-md shadow-sm hover:shadow-md transition-all" disabled={isMutating}>
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

       <PasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null); // Clear pending action if dialog is closed manually
          setIsPasswordDialogOpen(open);
        }}
        onConfirm={handlePasswordConfirm}
        isConfirming={isMutating}
      />
    </div>
  );
}
