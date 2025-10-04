import { db } from './firebaseConfig.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, where, query, serverTimestamp } from "firebase/firestore";

export function setupUsersSection() {
    const userSearch = document.getElementById('user-search');
    const userTypeFilter = document.getElementById('user-type-filter');
    const addUserBtn = document.getElementById('add-user-btn');
    const usersList = document.getElementById('users-list');
    const userFormContainer = document.getElementById('user-form-container');
    const userForm = document.getElementById('user-form');
    const cancelUserBtn = document.getElementById('cancel-user-btn');
    const userTypeSelect = document.getElementById('user-type');
    const staffCodeGroup = document.getElementById('staff-code-group');
    const userPasswordGroup = document.getElementById('user-password-group');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    
    let users = [];
    let editingUserId = null;

    // Load users
    loadUsers();

    // Event listeners
    userSearch.addEventListener('input', filterUsers);
    userTypeFilter.addEventListener('change', filterUsers);
    addUserBtn.addEventListener('click', showAddUserForm);
    cancelUserBtn.addEventListener('click', hideUserForm);
    userForm.addEventListener('submit', saveUser);
    userTypeSelect.addEventListener('change', toggleUserTypeFields);
    generateCodeBtn.addEventListener('click', generateAccessCode);

    function loadUsers() {
        const usersCol = collection(db, 'users');
        getDocs(usersCol)
            .then((querySnapshot) => {
                users = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { 
                        id: doc.id, 
                        nome: data.nome || data.name,
                        email: data.email,
                        tipo: data.tipo || data.type
                    };
                });
                displayUsers();
            })
            .catch((error) => {
                console.error("Error loading users: ", error);
                usersList.innerHTML = '<p>Erro ao carregar usuários. Tente novamente mais tarde.</p>';
            });
    }

    function filterUsers() {
        displayUsers();
    }

    function displayUsers() {
        // Get filter values
        const searchTerm = userSearch.value.toLowerCase();
        const typeFilter = userTypeFilter.value;

        // Filter users
        const filteredUsers = users.filter(user => {
            if (searchTerm && !user.nome?.toLowerCase().includes(searchTerm) && 
                !user.email?.toLowerCase().includes(searchTerm)) {
                return false;
            }
            if (typeFilter !== 'all' && user.tipo !== typeFilter) return false;
            return true;
        });

        // Clear previous users
        usersList.innerHTML = '';

        // Display filtered users
        if (filteredUsers.length === 0) {
            usersList.innerHTML = '<p>Nenhum usuário encontrado para os filtros selecionados.</p>';
            return;
        }

        // Create a table for better display
        const table = document.createElement('table');
        table.className = 'users-table';
        
        // Add table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Nome', 'Email', 'Tipo', 'Ações'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Add table body
        const tbody = document.createElement('tbody');
        
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            
            // Name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = user.nome || 'N/A';
            row.appendChild(nameCell);
            
            // Email cell
            const emailCell = document.createElement('td');
            emailCell.textContent = user.email || 'N/A';
            row.appendChild(emailCell);
            
            // Type cell
            const typeCell = document.createElement('td');
            typeCell.textContent = getUserTypeName(user.tipo);
            row.appendChild(typeCell);
            
            // Actions cell
            const actionsCell = document.createElement('td');
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar';
            editBtn.addEventListener('click', () => editUser(user.id));
            actionsCell.appendChild(editBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir';
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
            actionsCell.appendChild(deleteBtn);
            
            row.appendChild(actionsCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        usersList.appendChild(table);
    }

    function getUserTypeName(type) {
        const types = {
            'alunos': 'Aluno',
            'professores': 'Professor',
            'tecnicos': 'Técnico Administrativo',
            'admin': 'Administrador'
        };
        return types[type] || type;
    }

    function showAddUserForm() {
        // Reset form
        userForm.reset();
        document.getElementById('user-form-title').textContent = 'Novo Usuário';
        editingUserId = null;
        
        // Hide conditional fields initially
        staffCodeGroup.style.display = 'none';
        userPasswordGroup.style.display = 'none';
        
        // Show form
        userFormContainer.style.display = 'block';
    }

    function hideUserForm() {
        userFormContainer.style.display = 'none';
    }

    function toggleUserTypeFields() {
        const userType = userTypeSelect.value;
        
        // Show/hide code and password fields based on user type
        if (userType === 'tecnicos') {
            staffCodeGroup.style.display = 'block';
            userPasswordGroup.style.display = 'block';
        } else {
            staffCodeGroup.style.display = 'none';
            userPasswordGroup.style.display = 'none';
        }
    }

    function generateAccessCode() {
        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        document.getElementById('user-code').value = code;
    }

    function editUser(id) {
        // Find user by id
        const user = users.find(u => u.id === id);
        if (!user) return;

        // Fill form with user data
        document.getElementById('user-name').value = user.nome || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-type').value = user.tipo || '';
        
        // Handle conditional fields
        if (user.tipo === 'tecnicos') {
            staffCodeGroup.style.display = 'block';
            userPasswordGroup.style.display = 'block';
            document.getElementById('user-code').value = user.codigo || '';
            document.getElementById('user-password').value = ''; // For security, don't show password
        } else {
            staffCodeGroup.style.display = 'none';
            userPasswordGroup.style.display = 'none';
        }

        // Set form title and editing id
        document.getElementById('user-form-title').textContent = 'Editar Usuário';
        editingUserId = id;

        // Show form
        userFormContainer.style.display = 'block';
    }

    async function saveUser(event) {
        event.preventDefault();

        // Get form values
        const userName = document.getElementById('user-name').value;
        const userEmail = document.getElementById('user-email').value;
        const userType = document.getElementById('user-type').value;
        
        // Validate email for professors and students
        if (userType === 'alunos' || userType === 'professores') {
            if (!userEmail.endsWith('@seminarioconcordia.com.br') && 
                !userEmail.endsWith('@faculdadeluterananconcordia.com.br')) {
                alert('Para alunos e professores, o email deve ser um email institucional válido (@seminarioconcordia.com.br ou @faculdadeluterananconcordia.com.br).');
                return;
            }
        }
        
        // Get conditional fields if applicable
        let userData = {
            nome: userName,
            name: userName,
            email: userEmail,
            tipo: userType,
            type: userType
        };
        
        if (userType === 'tecnicos') {
            const userCode = document.getElementById('user-code').value;
            const userPassword = document.getElementById('user-password').value;
            
            if (!userCode) {
                alert('Por favor, gere um código de acesso para o funcionário.');
                return;
            }
            
            if (!userPassword && !editingUserId) {
                alert('Por favor, defina uma senha para o funcionário.');
                return;
            }
            
            userData.codigo = userCode;
            
            // Only include password if it was changed
            if (userPassword) {
                userData.senha = userPassword;
            }
        }
        
        if (editingUserId) {
            // Update existing user
            const userDoc = doc(db, 'users', editingUserId);
            try {
                await updateDoc(userDoc, userData);
                alert('Usuário atualizado com sucesso!');
                loadUsers();
                hideUserForm();
            } catch (error) {
                console.error("Error updating user: ", error);
                alert('Erro ao atualizar usuário: ' + error.message);
            }
        } else {
            // Check if email already exists
            const qEmail = query(collection(db, 'users'), where('email', '==', userEmail));
            const emailSnapshot = await getDocs(qEmail);

            if (!emailSnapshot.empty) {
                alert('Este email já está registrado.');
                return;
            }
            
            // For technical staff, check if code already exists
            if (userType === 'tecnicos') {
                const qCode = query(
                    collection(db, 'users'),
                    where('codigo', '==', userData.codigo)
                );
                const codeSnapshot = await getDocs(qCode);
                if (!codeSnapshot.empty) {
                    alert('Este código de acesso já está em uso. Por favor, gere outro código.');
                    return;
                }
            }

            // Add new user
            try {
                await addDoc(collection(db, 'users'), {
                    ...userData,
                    dataCriacao: serverTimestamp()
                });
                alert('Usuário adicionado com sucesso!');
                loadUsers();
                hideUserForm();
            } catch (error) {
                console.error("Error adding user: ", error);
                alert('Erro ao adicionar usuário: ' + error.message);
            }
        }
    }

    async function deleteUser(id) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            const userDoc = doc(db, 'users', id);
            try {
                await deleteDoc(userDoc);
                alert('Usuário excluído com sucesso!');
                loadUsers();
            } catch (error) {
                console.error("Error deleting user: ", error);
                alert('Erro ao excluir usuário: ' + error.message);
            }
        }
    }
}