// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey:  process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "fftournament-b002b.firebaseapp.com",
  projectId: "fftournament-b002b",
  storageBucket: "fftournament-b002b.firebasestorage.app",
  messagingSenderId: "135933024414",
  appId: "1:135933024414:web:ad367e57434f8f84b2c38f",
  measurementId: "G-1J3NEPESY7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore instance
const db = getFirestore(app);

// // Auth instance with persistence
// const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(ReactNativeAsyncStorage),
// });

const auth = initializeAuth(app); // No persistence


export { app, auth, db };
