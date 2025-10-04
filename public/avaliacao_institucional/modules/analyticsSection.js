import { db } from './firebaseConfig.js';
import { collection, getDocs } from "firebase/firestore";

export function setupAnalyticsSection() {
    const dimensionFilter = document.getElementById('dimension-filter-admin');
    const yearFilter = document.getElementById('year-filter-admin');
    const groupFilter = document.getElementById('group-filter-admin');
    const axisFilter = document.getElementById('axis-filter-admin');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const chartsContainer = document.getElementById('charts-container');

    let currentCharts = [];

    // Load filter options
    loadFilterOptions();

    // Event listeners
    [dimensionFilter, yearFilter, groupFilter, axisFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', renderAnalytics);
        }
    });

    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPdf);
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

    // Initial render
    renderAnalytics();

    async function loadFilterOptions() {
        try {
            const response = await fetch('avaliacao_cpa_perguntas.json');
            const questions = await response.json();

            const dimensions = [...new Set(questions.map(q => `Eixo ${q.eixo} - Dimensão ${q.dimensao}`))];
            dimensions.sort();

            const axes = [...new Set(questions.map(q => q.eixo))];
            axes.sort((a, b) => parseInt(a) - parseInt(b));

            dimensions.forEach(dimension => {
                const option = document.createElement('option');
                option.value = dimension;
                option.textContent = dimension;
                if (dimensionFilter) dimensionFilter.appendChild(option);
            });

            axes.forEach(axis => {
                const option = document.createElement('option');
                option.value = axis;
                option.textContent = `Eixo ${axis}`;
                if (axisFilter) axisFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar opções de filtro:', error);
        }
    }

    async function renderAnalytics() {
        chartsContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const questions = await loadQuestionsMapping();

            const selectedDimension = dimensionFilter.value;
            const selectedYear = yearFilter.value;
            const selectedGroup = groupFilter.value;
            const selectedAxis = axisFilter.value;

            const responsesCol = collection(db, 'responses');
            const responseSnapshot = await getDocs(responsesCol);
            
            const filteredData = filterData(responseSnapshot, questions, {
                dimension: selectedDimension,
                year: selectedYear,
                group: selectedGroup,
                axis: selectedAxis
            });

            updateSummaryCards(filteredData);
            renderCharts(filteredData, questions);
        } catch (error) {
            console.error('Erro ao carregar análises:', error);
            chartsContainer.innerHTML = '<p>Erro ao carregar dados. Tente novamente.</p>';
        }
    }

    function filterData(responseSnapshot, questions, filters) {
        const data = {
            responses: [],
            groupData: {
                alunos: { count: 0, ratings: 0, sum: 0 },
                professores: { count: 0, ratings: 0, sum: 0 },
                tecnicos: { count: 0, ratings: 0, sum: 0 }
            },
            axisData: {},
            dimensionData: {},
            questionData: {}
        };

        responseSnapshot.forEach(doc => {
            const responseData = doc.data();
            const userType = responseData.userType || responseData.tipo;
            
            // Handle timestamp properly
            let yearResponse = 'unknown';
            if (responseData.timestamp) {
                const date = responseData.timestamp.toDate ? responseData.timestamp.toDate() : new Date(responseData.timestamp);
                yearResponse = date.getFullYear().toString();
            } else if (responseData.submittedAt) {
                yearResponse = new Date(responseData.submittedAt).getFullYear().toString();
            }

            if (filters.group !== 'all' && userType !== filters.group) return;
            if (filters.year !== 'all' && yearResponse !== filters.year) return;

            data.responses.push({ id: doc.id, ...responseData });

            if (data.groupData[userType]) {
                data.groupData[userType].count++;
            }

            const answers = responseData.answers || responseData.respostas || {};
            Object.keys(answers).forEach(questionId => {
                const value = parseInt(answers[questionId]);
                if (isNaN(value)) return;

                const question = questions.find(q => q.id == questionId);
                if (!question) return;

                const questionDimension = `Eixo ${question.eixo} - Dimensão ${question.dimensao}`;
                const questionAxis = question.eixo;

                if (filters.dimension !== 'all' && questionDimension !== filters.dimension) return;
                if (filters.axis !== 'all' && questionAxis !== filters.axis) return;

                if (data.groupData[userType]) {
                    data.groupData[userType].sum += value;
                    data.groupData[userType].ratings++;
                }

                if (!data.axisData[questionAxis]) {
                    data.axisData[questionAxis] = { sum: 0, count: 0 };
                }
                data.axisData[questionAxis].sum += value;
                data.axisData[questionAxis].count++;

                const dimensionKey = `${question.eixo}-${question.dimensao}`;
                if (!data.dimensionData[dimensionKey]) {
                    data.dimensionData[dimensionKey] = {
                        sum: 0,
                        count: 0,
                        label: questionDimension
                    };
                }
                data.dimensionData[dimensionKey].sum += value;
                data.dimensionData[dimensionKey].count++;

                if (!data.questionData[questionId]) {
                    data.questionData[questionId] = {
                        question: question.texto,
                        dimension: questionDimension,
                        axis: questionAxis,
                        responses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    };
                }
                data.questionData[questionId].responses[value]++;
            });
        });

        return data;
    }

    async function updateSummaryCards(filteredData) {
        const totalResponses = filteredData.responses.length;

        let totalRatingsSum = 0;
        let totalRatingsCount = 0;

        Object.values(filteredData.groupData).forEach(group => {
            totalRatingsSum += group.sum;
            totalRatingsCount += group.ratings;
        });

        const averageRating = totalRatingsCount > 0 ? (totalRatingsSum / totalRatingsCount).toFixed(1) : '0.0';

        const userSnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = userSnapshot.size;

        const uniqueUserIds = new Set(filteredData.responses.map(r => r.userId).filter(Boolean));
        const participationRate = totalUsers > 0 ? Math.round((uniqueUserIds.size / totalUsers) * 100) : 0;

        document.getElementById('total-responses').textContent = totalResponses;
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('participation-rate').textContent = `${participationRate}%`;
        document.getElementById('average-rating').textContent = averageRating;
    }

    function renderCharts(filteredData, questions) {
        currentCharts.forEach(chart => chart.destroy());
        currentCharts = [];

        chartsContainer.innerHTML = '';

        renderParticipationChart(filteredData);
        renderDimensionChart(filteredData);
        renderAxisChart(filteredData);
        renderQuestionDetailsCharts(filteredData);
    }

    function renderParticipationChart(filteredData) {
        const chartWrapper = createChartWrapper('Participação por Grupo');
        chartsContainer.appendChild(chartWrapper);

        const canvas = chartWrapper.querySelector('canvas');

        const labels = ['Discentes', 'Docentes', 'Técnicos Administrativos'];
        const data = [
            filteredData.groupData.alunos.count,
            filteredData.groupData.professores.count,
            filteredData.groupData.tecnicos.count
        ];

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de Respostas',
                    data: data,
                    backgroundColor: [
                        'rgba(75, 108, 183, 0.7)',
                        'rgba(56, 239, 125, 0.7)',
                        'rgba(238, 168, 73, 0.7)'
                    ],
                    borderColor: [
                        'rgba(75, 108, 183, 1)',
                        'rgba(56, 239, 125, 1)',
                        'rgba(238, 168, 73, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        currentCharts.push(chart);
    }

    function renderDimensionChart(filteredData) {
        const chartWrapper = createChartWrapper('Avaliação Média por Dimensão');
        chartsContainer.appendChild(chartWrapper);

        const canvas = chartWrapper.querySelector('canvas');

        const dimensions = Object.keys(filteredData.dimensionData).sort();
        const labels = dimensions.map(d => filteredData.dimensionData[d].label);
        const data = dimensions.map(d => {
            const dim = filteredData.dimensionData[d];
            return dim.count > 0 ? (dim.sum / dim.count).toFixed(2) : 0;
        });

        const chart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média por Dimensão',
                    data: data,
                    backgroundColor: 'rgba(75, 108, 183, 0.2)',
                    borderColor: 'rgba(75, 108, 183, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(75, 108, 183, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

        currentCharts.push(chart);
    }

    function renderAxisChart(filteredData) {
        const chartWrapper = createChartWrapper('Avaliação Média por Eixo');
        chartsContainer.appendChild(chartWrapper);

        const canvas = chartWrapper.querySelector('canvas');

        const axes = Object.keys(filteredData.axisData).sort((a, b) => parseInt(a) - parseInt(b));
        const labels = axes.map(a => `Eixo ${a}`);
        const data = axes.map(a => {
            const axis = filteredData.axisData[a];
            return axis.count > 0 ? (axis.sum / axis.count).toFixed(2) : 0;
        });

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média por Eixo',
                    data: data,
                    backgroundColor: 'rgba(238, 168, 73, 0.7)',
                    borderColor: 'rgba(238, 168, 73, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        currentCharts.push(chart);
    }

    function renderQuestionDetailsCharts(filteredData) {
        const sortedQuestions = Object.keys(filteredData.questionData)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .slice(0, 10);

        sortedQuestions.forEach(questionId => {
            const questionData = filteredData.questionData[questionId];
            const chartWrapper = createChartWrapper(questionData.question);
            chartsContainer.appendChild(chartWrapper);

            const canvas = chartWrapper.querySelector('canvas');

            const labels = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];
            const data = [
                questionData.responses[1],
                questionData.responses[2],
                questionData.responses[3],
                questionData.responses[4],
                questionData.responses[5]
            ];

            const chart = new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(153, 102, 255, 0.7)',
                            'rgba(255, 102, 102, 0.7)',
                            'rgba(238, 168, 73, 0.7)',
                            'rgba(56, 239, 125, 0.7)',
                            'rgba(75, 108, 183, 0.7)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });

            currentCharts.push(chart);
        });
    }

    function createChartWrapper(title) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-container';

        const header = document.createElement('div');
        header.className = 'chart-header';

        const h3 = document.createElement('h3');
        h3.className = 'chart-title';
        h3.textContent = title;
        header.appendChild(h3);

        const canvas = document.createElement('canvas');

        wrapper.appendChild(header);
        wrapper.appendChild(canvas);

        return wrapper;
    }

    async function loadQuestionsMapping() {
        try {
            const response = await fetch('avaliacao_cpa_perguntas.json');
            return await response.json();
        } catch (error) {
            console.error("Error loading questions mapping:", error);
            return [];
        }
    }

    async function exportToPdf() {
        alert('Função de exportação PDF será implementada em breve.');
    }

    async function exportToExcel() {
        alert('Função de exportação Excel será implementada em breve.');
    }
}