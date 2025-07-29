export class AnalyticsFilters {
    constructor() {
        this.onFilterChange = null;
        this.availableStudents = [];
        this.availableProfessors = [];
        this.availableDisciplines = [];
    }

    setupEventListeners() {
        const filterIds = [
            'yearFilter', 'semesterFilter', 'professorAnalyticsFilter', 
            'disciplinaAnalyticsFilter', 'categoryAnalyticsFilter', 
            'studentAnalyticsFilter', 'formularioAnalyticsFilter',
            'statusTurmaFilter', 'dateRangeStart', 'dateRangeEnd'
        ];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.handleFilterChange());
            }
        });

        // Search with debounce
        let searchTimeout;
        const searchInput = document.getElementById('searchAnalyticsInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.handleFilterChange(), 300);
            });
        }

        // Advanced filters toggle
        const advancedToggle = document.getElementById('advancedFiltersToggle');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => this.toggleAdvancedFilters());
        }

        // Clear filters button
        const clearFilters = document.getElementById('clearFiltersBtn');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearAllFilters());
        }
    }

    populateFilters(processedData) {
        const years = [...new Set(processedData.map(item => item.year))].sort().reverse();
        const semesters = [...new Set(processedData.map(item => item.semestre))].sort().reverse();
        const professors = [...new Set(processedData.map(item => item.professorNome))].sort();
        const disciplines = [...new Set(processedData.map(item => item.disciplinaNome))].sort();
        const formularios = [...new Set(processedData.map(item => item.formularioTitulo))].sort();
        const statusOptions = [...new Set(processedData.map(item => item.statusTurma))].sort();
        
        this.availableProfessors = professors;
        this.availableDisciplines = disciplines;
        
        this.populateSelect('yearFilter', years);
        this.populateSelect('semesterFilter', semesters);
        this.populateSelect('professorAnalyticsFilter', professors);
        this.populateSelect('disciplinaAnalyticsFilter', disciplines);
        this.populateSelect('formularioAnalyticsFilter', formularios);
        this.populateSelect('statusTurmaFilter', statusOptions);
        
        // Set default values to current year and semester if available
        if (years.length > 0) {
            document.getElementById('yearFilter').value = years[0];
        }
        if (semesters.length > 0) {
            document.getElementById('semesterFilter').value = semesters[0];
        }
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        const firstOption = select.options[0];
        
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        
        if (options.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    getCurrentFilters() {
        return {
            year: document.getElementById('yearFilter')?.value || 'all',
            semester: document.getElementById('semesterFilter')?.value || 'all',
            professor: document.getElementById('professorAnalyticsFilter')?.value || 'all',
            discipline: document.getElementById('disciplinaAnalyticsFilter')?.value || 'all',
            formulario: document.getElementById('formularioAnalyticsFilter')?.value || 'all',
            statusTurma: document.getElementById('statusTurmaFilter')?.value || 'all',
            category: document.getElementById('categoryAnalyticsFilter')?.value || 'all',
            search: document.getElementById('searchAnalyticsInput')?.value || '',
            dateStart: document.getElementById('dateRangeStart')?.value || '',
            dateEnd: document.getElementById('dateRangeEnd')?.value || ''
        };
    }

    applyFilters(data) {
        const filters = this.getCurrentFilters();
        
        return data.filter(item => {
            if (filters.year !== 'all' && item.year !== filters.year) return false;
            if (filters.semester !== 'all' && item.semestre !== filters.semester) return false;
            if (filters.professor !== 'all' && item.professorNome !== filters.professor) return false;
            if (filters.discipline !== 'all' && item.disciplinaNome !== filters.discipline) return false;
            if (filters.formulario !== 'all' && item.formularioTitulo !== filters.formulario) return false;
            if (filters.statusTurma !== 'all' && item.statusTurma !== filters.statusTurma) return false;
            if (filters.category !== 'all' && item.tipo !== filters.category) return false;
            if (filters.search && !item.questaoTexto.toLowerCase().includes(filters.search.toLowerCase())) return false;
            
            // Date range filter
            if (filters.dateStart || filters.dateEnd) {
                const itemDate = item.dataResposta?.toDate ? item.dataResposta.toDate() : new Date(item.dataResposta);
                if (filters.dateStart && itemDate < new Date(filters.dateStart)) return false;
                if (filters.dateEnd && itemDate > new Date(filters.dateEnd)) return false;
            }
            
            return true;
        });
    }

    toggleAdvancedFilters() {
        const advancedSection = document.getElementById('advancedFiltersSection');
        const toggleIcon = document.querySelector('#advancedFiltersToggle .material-icons');
        
        if (advancedSection) {
            const isVisible = advancedSection.style.display !== 'none';
            advancedSection.style.display = isVisible ? 'none' : 'block';
            if (toggleIcon) {
                toggleIcon.textContent = isVisible ? 'expand_more' : 'expand_less';
            }
        }
    }

    clearAllFilters() {
        const filterIds = [
            'yearFilter', 'semesterFilter', 'professorAnalyticsFilter', 
            'disciplinaAnalyticsFilter', 'categoryAnalyticsFilter', 
            'formularioAnalyticsFilter', 'statusTurmaFilter', 'searchAnalyticsInput',
            'dateRangeStart', 'dateRangeEnd'
        ];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'text' || element.type === 'date' || element.type === 'search') {
                    element.value = '';
                } else {
                    element.selectedIndex = 0;
                }
            }
        });
        
        this.handleFilterChange();
    }

    getActiveFiltersCount() {
        const filters = this.getCurrentFilters();
        let count = 0;
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all' && value !== '') {
                count++;
            }
        });
        
        return count;
    }

    updateFilterIndicator() {
        const count = this.getActiveFiltersCount();
        const indicator = document.getElementById('activeFiltersCount');
        if (indicator) {
            indicator.textContent = count;
            indicator.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    handleFilterChange() {
        this.updateFilterIndicator();
        if (this.onFilterChange) {
            this.onFilterChange();
        }
    }
}