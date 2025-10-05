export function initUsersSection() {
    const section = document.getElementById('users-section');
    
    section.innerHTML = `
        <div class="section-content">
            <h2>Gerenciar Usuários</h2>
            <div class="form-container">
                <h3 id="user-form-title">Adicionar Usuário</h3>
                <input type="hidden" id="edit-user-id">
                <input type="text" id="user-name" placeholder="Nome" required>
                <input type="email" id="user-email" placeholder="Email" required>
                <select id="user-role" required>
                    <option value="">Selecione o tipo</option>
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="tecnico">Técnico Administrativo</option>
                    <option value="admin">Administrador</option>
                </select>
                <div style="display: flex; gap: 10px;">
                    <button id="save-user-btn">Salvar Usuário</button>
                    <button id="cancel-user-btn" class="secondary">Cancelar</button>
                </div>
            </div>
            <div id="users-list"></div>
        </div>
    `;

    document.getElementById('save-user-btn').addEventListener('click', saveUser);
    document.getElementById('cancel-user-btn').addEventListener('click', cancelEdit);

    loadUsers();
}

async function loadUsers() {
    const db = firebase.firestore();
    const snapshot = await db.collection('users').get();
    
    const listDiv = document.getElementById('users-list');
    listDiv.innerHTML = '<h3>Lista de Usuários</h3><table class="users-table"><thead><tr><th>Nome</th><th>Email</th><th>Tipo</th><th>Ações</th></tr></thead><tbody id="users-tbody"></tbody></table>';
    
    const tbody = document.getElementById('users-tbody');
    
    snapshot.forEach(doc => {
        const user = doc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.nome || ''}</td>
            <td>${user.email || ''}</td>
            <td>${user.role || ''}</td>
            <td>
                <button class="edit-btn" data-id="${doc.id}">Editar</button>
                <button class="delete-btn" data-id="${doc.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.dataset.id));
    });
    
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });
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
    const db = firebase.firestore();
    const doc = await db.collection('users').doc(id).get();
    const user = doc.data();

    document.getElementById('edit-user-id').value = id;
    document.getElementById('user-form-title').textContent = 'Editar Usuário';
    document.getElementById('user-name').value = user.nome || '';
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-role').value = user.role || '';
    
    document.getElementById('user-name').focus();
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
}

