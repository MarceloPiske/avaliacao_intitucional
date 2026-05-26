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
        
        // Escutar cliques para exportar abas específicas
        this.tabs.onExportTab = (tabName) => {
            console.log(`Iniciando exportação da aba: ${tabName}`);
            alert(`A exportação específica da aba "${tabName}" será processada com os filtros atuais! (Em desenvolvimento)`);
        };

        // ==========================================
        // LÓGICA DE EXPORTAÇÃO PRINCIPAL E MODAL
        // ==========================================
        
        // 1. Botão de Exportação Principal
        document.getElementById('exportAnalyticsBtn')?.addEventListener('click', () => {
            if (!this.filteredData || this.filteredData.length === 0) {
                alert("Não há dados filtrados para exportar.");
                return;
            }

            const isDetailed = document.getElementById('detailedExportCheckbox')?.checked || false;

            if (isDetailed) {
                // Se detalhado, abre o modal para escolher as colunas
                this.openColumnsSelectionModal();
            } else {
                // Exportação executiva direta
                this.executeExport(false, null);
            }
        });

        // 2. Botões do Modal de Colunas
        document.getElementById('cancelExportBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('exportColumnsModal');
            if (modal) modal.style.display = 'none';
        });

        document.getElementById('confirmCustomExportBtn')?.addEventListener('click', () => {
            const selectedCheckboxes = document.querySelectorAll('.column-checkbox:checked');
            const selectedQuestions = Array.from(selectedCheckboxes).map(cb => cb.value);
            
            if (selectedQuestions.length === 0) {
                alert("Por favor, selecione pelo menos uma coluna para o relatório detalhado.");
                return;
            }

            const modal = document.getElementById('exportColumnsModal');
            if (modal) modal.style.display = 'none';
            
            this.executeExport(true, selectedQuestions);
        });

        // 3. Controlos de Seleção Rápida no Modal
        document.getElementById('selectAllColumnsBtn')?.addEventListener('click', () => {
            document.querySelectorAll('.column-checkbox').forEach(cb => cb.checked = true);
        });
        
        document.getElementById('deselectAllColumnsBtn')?.addEventListener('click', () => {
            document.querySelectorAll('.column-checkbox').forEach(cb => cb.checked = false);
        });

        // Botão de Refresh
        document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', () => this.loadData());
    }

    // ==========================================
    // MÉTODOS DE APOIO À EXPORTAÇÃO
    // ==========================================

    openColumnsSelectionModal() {
        const container = document.getElementById('columnsCheckboxList');
        
        if (!container) {
            console.warn("Modal de colunas não encontrado no HTML. A exportar todas as colunas.");
            this.executeExport(true, null);
            return;
        }

        container.innerHTML = ''; // Limpar opções anteriores

        // Helper para criar Títulos (DRY)
        const createCategoryTitle = (titleText, isFirst = false) => {
            const catTitle = document.createElement('h4');
            catTitle.textContent = titleText;
            catTitle.style.margin = '16px 0 12px 0';
            catTitle.style.color = 'var(--text-primary)';
            catTitle.style.fontSize = '14px';
            catTitle.style.fontWeight = '600';
            catTitle.style.borderBottom = '1px solid var(--border-color)';
            catTitle.style.paddingBottom = '6px';
            if (isFirst) catTitle.style.marginTop = '0';
            return catTitle;
        };

        // Helper para criar Checkboxes (DRY)
        const createCheckbox = (text, value) => {
            const label = document.createElement('label');
            label.className = 'sm-checkbox';
            label.style.marginBottom = '12px';
            label.style.alignItems = 'flex-start';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'column-checkbox';
            checkbox.value = value;
            checkbox.checked = true;

            const fakeBox = document.createElement('div');
            fakeBox.className = 'checkbox-box';
            fakeBox.style.marginTop = '2px';
            fakeBox.style.flexShrink = '0';

            const textSpan = document.createElement('span');
            textSpan.textContent = text;
            textSpan.style.fontSize = '13px';
            textSpan.style.color = 'var(--text-primary)';
            textSpan.style.lineHeight = '1.4';
            textSpan.style.marginLeft = '10px';

            label.appendChild(checkbox);
            label.appendChild(fakeBox);
            label.appendChild(textSpan);
            return label;
        };

        const uniqueQuestions = [...new Set(this.filteredData.map(item => item.questaoTexto))].filter(Boolean);

        if (uniqueQuestions.length === 0) {
            alert("Não há dados detalhados disponíveis para os filtros atuais.");
            return;
        }

        const categories = {
            'disciplina': 'Avaliação da Disciplina',
            'professor': 'Avaliação do Professor',
            'aluno': 'Autoavaliação do Aluno'
        };

        const questionsByType = AnalyticsDataUtils.groupByCategory(this.filteredData);
        let isFirstCategory = true;

        // 1. Renderiza as categorias objetivas
        Object.keys(questionsByType).forEach(tipo => {
            if (questionsByType[tipo].length === 0) return;
            
            container.appendChild(createCategoryTitle(categories[tipo] || tipo.toUpperCase(), isFirstCategory));
            isFirstCategory = false;

            const uniqueQuestionsForType = [...new Set(questionsByType[tipo].map(item => item.questaoTexto))].filter(Boolean);
            uniqueQuestionsForType.forEach(question => {
                container.appendChild(createCheckbox(question, question));
            });
        });

        // 2. Renderiza a categoria de Questões Discursivas (Comentários e Sugestões)
        const hasComentarios = this.filteredData.some(item => item.comentarios && item.comentarios.trim() !== '');
        const hasSugestoes = this.filteredData.some(item => item.sugestoes && item.sugestoes.trim() !== '');

        if (hasComentarios || hasSugestoes) {
            container.appendChild(createCategoryTitle('Questões Discursivas', isFirstCategory));
            // Usamos chaves especiais para não conflitar com perguntas objetivas
            if (hasComentarios) container.appendChild(createCheckbox('Comentários Gerais', '_DISCURSIVA_COMENTARIOS_'));
            if (hasSugestoes) container.appendChild(createCheckbox('Sugestões', '_DISCURSIVA_SUGESTOES_'));
        }

        // Mostrar o modal
        const modal = document.getElementById('exportColumnsModal');
        if (modal) modal.style.display = 'flex';
    }

    executeExport(isDetailed, selectedQuestions) {
        this.showLoading(true);

        // 1. Preparar objetos temporários para recalcular estatísticas baseadas no FILTRO
        const filteredDetailedAnalytics = {
            byStudent: new Map(),
            byProfessor: new Map(),
            byDiscipline: new Map(),
            byTurma: new Map()
        };

        // 2. Processar os dados filtrados
        AnalyticsDataUtils.processDetailedAnalytics(this.filteredData, filteredDetailedAnalytics);

        // 3. Calcular o Sumário baseado APENAS nos dados filtrados
        const summary = this.dataProcessor.calculateSummary(this.filteredData);

        // 4. Converter Maps para Arrays para o exportador
        const studentAnalytics = Array.from(filteredDetailedAnalytics.byStudent.values());
        const professorAnalytics = Array.from(filteredDetailedAnalytics.byProfessor.values());
        const disciplineAnalytics = Array.from(filteredDetailedAnalytics.byDiscipline.values());

        // 5. Obter texto dos filtros
        const activeFiltersText = this.getFormattedActiveFilters();

        // 6. Chamar o exporter enviando a lista de questões selecionadas
        this.exporter.exportAnalytics(
            summary,
            studentAnalytics,
            professorAnalytics,
            disciplineAnalytics,
            activeFiltersText,
            this.filteredData,
            isDetailed,
            selectedQuestions // Novo parâmetro
        ).finally(() => {
            this.showLoading(false);
        });
    }

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

    // ==========================================
    // FLUXO DE DADOS PRINCIPAL E UI
    // ==========================================

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