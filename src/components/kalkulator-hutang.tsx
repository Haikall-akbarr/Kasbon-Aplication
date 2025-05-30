
// src/components/kalkulator-hutang.tsx
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, Trash2, Edit2, Loader2, ImageUp, XCircle, Eye, ListChecks, CreditCard, Info, AlertTriangle, UserCircle, Camera, ImagesIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
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
import { Badge } from '@/components/ui/badge';


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
  fotoDataUris: z.array(z.string()).optional(), // Array of data URIs for images
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
  const [initialDate, setInitialDate] = useState<Date | undefined>(new Date()); // Initialize with current date
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImagesForView, setSelectedImagesForView] = useState<string[] | null>(null);
  const [initialImageIndex, setInitialImageIndex] = useState<number>(0);
  const [isImageViewDialogOpen, setIsImageViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const defaultFormValues = useMemo(() => ({
    nama: '',
    tanggal: new Date(),
    nominal: 0,
    status: StatusHutang.BELUM_LUNAS,
    deskripsi: '',
    fotoDataUris: [],
  }), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });
  const { setValue, getValues, control, reset, formState, watch } = form;

  const currentFotoDataUris = watch('fotoDataUris');

   useEffect(() => {
    if (!editingId) {
        const today = new Date();
        // Only update initialDate if it's not already today or if form is being reset
        if (!initialDate || initialDate.toDateString() !== today.toDateString()) {
             setInitialDate(today);
        }
        const currentFormTanggal = getValues('tanggal');
        // Set form date only if it's not a valid date or not today
        if (!(currentFormTanggal instanceof Date) || isNaN(currentFormTanggal.getTime()) || currentFormTanggal.toDateString() !== today.toDateString()) {
            setValue('tanggal', today, { shouldValidate: true, shouldDirty: false });
        }
    } else {
        // When editing, set initialDate from the item being edited
        const hutangToEdit = daftarHutang.find(h => h.id === editingId);
        if (hutangToEdit) {
            const editDate = new Date(hutangToEdit.tanggal);
            if (!initialDate || initialDate.getTime() !== editDate.getTime()) {
                 setInitialDate(editDate);
            }
             // Ensure form value is also set, as defaultValues might not run if form is already initialized
            if (getValues('tanggal').getTime() !== editDate.getTime()){
                setValue('tanggal', editDate, { shouldValidate: true, shouldDirty: true });
            }
            setImagePreviews(hutangToEdit.fotoDataUris || []);
        }
    }
  }, [editingId, daftarHutang, getValues, setValue, initialDate]);


  useEffect(() => {
    setImagePreviews(currentFotoDataUris || []);
  }, [currentFotoDataUris]);


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

  const resetFormAndState = useCallback(() => {
    const today = new Date();
    reset(defaultFormValues); // Reset with memoized default values
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setInitialDate(today); // Explicitly set initialDate to today after reset
    setValue('tanggal', today, { shouldValidate: true, shouldDirty: false }); // Ensure form field is also today
  }, [reset, defaultFormValues, setValue]);


  const executeAdd = async (data: FormValues) => {
    const existingHutang = findExistingHutangByName(daftarHutang, data.nama);
    let finalFotoDataUris = data.fotoDataUris || [];


    try {
      if (existingHutang && existingHutang.id) {
        // If adding and name exists, it's an update (payment or adding more debt)
        let newNominal: number;
        let newStatus: StatusHutangValue;
        let toastMessage: string;

        // Combine photos: existing + new, avoid duplicates if any (simple concat for now)
        const combinedFotoDataUris = Array.from(new Set([
          ...(existingHutang.fotoDataUris || []),
          ...(data.fotoDataUris || [])
        ]));

        if (data.status === StatusHutang.LUNAS) { // Treat as payment
          newNominal = Math.max(0, existingHutang.nominal - data.nominal);
          newStatus = newNominal <= 0 ? StatusHutang.LUNAS : StatusHutang.BELUM_LUNAS; 
          toastMessage = `Pembayaran untuk ${data.nama} berhasil dicatat. Saldo hutang diperbarui.`;
          if (newStatus === StatusHutang.LUNAS) {
            toastMessage = `Hutang untuk ${data.nama} telah lunas.`;
          }
        } else { // Treat as adding more debt (or changing status from LUNAS to BELUM_LUNAS/LUNAS_SEBAGIAN with the same/new nominal)
          newNominal = existingHutang.nominal + data.nominal;
          newStatus = StatusHutang.BELUM_LUNAS; 
          toastMessage = `Tambahan hutang untuk ${data.nama} berhasil dicatat. Saldo hutang diperbarui.`;
        }

        const updatePayload: UpdateHutangInput = {
          id: existingHutang.id,
          nama: existingHutang.nama, 
          nominal: newNominal,
          tanggal: data.tanggal, 
          status: newStatus,
          deskripsi: `${existingHutang.deskripsi || ''}${existingHutang.deskripsi && data.deskripsi ? '; ' : ''}${data.deskripsi || ''}`.trim(),
          fotoDataUris: combinedFotoDataUris.length > 0 ? combinedFotoDataUris : null,
        };
        await updateHutangMutation.mutateAsync(updatePayload);
        toast({
          title: 'Sukses',
          description: toastMessage,
          variant: 'success',
        });

      } else {
        const addPayload: AddHutangInput = {
          ...data,
          fotoDataUris: finalFotoDataUris.length > 0 ? finalFotoDataUris : [],
        };
        await addHutangMutation.mutateAsync(addPayload);
        toast({ title: 'Sukses', description: 'Data hutang baru berhasil ditambahkan.', variant: 'success' });
      }
      resetFormAndState();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambahkan/memperbarui hutang.', variant: 'destructive' });
      console.error("RTDB add/update error:", error);
    }
  };

  const executeEdit = async (data: FormValues, id: string) => {
    try {
      const updatePayload: UpdateHutangInput = {
        id,
        ...data,
        fotoDataUris: (data.fotoDataUris && data.fotoDataUris.length > 0) ? data.fotoDataUris : null,
      };
      await updateHutangMutation.mutateAsync(updatePayload);
      toast({ title: 'Sukses', description: 'Data hutang berhasil diperbarui.', variant: 'success' });
      setEditingId(null);
      resetFormAndState();
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
      nominal: String(hutang.nominal) as any, 
      fotoDataUris: hutang.fotoDataUris || [],
    });
    setImagePreviews(hutang.fotoDataUris || []); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetFormAndState();
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFotoDataUris: string[] = [...(getValues('fotoDataUris') || [])];
      let hasError = false;

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit per file
          toast({
            title: "Ukuran File Terlalu Besar",
            description: `File "${file.name}" melebihi 5MB.`,
            variant: "destructive",
          });
          hasError = true;
          continue; 
        }
        try {
          const dataUri = await readFileAsDataURL(file);
          newFotoDataUris.push(dataUri);
        } catch (error) {
          console.error("Error reading file:", error);
          toast({
            title: "Gagal Membaca File",
            description: `Tidak dapat membaca file "${file.name}".`,
            variant: "destructive",
          });
          hasError = true;
        }
      }
      
      form.setValue('fotoDataUris', newFotoDataUris, { shouldValidate: true, shouldDirty: true });
      if (fileInputRef.current && hasError) {
        fileInputRef.current.value = ""; 
      } else if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImagePreview = (indexToRemove: number) => {
    const currentUris = getValues('fotoDataUris') || [];
    const updatedUris = currentUris.filter((_, index) => index !== indexToRemove);
    form.setValue('fotoDataUris', updatedUris, { shouldValidate: true, shouldDirty: true });
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
        return 'bg-green-600 text-green-50 border-green-700';
      case StatusHutang.LUNAS_SEBAGIAN:
        return 'bg-yellow-500 text-yellow-50 border-yellow-600';
      case StatusHutang.BELUM_LUNAS:
        return 'bg-red-600 text-red-50 border-red-700';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };
  const getStatusIcon = (status: StatusHutangValue) => {
    switch (status) {
      case StatusHutang.LUNAS:
        return <ListChecks className="h-4 w-4 mr-1.5" />;
      case StatusHutang.LUNAS_SEBAGIAN:
        return <CreditCard className="h-4 w-4 mr-1.5" />;
      case StatusHutang.BELUM_LUNAS:
        return <AlertTriangle className="h-4 w-4 mr-1.5" />;
      default:
        return <Info className="h-4 w-4 mr-1.5" />;
    }
  };


  const handleViewImage = (imageUrls: string[], startIndex: number = 0) => {
    setSelectedImagesForView(imageUrls);
    setInitialImageIndex(startIndex);
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
                  control={control}
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
                  control={control}
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
                  control={control}
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
                              value={ (value === 0 && !formState.dirtyFields.nominal && !editingId && typeof value === 'number')
                                      ? ''
                                      : typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''),10).toLocaleString('id-ID') : (typeof value === 'number' ? value.toLocaleString('id-ID') : '')
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
                  control={control}
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
                  control={control}
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
                  control={control}
                  name="fotoDataUris"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-foreground/90">Foto (Opsional, Max 5MB per file)</FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-start gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="rounded-lg shadow-inner bg-background/70 border-border/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/80 file:text-primary-foreground hover:file:bg-primary cursor-pointer focus:border-accent focus:ring-accent"
                          />
                          {imagePreviews && imagePreviews.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-3">
                              {imagePreviews.map((previewUrl, index) => (
                                <div key={index} className="p-2 border border-border/50 rounded-lg shadow-sm bg-background/50 relative group">
                                  <img src={previewUrl} alt={`Pratinjau ${index + 1}`} className="h-24 w-24 object-cover rounded-md" data-ai-hint="preview image" />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeImagePreview(index)}
                                    className="absolute top-1 right-1 bg-card/70 hover:bg-destructive/80 hover:text-destructive-foreground text-destructive h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span className="sr-only">Hapus Gambar</span>
                                  </Button>
                                </div>
                              ))}
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
                   <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-lg shadow-md border-border/50 hover:border-accent hover:text-accent text-yellow-600 border-yellow-500 hover:bg-yellow-100 hover:text-yellow-700 dark:text-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-700 dark:hover:text-yellow-50" disabled={isMutating}>
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
        <CardContent className="p-4 md:p-6">
          {isLoadingHutang ? (
            <div className="text-center text-muted-foreground py-12">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg">Memuat data hutang...</p>
            </div>
          ) : daftarHutang.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <ImagesIcon className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" /> 
              <p className="text-xl font-medium">Belum ada data hutang.</p>
              <p className="text-sm">Silakan tambahkan hutang baru menggunakan form di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {daftarHutang.map((hutang) => (
                <Card key={hutang.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg bg-background/70 border-border/50">
                  <CardHeader className="p-4 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold text-foreground truncate" title={hutang.nama}>
                        <UserCircle className="inline-block h-5 w-5 mr-2 text-primary" />
                        {hutang.nama}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-full flex items-center whitespace-nowrap",
                          getStatusClass(hutang.status)
                        )}
                      >
                        {getStatusIcon(hutang.status)}
                        {hutang.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground pt-1">
                      {hutang.tanggal instanceof Date && !isNaN(hutang.tanggal.getTime()) ? format(hutang.tanggal, 'dd MMMM yyyy, HH:mm', { locale: id }) : 'Invalid Date'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow space-y-3">
                    {hutang.fotoDataUris && hutang.fotoDataUris.length > 0 ? (
                      <div 
                        className="relative group cursor-pointer aspect-video rounded-md overflow-hidden shadow-md border border-border/20" 
                        onClick={() => hutang.fotoDataUris && handleViewImage(hutang.fotoDataUris, 0)}
                      >
                        <img src={hutang.fotoDataUris[0]} alt={`Foto ${hutang.nama} 1`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint="debt item image"/>
                        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                          <Eye className="h-8 w-8 text-white" />
                          {hutang.fotoDataUris.length > 1 && (
                            <span className="text-xs text-white mt-1 bg-black/50 px-1.5 py-0.5 rounded-full">{hutang.fotoDataUris.length} foto</span>
                          )}
                        </div>
                      </div>
                    ) : (
                         <div className="aspect-video bg-muted/40 rounded-md flex items-center justify-center shadow-sm border border-border/20">
                           <ImageUp className="h-12 w-12 text-muted-foreground/50" />
                         </div>
                    )}
                     <div className="space-y-1">
                        <p className="text-2xl font-bold text-accent text-right">{formatCurrency(hutang.nominal)}</p>
                        {hutang.deskripsi && (
                           <p className="text-sm text-muted-foreground line-clamp-2" title={hutang.deskripsi}>
                             <strong>Deskripsi:</strong> {hutang.deskripsi}
                           </p>
                        )}
                        {!hutang.deskripsi && (
                            <p className="text-sm text-muted-foreground italic">Tidak ada deskripsi.</p>
                        )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 border-t border-border/30 bg-muted/20">
                    <div className="flex w-full justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(hutang)} className="text-yellow-600 border-yellow-500 hover:bg-yellow-100 hover:text-yellow-700 dark:text-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-700 dark:hover:text-yellow-50 rounded-md shadow-sm hover:shadow-md transition-all disabled:opacity-50" disabled={isMutating}>
                        <Edit2 className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(hutang.id)} className="bg-red-600 hover:bg-red-700 text-red-50 rounded-md shadow-sm hover:shadow-md transition-all disabled:opacity-50" disabled={isMutating}>
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Hapus
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
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

      {selectedImagesForView && selectedImagesForView.length > 0 && (
        <Dialog open={isImageViewDialogOpen} onOpenChange={setIsImageViewDialogOpen}>
          <DialogContent className="max-w-3xl p-2 sm:p-4 border-none shadow-xl rounded-xl overflow-hidden bg-background/90 backdrop-blur-md">
            <DialogHeader className="p-1 absolute top-1 right-1 z-10">
               <DialogTitle className="sr-only">Pratinjau Gambar</DialogTitle>
               <DialogClose asChild>
                <Button size="icon" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-8 w-8 sm:h-9 sm:w-9">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="sr-only">Tutup</span>
                </Button>
              </DialogClose>
            </DialogHeader>
            <Carousel
                opts={{
                    startIndex: initialImageIndex,
                    loop: selectedImagesForView.length > 1,
                }}
                className="w-full max-w-full"
            >
                <CarouselContent className="-ml-2 sm:-ml-4">
                    {selectedImagesForView.map((imageUrl, index) => (
                        <CarouselItem key={index} className="pl-2 sm:pl-4">
                            <div className="flex justify-center items-center max-h-[70vh] sm:max-h-[80vh] p-2 sm:p-4">
                                <img
                                    src={imageUrl}
                                    alt={`Pratinjau Gambar ${index + 1}`}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                    data-ai-hint="enlarged image"
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {selectedImagesForView.length > 1 && (
                    <>
                        <CarouselPrevious className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-12 sm:w-12 bg-black/30 hover:bg-black/50 text-white border-none" />
                        <CarouselNext className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-12 sm:w-12 bg-black/30 hover:bg-black/50 text-white border-none" />
                    </>
                )}
            </Carousel>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

