import { FirebaseCRUD } from '../shared/firebase.js';

export class DisciplinasManager {
    constructor() {
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.disciplinasData = []; // Cache local para pesquisa rápida
        
        this.setupFilters();
        this.setupDelegatedEvents();
    }

    setupFilters() {
        const searchFilter = document.getElementById('disciplinaSearchFilter');
        if (searchFilter) {
            searchFilter.addEventListener('input', () => this.renderDisciplinas());
        }
    }

    // ==========================================
    // EVENT DELEGATION (Fim das funções globais)
    // ==========================================
    setupDelegatedEvents() {
        const container = document.querySelector('#disciplinas-section');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (!actionBtn) return;

            const disciplinaId = actionBtn.dataset.id;
            const action = actionBtn.dataset.action;

            if (action === 'edit') {
                await this.openEditModal(disciplinaId);
            } else if (action === 'delete') {
                await this.deleteDisciplina(disciplinaId);
            }
        });
    }

    async loadData() {
        try {
            this.disciplinasData = await this.disciplinasCRUD.readAll() || [];
            this.renderDisciplinas();
        } catch (error) {
            console.error('Erro ao carregar disciplinas:', error);
        }
    }

    renderDisciplinas() {
        const tbody = document.querySelector('#disciplinas-table tbody');
        const container = document.querySelector('#disciplinas-section .table-responsive');
        const searchFilter = document.getElementById('disciplinaSearchFilter')?.value.toLowerCase() || '';

        if (!tbody || !container) return;

        // Filtro em memória (muito mais rápido que ler o DOM)
        const filteredData = this.disciplinasData.filter(d => {
            const name = (d.name || '').toLowerCase();
            const code = (d.codigo || '').toLowerCase();
            return name.includes(searchFilter) || code.includes(searchFilter);
        });

        // Limpa a tabela
        tbody.innerHTML = '';

        // Empty State
        if (filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
                            <span class="material-icons" style="font-size: 48px; color: var(--border-color);">menu_book</span>
                            <p style="margin-top: 8px;">Nenhuma disciplina encontrada.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Renderiza as linhas modernizadas
        filteredData.forEach(disciplina => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${disciplina.name}</strong></td>
                <td><span class="badge-modern">${disciplina.codigo || 'S/C'}</span></td>
                <td style="color: var(--text-secondary);">${this.formatDate(disciplina.dataCriacao)}</td>
                <td class="text-right">
                    <button class="action-btn edit" data-action="edit" data-id="${disciplina.id}" title="Editar">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="action-btn delete" data-action="delete" data-id="${disciplina.id}" title="Excluir">
                        <span class="material-icons">delete_outline</span>
                    </button>
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

    // ==========================================
    // MODAIS MODERNIZADOS
    // ==========================================
    openAddModal() {
        const modalContent = `
            <form id="disciplinaForm">
                <div class="form-grid single-col">
                    <div class="form-group">
                        <label for="name">Nome da Disciplina *</label>
                        <input type="text" id="name" name="name" placeholder="Ex: Cálculo I" required>
                    </div>
                    <div class="form-group">
                        <label for="codigo">Código da Disciplina *</label>
                        <input type="text" id="codigo" name="codigo" placeholder="Ex: MAT101" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">save</span> Salvar Disciplina</button>
                </div>
            </form>
        `;

        document.getElementById('modal-title').textContent = 'Nova Disciplina';
        document.getElementById('modal-body').innerHTML = modalContent;
        // Importante: Usar 'flex' para o overlay moderno alinhar corretamente ao centro
        document.getElementById('modal-overlay').style.display = 'flex';

        document.getElementById('disciplinaForm').addEventListener('submit', (e) => this.handleDisciplinaSubmit(e));
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
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData(); // Recarrega a UI sem refresh forçado
        } catch (error) {
            console.error('Erro ao criar disciplina:', error);
            alert('Erro ao criar disciplina. Tente novamente.');
        }
    }

    async openEditModal(disciplinaId) {
        try {
            // Busca do cache local para ser instantâneo
            let disciplina = this.disciplinasData.find(d => d.id === disciplinaId);
            if (!disciplina) {
                disciplina = await this.disciplinasCRUD.read(disciplinaId);
            }
            
            const modalContent = `
                <form id="disciplinaEditForm" data-disciplina-id="${disciplinaId}">
                    <div class="form-grid single-col">
                        <div class="form-group">
                            <label for="name">Nome da Disciplina *</label>
                            <input type="text" id="name" name="name" value="${disciplina.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="codigo">Código da Disciplina *</label>
                            <input type="text" id="codigo" name="codigo" value="${disciplina.codigo}" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">Cancelar</button>
                        <button type="submit" class="btn-primary-modern"><span class="material-icons">sync</span> Atualizar Disciplina</button>
                    </div>
                </form>
            `;

            document.getElementById('modal-title').textContent = 'Editar Disciplina';
            document.getElementById('modal-body').innerHTML = modalContent;
            document.getElementById('modal-overlay').style.display = 'flex';

            document.getElementById('disciplinaEditForm').addEventListener('submit', (e) => this.handleDisciplinaEditSubmit(e));
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
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao atualizar disciplina:', error);
            alert('Erro ao atualizar disciplina. Tente novamente.');
        }
    }

    async deleteDisciplina(id) {
        if (confirm('Tem certeza que deseja excluir esta disciplina?\n\nAtenção: Esta ação não pode ser desfeita e pode afetar turmas existentes.')) {
            try {
                await this.disciplinasCRUD.delete(id);
                this.loadData(); // Recarrega suavemente
            } catch (error) {
                console.error('Erro ao excluir disciplina:', error);
                alert('Erro ao excluir disciplina. Tente novamente.');
            }
        }
    }
}