import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_57qRozqidb0HsvkssMkZw3DZqRWew9s",
    authDomain: "avaliacao-institucional-a1764.firebaseapp.com",
    projectId: "avaliacao-institucional-a1764",
    storageBucket: "avaliacao-institucional-a1764.appspot.com",
    messagingSenderId: "598583018519",
    appId: "1:598583018519:web:d9f1f96f2434367e6ec852",
    measurementId: "G-W7YZK1RG3F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();