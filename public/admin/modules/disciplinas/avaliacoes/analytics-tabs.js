import { AnalyticsTabsRenderers } from './analytics-tabs-renderers.js';

export class AnalyticsTabs {
    constructor() {
        this.activeTab = 'overview';
        this.onTabChange = null;
        this.detailViewMode = 'grid'; // 'grid' or 'detailed'
        this.renderers = new AnalyticsTabsRenderers();
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Detail view mode toggle
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleViewMode(e.target.dataset.mode);
            });
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
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
        document.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');
        
        // Trigger view update
        if (this.onTabChange) {
            this.onTabChange(this.activeTab);
        }
    }

    updateStudentsTab(studentAnalytics, filteredData) {
        const container = document.getElementById('studentsAnalysisContainer');
        if (!container) return;
        
        if (this.detailViewMode === 'grid') {
            this.renderers.renderStudentsGrid(container, studentAnalytics, this.detailViewMode);
        } else {
            this.renderers.renderStudentsDetailed(container, studentAnalytics, filteredData, this.detailViewMode);
        }
    }

    updateProfessorsTab(professorAnalytics, filteredData) {
        const container = document.getElementById('professorsAnalysisContainer');
        if (!container) return;
        
        if (this.detailViewMode === 'grid') {
            this.renderers.renderProfessorsGrid(container, professorAnalytics, this.detailViewMode);
        } else {
            this.renderers.renderProfessorsDetailed(container, professorAnalytics, filteredData, this.detailViewMode);
        }
    }

    updateDisciplinesTab(disciplineAnalytics, filteredData) {
        const container = document.getElementById('disciplinesAnalysisContainer');
        if (!container) return;
        
        if (this.detailViewMode === 'grid') {
            this.renderers.renderDisciplinesGrid(container, disciplineAnalytics, this.detailViewMode);
        } else {
            this.renderers.renderDisciplinesDetailed(container, disciplineAnalytics, filteredData, this.detailViewMode);
        }
    }

    updateCommentsTab(allAvaliacoes, allTurmas) {
        const container = document.getElementById('commentsContainer');
        if (!container) return;
        
        this.renderers.renderCommentsTab(container, allAvaliacoes, allTurmas);
    }

    updateQuestionsTab(data, groupByQuestion) {
        const container = document.getElementById('questionsAnalysisContainer');
        if (!container) return;
        
        this.renderers.renderQuestionsTab(container, data, groupByQuestion);
    }

    getCurrentActiveTab() {
        return this.activeTab;
    }
}