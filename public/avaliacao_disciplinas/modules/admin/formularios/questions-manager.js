import { FirebaseCRUD } from '../../shared/firebase.js';

export class QuestionsManager {
    constructor() {
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
    }

    async openQuestionsModal(formularioId) {
        try {
            const formulario = await this.formulariosCRUD.read(formularioId);
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            const questoes = await questoesCRUD.readAll();
            
            const modalContent = this.createQuestionsModalContent(formulario, questoes, formularioId);
            this.showModal('Gerenciar Questões', modalContent);
        } catch (error) {
            console.error('Erro ao carregar questões:', error);
            alert('Erro ao carregar questões do formulário.');
        }
    }

    createQuestionsModalContent(formulario, questoes, formularioId) {
        return `
            <div class="questions-section">
                <h4>Questões do Formulário: ${formulario.titulo}</h4>
                
                <button class="add-question-btn" onclick="addNewQuestion('${formularioId}')">
                    <span class="material-icons">add</span> Adicionar Nova Questão
                </button>
                
                <div id="questions-list">
                    ${questoes.length === 0 ? 
                        '<div class="no-data-message">Nenhuma questão cadastrada</div>' : 
                        questoes.sort((a, b) => a.ordem - b.ordem).map(questao => `
                            <div class="question-item">
                                <div class="question-content">
                                    <div class="question-text">${questao.texto}</div>
                                    <div class="question-meta">
                                        Categoria: ${questao.categoria || 'Não definida'} | Tipo: ${questao.tipo} | Ordem: ${questao.ordem}
                                    </div>
                                </div>
                                <div class="question-actions">
                                    <button class="action-btn edit" onclick="editQuestion('${formularioId}', '${questao.id}')">
                                        Editar
                                    </button>
                                    <button class="action-btn delete" onclick="deleteQuestion('${formularioId}', '${questao.id}')">
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
            </div>
        `;
    }

    async openAddQuestionModal(formularioId) {
        const modalContent = this.createAddQuestionModalContent(formularioId);
        this.showModal('Adicionar Questão', modalContent);
        this.setupAddQuestionHandler();
    }

    createAddQuestionModalContent(formularioId) {
        return `
            <form id="questionForm" data-formulario-id="${formularioId}">
                <div class="question-form">
                    <h5>Nova Questão</h5>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="texto">Texto da Questão *</label>
                            <textarea id="texto" name="texto" required placeholder="Digite o texto da questão..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="categoria">Categoria *</label>
                            <select id="categoria" name="categoria" required>
                                <option value="">Selecione a categoria</option>
                                <option value="disciplina">Disciplina</option>
                                <option value="professor">Professor</option>
                                <option value="aluno">Aluno</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tipo">Tipo de Resposta *</label>
                            <select id="tipo" name="tipo" required>
                                <option value="">Selecione o tipo</option>
                                <option value="escala_1_a_5">Escala 1 a 5</option>
                                <option value="texto_livre">Texto Livre</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ordem">Ordem *</label>
                            <input type="number" id="ordem" name="ordem" min="1" required placeholder="1">
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Questão</button>
                </div>
            </form>
        `;
    }

    async openEditQuestionModal(formularioId, questaoId) {
        try {
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            const questao = await questoesCRUD.read(questaoId);
            
            const modalContent = this.createEditQuestionModalContent(questao, formularioId, questaoId);
            this.showModal('Editar Questão', modalContent);
            this.setupEditQuestionHandler();
        } catch (error) {
            console.error('Erro ao carregar questão:', error);
            alert('Erro ao carregar dados da questão.');
        }
    }

    createEditQuestionModalContent(questao, formularioId, questaoId) {
        return `
            <form id="questionEditForm" data-formulario-id="${formularioId}" data-questao-id="${questaoId}">
                <div class="question-form">
                    <h5>Editar Questão</h5>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="texto">Texto da Questão *</label>
                            <textarea id="texto" name="texto" required>${questao.texto}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="categoria">Categoria *</label>
                            <select id="categoria" name="categoria" required>
                                <option value="">Selecione a categoria</option>
                                <option value="disciplina" ${questao.categoria === 'disciplina' ? 'selected' : ''}>Disciplina</option>
                                <option value="professor" ${questao.categoria === 'professor' ? 'selected' : ''}>Professor</option>
                                <option value="aluno" ${questao.categoria === 'aluno' ? 'selected' : ''}>Aluno</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="tipo">Tipo de Resposta *</label>
                            <select id="tipo" name="tipo" required>
                                <option value="">Selecione o tipo</option>
                                <option value="escala_1_a_5" ${questao.tipo === 'escala_1_a_5' ? 'selected' : ''}>Escala 1 a 5</option>
                                <option value="texto_livre" ${questao.tipo === 'texto_livre' ? 'selected' : ''}>Texto Livre</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ordem">Ordem *</label>
                            <input type="number" id="ordem" name="ordem" min="1" value="${questao.ordem}" required>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Atualizar Questão</button>
                </div>
            </form>
        `;
    }

    setupAddQuestionHandler() {
        document.getElementById('questionForm').addEventListener('submit', async (e) => {
            await this.handleQuestionSubmit(e);
        });
    }

    setupEditQuestionHandler() {
        document.getElementById('questionEditForm').addEventListener('submit', async (e) => {
            await this.handleQuestionEditSubmit(e);
        });
    }

    async handleQuestionSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const formularioId = e.target.dataset.formularioId;
        
        const questaoData = {
            texto: formData.get('texto'),
            categoria: formData.get('categoria'),
            tipo: formData.get('tipo'),
            ordem: parseInt(formData.get('ordem'))
        };

        try {
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            await questoesCRUD.create(questaoData);
            alert('Questão criada com sucesso!');
            
            this.openQuestionsModal(formularioId);
        } catch (error) {
            console.error('Erro ao criar questão:', error);
            alert('Erro ao criar questão. Tente novamente.');
        }
    }

    async handleQuestionEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const formularioId = e.target.dataset.formularioId;
        const questaoId = e.target.dataset.questaoId;
        
        const questaoData = {
            texto: formData.get('texto'),
            categoria: formData.get('categoria'),
            tipo: formData.get('tipo'),
            ordem: parseInt(formData.get('ordem'))
        };

        try {
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            await questoesCRUD.update(questaoId, questaoData);
            alert('Questão atualizada com sucesso!');
            
            this.openQuestionsModal(formularioId);
        } catch (error) {
            console.error('Erro ao atualizar questão:', error);
            alert('Erro ao atualizar questão. Tente novamente.');
        }
    }

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'block';
    }
}