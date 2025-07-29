export function setupStaffSection() {
    const staffSearch = document.getElementById('staff-search');
    const addStaffBtn = document.getElementById('add-staff-btn');
    const staffList = document.getElementById('staff-list');
    const staffFormContainer = document.getElementById('staff-form-container');
    const staffForm = document.getElementById('staff-form');
    const cancelStaffBtn = document.getElementById('cancel-staff-btn');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    
    let staffMembers = [];
    let editingStaffId = null;

    // Event listeners
    staffSearch.addEventListener('input', filterStaff);
    addStaffBtn.addEventListener('click', showAddStaffForm);
    cancelStaffBtn.addEventListener('click', hideStaffForm);
    staffForm.addEventListener('submit', saveStaff);
    generateCodeBtn.addEventListener('click', generateAccessCode);

    // Initial load of staff
    loadStaff();

    function loadStaff() {
        const db = firebase.firestore();
        db.collection('funcionarios').get()
            .then((querySnapshot) => {
                staffMembers = querySnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() };
                });
                displayStaff();
            })
            .catch((error) => {
                console.error("Error loading staff: ", error);
                staffList.innerHTML = '<p>Erro ao carregar funcionários. Tente novamente mais tarde.</p>';
            });
    }

    function filterStaff() {
        displayStaff();
    }

    function displayStaff() {
        // Get filter value
        const searchTerm = staffSearch.value.toLowerCase();

        // Filter staff
        const filteredStaff = staffMembers.filter(staff => {
            if (searchTerm && !staff.nome.toLowerCase().includes(searchTerm) && 
                !staff.email.toLowerCase().includes(searchTerm)) {
                return false;
            }
            return true;
        });

        // Clear previous list
        staffList.innerHTML = '';

        // Display filtered staff
        if (filteredStaff.length === 0) {
            staffList.innerHTML = '<p>Nenhum funcionário encontrado.</p>';
            return;
        }

        filteredStaff.forEach(staff => {
            const staffItem = document.createElement('div');
            staffItem.className = 'user-item';
            staffItem.dataset.id = staff.id;

            const staffHeader = document.createElement('div');
            staffHeader.className = 'user-header';

            const staffContent = document.createElement('div');
            staffContent.className = 'user-content';

            const staffName = document.createElement('p');
            staffName.className = 'user-name';
            staffName.textContent = staff.nome;
            staffContent.appendChild(staffName);

            const staffMeta = document.createElement('p');
            staffMeta.className = 'user-meta';
            staffMeta.textContent = `Email: ${staff.email} | Código: ${staff.codigo}`;
            staffContent.appendChild(staffMeta);

            const staffActions = document.createElement('div');
            staffActions.className = 'user-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => editStaff(staff.id));
            staffActions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.addEventListener('click', () => deleteStaff(staff.id));
            staffActions.appendChild(deleteBtn);

            staffHeader.appendChild(staffContent);
            staffHeader.appendChild(staffActions);
            staffItem.appendChild(staffHeader);
            staffList.appendChild(staffItem);
        });
    }

    function showAddStaffForm() {
        // Reset form
        staffForm.reset();
        document.getElementById('staff-form-title').textContent = 'Novo Técnicos Administrativo';
        document.getElementById('staff-code').value = '';
        editingStaffId = null;
        
        // Show form
        staffFormContainer.style.display = 'block';
    }

    function hideStaffForm() {
        staffFormContainer.style.display = 'none';
    }

    function generateAccessCode() {
        // Generate a random 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        document.getElementById('staff-code').value = code;
    }

    function editStaff(id) {
        // Find staff by id
        const staff = staffMembers.find(s => s.id === id);
        if (!staff) return;

        // Fill form with staff data
        document.getElementById('staff-name').value = staff.nome || '';
        document.getElementById('staff-email').value = staff.email || '';
        document.getElementById('staff-code').value = staff.codigo || '';
        document.getElementById('staff-password').value = staff.senha || '';

        // Set form title and editing id
        document.getElementById('staff-form-title').textContent = 'Editar Técnicos Administrativo';
        editingStaffId = id;

        // Show form
        staffFormContainer.style.display = 'block';
    }

    function saveStaff(event) {
        event.preventDefault();

        // Get form values
        const staffName = document.getElementById('staff-name').value;
        const staffEmail = document.getElementById('staff-email').value;
        const staffCode = document.getElementById('staff-code').value;
        const staffPassword = document.getElementById('staff-password').value;

        if (!staffCode) {
            alert('Por favor, gere um código de acesso.');
            return;
        }

        const db = firebase.firestore();
        
        if (editingStaffId) {
            // Update existing staff
            db.collection('funcionarios').doc(editingStaffId).update({
                nome: staffName,
                email: staffEmail,
                codigo: staffCode,
                senha: staffPassword
            })
            .then(() => {
                loadStaff();
                hideStaffForm();
            })
            .catch((error) => {
                console.error("Error updating staff: ", error);
                alert('Erro ao atualizar funcionário: ' + error.message);
            });
        } else {
            // Check if code already exists
            db.collection('funcionarios').where('codigo', '==', staffCode).get()
                .then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        alert('Este código já está em uso. Por favor, gere outro código.');
                        return;
                    }
                    
                    // Add new staff
                    db.collection('funcionarios').add({
                        nome: staffName,
                        email: staffEmail,
                        codigo: staffCode,
                        senha: staffPassword,
                        tipo: 'tecnicos'
                    })
                    .then(() => {
                        loadStaff();
                        hideStaffForm();
                    })
                    .catch((error) => {
                        console.error("Error adding staff: ", error);
                        alert('Erro ao adicionar funcionário: ' + error.message);
                    });
                })
                .catch((error) => {
                    console.error("Error checking code: ", error);
                    alert('Erro ao verificar código: ' + error.message);
                });
        }
    }

    function deleteStaff(id) {
        if (confirm('Tem certeza que deseja excluir este funcionário?')) {
            const db = firebase.firestore();
            db.collection('funcionarios').doc(id).delete()
                .then(() => {
                    loadStaff();
                })
                .catch((error) => {
                    console.error("Error deleting staff: ", error);
                    alert('Erro ao excluir funcionário: ' + error.message);
                });
        }
    }
}