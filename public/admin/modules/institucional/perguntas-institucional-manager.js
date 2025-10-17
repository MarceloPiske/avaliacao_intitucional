// /public/admin/modules/perguntas_institucional/perguntas-institucional-manager.js

import { FirebaseCRUD } from '../../../shared/modules/firebase.js';

export class PerguntasInstitucionalManager {
    constructor() {
        this.perguntasCRUD = new FirebaseCRUD("perguntas_avaliacao_institucional");
    }

    async loadData() {
        this.renderLayout(); 
        await this.loadQuestions();
        this.setupEventListeners();
    }

    renderLayout() {
        const section = document.getElementById('perguntas-institucional-section');
        if (!section.querySelector('#question-form-container')) {
            const formHtml = `
                <div id="question-form-container" style="background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: var(--shadow-md); margin-bottom: 2rem;">
                    <h3 id="question-form-title">Adicionar Pergunta</h3>
                    <input type="hidden" id="edit-question-id">
                    <div class.form-group">
                        <label for="question-text">Texto da Pergunta</label>
                        <textarea id="question-text" class="form-control" placeholder="Digite o texto da pergunta" required></textarea>
                    </div>
                    <div class="form-grid" style="margin-top: 1rem;">
                        <div class="form-group">
                            <label for="question-eixo">Eixo (1-5)</label>
                            <input type="text" id="question-eixo" class="form-control" placeholder="Ex: 1" required>
                        </div>
                        <div class="form-group">
                            <label for="question-dimensao">Dimensão (1-10)</label>
                            <input type="text" id="question-dimensao" class="form-control" placeholder="Ex: 8" required>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Aplicável para:</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-top: 0.5rem;">
                            <label><input type="checkbox" id="question-aluno"> Aluno</label>
                            <label><input type="checkbox" id="question-professor"> Professor</label>
                            <label><input type="checkbox" id="question-funcionario"> Técnico</label>
                        </div>
                    </div>
                    <div class="form-actions" style="border-top: none; padding-top: 1.5rem; justify-content: flex-start;">
                        <button id="save-question-btn" class="btn btn-primary">Salvar Pergunta</button>
                        <button id="cancel-question-btn" class="btn btn-secondary" style="display: none;">Cancelar Edição</button>
                    </div>
                </div>
                <div id="questions-list-container"></div>
            `;
            section.innerHTML = formHtml;
        }
    }
    
    setupEventListeners() {
        document.getElementById('save-question-btn').addEventListener('click', () => this.saveQuestion());
        document.getElementById('cancel-question-btn').addEventListener('click', () => this.clearQuestionForm());
    }

    async loadQuestions() {
        const perguntas = await this.perguntasCRUD.readAll() || [];
        perguntas.sort((a, b) => parseInt(a.id) - parseInt(b.id));

        const container = document.getElementById('questions-list-container');
        if (!container) return;

        let tableHtml = `
            <div class="data-table-container">
                <table class="data-table" id="perguntas-institucional-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th style="width: 50%;">Texto</th>
                            <th>Eixo</th>
                            <th>Dimensão</th>
                            <th>Público</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        perguntas.forEach(p => {
            const publico = [];
            if (p.aluno) publico.push('Aluno');
            if (p.professor) publico.push('Professor');
            if (p.funcionario) publico.push('Técnico');
            tableHtml += `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.texto}</td>
                    <td>${p.eixo}</td>
                    <td>${p.dimensao}</td>
                    <td>${publico.join(', ')}</td>
                    <td>
                        <button class="action-btn edit" onclick="editPerguntaInstitucional('${p.id}')">Editar</button>
                        <button class="action-btn delete" onclick="deletePerguntaInstitucional('${p.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
    }

    async saveQuestion() {
        const id = document.getElementById('edit-question-id').value;
        const questionData = {
            texto: document.getElementById('question-text').value.trim(),
            eixo: document.getElementById('question-eixo').value.trim(),
            dimensao: document.getElementById('question-dimensao').value.trim(),
            aluno: document.getElementById('question-aluno').checked,
            professor: document.getElementById('question-professor').checked,
            funcionario: document.getElementById('question-funcionario').checked
        };

        if (!questionData.texto || !questionData.eixo || !questionData.dimensao) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            if (id) {
                await this.perguntasCRUD.update(id, questionData);
                alert('Pergunta atualizada com sucesso!');
            } else {
                const allQuestions = await this.perguntasCRUD.readAll() || [];
                const maxId = allQuestions.reduce((max, q) => Math.max(max, parseInt(q.id) || 0), 0);
                const newId = (maxId + 1).toString();
                await this.perguntasCRUD.create({ id: newId, ...questionData });
                alert('Pergunta adicionada com sucesso!');
            }
            this.clearQuestionForm();
            this.loadQuestions();
        } catch (error) {
            console.error('Erro ao salvar pergunta:', error);
            alert('Erro ao salvar pergunta: ' + error.message);
        }
    }

    async editQuestion(id) {
        const question = await this.perguntasCRUD.read(id);
        if (!question) return;

        document.getElementById('edit-question-id').value = id;
        document.getElementById('question-form-title').textContent = 'Editar Pergunta';
        document.getElementById('question-text').value = question.texto || '';
        document.getElementById('question-eixo').value = question.eixo || '';
        document.getElementById('question-dimensao').value = question.dimensao || '';
        document.getElementById('question-aluno').checked = question.aluno || false;
        document.getElementById('question-professor').checked = question.professor || false;
        document.getElementById('question-funcionario').checked = question.funcionario || false;
        
        document.getElementById('cancel-question-btn').style.display = 'inline-flex';
        document.getElementById('question-text').focus();
        document.getElementById('question-form-container').scrollIntoView({ behavior: 'smooth' });
    }

    clearQuestionForm() {
        document.getElementById('edit-question-id').value = '';
        document.getElementById('question-form-title').textContent = 'Adicionar Pergunta';
        document.getElementById('question-text').value = '';
        document.getElementById('question-eixo').value = '';
        document.getElementById('question-dimensao').value = '';
        document.getElementById('question-aluno').checked = false;
        document.getElementById('question-professor').checked = false;
        document.getElementById('question-funcionario').checked = false;
        document.getElementById('cancel-question-btn').style.display = 'none';
    }
    
    openAddModal() {
        // Como o formulário já está na tela, este método não precisa abrir um modal,
        // apenas limpar o formulário e focar nele.
        this.clearQuestionForm();
        document.getElementById('question-text').focus();
    }
}

// --- Funções Globais ---
const manager = new PerguntasInstitucionalManager();

window.editPerguntaInstitucional = (id) => {
    manager.editQuestion(id);
};

window.deletePerguntaInstitucional = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
        try {
            await manager.perguntasCRUD.delete(id);
            alert('Pergunta excluída com sucesso!');
            manager.loadQuestions();
        } catch (error) {
            console.error('Erro ao excluir pergunta:', error);
            alert('Erro ao excluir: ' + error.message);
        }
    }
};