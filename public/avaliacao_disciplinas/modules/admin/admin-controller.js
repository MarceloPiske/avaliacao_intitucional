import { FirebaseAuth, FirebaseCRUD } from '../shared/firebase.js';
import { UsuariosManager } from './usuarios-manager.js';
import { DisciplinasManager } from './disciplinas-manager.js';
import { TurmasManager } from './turmas-manager.js';
import { FormulariosManager } from './formularios-manager.js';
import { AvaliacoesManager } from './avaliacoes-manager.js';
import { DashboardManager } from './dashboard-manager.js';

export class AdminController {
    constructor() {
        this.authInstance = new FirebaseAuth();
        this.currentSection = 'dashboard';
        this.managers = {};
        
        this.init();
    }

    async init() {
        this.authInstance.check_login_status(async (user) => {
            if (user) {
                await this.checkAdminAccess();
                
                this.managers = {
                    dashboard: new DashboardManager(),
                    usuarios: new UsuariosManager(),
                    disciplinas: new DisciplinasManager(),
                    turmas: new TurmasManager(),
                    formularios: new FormulariosManager(),
                    avaliacoes: new AvaliacoesManager()
                };
                
                this.setupEventListeners();
                
                // 1. MAGIA DA PERSISTÊNCIA: Lê a última aba aberta ou vai para o dashboard
                const savedSection = localStorage.getItem('admin_current_section') || 'dashboard';
                await this.loadSection(savedSection);
            } else {
                this.authInstance.pages_redirect('login');
            }
        });
    }

    async checkAdminAccess() {
        const userId = localStorage.getItem("user_id");
        const userTipos = JSON.parse(localStorage.getItem("user_tipos") || "[]");
        
        if (!userId || (!userTipos.includes("admin") && !userTipos.includes("professor"))) {
            alert("Acesso negado. Você não tem permissões de administrador.");
            await this.authInstance.logout();
            return;
        }
    }

    setupEventListeners() {
        // Navegação nas Abas
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.loadSection(item.dataset.section);
            });
        });

        document.getElementById('logoutButton').addEventListener('click', async () => {
            await this.authInstance.logout();
        });

        const addBtn = document.getElementById('addButton');
        if (addBtn) addBtn.addEventListener('click', () => this.managers[this.currentSection].openAddModal());

        const modalClose = document.getElementById('modal-close');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());

        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) this.closeModal();
        });

        // 2. MAGIA DO RESPONSIVO: Botão de abrir/fechar o Menu no Telemóvel
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.saas-sidebar');
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    }

    async loadSection(section) {
        // Guarda a secção atual no disco do navegador
        localStorage.setItem('admin_current_section', section);

        // Atualiza UI de Navegação
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`[data-section="${section}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Atualiza UI de Conteúdo
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const activeSection = document.getElementById(`${section}-section`);
        if (activeSection) activeSection.classList.add('active');

        // Atualiza Título
        const titles = {
            dashboard: 'Visão Geral',
            usuarios: 'Gerenciar Usuários',
            disciplinas: 'Gerenciar Disciplinas',
            turmas: 'Gerenciar Turmas',
            formularios: 'Gerenciar Formulários',
            avaliacoes: 'Análise Institucional'
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';
        
        // Controla Botão Adicionar
        const addButton = document.getElementById('addButton');
        if (addButton) {
            addButton.style.display = (section === 'dashboard' || section === 'avaliacoes') ? 'none' : 'flex';
        }

        this.currentSection = section;

        // Carrega dados da secção via Manager correspondente
        if (this.managers[section]) {
            await this.managers[section].loadData();
        }

        // 3. UX MOBILE: Esconde o menu lateral automaticamente após clicar numa aba em ecrãs pequenos
        const sidebar = document.querySelector('.saas-sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }
    openModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'block';
    }

    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    }
}