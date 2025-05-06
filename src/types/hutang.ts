
import type { Timestamp } from 'firebase/firestore';

// Define the status options (consistent with kalkulator-hutang.tsx)
export const StatusHutang = {
  BELUM_LUNAS: 'Belum Lunas',
  LUNAS_SEBAGIAN: 'Lunas Sebagian',
  LUNAS: 'Lunas',
} as const;

export type StatusHutangKey = keyof typeof StatusHutang;
export type StatusHutangValue = (typeof StatusHutang)[StatusHutangKey];

// Structure for data stored in Firestore
export interface HutangDocument {
  nama: string;
  tanggal: Timestamp; // Firebase Timestamp
  nominal: number;
  status: StatusHutangValue;
  deskripsi?: string;
}

// Structure for data used in the component (tanggal as Date)
export interface Hutang extends Omit<HutangDocument, 'tanggal' | 'id'> {
  id: string; // Firestore document ID
  tanggal: Date;
  deskripsi: string; // Ensure deskripsi is always a string for the component
}
