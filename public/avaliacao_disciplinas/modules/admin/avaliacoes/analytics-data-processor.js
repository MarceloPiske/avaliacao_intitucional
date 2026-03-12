import { FirebaseCRUD, db } from '../../shared/firebase.js';
import { AnalyticsDataUtils } from './analytics-data-utils.js';

import {
    collectionGroup,
    getDocs,
    query
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
// Importa a nossa nova classe de cache
import { AnalyticsCache } from './analytics-cache.js';

export class AnalyticsDataProcessor {
    constructor() {
        // Agora usamos o 'db' importado. O erro 'firebase is not defined' desaparece.
        this.db = db; 
        
        // Inicializa o nosso cache
        this.cache = new AnalyticsCache();

        // CRUDs para as coleções de topo (como no seu original)
        this.avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.usersCRUD = new FirebaseCRUD("users");
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
        
        // Propriedades de estado
        this.allAvaliacoes = [];
        this.allTurmas = [];
        this.allUsers = [];
        this.allDisciplinas = [];
        this.allFormularios = [];
        this.respostasMap = new Map(); // Chave: avaliacaoId
        this.processedData = [];
        this.detailedAnalytics = {
            byStudent: new Map(),
            byProfessor: new Map(),
            byDiscipline: new Map(),
            byTurma: new Map()
        };
    }

    async loadAllData(forceRefresh = false) {
        if (!forceRefresh) {
            const cachedData = await this.cache.getCachedAnalyticsData();
            if (cachedData) {
                // ... (carrega os dados do cache para 'this.allAvaliacoes', etc.) ...
                this.allAvaliacoes = cachedData.allAvaliacoes;
                this.allTurmas = cachedData.allTurmas;
                this.allUsers = cachedData.allUsers;
                this.allDisciplinas = cachedData.allDisciplinas;
                this.allFormularios = cachedData.allFormularios;
                this.respostasMap = new Map(cachedData.respostasMapArray); 
                
                this.processData(); // Popula 'this.processedData'
                this.processDetailedAnalytics();
                
                // --- CORREÇÃO AQUI ---
                // Retorne os dados que o manager precisa
                return {
                    processedData: this.processedData,
                    allAvaliacoes: this.allAvaliacoes,
                    allTurmas: this.allTurmas
                };
            }
        }
        
        // CACHE MISS ou forceRefresh: Busca do Firestore
        console.log("Buscando dados frescos do Firestore...");
        await this._fetchDataFromFirestore();
        
        // Salva no cache para a próxima vez
        await this.cache.setCachedAnalyticsData({
            allAvaliacoes: this.allAvaliacoes,
            allTurmas: this.allTurmas,
            allUsers: this.allUsers,
            allDisciplinas: this.allDisciplinas,
            allFormularios: this.allFormularios,
            respostasMapArray: Array.from(this.respostasMap.entries())
        });
        
        this.processData(); // Popula 'this.processedData'
        this.processDetailedAnalytics();
        
        // --- CORREÇÃO AQUI ---
        // Retorne os dados que o manager precisa
        return {
            processedData: this.processedData,
            allAvaliacoes: this.allAvaliacoes,
            allTurmas: this.allTurmas
        };
    }

    async _fetchDataFromFirestore() {
        const [avaliacoes, turmas, users, disciplinas, formularios] = await Promise.all([
            this.avaliacoesCRUD.readAll(),
            this.turmasCRUD.readAll(),
            this.usersCRUD.readAll(),
            this.disciplinasCRUD.readAll(),
            this.formulariosCRUD.readAll()
        ]);
        
        this.allAvaliacoes = avaliacoes || [];
        this.allTurmas = turmas || [];
        this.allUsers = users || [];
        this.allDisciplinas = disciplinas || [];
        this.allFormularios = formularios || [];

        // --- A GRANDE OTIMIZAÇÃO (RESOLVENDO O N+1) ---
        console.log("Buscando todas as respostas com CollectionGroup...");
        this.respostasMap.clear();
        
        // 1. Cria a consulta 'collectionGroup' usando o 'db' importado
        const respostasQuery = query(collectionGroup(this.db, 'respostas'));
        
        // 2. Executa a consulta UMA SÓ VEZ
        const respostasSnap = await getDocs(respostasQuery);
        
        // 3. Organiza as respostas em um Mapa
        respostasSnap.forEach(doc => {
            if (doc.ref.path.startsWith('ad_avaliacoes/')) {
                const avaliacaoId = doc.ref.parent.parent.id;
                if (!this.respostasMap.has(avaliacaoId)) {
                    this.respostasMap.set(avaliacaoId, []);
                }
                this.respostasMap.get(avaliacaoId).push(doc.data());
            }
        });
        console.log(`Respostas encontradas e mapeadas para ${this.respostasMap.size} avaliações.`);
    }

    // O resto do seu ficheiro (processData, calculateSummary, etc.)
    // permanece EXATAMENTE IGUAL ao que eu tinha sugerido antes.
    // Cole o resto do seu ficheiro original (ou da minha sugestão anterior) aqui.
    // ...
    // Exemplo de processData (sem async):
    processData() {
        this.processedData = [];
        
        for (const avaliacao of this.allAvaliacoes) {
            try {
                const turma = this.allTurmas.find(t => t.id === avaliacao.turmaId);
                if (!turma) continue;
                
                // DEPOIS (A SOLUÇÃO):
                const respostas = this.respostasMap.get(avaliacao.id) || []; // Busca instantânea
                if (respostas.length === 0) continue;
                
                const aluno = this.allUsers.find(u => u.id === avaliacao.alunoId);
                const disciplina = this.allDisciplinas.find(d => d.id === turma.disciplinaId);
                const formulario = this.allFormularios.find(f => f.id === turma.formularioId);
                
                for (const resposta of respostas) {
                    const processedItem = {
                        avaliacaoId: avaliacao.id,
                        alunoId: avaliacao.alunoId,
                        alunoNome: aluno?.displayName || 'Aluno não encontrado',
                        alunoEmail: aluno?.email || '',
                        turmaId: avaliacao.turmaId,
                        disciplinaId: turma.disciplinaId,
                        disciplinaNome: turma.disciplinaNome,
                        disciplinaCodigo: disciplina?.codigo || '',
                        professorId: turma.professorId,
                        professorNome: turma.professorNome,
                        formularioId: turma.formularioId,
                        formularioTitulo: formulario?.titulo || 'Formulário não encontrado',
                        semestre: turma.semestre,
                        year: turma.semestre ? turma.semestre.split('.')[0] : 'N/A',
                        statusTurma: turma.statusAvaliacao,
                        dataResposta: avaliacao.dataResposta,
                        questaoTexto: resposta.questaoTexto,
                        respostaValor: resposta.respostaValor,
                        tipo: resposta.tipo, // O tipo corrigido do Problema 1
                        ordem: resposta.ordem,
                        comentarios: avaliacao.comentarios,
                        sugestoes: avaliacao.sugestoes
                    };
                    
                    this.processedData.push(processedItem);
                }
                
            } catch (error) {
                console.error('Erro ao processar avaliação (na memória):', avaliacao.id, error);
            }
        }
    }

    processDetailedAnalytics() {
        AnalyticsDataUtils.processDetailedAnalytics(this.processedData, this.detailedAnalytics);
    }
    
    // ... (COLE O RESTO DAS SUAS FUNÇÕES AQUI: calculateSummary, getStudentAnalytics, etc.) ...
    // ... Elas não precisam de NENHUMA alteração. ...
    calculateSummary() {
        const totalAvaliacoes = this.allAvaliacoes.length;
        const totalAlunos = new Set(this.allAvaliacoes.map(a => a.alunoId)).size;
        
        // Only count turmas that have evaluations
        const turmasAvaliadas = new Set(this.allAvaliacoes.map(a => a.turmaId));
        const totalTurmas = turmasAvaliadas.size;
        
        // Only count professors who have been evaluated
        const professoresAvaliados = new Set();
        turmasAvaliadas.forEach(turmaId => {
            const turma = this.allTurmas.find(t => t.id === turmaId);
            if (turma) professoresAvaliados.add(turma.professorId);
        });
        const totalProfessores = professoresAvaliados.size;
        
        // Only count disciplines that have been evaluated
        const disciplinasAvaliadas = new Set();
        turmasAvaliadas.forEach(turmaId => {
            const turma = this.allTurmas.find(t => t.id === turmaId);
            if (turma) disciplinasAvaliadas.add(turma.disciplinaId);
        });
        const totalDisciplinas = disciplinasAvaliadas.size;
        
        const responses = this.processedData.filter(item => typeof item.respostaValor === 'number');
        const mediaGeral = responses.length > 0 ? 
            (responses.reduce((sum, item) => sum + item.respostaValor, 0) / responses.length).toFixed(2) : 0;
        
        const alunosMatriculados = this.allTurmas.reduce((total, turma) => 
            total + (turma.alunosInscritos ? turma.alunosInscritos.length : 0), 0);
        const taxaParticipacao = alunosMatriculados > 0 ? 
            ((totalAlunos / alunosMatriculados) * 100).toFixed(1) : 0;
        
        return {
            totalAvaliacoes,
            totalAlunos,
            totalTurmas,
            totalProfessores,
            totalDisciplinas,
            mediaGeral,
            taxaParticipacao: `${taxaParticipacao}%`
        };
    }

    getStudentAnalytics() {
        return Array.from(this.detailedAnalytics.byStudent.values());
    }

    getProfessorAnalytics() {
        return Array.from(this.detailedAnalytics.byProfessor.values());
    }

    getDisciplineAnalytics() {
        return Array.from(this.detailedAnalytics.byDiscipline.values());
    }

    getSpecificStudentData(studentId) {
        const studentKey = Array.from(this.detailedAnalytics.byStudent.keys()).find(key => key.startsWith(studentId));
        return studentKey ? this.detailedAnalytics.byStudent.get(studentKey) : null;
    }

    getSpecificProfessorData(professorId) {
        const professorKey = Array.from(this.detailedAnalytics.byProfessor.keys()).find(key => key.startsWith(professorId));
        return professorKey ? this.detailedAnalytics.byProfessor.get(professorKey) : null;
    }

    getSpecificDisciplineData(disciplineId) {
        const disciplineKey = Array.from(this.detailedAnalytics.byDiscipline.keys()).find(key => key.startsWith(disciplineId));
        return disciplineKey ? this.detailedAnalytics.byDiscipline.get(disciplineKey) : null;
    }

    groupByCategory(data) {
        return AnalyticsDataUtils.groupByCategory(data);
    }

    groupBySemester(data) {
        return AnalyticsDataUtils.groupBySemester(data);
    }

    groupByQuestion(data) {
        return AnalyticsDataUtils.groupByQuestion(data);
    }

    groupByProfessor(data) {
        return AnalyticsDataUtils.groupByProfessor(data);
    }

    groupByDiscipline(data) {
        return AnalyticsDataUtils.groupByDiscipline(data);
    }

    groupByMonth(data) {
        return AnalyticsDataUtils.groupByMonth(data);
    }
}