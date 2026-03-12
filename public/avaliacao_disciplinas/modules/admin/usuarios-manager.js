import { FirebaseCRUD } from '../shared/firebase.js';

export class UsuariosManager {
    constructor() {
        this.usuariosCRUD = new FirebaseCRUD("users");
        this.usersData = []; 
        this.currentView = 'list'; 
        this.bulkActionsInitialized = false;
        
        this.setupFilters();
        this.setupDelegatedEvents(); 
    }

    setupFilters() {
        const typeFilter = document.getElementById('userTypeFilter');
        const searchFilter = document.getElementById('userSearchFilter');
        
        if (typeFilter) typeFilter.addEventListener('change', () => this.renderUsers());
        if (searchFilter) searchFilter.addEventListener('input', () => this.renderUsers());

        const toolbar = document.querySelector('#usuarios-section .panel-toolbar');
        if (toolbar && !document.getElementById('viewToggleGroup')) {
            const toggleGroup = document.createElement('div');
            toggleGroup.id = 'viewToggleGroup';
            toggleGroup.className = 'view-toggle-group';
            toggleGroup.style.marginLeft = 'auto'; 
            toggleGroup.innerHTML = `
                <button class="btn-icon-modern active" data-view="list" title="Visão em Lista">
                    <span class="material-icons">view_list</span>
                </button>
                <button class="btn-icon-modern" data-view="grid" title="Visão em Grade">
                    <span class="material-icons">grid_view</span>
                </button>
            `;
            toolbar.appendChild(toggleGroup);

            toggleGroup.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                
                this.currentView = btn.dataset.view;
                toggleGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.renderUsers(); 
            });
        }
    }

    setupDelegatedEvents() {
        const container = document.querySelector('#usuarios-section');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (!actionBtn) return;

            const userId = actionBtn.dataset.id;
            const action = actionBtn.dataset.action;

            if (action === 'edit') {
                await this.openEditModal(userId);
            } else if (action === 'toggle-status') {
                // Lê o status atual pelo dataset para saber se desativa ou reativa
                const isAtivo = actionBtn.dataset.active === 'true';
                await this.toggleUserStatus(userId, isAtivo);
            }
        });
    }

    async loadData() {
        try {
            this.usersData = await this.usuariosCRUD.readAll() || [];
            this.renderUsers();
            this.setupBulkActions();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    renderUsers() {
        const container = document.querySelector('#usuarios-section .table-responsive');
        if (!container) return;

        const typeFilter = document.getElementById('userTypeFilter')?.value || '';
        const searchFilter = document.getElementById('userSearchFilter')?.value.toLowerCase() || '';

        const filteredUsers = this.usersData.filter(u => {
            const name = (u.displayName || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const types = (u.tipos || []).join(' ').toLowerCase();

            const matchesSearch = name.includes(searchFilter) || email.includes(searchFilter);
            const matchesType = !typeFilter || types.includes(typeFilter);
            
            return matchesSearch && matchesType;
        });

        // Ordenar para que os ativos fiquem no topo e os desativados no fim
        filteredUsers.sort((a, b) => {
            const aAtivo = a.ativo !== false;
            const bAtivo = b.ativo !== false;
            if (aAtivo === bAtivo) return 0;
            return aAtivo ? -1 : 1;
        });

        container.innerHTML = '';

        if (filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
                    <span class="material-icons" style="font-size: 48px; color: var(--border-color);">person_off</span>
                    <p>Nenhum utilizador encontrado com estes filtros.</p>
                </div>`;
            return;
        }

        if (this.currentView === 'list') container.appendChild(this.createListView(filteredUsers));
        else container.appendChild(this.createGridView(filteredUsers));
    }

    createListView(users) {
        const table = document.createElement('table');
        table.className = 'saas-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th width="40"><input type="checkbox" id="selectAllUsers"></th>
                    <th>Utilizador</th>
                    <th>Perfil</th>
                    <th>Data de Adesão</th>
                    <th width="100" class="text-right">Ações</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        
        users.forEach(user => {
            // Lógica do Soft Delete
            const isAtivo = user.ativo !== false; // Se for undefined (antigos), assume true
            const rowOpacity = isAtivo ? '1' : '0.6';
            const statusBadge = isAtivo ? '' : '<span class="badge-modern status-inactive" style="font-size:10px; margin-left:8px;">Desativado</span>';
            
            // Botões dinâmicos
            const toggleIcon = isAtivo ? 'person_off' : 'settings_backup_restore';
            const toggleClass = isAtivo ? 'delete' : 'success';
            const toggleTitle = isAtivo ? 'Desativar Acesso' : 'Restaurar Acesso';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="user-checkbox" value="${user.id}"></td>
                <td style="opacity: ${rowOpacity};">
                    <div class="user-cell-modern">
                        ${this.getAvatarHtml(user, !isAtivo)}
                        <div class="user-cell-info">
                            <strong>${user.displayName || 'Nome não informado'} ${statusBadge}</strong>
                            <span>${user.email}</span>
                        </div>
                    </div>
                </td>
                <td style="opacity: ${rowOpacity};">${this.renderUserTypes(user.tipos)}</td>
                <td style="opacity: ${rowOpacity};">${this.formatDate(user.dataCriacao)}</td>
                <td class="text-right">
                    ${isAtivo ? `
                    <button class="action-btn edit" data-action="edit" data-id="${user.id}" title="Editar">
                        <span class="material-icons">edit</span>
                    </button>` : ''}
                    <button class="action-btn ${toggleClass}" data-action="toggle-status" data-id="${user.id}" data-active="${isAtivo}" title="${toggleTitle}">
                        <span class="material-icons">${toggleIcon}</span>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        return table;
    }

    createGridView(users) {
        const grid = document.createElement('div');
        grid.className = 'users-grid-view';

        users.forEach(user => {
            const isAtivo = user.ativo !== false;
            const statusBadge = isAtivo ? '' : '<span class="badge-modern status-inactive" style="font-size:10px;">Desativado</span>';
            const toggleIcon = isAtivo ? 'person_off' : 'settings_backup_restore';
            const toggleClass = isAtivo ? 'delete' : 'success';

            grid.innerHTML += `
                <div class="user-card-modern ${isAtivo ? '' : 'desmatriculado-card'}" style="opacity: ${isAtivo ? '1' : '0.8'};">
                    <div class="user-card-header">
                        ${this.getAvatarHtml(user, !isAtivo)}
                        <div class="user-card-actions" style="opacity: ${isAtivo ? '' : '1'};">
                            ${isAtivo ? `<button class="action-btn edit" data-action="edit" data-id="${user.id}" title="Editar"><span class="material-icons">edit</span></button>` : ''}
                            <button class="action-btn ${toggleClass}" data-action="toggle-status" data-id="${user.id}" data-active="${isAtivo}" title="Alterar Status"><span class="material-icons">${toggleIcon}</span></button>
                        </div>
                    </div>
                    <div class="user-card-body">
                        <h4>${user.displayName || 'S/ Nome'} ${statusBadge}</h4>
                        <p>${user.email}</p>
                        <div class="user-card-tags">
                            ${this.renderUserTypes(user.tipos)}
                        </div>
                    </div>
                    <div class="user-card-footer">
                        <span class="material-icons">calendar_today</span> Adesão: ${this.formatDate(user.dataCriacao)}
                    </div>
                </div>
            `;
        });

        return grid;
    }

    getAvatarHtml(user, isInactive = false) {
        const filterStyle = isInactive ? 'filter: grayscale(1); opacity: 0.7;' : '';
        if (user.photoURL) {
            return `<div class="avatar-wrapper" style="${filterStyle}"><img src="${user.photoURL}" alt="Avatar"></div>`;
        }
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        return `<div class="avatar-wrapper initials" style="${filterStyle}">${initial}</div>`;
    }

    renderUserTypes(tipos) {
        if (!tipos || tipos.length === 0) return '<span class="status-badge status-inactive">S/ Perfil</span>';
        return tipos.map(tipo => {
            const classes = { 'admin': 'status-active', 'professor': 'status-pending', 'aluno': 'status-inactive' };
            return `<span class="status-badge ${classes[tipo] || ''}">${tipo}</span>`;
        }).join(' ');
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }

    // ==========================================
    // LÓGICA DE DADOS E FORMULÁRIOS
    // ==========================================
    openAddModal() {
        // ... (O conteúdo do Modal mantém-se igual à versão anterior)
        const modalContent = `
            <form id="userForm">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Foto do Perfil (URL Opcional)</label>
                        <input type="url" name="photoURL" placeholder="https://exemplo.com/foto.jpg">
                    </div>
                    <div class="form-group">
                        <label>Nome Completo *</label>
                        <input type="text" name="displayName" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group full-width">
                        <label>Perfil de Acesso *</label>
                        <div class="checkbox-group-modern">
                            <label class="custom-checkbox"><input type="checkbox" name="tipos" value="aluno"> <span>Aluno</span></label>
                            <label class="custom-checkbox"><input type="checkbox" name="tipos" value="professor"> <span>Professor</span></label>
                            <label class="custom-checkbox"><input type="checkbox" name="tipos" value="admin"> <span>Administrador</span></label>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">save</span> Criar Utilizador</button>
                </div>
            </form>
        `;

        document.getElementById('modal-title').textContent = 'Novo Utilizador';
        document.getElementById('modal-body').innerHTML = modalContent;
        document.getElementById('modal-overlay').style.display = 'flex';

        document.getElementById('userForm').addEventListener('submit', (e) => this.handleUserSubmit(e));
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const tipos = Array.from(document.querySelectorAll('input[name="tipos"]:checked')).map(cb => cb.value);
        if (tipos.length === 0) return alert('Selecione pelo menos um perfil de acesso.');

        const userData = {
            displayName: formData.get('displayName'),
            email: formData.get('email'),
            photoURL: formData.get('photoURL') || null,
            tipos: tipos,
            ativo: true, // NOVO: Força o novo utilizador a ser ativo por defeito
            dataCriacao: new Date()
        };

        try {
            await this.usuariosCRUD.create(userData);
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    async openEditModal(userId) {
        // ... (O conteúdo do Modal mantém-se igual à versão anterior)
        try {
            const usuario = this.usersData.find(u => u.id === userId) || await this.usuariosCRUD.read(userId);
            const modalContent = `
                <form id="userEditForm" data-user-id="${userId}">
                    <div class="user-edit-header">
                        ${this.getAvatarHtml(usuario)}
                        <div>
                            <h4>A editar perfil</h4>
                            <p>${usuario.email}</p>
                        </div>
                    </div>
                    <div class="form-grid" style="margin-top: 20px;">
                        <div class="form-group full-width">
                            <label>Foto do Perfil (URL)</label>
                            <input type="url" name="photoURL" value="${usuario.photoURL || ''}" placeholder="https://exemplo.com/foto.jpg">
                        </div>
                        <div class="form-group">
                            <label>Nome Completo *</label>
                            <input type="text" name="displayName" value="${usuario.displayName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" value="${usuario.email}" required>
                        </div>
                        <div class="form-group full-width">
                            <label>Perfil de Acesso *</label>
                            <div class="checkbox-group-modern">
                                <label class="custom-checkbox"><input type="checkbox" name="tipos" value="aluno" ${usuario.tipos?.includes('aluno') ? 'checked' : ''}> <span>Aluno</span></label>
                                <label class="custom-checkbox"><input type="checkbox" name="tipos" value="professor" ${usuario.tipos?.includes('professor') ? 'checked' : ''}> <span>Professor</span></label>
                                <label class="custom-checkbox"><input type="checkbox" name="tipos" value="admin" ${usuario.tipos?.includes('admin') ? 'checked' : ''}> <span>Administrador</span></label>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">Cancelar</button>
                        <button type="submit" class="btn-primary-modern"><span class="material-icons">sync</span> Guardar Alterações</button>
                    </div>
                </form>
            `;

            document.getElementById('modal-title').textContent = 'Configurações de Utilizador';
            document.getElementById('modal-body').innerHTML = modalContent;
            document.getElementById('modal-overlay').style.display = 'flex';

            document.getElementById('userEditForm').addEventListener('submit', (e) => this.handleUserEditSubmit(e));
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
        }
    }

    async handleUserEditSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userId = e.target.dataset.userId;
        const tipos = Array.from(document.querySelectorAll('input[name="tipos"]:checked')).map(cb => cb.value);
        if (tipos.length === 0) return alert('Selecione pelo menos um perfil de acesso.');

        const userData = {
            displayName: formData.get('displayName'),
            email: formData.get('email'),
            photoURL: formData.get('photoURL') || null,
            tipos: tipos
        };

        try {
            await this.usuariosCRUD.update(userId, userData);
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    // ==========================================
    // NOVA FUNÇÃO: SOFT DELETE (DESATIVAR / REATIVAR)
    // ==========================================
    async toggleUserStatus(id, isCurrentlyActive) {
        const acao = isCurrentlyActive ? 'desativar o acesso de' : 'reativar';
        if (confirm(`Tem a certeza que deseja ${acao} este utilizador?\n\nO histórico de dados e avaliações permanecerá intacto no sistema.`)) {
            try {
                // Em vez de delete(), usamos update({ ativo: falso })
                await this.usuariosCRUD.update(id, { ativo: !isCurrentlyActive });
                this.loadData();
            } catch (error) {
                console.error(`Erro ao alterar status:`, error);
            }
        }
    }

    // ==========================================
    // BULK ACTIONS (Ações em Lote)
    // ==========================================
    setupBulkActions() {
        if (this.bulkActionsInitialized) return;
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('bulkDeactivateBtn')) {
            const bulkDeactivateBtn = document.createElement('button');
            bulkDeactivateBtn.id = 'bulkDeactivateBtn';
            bulkDeactivateBtn.className = 'btn-cancel';
            bulkDeactivateBtn.style.color = 'var(--danger)';
            bulkDeactivateBtn.innerHTML = '<span class="material-icons">person_off</span> Desativar Selecionados';
            bulkDeactivateBtn.addEventListener('click', () => this.deactivateSelectedUsers());
            bulkDeactivateBtn.style.display = 'none';
            headerActions.prepend(bulkDeactivateBtn); 
        }

        document.addEventListener('change', (e) => {
            if (e.target.id === 'selectAllUsers') {
                document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = e.target.checked);
                this.updateBulkActionsVisibility();
            } else if (e.target.classList.contains('user-checkbox')) {
                this.updateBulkActionsVisibility();
            }
        });
        
        this.bulkActionsInitialized = true;
    }

    updateBulkActionsVisibility() {
        const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
        const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
        if (bulkDeactivateBtn) bulkDeactivateBtn.style.display = checkedBoxes.length > 0 ? 'inline-flex' : 'none';
    }

    async deactivateSelectedUsers() {
        const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
        if (selectedCheckboxes.length === 0) return;

        if (confirm(`Atenção! Vai suspender o acesso de ${selectedCheckboxes.length} utilizadores. Continuar?`)) {
            try {
                // Atualiza o lote inteiro para inativo
                const updatePromises = Array.from(selectedCheckboxes).map(cb => this.usuariosCRUD.update(cb.value, { ativo: false }));
                await Promise.all(updatePromises);
                this.loadData();
            } catch (error) {
                console.error('Erro:', error);
            }
        }
    }
}