export class AnalyticsDataUtils {
    static processDetailedAnalytics(processedData, detailedAnalytics) {
        // 1. Limpar os dados existentes para evitar duplicações
        detailedAnalytics.byStudent.clear();
        detailedAnalytics.byProfessor.clear();
        detailedAnalytics.byDiscipline.clear();
        
        // ==========================================
        // SINGLE-PASS LOOP: A grande otimização de performance
        // Percorremos os dados APENAS UMA VEZ
        // ==========================================
        processedData.forEach(item => {
            const isNumeric = typeof item.respostaValor === 'number';
            const hasComment = item.comentarios && item.comentarios.trim();

            // --- A. PROCESSAR ALUNO ---
            const studentKey = `${item.alunoId}_${item.alunoNome}`;
            if (!detailedAnalytics.byStudent.has(studentKey)) {
                detailedAnalytics.byStudent.set(studentKey, {
                    alunoId: item.alunoId, alunoNome: item.alunoNome, alunoEmail: item.alunoEmail,
                    totalRespostas: 0, mediaGeral: 0,
                    disciplinas: new Set(), professores: new Set(), turmas: new Set(), avaliacoes: new Set(), semestres: new Set(),
                    respostasNumericas: [], comentarios: []
                });
            }
            const studentData = detailedAnalytics.byStudent.get(studentKey);
            studentData.totalRespostas++;
            studentData.disciplinas.add(item.disciplinaNome);
            studentData.professores.add(item.professorNome);
            studentData.turmas.add(item.turmaId);
            studentData.avaliacoes.add(item.avaliacaoId);
            studentData.semestres.add(item.semestre);
            
            if (isNumeric) studentData.respostasNumericas.push(item.respostaValor);
            if (hasComment) {
                studentData.comentarios.push({ comentario: item.comentarios, disciplina: item.disciplinaNome, professor: item.professorNome, semestre: item.semestre });
            }

            // --- B. PROCESSAR PROFESSOR ---
            const professorKey = `${item.professorId}_${item.professorNome}`;
            if (!detailedAnalytics.byProfessor.has(professorKey)) {
                detailedAnalytics.byProfessor.set(professorKey, {
                    professorId: item.professorId, professorNome: item.professorNome,
                    totalRespostas: 0, mediaGeral: 0,
                    disciplinas: new Set(), alunos: new Set(), turmas: new Set(), avaliacoes: new Set(), semestres: new Set(),
                    respostasNumericas: [], comentarios: [], questoesPorCategoria: { disciplina: [], aluno: [], professor: [] }
                });
            }
            const professorData = detailedAnalytics.byProfessor.get(professorKey);
            professorData.totalRespostas++;
            professorData.disciplinas.add(item.disciplinaNome);
            professorData.alunos.add(item.alunoNome);
            professorData.turmas.add(item.turmaId);
            professorData.avaliacoes.add(item.avaliacaoId);
            professorData.semestres.add(item.semestre);
            
            if (isNumeric) {
                professorData.respostasNumericas.push(item.respostaValor);
                if (professorData.questoesPorCategoria[item.tipo]) {
                    professorData.questoesPorCategoria[item.tipo].push({ questao: item.questaoTexto, resposta: item.respostaValor, disciplina: item.disciplinaNome });
                }
            }
            if (hasComment) {
                professorData.comentarios.push({ comentario: item.comentarios, disciplina: item.disciplinaNome, aluno: item.alunoNome, semestre: item.semestre });
            }

            // --- C. PROCESSAR DISCIPLINA ---
            const disciplineKey = `${item.disciplinaId}_${item.disciplinaNome}`;
            if (!detailedAnalytics.byDiscipline.has(disciplineKey)) {
                detailedAnalytics.byDiscipline.set(disciplineKey, {
                    disciplinaId: item.disciplinaId, disciplinaNome: item.disciplinaNome, disciplinaCodigo: item.disciplinaCodigo,
                    totalRespostas: 0, mediaGeral: 0,
                    professores: new Set(), alunos: new Set(), turmas: new Set(), avaliacoes: new Set(), semestres: new Set(),
                    respostasNumericas: [], comentarios: [], mediaPorProfessor: new Map()
                });
            }
            const disciplineData = detailedAnalytics.byDiscipline.get(disciplineKey);
            disciplineData.totalRespostas++;
            disciplineData.professores.add(item.professorNome);
            disciplineData.alunos.add(item.alunoNome);
            disciplineData.turmas.add(item.turmaId);
            disciplineData.avaliacoes.add(item.avaliacaoId);
            disciplineData.semestres.add(item.semestre);
            
            if (isNumeric) {
                disciplineData.respostasNumericas.push(item.respostaValor);
                if (!disciplineData.mediaPorProfessor.has(item.professorNome)) disciplineData.mediaPorProfessor.set(item.professorNome, []);
                disciplineData.mediaPorProfessor.get(item.professorNome).push(item.respostaValor);
            }
            if (hasComment) {
                disciplineData.comentarios.push({ comentario: item.comentarios, professor: item.professorNome, aluno: item.alunoNome, semestre: item.semestre });
            }
        });

        // ==========================================
        // FASE 2: Calcular Médias e Fechar as Variáveis
        // (Convertendo Sets em Arrays limpos para a View usar)
        // ==========================================

        detailedAnalytics.byStudent.forEach(data => {
            if (data.respostasNumericas.length > 0) data.mediaGeral = data.respostasNumericas.reduce((a, b) => a + b, 0) / data.respostasNumericas.length;
            // Converte Sets para Arrays
            data.disciplinas = Array.from(data.disciplinas); data.professores = Array.from(data.professores); 
            data.turmas = Array.from(data.turmas); data.avaliacoes = Array.from(data.avaliacoes); data.semestres = Array.from(data.semestres);
            delete data.respostasNumericas; // Limpa memória inútil
        });

        detailedAnalytics.byProfessor.forEach(data => {
            if (data.respostasNumericas.length > 0) data.mediaGeral = data.respostasNumericas.reduce((a, b) => a + b, 0) / data.respostasNumericas.length;
            data.disciplinas = Array.from(data.disciplinas); data.alunos = Array.from(data.alunos); 
            data.turmas = Array.from(data.turmas); data.avaliacoes = Array.from(data.avaliacoes); data.semestres = Array.from(data.semestres);
            delete data.respostasNumericas; 
        });

        detailedAnalytics.byDiscipline.forEach(data => {
            if (data.respostasNumericas.length > 0) data.mediaGeral = data.respostasNumericas.reduce((a, b) => a + b, 0) / data.respostasNumericas.length;
            // Calcula a média interna de cada professor dentro desta disciplina
            const professorAverages = new Map();
            data.mediaPorProfessor.forEach((respostas, professor) => {
                if (respostas.length > 0) professorAverages.set(professor, respostas.reduce((a, b) => a + b, 0) / respostas.length);
            });
            data.mediaPorProfessor = professorAverages;
            
            data.professores = Array.from(data.professores); data.alunos = Array.from(data.alunos); 
            data.turmas = Array.from(data.turmas); data.avaliacoes = Array.from(data.avaliacoes); data.semestres = Array.from(data.semestres);
            delete data.respostasNumericas;
        });
    }

    static groupByCategory(data) {
        const categories = {
            'disciplina': [],
            'aluno': [],
            'professor': []
        };
        
        data.forEach(item => {
            if (categories[item.tipo]) {
                categories[item.tipo].push(item);
            }
        });
        
        return categories;
    }

    static groupBySemester(data) {
        const semesters = {};
        
        data.forEach(item => {
            if (!semesters[item.semestre]) {
                semesters[item.semestre] = [];
            }
            semesters[item.semestre].push(item);
        });
        
        return semesters;
    }

    static groupByQuestion(data) {
        const questions = {};
        
        data.forEach(item => {
            if (!questions[item.questaoTexto]) {
                questions[item.questaoTexto] = [];
            }
            questions[item.questaoTexto].push(item);
        });
        
        return questions;
    }

    static groupByProfessor(data) {
        const professors = {};
        
        data.forEach(item => {
            if (!professors[item.professorNome]) {
                professors[item.professorNome] = [];
            }
            professors[item.professorNome].push(item);
        });
        
        return professors;
    }

    static groupByDiscipline(data) {
        const disciplines = {};
        
        data.forEach(item => {
            if (!disciplines[item.disciplinaNome]) {
                disciplines[item.disciplinaNome] = [];
            }
            disciplines[item.disciplinaNome].push(item);
        });
        
        return disciplines;
    }

    static groupByMonth(data) {
        const months = {};
        
        data.forEach(item => {
            if (item.dataResposta) {
                const date = item.dataResposta.toDate ? item.dataResposta.toDate() : new Date(item.dataResposta);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!months[monthKey]) {
                    months[monthKey] = 0;
                }
                months[monthKey]++;
            }
        });
        
        return months;
    }
}