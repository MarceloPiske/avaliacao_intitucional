import { setupAuth } from './modules/auth.js';
import { setupAdminPanel } from './modules/adminPanel.js';

document.addEventListener('DOMContentLoaded', () => {
    // Firebase is initialized in firebaseConfig.js
    
    // Initialize authentication
    setupAuth();
    
    // Initialize admin panel
    setupAdminPanel();
});