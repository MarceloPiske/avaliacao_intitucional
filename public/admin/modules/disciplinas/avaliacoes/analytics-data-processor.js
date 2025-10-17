import { FirebaseCRUD } from '../../../../shared/modules/firebase.js';
import { AnalyticsDataUtils } from './analytics-data-utils.js';

export class AnalyticsDataProcessor {
    constructor() {
        this.avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.usersCRUD = new FirebaseCRUD("users");
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
        
        this.allAvaliacoes = [];
        this.allTurmas = [];
        this.allUsers = [];
        this.allDisciplinas = [];
        this.allFormularios = [];
        this.processedData = [];
        this.detailedAnalytics = {
            byStudent: new Map(),
            byProfessor: new Map(),
            byDiscipline: new Map(),
            byTurma: new Map()
        };
    }

    async loadAllData() {
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
        
        await this.processData();
        this.processDetailedAnalytics();
        
        return {
            avaliacoes: this.allAvaliacoes,
            turmas: this.allTurmas,
            users: this.allUsers,
            disciplinas: this.allDisciplinas,
            formularios: this.allFormularios,
            processedData: this.processedData
        };
    }

    async processData() {
        this.processedData = [];
        
        for (const avaliacao of this.allAvaliacoes) {
            try {
                const turma = this.allTurmas.find(t => t.id === avaliacao.turmaId);
                if (!turma) continue;
                
                const respostasCRUD = new FirebaseCRUD(`ad_avaliacoes/${avaliacao.id}/respostas`);
                const respostas = await respostasCRUD.readAll();
                
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
                        tipo: resposta.tipo,
                        ordem: resposta.ordem,
                        comentarios: avaliacao.comentarios,
                        sugestoes: avaliacao.sugestoes
                    };
                    
                    this.processedData.push(processedItem);
                }
                
            } catch (error) {
                console.error('Erro ao processar avaliação:', avaliacao.id, error);
            }
        }
    }

    processDetailedAnalytics() {
        AnalyticsDataUtils.processDetailedAnalytics(this.processedData, this.detailedAnalytics);
    }

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