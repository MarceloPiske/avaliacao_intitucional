export function setupAdminsSection() {
    const adminSearch = document.getElementById('admin-search');
    const addAdminBtn = document.getElementById('add-admin-btn');
    const adminsList = document.getElementById('admins-list');
    const adminFormContainer = document.getElementById('admin-form-container');
    const adminForm = document.getElementById('admin-form');
    const cancelAdminBtn = document.getElementById('cancel-admin-btn');
    
    let admins = [];
    let editingAdminId = null;

    // Event listeners
    adminSearch.addEventListener('input', filterAdmins);
    addAdminBtn.addEventListener('click', showAddAdminForm);
    cancelAdminBtn.addEventListener('click', hideAdminForm);
    adminForm.addEventListener('submit', saveAdmin);

    // Initial load of admins
    loadAdmins();

    function loadAdmins() {
        const db = firebase.firestore();
        db.collection('admins').get()
            .then((querySnapshot) => {
                admins = querySnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() };
                });
                displayAdmins();
            })
            .catch((error) => {
                console.error("Error loading admins: ", error);
                adminsList.innerHTML = '<p>Erro ao carregar administradores. Tente novamente mais tarde.</p>';
            });
    }

    function filterAdmins() {
        displayAdmins();
    }

    function displayAdmins() {
        // Get filter value
        const searchTerm = adminSearch.value.toLowerCase();

        // Filter admins
        const filteredAdmins = admins.filter(admin => {
            if (searchTerm && !admin.nome?.toLowerCase().includes(searchTerm) && 
                !admin.email?.toLowerCase().includes(searchTerm)) {
                return false;
            }
            return true;
        });

        // Sort admins by name
        filteredAdmins.sort((a, b) => {
            return (a.nome || '').localeCompare(b.nome || '');
        });

        // Clear previous list
        adminsList.innerHTML = '';

        // Display filtered admins
        if (filteredAdmins.length === 0) {
            adminsList.innerHTML = '<p>Nenhum administrador encontrado.</p>';
            return;
        }

        // Create a table for better display
        const table = document.createElement('table');
        table.className = 'users-table';
        
        // Add table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Nome', 'Email', 'Ações'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Add table body
        const tbody = document.createElement('tbody');
        
        filteredAdmins.forEach(admin => {
            const row = document.createElement('tr');
            
            // Name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = admin.nome || 'N/A';
            row.appendChild(nameCell);
            
            // Email cell
            const emailCell = document.createElement('td');
            emailCell.textContent = admin.email || 'N/A';
            row.appendChild(emailCell);
            
            // Actions cell
            const actionsCell = document.createElement('td');
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => editAdmin(admin.id));
            actionsCell.appendChild(editBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.addEventListener('click', () => deleteAdmin(admin.id));
            actionsCell.appendChild(deleteBtn);
            
            row.appendChild(actionsCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        adminsList.appendChild(table);
    }

    function showAddAdminForm() {
        // Reset form
        adminForm.reset();
        document.getElementById('admin-form-title').textContent = 'Novo Administrador';
        editingAdminId = null;
        
        // Show form
        adminFormContainer.style.display = 'block';
    }

    function hideAdminForm() {
        adminFormContainer.style.display = 'none';
    }

    function editAdmin(id) {
        // Find admin by id
        const admin = admins.find(a => a.id === id);
        if (!admin) return;

        // Fill form with admin data
        document.getElementById('admin-name').value = admin.nome || '';
        document.getElementById('admin-email').value = admin.email || '';

        // Set form title and editing id
        document.getElementById('admin-form-title').textContent = 'Editar Administrador';
        editingAdminId = id;

        // Show form
        adminFormContainer.style.display = 'block';
    }

    function saveAdmin(event) {
        event.preventDefault();

        // Get form values
        const adminName = document.getElementById('admin-name').value;
        const adminEmail = document.getElementById('admin-email').value;
        
        // Validate input
        if (!adminName.trim()) {
            alert('Por favor, digite um nome válido.');
            return;
        }
        
        if (!adminEmail.trim() || !validateEmail(adminEmail)) {
            alert('Por favor, digite um email válido.');
            return;
        }

        const db = firebase.firestore();
        
        if (editingAdminId) {
            // Update existing admin
            db.collection('admins').doc(editingAdminId).update({
                nome: adminName,
                email: adminEmail,
                ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                alert('Administrador atualizado com sucesso!');
                loadAdmins();
                hideAdminForm();
            })
            .catch((error) => {
                console.error("Error updating admin: ", error);
                alert('Erro ao atualizar administrador: ' + error.message);
            });
        } else {
            // Check if email already exists
            db.collection('admins').where('email', '==', adminEmail).get()
                .then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        alert('Este email já está registrado como administrador.');
                        return;
                    }
                    
                    // Add new admin
                    db.collection('admins').add({
                        nome: adminName,
                        email: adminEmail,
                        tipo: 'admin',
                        dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        alert('Administrador adicionado com sucesso!');
                        loadAdmins();
                        hideAdminForm();
                    })
                    .catch((error) => {
                        console.error("Error adding admin: ", error);
                        alert('Erro ao adicionar administrador: ' + error.message);
                    });
                })
                .catch((error) => {
                    console.error("Error checking email: ", error);
                    alert('Erro ao verificar email: ' + error.message);
                });
        }
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function deleteAdmin(id) {
        if (confirm('Tem certeza que deseja excluir este administrador?')) {
            const db = firebase.firestore();
            db.collection('admins').doc(id).delete()
                .then(() => {
                    loadAdmins();
                })
                .catch((error) => {
                    console.error("Error deleting admin: ", error);
                    alert('Erro ao excluir administrador: ' + error.message);
                });
        }
    }
}