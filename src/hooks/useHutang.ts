
import {
  rtdb,
  ref,
  onValue,
  push,
  update as rtdbUpdate,
  remove as rtdbRemove,
  serverTimestamp,
  child,
  orderByChild,
  rtdbQuery,
} from '@/lib/firebase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Hutang, HutangDocument, StatusHutangValue } from '@/types/hutang';
import { StatusHutang } from '@/types/hutang';


// Firebase Realtime Database path
const HUTANG_PATH = 'hutang';
export const HUTANG_QUERY_KEY = 'hutang_rtdb';

// Function to fetch hutang data from Realtime Database
export function useHutang() {
  return useQuery({
    queryKey: [HUTANG_QUERY_KEY],
    queryFn: () =>
      new Promise<Hutang[]>((resolve, reject) => {
        const hutangRef = ref(rtdb, HUTANG_PATH);
        const queryRef = rtdbQuery(hutangRef, orderByChild('tanggal'));

        return onValue(
          queryRef,
          (snapshot) => {
            const data = snapshot.val();
            if (data) {
              const hutangList: Hutang[] = Object.entries(data).map(
                ([id, docData]) => {
                  const hutangDoc = docData as HutangDocument;
                  return {
                    id,
                    nama: hutangDoc.nama,
                    tanggal: new Date(hutangDoc.tanggal),
                    nominal: hutangDoc.nominal,
                    status: hutangDoc.status,
                    deskripsi: hutangDoc.deskripsi || '',
                    fotoDataUris: hutangDoc.fotoDataUris || [], // Ensure it's an array
                  };
                }
              );
              hutangList.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
              resolve(hutangList);
            } else {
              resolve([]);
            }
          },
          (error) => {
            console.error("Error fetching hutang from RTDB:", error);
            reject(error);
          },
          {
            onlyOnce: false
          }
        );
      }),
  });
}

// Type for adding new hutang
export interface AddHutangInput extends Omit<Hutang, 'id'> {}
// Type for updating hutang
export interface UpdateHutangInput extends Partial<Omit<Hutang, 'id' | 'nama'>> {
  id: string;
  nama?: string;
  nominal?: number;
  tanggal?: Date;
  status?: StatusHutangValue;
  deskripsi?: string;
  fotoDataUris?: string[] | null; // Allow null for explicit removal, or array of strings
}


// Hook to add a new hutang to Realtime Database
export function useAddHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newHutang: AddHutangInput) => {
      const hutangRef = ref(rtdb, HUTANG_PATH);
      const docToSave: HutangDocument = {
        nama: newHutang.nama,
        tanggal: newHutang.tanggal.toISOString(),
        nominal: newHutang.nominal,
        status: newHutang.status,
        deskripsi: newHutang.deskripsi || '',
        fotoDataUris: (newHutang.fotoDataUris && newHutang.fotoDataUris.length > 0) ? newHutang.fotoDataUris : null,
      };
      const newPostRef = push(hutangRef);
      return rtdbUpdate(newPostRef, docToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HUTANG_QUERY_KEY] });
    },
    onError: (error) => {
      console.error("Error adding hutang to RTDB:", error);
    }
  });
}

// Hook to update an existing hutang in Realtime Database
export function useUpdateHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updatedData }: UpdateHutangInput) => {
      const docRef = ref(rtdb, `${HUTANG_PATH}/${id}`);
      
      const dataToUpdate: Partial<HutangDocument> = {};
      if (updatedData.nama !== undefined) dataToUpdate.nama = updatedData.nama;
      if (updatedData.nominal !== undefined) dataToUpdate.nominal = updatedData.nominal;
      if (updatedData.status !== undefined) dataToUpdate.status = updatedData.status;
      
      if (Object.prototype.hasOwnProperty.call(updatedData, 'deskripsi')) {
         dataToUpdate.deskripsi = updatedData.deskripsi || '';
      }
      
      if (Object.prototype.hasOwnProperty.call(updatedData, 'fotoDataUris')) {
        dataToUpdate.fotoDataUris = (updatedData.fotoDataUris && updatedData.fotoDataUris.length > 0) ? updatedData.fotoDataUris : null;
      }

      if (updatedData.tanggal) {
        dataToUpdate.tanggal = updatedData.tanggal.toISOString();
      }

      return rtdbUpdate(docRef, dataToUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HUTANG_QUERY_KEY] });
    },
    onError: (error) => {
      console.error("Error updating hutang in RTDB:", error);
    }
  });
}

// Hook to delete a hutang from Realtime Database
export function useDeleteHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = ref(rtdb, `${HUTANG_PATH}/${id}`);
      return rtdbRemove(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HUTANG_QUERY_KEY] });
    },
    onError: (error) => {
      console.error("Error deleting hutang from RTDB:", error);
    }
  });
}

export function findExistingHutangByName(
  hutangList: Hutang[] | undefined,
  name: string
): Hutang | undefined {
  if (!hutangList) return undefined;
  return hutangList.find(
    (h) => h.nama.toLowerCase() === name.toLowerCase() && h.status !== StatusHutang.LUNAS
  );
}
