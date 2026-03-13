import { FirebaseAuth } from '../shared/firebase.js';

export class LoginController {
    constructor() {
        this.authInstance = new FirebaseAuth();
        this.currentMode = 'student';
        this.allowedDomains = ['@faculdadeluteranaconcordia.com.br', '@pyske.com', 'seminarioconcordia.com.br', "@gmail.com"]; // FIXME Domínios permitidos
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    async checkExistingSession() {
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
        if (userTipos.includes('admin') || userTipos.includes('professor')) {
            window.location.href = '/avaliacao_disciplinas/admin.html';
        } else if (userTipos.includes('aluno')) {
            window.location.href = '/avaliacao_disciplinas/index.html';
        } else {
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
        // Seletor de Modo (Aluno / Admin)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.closest('.mode-btn').dataset.mode);
            });
        });

        // Botão Google Login
        const googleLoginButton = document.getElementById('googleLoginButton');
        const googleLoader = document.getElementById('googleLoader');

        googleLoginButton.addEventListener('click', async () => {
            this.setButtonLoadingState(googleLoginButton, googleLoader, true);
            
            try {
                const result = await this.authInstance.loginWithGoogle();
                
                if (result) {
                    // BLOQUEIO DE DOMÍNIO DE E-MAIL (Segurança)
                    const userEmail = localStorage.getItem("user_email") || "";
                    const isAllowed = this.allowedDomains.some(domain => userEmail.endsWith(domain));
                    
                    if (!isAllowed && userEmail !== "") {
                        await this.authInstance.logout();
                        this.showToast('Acesso restrito: Utilize o seu e-mail institucional.', 'error');
                        this.setButtonLoadingState(googleLoginButton, googleLoader, false);
                        return;
                    }

                    const userTipos = JSON.parse(localStorage.getItem("user_tipos") || "[]");
                    
                    // Validação de Perfil vs Modo Escolhido
                    if (this.validateModePermission(userTipos)) {
                        this.showToast('Autenticação concluída! A redirecionar...', 'success');
                        setTimeout(() => this.redirectBasedOnUserType(userTipos), 1200);
                    } else {
                        await this.authInstance.logout();
                        const modeText = this.currentMode === 'admin' ? 'Administrativo' : 'de Estudante';
                        this.showToast(`Não tem permissão para acesso ${modeText}.`, 'error');
                        this.setButtonLoadingState(googleLoginButton, googleLoader, false);
                    }
                } else {
                    this.showToast('Conta não registada no sistema.', 'error');
                    this.setButtonLoadingState(googleLoginButton, googleLoader, false);
                }
            } catch (error) {
                console.error('Erro no login:', error);
                this.showToast(this.getAuthErrorMessage(error.code), 'error');
                this.setButtonLoadingState(googleLoginButton, googleLoader, false);
            }
        });
    }

    // ==========================================
    // SISTEMA DE TOASTS (Notificações Modernas)
    // ==========================================
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `modern-toast toast-${type}`;
        
        const icon = type === 'success' ? 'check_circle' : 'error_outline';
        
        toast.innerHTML = `
            <span class="material-icons">${icon}</span>
            <p>${message}</p>
        `;
        
        container.appendChild(toast);

        // Animação de entrada
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove após 4 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    setButtonLoadingState(button, loader, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const btnIcon = button.querySelector('.btn-icon');
        
        if (isLoading) {
            if(btnText) btnText.style.display = 'none';
            if(btnIcon) btnIcon.style.display = 'none';
            loader.style.display = 'block';
            button.disabled = true;
        } else {
            if(btnText) btnText.style.display = 'inline-block';
            if(btnIcon) btnIcon.style.display = 'flex';
            loader.style.display = 'none';
            button.disabled = false;
        }
    }

    switchMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        document.querySelectorAll('.mode-info').forEach(info => info.classList.remove('active'));
        document.querySelector(`.${mode}-mode`).classList.add('active');
        
        const btnText = document.querySelector('.btn-text');
        if (mode === 'admin') btnText.textContent = 'Acesso Administrativo';
        else btnText.textContent = 'Entrar com Google';
    }

    getAuthErrorMessage(errorCode) {
        // ... (Mantém a sua lista de erros intacta)
        if (errorCode === 'auth/popup-closed-by-user') return 'Login cancelado pelo utilizador.';
        return 'Ocorreu um erro de rede. Tente novamente.';
    }
}