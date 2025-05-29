import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";

export function init_app() {
    const firebaseConfig = {
        apiKey: "AIzaSyA_57qRozqidb0HsvkssMkZw3DZqRWew9s",
        authDomain: "avaliacao-institucional-a1764.firebaseapp.com",
        projectId: "avaliacao-institucional-a1764",
        storageBucket: "avaliacao-institucional-a1764.firebasestorage.app",
        messagingSenderId: "598583018519",
        appId: "1:598583018519:web:d9f1f96f2434367e6ec852",
        measurementId: "G-W7YZK1RG3F"
    };

    // Inicializar Firebase
    if (!getApps().length > 0) {
        // Nenhum app foi inicializado, então inicialize o app
        //console.log("App inicializado:");
        return initializeApp(firebaseConfig);
    } else {
        //console.log("App já inicializado:");
        return getApps()[0]
    }
}
