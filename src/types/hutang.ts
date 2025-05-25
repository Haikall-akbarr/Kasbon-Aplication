
// Define the status options (consistent with kalkulator-hutang.tsx)
export const StatusHutang = {
  BELUM_LUNAS: 'Belum Lunas',
  LUNAS_SEBAGIAN: 'Lunas Sebagian',
  LUNAS: 'Lunas',
} as const;

export type StatusHutangKey = keyof typeof StatusHutang;
export type StatusHutangValue = (typeof StatusHutang)[StatusHutangKey];

// Structure for data stored in Firebase Realtime Database
export interface HutangDocument {
  nama: string;
  tanggal: string; // Store dates as ISO strings or number (timestamp) in RTDB
  nominal: number;
  status: StatusHutangValue;
  deskripsi?: string;
  fotoDataUris?: string[]; // Array of data URIs for images (optional)
  // Firebase Realtime Database typically uses a server-generated timestamp for ordering if needed
  // createdAt?: object; // e.g. serverTimestamp()
}

// Structure for data used in the component (tanggal as Date)
export interface Hutang extends Omit<HutangDocument, 'tanggal' | 'id'> {
  id: string; // Realtime Database key/ID
  tanggal: Date;
  deskripsi: string; // Ensure deskripsi is always a string for the component
  fotoDataUris?: string[]; // Array of data URIs for images (optional)
}
