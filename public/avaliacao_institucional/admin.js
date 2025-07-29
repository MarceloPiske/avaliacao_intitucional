import { initializeFirebase } from './modules/firebaseConfig.js';
import { setupAdminAuth } from './modules/adminAuth.js';
import { setupAdminPanel } from './modules/adminPanel.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase
    initializeFirebase();
    
    // Initialize authentication for admin page
    setupAdminAuth();
    
    // Initialize admin panel
    setupAdminPanel();
});