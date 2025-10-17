export function initUsersSection() {
    const section = document.getElementById('users-section');
    
    section.innerHTML = `
        <div class="section-content">
            <h2>Gerenciar Usuários</h2>
            
            <div class="users-stats">
                <div class="user-stat-card">
                    <div class="user-stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="user-stat-info">
                        <div class="user-stat-value" id="total-users-stat">0</div>
                        <div class="user-stat-label">Total de Usuários</div>
                    </div>
                </div>
                <div class="user-stat-card">
                    <div class="user-stat-icon" style="background: linear-gradient(135deg, #11998e, #38ef7d);">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="user-stat-info">
                        <div class="user-stat-value" id="aluno-users-stat">0</div>
                        <div class="user-stat-label">Alunos</div>
                    </div>
                </div>
                <div class="user-stat-card">
                    <div class="user-stat-icon" style="background: linear-gradient(135deg, #f46b45, #eea849);">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="user-stat-info">
                        <div class="user-stat-value" id="professor-users-stat">0</div>
                        <div class="user-stat-label">Professores</div>
                    </div>
                </div>
                <div class="user-stat-card">
                    <div class="user-stat-icon" style="background: linear-gradient(135deg, #8e2de2, #4a00e0);">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="user-stat-info">
                        <div class="user-stat-value" id="tecnico-users-stat">0</div>
                        <div class="user-stat-label">Técnicos</div>
                    </div>
                </div>
                <div class="user-stat-card">
                    <div class="user-stat-icon" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div class="user-stat-info">
                        <div class="user-stat-value" id="admin-users-stat">0</div>
                        <div class="user-stat-label">Administradores</div>
                    </div>
                </div>
            </div>
            
            <div class="users-filter-section">
                <div class="filter-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="user-search" placeholder="Buscar por nome ou email...">
                </div>
                <div class="filter-controls">
                    <select id="user-role-filter">
                        <option value="all">Todos os Tipos</option>
                        <option value="aluno">Alunos</option>
                        <option value="professor">Professores</option>
                        <option value="tecnico">Técnicos</option>
                        <option value="admin">Administradores</option>
                    </select>
                    <button id="clear-filters-btn" class="secondary"><i class="fas fa-times"></i> Limpar Filtros</button>
                </div>
            </div>
            
            <div class="form-container">
                <h3 id="user-form-title">Adicionar Usuário</h3>
                <input type="hidden" id="edit-user-id">
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-name"><i class="fas fa-user"></i> Nome</label>
                        <input type="text" id="user-name" placeholder="Nome completo" required>
                    </div>
                    <div class="form-group">
                        <label for="user-email"><i class="fas fa-envelope"></i> Email</label>
                        <input type="email" id="user-email" placeholder="email@exemplo.com" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="user-role"><i class="fas fa-user-tag"></i> Tipo de Usuário</label>
                    <select id="user-role" required>
                        <option value="">Selecione o tipo</option>
                        <option value="aluno">Aluno</option>
                        <option value="professor">Professor</option>
                        <option value="tecnico">Técnico Administrativo</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button id="save-user-btn"><i class="fas fa-save"></i> Salvar Usuário</button>
                    <button id="cancel-user-btn" class="secondary" style="display: none;"><i class="fas fa-times"></i> Cancelar</button>
                </div>
            </div>
            
            <div id="users-list"></div>
        </div>
    `;

    document.getElementById('save-user-btn').addEventListener('click', saveUser);
    document.getElementById('cancel-user-btn').addEventListener('click', cancelEdit);
    document.getElementById('user-search').addEventListener('input', filterUsers);
    document.getElementById('user-role-filter').addEventListener('change', filterUsers);
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

    loadUsers();
}

let allUsers = [];

async function loadUsers() {
    const db = firebase.firestore();
    const snapshot = await db.collection('users').get();
    
    allUsers = [];
    snapshot.forEach(doc => {
        allUsers.push({ id: doc.id, ...doc.data() });
    });
    
    updateUserStats();
    renderUsers(allUsers);
}

function updateUserStats() {
    const total = allUsers.length;
    const alunos = allUsers.filter(u => u.role === 'aluno').length;
    const professores = allUsers.filter(u => u.role === 'professor').length;
    const tecnicos = allUsers.filter(u => u.role === 'tecnico').length;
    const admins = allUsers.filter(u => u.role === 'admin').length;
    
    document.getElementById('total-users-stat').textContent = total;
    document.getElementById('aluno-users-stat').textContent = alunos;
    document.getElementById('professor-users-stat').textContent = professores;
    document.getElementById('tecnico-users-stat').textContent = tecnicos;
    document.getElementById('admin-users-stat').textContent = admins;
}

function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('user-role-filter').value;
    
    let filtered = allUsers;
    
    if (searchTerm) {
        filtered = filtered.filter(u => 
            (u.nome || '').toLowerCase().includes(searchTerm) ||
            (u.email || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (roleFilter !== 'all') {
        filtered = filtered.filter(u => u.role === roleFilter);
    }
    
    renderUsers(filtered);
}

function clearFilters() {
    document.getElementById('user-search').value = '';
    document.getElementById('user-role-filter').value = 'all';
    renderUsers(allUsers);
}

function renderUsers(users) {
    const listDiv = document.getElementById('users-list');
    listDiv.innerHTML = `
        <div class="users-list-header">
            <h3>Lista de Usuários (${users.length})</h3>
        </div>
        <div class="users-table-container">
            <table class="users-table">
                <thead>
                    <tr>
                        <th><i class="fas fa-user"></i> Nome</th>
                        <th><i class="fas fa-envelope"></i> Email</th>
                        <th><i class="fas fa-user-tag"></i> Tipo</th>
                        <th class="actions-col"><i class="fas fa-cog"></i> Ações</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
        </div>
        <div id="users-cards" class="users-cards"></div>
    `;
    
    const tbody = document.getElementById('users-tbody');
    const cardsContainer = document.getElementById('users-cards');
    
    if (users.length === 0) {
        listDiv.innerHTML += '<div class="no-results"><i class="fas fa-inbox"></i><p>Nenhum usuário encontrado</p></div>';
        return;
    }
    
    users.forEach(user => {
        const roleLabel = getRoleLabel(user.role);
        const roleClass = getRoleClass(user.role);
        const roleIcon = getRoleIcon(user.role);
        
        // Table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${user.nome || ''}</strong></td>
            <td>${user.email || ''}</td>
            <td><span class="role-badge ${roleClass}"><i class="${roleIcon}"></i> ${roleLabel}</span></td>
            <td class="actions-col">
                <button class="edit-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i> Excluir</button>
            </td>
        `;
        tbody.appendChild(row);
        
        // Card for mobile
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-card-avatar">
                    <i class="${roleIcon}"></i>
                </div>
                <div class="user-card-info">
                    <div class="user-card-name">${user.nome || ''}</div>
                    <div class="user-card-email">${user.email || ''}</div>
                </div>
            </div>
            <div class="user-card-role">
                <span class="role-badge ${roleClass}"><i class="${roleIcon}"></i> ${roleLabel}</span>
            </div>
            <div class="user-card-actions">
                <button class="edit-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });
}

function getRoleLabel(role) {
    const labels = {
        aluno: 'Aluno',
        professor: 'Professor',
        tecnico: 'Técnico',
        admin: 'Administrador'
    };
    return labels[role] || role;
}

function getRoleClass(role) {
    const classes = {
        aluno: 'role-aluno',
        professor: 'role-professor',
        tecnico: 'role-tecnico',
        admin: 'role-admin'
    };
    return classes[role] || '';
}

function getRoleIcon(role) {
    const icons = {
        aluno: 'fas fa-user-graduate',
        professor: 'fas fa-chalkboard-teacher',
        tecnico: 'fas fa-user-tie',
        admin: 'fas fa-user-shield'
    };
    return icons[role] || 'fas fa-user';
}

async function saveUser() {
    const db = firebase.firestore();
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const role = document.getElementById('user-role').value;

    if (!name || !email || !role) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    const userData = {
        nome: name,
        email: email,
        role: role
    };

    try {
        if (userId) {
            await db.collection('users').doc(userId).update(userData);
            alert('Usuário atualizado com sucesso!');
        } else {
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('users').add(userData);
            alert('Usuário criado com sucesso!');
        }
        
        clearForm();
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Erro ao salvar usuário: ' + error.message);
    }
}

async function editUser(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;

    document.getElementById('edit-user-id').value = id;
    document.getElementById('user-form-title').textContent = 'Editar Usuário';
    document.getElementById('user-name').value = user.nome || '';
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-role').value = user.role || '';
    
    document.getElementById('cancel-user-btn').style.display = 'inline-flex';
    document.getElementById('user-name').focus();
    
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteUser(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }

    const db = firebase.firestore();
    try {
        await db.collection('users').doc(id).delete();
        alert('Usuário excluído com sucesso!');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}

function cancelEdit() {
    clearForm();
}

function clearForm() {
    document.getElementById('edit-user-id').value = '';
    document.getElementById('user-form-title').textContent = 'Adicionar Usuário';
    document.getElementById('user-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-role').value = '';
    document.getElementById('cancel-user-btn').style.display = 'none';
}