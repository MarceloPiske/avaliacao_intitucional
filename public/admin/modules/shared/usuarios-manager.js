// /public/admin/modules/shared/usuarios-manager.js

import { FirebaseCRUD } from '../../../shared/modules/firebase.js';

export class UsuariosManager {
    constructor() {
        this.usersCRUD = new FirebaseCRUD("users");
        this.allUsers = []; // Cache para evitar múltiplas leituras do DB
    }

    async loadData() {
        this.renderLayout();
        await this.loadAndRenderUsers();
        this.setupEventListeners();
    }

    // Desenha a estrutura da página de usuários, incluindo cards e formulário
    renderLayout() {
        const section = document.getElementById('usuarios-section');
        if (!section.querySelector('#users-stats-container')) {
            section.innerHTML = `
                <div id="users-stats-container" class="dashboard-cards" style="margin-bottom: 2rem;">
                    </div>
                <div style="background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: var(--shadow-md); margin-bottom: 2rem;">
                    <h3 id="user-form-title">Adicionar Usuário</h3>
                    <input type="hidden" id="edit-user-id">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="user-name">Nome</label>
                            <input type="text" id="user-name" class="form-control" placeholder="Nome completo" required>
                        </div>
                        <div class="form-group">
                            <label for="user-email">Email</label>
                            <input type="email" id="user-email" class="form-control" placeholder="email@exemplo.com" required>
                        </div>
                        <div class="form-group">
                            <label for="user-role">Tipo de Usuário</label>
                            <select id="user-role" class="form-control" required>
                                <option value="">Selecione o tipo</option>
                                <option value="aluno">Aluno</option>
                                <option value="professor">Professor</option>
                                <option value="tecnico">Técnico</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions" style="border-top: none; padding-top: 1.5rem; justify-content: flex-start;">
                        <button id="save-user-btn" class="btn btn-primary">Salvar Usuário</button>
                        <button id="cancel-user-btn" class="btn btn-secondary" style="display: none;">Cancelar Edição</button>
                    </div>
                </div>
                <div id="users-list-container"></div>
            `;
        }
    }
    
    setupEventListeners() {
        document.getElementById('save-user-btn')?.addEventListener('click', () => this.saveUser());
        document.getElementById('cancel-user-btn')?.addEventListener('click', () => this.clearForm());
    }

    async loadAndRenderUsers() {
        this.allUsers = await this.usersCRUD.readAll() || [];
        this.updateUserStats();
        this.renderUsersTable(this.allUsers);
    }
    
    updateUserStats() {
        const stats = {
            total: this.allUsers.length,
            aluno: this.allUsers.filter(u => (u.role || u.tipos?.includes('aluno'))).length,
            professor: this.allUsers.filter(u => (u.role === 'professor' || u.tipos?.includes('professor'))).length,
            tecnico: this.allUsers.filter(u => u.role === 'tecnico').length,
            admin: this.allUsers.filter(u => (u.role === 'admin' || u.tipos?.includes('admin'))).length
        };

        const container = document.getElementById('users-stats-container');
        container.innerHTML = `
            <div class="dashboard-card"><div class="card-content"><h3>Total</h3><p class="card-number">${stats.total}</p></div></div>
            <div class="dashboard-card"><div class="card-content"><h3>Alunos</h3><p class="card-number">${stats.aluno}</p></div></div>
            <div class="dashboard-card"><div class="card-content"><h3>Professores</h3><p class="card-number">${stats.professor}</p></div></div>
            <div class="dashboard-card"><div class="card-content"><h3>Técnicos</h3><p class="card-number">${stats.tecnico}</p></div></div>
            <div class="dashboard-card"><div class="card-content"><h3>Admins</h3><p class="card-number">${stats.admin}</p></div></div>
        `;
    }

    renderUsersTable(users) {
        const container = document.getElementById('users-list-container');
        let tableHtml = `
            <div class="data-table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>Nome</th><th>Email</th><th>Tipo</th><th>Ações</th>
                    </tr></thead>
                    <tbody>
        `;
        users.forEach(user => {
            // Unifica os campos 'nome'/'displayName' e 'role'/'tipos'
            const nome = user.nome || user.displayName || 'N/A';
            const role = user.role || (user.tipos ? user.tipos.join(', ') : 'N/A');
            
            tableHtml += `
                <tr>
                    <td>${nome}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge active">${role}</span></td>
                    <td>
                        <button class="action-btn edit" onclick="editUser('${user.id}')">Editar</button>
                        <button class="action-btn delete" onclick="deleteUser('${user.id}')">Excluir</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table></div>';
        container.innerHTML = users.length > 0 ? tableHtml : '<p>Nenhum usuário encontrado.</p>';
    }

    async saveUser() {
        const id = document.getElementById('edit-user-id').value;
        // Padronizando para 'nome' e 'role'
        const userData = {
            nome: document.getElementById('user-name').value.trim(),
            displayName: document.getElementById('user-name').value.trim(), // Para compatibilidade
            email: document.getElementById('user-email').value.trim(),
            role: document.getElementById('user-role').value,
            tipos: [document.getElementById('user-role').value] // Para compatibilidade
        };

        if (!userData.nome || !userData.email || !userData.role) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            if (id) {
                await this.usersCRUD.update(id, userData);
                alert('Usuário atualizado com sucesso!');
            } else {
                userData.createdAt = new Date(); // Usa JS Date em vez de FieldValue
                await this.usersCRUD.create(userData);
                alert('Usuário criado com sucesso!');
            }
            this.clearForm();
            this.loadAndRenderUsers();
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            alert('Erro ao salvar usuário: ' + error.message);
        }
    }

    async editUser(id) {
        const user = this.allUsers.find(u => u.id === id);
        if (!user) return;
        
        const nome = user.nome || user.displayName;
        const role = user.role || user.tipos?.[0];

        document.getElementById('edit-user-id').value = id;
        document.getElementById('user-form-title').textContent = 'Editar Usuário';
        document.getElementById('user-name').value = nome || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-role').value = role || '';
        
        document.getElementById('cancel-user-btn').style.display = 'inline-flex';
        document.getElementById('user-name').focus();
        document.getElementById('user-form-title').scrollIntoView({ behavior: 'smooth' });
    }

    clearForm() {
        document.getElementById('edit-user-id').value = '';
        document.getElementById('user-form-title').textContent = 'Adicionar Usuário';
        document.getElementById('user-name').value = '';
        document.getElementById('user-email').value = '';
        document.getElementById('user-role').value = '';
        document.getElementById('cancel-user-btn').style.display = 'none';
    }

    openAddModal() {
        this.clearForm();
        document.getElementById('user-name').focus();
    }
}

// --- Funções Globais ---
const manager = new UsuariosManager();

window.editUser = (id) => {
    manager.editUser(id);
};

window.deleteUser = async (id) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await manager.usersCRUD.delete(id);
            alert('Usuário excluído com sucesso!');
            manager.loadAndRenderUsers();
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            alert('Erro ao excluir: ' + error.message);
        }
    }
};