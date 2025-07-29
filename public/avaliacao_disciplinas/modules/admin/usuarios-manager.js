import { FirebaseCRUD } from '../shared/firebase.js';

export class UsuariosManager {
    constructor() {
        this.usuariosCRUD = new FirebaseCRUD("users");
        this.bulkActionsInitialized = false;
        this.setupFilters();
    }

    setupFilters() {
        document.getElementById('userTypeFilter').addEventListener('change', () => {
            this.filterUsers();
        });

        document.getElementById('userSearchFilter').addEventListener('input', () => {
            this.filterUsers();
        });
    }

    renderUsers(usuarios) {
        const tbody = document.querySelector('#usuarios-table tbody');
        tbody.innerHTML = '';

        usuarios.forEach(usuario => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="user-checkbox" value="${usuario.id}">
                </td>
                <td>${usuario.displayName || 'Nome não informado'}</td>
                <td>${usuario.email}</td>
                <td>${this.renderUserTypes(usuario.tipos)}</td>
                <td>${this.formatDate(usuario.dataCriacao)}</td>
                <td>
                    <button class="action-btn edit" onclick="editUser('${usuario.id}')">Editar</button>
                    <button class="action-btn delete" onclick="deleteUser('${usuario.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderUserTypes(tipos) {
        if (!tipos || tipos.length === 0) return '<span class="status-badge inactive">Nenhum tipo</span>';
        
        return tipos.map(tipo => {
            const classes = {
                'admin': 'status-badge active',
                'professor': 'status-badge pending',
                'aluno': 'status-badge inactive'
            };
            return `<span class="${classes[tipo] || 'status-badge'}">${tipo}</span>`;
        }).join(' ');
    }

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }

    filterUsers() {
        const typeFilter = document.getElementById('userTypeFilter').value;
        const searchFilter = document.getElementById('userSearchFilter').value.toLowerCase();
        
        const rows = document.querySelectorAll('#usuarios-table tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const name = cells[1].textContent.toLowerCase();
            const email = cells[2].textContent.toLowerCase();
            const types = cells[3].textContent.toLowerCase();
            
            const matchesSearch = name.includes(searchFilter) || email.includes(searchFilter);
            const matchesType = !typeFilter || types.includes(typeFilter);
            
            row.style.display = matchesSearch && matchesType ? '' : 'none';
        });
    }

    openAddModal() {
        const modalContent = `
            <form id="userForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="displayName">Nome Completo *</label>
                        <input type="text" id="displayName" name="displayName" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="uid">UID de Autenticação</label>
                        <input type="text" id="uid" name="uid" placeholder="ID do Firebase Auth (opcional)">
                    </div>
                    <div class="form-group">
                        <label for="tipos">Tipos de Usuário *</label>
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <label><input type="checkbox" name="tipos" value="aluno"> Aluno</label>
                            <label><input type="checkbox" name="tipos" value="professor"> Professor</label>
                            <label><input type="checkbox" name="tipos" value="admin"> Admin</label>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Usuário</button>
                </div>
            </form>
        `;

        document.getElementById('modal-title').textContent = 'Adicionar Usuário';
        document.getElementById('modal-body').innerHTML = modalContent;
        document.getElementById('modal-overlay').style.display = 'block';

        document.getElementById('userForm').addEventListener('submit', async (e) => {
            await this.handleUserSubmit(e);
        });
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const tipos = Array.from(document.querySelectorAll('input[name="tipos"]:checked')).map(cb => cb.value);
        
        if (tipos.length === 0) {
            alert('Selecione pelo menos um tipo de usuário.');
            return;
        }

        const userData = {
            displayName: formData.get('displayName'),
            email: formData.get('email'),
            uid: formData.get('uid') || null,
            tipos: tipos,
            dataCriacao: new Date()
        };

        try {
            await this.usuariosCRUD.create(userData);
            alert('Usuário criado com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            alert('Erro ao criar usuário. Tente novamente.');
        }
    }

    async openEditModal(userId) {
        try {
            const usuario = await this.usuariosCRUD.read(userId);
            
            const modalContent = `
                <form id="userEditForm" data-user-id="${userId}">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="displayName">Nome Completo *</label>
                            <input type="text" id="displayName" name="displayName" value="${usuario.displayName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" value="${usuario.email}" required>
                        </div>
                        <div class="form-group">
                            <label for="uid">UID de Autenticação</label>
                            <input type="text" id="uid" name="uid" value="${usuario.uid || ''}" placeholder="ID do Firebase Auth (opcional)">
                        </div>
                        <div class="form-group">
                            <label for="tipos">Tipos de Usuário *</label>
                            <div style="display: flex; gap: 1rem; align-items: center;">
                                <label><input type="checkbox" name="tipos" value="aluno" ${usuario.tipos?.includes('aluno') ? 'checked' : ''}> Aluno</label>
                                <label><input type="checkbox" name="tipos" value="professor" ${usuario.tipos?.includes('professor') ? 'checked' : ''}> Professor</label>
                                <label><input type="checkbox" name="tipos" value="admin" ${usuario.tipos?.includes('admin') ? 'checked' : ''}> Admin</label>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Atualizar Usuário</button>
                    </div>
                </form>
            `;

            document.getElementById('modal-title').textContent = 'Editar Usuário';
            document.getElementById('modal-body').innerHTML = modalContent;
            document.getElementById('modal-overlay').style.display = 'block';

            document.getElementById('userEditForm').addEventListener('submit', async (e) => {
                await this.handleUserEditSubmit(e);
            });
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            alert('Erro ao carregar dados do usuário.');
        }
    }

    async handleUserEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userId = e.target.dataset.userId;
        const tipos = Array.from(document.querySelectorAll('input[name="tipos"]:checked')).map(cb => cb.value);
        
        if (tipos.length === 0) {
            alert('Selecione pelo menos um tipo de usuário.');
            return;
        }

        const userData = {
            displayName: formData.get('displayName'),
            email: formData.get('email'),
            uid: formData.get('uid') || null,
            tipos: tipos
        };

        try {
            await this.usuariosCRUD.update(userId, userData);
            alert('Usuário atualizado com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            alert('Erro ao atualizar usuário. Tente novamente.');
        }
    }

    async deleteSelectedUsers() {
        const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            alert('Selecione pelo menos um usuário para excluir.');
            return;
        }

        const count = selectedCheckboxes.length;
        const confirmMessage = `Tem certeza que deseja excluir ${count} usuário(s) selecionado(s)?\n\nEsta ação não pode ser desfeita.`;
        
        if (confirm(confirmMessage)) {
            try {
                const deletePromises = Array.from(selectedCheckboxes).map(checkbox => 
                    this.usuariosCRUD.delete(checkbox.value)
                );
                
                await Promise.all(deletePromises);
                alert(`${count} usuário(s) excluído(s) com sucesso!`);
                this.loadData();
            } catch (error) {
                console.error('Erro ao excluir usuários:', error);
                alert('Erro ao excluir usuários. Tente novamente.');
            }
        }
    }

    setupBulkActions() {
        if (this.bulkActionsInitialized) return;

        // Add bulk delete button only if it doesn't exist
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('bulkDeleteBtn')) {
            const bulkDeleteBtn = document.createElement('button');
            bulkDeleteBtn.id = 'bulkDeleteBtn';
            bulkDeleteBtn.className = 'btn btn-danger';
            bulkDeleteBtn.innerHTML = '<span>🗑️</span> Excluir Selecionados';
            bulkDeleteBtn.addEventListener('click', () => this.deleteSelectedUsers());
            bulkDeleteBtn.style.display = 'none'; // Initially hidden
            headerActions.appendChild(bulkDeleteBtn);
        }

        // Add select all checkbox only if it doesn't exist
        const usersTable = document.querySelector('#usuarios-table');
        if (usersTable && !document.getElementById('selectAllUsers')) {
            const headerRow = usersTable.querySelector('thead tr');
            const firstTh = headerRow.querySelector('th');
            
            if (firstTh && !firstTh.querySelector('#selectAllUsers')) {
                const selectAllCheckbox = document.createElement('input');
                selectAllCheckbox.type = 'checkbox';
                selectAllCheckbox.id = 'selectAllUsers';
                selectAllCheckbox.addEventListener('change', this.handleSelectAll.bind(this));
                
                // Clear the first th and add the checkbox
                firstTh.innerHTML = '';
                firstTh.appendChild(selectAllCheckbox);
            }
        }

        // Monitor individual checkboxes to show/hide bulk actions
        this.monitorCheckboxes();
        
        this.bulkActionsInitialized = true;
    }

    monitorCheckboxes() {
        // Use event delegation to monitor checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('user-checkbox')) {
                this.updateBulkActionsVisibility();
            }
        });
    }

    updateBulkActionsVisibility() {
        const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = checkedBoxes.length > 0 ? 'flex' : 'none';
        }
    }

    handleSelectAll(e) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        this.updateBulkActionsVisibility();
    }

    async loadData() {
        try {
            const usuarios = await this.usuariosCRUD.readAll();
            this.renderUsers(usuarios);
            this.setupBulkActions();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }
}

// Global functions for table actions
window.editUser = async (id) => {
    const usuariosManager = new UsuariosManager();
    await usuariosManager.openEditModal(id);
};

window.deleteUser = async (id) => {
    if (confirm('Tem certeza que deseja excluir este usuário?\n\nEsta ação não pode ser desfeita.')) {
        try {
            const usuariosCRUD = new FirebaseCRUD("users");
            await usuariosCRUD.delete(id);
            alert('Usuário excluído com sucesso!');
            location.reload();
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            alert('Erro ao excluir usuário. Tente novamente.');
        }
    }
};

window.closeModal = () => {
    document.getElementById('modal-overlay').style.display = 'none';
};