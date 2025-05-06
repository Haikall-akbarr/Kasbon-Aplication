
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  update, 
  remove, 
  serverTimestamp, 
  child,
  orderByChild,
  query as rtdbQuery
} from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Add this for Realtime Database
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const rtdb = getDatabase(app);

export { 
  rtdb, 
  ref, 
  onValue, 
  push, 
  update, 
  remove, 
  serverTimestamp,
  child,
  orderByChild,
  rtdbQuery
};
// Firestore specific exports are removed as we are switching to RTDB
// import { getFirestore, collection, Timestamp } from 'firebase/firestore';
// const db = getFirestore(app);
// export { db, collection, Timestamp };
