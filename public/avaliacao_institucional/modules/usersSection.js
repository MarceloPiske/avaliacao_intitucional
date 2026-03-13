import { db } from '../../avaliacao_disciplinas/modules/shared/firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export function initUsersSection() {
    const section = document.getElementById('users-section');
    
    // Injetamos o CSS com os estilos do Soft Delete (Status)
    const style = document.createElement('style');
    style.innerHTML = `
        .users-header-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
        .users-header-modern h2 { margin: 0; font-size: 24px; color: #0f172a; font-weight: 700; }
        .users-header-modern p { margin: 4px 0 0 0; color: #64748b; font-size: 14px; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .kpi-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: transform 0.2s; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; justify-content: center; align-items: center; color: white; }
        .kpi-icon .material-icons { font-size: 24px; }
        .kpi-info h4 { margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-info span { font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.2; }

        .toolbar-modern { background: white; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .search-box { position: relative; flex: 1; min-width: 250px; }
        .search-box .material-icons { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px; }
        .search-box input { width: 100%; padding: 10px 12px 10px 40px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; }
        .search-box input:focus { border-color: var(--brand-primary, #a855f7); box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1); }
        
        .filters-group { display: flex; gap: 12px; }
        .modern-select { padding: 10px 32px 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; appearance: none; background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>') no-repeat right 10px center; background-color: white; }
        .modern-btn { padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: none; transition: 0.2s; }
        .btn-primary { background: var(--brand-primary, #a855f7); color: white; }
        .btn-primary:hover { filter: brightness(0.9); }
        .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
        .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }

        .modern-table-container { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { background: #f8fafc; padding: 14px 20px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .modern-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; vertical-align: middle; }
        .modern-table tr:last-child td { border-bottom: none; }
        .modern-table tr:hover { background: #f8fafc; }
        
        /* Linhas inativas ficam um pouco mais transparentes */
        .modern-table tr.row-inactive td { opacity: 0.6; }
        
        .user-name-cell { display: flex; align-items: center; gap: 12px; font-weight: 600; color: #0f172a; }
        .avatar-circle { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: flex; justify-content: center; align-items: center; color: #64748b; font-weight: 700; font-size: 14px; }
        
        .role-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .role-badge .material-icons { font-size: 14px; }
        .bg-aluno { background: #dcfce7; color: #166534; }
        .bg-prof { background: #ffedd5; color: #9a3412; }
        .bg-tec { background: #e0f2fe; color: #1e40af; }
        .bg-admin { background: #f3e8ff; color: #6b21a8; }
        .bg-inactive { background: #f1f5f9; color: #64748b; }

        .action-btns { display: flex; gap: 8px; }
        .btn-icon-only { width: 32px; height: 32px; border-radius: 8px; display: flex; justify-content: center; align-items: center; border: 1px solid transparent; background: transparent; cursor: pointer; transition: 0.2s; color: #64748b; }
        .btn-icon-only:hover { background: #f1f5f9; color: #0f172a; }
        .btn-delete:hover { background: #fef2f2; color: #ef4444; }
        .btn-restore:hover { background: #dcfce7; color: #166534; }

        /* Formulário Retrátil */
        .form-panel { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; display: none; animation: slideDown 0.3s ease; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .input-group label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .input-group input, .input-group select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; }
        .input-group input:focus, .input-group select:focus { border-color: var(--brand-primary, #a855f7); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
    `;
    document.head.appendChild(style);

    section.innerHTML = `
        <div class="users-header-modern">
            <div>
                <h2>Gestão de Usuários</h2>
                <p>Controle de acessos, professores, alunos e equipa técnica.</p>
            </div>
            <button id="toggle-form-btn" class="modern-btn btn-primary">
                <span class="material-icons">person_add</span> Novo Usuário
            </button>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #0ea5e9, #3b82f6);"><span class="material-icons">groups</span></div>
                <div class="kpi-info"><h4>Total de Registos</h4><span id="total-users-stat">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);"><span class="material-icons">check_circle</span></div>
                <div class="kpi-info"><h4>Contas Ativas</h4><span id="active-users-stat">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><span class="material-icons">history_edu</span></div>
                <div class="kpi-info"><h4>Professores</h4><span id="professor-users-stat">0</span></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background: linear-gradient(135deg, #a855f7, #7e22ce);"><span class="material-icons">admin_panel_settings</span></div>
                <div class="kpi-info"><h4>CPA / Admins</h4><span id="admin-users-stat">0</span></div>
            </div>
        </div>

        <div id="user-form-panel" class="form-panel">
            <h3 id="user-form-title" style="margin: 0 0 20px 0; font-size: 18px;">Adicionar Novo Usuário</h3>
            <input type="hidden" id="edit-user-id">
            
            <div class="form-grid">
                <div class="input-group">
                    <label>Nome Completo</label>
                    <input type="text" id="user-name" placeholder="Ex: João Silva" required>
                </div>
                <div class="input-group">
                    <label>E-mail Institucional</label>
                    <input type="email" id="user-email" placeholder="nome@instituicao.edu.br" required>
                </div>
            </div>
            <div class="input-group" style="margin-bottom: 20px; max-width: 50%;">
                <label>Perfil de Acesso</label>
                <select id="user-role" class="modern-select" required>
                    <option value="">Selecione o perfil...</option>
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="tecnico">Técnico Administrativo</option>
                    <option value="admin">Administrador (CPA)</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 12px;">
                <button id="save-user-btn" class="modern-btn btn-primary"><span class="material-icons">save</span> Salvar Registro</button>
                <button id="cancel-user-btn" class="modern-btn btn-outline"><span class="material-icons">close</span> Cancelar</button>
            </div>
        </div>

        <div class="toolbar-modern">
            <div class="search-box">
                <span class="material-icons">search</span>
                <input type="text" id="user-search" placeholder="Pesquisar por nome ou email...">
            </div>
            <div class="filters-group">
                <select id="user-status-filter" class="modern-select">
                    <option value="all">Status: Todos</option>
                    <option value="active" selected>Status: Apenas Ativos</option>
                    <option value="inactive">Status: Apenas Inativos</option>
                </select>
                <select id="user-role-filter" class="modern-select">
                    <option value="all">Perfis: Todos</option>
                    <option value="aluno">Apenas Alunos</option>
                    <option value="professor">Apenas Professores</option>
                    <option value="tecnico">Apenas Técnicos</option>
                    <option value="admin">Apenas Admins</option>
                </select>
            </div>
        </div>

        <div class="modern-table-container">
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        <th style="text-align: right;">Ações</th>
                    </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
            </table>
        </div>
    `;

    document.getElementById('toggle-form-btn').addEventListener('click', () => {
        const panel = document.getElementById('user-form-panel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        clearForm();
    });

    document.getElementById('save-user-btn').addEventListener('click', saveUser);
    document.getElementById('cancel-user-btn').addEventListener('click', () => {
        document.getElementById('user-form-panel').style.display = 'none';
        clearForm();
    });
    
    document.getElementById('user-search').addEventListener('input', filterUsers);
    document.getElementById('user-role-filter').addEventListener('change', filterUsers);
    document.getElementById('user-status-filter').addEventListener('change', filterUsers);

    loadUsers();
}

let allUsers = [];

async function loadUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        
        allUsers = [];
        querySnapshot.forEach(docSnap => {
            allUsers.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        updateUserStats();
        filterUsers(); 
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function updateUserStats() {
    const total = allUsers.length;
    const ativos = allUsers.filter(u => u.ativo !== false).length; 
    const professores = allUsers.filter(u => u.role === 'professor' && u.ativo !== false).length;
    const admins = allUsers.filter(u => (u.role === 'admin' || u.role === 'tecnico') && u.ativo !== false).length; 
    
    document.getElementById('total-users-stat').textContent = total;
    document.getElementById('active-users-stat').textContent = ativos;
    document.getElementById('professor-users-stat').textContent = professores;
    document.getElementById('admin-users-stat').textContent = admins;
}

function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const roleFilter = document.getElementById('user-role-filter').value;
    const statusFilter = document.getElementById('user-status-filter').value;
    
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

    if (statusFilter === 'active') {
        filtered = filtered.filter(u => u.ativo !== false);
    } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(u => u.ativo === false);
    }
    
    renderUsers(filtered);
}

function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">Nenhum usuário encontrado com os filtros atuais.</td></tr>`;
        return;
    }
    
    users.forEach(user => {
        const { label, badgeClass, icon } = getRoleInfo(user.role);
        const initial = (user.nome || user.email || '?').charAt(0).toUpperCase();
        
        const isActive = user.ativo !== false;
        const rowClass = isActive ? '' : 'row-inactive';
        
        const statusBadgeClass = isActive ? 'bg-aluno' : 'bg-inactive';
        const statusIcon = isActive ? 'check_circle' : 'block';
        const statusText = isActive ? 'Ativo' : 'Desativado';

        const toggleActionClass = isActive ? 'btn-delete' : 'btn-restore';
        const toggleActionIcon = isActive ? 'block' : 'restore';
        const toggleActionTitle = isActive ? 'Desativar Acesso' : 'Reativar Acesso';
        
        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td>
                <div class="user-name-cell">
                    <div class="avatar-circle">${initial}</div>
                    <span>${user.nome || 'Sem Nome'}</span>
                </div>
            </td>
            <td style="color: #64748b;">${user.email || ''}</td>
            <td>
                <span class="role-badge ${badgeClass}">
                    <span class="material-icons">${icon}</span> ${label}
                </span>
            </td>
            <td>
                <span class="role-badge ${statusBadgeClass}">
                    <span class="material-icons">${statusIcon}</span> ${statusText}
                </span>
            </td>
            <td>
                <div class="action-btns" style="justify-content: flex-end;">
                    <button class="btn-icon-only edit-btn" data-id="${user.id}" title="Editar">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-icon-only ${toggleActionClass} toggle-status-btn" data-id="${user.id}" data-status="${isActive}" title="${toggleActionTitle}">
                        <span class="material-icons">${toggleActionIcon}</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.dataset.id));
    });
    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleUserStatus(btn.dataset.id, btn.dataset.status === 'true'));
    });
}

function getRoleInfo(role) {
    switch(role) {
        case 'aluno': return { label: 'Aluno', badgeClass: 'bg-aluno', icon: 'school' };
        case 'professor': return { label: 'Professor', badgeClass: 'bg-prof', icon: 'history_edu' };
        case 'tecnico': return { label: 'Técnico', badgeClass: 'bg-tec', icon: 'badge' };
        case 'admin': return { label: 'CPA / Admin', badgeClass: 'bg-admin', icon: 'admin_panel_settings' };
        default: return { label: role || 'Desconhecido', badgeClass: 'bg-aluno', icon: 'person' };
    }
}

async function saveUser() {
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('user-name').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const role = document.getElementById('user-role').value;

    if (!name || !email || !role) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    const btn = document.getElementById('save-user-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons">hourglass_empty</span> Salvando...';

    try {
        if (userId) {
            await updateDoc(doc(db, 'users', userId), { nome: name, email: email, role: role });
        } else {
            const userData = { nome: name, email: email, role: role, ativo: true, createdAt: serverTimestamp() };
            await addDoc(collection(db, 'users'), userData);
        }
        
        clearForm();
        document.getElementById('user-form-panel').style.display = 'none';
        await loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Erro ao salvar usuário: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons">save</span> Salvar Registro';
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
    
    const panel = document.getElementById('user-form-panel');
    panel.style.display = 'block';
    
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('user-name').focus();
}

async function toggleUserStatus(id, currentlyActive) {
    const actionWord = currentlyActive ? 'DESATIVAR' : 'REATIVAR';
    
    if (!confirm(`Tem certeza que deseja ${actionWord} o acesso deste usuário?`)) return;

    try {
        await updateDoc(doc(db, 'users', id), { ativo: !currentlyActive });
        loadUsers();
    } catch (error) {
        console.error(`Error toggling user status:`, error);
        alert(`Erro ao alterar o status do usuário: ` + error.message);
    }
}

function clearForm() {
    document.getElementById('edit-user-id').value = '';
    document.getElementById('user-form-title').textContent = 'Adicionar Novo Usuário';
    document.getElementById('user-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-role').value = '';
}