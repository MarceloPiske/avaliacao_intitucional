import { AnalyticsDataProcessor } from './avaliacoes/analytics-data-processor.js';
import { AnalyticsFilters } from './avaliacoes/analytics-filters.js';
import { AnalyticsCharts } from './avaliacoes/analytics-charts.js';
import { AnalyticsTabs } from './avaliacoes/analytics-tabs.js';
import { AnalyticsExporter } from './avaliacoes/analytics-exporter.js';

export class AvaliacoesManager {
    constructor() {
        this.dataProcessor = new AnalyticsDataProcessor();
        this.filters = new AnalyticsFilters();
        this.charts = new AnalyticsCharts();
        this.tabs = new AnalyticsTabs();
        this.exporter = new AnalyticsExporter();
        
        this.filteredData = [];
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Setup individual component event listeners
        this.filters.setupEventListeners();
        this.tabs.setupEventListeners();
        
        // Set up callbacks
        this.filters.onFilterChange = () => this.applyFilters();
        this.tabs.onTabChange = (tabName) => this.updateAnalytics();
        
        // Export button
        document.getElementById('exportAnalyticsBtn')?.addEventListener('click', () => this.exporter.exportAnalytics());
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', () => this.loadData());
    }

    async loadData() {
        try {
            this.showLoading(true);
            
            // Load and process all data
            const data = await this.dataProcessor.loadAllData();
            
            // Populate filters
            this.filters.populateFilters(data.processedData);
            
            // Apply initial filters with defaults
            this.applyFilters();
            
            // Update summary with enhanced metrics
            this.updateSummary();
            
            // Trigger initial filter change to apply defaults
            this.filters.handleFilterChange();
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    applyFilters() {
        this.filteredData = this.filters.applyFilters(this.dataProcessor.processedData);
        this.updateAnalytics();
    }

    updateSummary() {
        const summary = this.dataProcessor.calculateSummary();
        
        document.getElementById('totalAvaliacoes').textContent = summary.totalAvaliacoes;
        document.getElementById('totalAlunos').textContent = summary.totalAlunos;
        document.getElementById('totalTurmas').textContent = summary.totalTurmas;
        document.getElementById('totalProfessores').textContent = summary.totalProfessores;
        document.getElementById('totalDisciplinas').textContent = summary.totalDisciplinas;
        document.getElementById('mediaGeral').textContent = summary.mediaGeral;
        document.getElementById('taxaParticipacao').textContent = summary.taxaParticipacao;
    }

    updateAnalytics() {
        const activeTab = this.tabs.getCurrentActiveTab();
        
        switch (activeTab) {
            case 'overview':
                this.updateOverviewTab();
                break;
            case 'students':
                const studentAnalytics = this.dataProcessor.getStudentAnalytics();
                this.tabs.updateStudentsTab(studentAnalytics, this.filteredData);
                break;
            case 'professors':
                const professorAnalytics = this.dataProcessor.getProfessorAnalytics();
                this.tabs.updateProfessorsTab(professorAnalytics, this.filteredData);
                break;
            case 'disciplines':
                const disciplineAnalytics = this.dataProcessor.getDisciplineAnalytics();
                this.tabs.updateDisciplinesTab(disciplineAnalytics, this.filteredData);
                break;
            case 'questions':
                this.tabs.updateQuestionsTab(this.filteredData, this.dataProcessor.groupByQuestion.bind(this.dataProcessor));
                break;
            case 'comments':
                this.tabs.updateCommentsTab(this.dataProcessor.allAvaliacoes, this.dataProcessor.allTurmas);
                break;
        }
    }

    updateOverviewTab() {
        this.charts.createCategoryChart(this.filteredData, this.dataProcessor.groupByCategory.bind(this.dataProcessor));
        this.charts.createSemesterChart(this.filteredData, this.dataProcessor.groupBySemester.bind(this.dataProcessor));
        this.charts.createDistributionChart(this.filteredData);
        this.charts.createTimelineChart(this.filteredData, this.dataProcessor.groupByMonth.bind(this.dataProcessor));
    }

    showLoading(show) {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        alert(message);
    }
}

// Global functions for detailed views
window.showStudentDetail = (studentId) => {
    console.log('Showing student detail for:', studentId);
    // Implement detailed student view modal
};

window.showProfessorDetail = (professorId) => {
    console.log('Showing professor detail for:', professorId);
    // Implement detailed professor view modal
};

window.showDisciplineDetail = (disciplineId) => {
    console.log('Showing discipline detail for:', disciplineId);
    // Implement detailed discipline view modal
};

window.toggleStudentExpand = (button, studentId) => {
    const item = button.closest('.detailed-student-item');
    const content = item.querySelector('.student-expanded-content');
    const icon = button.querySelector('.material-icons');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = 'expand_less';
    } else {
        content.style.display = 'none';
        icon.textContent = 'expand_more';
    }
};

window.toggleProfessorExpand = (button, professorId) => {
    const item = button.closest('.detailed-professor-item');
    const content = item.querySelector('.professor-expanded-content');
    const icon = button.querySelector('.material-icons');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = 'expand_less';
    } else {
        content.style.display = 'none';
        icon.textContent = 'expand_more';
    }
};

window.toggleDisciplineExpand = (button, disciplineId) => {
    const item = button.closest('.detailed-discipline-item');
    const content = item.querySelector('.discipline-expanded-content');
    const icon = button.querySelector('.material-icons');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = 'expand_less';
    } else {
        content.style.display = 'none';
        icon.textContent = 'expand_more';
    }
};

window.sortStudents = (sortBy) => {
    console.log('Sorting students by:', sortBy);
    // Implement student sorting
};

// Make Chart.js available globally
window.Chart = Chart;