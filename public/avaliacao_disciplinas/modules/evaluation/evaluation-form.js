import { FirebaseCRUD } from '../shared/firebase.js';

export class EvaluationForm {
    constructor() {
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.currentFormulario = null;
        this.currentQuestoes = [];
        this.currentTurma = null;
        this.initializeForm();
        this.setupEventListeners();
    }

    async initializeForm() {
        try {
            // Get current turma and its formulario
            const turmaId = localStorage.getItem("atual_turma_id");
            if (!turmaId) {
                console.error('Turma ID não encontrada');
                return;
            }

            this.currentTurma = await this.turmasCRUD.read(turmaId);
            if (!this.currentTurma || !this.currentTurma.formularioId) {
                console.error('Turma ou formulário não encontrado');
                return;
            }

            // Load the specific formulario for this turma
            this.currentFormulario = await this.formulariosCRUD.read(this.currentTurma.formularioId);
            
            if (!this.currentFormulario) {
                console.error('Formulário não encontrado');
                return;
            }

            // Load questions for this formulario using the correct subcollection path
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${this.currentTurma.formularioId}/questoes`);
            const questoesData = await questoesCRUD.readAll();
            
            // Ensure we have valid questions data
            this.currentQuestoes = questoesData || [];
            
            // Sort questions by ordem
            this.currentQuestoes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

            console.log('Formulário carregado:', this.currentFormulario);
            console.log('Questões carregadas:', this.currentQuestoes);
            console.log('Total de questões:', this.currentQuestoes.length);

            // Populate form sections only if we have questions
            if (this.currentQuestoes.length > 0) {
                this.populateFormSections();
            } else {
                console.warn('Nenhuma questão encontrada para este formulário');
                console.warn('Caminho da subcoleção:', `ad_formularios/${this.currentTurma.formularioId}/questoes`);
            }
        } catch (error) {
            console.error('Erro ao carregar formulário:', error);
        }
    }

    populateFormSections() {
        // Group questions by categoria
        const groupedQuestions = {
            disciplina: [],
            aluno: [],
            professor: []
        };

        console.log('Agrupando questões por categoria...');
        this.currentQuestoes.forEach(questao => {
            const categoria = questao.categoria || 'disciplina';
            console.log(`Questão: ${questao.texto} - Categoria: ${categoria}`);
            if (groupedQuestions[categoria]) {
                groupedQuestions[categoria].push(questao);
            } else {
                console.warn(`Categoria desconhecida: ${categoria}`);
            }
        });

        console.log('Questões agrupadas:', groupedQuestions);

        // Populate each section
        const disciplinaContainer = document.getElementById('disciplina-questions');
        const alunoContainer = document.getElementById('aluno-questions');
        const professorContainer = document.getElementById('professor-questions');

        if (disciplinaContainer) {
            const disciplinaHtml = groupedQuestions.disciplina.map(q => this.createQuestionElement(q, 'disciplina')).join('');
            disciplinaContainer.innerHTML = disciplinaHtml;
            console.log('Disciplina HTML:', disciplinaHtml);
        }

        if (alunoContainer) {
            const alunoHtml = groupedQuestions.aluno.map(q => this.createQuestionElement(q, 'aluno')).join('');
            alunoContainer.innerHTML = alunoHtml;
            console.log('Aluno HTML:', alunoHtml);
        }

        if (professorContainer) {
            const professorHtml = groupedQuestions.professor.map(q => this.createQuestionElement(q, 'professor')).join('');
            professorContainer.innerHTML = professorHtml;
            console.log('Professor HTML:', professorHtml);
        }
    }

    createQuestionElement(questao, categoria) {
        const inputType = questao.tipo || 'escala_1_a_5';
        const questionId = questao.id || `${categoria}_${questao.ordem || Math.random()}`;
        
        console.log(`Criando elemento para questão: ${questao.texto} (${inputType})`);
        
        if (inputType === 'escala_1_a_5') {
            return `
                <div class="question-group">
                    <p>${questao.texto}</p>
                    <div class="radio-group">
                        ${[1, 2, 3, 4, 5].map(value => `
                            <div class="radio-option">
                                <input type="radio" name="${categoria}_${questionId}" value="${value}" required>
                                <label>${value}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (inputType === 'texto_livre') {
            return `
                <div class="question-group">
                    <p>${questao.texto}</p>
                    <textarea name="${categoria}_${questionId}" placeholder="Digite sua resposta..."></textarea>
                </div>
            `;
        }
        return '';
    }

    setupEventListeners() {
        // Form submission handler
        document.getElementById('avaliacaoForm').addEventListener('submit', async (e) => {
            await this.handleFormSubmission(e);
        });

        // Close form handlers
        document.querySelector('.close-btn').addEventListener('click', () => {
            this.closeForm();
        });

        document.querySelector('.evaluation-form-overlay').addEventListener('click', (e) => {
            if (e.target === document.querySelector('.evaluation-form-overlay')) {
                this.closeForm();
            }
        });
    }

    async handleFormSubmission(e) {
        e.preventDefault();

        // Validate required questions before submission
        if (!this.validateRequiredQuestions()) {
            return;
        }

        const userId = localStorage.getItem("user_id");
        const turmaId = localStorage.getItem("atual_turma_id");

        if (!this.currentFormulario || !this.currentQuestoes || this.currentQuestoes.length === 0) {
            alert('Formulário ou questões não encontrados. Recarregue a página.');
            return;
        }

        // Ensure we have a valid formulario ID
        const formularioId = this.currentFormulario.id || this.currentTurma?.formularioId;
        if (!formularioId) {
            alert('ID do formulário não encontrado. Recarregue a página.');
            return;
        }

        try {
            // Create the main evaluation document
            const avaliacaoData = {
                alunoId: userId,
                turmaId: turmaId,
                formularioId: formularioId, // Use the verified formularioId
                dataResposta: new Date(),
                comentarios: document.querySelector('textarea[name="comentarios"]').value || "",
                sugestoes: document.querySelector('textarea[name="sugestoes"]').value || ""
            };

            const avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
            
            // Create evaluation document with a generated ID
            const avaliacaoId = this.generateId();
            await avaliacoesCRUD.create({ id: avaliacaoId, ...avaliacaoData });

            // Create subcollection for responses
            const respostasCRUD = new FirebaseCRUD(`ad_avaliacoes/${avaliacaoId}/respostas`);
            
            // Collect and save all responses
            const responsePromises = this.currentQuestoes.map(async (questao) => {
                const categoria = questao.categoria || 'disciplina';
                const questionId = questao.id || `${categoria}_${questao.ordem || Math.random()}`;
                const inputName = `${categoria}_${questionId}`;
                let respostaValor = null;

                const inputType = questao.tipo || 'escala_1_a_5';
                
                if (inputType === 'escala_1_a_5') {
                    const selectedRadio = document.querySelector(`input[name="${inputName}"]:checked`);
                    if (selectedRadio) {
                        respostaValor = parseInt(selectedRadio.value);
                    }
                } else if (inputType === 'texto_livre') {
                    const textarea = document.querySelector(`textarea[name="${inputName}"]`);
                    if (textarea) {
                        respostaValor = textarea.value;
                    }
                }

                if (respostaValor !== null && respostaValor !== '') {
                    const respostaData = {
                        questaoTexto: questao.texto,
                        respostaValor: respostaValor,
                        tipo: categoria,
                        ordem: questao.ordem || 0
                    };

                    await respostasCRUD.create(respostaData);
                }
            });

            await Promise.all(responsePromises);

            alert('Avaliação enviada com sucesso!');
            this.closeForm();
            
            // Reload the page to refresh the disciplines list
            window.location.reload();
        } catch (error) {
            console.error('Erro ao enviar avaliação:', error);
            alert('Erro ao enviar avaliação. Tente novamente.');
        }
    }

    validateRequiredQuestions() {
        if (!this.currentQuestoes || this.currentQuestoes.length === 0) {
            alert('Formulário não encontrado. Recarregue a página.');
            return false;
        }

        const requiredQuestions = this.currentQuestoes.filter(questao => 
            (questao.tipo || 'escala_1_a_5') === 'escala_1_a_5'
        );

        const unansweredQuestions = [];

        for (const questao of requiredQuestions) {
            const categoria = questao.categoria || 'disciplina';
            const questionId = questao.id || `${categoria}_${questao.ordem || Math.random()}`;
            const inputName = `${categoria}_${questionId}`;
            
            const selectedRadio = document.querySelector(`input[name="${inputName}"]:checked`);
            if (!selectedRadio) {
                unansweredQuestions.push({
                    texto: questao.texto,
                    categoria: categoria
                });
            }
        }

        if (unansweredQuestions.length > 0) {
            const categoryNames = {
                'disciplina': 'Sobre a Disciplina',
                'aluno': 'Sobre você',
                'professor': 'Sobre o Professor'
            };

            let message = 'Por favor, responda todas as questões obrigatórias:\n\n';
            
            // Group by category for better user experience
            const groupedByCategory = {};
            unansweredQuestions.forEach(q => {
                if (!groupedByCategory[q.categoria]) {
                    groupedByCategory[q.categoria] = [];
                }
                groupedByCategory[q.categoria].push(q.texto);
            });

            Object.entries(groupedByCategory).forEach(([categoria, questoes]) => {
                message += `${categoryNames[categoria]}:\n`;
                questoes.forEach((texto, index) => {
                    const shortText = texto.length > 60 ? texto.substring(0, 60) + '...' : texto;
                    message += `  ${index + 1}. ${shortText}\n`;
                });
                message += '\n';
            });

            message += 'As questões de texto são opcionais e podem ser deixadas em branco.';
            
            alert(message);
            
            // Scroll to the first unanswered question
            if (unansweredQuestions.length > 0) {
                const firstUnanswered = unansweredQuestions[0];
                const categoria = firstUnanswered.categoria;
                const sectionId = `${categoria}-questions`;
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
            
            return false;
        }

        return true;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async showForm(disciplineName, professorName) {
        // Initialize form data first
        await this.initializeForm();
        
        if (!this.currentFormulario) {
            alert('Formulário não encontrado para esta turma.');
            return;
        }

        if (!this.currentQuestoes || this.currentQuestoes.length === 0) {
            alert('Nenhuma questão encontrada neste formulário. Verifique se o formulário possui questões cadastradas.');
            return;
        }

        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.innerHTML = `
                Avaliação da Disciplina: ${disciplineName}
                <p style="color: #546e7a; font-size: 0.9em; margin-top: 0.5rem; font-weight: normal;">Professor(a): ${professorName}</p>
            `;
        }
        
        // Show the form
        document.querySelector('.evaluation-form-overlay').style.display = 'block';
        
        // Give a small delay to ensure DOM is updated, then populate
        setTimeout(() => {
            this.populateFormSections();
        }, 100);
    }

    closeForm() {
        document.querySelector('.evaluation-form-overlay').style.display = 'none';
    }
}