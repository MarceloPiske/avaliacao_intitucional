import { FirebaseCRUD } from '../../shared/firebase.js';

export class QuestionsManager {
    constructor() {
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
    }

    // Recebe a flag de bloqueio (isLocked)
    async openQuestionsModal(formularioId, isLocked = false) {
        try {
            document.querySelector('.modal-container-modern')?.classList.add('modal-lg');
            const formulario = await this.formulariosCRUD.read(formularioId);
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            const questoes = await questoesCRUD.readAll() || [];
            
            const modalContent = this.createQuestionsModalContent(formulario, questoes, formularioId, isLocked);
            
            document.getElementById('modal-title').textContent = 'Estrutura do Formulário';
            document.getElementById('modal-body').innerHTML = modalContent;
            document.getElementById('modal-overlay').style.display = 'flex';

            this.setupDelegatedEvents(formularioId, questoesCRUD, isLocked);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    createQuestionsModalContent(formulario, questoes, formularioId, isLocked) {
        const sortedQuestões = questoes.sort((a, b) => a.ordem - b.ordem);

        // Se estiver bloqueado, gera a mensagem de aviso
        const lockedBanner = isLocked ? `
            <div class="alert-box warning" style="margin-bottom: 20px;">
                <div class="alert-icon"><span class="material-icons">lock</span></div>
                <div class="alert-content">
                    <strong>Formulário Bloqueado para Edição</strong>
                    <p>Este formulário já está em uso por turmas ativas ou concluídas. Para garantir que as respostas passadas não perdem o sentido, a estrutura de questões está bloqueada.</p>
                    <p style="margin-top: 6px;"><em>Dica: Feche esta janela, clique em <span class="material-icons" style="font-size:14px; vertical-align:middle; color:var(--success);">content_copy</span> Duplicar, e altere as perguntas na nova cópia.</em></p>
                </div>
            </div>
        ` : '';

        return `
            <div class="questions-manager-layout" id="questionsManagerContainer">
                ${lockedBanner}
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <h4 style="margin: 0 0 4px 0; color: var(--text-primary); font-size: 16px;">${formulario.titulo}</h4>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 13px;">${questoes.length} questões cadastradas</p>
                    </div>
                    ${!isLocked ? `
                    <button class="btn-primary-modern" id="btnAddNewQuestion">
                        <span class="material-icons">add</span> Nova Questão
                    </button>` : ''}
                </div>
                
                <div class="questions-list-modern" style="display: flex; flex-direction: column; gap: 12px; max-height: 50vh; overflow-y: auto; padding-right: 8px;">
                    ${questoes.length === 0 ? 
                        `<div class="empty-state" style="text-align: center; padding: 40px;"><span class="material-icons" style="font-size: 40px; color: var(--border-color);">quiz</span><p>Este formulário ainda não tem perguntas.</p></div>` : 
                        sortedQuestões.map(questao => `
                            <div class="sm-item" style="align-items: flex-start; padding: 16px; ${isLocked ? 'background: #f8fafc;' : ''}">
                                <div class="avatar-wrapper initials" style="width: 28px; height: 28px; font-size: 12px; background: #f1f5f9; color: var(--text-secondary); margin-right: 12px; border: 1px solid var(--border-color);">${questao.ordem}</div>
                                <div class="sm-item-info" style="flex-direction: column; align-items: flex-start; gap: 6px;">
                                    <strong style="font-size: 14px; white-space: normal; ${isLocked ? 'color: var(--text-secondary);' : ''}">${questao.texto}</strong>
                                    <div style="display: flex; gap: 8px;">
                                        <span class="badge-modern" style="font-size: 10px; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;">${(questao.categoria || 'Geral').toUpperCase()}</span>
                                        <span class="badge-modern" style="font-size: 10px;">${questao.tipo === 'escala_1_a_5' ? '1 a 5 Estrelas' : 'Texto Livre'}</span>
                                    </div>
                                </div>
                                ${!isLocked ? `
                                <div style="display: flex; gap: 4px; margin-left: auto;">
                                    <button class="action-btn edit btn-edit-question" data-id="${questao.id}" title="Editar"><span class="material-icons">edit</span></button>
                                    <button class="action-btn delete btn-delete-question" data-id="${questao.id}" title="Excluir"><span class="material-icons">delete_outline</span></button>
                                </div>` : `<div style="margin-left: auto; color: var(--text-menu);"><span class="material-icons">lock</span></div>`}
                            </div>
                        `).join('')
                    }
                </div>
                
                <div id="questionFormContainer" style="display: none; background: #f8fafc; padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 20px;"></div>
            </div>
            
            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn-cancel" id="btnCancelModal">Fechar Painel</button>
            </div>
        `;
    }

    setupDelegatedEvents(formularioId, questoesCRUD, isLocked) {
        const container = document.getElementById('questionsManagerContainer');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            // Se estiver bloqueado, as ações de criar/editar ignoram o clique por segurança
            if (isLocked && (e.target.closest('#btnAddNewQuestion') || e.target.closest('.btn-edit-question') || e.target.closest('.btn-delete-question'))) {
                return; 
            }

            if (e.target.closest('#btnAddNewQuestion')) {
                this.renderQuestionForm(formularioId, questoesCRUD, null);
            }
            
            const btnEdit = e.target.closest('.btn-edit-question');
            if (btnEdit) {
                const questaoId = btnEdit.dataset.id;
                const questao = await questoesCRUD.read(questaoId);
                this.renderQuestionForm(formularioId, questoesCRUD, questao, questaoId);
            }

            const btnDelete = e.target.closest('.btn-delete-question');
            if (btnDelete) {
                if (confirm('Tem a certeza que deseja apagar esta pergunta?')) {
                    await questoesCRUD.delete(btnDelete.dataset.id);
                    this.openQuestionsModal(formularioId, isLocked); 
                }
            }

            if (e.target.closest('#btnCancelQuestionForm')) {
                document.getElementById('questionFormContainer').style.display = 'none';
            }
        });
    }

    // (A função renderQuestionForm mantém-se exatamente igual à versão da resposta anterior...)
    renderQuestionForm(formularioId, questoesCRUD, questao = null, questaoId = null) {
        const formContainer = document.getElementById('questionFormContainer');
        const isEdit = !!questao;

        formContainer.innerHTML = `
            <h5 style="margin: 0 0 16px 0;">${isEdit ? 'Editar Questão' : 'Criar Nova Questão'}</h5>
            <form id="innerQuestionForm">
                <div class="form-grid single-col" style="gap: 12px;">
                    <div class="form-group">
                        <label>Texto da Pergunta *</label>
                        <textarea name="texto" required style="min-height: 60px;">${isEdit ? questao.texto : ''}</textarea>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 80px; gap: 12px;">
                        <div class="form-group">
                            <label>Categoria</label>
                            <select name="categoria" required>
                                <option value="disciplina" ${isEdit && questao.categoria === 'disciplina' ? 'selected' : ''}>A Disciplina</option>
                                <option value="professor" ${isEdit && questao.categoria === 'professor' ? 'selected' : ''}>O Professor</option>
                                <option value="aluno" ${isEdit && questao.categoria === 'aluno' ? 'selected' : ''}>O Aluno (Autoavaliação)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tipo de Resposta</label>
                            <select name="tipo" required>
                                <option value="escala_1_a_5" ${isEdit && questao.tipo === 'escala_1_a_5' ? 'selected' : ''}>1 a 5 (Estrelas)</option>
                                <option value="texto_livre" ${isEdit && questao.tipo === 'texto_livre' ? 'selected' : ''}>Texto Livre (Comentário)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Ordem</label>
                            <input type="number" name="ordem" min="1" value="${isEdit ? questao.ordem : '1'}" required>
                        </div>
                    </div>
                </div>
                <div class="form-actions" style="margin-top: 16px; padding-top: 16px;">
                    <button type="button" class="btn-cancel" id="btnCancelQuestionForm">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">${isEdit ? 'sync' : 'add'}</span> ${isEdit ? 'Atualizar' : 'Adicionar'}</button>
                </div>
            </form>
        `;
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth' });

        document.getElementById('innerQuestionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const questaoData = {
                texto: formData.get('texto'),
                categoria: formData.get('categoria'),
                tipo: formData.get('tipo'),
                ordem: parseInt(formData.get('ordem'))
            };

            try {
                if (isEdit) await questoesCRUD.update(questaoId, questaoData);
                else await questoesCRUD.create(questaoData);
                
                this.openQuestionsModal(formularioId, false); // Ao salvar, o form certamente não está bloqueado
            } catch (error) {
                console.error(error);
            }
        });
    }
}