import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  query,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Define the Hutang interface
export interface Hutang {
  id?: string;
  nama: string;
  tanggal: Date;
  nominal: number;
  status: 'Belum Lunas' | 'Lunas' | 'Dicicil';
  deskripsi?: string;
}

// Firestore document type
export interface HutangDocument {
  nama: string;
  tanggal: Timestamp;
  nominal: number;
  status: 'Belum Lunas' | 'Lunas' | 'Dicicil';
  deskripsi?: string;
}

// Firebase documents
const HUTANG_COLLECTION = 'hutang';
const hutangCollectionRef = collection(db, HUTANG_COLLECTION);
export const HUTANG_QUERY_KEY = 'hutang';

// Function to fetch hutang data
export function useHutang() {
  return useQuery({
    queryKey: [HUTANG_QUERY_KEY],
    queryFn: () =>
      new Promise<Hutang[]>((resolve, reject) => {
        const q = query(hutangCollectionRef, orderBy('tanggal', 'desc'));

        return onSnapshot(
          q,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const hutangList = snapshot.docs.map((doc) => {
              const data = doc.data() as HutangDocument;
              return {
                id: doc.id,
                nama: data.nama,
                tanggal: data.tanggal.toDate(),
                nominal: data.nominal,
                status: data.status,
                deskripsi: data.deskripsi,
              };
            });
            resolve(hutangList);
          },
          (error) => {
            reject(error);
          }
        );
      }),
  });
}

// Function to stream hutang data (alternative to useHutang)
export function streamHutang(
  setHutang: React.Dispatch<React.SetStateAction<Hutang[]>>
) {
  const q = query(hutangCollectionRef, orderBy('tanggal', 'desc'));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      setHutang(
        snapshot.docs.map((docData): Hutang => {
          const data = docData.data() as HutangDocument;
          return {
            id: docData.id,
            nama: data.nama,
            tanggal: (data.tanggal as Timestamp).toDate(),
            nominal: data.nominal,
            status: data.status,
            deskripsi: data.deskripsi || '', // Ensure deskripsi is a string
          };
        }),
      );
    },
  );
}

// Type for adding new hutang (tanggal as Date for input)
export interface AddHutangInput extends Omit<Hutang, 'id'> {}
// Type for updating hutang (tanggal as Date for input)
export interface UpdateHutangInput extends Partial<AddHutangInput> {
  id: string;
}


// Hook to add a new hutang
export function useAddHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newHutang: AddHutangInput) => {
      const docToSave: HutangDocument = {
        ...newHutang,
        tanggal: Timestamp.fromDate(newHutang.tanggal),
        deskripsi: newHutang.deskripsi || '',
      };
      return addDoc(hutangCollectionRef, docToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HUTANG_QUERY_KEY] });
    },
    onError: (error) => {
      console.error("Error adding hutang:", error);
      // Optionally re-throw or handle as needed
    }
  });
}


// Hook to update an existing hutang
export function useUpdateHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updatedData }: UpdateHutangInput) => {
      const docRef = doc(db, 'hutang', id);
      const dataToUpdate: Partial<HutangDocument> = { ...updatedData };
      if (updatedData.tanggal) {
        dataToUpdate.tanggal = Timestamp.fromDate(updatedData.tanggal);
      }
      if (updatedData.deskripsi === undefined) {
        dataToUpdate.deskripsi = ''; // Ensure deskripsi is not undefined in Firestore
      }
      return updateDoc(docRef, dataToUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HUTANG_QUERY_KEY] });
    },
    onError: (error) => {
      console.error("Error updating hutang:", error);
    }
  });
}

// Hook to delete a hutang
export function useDeleteHutang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'hutang', id);
      return deleteDoc(docRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HUTANG_QUERY_KEY] });
    },
    onError: (error) => {
      console.error("Error deleting hutang:", error);
    }
  });
}

// Function to find existing hutang by name (not lunas)
export function findExistingHutangByName(
  hutangList: Hutang[] | undefined,
  name: string
): Hutang | undefined {
  if (!hutangList) return undefined;
  return hutangList.find(
    (h) => h.nama.toLowerCase() === name.toLowerCase() && h.status !== 'Lunas'
  );
}
