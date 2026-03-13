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
            const turmaId = localStorage.getItem("atual_turma_id");
            if (!turmaId) return;

            this.currentTurma = await this.turmasCRUD.read(turmaId);
            if (!this.currentTurma || !this.currentTurma.formularioId) return;

            this.currentFormulario = await this.formulariosCRUD.read(this.currentTurma.formularioId);
            
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${this.currentTurma.formularioId}/questoes`);
            const questoesData = await questoesCRUD.readAll();
            this.currentQuestoes = questoesData || [];
            this.currentQuestoes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

            if (this.currentQuestoes.length > 0) this.populateFormSections();

        } catch (error) {
            console.error('Erro ao carregar formulário:', error);
        }
    }

    populateFormSections() {
        const groupedQuestions = { disciplina: [], aluno: [], professor: [] };

        this.currentQuestoes.forEach(questao => {
            const categoria = questao.categoria || 'disciplina';
            if (groupedQuestions[categoria]) groupedQuestions[categoria].push(questao);
        });

        // Injeta o HTML em cada seção e adiciona um título à seção se ela tiver perguntas
        const renderSection = (id, questions, title, icon) => {
            const container = document.getElementById(id);
            if (container) {
                if (questions.length > 0) {
                    container.innerHTML = `<h2 style="color: var(--primary-700); margin-bottom: 24px;"><span class="material-icons" style="vertical-align:text-bottom;">${icon}</span> ${title}</h2>` + 
                                          questions.map(q => this.createQuestionElement(q, id.split('-')[0])).join('');
                } else {
                    container.innerHTML = '';
                    container.parentElement.style.display = 'none'; // Esconde a seção se vazia
                }
            }
        };

        renderSection('disciplina-questions', groupedQuestions.disciplina, 'Sobre a Disciplina', 'menu_book');
        renderSection('professor-questions', groupedQuestions.professor, 'Sobre o Docente', 'person');
        renderSection('aluno-questions', groupedQuestions.aluno, 'Autoavaliação (Aluno)', 'face');

        this.setupInteractiveUI(); // Liga o Auto-scroll e Barra de Progresso
    }

    createQuestionElement(questao, categoria) {
        const inputType = questao.tipo || 'escala_1_a_5';
        const questionId = questao.id || `${categoria}_${questao.ordem || Math.random().toString(36).substr(2, 9)}`;
        const inputName = `${categoria}_${questionId}`;
        
        // Legendas sérias e profissionais
        const legends = ['Muito Mau', 'Mau', 'Razoável', 'Bom', 'Excelente'];
        
        if (inputType === 'escala_1_a_5') {
            return `
                <div class="question-group" id="q_${inputName}">
                    <p class="question-text">${questao.ordem ? questao.ordem + '.' : ''} ${questao.texto}</p>
                    <div class="radio-group">
                        ${[1, 2, 3, 4, 5].map((value, index) => `
                            <label class="radio-option">
                                <input type="radio" name="${inputName}" value="${value}" required>
                                <span class="radio-number">${value}</span>
                                <span class="radio-label-text">${legends[index]}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="question-group" id="q_${inputName}">
                    <p class="question-text">${questao.ordem ? questao.ordem + '.' : ''} ${questao.texto}</p>
                    <textarea name="${inputName}" placeholder="A sua resposta (opcional)..." class="modern-textarea"></textarea>
                </div>
            `;
        }
    }

    // ==========================================
    // MAGIA DE UI: Auto-Scroll e Barra de Progresso
    // ==========================================
    setupInteractiveUI() {
        const requiredInputs = document.querySelectorAll('input[type="radio"]');
        const totalGroups = new Set(Array.from(requiredInputs).map(i => i.name)).size;

        const updateProgress = () => {
            const answeredGroups = new Set(Array.from(document.querySelectorAll('input[type="radio"]:checked')).map(i => i.name)).size;
            const percentage = totalGroups === 0 ? 100 : Math.round((answeredGroups / totalGroups) * 100);
            
            document.getElementById('progress-percentage').textContent = `${percentage}%`;
            document.getElementById('form-progress-fill').style.width = `${percentage}%`;
            
            // Se chegou a 100%, destaca o botão de enviar
            const btnSubmit = document.getElementById('btnSubmitAvaliacao');
            if (percentage === 100) {
                btnSubmit.style.transform = 'scale(1.05)';
                btnSubmit.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
                btnSubmit.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            }
        };

        // Adiciona evento a cada clique nas bolinhas
        requiredInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                // 1. Atualiza Barra
                updateProgress();
                
                // 2. Remove estado de erro (se tivesse)
                const qGroup = e.target.closest('.question-group');
                qGroup.classList.remove('has-error');

                // 3. AUTO-SCROLL Suave para a próxima pergunta!
                const allGroups = Array.from(document.querySelectorAll('.question-group'));
                const currentIndex = allGroups.indexOf(qGroup);
                if (currentIndex >= 0 && currentIndex < allGroups.length - 1) {
                    setTimeout(() => {
                        allGroups[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 250); // Pequeno delay para a animação do botão terminar
                }
            });
        });

        // Inicializa a barra a 0%
        updateProgress();
    }

    setupEventListeners() {
        document.getElementById('avaliacaoForm').addEventListener('submit', async (e) => {
            await this.handleFormSubmission(e);
        });

        document.querySelector('.close-btn').addEventListener('click', () => this.closeForm());
    }

    // ==========================================
    // VALIDAÇÃO COM TOASTS E SHAKE EFFECT
    // ==========================================
    validateRequiredQuestions() {
        const requiredQuestions = this.currentQuestoes.filter(q => (q.tipo || 'escala_1_a_5') === 'escala_1_a_5');
        let hasError = false;
        let firstErrorElement = null;

        // Limpa erros antigos
        document.querySelectorAll('.question-group.has-error').forEach(el => el.classList.remove('has-error'));

        for (const questao of requiredQuestions) {
            const categoria = questao.categoria || 'disciplina';
            const questionId = questao.id || `${categoria}_${questao.ordem}`;
            const inputName = `${categoria}_${questionId}`;
            
            const isAnswered = document.querySelector(`input[name="${inputName}"]:checked`);
            if (!isAnswered) {
                hasError = true;
                const groupEl = document.getElementById(`q_${inputName}`);
                if (groupEl) {
                    groupEl.classList.add('has-error');
                    if (!firstErrorElement) firstErrorElement = groupEl;
                }
            }
        }

        if (hasError) {
            this.showToast('Faltam responder algumas questões obrigatórias (a vermelho).', 'error');
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        return true;
    }

    async handleFormSubmission(e) {
        e.preventDefault();

        if (!this.validateRequiredQuestions()) return;

        const userId = localStorage.getItem("user_id");
        const turmaId = localStorage.getItem("atual_turma_id");
        const formularioId = this.currentFormulario?.id || this.currentTurma?.formularioId;

        const btnSubmit = document.getElementById('btnSubmitAvaliacao');
        btnSubmit.innerHTML = '<div class="loader" style="width:20px;height:20px;border-width:2px;display:inline-block;"></div> A Enviar...';
        btnSubmit.disabled = true;

        try {
            const avaliacaoData = {
                alunoId: userId, turmaId: turmaId, formularioId: formularioId,
                dataResposta: new Date(),
                comentarios: document.querySelector('textarea[name="comentarios"]')?.value || "",
            };

            const avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
            const avaliacaoId = this.generateId();
            await avaliacoesCRUD.create({ id: avaliacaoId, ...avaliacaoData });

            const respostasCRUD = new FirebaseCRUD(`ad_avaliacoes/${avaliacaoId}/respostas`);
            
            const responsePromises = this.currentQuestoes.map(async (questao) => {
                const categoria = questao.categoria || 'disciplina';
                const questionId = questao.id || `${categoria}_${questao.ordem}`;
                const inputName = `${categoria}_${questionId}`;
                let respostaValor = null;

                if ((questao.tipo || 'escala_1_a_5') === 'escala_1_a_5') {
                    const sel = document.querySelector(`input[name="${inputName}"]:checked`);
                    if (sel) respostaValor = parseInt(sel.value);
                } else {
                    const txt = document.querySelector(`textarea[name="${inputName}"]`);
                    if (txt) respostaValor = txt.value;
                }

                if (respostaValor !== null && respostaValor !== '') {
                    await respostasCRUD.create({
                        questaoTexto: questao.texto, respostaValor: respostaValor, tipo: categoria, ordem: questao.ordem || 0
                    });
                }
            });

            await Promise.all(responsePromises);

            this.showToast('🎉 Avaliação submetida com sucesso! Obrigado pelo seu feedback.', 'success');
            
            setTimeout(() => {
                this.closeForm();
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Erro:', error);
            this.showToast('Erro ao enviar. Verifique a sua ligação à internet.', 'error');
            btnSubmit.innerHTML = '<span class="material-icons">send</span> Submeter Avaliação';
            btnSubmit.disabled = false;
        }
    }

    generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `modern-toast toast-${type}`;
        const icon = type === 'success' ? 'check_circle' : 'error_outline';
        toast.innerHTML = `<span class="material-icons">${icon}</span><p>${message}</p>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
    }

    async showForm(disciplineName, professorName) {
        await this.initializeForm();
        if (!this.currentFormulario || !this.currentQuestoes.length) {
            this.showToast('Este formulário ainda não tem perguntas ativas.', 'error');
            return;
        }

        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.innerHTML = `
                ${disciplineName}
                <div style="color: var(--primary-600); font-size: 14px; margin-top: 8px; font-weight: 500;">
                    <span class="material-icons" style="font-size:16px; vertical-align:text-bottom;">person</span> Prof. ${professorName}
                </div>
            `;
        }
        
        document.querySelector('.evaluation-form-overlay').style.display = 'block';
    }

    closeForm() { document.querySelector('.evaluation-form-overlay').style.display = 'none'; }
}