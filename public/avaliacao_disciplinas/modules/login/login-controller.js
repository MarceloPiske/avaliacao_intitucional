import { FirebaseAuth } from '../shared/firebase.js';

export class LoginController {
    constructor() {
        this.authInstance = new FirebaseAuth();
        this.currentMode = 'student';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    async checkExistingSession() {
        // Check if user is already logged in and redirect appropriately
        this.authInstance.check_login_status((user) => {
            if (user) {
                const userId = localStorage.getItem("user_id");
                const userTipos = JSON.parse(localStorage.getItem("user_tipos") || "[]");
                
                if (userId && userTipos.length > 0) {
                    this.redirectBasedOnUserType(userTipos);
                }
            }
        });
    }

    redirectBasedOnUserType(userTipos) {
        // Priority: admin > professor > aluno
        if (userTipos.includes('admin')) {
            window.location.href = 'admin.html';
        } else if (userTipos.includes('professor')) {
            window.location.href = 'admin.html'; // Professors also go to admin panel
        } else if (userTipos.includes('aluno')) {
            window.location.href = 'index.html';
        } else {
            // User has no valid roles, redirect to login
            this.authInstance.logout();
        }
    }

    validateModePermission(userTipos) {
        if (this.currentMode === 'admin') {
            return userTipos.includes('admin') || userTipos.includes('professor');
        } else if (this.currentMode === 'student') {
            return userTipos.includes('aluno');
        }
        return false;
    }

    setupEventListeners() {
        // Mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.closest('.mode-btn').dataset.mode);
            });
        });

        // Google login
        const googleLoginButton = document.getElementById('googleLoginButton');
        const googleLoader = document.getElementById('googleLoader');
        const errorAlert = document.getElementById('errorAlert');
        const successAlert = document.getElementById('successAlert');

        googleLoginButton.addEventListener('click', async () => {
            // Show loader and disable button
            this.setButtonLoadingState(googleLoginButton, googleLoader, true);
            
            // Clear previous alerts
            this.clearAlerts(errorAlert, successAlert);
            
            try {
                const result = await this.authInstance.loginWithGoogle();
                
                if (result) {
                    const userTipos = JSON.parse(localStorage.getItem("user_tipos") || "[]");
                    
                    // Check if user has permission for selected mode
                    if (this.validateModePermission(userTipos)) {
                        // Show success message
                        successAlert.textContent = 'Login realizado com sucesso! Redirecionando...';
                        successAlert.style.display = 'block';
                        
                        // Redirect after a short delay
                        setTimeout(() => {
                            this.redirectBasedOnUserType(userTipos);
                        }, 1000);
                    } else {
                        // User doesn't have permission for selected mode - logout and show error
                        await this.authInstance.logout();
                        const modeText = this.currentMode === 'admin' ? 'administrativo' : 'estudante';
                        errorAlert.textContent = `Você não tem permissão para acesso ${modeText}. Tente outro modo de acesso.`;
                        errorAlert.style.display = 'block';
                        
                        // Reset button state
                        this.setButtonLoadingState(googleLoginButton, googleLoader, false);
                    }
                } else {
                    // Login failed - user not registered or domain not allowed
                    errorAlert.textContent = 'Falha no login. Verifique se você está registrado no sistema e usando um email institucional.';
                    errorAlert.style.display = 'block';
                    
                    // Reset button state
                    this.setButtonLoadingState(googleLoginButton, googleLoader, false);
                }
            } catch (error) {
                console.error('Erro no login:', error);
                // Display error
                errorAlert.textContent = this.getAuthErrorMessage(error.code);
                errorAlert.style.display = 'block';
                
                // Reset button state
                this.setButtonLoadingState(googleLoginButton, googleLoader, false);
            }
        });
    }

    setButtonLoadingState(button, loader, isLoading) {
        const btnText = button.querySelector('.btn-text');
        
        if (isLoading) {
            btnText.style.display = 'none';
            loader.style.display = 'block';
            button.disabled = true;
        } else {
            btnText.style.display = 'inline-block';
            loader.style.display = 'none';
            button.disabled = false;
        }
    }

    clearAlerts(errorAlert, successAlert) {
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Update mode descriptions
        document.querySelectorAll('.mode-info').forEach(info => {
            info.classList.remove('active');
        });
        document.querySelector(`.${mode}-mode`).classList.add('active');
        
        // Update button text based on mode
        const btnText = document.querySelector('.btn-text');
        if (mode === 'admin') {
            btnText.textContent = 'Acesso Administrativo';
        } else {
            btnText.textContent = 'Entrar com Google';
        }
    }

    getAuthErrorMessage(errorCode) {
        switch(errorCode) {
            case 'auth/email-already-in-use':
                return 'Este email já está em uso.';
            case 'auth/invalid-email':
                return 'Email inválido.';
            case 'auth/user-disabled':
                return 'Esta conta foi desativada.';
            case 'auth/user-not-found':
                return 'Usuário não encontrado.';
            case 'auth/wrong-password':
                return 'Senha incorreta.';
            case 'auth/weak-password':
                return 'A senha é muito fraca.';
            case 'auth/operation-not-allowed':
                return 'Operação não permitida.';
            case 'auth/popup-closed-by-user':
                return 'Popup fechado antes da conclusão da operação.';
            case 'auth/network-request-failed':
                return 'Erro de conexão. Verifique sua internet.';
            case 'auth/too-many-requests':
                return 'Muitas tentativas. Tente novamente mais tarde.';
            case 'auth/invalid-credential':
                return 'Credenciais inválidas.';
            case 'auth/account-exists-with-different-credential':
                return 'Já existe uma conta com este email usando outro método de login.';
            default:
                return 'Ocorreu um erro durante o login. Tente novamente.';
        }
    }
}