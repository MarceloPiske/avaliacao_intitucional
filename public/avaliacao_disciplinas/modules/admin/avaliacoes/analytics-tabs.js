import { AnalyticsTabsRenderers } from './analytics-tabs-renderers.js';

export class AnalyticsTabs {
    constructor() {
        this.activeTab = 'overview';
        this.onTabChange = null;
        this.onExportTab = null; // <-- Novo callback para exportar abas
        this.detailViewMode = 'detailed'; // Vamos focar no modo detalhado por defeito
        this.renderers = new AnalyticsTabsRenderers();
        
        // <-- CONTROLO DE PAGINAÇÃO (Load More)
        this.limits = { students: 20, professors: 20, disciplines: 20, questions: 20, comments: 20 };
    }

    setupEventListeners() {
        // Evento para mudança de Abas (Tabs)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Evento para mudança de Modo de Visualização (Grid/Detailed)
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleViewMode(e.currentTarget.dataset.mode);
            });
        });

        // ==========================================
        // EVENT DELEGATION (Substitui os onclick inline)
        // ==========================================
        const tabsContainer = document.querySelector('.analytics-tabs') || document.body;
        
        tabsContainer.addEventListener('click', (e) => {
            // 1. Expandir Acordeão
            const expandBtn = e.target.closest('.expand-btn');
            if (expandBtn) return this.handleExpandToggle(expandBtn);

            // 2. Botão "Carregar Mais"
            const loadMoreBtn = e.target.closest('.load-more-btn');
            if (loadMoreBtn) {
                const tab = loadMoreBtn.dataset.tab;
                this.limits[tab] += 20; // Aumenta o limite em 20
                if (this.onTabChange) this.onTabChange(this.activeTab); // Recarrega a aba
                return;
            }

            // 3. Botão "Exportar Relatório desta Aba"
            const exportBtn = e.target.closest('.export-tab-btn');
            if (exportBtn) {
                const tabToExport = exportBtn.dataset.export;
                if (this.onExportTab) this.onExportTab(tabToExport);
                return;
            }
        });
    }

    // Função unificada que lida com a expansão de qualquer item
    handleExpandToggle(button) {
        // Encontra o elemento "pai" correspondente à linha clicada
        const item = button.closest('.detailed-student-item, .detailed-professor-item, .detailed-discipline-item');
        if (!item) return;

        // Encontra o conteúdo oculto dentro desse pai
        const content = item.querySelector('.student-expanded-content, .professor-expanded-content, .discipline-expanded-content');
        const icon = button.querySelector('.material-icons');

        if (content && icon) {
            // Alterna a visibilidade e o ícone
            if (content.style.display === 'none' || content.style.display === '') {
                content.style.display = 'block';
                icon.textContent = 'expand_less';
            } else {
                content.style.display = 'none';
                icon.textContent = 'expand_more';
            }
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        // Reinicia a paginação sempre que muda de aba
        this.limits = { students: 20, professors: 20, disciplines: 20, questions: 20 };
        // Update tab buttons de forma segura
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Update tab content de forma segura
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        } else {
            console.warn(`Aba não encontrada no HTML: #${tabName}-tab`);
        }
        
        // Notify parent component
        if (this.onTabChange) {
            this.onTabChange(tabName);
        }
    }

    toggleViewMode(mode) {
        this.detailViewMode = mode;
        
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeMode = document.querySelector(`[data-mode="${mode}"]`);
        if (activeMode) activeMode.classList.add('active');
        
        // Trigger view update
        if (this.onTabChange) {
            this.onTabChange(this.activeTab);
        }
    }

    updateStudentsTab(studentAnalytics, filteredData) {
        const container = document.getElementById('studentsAnalysisContainer');
        if (!container) return;
        
        if (this.detailViewMode === 'grid') {
            this.renderers.renderStudentsGrid(container, studentAnalytics, this.detailViewMode, this.limits.students);
        } else {
            this.renderers.renderStudentsDetailed(container, studentAnalytics, filteredData, this.detailViewMode, this.limits.students);
        }
    }

    updateProfessorsTab(professorAnalytics, filteredData) {
        const container = document.getElementById('professorsAnalysisContainer');
        if (!container) return;
        
        if (this.detailViewMode === 'grid') {
            this.renderers.renderProfessorsGrid(container, professorAnalytics, this.detailViewMode, this.limits.professors);
        } else {
            this.renderers.renderProfessorsDetailed(container, professorAnalytics, filteredData, this.detailViewMode, this.limits.professors);
        }
    }

    updateDisciplinesTab(disciplineAnalytics, filteredData) {
        const container = document.getElementById('disciplinesAnalysisContainer');
        if (!container) return;
        
        if (this.detailViewMode === 'grid') {
            this.renderers.renderDisciplinesGrid(container, disciplineAnalytics, this.detailViewMode, this.limits.disciplines);
        } else {
            this.renderers.renderDisciplinesDetailed(container, disciplineAnalytics, filteredData, this.detailViewMode, this.limits.disciplines);
        }
    }

    updateCommentsTab(allAvaliacoes, allTurmas) {
        const container = document.getElementById('commentsContainer');
        if (!container) return;
        
        // Passamos o this.limits.comments (caso exista) ou 20 por padrão
        this.renderers.renderCommentsTab(container, allAvaliacoes, allTurmas, this.limits.comments || 20);
    }

    updateQuestionsTab(data, groupByQuestion) {
        const container = document.getElementById('questionsAnalysisContainer');
        if (container) {
            this.renderers.renderQuestionsTab(container, data, groupByQuestion, this.limits.questions);
        }
    }

    getCurrentActiveTab() {
        return this.activeTab;
    }
}