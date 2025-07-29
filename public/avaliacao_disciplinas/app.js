import { FirebaseCRUD, FirebaseAuth } from './modules/shared/firebase.js';
import { EvaluationForm } from './modules/evaluation/evaluation-form.js';
import { DisciplinesManager } from './modules/evaluation/disciplines-manager.js';

class App {
    constructor() {
        this.authInstance = new FirebaseAuth();
        this.init();
    }

    async init() {
        try {
            // Check authentication status first
            this.authInstance.check_login_status(async (user) => {
                if (user) {
                    // User is authenticated, check student access
                    await this.checkStudentAccess();
                    
                    // Show loading state
                    this.showLoading(true);
                    
                    // Initialize evaluation form first
                    this.evaluationForm = new EvaluationForm();
                    
                    // Initialize disciplines manager
                    this.disciplinesManager = new DisciplinesManager();
                    
                    // Load disciplines data
                    const disciplinesData = await this.disciplinesManager.loadDisciplines();
                    
                    // Attach event listeners
                    this.disciplinesManager.attachEventListeners(disciplinesData, this.evaluationForm);
                    
                    // Setup authentication
                    this.setupAuth();
                    
                    // Hide loading state
                    this.showLoading(false);
                } else {
                    // User is not authenticated, redirect to login
                    this.authInstance.pages_redirect('login');
                }
            });
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            this.showError('Erro ao carregar a aplicação. Recarregue a página.');
            this.showLoading(false);
        }
    }

    async checkStudentAccess() {
        const userId = localStorage.getItem("user_id");
        const userTipos = JSON.parse(localStorage.getItem("user_tipos") || "[]");
        
        if (!userId || !userTipos.includes("aluno")) {
            alert("Acesso negado. Você não tem permissões de estudante.");
            await this.authInstance.logout();
            return;
        }
    }

    setupAuth() {
        document.getElementById("logoutButton").addEventListener("click", async () => {
            await this.authInstance.logout();
        });

        this.authInstance.check_login_status((user) => {
            if (user) {
                console.log("Usuário conectado:", user.email);
            } else {
                console.log("Nenhum usuário conectado.");
            }
        });
    }

    showLoading(show) {
        const disciplinesGrid = document.querySelector('.disciplines-grid');
        if (show) {
            disciplinesGrid.innerHTML = `
                <div class="loading-container" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                    <div class="loader" style="display: inline-block; margin-bottom: 1rem;"></div>
                    <p style="color: var(--gray-600); font-size: 1.1rem;">Carregando disciplinas...</p>
                </div>
            `;
        }
    }

    showError(message) {
        const disciplinesGrid = document.querySelector('.disciplines-grid');
        disciplinesGrid.innerHTML = `
            <div class="error-container" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <div style="color: var(--danger-600); font-size: 1.2rem; margin-bottom: 1rem;">⚠️ ${message}</div>
                <button class="btn btn-primary" onclick="window.location.reload()">Tentar Novamente</button>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});