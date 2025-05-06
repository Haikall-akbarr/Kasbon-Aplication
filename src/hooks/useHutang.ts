
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
        // Order by tanggal. Note: RTDB stores dates typically as ISO strings or numbers.
        // For robust sorting, ensure tanggal is stored consistently (e.g., ISO string).
        // If using numbers (timestamps), default numeric sorting works.
        // For string dates, they must be in a sortable format like YYYY-MM-DD.
        // Here, we'll sort client-side after fetching if complex server-side sort isn't straightforward or needed.
        // Or use orderByChild('tanggal') if 'tanggal' is a consistently formatted string/number.
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
                    tanggal: new Date(hutangDoc.tanggal), // Convert ISO string/number to Date
                    nominal: hutangDoc.nominal,
                    status: hutangDoc.status,
                    deskripsi: hutangDoc.deskripsi || '',
                  };
                }
              );
              // Sort descending by date client-side
              hutangList.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
              resolve(hutangList);
            } else {
              resolve([]); // No data
            }
          },
          (error) => {
            console.error("Error fetching hutang from RTDB:", error);
            reject(error);
          },
          {
            onlyOnce: false // Set to true if you don't need real-time updates after initial fetch for this hook
          }
        );
      }),
  });
}

// Type for adding new hutang
export interface AddHutangInput extends Omit<Hutang, 'id'> {}
// Type for updating hutang
export interface UpdateHutangInput extends Partial<Omit<Hutang, 'id' | 'nama'>> { // nama should not be updatable this way to avoid merging issues
  id: string;
  nama?: string; // Allow updating name if needed, but handle merging logic carefully
  nominal?: number;
  tanggal?: Date;
  status?: StatusHutangValue;
  deskripsi?: string;
}


// Hook to add a new hutang to Realtime Database
export function useAddHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newHutang: AddHutangInput) => {
      const hutangRef = ref(rtdb, HUTANG_PATH);
      const docToSave: HutangDocument = {
        ...newHutang,
        tanggal: newHutang.tanggal.toISOString(), // Store date as ISO string
        deskripsi: newHutang.deskripsi || '',
        // createdAt: serverTimestamp(), // Optional: for server-side timestamp
      };
      const newPostRef = push(hutangRef);
      return rtdbUpdate(newPostRef, docToSave); // Using update to set data with generated key
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
      if (updatedData.deskripsi !== undefined) dataToUpdate.deskripsi = updatedData.deskripsi;
      else if (updatedData.deskripsi === undefined && Object.prototype.hasOwnProperty.call(updatedData, 'deskripsi')) {
         dataToUpdate.deskripsi = ''; // Handle explicitly setting to empty string
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

// Function to find existing hutang by name (not lunas)
// This logic remains client-side and should work with the Hutang[] array from useHutang
export function findExistingHutangByName(
  hutangList: Hutang[] | undefined,
  name: string
): Hutang | undefined {
  if (!hutangList) return undefined;
  return hutangList.find(
    (h) => h.nama.toLowerCase() === name.toLowerCase() && h.status !== StatusHutang.LUNAS
  );
}
