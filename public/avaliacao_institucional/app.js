import { setupAuth } from './modules/auth.js';
import { setupAdminPanel } from './modules/adminPanel.js';
import { initializeFirebase } from './modules/firebaseConfig.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase
    initializeFirebase();
    
    // Initialize authentication
    setupAuth();
    
    // Initialize admin panel
    setupAdminPanel();
});