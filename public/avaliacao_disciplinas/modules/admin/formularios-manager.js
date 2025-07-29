import { FormulariosManager } from './formularios/formularios-manager.js';
import { QuestionsManager } from './formularios/questions-manager.js';
import { FormulariosRenderer } from './formularios/formularios-renderer.js';
import { FirebaseCRUD } from '../shared/firebase.js';

// Export the main class
export { FormulariosManager };

// Global window functions for backward compatibility
window.viewFormulario = async (id) => {
    try {
        const formulariosCRUD = new FirebaseCRUD("ad_formularios");
        const formulario = await formulariosCRUD.read(id);
        const renderer = new FormulariosRenderer();
        
        const modalContent = renderer.createViewFormModal(formulario);
        
        document.getElementById('modal-title').textContent = 'Detalhes do Formulário';
        document.getElementById('modal-body').innerHTML = modalContent;
        document.getElementById('modal-overlay').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        alert('Erro ao carregar detalhes do formulário.');
    }
};

window.manageQuestions = async (id) => {
    const questionsManager = new QuestionsManager();
    await questionsManager.openQuestionsModal(id);
};

window.addNewQuestion = async (formularioId) => {
    const questionsManager = new QuestionsManager();
    await questionsManager.openAddQuestionModal(formularioId);
};

window.editQuestion = async (formularioId, questaoId) => {
    const questionsManager = new QuestionsManager();
    await questionsManager.openEditQuestionModal(formularioId, questaoId);
};

window.deleteQuestion = async (formularioId, questaoId) => {
    if (confirm('Tem certeza que deseja excluir esta questão?\n\nEsta ação não pode ser desfeita.')) {
        try {
            const questoesCRUD = new FirebaseCRUD(`ad_formularios/${formularioId}/questoes`);
            await questoesCRUD.delete(questaoId);
            alert('Questão excluída com sucesso!');
            
            const questionsManager = new QuestionsManager();
            await questionsManager.openQuestionsModal(formularioId);
        } catch (error) {
            console.error('Erro ao excluir questão:', error);
            alert('Erro ao excluir questão. Tente novamente.');
        }
    }
};

window.editFormulario = async (id) => {
    const formulariosManager = new FormulariosManager();
    await formulariosManager.openEditModal(id);
};

window.deleteFormulario = async (id) => {
    if (confirm('Tem certeza que deseja excluir este formulário?\n\nEsta ação não pode ser desfeita e pode afetar avaliações existentes.')) {
        try {
            const formulariosCRUD = new FirebaseCRUD("ad_formularios");
            await formulariosCRUD.delete(id);
            alert('Formulário excluído com sucesso!');
            location.reload();
        } catch (error) {
            console.error('Erro ao excluir formulário:', error);
            alert('Erro ao excluir formulário. Tente novamente.');
        }
    }
};

window.duplicateFormulario = async (id) => {
    const formulariosManager = new FormulariosManager();
    await formulariosManager.duplicateFormulario(id);
};

window.closeModal = () => {
    document.getElementById('modal-overlay').style.display = 'none';
};