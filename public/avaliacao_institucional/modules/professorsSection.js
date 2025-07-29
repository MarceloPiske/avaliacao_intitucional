export function setupProfessorsSection() {
    const professorSearch = document.getElementById('professor-search');
    const addProfessorBtn = document.getElementById('add-professor-btn');
    const professorsList = document.getElementById('professors-list');
    const professorFormContainer = document.getElementById('professor-form-container');
    const professorForm = document.getElementById('professor-form');
    const cancelProfessorBtn = document.getElementById('cancel-professor-btn');
    
    let professors = [];
    let editingProfessorId = null;

    // Event listeners
    professorSearch.addEventListener('input', filterProfessors);
    addProfessorBtn.addEventListener('click', showAddProfessorForm);
    cancelProfessorBtn.addEventListener('click', hideProfessorForm);
    professorForm.addEventListener('submit', saveProfessor);

    // Initial load of professors
    loadProfessors();

    function loadProfessors() {
        const db = firebase.firestore();
        db.collection('professores').get()
            .then((querySnapshot) => {
                professors = querySnapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() };
                });
                displayProfessors();
            })
            .catch((error) => {
                console.error("Error loading professors: ", error);
                professorsList.innerHTML = '<p>Erro ao carregar professores. Tente novamente mais tarde.</p>';
            });
    }

    function filterProfessors() {
        displayProfessors();
    }

    function displayProfessors() {
        // Get filter value
        const searchTerm = professorSearch.value.toLowerCase();

        // Filter professors
        const filteredProfessors = professors.filter(professor => {
            if (searchTerm && !professor.nome.toLowerCase().includes(searchTerm) && 
                !professor.email.toLowerCase().includes(searchTerm)) {
                return false;
            }
            return true;
        });

        // Clear previous list
        professorsList.innerHTML = '';

        // Display filtered professors
        if (filteredProfessors.length === 0) {
            professorsList.innerHTML = '<p>Nenhum professor encontrado.</p>';
            return;
        }

        filteredProfessors.forEach(professor => {
            const professorItem = document.createElement('div');
            professorItem.className = 'user-item';
            professorItem.dataset.id = professor.id;

            const professorHeader = document.createElement('div');
            professorHeader.className = 'user-header';

            const professorContent = document.createElement('div');
            professorContent.className = 'user-content';

            const professorName = document.createElement('p');
            professorName.className = 'user-name';
            professorName.textContent = professor.nome;
            professorContent.appendChild(professorName);

            const professorMeta = document.createElement('p');
            professorMeta.className = 'user-meta';
            professorMeta.textContent = `Email: ${professor.email}`;
            professorContent.appendChild(professorMeta);

            const professorActions = document.createElement('div');
            professorActions.className = 'user-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => editProfessor(professor.id));
            professorActions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.addEventListener('click', () => deleteProfessor(professor.id));
            professorActions.appendChild(deleteBtn);

            professorHeader.appendChild(professorContent);
            professorHeader.appendChild(professorActions);
            professorItem.appendChild(professorHeader);
            professorsList.appendChild(professorItem);
        });
    }

    function showAddProfessorForm() {
        // Reset form
        professorForm.reset();
        document.getElementById('professor-form-title').textContent = 'Novo Professor';
        editingProfessorId = null;
        
        // Show form
        professorFormContainer.style.display = 'block';
    }

    function hideProfessorForm() {
        professorFormContainer.style.display = 'none';
    }

    function editProfessor(id) {
        // Find professor by id
        const professor = professors.find(p => p.id === id);
        if (!professor) return;

        // Fill form with professor data
        document.getElementById('professor-name').value = professor.nome || '';
        document.getElementById('professor-email').value = professor.email || '';

        // Set form title and editing id
        document.getElementById('professor-form-title').textContent = 'Editar Professor';
        editingProfessorId = id;

        // Show form
        professorFormContainer.style.display = 'block';
    }

    function saveProfessor(event) {
        event.preventDefault();

        // Get form values
        const professorName = document.getElementById('professor-name').value;
        const professorEmail = document.getElementById('professor-email').value;

        // Validate email domain
        if (!professorEmail.endsWith('@seminarioconcordia.com.br') && 
            !professorEmail.endsWith('@faculdadeluterananconcordia.com.br')) {
            alert('O email deve ser um email institucional válido (@seminarioconcordia.com.br ou @faculdadeluterananconcordia.com.br).');
            return;
        }

        const db = firebase.firestore();
        
        if (editingProfessorId) {
            // Update existing professor
            db.collection('professores').doc(editingProfessorId).update({
                nome: professorName,
                email: professorEmail
            })
            .then(() => {
                loadProfessors();
                hideProfessorForm();
            })
            .catch((error) => {
                console.error("Error updating professor: ", error);
                alert('Erro ao atualizar professor: ' + error.message);
            });
        } else {
            // Check if email already exists
            db.collection('professores').where('email', '==', professorEmail).get()
                .then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        alert('Este email já está registrado.');
                        return;
                    }
                    
                    // Add new professor
                    db.collection('professores').add({
                        nome: professorName,
                        email: professorEmail,
                        tipo: 'professores'
                    })
                    .then(() => {
                        loadProfessors();
                        hideProfessorForm();
                    })
                    .catch((error) => {
                        console.error("Error adding professor: ", error);
                        alert('Erro ao adicionar professor: ' + error.message);
                    });
                })
                .catch((error) => {
                    console.error("Error checking email: ", error);
                    alert('Erro ao verificar email: ' + error.message);
                });
        }
    }

    function deleteProfessor(id) {
        if (confirm('Tem certeza que deseja excluir este professor?')) {
            const db = firebase.firestore();
            db.collection('professores').doc(id).delete()
                .then(() => {
                    loadProfessors();
                })
                .catch((error) => {
                    console.error("Error deleting professor: ", error);
                    alert('Erro ao excluir professor: ' + error.message);
                });
        }
    }
}