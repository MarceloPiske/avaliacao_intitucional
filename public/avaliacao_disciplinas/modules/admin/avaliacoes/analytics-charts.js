export class AnalyticsCharts {
    constructor() {
        this.charts = {};
        // Palete de cores corporativa e moderna
        this.colors = {
            primary: '#0ea5e9', // Azul Sky
            success: '#10b981', // Verde Emerald
            warning: '#f59e0b', // Laranja Amber
            danger: '#ef4444',  // Vermelho Red
            gray: '#64748b'     // Slate
        };
    }

    createCategoryChart(data, groupByCategory) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        if (this.charts.category) this.charts.category.destroy();
        
        const categoryData = groupByCategory(data);
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
                datasets: [{
                    data: Object.values(categoryData).map(items => items.length),
                    backgroundColor: [this.colors.primary, this.colors.success, this.colors.warning],
                    borderWidth: 0, // Sem borda para visual mais limpo
                    cutout: '70%' // Donut mais fino e elegante
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 4, // Resolução Ultra HD para o PDF
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: 'Helvetica' } } }
                }
            }
        });
    }

    createSemesterChart(data, groupBySemester) {
        const ctx = document.getElementById('semesterChart');
        if (!ctx) return;
        if (this.charts.semester) this.charts.semester.destroy();
        
        const semesterData = groupBySemester(data);
        
        this.charts.semester = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(semesterData),
                datasets: [{
                    label: 'Média por Semestre',
                    data: Object.values(semesterData).map(items => {
                        const responses = items.filter(item => typeof item.respostaValor === 'number');
                        return responses.length > 0 ? responses.reduce((sum, item) => sum + item.respostaValor, 0) / responses.length : 0;
                    }),
                    backgroundColor: this.colors.primary,
                    borderRadius: 6, // Bordas arredondadas (Moderno)
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 4,
                plugins: { legend: { display: false } }, // Esconde legenda óbvia
                scales: {
                    y: { 
                        beginAtZero: true, max: 5,
                        grid: { borderDash: [5, 5], color: '#e2e8f0' } // Grelha pontilhada suave
                    },
                    x: { grid: { display: false } } // Sem grelha no eixo X
                }
            }
        });
    }

    createDistributionChart(data) {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;
        if (this.charts.distribution) this.charts.distribution.destroy();
        
        const responses = data.filter(item => typeof item.respostaValor === 'number');
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        responses.forEach(item => distribution[item.respostaValor]++);
        
        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1 (Crítico)', '2 (Atenção)', '3 (Regular)', '4 (Bom)', '5 (Excelente)'],
                datasets: [{
                    data: Object.values(distribution),
                    backgroundColor: [this.colors.danger, this.colors.warning, '#eab308', this.colors.success, '#059669'],
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 4,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { borderDash: [5, 5], color: '#e2e8f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => { if (chart) chart.destroy(); });
        this.charts = {};
    }
}