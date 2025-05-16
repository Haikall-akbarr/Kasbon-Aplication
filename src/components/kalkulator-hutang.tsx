
// src/components/kalkulator-hutang.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, Edit2, Loader2, ImageUp, XCircle, Eye } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useHutang,
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
  nominal: z.string()
    .min(1, { message: 'Nominal wajib diisi' })
    .transform((val, ctx) => {
      const sanitized = val.replace(/[^0-9]/g, '');
      if (sanitized === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nominal tidak boleh kosong setelah pembersihan.",
        });
        return z.NEVER;
      }
      const num = parseInt(sanitized, 10);
      if (isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nominal harus berupa angka.",
        });
        return z.NEVER;
      }
      if (num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nominal harus lebih dari 0',
        });
        return z.NEVER;
      }
      return num;
    }),
  status: z.nativeEnum(StatusHutang),
  deskripsi: z.string().optional(),
  fotoDataUri: z.string().optional(), // Untuk menyimpan data URI gambar
});

type FormValues = z.infer<typeof formSchema>;

interface PendingAction {
  type: 'add' | 'edit' | 'delete';
  data?: FormValues;
  id?: string;
}


export default function KalkulatorHutang() {
  const { data: daftarHutang = [], isLoading: isLoadingHutang, error: fetchError } = useHutang();
  const addHutangMutation = useAddHutang();
  const updateHutangMutation = useUpdateHutang();
  const deleteHutangMutation = useDeleteHutang();

  const [totalHutang, setTotalHutang] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageForView, setSelectedImageForView] = useState<string | null>(null);
  const [isImageViewDialogOpen, setIsImageViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama: '',
      tanggal: new Date(),
      nominal: 0,
      status: StatusHutang.BELUM_LUNAS,
      deskripsi: '',
      fotoDataUri: undefined,
    },
  });

   useEffect(() => {
    // Set initial date for new entries or when editing
    if (!editingId) {
        const today = new Date();
        if (!form.getValues('tanggal') || form.getValues('tanggal').getTime() !== today.getTime()) {
            form.setValue('tanggal', today, { shouldValidate: true, shouldDirty: false });
        }
        setInitialDate(today);
    } else {
        const hutangToEdit = daftarHutang.find(h => h.id === editingId);
        if (hutangToEdit) {
            const editDate = new Date(hutangToEdit.tanggal);
            setInitialDate(editDate);
            setImagePreview(hutangToEdit.fotoDataUri || null);
            // form.setValue('tanggal', editDate, { shouldValidate: true, shouldDirty: true }); // Already set in handleEdit
        }
    }
  }, [form, editingId, daftarHutang]);


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
    const finalFotoDataUri = data.fotoDataUri || (existingHutang ? existingHutang.fotoDataUri : undefined);

    try {
      if (existingHutang && existingHutang.id) {
        const updatePayload: UpdateHutangInput = {
          id: existingHutang.id,
          nominal: existingHutang.nominal + data.nominal, 
          tanggal: data.tanggal,
          status: data.status, 
          deskripsi: `${existingHutang.deskripsi || ''}${existingHutang.deskripsi && data.deskripsi ? '; ' : ''}${data.deskripsi || ''}`.trim(),
          fotoDataUri: finalFotoDataUri,
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
        fotoDataUri: undefined,
      });
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setInitialDate(new Date()); 
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambahkan/memperbarui hutang.', variant: 'destructive' });
      console.error("RTDB add/update error:", error);
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
        fotoDataUri: undefined,
      });
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setInitialDate(new Date());
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memperbarui hutang.', variant: 'destructive' });
      console.error("RTDB update error:", error);
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
      console.error("RTDB delete error:", error);
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
      tanggal: new Date(hutang.tanggal),
      deskripsi: hutang.deskripsi || '',
      nominal: hutang.nominal,
      fotoDataUri: hutang.fotoDataUri || undefined,
    });
    setImagePreview(hutang.fotoDataUri || null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset({
      nama: '',
      tanggal: new Date(), 
      nominal: 0, 
      status: StatusHutang.BELUM_LUNAS,
      deskripsi: '',
      fotoDataUri: undefined,
    });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setInitialDate(new Date());
  };

  const handlePasswordConfirm = async () => {
    if (!pendingAction) return;

    setIsPasswordDialogOpen(false);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Batas 5MB
        toast({
          title: "Ukuran File Terlalu Besar",
          description: "Ukuran file maksimal adalah 5MB.",
          variant: "destructive",
        });
        if(fileInputRef.current) fileInputRef.current.value = ""; 
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        form.setValue('fotoDataUri', dataUri, { shouldValidate: true, shouldDirty: true });
        setImagePreview(dataUri);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('fotoDataUri', undefined, { shouldValidate: true, shouldDirty: true });
      setImagePreview(null);
    }
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

  const handleViewImage = (imageUrl: string) => {
    setSelectedImageForView(imageUrl);
    setIsImageViewDialogOpen(true);
  };

  const isMutating = addHutangMutation.isPending || updateHutangMutation.isPending || deleteHutangMutation.isPending;

  if (fetchError) {
    return <div className="container mx-auto p-4 text-center text-destructive">Error memuat data: {(fetchError as Error).message}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gradient-to-br from-background to-secondary/30 min-h-screen">
      <Card className="mb-8 shadow-2xl rounded-xl overflow-hidden border-none bg-card/80 backdrop-blur-sm">
        <CardHeader className="bg-primary/80 p-6 rounded-t-xl border-b border-border/20">
          <CardTitle className="text-3xl md:text-4xl font-bold text-center text-primary-foreground drop-shadow-md">
            📝 Kasbon temen Guweh
          </CardTitle>
          <CardDescription className="text-center pt-2 text-primary-foreground/90 text-sm">
            Masukkan detail hutang Anda di bawah ini. Data akan disimpan online.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 p-4 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 items-start">
                <FormField
                  control={form.control}
                  name="nama"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground/90">Nama</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Budi Santoso" {...field} className="rounded-lg shadow-inner bg-background/70 border-border/50 focus:border-accent focus:ring-accent" />
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
                      <FormLabel className="font-semibold text-foreground/90">Tanggal</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal rounded-lg shadow-inner bg-background/70 border-border/50 hover:border-accent focus:border-accent focus:ring-accent',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {(field.value instanceof Date && !isNaN(field.value.getTime())) ? (
                                format(field.value, 'PPP', { locale: id })
                              ) : initialDate ? (
                                format(initialDate, 'PPP', { locale: id })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-lg shadow-xl border-border/50 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : initialDate}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setInitialDate(date);
                              }
                            }}
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
                  render={({ field: { onChange, value, ...restField } }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground/90">Nominal</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                             Rp
                           </span>
                           <Input
                              type="text" 
                              inputMode="numeric" 
                              placeholder="Contoh: 50000"
                              value={ (value === 0 && !form.formState.dirtyFields.nominal && !editingId)
                                      ? ''
                                      : typeof value === 'number' ? value.toLocaleString('id-ID') : value
                                    }
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                onChange(rawValue);
                              }}
                              {...restField}
                              className="pl-8 rounded-lg shadow-inner bg-background/70 border-border/50 focus:border-accent focus:ring-accent"
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
                      <FormLabel className="font-semibold text-foreground/90">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg shadow-inner bg-background/70 border-border/50 focus:border-accent focus:ring-accent">
                            <SelectValue placeholder="Pilih status hutang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg shadow-xl border-border/50 bg-popover">
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
                      <FormLabel className="font-semibold text-foreground/90">Deskripsi (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Contoh: Pinjam buat makan siang, Beli jajan sore"
                          className="rounded-lg shadow-inner resize-none bg-background/70 border-border/50 focus:border-accent focus:ring-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fotoDataUri"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-foreground/90">Foto (Opsional, Max 5MB)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-start gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="rounded-lg shadow-inner bg-background/70 border-border/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/80 file:text-primary-foreground hover:file:bg-primary cursor-pointer focus:border-accent focus:ring-accent"
                          />
                          {imagePreview && (
                            <div className="mt-2 p-2 border border-border/50 rounded-lg shadow-sm bg-background/50 relative group">
                              <img src={imagePreview} alt="Pratinjau Gambar" className="h-32 w-32 object-cover rounded-md" />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  form.setValue('fotoDataUri', undefined, { shouldValidate: true, shouldDirty: true });
                                  setImagePreview(null);
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="absolute top-1 right-1 bg-card/70 hover:bg-destructive/80 hover:text-destructive-foreground text-destructive h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="h-5 w-5" />
                                <span className="sr-only">Hapus Gambar</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                 {editingId && (
                   <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-lg shadow-md border-border/50 hover:border-accent hover:text-accent" disabled={isMutating}>
                     Batal Edit
                   </Button>
                 )}
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-lg transition-transform duration-150 ease-in-out hover:scale-105 active:scale-95" disabled={isMutating}>
                   {isMutating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (editingId ? <Edit2 className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />)}
                  {editingId ? 'Simpan Perubahan' : 'Tambah Hutang'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

       <Card className="shadow-2xl rounded-xl overflow-hidden border-none bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border/20 p-4 md:p-6 bg-secondary/30">
          <CardTitle className="text-2xl md:text-3xl font-semibold text-secondary-foreground drop-shadow-sm">Daftar Hutang</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
             <Table>
               <TableHeader className="bg-muted/30">
                 <TableRow className="border-b-border/30">
                   <TableHead className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">Foto</TableHead>
                   <TableHead className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">Nama</TableHead>
                   <TableHead className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">Tanggal</TableHead>
                   <TableHead className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">Deskripsi</TableHead>
                   <TableHead className="text-right whitespace-nowrap px-4 py-3 font-semibold text-muted-foreground">Nominal</TableHead>
                   <TableHead className="text-center whitespace-nowrap px-4 py-3 font-semibold text-muted-foreground">Status</TableHead>
                   <TableHead className="text-right whitespace-nowrap px-4 py-3 font-semibold text-muted-foreground">Aksi</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoadingHutang ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                        <p className="mt-2">Memuat data...</p>
                      </TableCell>
                    </TableRow>
                 ) : daftarHutang.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                       <ImageUp className="mx-auto h-12 w-12 text-muted-foreground/70 mb-2" />
                       Belum ada data hutang. <br/> Silakan tambahkan hutang baru di atas.
                     </TableCell>
                   </TableRow>
                 ) : (
                   daftarHutang.map((hutang) => (
                     <TableRow key={hutang.id} className="hover:bg-muted/50 transition-colors duration-150 ease-in-out even:bg-background/30 dark:even:bg-muted/10 border-b-border/20">
                       <TableCell className="px-4 py-3">
                         {hutang.fotoDataUri ? (
                           <div className="relative group cursor-pointer" onClick={() => handleViewImage(hutang.fotoDataUri!)}>
                             <img src={hutang.fotoDataUri} alt={`Foto ${hutang.nama}`} className="h-16 w-16 object-cover rounded-md shadow-md border border-border/20" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                           </div>
                         ) : (
                           <div className="h-16 w-16 bg-muted/40 rounded-md flex items-center justify-center shadow-sm border border-border/20">
                             <ImageUp className="h-8 w-8 text-muted-foreground/50" />
                           </div>
                         )}
                       </TableCell>
                       <TableCell className="font-medium px-4 py-3 text-foreground/90">{hutang.nama}</TableCell>
                       <TableCell className="px-4 py-3 text-foreground/80">{hutang.tanggal instanceof Date && !isNaN(hutang.tanggal.getTime()) ? format(hutang.tanggal, 'dd MMMM yyyy', { locale: id }) : 'Invalid Date'}</TableCell>
                       <TableCell className="max-w-xs truncate text-muted-foreground px-4 py-3">{hutang.deskripsi || '-'}</TableCell>
                       <TableCell className="text-right px-4 py-3 font-medium text-foreground/90">{formatCurrency(hutang.nominal)}</TableCell>
                        <TableCell className="text-center px-4 py-3">
                           <span className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border border-opacity-30",
                              getStatusClass(hutang.status)
                            )}>
                              {hutang.status}
                           </span>
                       </TableCell>
                       <TableCell className="text-right space-x-1 px-4 py-3">
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(hutang)} className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 h-9 w-9 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50" disabled={isMutating}>
                           <Edit2 className="h-4 w-4" />
                           <span className="sr-only">Edit</span>
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDelete(hutang.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-9 w-9 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50" disabled={isMutating}>
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
         <CardFooter className="flex justify-end bg-secondary/50 p-4 md:p-6 rounded-b-xl border-t border-border/20 mt-0">
          <div className="text-lg md:text-xl font-bold text-secondary-foreground drop-shadow-sm">
            Total Hutang (Belum/Sebagian Lunas): {formatCurrency(totalHutang)}
          </div>
        </CardFooter>
      </Card>

       <PasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
          setIsPasswordDialogOpen(open);
        }}
        onConfirm={handlePasswordConfirm}
        isConfirming={isMutating}
      />

      {selectedImageForView && (
        <Dialog open={isImageViewDialogOpen} onOpenChange={setIsImageViewDialogOpen}>
          <DialogContent className="max-w-3xl p-0 border-none shadow-xl rounded-xl overflow-hidden bg-background/90 backdrop-blur-md">
            <DialogHeader className="p-2 absolute top-0 right-0 z-10">
               <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-background/70 rounded-full h-9 w-9">
                  <XCircle className="h-6 w-6" />
                  <span className="sr-only">Tutup</span>
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="flex justify-center items-center max-h-[80vh] p-4 md:p-8">
              <img
                src={selectedImageForView}
                alt="Pratinjau Gambar Diperbesar"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    