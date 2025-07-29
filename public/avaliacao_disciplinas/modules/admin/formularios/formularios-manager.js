import { FirebaseCRUD } from '../../shared/firebase.js';
import { FormulariosRenderer } from './formularios-renderer.js';
import { QuestionsManager } from './questions-manager.js';

export class FormulariosManager {
    constructor() {
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
        this.renderer = new FormulariosRenderer();
        this.questionsManager = new QuestionsManager();
    }

    async loadData() {
        try {
            const formularios = await this.formulariosCRUD.readAll();
            this.renderer.renderFormularios(formularios);
        } catch (error) {
            console.error('Erro ao carregar formulários:', error);
        }
    }

    openAddModal() {
        const modalContent = this.renderer.createAddFormModal();
        this.showModal('Adicionar Formulário', modalContent);
        this.setupAddFormHandler();
    }

    async openEditModal(formularioId) {
        try {
            const formulario = await this.formulariosCRUD.read(formularioId);
            const modalContent = this.renderer.createEditFormModal(formulario, formularioId);
            this.showModal('Editar Formulário', modalContent);
            this.setupEditFormHandler();
        } catch (error) {
            console.error('Erro ao carregar formulário:', error);
            alert('Erro ao carregar dados do formulário.');
        }
    }

    async openQuestionsModal(formularioId) {
        await this.questionsManager.openQuestionsModal(formularioId);
    }

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'block';
    }

    setupAddFormHandler() {
        document.getElementById('formularioForm').addEventListener('submit', async (e) => {
            await this.handleFormularioSubmit(e);
        });
    }

    setupEditFormHandler() {
        document.getElementById('formularioEditForm').addEventListener('submit', async (e) => {
            await this.handleFormularioEditSubmit(e);
        });
    }

    async handleFormularioSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const formularioData = {
            titulo: formData.get('titulo'),
            ativo: formData.get('ativo') === 'true',
            dataCriacao: new Date()
        };

        try {
            await this.formulariosCRUD.create(formularioData);
            alert('Formulário criado com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao criar formulário:', error);
            alert('Erro ao criar formulário. Tente novamente.');
        }
    }

    async handleFormularioEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const formularioId = e.target.dataset.formularioId;
        
        const formularioData = {
            titulo: formData.get('titulo'),
            ativo: formData.get('ativo') === 'true'
        };

        try {
            await this.formulariosCRUD.update(formularioId, formularioData);
            alert('Formulário atualizado com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao atualizar formulário:', error);
            alert('Erro ao atualizar formulário. Tente novamente.');
        }
    }

    async duplicateFormulario(formularioId) {
        try {
            // Get the original form
            const originalFormulario = await this.formulariosCRUD.read(formularioId);
            
            if (!originalFormulario) {
                alert('Formulário não encontrado.');
                return;
            }

            // Create the duplicate form data
            const duplicatedFormularioData = {
                titulo: `${originalFormulario.titulo} - Cópia`,
                ativo: true, // Set duplicate as active by default
                dataCriacao: new Date()
            };

            // Create the new form
            const newFormularioResult = await this.formulariosCRUD.create(duplicatedFormularioData);
            
            // Get the new form ID (Firebase generates it automatically)
            let newFormularioId;
            if (newFormularioResult && newFormularioResult.id) {
                newFormularioId = newFormularioResult.id;
            } else {
                // If the result doesn't have an ID, we need to find it by the unique combination
                const allFormularios = await this.formulariosCRUD.readAll();
                const newForm = allFormularios.find(f => 
                    f.titulo === duplicatedFormularioData.titulo && 
                    f.dataCriacao.toMillis() === duplicatedFormularioData.dataCriacao.getTime()
                );
                newFormularioId = newForm ? newForm.id : null;
            }

            if (!newFormularioId) {
                alert('Erro ao criar formulário duplicado.');
                return;
            }

            // Now duplicate all questions from the original form
            const originalQuestoesCRUD = new (await import('../../shared/firebase.js')).FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            const originalQuestoes = await originalQuestoesCRUD.readAll();

            if (originalQuestoes && originalQuestoes.length > 0) {
                const newQuestoesCRUD = new (await import('../../shared/firebase.js')).FirebaseCRUD(`ad_formularios/${newFormularioId}/questoes`);
                
                // Create all questions in the new form
                const questionPromises = originalQuestoes.map(async (questao) => {
                    const questionData = {
                        texto: questao.texto,
                        tipo: questao.tipo,
                        ordem: questao.ordem
                    };
                    await newQuestoesCRUD.create(questionData);
                });

                await Promise.all(questionPromises);
            }

            alert(`Formulário duplicado com sucesso!\nNovo formulário: "${duplicatedFormularioData.titulo}"`);
            this.loadData();
            
        } catch (error) {
            console.error('Erro ao duplicar formulário:', error);
            alert('Erro ao duplicar formulário. Tente novamente.');
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }
}