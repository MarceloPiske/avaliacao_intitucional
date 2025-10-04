import { setupAdminAuth } from './modules/adminAuth.js';
import { setupAdminPanel } from './modules/adminPanel.js';

document.addEventListener('DOMContentLoaded', () => {
    // Firebase is initialized in firebaseConfig.js
    
    // Initialize authentication for admin page
    setupAdminAuth();
    
    // Initialize admin panel
    setupAdminPanel();
});