import { AnalyticsDataProcessor } from './avaliacoes/analytics-data-processor.js';
import { AnalyticsFilters } from './avaliacoes/analytics-filters.js';
import { AnalyticsCharts } from './avaliacoes/analytics-charts.js';
import { AnalyticsTabs } from './avaliacoes/analytics-tabs.js';
import { AnalyticsExporter } from './avaliacoes/analytics-exporter.js';
import { AnalyticsDataUtils } from './avaliacoes/analytics-data-utils.js';

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

        // Export button - ALTERADO PARA USAR DADOS FILTRADOS
        document.getElementById('exportAnalyticsBtn')?.addEventListener('click', () => {

            // 1. Verificar se há dados filtrados
            if (!this.filteredData || this.filteredData.length === 0) {
                alert("Não há dados filtrados para exportar.");
                return;
            }

            this.showLoading(true);

            // 2. Preparar objetos temporários para recalcular estatísticas baseadas no FILTRO
            const filteredDetailedAnalytics = {
                byStudent: new Map(),
                byProfessor: new Map(),
                byDiscipline: new Map(),
                byTurma: new Map()
            };

            // 3. Processar os dados filtrados usando a Utility existente
            // Isso garante que os mapas (byStudent, byProfessor) contenham apenas info filtrada
            AnalyticsDataUtils.processDetailedAnalytics(this.filteredData, filteredDetailedAnalytics);

            // 4. Calcular o Sumário baseado APENAS nos dados filtrados
            // (Recriamos a lógica do dataProcessor.calculateSummary mas para o array filtrado)
            const summary = this.calculateFilteredSummary(this.filteredData);

            // 5. Converter Maps para Arrays para o exportador
            const studentAnalytics = Array.from(filteredDetailedAnalytics.byStudent.values());
            const professorAnalytics = Array.from(filteredDetailedAnalytics.byProfessor.values());
            const disciplineAnalytics = Array.from(filteredDetailedAnalytics.byDiscipline.values());

            // 6. Obter texto dos filtros ativos para mostrar no cabeçalho
            const activeFiltersText = this.getFormattedActiveFilters();

            // 7. Chamar o exporter com os dados filtrados
            this.exporter.exportAnalytics(
                summary,
                studentAnalytics,
                professorAnalytics,
                disciplineAnalytics,
                activeFiltersText // Novo argumento
            ).finally(() => {
                this.showLoading(false);
            });
        });
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', () => this.loadData());
    }
    
    // NOVA FUNÇÃO AUXILIAR: Calcula sumário apenas para dados filtrados
    calculateFilteredSummary(data) {
        const totalAvaliacoes = data.length;
        const totalAlunos = new Set(data.map(a => a.alunoId)).size;

        // Contagem baseada nos itens filtrados
        const turmasUnicas = new Set(data.map(a => a.turmaId)).size;
        const professoresUnicos = new Set(data.map(a => a.professorId)).size;
        const disciplinasUnicas = new Set(data.map(a => a.disciplinaId)).size;

        // Média
        const responses = data.filter(item => typeof item.respostaValor === 'number');
        const mediaGeral = responses.length > 0 ?
            (responses.reduce((sum, item) => sum + item.respostaValor, 0) / responses.length).toFixed(2) : 0;

        // Taxa de participação é difícil calcular no filtro pois depende do total de matriculados da turma
        // Vamos manter o cálculo visual baseado no contexto atual ou simplificar
        return {
            totalAvaliacoes,
            totalAlunos,
            totalTurmas: turmasUnicas,
            totalProfessores: professoresUnicos,
            totalDisciplinas: disciplinasUnicas,
            mediaGeral,
            taxaParticipacao: "N/A (Filtro Ativo)" // Taxa global não faz sentido em filtro parcial
        };
    }

    // NOVA FUNÇÃO AUXILIAR: Formata texto dos filtros para o PDF
    getFormattedActiveFilters() {
        const filters = this.filters.getCurrentFilters();
        let parts = [];

        if (filters.year !== 'all') parts.push(`Ano: ${filters.year}`);
        if (filters.semester !== 'all') parts.push(`Semestre: ${filters.semester}`);
        if (filters.professor !== 'all') parts.push(`Prof.: ${filters.professor}`);
        if (filters.discipline !== 'all') parts.push(`Disc.: ${filters.discipline}`);
        if (filters.formulario !== 'all') parts.push(`Form.: ${filters.formulario}`);
        if (filters.search) parts.push(`Busca: "${filters.search}"`);

        return parts.length > 0 ? parts.join(' | ') : "Todos os dados (Sem filtros)";
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
        //this.charts.createTimelineChart(this.filteredData, this.dataProcessor.groupByMonth.bind(this.dataProcessor));
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