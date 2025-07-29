import { FirebaseCRUD } from '../shared/firebase.js';

export class DisciplinesManager {
    constructor() {
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
    }

    async loadDisciplines() {
        try {
            const userId = localStorage.getItem("user_id");
            const turmas = await this.turmasCRUD.readWhere("alunosInscritos", "array-contains", userId);
            const avaliacoes = await this.avaliacoesCRUD.readWhere("alunoId", "==", userId);

            const disciplinesData = { "disciplines": [] };
            const disciplinesGrid = document.querySelector('.disciplines-grid');
            disciplinesGrid.innerHTML = '';

            // Convert turmas to discipline format and check evaluation status
            for (const turma of turmas) {
                const discipline = {
                    id: turma.id,
                    name: turma.disciplinaNome,
                    professor: turma.professorNome,
                    semestre: turma.semestre,
                    status: turma.statusAvaliacao === 'aberta' ? 'pending' : 'closed',
                    professorId: turma.professorId,
                    disciplinaId: turma.disciplinaId
                };

                // Check if student has already evaluated this turma
                const jaAvaliado = avaliacoes.some(avaliacao => avaliacao.turmaId === turma.id);
                if (jaAvaliado) {
                    discipline.status = 'completed';
                }

                // Only show turmas that are open for evaluation or already completed
                if (turma.statusAvaliacao === 'aberta' || jaAvaliado) {
                    disciplinesData.disciplines.push(discipline);
                    const card = this.createDisciplineCard(discipline);
                    disciplinesGrid.appendChild(card);
                }
            }

            return disciplinesData;
        } catch (error) {
            console.error('Erro ao carregar disciplinas:', error);
            return { disciplines: [] };
        }
    }

    createDisciplineCard(discipline) {
        const card = document.createElement('div');
        card.id = discipline.id;
        card.className = 'discipline-card' + (discipline.status === 'completed' ? ' completed' : '');

        card.innerHTML = `
            <div class="semester-info">
                <span>Semestre: ${discipline.semestre}</span>
            </div>
            <h3>${discipline.name}</h3>
            <p>Professor(a): ${discipline.professor}</p>
            <div class="evaluation-status">
                <div class="status-icon ${discipline.status === 'completed' ? 'completed' : 'pending'}"></div>
                <span style="color: ${discipline.status === 'completed' ? '#10b981' : '#0ea5e9'}">
                    ${discipline.status === 'completed' ? 'Avaliação Concluída' : 'Avaliação Pendente'}
                </span>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${discipline.status === 'completed' ? '100%' : '0%'}"></div>
            </div>
            ${discipline.status === 'completed' ? 
                '<div class="completed-message">✓ Avaliação já realizada</div>' : 
                '<button class="evaluate-btn">Avaliar Disciplina</button>'
            }
        `;

        return card;
    }

    attachEventListeners(disciplinesData, evaluationForm) {
        document.querySelectorAll('.evaluate-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = button.closest('.discipline-card');
                const discipline = disciplinesData.disciplines.find(d => d.id === card.id);
                
                if (discipline.status === 'completed') {
                    alert('Você já avaliou esta disciplina.');
                    return;
                }
                
                localStorage.setItem("atual_turma_id", card.id);
                localStorage.setItem("atual_disciplina_nome", discipline.name);
                localStorage.setItem("atual_professor_nome", discipline.professor);
                localStorage.setItem("atual_professor_id", discipline.professorId);
                localStorage.setItem("atual_disciplina_id", discipline.disciplinaId);

                evaluationForm.showForm(discipline.name, discipline.professor);
            });
        });

        // Card hover effects
        document.querySelectorAll('.discipline-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                if (!card.classList.contains('completed')) {
                    card.style.transform = 'translateY(-4px)';
                }
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }
}