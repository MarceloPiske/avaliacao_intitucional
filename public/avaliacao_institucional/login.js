import { FirebaseAuth } from '../avaliacao_disciplinas/modules/shared/firebase.js';

export class LoginController {
    constructor() {
        this.authInstance = new FirebaseAuth();
        this.currentMode = 'student'; // 'student' serve para todos os avaliadores (Alunos/Professores/Funcionários)
        this.allowedDomains = ['@faculdadeluteranaconcordia.com.br', '@pyske.com', 'seminarioconcordia.com.br', "@gmail.com"]; 
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
        // Na CPA, apenas administradores vão para o painel Admin.
        if (userTipos.includes('admin')) {
            window.location.href = 'admin';
        } 
        // Professores, Alunos e Funcionários vão para o formulário responder à CPA.
        else if (userTipos.includes('aluno') || userTipos.includes('professor') || userTipos.includes('funcionario')) {
            window.location.href = 'index';
        } 
        else {
            this.authInstance.logout();
        }
    }

    validateModePermission(userTipos) {
        if (this.currentMode === 'admin') {
            return userTipos.includes('admin');
        } else if (this.currentMode === 'student') {
            return userTipos.includes('aluno') || userTipos.includes('professor') || userTipos.includes('funcionario');
        }
        return false;
    }

    setupEventListeners() {
        // Seletor de Modo (Avaliador / Admin)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeBtn = e.target.closest('.mode-btn');
                if(modeBtn) this.switchMode(modeBtn.dataset.mode);
            });
        });

        // Botão Google Login
        const googleLoginButton = document.getElementById('googleLoginButton');
        const googleLoader = document.getElementById('googleLoader');

        if(googleLoginButton) {
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
                            const modeText = this.currentMode === 'admin' ? 'Administrativo' : 'de Avaliação';
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
    }

    // ==========================================
    // SISTEMA DE TOASTS (Notificações Modernas)
    // ==========================================
    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

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
        if (!button || !loader) return;
        
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
        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        document.querySelectorAll('.mode-info').forEach(info => info.classList.remove('active'));
        const activeInfo = document.querySelector(`.${mode}-mode`);
        if (activeInfo) activeInfo.classList.add('active');
        
        const btnText = document.querySelector('.btn-text');
        if (btnText) {
            if (mode === 'admin') btnText.textContent = 'Acesso Administrativo';
            else btnText.textContent = 'Entrar com Google';
        }
    }

    getAuthErrorMessage(errorCode) {
        if (errorCode === 'auth/popup-closed-by-user') return 'Login cancelado pelo utilizador.';
        if (errorCode === 'auth/network-request-failed') return 'Falha na ligação. Verifique a sua internet.';
        return 'Ocorreu um erro de autenticação. Tente novamente.';
    }
}

// Inicializa o Login automaticamente quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    new LoginController();
});