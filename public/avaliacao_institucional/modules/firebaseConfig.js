// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_57qRozqidb0HsvkssMkZw3DZqRWew9s",
    authDomain: "avaliacao-institucional-a1764.firebaseapp.com",
    projectId: "avaliacao-institucional-a1764",
    storageBucket: "avaliacao-institucional-a1764.firebasestorage.app",
    messagingSenderId: "598583018519",
    appId: "1:598583018519:web:d9f1f96f2434367e6ec852",
    measurementId: "G-W7YZK1RG3F"
};

export function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

export function getDb() {
    return firebase.firestore();
}

export function getAuth() {
    return firebase.auth();
}

