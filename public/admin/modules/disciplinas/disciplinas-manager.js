import { FirebaseCRUD } from '../../../shared/modules/firebase.js';

export class DisciplinasManager {
    constructor() {
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.setupFilters();
    }

    setupFilters() {
        document.getElementById('disciplinaSearchFilter').addEventListener('input', () => {
            this.filterDisciplinas();
        });
    }

    async loadData() {
        try {
            const disciplinas = await this.disciplinasCRUD.readAll();
            this.renderDisciplinas(disciplinas);
        } catch (error) {
            console.error('Erro ao carregar disciplinas:', error);
        }
    }

    renderDisciplinas(disciplinas) {
        const tbody = document.querySelector('#disciplinas-table tbody');
        tbody.innerHTML = '';

        disciplinas.forEach(disciplina => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${disciplina.name}</td>
                <td>${disciplina.codigo}</td>
                <td>${this.formatDate(disciplina.dataCriacao)}</td>
                <td>
                    <button class="action-btn edit" onclick="editDisciplina('${disciplina.id}')">Editar</button>
                    <button class="action-btn delete" onclick="deleteDisciplina('${disciplina.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }

    filterDisciplinas() {
        const searchFilter = document.getElementById('disciplinaSearchFilter').value.toLowerCase();
        const rows = document.querySelectorAll('#disciplinas-table tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const name = cells[0].textContent.toLowerCase();
            const code = cells[1].textContent.toLowerCase();
            
            const matches = name.includes(searchFilter) || code.includes(searchFilter);
            row.style.display = matches ? '' : 'none';
        });
    }

    openAddModal() {
        const modalContent = `
            <form id="disciplinaForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="name">Nome da Disciplina *</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="codigo">Código *</label>
                        <input type="text" id="codigo" name="codigo" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Disciplina</button>
                </div>
            </form>
        `;

        document.getElementById('modal-title').textContent = 'Adicionar Disciplina';
        document.getElementById('modal-body').innerHTML = modalContent;
        document.getElementById('modal-overlay').style.display = 'block';

        document.getElementById('disciplinaForm').addEventListener('submit', async (e) => {
            await this.handleDisciplinaSubmit(e);
        });
    }

    async handleDisciplinaSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const disciplinaData = {
            name: formData.get('name'),
            codigo: formData.get('codigo'),
            dataCriacao: new Date()
        };

        try {
            await this.disciplinasCRUD.create(disciplinaData);
            alert('Disciplina criada com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao criar disciplina:', error);
            alert('Erro ao criar disciplina. Tente novamente.');
        }
    }

    async openEditModal(disciplinaId) {
        try {
            const disciplina = await this.disciplinasCRUD.read(disciplinaId);
            
            const modalContent = `
                <form id="disciplinaEditForm" data-disciplina-id="${disciplinaId}">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="name">Nome da Disciplina *</label>
                            <input type="text" id="name" name="name" value="${disciplina.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="codigo">Código *</label>
                            <input type="text" id="codigo" name="codigo" value="${disciplina.codigo}" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Atualizar Disciplina</button>
                    </div>
                </form>
            `;

            document.getElementById('modal-title').textContent = 'Editar Disciplina';
            document.getElementById('modal-body').innerHTML = modalContent;
            document.getElementById('modal-overlay').style.display = 'block';

            document.getElementById('disciplinaEditForm').addEventListener('submit', async (e) => {
                await this.handleDisciplinaEditSubmit(e);
            });
        } catch (error) {
            console.error('Erro ao carregar disciplina:', error);
            alert('Erro ao carregar dados da disciplina.');
        }
    }

    async handleDisciplinaEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const disciplinaId = e.target.dataset.disciplinaId;
        
        const disciplinaData = {
            name: formData.get('name'),
            codigo: formData.get('codigo')
        };

        try {
            await this.disciplinasCRUD.update(disciplinaId, disciplinaData);
            alert('Disciplina atualizada com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao atualizar disciplina:', error);
            alert('Erro ao atualizar disciplina. Tente novamente.');
        }
    }
}

window.editDisciplina = async (id) => {
    const disciplinasManager = new DisciplinasManager();
    await disciplinasManager.openEditModal(id);
};

window.deleteDisciplina = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta disciplina?\n\nEsta ação não pode ser desfeita e pode afetar turmas existentes.')) {
        try {
            const disciplinasCRUD = new FirebaseCRUD("disciplinas");
            await disciplinasCRUD.delete(id);
            alert('Disciplina excluída com sucesso!');
            location.reload();
        } catch (error) {
            console.error('Erro ao excluir disciplina:', error);
            alert('Erro ao excluir disciplina. Tente novamente.');
        }
    }
};