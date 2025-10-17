// /public/admin/modules/resultados_institucional/resultados-institucional-manager.js

import { FirebaseCRUD } from '../../../shared/modules/firebase.js';

export class ResultadosInstitucionalManager {
    constructor() {
        this.respostasCRUD = new FirebaseCRUD("respostas_avaliacao_institucional");
        this.perguntasCRUD = new FirebaseCRUD("perguntas_avaliacao_institucional");

        this.allResponses = [];
        this.allQuestions = [];
        this.responsesChart = null;
        this.averageChart = null;
    }

    async loadData() {
        this.renderLayout();
        await this.loadQuestionsIntoFilter();
        await this.loadResults();
        this.setupEventListeners();
    }

    renderLayout() {
        const container = document.getElementById('resultados-institucional-section');
        if (!container) return;

        container.innerHTML = `
            <div class.section-header>
                <h2>Resultados da Avaliação Institucional</h2>
            </div>
            <div class="section-filters">
                <div class="filter-group">
                    <label for="inst-results-type-filter">Tipo de Usuário:</label>
                    <select id="inst-results-type-filter">
                        <option value="all">Todos</option>
                        <option value="aluno">Alunos</option>
                        <option value="professor">Professores</option>
                        <option value="tecnico">Técnicos</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="inst-results-question-filter">Pergunta Específica:</label>
                    <select id="inst-results-question-filter">
                        <option value="all">Todas as Perguntas</option>
                    </select>
                </div>
                <button id="inst-export-pdf-btn" class="btn btn-primary">Exportar PDF</button>
            </div>

             <div class="dashboard-cards" id="inst-summary-cards">
                <div class="dashboard-card">
                    <div class="card-content"><h3>Total de Respostas</h3><p class="card-number" id="inst-total-responses">0</p></div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content"><h3>Média Geral</h3><p class="card-number" id="inst-avg-rating">0.0</p></div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content"><h3>Respostas de Alunos</h3><p class="card-number" id="inst-aluno-responses">0</p></div>
                </div>
                <div class="dashboard-card">
                    <div class="card-content"><h3>Respostas de Professores</h3><p class="card-number" id="inst-professor-responses">0</p></div>
                </div>
                 <div class="dashboard-card">
                    <div class="card-content"><h3>Respostas de Técnicos</h3><p class="card-number" id="inst-tecnico-responses">0</p></div>
                </div>
            </div>

            <div class="charts-grid" id="inst-charts-grid">
                <div class="chart-container">
                    <h3>Distribuição de Respostas</h3>
                    <canvas id="inst-responses-chart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Média por Tipo de Usuário</h3>
                    <canvas id="inst-average-by-role-chart"></canvas>
                </div>
            </div>

            <div class="data-table-container" style="margin-top: 2rem;">
                <div id="inst-detailed-results-table">
                    </div>
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('inst-results-type-filter')?.addEventListener('change', () => this.loadResults());
        document.getElementById('inst-results-question-filter')?.addEventListener('change', () => this.loadResults());
        document.getElementById('inst-export-pdf-btn')?.addEventListener('click', () => this.exportResultsAsPDF());
    }

    async loadQuestionsIntoFilter() {
        this.allQuestions = await this.perguntasCRUD.readAll() || [];
        this.allQuestions.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        
        const select = document.getElementById('inst-results-question-filter');
        if(!select) return;

        select.innerHTML = '<option value="all">Todas as Perguntas</option>';
        this.allQuestions.forEach(q => {
            const option = document.createElement('option');
            option.value = q.id;
            option.textContent = `${q.id} - ${q.texto.substring(0, 70)}...`;
            select.appendChild(option);
        });
    }

    async loadResults() {
        const typeFilter = document.getElementById('inst-results-type-filter').value;
        const allData = await this.respostasCRUD.readAll() || [];
        
        this.allResponses = allData.filter(doc => {
            return typeFilter === 'all' || doc.userRole === typeFilter;
        });

        this.calculateStatistics();
        this.renderCharts();
        this.renderDetailedTable();
    }

    calculateStatistics() {
        const totalResponses = this.allResponses.length;
        const alunoResponses = this.allResponses.filter(r => r.userRole === 'aluno').length;
        const professorResponses = this.allResponses.filter(r => r.userRole === 'professor').length;
        const tecnicoResponses = this.allResponses.filter(r => r.userRole === 'tecnico').length;
        
        let totalRatings = 0, ratingCount = 0;
        this.allResponses.forEach(res => {
            if (res.answers) {
                Object.values(res.answers).forEach(rating => {
                    totalRatings += parseInt(rating);
                    ratingCount++;
                });
            }
        });
        
        const avgRating = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : '0.0';

        document.getElementById('inst-total-responses').textContent = totalResponses;
        document.getElementById('inst-avg-rating').textContent = avgRating;
        document.getElementById('inst-aluno-responses').textContent = alunoResponses;
        document.getElementById('inst-professor-responses').textContent = professorResponses;
        document.getElementById('inst-tecnico-responses').textContent = tecnicoResponses;
    }

    renderCharts() {
        const questionFilter = document.getElementById('inst-results-question-filter').value;
        
        // --- Distribution Chart ---
        const distributionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.allResponses.forEach(res => {
            if (res.answers) {
                Object.entries(res.answers).forEach(([qId, rating]) => {
                    if (questionFilter === 'all' || qId === questionFilter) {
                        distributionData[rating]++;
                    }
                });
            }
        });
        
        const ctx1 = document.getElementById('inst-responses-chart')?.getContext('2d');
        if (this.responsesChart) this.responsesChart.destroy();
        if (ctx1) {
            this.responsesChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['1', '2', '3', '4', '5'],
                    datasets: [{
                        label: 'Número de Respostas',
                        data: Object.values(distributionData),
                        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }

        // --- Average by Role Chart ---
        const roleAverages = { aluno: { t: 0, c: 0 }, professor: { t: 0, c: 0 }, tecnico: { t: 0, c: 0 } };
        this.allResponses.forEach(res => {
            if (res.answers && roleAverages[res.userRole]) {
                Object.entries(res.answers).forEach(([qId, rating]) => {
                    if (questionFilter === 'all' || qId === questionFilter) {
                        roleAverages[res.userRole].t += parseInt(rating);
                        roleAverages[res.userRole].c++;
                    }
                });
            }
        });

        const avgData = [
            roleAverages.aluno.c > 0 ? (roleAverages.aluno.t / roleAverages.aluno.c) : 0,
            roleAverages.professor.c > 0 ? (roleAverages.professor.t / roleAverages.professor.c) : 0,
            roleAverages.tecnico.c > 0 ? (roleAverages.tecnico.t / roleAverages.tecnico.c) : 0,
        ];
        
        const ctx2 = document.getElementById('inst-average-by-role-chart')?.getContext('2d');
        if (this.averageChart) this.averageChart.destroy();
        if (ctx2) {
            this.averageChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Alunos', 'Professores', 'Técnicos'],
                    datasets: [{
                        label: 'Média de Avaliação',
                        data: avgData,
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5 } } }
            });
        }
    }

    renderDetailedTable() {
        const tableDiv = document.getElementById('inst-detailed-results-table');
        if (!tableDiv) return;

        const questionData = {};
        this.allResponses.forEach(response => {
            if (response.answers) {
                Object.entries(response.answers).forEach(([qId, rating]) => {
                    if (!questionData[qId]) {
                        questionData[qId] = { total: 0, count: 0, ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }};
                    }
                    const r = parseInt(rating);
                    questionData[qId].ratings[r]++;
                    questionData[qId].total += r;
                    questionData[qId].count++;
                });
            }
        });

        let html = `
            <table class="data-table">
                <thead><tr>
                    <th>ID</th>
                    <th style="width: 50%;">Pergunta</th>
                    <th>Média Geral</th>
                    <th>Total Respostas</th>
                    <th>Distribuição (1-5)</th>
                </tr></thead>
                <tbody>
        `;

        const sortedQuestions = Object.keys(questionData).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedQuestions.forEach(qId => {
            const data = questionData[qId];
            const question = this.allQuestions.find(q => q.id === qId);
            const questionText = question ? question.texto : `Pergunta ${qId}`;
            const avgGeneral = (data.total / data.count).toFixed(2);
            
            html += `
                <tr>
                    <td>${qId}</td>
                    <td>${questionText}</td>
                    <td><strong>${avgGeneral}</strong></td>
                    <td>${data.count}</td>
                    <td><small>1:${data.ratings[1]} | 2:${data.ratings[2]} | 3:${data.ratings[3]} | 4:${data.ratings[4]} | 5:${data.ratings[5]}</small></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        tableDiv.innerHTML = sortedQuestions.length > 0 ? html : '<p style="text-align:center; padding: 2rem;">Nenhuma resposta encontrada.</p>';
    }

    async exportResultsAsPDF() {
        alert('Preparando PDF... Isso pode levar alguns segundos.');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const summary = document.getElementById('inst-summary-cards');
        const charts = document.getElementById('inst-charts-grid');
        const table = document.getElementById('inst-detailed-results-table');

        doc.text("Relatório de Avaliação Institucional", 14, 20);
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);
        
        let y = 40;

        // 1. Adicionar Resumo
        if (summary) {
            doc.setFontSize(16);
            doc.text("Resumo Geral", 14, y);
            y += 10;
            const summaryCanvas = await html2canvas(summary);
            const summaryImg = summaryCanvas.toDataURL('image/png');
            doc.addImage(summaryImg, 'PNG', 14, y, 180, 0);
            y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : y + 50; // Ajuste
        }

        // 2. Adicionar Gráficos
        if (charts) {
            doc.addPage();
            y = 20;
            doc.setFontSize(16);
            doc.text("Gráficos Visuais", 14, y);
            y += 10;
            const chartsCanvas = await html2canvas(charts);
            const chartsImg = chartsCanvas.toDataURL('image/png');
            doc.addImage(chartsImg, 'PNG', 14, y, 180, 0);
        }

        // 3. Adicionar Tabela Detalhada
        if (table) {
            doc.addPage();
            doc.setFontSize(16);
            doc.text("Detalhamento por Pergunta", 14, 20);
            doc.autoTable({
                html: '#inst-detailed-results-table .data-table',
                startY: 30,
                theme: 'grid'
            });
        }
        
        doc.save(`relatorio-institucional-${new Date().toISOString().slice(0,10)}.pdf`);
    }

    openAddModal() {
        // Esta seção não tem um botão "Adicionar".
    }
}