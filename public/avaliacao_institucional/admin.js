import { initializeFirebase } from './modules/firebaseConfig.js';
import { initUsersSection } from './modules/usersSection.js';
import { initQuestionsSection } from './modules/questionsSection.js';
import { initResultsSection } from './modules/resultsSection.js';

// Initialize Firebase
initializeFirebase();

const auth = firebase.auth();
const db = firebase.firestore();

// Elements
const adminLoginContainer = document.getElementById('admin-login-container');
const adminPanel = document.getElementById('admin-panel');
const adminGoogleLoginButton = document.getElementById('admin-google-login-button');
const adminLoginError = document.getElementById('admin-login-error');
const logoutBtn = document.getElementById('logout-btn');

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        // Check if user is admin
        checkIfAdmin(user.email);
    } else {
        showLoginScreen();
    }
});

// Google login
adminGoogleLoginButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        hd: 'seminarioconcordia.com.br,faculdadeluteranaconcordia.com.br'
    });
    
    auth.signInWithPopup(provider)
        .then((result) => {
            const email = result.user.email;
            checkIfAdmin(email);
        })
        .catch((error) => {
            console.error("Error during Google sign in:", error);
            adminLoginError.textContent = 'Erro ao fazer login: ' + error.message;
        });
});

// Check if user is admin
async function checkIfAdmin(email) {
    try {
        const snapshot = await db.collection('users')
            .where('email', '==', email)
            .where('role', '==', 'admin')
            .get();
        
        if (!snapshot.empty) {
            showAdminPanel();
        } else {
            auth.signOut();
            adminLoginError.textContent = 'Você não tem permissão para acessar o painel administrativo.';
            showLoginScreen();
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        adminLoginError.textContent = 'Erro ao verificar permissões: ' + error.message;
        auth.signOut();
        showLoginScreen();
    }
}

function showLoginScreen() {
    adminLoginContainer.style.display = 'flex';
    adminPanel.style.display = 'none';
}

function showAdminPanel() {
    adminLoginContainer.style.display = 'none';
    adminPanel.style.display = 'flex';
    adminLoginError.textContent = '';
    
    // Initialize sections
    initUsersSection();
    initQuestionsSection();
    initResultsSection();
}

// Logout
logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    showLoginScreen();
});

// Navigation
const navBtns = document.querySelectorAll('.sidebar-btn');
const sections = document.querySelectorAll('.admin-section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionName = btn.dataset.section;
        
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`${sectionName}-section`).classList.add('active');
    });
});