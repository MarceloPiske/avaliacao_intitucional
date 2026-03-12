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
        
        // NOVO: Escutar cliques para exportar abas específicas
        this.tabs.onExportTab = (tabName) => {
            console.log(`Iniciando exportação da aba: ${tabName}`);
            
            // Aqui você poderá chamar futuramente:
            // this.exporter.exportMiniReport(tabName, this.filteredData);
            
            alert(`A exportação específica da aba "${tabName}" será processada com os filtros atuais! (Em desenvolvimento)`);
        };

        // Export button - ALTERADO PARA USAR DADOS FILTRADOS
        document.getElementById('exportAnalyticsBtn')?.addEventListener('click', () => {

            // 1. Verificar se há dados filtrados
            if (!this.filteredData || this.filteredData.length === 0) {
                alert("Não há dados filtrados para exportar.");
                return;
            }

            // 2. Capturar a escolha do utilizador no checkbox (NOVO)
            const isDetailed = document.getElementById('detailedExportCheckbox')?.checked || false;

            this.showLoading(true);

            // 3. Preparar objetos temporários para recalcular estatísticas baseadas no FILTRO
            const filteredDetailedAnalytics = {
                byStudent: new Map(),
                byProfessor: new Map(),
                byDiscipline: new Map(),
                byTurma: new Map()
            };

            // 4. Processar os dados filtrados usando a Utility existente
            AnalyticsDataUtils.processDetailedAnalytics(this.filteredData, filteredDetailedAnalytics);

            // 5. Calcular o Sumário baseado APENAS nos dados filtrados
            const summary = this.dataProcessor.calculateSummary(this.filteredData);

            // 6. Converter Maps para Arrays para o exportador
            const studentAnalytics = Array.from(filteredDetailedAnalytics.byStudent.values());
            const professorAnalytics = Array.from(filteredDetailedAnalytics.byProfessor.values());
            const disciplineAnalytics = Array.from(filteredDetailedAnalytics.byDiscipline.values());

            // 7. Obter texto dos filtros ativos para mostrar no cabeçalho
            const activeFiltersText = this.getFormattedActiveFilters();

            // 8. Chamar o exporter com os dados filtrados e a flag do detalhamento (MODIFICADO)
            this.exporter.exportAnalytics(
                summary,
                studentAnalytics,
                professorAnalytics,
                disciplineAnalytics,
                activeFiltersText,
                this.filteredData, // Passamos o array de respostas brutas
                isDetailed         // Passamos se ele quer o detalhamento
            ).finally(() => {
                this.showLoading(false);
            });
        });
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', () => this.loadData());
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

        // Função auxiliar de segurança: só insere o texto se o elemento existir no HTML
        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        safeSetText('totalAvaliacoes', summary.totalAvaliacoes);
        safeSetText('totalAlunos', summary.totalAlunos);
        safeSetText('totalProfessores', summary.totalProfessores);
        safeSetText('totalDisciplinas', summary.totalDisciplinas);
        safeSetText('mediaGeral', summary.mediaGeral);
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