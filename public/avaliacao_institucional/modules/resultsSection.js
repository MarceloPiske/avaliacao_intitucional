import { db } from '../../avaliacao_disciplinas/modules/shared/firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { exportResultsToPDF } from './pdfExport.js';

export function initResultsSection() {
    const section = document.getElementById('results-section');
    
    const style = document.createElement('style');
    style.innerHTML = `
        * { box-sizing: border-box; } /* Corrige o bug de overflow dos inputs e tabelas globais */
        
        .users-header-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
        .users-header-modern h2 { margin: 0; font-size: 24px; color: #0f172a; font-weight: 700; }
        .users-header-modern p { margin: 4px 0 0 0; color: #64748b; font-size: 14px; }

        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .kpi-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; justify-content: center; align-items: center; color: white; }
        .kpi-icon .material-icons { font-size: 24px; }
        .kpi-info h4 { margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-info span { font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.2; }

        .toolbar-modern { background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .filters-group { display: flex; gap: 12px; flex: 1; }
        .modern-select { flex: 1; padding: 10px 32px 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; appearance: none; background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>') no-repeat right 10px center; background-color: white; }
        .modern-select:focus { border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1); }
        
        .modern-btn { padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none; transition: 0.2s; }
        .btn-primary { background: #a855f7; color: white; }
        .btn-primary:hover { background: #9333ea; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3); }
        .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
        .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .chart-header { margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .chart-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }

        .modern-table-container { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow-x: auto; margin-bottom: 24px;}
        .modern-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .modern-table th { background: #f8fafc; padding: 14px 20px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .modern-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; vertical-align: middle; }
        .modern-table tr:hover { background: #f8fafc; }
        .question-id-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 24px; background: #f1f5f9; color: #475569; border-radius: 6px; font-weight: 700; font-size: 12px; }

        /* Mini-barra de distribuição dentro da tabela */
        .dist-bar-container { width: 100%; height: 8px; border-radius: 4px; background: #f1f5f9; display: flex; overflow: hidden; margin-bottom: 4px; }
        .dist-segment { height: 100%; }
        .dist-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: 600; }

        @media(max-width: 1024px) { .charts-grid { grid-template-columns: 1fr; } }
        @media(max-width: 768px) { .filters-group { flex-direction: column; } .users-header-modern { flex-direction: column; align-items: flex-start; gap: 16px; } }
    `;
    document.head.appendChild(style);

    section.innerHTML = `
        <div class="users-header-modern">
            <div>
                <h2>Análise de Resultados (CPA)</h2>
                <p>Métricas, gráficos e relatórios detalhados das avaliações institucionais.</p>
            </div>
            <div style="display: flex; gap: 12px;">
                <button id="export-csv-btn" class="modern-btn btn-outline"><span class="material-icons">table_view</span> Exportar CSV</button>
                <button id="export-pdf-btn" class="modern-btn btn-primary"><span class="material-icons">picture_as_pdf</span> Relatório PDF</button>
            </div>
        </div>

        <div class="toolbar-modern">
            <div class="filters-group">
                <select id="results-type-filter" class="modern-select">
                    <option value="all">Público: Todos</option>
                    <option value="aluno">Público: Alunos</option>
                    <option value="professor">Público: Professores</option>
                    <option value="tecnico">Público: Técnicos</option>
                </select>
                <select id="results-question-filter" class="modern-select">
                    <option value="all">Questão: Todas as Perguntas</option>
                </select>
                <button id="load-results-btn" class="modern-btn btn-outline" style="flex: 0 0 auto;"><span class="material-icons">refresh</span> Atualizar</button>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #a855f7, #7e22ce);"><span class="material-icons">assignment</span></div>
                <div class="kpi-info"><h4>Total de Avaliações</h4><span id="total-responses">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #0ea5e9, #3b82f6);"><span class="material-icons">star</span></div>
                <div class="kpi-info"><h4>Média Geral Institucional</h4><span id="avg-rating">0.0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);"><span class="material-icons">school</span></div>
                <div class="kpi-info"><h4>Respostas (Alunos)</h4><span id="aluno-responses">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><span class="material-icons">history_edu</span></div>
                <div class="kpi-info"><h4>Respostas (Prof./Téc.)</h4><span id="prof-tec-responses">0</span></div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-header"><h3 class="chart-title">Distribuição de Notas</h3></div>
                <div style="position: relative; height: 250px;">
                    <canvas id="responses-chart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header"><h3 class="chart-title">Satisfação por Perfil</h3></div>
                <div style="position: relative; height: 250px;">
                    <canvas id="average-by-role-chart"></canvas>
                </div>
            </div>
        </div>

        <div class="modern-table-container">
            <table class="modern-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">ID</th>
                        <th>Pergunta Oficial Avaliada</th>
                        <th style="text-align: center;">Média Geral</th>
                        <th style="text-align: center;">Alunos</th>
                        <th style="text-align: center;">Prof/Téc</th>
                        <th style="width: 200px;">Distribuição Visual</th>
                    </tr>
                </thead>
                <tbody id="detailed-results-table"></tbody>
            </table>
        </div>
    `;

    loadQuestions();
    document.getElementById('load-results-btn').addEventListener('click', loadResults);
    document.getElementById('results-type-filter').addEventListener('change', loadResults);
    document.getElementById('results-question-filter').addEventListener('change', loadResults);
    document.getElementById('export-csv-btn').addEventListener('click', exportResults);
    document.getElementById('export-pdf-btn').addEventListener('click', handlePDFExport);
    
    loadResults();
}

let allResponses = [];
let allQuestions = [];

async function loadQuestions() {
    try {
        const snapshot = await getDocs(collection(db, 'perguntas_avaliacao_institucional'));
        allQuestions = [];
        snapshot.forEach(doc => { allQuestions.push({ id: doc.id, ...doc.data() }); });
        
        allQuestions.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        
        const select = document.getElementById('results-question-filter');
        select.innerHTML = '<option value="all">Questão: Todas as Perguntas</option>';
        
        allQuestions.forEach(q => {
            const option = document.createElement('option');
            option.value = q.id;
            option.textContent = `#${q.id} - ${q.texto.substring(0, 60)}...`;
            select.appendChild(option);
        });
    } catch(e) { console.error("Erro ao carregar perguntas no filtro:", e); }
}

async function loadResults() {
    const typeFilter = document.getElementById('results-type-filter').value;
    const questionFilter = document.getElementById('results-question-filter').value;
    
    try {
        let q = collection(db, 'respostas_avaliacao_institucional');
        if (typeFilter !== 'all') {
            q = query(q, where('userRole', '==', typeFilter));
        }
        
        const snapshot = await getDocs(q);
        allResponses = [];
        snapshot.forEach(doc => { allResponses.push({ id: doc.id, ...doc.data() }); });
        
        calculateStatistics();
        renderCharts(questionFilter);
        renderDetailedTable(questionFilter);
        
    } catch (error) {
        console.error('Erro ao carregar resultados:', error);
        alert('Erro ao carregar resultados: ' + error.message);
    }
}

function calculateStatistics() {
    const totalResponses = allResponses.length;
    const alunoResponses = allResponses.filter(r => r.userRole === 'aluno').length;
    const professorResponses = allResponses.filter(r => r.userRole === 'professor').length;
    const tecnicoResponses = allResponses.filter(r => r.userRole === 'tecnico').length;
    
    let totalRatings = 0;
    let ratingCount = 0;
    
    allResponses.forEach(response => {
        if (response.answers) {
            Object.values(response.answers).forEach(rating => {
                totalRatings += parseInt(rating);
                ratingCount++;
            });
        }
    });
    
    const avgRating = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(2) : '0.00';
    
    document.getElementById('total-responses').textContent = totalResponses;
    document.getElementById('avg-rating').textContent = avgRating;
    document.getElementById('aluno-responses').textContent = alunoResponses;
    document.getElementById('prof-tec-responses').textContent = professorResponses + tecnicoResponses;
}

function renderCharts(questionFilter) {
    const distributionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    distributionData[rating]++;
                }
            });
        }
    });
    
    const ctx1 = document.getElementById('responses-chart');
    if (window.responsesChart) window.responsesChart.destroy();
    
    window.responsesChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['1 (Crítico)', '2 (Ruim)', '3 (Neutro)', '4 (Bom)', '5 (Ótimo)'],
            datasets: [{
                data: [distributionData[1], distributionData[2], distributionData[3], distributionData[4], distributionData[5]],
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'],
                borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
    
    const roleAverages = { aluno: { total: 0, count: 0 }, professor: { total: 0, count: 0 }, tecnico: { total: 0, count: 0 } };
    
    allResponses.forEach(response => {
        const role = response.userRole;
        if (response.answers && roleAverages[role]) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    roleAverages[role].total += parseInt(rating);
                    roleAverages[role].count++;
                }
            });
        }
    });
    
    const alunoAvg = roleAverages.aluno.count > 0 ? roleAverages.aluno.total / roleAverages.aluno.count : 0;
    const professorAvg = roleAverages.professor.count > 0 ? roleAverages.professor.total / roleAverages.professor.count : 0;
    const tecnicoAvg = roleAverages.tecnico.count > 0 ? roleAverages.tecnico.total / roleAverages.tecnico.count : 0;
    
    const ctx2 = document.getElementById('average-by-role-chart');
    if (window.averageChart) window.averageChart.destroy();
    
    window.averageChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Alunos', 'Professores', 'Técnicos'],
            datasets: [{
                data: [alunoAvg, professorAvg, tecnicoAvg],
                backgroundColor: ['#3b82f6', '#f59e0b', '#a855f7'],
                borderRadius: 6, borderSkipped: false, barPercentage: 0.6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 5, grid: { borderDash: [5,5], color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderDetailedTable(questionFilter) {
    const tbody = document.getElementById('detailed-results-table');
    const questionData = {};
    
    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    if (!questionData[qId]) {
                        questionData[qId] = {
                            ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                            total: 0, count: 0,
                            byRole: {
                                aluno: { total: 0, count: 0 },
                                profTec: { total: 0, count: 0 }
                            }
                        };
                    }
                    
                    const r = parseInt(rating);
                    questionData[qId].ratings[r]++;
                    questionData[qId].total += r;
                    questionData[qId].count++;
                    
                    const role = response.userRole;
                    if (role === 'aluno') {
                        questionData[qId].byRole.aluno.total += r;
                        questionData[qId].byRole.aluno.count++;
                    } else {
                        questionData[qId].byRole.profTec.total += r;
                        questionData[qId].byRole.profTec.count++;
                    }
                }
            });
        }
    });
    
    tbody.innerHTML = '';
    const sortedQuestions = Object.keys(questionData).sort((a, b) => parseInt(a) - parseInt(b));
    
    if (sortedQuestions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">Nenhuma resposta encontrada para estes filtros.</td></tr>`;
        return;
    }

    sortedQuestions.forEach(qId => {
        const data = questionData[qId];
        const question = allQuestions.find(q => q.id === qId);
        const questionText = question ? question.texto : `Pergunta não mapeada ${qId}`;
        
        const avgGeneral = (data.total / data.count).toFixed(2);
        const avgAluno = data.byRole.aluno.count > 0 ? (data.byRole.aluno.total / data.byRole.aluno.count).toFixed(2) : '-';
        const avgProfTec = data.byRole.profTec.count > 0 ? (data.byRole.profTec.total / data.byRole.profTec.count).toFixed(2) : '-';
        
        // Calcular percentagens para a mini-barra visual
        const p1 = (data.ratings[1] / data.count) * 100;
        const p2 = (data.ratings[2] / data.count) * 100;
        const p3 = (data.ratings[3] / data.count) * 100;
        const p4 = (data.ratings[4] / data.count) * 100;
        const p5 = (data.ratings[5] / data.count) * 100;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="question-id-badge">${qId}</span></td>
            <td style="max-width: 350px; font-weight: 500;">${questionText}</td>
            <td style="text-align: center;"><strong style="color: #a855f7; font-size: 16px;">${avgGeneral}</strong></td>
            <td style="text-align: center; color: #64748b;">${avgAluno}</td>
            <td style="text-align: center; color: #64748b;">${avgProfTec}</td>
            <td>
                <div class="dist-bar-container">
                    <div class="dist-segment" style="width: ${p1}%; background: #ef4444;" title="Nota 1: ${data.ratings[1]}"></div>
                    <div class="dist-segment" style="width: ${p2}%; background: #f97316;" title="Nota 2: ${data.ratings[2]}"></div>
                    <div class="dist-segment" style="width: ${p3}%; background: #eab308;" title="Nota 3: ${data.ratings[3]}"></div>
                    <div class="dist-segment" style="width: ${p4}%; background: #22c55e;" title="Nota 4: ${data.ratings[4]}"></div>
                    <div class="dist-segment" style="width: ${p5}%; background: #16a34a;" title="Nota 5: ${data.ratings[5]}"></div>
                </div>
                <div class="dist-labels">
                    <span>Ruim</span><span>Ótimo</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Funções de Exportação mantidas (mas usando Modular Firebase variables)
async function exportResults() {
    // ... [MANTEMOS A SUA LÓGICA PERFEITA DE EXPORTAÇÃO CSV] ...
    // Apenas adaptei para usar as variáveis 'allResponses' e 'allQuestions' que já carregamos
    let csv = 'ID Pergunta,Texto da Pergunta,Média Geral,Total de Respostas,Nota 1,Nota 2,Nota 3,Nota 4,Nota 5\\n';
    
    const questionData = {};
    const questionFilter = document.getElementById('results-question-filter').value;

    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    if (!questionData[qId]) {
                        questionData[qId] = { qId: qId, ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0, count: 0 };
                    }
                    const r = parseInt(rating);
                    questionData[qId].ratings[r]++;
                    questionData[qId].total += r;
                    questionData[qId].count++;
                }
            });
        }
    });
    
    Object.values(questionData).forEach(data => {
        const question = allQuestions.find(q => q.id === data.qId);
        const questionText = question ? question.texto.replace(/,/g, ';') : `Pergunta ${data.qId}`;
        const avg = (data.total / data.count).toFixed(2);
        csv += `${data.qId},"${questionText}",${avg},${data.count},${data.ratings[1]},${data.ratings[2]},${data.ratings[3]},${data.ratings[4]},${data.ratings[5]}\\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `CPA_Resultados_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handlePDFExport() {
    const questionFilter = document.getElementById('results-question-filter').value;
    const typeFilter = document.getElementById('results-type-filter').value;
    
    // Continua a chamar o seu pdfExport.js externo!
    if(typeof exportResultsToPDF === 'function') {
        await exportResultsToPDF(questionFilter, typeFilter, allResponses, allQuestions);
    } else {
        alert("O módulo de PDF está a ser carregado. Tente novamente.");
    }
}