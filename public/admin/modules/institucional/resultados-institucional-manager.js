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
                <button id="inst-export-pdf-btn" class="btn btn-primary">Exportar Relatório PDF</button>
            </div>

            <div class="dashboard-cards" id="inst-summary-cards">
                <div class="dashboard-card"><div class="card-content"><h3>Total de Respostas</h3><p class="card-number" id="inst-total-responses">0</p></div></div>
                <div class="dashboard-card"><div class="card-content"><h3>Média Geral</h3><p class="card-number" id="inst-avg-rating">0.0</p></div></div>
                <div class="dashboard-card"><div class="card-content"><h3>Respostas de Alunos</h3><p class="card-number" id="inst-aluno-responses">0</p></div></div>
                <div class="dashboard-card"><div class="card-content"><h3>Respostas de Professores</h3><p class="card-number" id="inst-professor-responses">0</p></div></div>
                <div class="dashboard-card"><div class="card-content"><h3>Respostas de Técnicos</h3><p class="card-number" id="inst-tecnico-responses">0</p></div></div>
            </div>

            <div class="charts-grid" id="inst-charts-grid">
                <div class="chart-container"><h3>Distribuição de Respostas</h3><canvas id="inst-responses-chart"></canvas></div>
                <div class="chart-container"><h3>Média por Tipo de Usuário</h3><canvas id="inst-average-by-role-chart"></canvas></div>
            </div>

            <div class="data-table-container" style="margin-top: 2rem;" id="inst-detailed-table-container"></div>
        `;
    }

    setupEventListeners() {
        document.getElementById('inst-results-type-filter')?.addEventListener('change', () => this.loadResults());
        document.getElementById('inst-results-question-filter')?.addEventListener('change', () => this.loadResults());
        document.getElementById('inst-export-pdf-btn')?.addEventListener('click', () => this.exportResultsToPDF());
    }

    async loadQuestionsIntoFilter() {
        this.allQuestions = await this.perguntasCRUD.readAll() || [];
        this.allQuestions.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        const select = document.getElementById('inst-results-question-filter');
        if (!select) return;
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
        this.allResponses = allData.filter(doc => typeFilter === 'all' || doc.userRole === typeFilter);
        this.calculateStatistics();
        this.renderCharts();
        this.renderDetailedTable();
    }

    calculateStatistics() {
        let totalRatings = 0, ratingCount = 0;
        this.allResponses.forEach(res => {
            if (res.answers) {
                Object.values(res.answers).forEach(rating => {
                    totalRatings += parseInt(rating);
                    ratingCount++;
                });
            }
        });
        document.getElementById('inst-total-responses').textContent = this.allResponses.length;
        document.getElementById('inst-avg-rating').textContent = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : '0.0';
        document.getElementById('inst-aluno-responses').textContent = this.allResponses.filter(r => r.userRole === 'aluno').length;
        document.getElementById('inst-professor-responses').textContent = this.allResponses.filter(r => r.userRole === 'professor').length;
        document.getElementById('inst-tecnico-responses').textContent = this.allResponses.filter(r => r.userRole === 'tecnico').length;
    }

    renderCharts() {
        const questionFilter = document.getElementById('inst-results-question-filter').value;
        const distributionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const roleAverages = { aluno: { t: 0, c: 0 }, professor: { t: 0, c: 0 }, tecnico: { t: 0, c: 0 }};

        this.allResponses.forEach(res => {
            if (res.answers) {
                Object.entries(res.answers).forEach(([qId, rating]) => {
                    if (questionFilter === 'all' || qId === questionFilter) {
                        distributionData[rating]++;
                        if (roleAverages[res.userRole]) {
                            roleAverages[res.userRole].t += parseInt(rating);
                            roleAverages[res.userRole].c++;
                        }
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
                    labels: ['1- Discordo T.', '2- Discordo P.', '3- Neutro', '4- Concordo P.', '5- Concordo T.'],
                    datasets: [{
                        label: 'Número de Respostas',
                        data: Object.values(distributionData),
                        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }

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
        const tableDiv = document.getElementById('inst-detailed-table-container');
        if (!tableDiv) return;

        const questionData = {};
        const questionFilter = document.getElementById('inst-results-question-filter').value;
        
        this.allResponses.forEach(response => {
            if (response.answers) {
                Object.entries(response.answers).forEach(([qId, rating]) => {
                     if (questionFilter === 'all' || qId === questionFilter) {
                        if (!questionData[qId]) {
                            questionData[qId] = { total: 0, count: 0, byRole: { aluno: { t: 0, c: 0 }, professor: { t: 0, c: 0 }, tecnico: { t: 0, c: 0 } } };
                        }
                        const r = parseInt(rating);
                        questionData[qId].total += r;
                        questionData[qId].count++;
                        const role = response.userRole;
                        if (questionData[qId].byRole[role]) {
                            questionData[qId].byRole[role].t += r;
                            questionData[qId].byRole[role].c++;
                        }
                    }
                });
            }
        });

        let html = `
            <h3>Detalhamento por Pergunta</h3>
            <table class="data-table">
                <thead><tr>
                    <th>ID</th><th style="width: 40%;">Pergunta</th><th>Média Geral</th>
                    <th>Média Alunos</th><th>Média Professores</th><th>Média Técnicos</th><th>Total Resp.</th>
                </tr></thead>
                <tbody>
        `;
        const sortedQuestions = Object.keys(questionData).sort((a, b) => parseInt(a) - parseInt(b));
        sortedQuestions.forEach(qId => {
            const data = questionData[qId];
            const question = this.allQuestions.find(q => q.id === qId);
            html += `
                <tr>
                    <td>${qId}</td>
                    <td>${question ? question.texto : `Pergunta ${qId}`}</td>
                    <td><strong>${(data.total / data.count).toFixed(2)}</strong></td>
                    <td>${data.byRole.aluno.c > 0 ? (data.byRole.aluno.t / data.byRole.aluno.c).toFixed(2) : 'N/A'}</td>
                    <td>${data.byRole.professor.c > 0 ? (data.byRole.professor.t / data.byRole.professor.c).toFixed(2) : 'N/A'}</td>
                    <td>${data.byRole.tecnico.c > 0 ? (data.byRole.tecnico.t / data.byRole.tecnico.c).toFixed(2) : 'N/A'}</td>
                    <td>${data.count}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        tableDiv.innerHTML = sortedQuestions.length > 0 ? html : '<p style="text-align:center; padding: 2rem;">Nenhuma resposta encontrada com os filtros selecionados.</p>';
    }

    async exportResultsToPDF() {
        alert('Preparando PDF... Isso pode levar alguns segundos.');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const addContentAsImage = async (elementId, doc, yPos) => {
            const element = document.getElementById(elementId);
            if (element) {
                const canvas = await html2canvas(element, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 20; // Margem
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                doc.addImage(imgData, 'PNG', 10, yPos, pdfWidth, pdfHeight);
                return yPos + pdfHeight + 10;
            }
            return yPos;
        };

        doc.setFontSize(20);
        doc.text("Relatório de Avaliação Institucional", doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(12);
        const typeFilterText = document.getElementById('inst-results-type-filter').selectedOptions[0].text;
        const questionFilterText = document.getElementById('inst-results-question-filter').selectedOptions[0].text;
        doc.text(`Filtro de Usuário: ${typeFilterText}`, 14, 25);
        doc.text(`Filtro de Pergunta: ${questionFilterText}`, 14, 32);

        let y = 40;
        
        y = await addContentAsImage('inst-summary-cards', doc, y);
        y = await addContentAsImage('inst-charts-grid', doc, y);

        doc.addPage();
        doc.setFontSize(16);
        doc.text("Detalhamento por Pergunta", 14, 20);
        
        // A função autoTable usa o plugin que adicionamos
        doc.autoTable({
            html: '#inst-detailed-table-container .data-table',
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [22, 160, 133] }, // Cor do cabeçalho
        });

        doc.save(`relatorio-institucional-${new Date().toISOString().slice(0,10)}.pdf`);
    }

    openAddModal() {
        // Esta seção não precisa de um botão "Adicionar".
    }
}