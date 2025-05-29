import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
//import { Chart } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.js';


// Usar a mesma configuração do Firebase do app.js
const firebaseConfig = {
    apiKey: "AIzaSyA_57qRozqidb0HsvkssMkZw3DZqRWew9s",
  authDomain: "avaliacao-institucional-a1764.firebaseapp.com",
  projectId: "avaliacao-institucional-a1764",
  storageBucket: "avaliacao-institucional-a1764.firebasestorage.app",
  messagingSenderId: "598583018519",
  appId: "1:598583018519:web:d9f1f96f2434367e6ec852",
  measurementId: "G-W7YZK1RG3F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Elementos DOM
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginSection = document.getElementById('admin-login-section');
const adminDashboardSection = document.getElementById('admin-dashboard-section');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportChartBtn = document.getElementById('export-chart-btn');

// Filtros
const filterPeriod = document.getElementById('filter-period');
const filterRole = document.getElementById('filter-role');
const filterEixo = document.getElementById('filter-eixo');
const filterDimensao = document.getElementById('filter-dimensao');

// Estatísticas
const totalResponses = document.getElementById('total-responses');
const averageScore = document.getElementById('average-score');
const participationRate = document.getElementById('participation-rate');
const bestQuestion = document.getElementById('best-question');

// Tabela
const resultsTableBody = document.getElementById('results-table-body');

// Variáveis de estado
let questions = [];
let responses = [];
let filteredResponses = [];
let charts = {};

// Carregar perguntas e inicializar dimensões
async function loadQuestionsAndDimensions() {
    try {
        const response = await fetch('./avaliacao_cpa_perguntas.json');
        questions = await response.json();
        
        // Preencher opções de dimensão
        const dimensoes = [...new Set(questions.map(q => q.dimensao))].sort();
        const dimensaoSelect = document.getElementById('filter-dimensao');
        
        dimensoes.forEach(dim => {
            const option = document.createElement('option');
            option.value = dim;
            option.textContent = `Dimensão ${dim}`;
            dimensaoSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar perguntas:', error);
    }
}

// Carregar respostas do Firestore
async function loadResponses(filters = {}) {
    try {
        let q = collection(db, "survey_responses");
        
        // Aplicar filtros
        if (filters.period && filters.period !== 'all') {
            // Lógica para filtrar por período (exemplo simplificado)
            const today = new Date();
            let startDate;
            
            if (filters.period === 'current') {
                // Atual: este ano
                startDate = new Date(today.getFullYear(), 0, 1);
            } else if (filters.period === 'last') {
                // Anterior: ano passado
                startDate = new Date(today.getFullYear() - 1, 0, 1);
                const endDate = new Date(today.getFullYear(), 0, 1);
                q = query(q, where('created_at', '>=', startDate), where('created_at', '<', endDate));
                return;
            }
            
            q = query(q, where('created_at', '>=', startDate));
        }
        
        if (filters.role && filters.role !== 'all') {
            q = query(q, where('role', '==', filters.role));
        }
        
        const querySnapshot = await getDocs(q);
        responses = [];
        
        querySnapshot.forEach((doc) => {
            responses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Carregadas ${responses.length} respostas`);
        
        // Filtrar por eixo e dimensão em memória
        filteredResponses = responses;
        
        if (filters.eixo && filters.eixo !== 'all') {
            // Filtrar respostas que contêm perguntas do eixo selecionado
            const eixoQuestions = questions.filter(q => q.eixo === filters.eixo).map(q => `q${q.id}`);
            
            filteredResponses = filteredResponses.filter(response => {
                return Object.keys(response.answers).some(key => eixoQuestions.includes(key));
            });
        }
        
        if (filters.dimensao && filters.dimensao !== 'all') {
            // Filtrar respostas que contêm perguntas da dimensão selecionada
            const dimensaoQuestions = questions.filter(q => q.dimensao === filters.dimensao).map(q => `q${q.id}`);
            
            filteredResponses = filteredResponses.filter(response => {
                return Object.keys(response.answers).some(key => dimensaoQuestions.includes(key));
            });
        }
        
        // Atualizar dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Erro ao carregar respostas:', error);
    }
}

// Atualizar estatísticas e gráficos
function updateDashboard() {
    // Atualizar estatísticas
    totalResponses.textContent = filteredResponses.length;
    
    // Calcular média geral
    let allAnswers = [];
    filteredResponses.forEach(response => {
        allAnswers = [...allAnswers, ...Object.values(response.answers)];
    });
    
    const avg = allAnswers.length > 0 
        ? (allAnswers.reduce((sum, val) => sum + val, 0) / allAnswers.length).toFixed(2) 
        : "0.00";
    
    averageScore.textContent = avg;
    
    // Calcular taxa de participação (exemplo simplificado)
    // Na prática, você precisaria saber o número total de potenciais respondentes
    participationRate.textContent = "N/A";
    
    // Encontrar questão melhor avaliada
    const questionAverages = {};
    
    questions.forEach(question => {
        const questionId = `q${question.id}`;
        const answersForQuestion = filteredResponses
            .filter(r => r.answers[questionId] !== undefined)
            .map(r => r.answers[questionId]);
        
        if (answersForQuestion.length > 0) {
            questionAverages[questionId] = {
                id: question.id,
                text: question.texto,
                avg: answersForQuestion.reduce((sum, val) => sum + val, 0) / answersForQuestion.length
            };
        }
    });
    
    if (Object.keys(questionAverages).length > 0) {
        const bestQ = Object.values(questionAverages).reduce((best, current) => 
            (current.avg > best.avg) ? current : best, { avg: 0 });
        
        bestQuestion.textContent = `Q${bestQ.id} (${bestQ.avg.toFixed(2)})`;
    } else {
        bestQuestion.textContent = "N/A";
    }
    
    // Atualizar tabela
    updateResultsTable(questionAverages);
    
    // Atualizar gráficos
    updateCharts(questionAverages);
}

// Atualizar tabela de resultados
function updateResultsTable(questionAverages) {
    resultsTableBody.innerHTML = '';
    
    questions.forEach(question => {
        const questionId = `q${question.id}`;
        const average = questionAverages[questionId] ? questionAverages[questionId].avg.toFixed(2) : "N/A";
        
        // Calcular médias por tipo de público
        const alunosAnswers = filteredResponses
            .filter(r => r.role === 'aluno' && r.answers[questionId] !== undefined)
            .map(r => r.answers[questionId]);
            
        const professoresAnswers = filteredResponses
            .filter(r => r.role === 'professor' && r.answers[questionId] !== undefined)
            .map(r => r.answers[questionId]);
            
        const funcionariosAnswers = filteredResponses
            .filter(r => r.role === 'funcionario' && r.answers[questionId] !== undefined)
            .map(r => r.answers[questionId]);
        
        const alunosAvg = alunosAnswers.length > 0 
            ? (alunosAnswers.reduce((sum, val) => sum + val, 0) / alunosAnswers.length).toFixed(2) 
            : "N/A";
            
        const professoresAvg = professoresAnswers.length > 0 
            ? (professoresAnswers.reduce((sum, val) => sum + val, 0) / professoresAnswers.length).toFixed(2) 
            : "N/A";
            
        const funcionariosAvg = funcionariosAnswers.length > 0 
            ? (funcionariosAnswers.reduce((sum, val) => sum + val, 0) / funcionariosAnswers.length).toFixed(2) 
            : "N/A";
        
        // Criar linha na tabela
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${question.id}</td>
            <td>${question.eixo}</td>
            <td>${question.dimensao}</td>
            <td>${question.texto}</td>
            <td>${average}</td>
            <td>${alunosAvg}</td>
            <td>${professoresAvg}</td>
            <td>${funcionariosAvg}</td>
        `;
        
        resultsTableBody.appendChild(row);
    });
}

// Atualizar gráficos
function updateCharts(questionAverages) {
    // Gráfico por Eixo
    const eixoData = {};
    
    questions.forEach(question => {
        const questionId = `q${question.id}`;
        if (questionAverages[questionId]) {
            if (!eixoData[question.eixo]) {
                eixoData[question.eixo] = {
                    sum: 0,
                    count: 0
                };
            }
            
            eixoData[question.eixo].sum += questionAverages[questionId].avg;
            eixoData[question.eixo].count += 1;
        }
    });
    
    const eixoLabels = Object.keys(eixoData).sort();
    const eixoAverages = eixoLabels.map(eixo => 
        eixoData[eixo].count > 0 ? eixoData[eixo].sum / eixoData[eixo].count : 0
    );
    
    // Destruir gráfico existente se houver
    if (charts.eixos) {
        charts.eixos.destroy();
    }
    
    const ctxEixos = document.getElementById('chart-eixos').getContext('2d');
    charts.eixos = new Chart(ctxEixos, {
        type: 'bar',
        data: {
            labels: eixoLabels.map(e => `Eixo ${e}`),
            datasets: [{
                label: 'Média por Eixo',
                data: eixoAverages,
                backgroundColor: 'rgba(26, 115, 232, 0.7)',
                borderColor: 'rgba(26, 115, 232, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Média por Eixo de Avaliação'
                }
            }
        }
    });
    
    // Gráfico por Público
    const publicoData = {
        aluno: { sum: 0, count: 0 },
        professor: { sum: 0, count: 0 },
        funcionario: { sum: 0, count: 0 }
    };
    
    filteredResponses.forEach(response => {
        const role = response.role;
        const answers = Object.values(response.answers);
        
        if (answers.length > 0) {
            publicoData[role].sum += answers.reduce((sum, val) => sum + val, 0);
            publicoData[role].count += answers.length;
        }
    });
    
    const publicoLabels = ['Alunos', 'Professores', 'Funcionários'];
    const publicoAverages = [
        publicoData.aluno.count > 0 ? publicoData.aluno.sum / publicoData.aluno.count : 0,
        publicoData.professor.count > 0 ? publicoData.professor.sum / publicoData.professor.count : 0,
        publicoData.funcionario.count > 0 ? publicoData.funcionario.sum / publicoData.funcionario.count : 0
    ];
    
    // Destruir gráfico existente se houver
    if (charts.publico) {
        charts.publico.destroy();
    }
    
    const ctxPublico = document.getElementById('chart-publico').getContext('2d');
    charts.publico = new Chart(ctxPublico, {
        type: 'bar',
        data: {
            labels: publicoLabels,
            datasets: [{
                label: 'Média por Público',
                data: publicoAverages,
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Média por Tipo de Público'
                }
            }
        }
    });
}

// Exportar para CSV
function exportToCSV() {
    // Cabeçalho
    let csv = 'ID,Eixo,Dimensão,Questão,Média Geral,Média Alunos,Média Professores,Média Funcionários\n';
    
    // Dados
    const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const csvRow = cells.map(cell => {
            // Escapar aspas e adicionar aspas para preservar texto com vírgulas
            return `"${cell.textContent.replace(/"/g, '""')}"`;
        }).join(',');
        
        csv += csvRow + '\n';
    });
    
    // Criar link para download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'resultados_cpa.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Login administrativo
async function adminLogin() {
    try {
        // Configurar para aceitar apenas os domínios permitidos
        googleProvider.setCustomParameters({
            hd: 'seminarioconcordia.com.br' // Domínio padrão para o prompt
        });
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Verificar se o usuário é admin consultando uma coleção de admins
        const adminQuery = query(collection(db, "admins"), where("email", "==", user.email));
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.empty) {
            // Usuário não é admin, fazer logout
            await signOut(auth);
            alert("Este usuário não tem permissões administrativas.");
            return;
        }
        
        adminLoginSection.classList.remove('active');
        adminDashboardSection.classList.add('active');
        
        // Carregar dados iniciais
        await loadQuestionsAndDimensions();
        await loadResponses();
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            console.error('Erro no login administrativo:', error);
            alert('Acesso negado: ' + error.message);
        }
    }
}

// Logout administrativo
function adminLogout() {
    signOut(auth);
    adminDashboardSection.classList.remove('active');
    adminLoginSection.classList.add('active');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Formulário de login administrativo
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        adminLogin();
    });
    
    // Botão de logout administrativo
    adminLogoutBtn.addEventListener('click', adminLogout);
    
    // Aplicar filtros
    applyFiltersBtn.addEventListener('click', () => {
        const filters = {
            period: filterPeriod.value,
            role: filterRole.value,
            eixo: filterEixo.value,
            dimensao: filterDimensao.value
        };
        
        loadResponses(filters);
    });
    
    // Resetar filtros
    resetFiltersBtn.addEventListener('click', () => {
        filterPeriod.value = 'all';
        filterRole.value = 'all';
        filterEixo.value = 'all';
        filterDimensao.value = 'all';
        
        loadResponses();
    });
    
    // Exportar CSV
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Exportar PDF (implementação simplificada)
    exportPdfBtn.addEventListener('click', () => {
        alert('Funcionalidade a ser implementada.');
        // Aqui você poderia usar uma biblioteca como jsPDF
    });
    
    // Exportar Gráficos (implementação simplificada)
    exportChartBtn.addEventListener('click', () => {
        alert('Funcionalidade a ser implementada.');
        // Aqui você poderia usar o método toDataURL() do canvas
    });
    
    // Verificar estado de autenticação para admin
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Verificar se o usuário é admin (implementação simplificada)
            // Na prática, você deve verificar no Firestore uma coleção de admins
            if (user.email.includes('admin')) {
                adminLoginSection.classList.remove('active');
                adminDashboardSection.classList.add('active');
                
                // Carregar dados iniciais
                loadQuestionsAndDimensions().then(() => loadResponses());
            }
        }
    });
});