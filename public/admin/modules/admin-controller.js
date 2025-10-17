import { FirebaseAuth } from '../../shared/modules/firebase.js';
import { UsuariosManager } from './shared/usuarios-manager.js';

import { DisciplinasManager } from './disciplinas/disciplinas-manager.js';
import { TurmasManager } from './disciplinas/turmas-manager.js';
import { FormulariosManager } from './disciplinas/formularios-manager.js';
import { AvaliacoesManager } from './disciplinas/avaliacoes-manager.js';
import { DashboardManager } from './disciplinas/dashboard-manager.js';

import { PerguntasInstitucionalManager } from './institucional/perguntas-institucional-manager.js';
import { ResultadosInstitucionalManager } from './institucional/resultados-institucional-manager.js';

export class AdminController {
    constructor() {
        this.authInstance = new FirebaseAuth();
        this.currentSection = 'dashboard';
        this.managers = {};
        
        this.init();
    }

    async init() {
        // Check authentication status first
        this.authInstance.check_login_status(async (user) => {
            if (user) {
                // User is authenticated, check admin access
                await this.checkAdminAccess();
                
                // Initialize managers
                this.managers = {
                    dashboard: new DashboardManager(),
                    usuarios: new UsuariosManager(),
                    disciplinas: new DisciplinasManager(),
                    turmas: new TurmasManager(),
                    formularios: new FormulariosManager(),
                    avaliacoes: new AvaliacoesManager(),
                    'perguntas-institucional': new PerguntasInstitucionalManager(),
                    'resultados-institucional': new ResultadosInstitucionalManager()
                };
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Load initial data
                await this.loadSection('dashboard');
            } else {
                // User is not authenticated, redirect to login
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
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.loadSection(section);
            });
        });

        // Logout
        document.getElementById('logoutButton').addEventListener('click', async () => {
            await this.authInstance.logout();
        });

        // Add button
        document.getElementById('addButton').addEventListener('click', () => {
            this.managers[this.currentSection].openAddModal();
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal-overlay')) {
                this.closeModal();
            }
        });
    }

    async loadSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Update header
        const titles = {
            dashboard: 'Dashboard',
            usuarios: 'Gerenciar Usuários',
            disciplinas: 'Gerenciar Disciplinas',
            turmas: 'Gerenciar Turmas',
            formularios: 'Gerenciar Formulários',
            avaliacoes: 'Visualizar Avaliações (disciplinas)',
            'perguntas-institucional': 'Gerenciar Perguntas (Institucional)',
            'resultados-institucional': 'Resultados (Institucional)'
        };

        document.getElementById('pageTitle').textContent = titles[section];
        
        // Show/hide add button
        const addButton = document.getElementById('addButton');
        if (section === 'dashboard' || section === 'avaliacoes') {
            addButton.style.display = 'none';
        } else {
            addButton.style.display = 'flex';
        }

        this.currentSection = section;

        // Load section data
        if (this.managers[section]) {
            await this.managers[section].loadData();
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