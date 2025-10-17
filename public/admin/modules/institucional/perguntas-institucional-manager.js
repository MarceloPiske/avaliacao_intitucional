// /public/admin/modules/perguntas_institucional/perguntas-institucional-manager.js

import { FirebaseCRUD } from '../../../shared/modules/firebase.js';

export class PerguntasInstitucionalManager {
    constructor() {
        // Nome exato da coleção no Firebase!
        this.perguntasCRUD = new FirebaseCRUD("perguntas_avaliacao_institucional");
    }

    async loadData() {
        try {
            const perguntas = await this.perguntasCRUD.readAll();
            this.renderPerguntas(perguntas);
        } catch (error) {
            console.error('Erro ao carregar perguntas institucionais:', error);
        }
    }

    renderPerguntas(perguntas) {
        const tbody = document.querySelector('#perguntas-institucional-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Ordena as perguntas pelo ID numérico
        perguntas.sort((a, b) => parseInt(a.id) - parseInt(b.id));

        perguntas.forEach(p => {
            const row = document.createElement('tr');
            const publico = [];
            if (p.aluno) publico.push('Aluno');
            if (p.professor) publico.push('Professor');
            if (p.funcionario) publico.push('Técnico');

            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.texto}</td>
                <td>${publico.join(', ')}</td>
                <td>
                    <button class="action-btn edit" onclick="editPerguntaInstitucional('${p.id}')">Editar</button>
                    <button class="action-btn delete" onclick="deletePerguntaInstitucional('${p.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Lógica para abrir o modal de ADIÇÃO
    openAddModal() {
        const modalContent = this.createFormModal(); // Reutiliza a estrutura do formulário
        this.showModal('Adicionar Pergunta Institucional', modalContent);

        document.getElementById('institutionalQuestionForm').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });
    }

    // Lógica para abrir o modal de EDIÇÃO
    async openEditModal(id) {
        try {
            const pergunta = await this.perguntasCRUD.read(id);
            if (!pergunta) {
                alert("Pergunta não encontrada!");
                return;
            }
            const modalContent = this.createFormModal(id, pergunta); // Passa os dados para preencher
            this.showModal('Editar Pergunta Institucional', modalContent);

            document.getElementById('institutionalQuestionForm').addEventListener('submit', (e) => {
                this.handleFormSubmit(e);
            });
        } catch (error) {
            console.error('Erro ao abrir modal de edição:', error);
            alert('Não foi possível carregar os dados da pergunta.');
        }
    }

    // Lógica para SALVAR (tanto adicionar quanto editar)
    async handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.dataset.id; // Pega o ID (se for edição)

        const perguntaData = {
            texto: form.querySelector('#question-text').value.trim(),
            eixo: form.querySelector('#question-eixo').value.trim(),
            dimensao: form.querySelector('#question-dimensao').value.trim(),
            aluno: form.querySelector('#question-aluno').checked,
            professor: form.querySelector('#question-professor').checked,
            funcionario: form.querySelector('#question-funcionario').checked
        };

        if (!perguntaData.texto || !perguntaData.eixo || !perguntaData.dimensao) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            if (id) {
                // Atualiza a pergunta existente
                await this.perguntasCRUD.update(id, perguntaData);
                alert('Pergunta atualizada com sucesso!');
            } else {
                // Cria uma nova pergunta com ID sequencial
                const allQuestions = await this.perguntasCRUD.readAll();
                let maxId = 0;
                allQuestions.forEach(q => {
                    const docId = parseInt(q.id);
                    if (!isNaN(docId) && docId > maxId) maxId = docId;
                });
                const newId = (maxId + 1).toString();
                
                // Adiciona o novo documento usando o ID gerado
                await this.perguntasCRUD.create({ id: newId, ...perguntaData });
                alert('Pergunta adicionada com sucesso!');
            }
            
            closeModal(); // Fecha o modal
            this.loadData(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao salvar pergunta:', error);
            alert('Erro ao salvar pergunta: ' + error.message);
        }
    }

    // Função que cria o HTML do formulário (para Adicionar e Editar)
    createFormModal(id = '', data = {}) {
        return `
            <form id="institutionalQuestionForm" data-id="${id}">
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label for="question-text">Texto da Pergunta *</label>
                        <textarea id="question-text" required>${data.texto || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="question-eixo">Eixo (1-5) *</label>
                        <input type="text" id="question-eixo" value="${data.eixo || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="question-dimensao">Dimensão (1-10) *</label>
                        <input type="text" id="question-dimensao" value="${data.dimensao || ''}" required>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Aplicável para:</label>
                    <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
                        <label><input type="checkbox" id="question-aluno" ${data.aluno ? 'checked' : ''}> Aluno</label>
                        <label><input type="checkbox" id="question-professor" ${data.professor ? 'checked' : ''}> Professor</label>
                        <label><input type="checkbox" id="question-funcionario" ${data.funcionario ? 'checked' : ''}> Técnico</label>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Pergunta</button>
                </div>
            </form>
        `;
    }

    // Funções auxiliares para mostrar/fechar modal
    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'block';
    }
}

// --- Funções Globais para os botões 'onclick' ---

// É necessário instanciar o Manager aqui para que as funções globais possam usá-lo
const manager = new PerguntasInstitucionalManager();

window.editPerguntaInstitucional = (id) => {
    manager.openEditModal(id);
};

window.deletePerguntaInstitucional = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.')) {
        try {
            await manager.perguntasCRUD.delete(id);
            alert('Pergunta excluída com sucesso!');
            manager.loadData(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao excluir pergunta:', error);
            alert('Erro ao excluir pergunta: ' + error.message);
        }
    }
};