import { FirebaseAuth } from '../avaliacao_disciplinas/modules/shared/firebase.js';
import { initUsersSection } from './modules/usersSection.js';
import { initQuestionsSection } from './modules/questionsSection.js';
import { initResultsSection } from './modules/resultsSection.js';
import { initSettingsSection } from './modules/settingsSection.js';

class AdminController {
    constructor() {
        this.auth = new FirebaseAuth();
        this.init();
    }

    async init() {
        // Verifica silenciosamente o status na BD
        this.auth.check_login_status((user) => {
            if (user) {
                // Checa a memória local guardada no login
                const userTipos = JSON.parse(localStorage.getItem("user_tipos") || "[]");
                
                if (userTipos.includes('admin')) {
                    // SUCESSO: Remove a tela de carregamento e mostra o painel
                    document.getElementById('app-loader').style.display = 'none';
                    document.getElementById('admin-sidebar').style.display = 'flex';
                    document.getElementById('admin-main').style.display = 'block';
                    
                    this.setupNavigation();
                    this.loadSections();
                } else {
                    // Aluno tentou aceder ao painel admin alterando a URL!
                    window.location.href = './index.html';
                }
            } else {
                // Não está logado! Expulsa para o login.
                window.location.href = './login';
            }
        });
    }

    loadSections() {
        // Carrega os módulos (Arquitetura Modular perfeita)
        initUsersSection();
        initQuestionsSection();
        initResultsSection();
        initSettingsSection();
    }

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.admin-section');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionName = btn.dataset.section;
                
                // Reseta visibilidade
                navBtns.forEach(b => b.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                // Ativa a nova tab
                btn.classList.add('active');
                document.getElementById(`${sectionName}-section`).classList.add('active');
            });
        });

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.auth.logout();
            window.location.href = './login';
        });
    }
}

// Inicia o motor do painel CPA
document.addEventListener('DOMContentLoaded', () => {
    new AdminController();
});