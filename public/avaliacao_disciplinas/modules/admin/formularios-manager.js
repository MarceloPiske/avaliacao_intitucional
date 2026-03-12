import { FormulariosRenderer } from './formularios/formularios-renderer.js';
import { QuestionsManager } from './formularios/questions-manager.js';
import { FirebaseCRUD } from '../shared/firebase.js';

export class FormulariosManager {
    constructor() {
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
        this.turmasCRUD = new FirebaseCRUD("ad_turmas"); // Necessário para verificar uso
        this.renderer = new FormulariosRenderer();
        this.questionsManager = new QuestionsManager();
        
        this.setupDelegatedEvents();
    }

    // ==========================================
    // VERIFICADOR DE INTEGRIDADE (Bloqueio)
    // ==========================================
    async isFormularioInUse(formId) {
        try {
            // Se alguma turma existir e usar este formId, ele é considerado "Em Uso"
            const turmas = await this.turmasCRUD.readAll() || [];
            return turmas.some(t => t.formularioId === formId);
        } catch (e) {
            console.error('Erro ao verificar integridade:', e);
            return false;
        }
    }

    setupDelegatedEvents() {
        const container = document.querySelector('#formularios-section');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (!actionBtn) return;

            const formId = actionBtn.dataset.id;
            const action = actionBtn.dataset.action;

            if (action === 'questions') {
                const isLocked = await this.isFormularioInUse(formId); // Verifica se está em uso
                await this.questionsManager.openQuestionsModal(formId, isLocked); // Passa o cadeado
            }
            else if (action === 'edit') await this.openEditModal(formId);
            else if (action === 'duplicate') await this.duplicateFormulario(formId);
            else if (action === 'delete') await this.deleteFormulario(formId);
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.id === 'btnCancelModal' || e.target.closest('#modal-close')) {
                document.getElementById('modal-overlay').style.display = 'none';
            }
        });
    }

    async loadData() {
        try {
            const formularios = await this.formulariosCRUD.readAll() || [];
            this.renderer.renderFormularios(formularios);
        } catch (error) {
            console.error('Erro ao carregar formulários:', error);
        }
    }

    // ... (As funções openAddModal, handleFormSubmit, openEditModal, handleEditSubmit, duplicateFormulario mantêm-se inalteradas como lhe enviei no código anterior) ...
    async openAddModal() {
        document.querySelector('.modal-container-modern')?.classList.remove('modal-lg');
        document.getElementById('modal-title').textContent = 'Novo Formulário Base';
        document.getElementById('modal-body').innerHTML = this.renderer.createAddFormModal();
        document.getElementById('modal-overlay').style.display = 'flex';
        document.getElementById('formularioForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const novoForm = { titulo: formData.get('titulo'), ativo: formData.get('ativo') === 'true', dataCriacao: new Date() };
        try { await this.formulariosCRUD.create(novoForm); document.getElementById('modal-overlay').style.display = 'none'; this.loadData(); } catch (error) { console.error(error); }
    }

    async openEditModal(formId) {
        try {
            document.querySelector('.modal-container-modern')?.classList.remove('modal-lg');
            const formulario = await this.formulariosCRUD.read(formId);
            document.getElementById('modal-title').textContent = 'Configurar Formulário';
            document.getElementById('modal-body').innerHTML = this.renderer.createEditFormModal(formulario, formId);
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('formularioEditForm').addEventListener('submit', (e) => this.handleEditSubmit(e));
        } catch (error) { console.error(error); }
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const formId = e.target.dataset.formularioId;
        const formUpdate = { titulo: formData.get('titulo'), ativo: formData.get('ativo') === 'true' };
        try { await this.formulariosCRUD.update(formId, formUpdate); document.getElementById('modal-overlay').style.display = 'none'; this.loadData(); } catch (error) { console.error(error); }
    }

    async duplicateFormulario(formId) {
        if (confirm('Deseja criar uma cópia exata deste formulário e das suas questões?')) {
            try {
                const formOriginal = await this.formulariosCRUD.read(formId);
                const novoForm = { titulo: `${formOriginal.titulo} (Cópia)`, ativo: false, dataCriacao: new Date() };
                const novoFormRef = await this.formulariosCRUD.create(novoForm);
                const novoFormId = novoFormRef.id;

                if (novoFormId) {
                    const questoesOriginaisCRUD = new FirebaseCRUD(`ad_formularios/${formId}/questoes`);
                    const questoes = await questoesOriginaisCRUD.readAll() || [];
                    const questoesNovasCRUD = new FirebaseCRUD(`ad_formularios/${novoFormId}/questoes`);
                    for (const q of questoes) { await questoesNovasCRUD.create({ texto: q.texto, categoria: q.categoria, tipo: q.tipo, ordem: q.ordem }); }
                }
                this.loadData();
            } catch (error) { console.error('Erro ao duplicar:', error); }
        }
    }

    async deleteFormulario(formId) {
        // BLOQUEIO DE SEGURANÇA
        const isLocked = await this.isFormularioInUse(formId);
        if (isLocked) {
            alert('⛔ AÇÃO BLOQUEADA\n\nEste formulário está vinculado a turmas. Para proteger a integridade dos relatórios e avaliações, ele não pode ser apagado do banco de dados.\n\nSe não deseja mais utilizá-lo para novas turmas, clique em "Editar" e mude o status para "Inativo".');
            return;
        }

        if (confirm('Tem a certeza que deseja excluir este formulário?\n\nAtenção: O formulário e todas as questões serão permanentemente apagados.')) {
            try {
                await this.formulariosCRUD.delete(formId);
                this.loadData();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    }
}