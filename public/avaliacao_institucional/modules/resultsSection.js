import { exportResultsToPDF } from './pdfExport.js';
export function initResultsSection() {
    const section = document.getElementById('results-section');
    
    section.innerHTML = `
        <div class="section-content">
            <h2>Resultados das Avaliações</h2>
            <div class="filter-options">
                <div>
                    <span class="filter-label">Tipo de Usuário:</span>
                    <select id="results-type-filter">
                        <option value="all">Todos</option>
                        <option value="aluno">Alunos</option>
                        <option value="professor">Professores</option>
                        <option value="tecnico">Técnicos</option>
                    </select>
                </div>
                <div>
                    <span class="filter-label">Pergunta:</span>
                    <select id="results-question-filter">
                        <option value="all">Todas as Perguntas</option>
                    </select>
                </div>
                <button id="load-results-btn" class="secondary"><i class="fas fa-sync"></i> Atualizar Resultados</button>
                <button id="export-results-btn"><i class="fas fa-download"></i> Exportar CSV</button>
                <button id="export-pdf-btn"><i class="fas fa-file-pdf"></i> Exportar PDF</button>
            </div>
            <div id="results-content">
                <div class="results-summary">
                    <h3>Estatísticas Gerais</h3>
                    <div class="summary-stats">
                        <div class="summary-stat">
                            <div class="summary-stat-value" id="total-responses">0</div>
                            <div class="summary-stat-label">Total de Respostas</div>
                        </div>
                        <div class="summary-stat">
                            <div class="summary-stat-value" id="avg-rating">0.0</div>
                            <div class="summary-stat-label">Média Geral</div>
                        </div>
                        <div class="summary-stat">
                            <div class="summary-stat-value" id="aluno-responses">0</div>
                            <div class="summary-stat-label">Respostas de Alunos</div>
                        </div>
                        <div class="summary-stat">
                            <div class="summary-stat-value" id="professor-responses">0</div>
                            <div class="summary-stat-label">Respostas de Professores</div>
                        </div>
                        <div class="summary-stat">
                            <div class="summary-stat-value" id="tecnico-responses">0</div>
                            <div class="summary-stat-label">Respostas de Técnicos</div>
                        </div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Distribuição de Respostas</h3>
                    </div>
                    <canvas id="responses-chart"></canvas>
                </div>
                
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title">Média por Tipo de Usuário</h3>
                    </div>
                    <canvas id="average-by-role-chart"></canvas>
                </div>
                
                <div class="section-content" style="margin-top: 30px;">
                    <h3>Detalhamento de Respostas</h3>
                    <div id="detailed-results-table"></div>
                </div>
            </div>
        </div>
    `;

    loadQuestions();
    document.getElementById('load-results-btn').addEventListener('click', loadResults);
    document.getElementById('results-type-filter').addEventListener('change', loadResults);
    document.getElementById('results-question-filter').addEventListener('change', loadResults);
    document.getElementById('export-results-btn').addEventListener('click', exportResults);
    document.getElementById('export-pdf-btn').addEventListener('click', handlePDFExport);
    
    loadResults();
}

let allResponses = [];
let allQuestions = [];

async function loadQuestions() {
    const db = firebase.firestore();
    const snapshot = await db.collection('perguntas_avaliacao_institucional').get();
    
    allQuestions = [];
    snapshot.forEach(doc => {
        allQuestions.push({ id: doc.id, ...doc.data() });
    });
    
    allQuestions.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    
    const select = document.getElementById('results-question-filter');
    select.innerHTML = '<option value="all">Todas as Perguntas</option>';
    
    allQuestions.forEach(q => {
        const option = document.createElement('option');
        option.value = q.id;
        option.textContent = `${q.id} - ${q.texto.substring(0, 60)}...`;
        select.appendChild(option);
    });
}

async function loadResults() {
    const db = firebase.firestore();
    const typeFilter = document.getElementById('results-type-filter').value;
    const questionFilter = document.getElementById('results-question-filter').value;
    
    try {
        let query = db.collection('respostas_avaliacao_institucional');
        
        if (typeFilter !== 'all') {
            query = query.where('userRole', '==', typeFilter);
        }
        
        const snapshot = await query.get();
        
        allResponses = [];
        snapshot.forEach(doc => {
            allResponses.push({ id: doc.id, ...doc.data() });
        });
        
        calculateStatistics();
        renderCharts(questionFilter);
        renderDetailedTable(questionFilter);
        
    } catch (error) {
        console.error('Error loading results:', error);
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
    
    const avgRating = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : '0.0';
    
    document.getElementById('total-responses').textContent = totalResponses;
    document.getElementById('avg-rating').textContent = avgRating;
    document.getElementById('aluno-responses').textContent = alunoResponses;
    document.getElementById('professor-responses').textContent = professorResponses;
    document.getElementById('tecnico-responses').textContent = tecnicoResponses;
}

function renderCharts(questionFilter) {
    const typeFilter = document.getElementById('results-type-filter').value;
    
    // Distribution chart
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
    if (window.responsesChart) {
        window.responsesChart.destroy();
    }
    
    window.responsesChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['1 - Discordo Totalmente', '2 - Discordo Parcialmente', '3 - Neutro', '4 - Concordo Parcialmente', '5 - Concordo Totalmente'],
            datasets: [{
                label: 'Número de Respostas',
                data: [distributionData[1], distributionData[2], distributionData[3], distributionData[4], distributionData[5]],
                backgroundColor: [
                    'rgba(231, 76, 60, 0.6)',
                    'rgba(230, 126, 34, 0.6)',
                    'rgba(241, 196, 15, 0.6)',
                    'rgba(52, 152, 219, 0.6)',
                    'rgba(46, 204, 113, 0.6)'
                ],
                borderColor: [
                    'rgba(231, 76, 60, 1)',
                    'rgba(230, 126, 34, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    
    // Average by role chart
    const roleAverages = {
        aluno: { total: 0, count: 0 },
        professor: { total: 0, count: 0 },
        tecnico: { total: 0, count: 0 }
    };
    
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
    if (window.averageChart) {
        window.averageChart.destroy();
    }
    
    window.averageChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Alunos', 'Professores', 'Técnicos'],
            datasets: [{
                label: 'Média de Avaliação',
                data: [alunoAvg, professorAvg, tecnicoAvg],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.6)',
                    'rgba(118, 75, 162, 0.6)',
                    'rgba(17, 153, 142, 0.6)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)',
                    'rgba(17, 153, 142, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 0.5
                    }
                }
            }
        }
    });
}

function renderDetailedTable(questionFilter) {
    const tableDiv = document.getElementById('detailed-results-table');
    
    const questionData = {};
    
    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    if (!questionData[qId]) {
                        questionData[qId] = {
                            ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                            total: 0,
                            count: 0,
                            byRole: {
                                aluno: { total: 0, count: 0 },
                                professor: { total: 0, count: 0 },
                                tecnico: { total: 0, count: 0 }
                            }
                        };
                    }
                    
                    const r = parseInt(rating);
                    questionData[qId].ratings[r]++;
                    questionData[qId].total += r;
                    questionData[qId].count++;
                    
                    const role = response.userRole;
                    if (questionData[qId].byRole[role]) {
                        questionData[qId].byRole[role].total += r;
                        questionData[qId].byRole[role].count++;
                    }
                }
            });
        }
    });
    
    let html = '<table class="result-table"><thead><tr>';
    html += '<th>ID</th>';
    html += '<th>Pergunta</th>';
    html += '<th>Média Geral</th>';
    html += '<th>Média Alunos</th>';
    html += '<th>Média Professores</th>';
    html += '<th>Média Técnicos</th>';
    html += '<th>Total Respostas</th>';
    html += '<th>Distribuição (1-5)</th>';
    html += '</tr></thead><tbody>';
    
    const sortedQuestions = Object.keys(questionData).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedQuestions.forEach(qId => {
        const data = questionData[qId];
        const question = allQuestions.find(q => q.id === qId);
        const questionText = question ? question.texto : `Pergunta ${qId}`;
        
        const avgGeneral = (data.total / data.count).toFixed(2);
        const avgAluno = data.byRole.aluno.count > 0 ? (data.byRole.aluno.total / data.byRole.aluno.count).toFixed(2) : 'N/A';
        const avgProfessor = data.byRole.professor.count > 0 ? (data.byRole.professor.total / data.byRole.professor.count).toFixed(2) : 'N/A';
        const avgTecnico = data.byRole.tecnico.count > 0 ? (data.byRole.tecnico.total / data.byRole.tecnico.count).toFixed(2) : 'N/A';
        
        html += '<tr>';
        html += `<td><span class="question-id-badge">${qId}</span></td>`;
        html += `<td style="max-width: 400px;">${questionText}</td>`;
        html += `<td><strong>${avgGeneral}</strong></td>`;
        html += `<td>${avgAluno}</td>`;
        html += `<td>${avgProfessor}</td>`;
        html += `<td>${avgTecnico}</td>`;
        html += `<td>${data.count}</td>`;
        html += `<td><small>1:${data.ratings[1]} | 2:${data.ratings[2]} | 3:${data.ratings[3]} | 4:${data.ratings[4]} | 5:${data.ratings[5]}</small></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    if (sortedQuestions.length === 0) {
        html = '<p style="text-align: center; color: #888; padding: 40px;">Nenhuma resposta encontrada com os filtros selecionados.</p>';
    }
    
    tableDiv.innerHTML = html;
}

async function exportResults() {
    const typeFilter = document.getElementById('results-type-filter').value;
    const questionFilter = document.getElementById('results-question-filter').value;
    
    let csv = 'ID Pergunta,Texto da Pergunta,Tipo de Usuário,Média,Total de Respostas,Nota 1,Nota 2,Nota 3,Nota 4,Nota 5\n';
    
    const questionData = {};
    
    allResponses.forEach(response => {
        const role = response.userRole;
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    const key = `${qId}_${role}`;
                    if (!questionData[key]) {
                        questionData[key] = {
                            qId: qId,
                            role: role,
                            ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                            total: 0,
                            count: 0
                        };
                    }
                    
                    const r = parseInt(rating);
                    questionData[key].ratings[r]++;
                    questionData[key].total += r;
                    questionData[key].count++;
                }
            });
        }
    });
    
    Object.values(questionData).forEach(data => {
        const question = allQuestions.find(q => q.id === data.qId);
        const questionText = question ? question.texto.replace(/,/g, ';') : `Pergunta ${data.qId}`;
        const avg = (data.total / data.count).toFixed(2);
        const roleLabel = data.role === 'aluno' ? 'Aluno' : data.role === 'professor' ? 'Professor' : 'Técnico';
        
        csv += `${data.qId},"${questionText}",${roleLabel},${avg},${data.count},${data.ratings[1]},${data.ratings[2]},${data.ratings[3]},${data.ratings[4]},${data.ratings[5]}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `resultados_avaliacao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handlePDFExport() {
    const questionFilter = document.getElementById('results-question-filter').value;
    const typeFilter = document.getElementById('results-type-filter').value;
    
    await exportResultsToPDF(questionFilter, typeFilter, allResponses, allQuestions);
}