export class AnalyticsCharts {
    constructor() {
        this.charts = {};
    }

    createCategoryChart(data, groupByCategory) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        const categoryData = groupByCategory(data);
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData).map(items => items.length),
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981', 
                        '#f59e0b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createSemesterChart(data, groupBySemester) {
        const ctx = document.getElementById('semesterChart');
        if (!ctx) return;
        
        if (this.charts.semester) {
            this.charts.semester.destroy();
        }
        
        const semesterData = groupBySemester(data);
        
        this.charts.semester = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(semesterData),
                datasets: [{
                    label: 'Média por Semestre',
                    data: Object.values(semesterData).map(items => {
                        const responses = items.filter(item => typeof item.respostaValor === 'number');
                        return responses.length > 0 ? 
                            responses.reduce((sum, item) => sum + item.respostaValor, 0) / responses.length : 0;
                    }),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5
                    }
                }
            }
        });
    }

    createDistributionChart(data) {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;
        
        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }
        
        const responses = data.filter(item => typeof item.respostaValor === 'number');
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        responses.forEach(item => {
            distribution[item.respostaValor]++;
        });
        
        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1 - Discordo Totalmente', '2 - Discordo', '3 - Concordo Parcialmente', '4 - Concordo', '5 - Concordo Totalmente'],
                datasets: [{
                    label: 'Quantidade de Respostas',
                    data: Object.values(distribution),
                    backgroundColor: [
                        '#ef4444',
                        '#f97316',
                        '#eab308',
                        '#22c55e',
                        '#16a34a'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createTimelineChart(data, groupByMonth) {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;
        
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }
        
        const timelineData = groupByMonth(data);
        
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(timelineData),
                datasets: [{
                    label: 'Avaliações por Mês',
                    data: Object.values(timelineData),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}