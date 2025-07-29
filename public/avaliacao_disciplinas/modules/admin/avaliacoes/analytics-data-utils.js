export class AnalyticsDataUtils {
    static processDetailedAnalytics(processedData, detailedAnalytics) {
        // Clear existing analytics to prevent conflicts
        detailedAnalytics.byStudent.clear();
        detailedAnalytics.byProfessor.clear();
        detailedAnalytics.byDiscipline.clear();
        
        // Process analytics by student
        processedData.forEach(item => {
            const studentKey = `${item.alunoId}_${item.alunoNome}`;
            if (!detailedAnalytics.byStudent.has(studentKey)) {
                detailedAnalytics.byStudent.set(studentKey, {
                    alunoId: item.alunoId,
                    alunoNome: item.alunoNome,
                    alunoEmail: item.alunoEmail,
                    totalRespostas: 0,
                    mediaGeral: 0,
                    disciplinas: new Set(),
                    professores: new Set(),
                    turmas: new Set(),
                    avaliacoes: new Set(),
                    respostasNumericas: [],
                    comentarios: [],
                    semestres: new Set()
                });
            }
            
            const studentData = detailedAnalytics.byStudent.get(studentKey);
            studentData.totalRespostas++;
            
            // Ensure these are Sets before calling add()
            if (!(studentData.disciplinas instanceof Set)) {
                studentData.disciplinas = new Set(studentData.disciplinas);
            }
            if (!(studentData.professores instanceof Set)) {
                studentData.professores = new Set(studentData.professores);
            }
            if (!(studentData.turmas instanceof Set)) {
                studentData.turmas = new Set(studentData.turmas);
            }
            if (!(studentData.avaliacoes instanceof Set)) {
                studentData.avaliacoes = new Set(studentData.avaliacoes);
            }
            if (!(studentData.semestres instanceof Set)) {
                studentData.semestres = new Set(studentData.semestres);
            }
            
            studentData.disciplinas.add(item.disciplinaNome);
            studentData.professores.add(item.professorNome);
            studentData.turmas.add(item.turmaId);
            studentData.avaliacoes.add(item.avaliacaoId);
            studentData.semestres.add(item.semestre);
            
            if (typeof item.respostaValor === 'number') {
                studentData.respostasNumericas.push(item.respostaValor);
            }
            
            if (item.comentarios && item.comentarios.trim()) {
                studentData.comentarios.push({
                    comentario: item.comentarios,
                    disciplina: item.disciplinaNome,
                    professor: item.professorNome,
                    semestre: item.semestre
                });
            }
        });

        // Calculate averages for students
        detailedAnalytics.byStudent.forEach(studentData => {
            if (studentData.respostasNumericas.length > 0) {
                studentData.mediaGeral = studentData.respostasNumericas.reduce((sum, val) => sum + val, 0) / studentData.respostasNumericas.length;
            }
            // Convert Sets to Arrays only at the end
            studentData.disciplinas = Array.from(studentData.disciplinas);
            studentData.professores = Array.from(studentData.professores);
            studentData.turmas = Array.from(studentData.turmas);
            studentData.avaliacoes = Array.from(studentData.avaliacoes);
            studentData.semestres = Array.from(studentData.semestres);
        });

        // Process analytics by professor
        processedData.forEach(item => {
            const professorKey = `${item.professorId}_${item.professorNome}`;
            if (!detailedAnalytics.byProfessor.has(professorKey)) {
                detailedAnalytics.byProfessor.set(professorKey, {
                    professorId: item.professorId,
                    professorNome: item.professorNome,
                    totalRespostas: 0,
                    mediaGeral: 0,
                    disciplinas: new Set(),
                    alunos: new Set(),
                    turmas: new Set(),
                    avaliacoes: new Set(),
                    respostasNumericas: [],
                    comentarios: [],
                    semestres: new Set(),
                    questoesPorCategoria: { disciplina: [], aluno: [], professor: [] }
                });
            }
            
            const professorData = detailedAnalytics.byProfessor.get(professorKey);
            professorData.totalRespostas++;
            
            // Ensure these are Sets before calling add()
            if (!(professorData.disciplinas instanceof Set)) {
                professorData.disciplinas = new Set(professorData.disciplinas);
            }
            if (!(professorData.alunos instanceof Set)) {
                professorData.alunos = new Set(professorData.alunos);
            }
            if (!(professorData.turmas instanceof Set)) {
                professorData.turmas = new Set(professorData.turmas);
            }
            if (!(professorData.avaliacoes instanceof Set)) {
                professorData.avaliacoes = new Set(professorData.avaliacoes);
            }
            if (!(professorData.semestres instanceof Set)) {
                professorData.semestres = new Set(professorData.semestres);
            }
            
            professorData.disciplinas.add(item.disciplinaNome);
            professorData.alunos.add(item.alunoNome);
            professorData.turmas.add(item.turmaId);
            professorData.avaliacoes.add(item.avaliacaoId);
            professorData.semestres.add(item.semestre);
            
            if (typeof item.respostaValor === 'number') {
                professorData.respostasNumericas.push(item.respostaValor);
                
                // Group responses by question category
                if (professorData.questoesPorCategoria[item.tipo]) {
                    professorData.questoesPorCategoria[item.tipo].push({
                        questao: item.questaoTexto,
                        resposta: item.respostaValor,
                        disciplina: item.disciplinaNome
                    });
                }
            }
            
            if (item.comentarios && item.comentarios.trim()) {
                professorData.comentarios.push({
                    comentario: item.comentarios,
                    disciplina: item.disciplinaNome,
                    aluno: item.alunoNome,
                    semestre: item.semestre
                });
            }
        });

        // Calculate averages for professors
        detailedAnalytics.byProfessor.forEach(professorData => {
            if (professorData.respostasNumericas.length > 0) {
                professorData.mediaGeral = professorData.respostasNumericas.reduce((sum, val) => sum + val, 0) / professorData.respostasNumericas.length;
            }
            // Convert Sets to Arrays only at the end
            professorData.disciplinas = Array.from(professorData.disciplinas);
            professorData.alunos = Array.from(professorData.alunos);
            professorData.turmas = Array.from(professorData.turmas);
            professorData.avaliacoes = Array.from(professorData.avaliacoes);
            professorData.semestres = Array.from(professorData.semestres);
        });

        // Process analytics by discipline
        processedData.forEach(item => {
            const disciplineKey = `${item.disciplinaId}_${item.disciplinaNome}`;
            if (!detailedAnalytics.byDiscipline.has(disciplineKey)) {
                detailedAnalytics.byDiscipline.set(disciplineKey, {
                    disciplinaId: item.disciplinaId,
                    disciplinaNome: item.disciplinaNome,
                    disciplinaCodigo: item.disciplinaCodigo,
                    totalRespostas: 0,
                    mediaGeral: 0,
                    professores: new Set(),
                    alunos: new Set(),
                    turmas: new Set(),
                    avaliacoes: new Set(),
                    respostasNumericas: [],
                    comentarios: [],
                    semestres: new Set(),
                    mediaPorProfessor: new Map()
                });
            }
            
            const disciplineData = detailedAnalytics.byDiscipline.get(disciplineKey);
            disciplineData.totalRespostas++;
            
            // Ensure these are Sets before calling add()
            if (!(disciplineData.professores instanceof Set)) {
                disciplineData.professores = new Set(disciplineData.professores);
            }
            if (!(disciplineData.alunos instanceof Set)) {
                disciplineData.alunos = new Set(disciplineData.alunos);
            }
            if (!(disciplineData.turmas instanceof Set)) {
                disciplineData.turmas = new Set(disciplineData.turmas);
            }
            if (!(disciplineData.avaliacoes instanceof Set)) {
                disciplineData.avaliacoes = new Set(disciplineData.avaliacoes);
            }
            if (!(disciplineData.semestres instanceof Set)) {
                disciplineData.semestres = new Set(disciplineData.semestres);
            }
            
            disciplineData.professores.add(item.professorNome);
            disciplineData.alunos.add(item.alunoNome);
            disciplineData.turmas.add(item.turmaId);
            disciplineData.avaliacoes.add(item.avaliacaoId);
            disciplineData.semestres.add(item.semestre);
            
            if (typeof item.respostaValor === 'number') {
                disciplineData.respostasNumericas.push(item.respostaValor);
                
                // Track average by professor within discipline
                if (!disciplineData.mediaPorProfessor.has(item.professorNome)) {
                    disciplineData.mediaPorProfessor.set(item.professorNome, []);
                }
                disciplineData.mediaPorProfessor.get(item.professorNome).push(item.respostaValor);
            }
            
            if (item.comentarios && item.comentarios.trim()) {
                disciplineData.comentarios.push({
                    comentario: item.comentarios,
                    professor: item.professorNome,
                    aluno: item.alunoNome,
                    semestre: item.semestre
                });
            }
        });

        // Calculate averages for disciplines
        detailedAnalytics.byDiscipline.forEach(disciplineData => {
            if (disciplineData.respostasNumericas.length > 0) {
                disciplineData.mediaGeral = disciplineData.respostasNumericas.reduce((sum, val) => sum + val, 0) / disciplineData.respostasNumericas.length;
            }
            
            // Calculate average by professor within discipline
            const professorAverages = new Map();
            disciplineData.mediaPorProfessor.forEach((respostas, professor) => {
                if (respostas.length > 0) {
                    professorAverages.set(professor, respostas.reduce((sum, val) => sum + val, 0) / respostas.length);
                }
            });
            disciplineData.mediaPorProfessor = professorAverages;
            
            // Convert Sets to Arrays only at the end
            disciplineData.professores = Array.from(disciplineData.professores);
            disciplineData.alunos = Array.from(disciplineData.alunos);
            disciplineData.turmas = Array.from(disciplineData.turmas);
            disciplineData.avaliacoes = Array.from(disciplineData.avaliacoes);
            disciplineData.semestres = Array.from(disciplineData.semestres);
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