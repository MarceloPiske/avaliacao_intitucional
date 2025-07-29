export class TurmasStudents {
    constructor(turmasCRUD) {
        this.turmasCRUD = turmasCRUD;
    }

    async renderEnrolledStudents(alunosInscritos) {
        if (!alunosInscritos || alunosInscritos.length === 0) {
            return `
                <div class="no-enrolled-students">
                    <div class="no-enrolled-icon">
                        <span class="material-icons">person_outline</span>
                    </div>
                    <h4>Nenhum aluno inscrito</h4>
                    <p>Selecione alunos disponíveis para adicionar à turma.</p>
                </div>
            `;
        }

        const studentsData = [];
        const missingStudents = [];

        for (const alunoId of alunosInscritos) {
            try {
                const student = await this.turmasCRUD.getUser(alunoId);
                if (student) {
                    studentsData.push(student);
                } else {
                    missingStudents.push(alunoId);
                }
            } catch (error) {
                console.error('Erro ao carregar aluno:', alunoId, error);
                missingStudents.push(alunoId);
            }
        }

        let html = '';

        // Show missing students alert if any
        if (missingStudents.length > 0) {
            html += `
                <div class="missing-students-alert">
                    <div class="alert-header">
                        <span class="material-icons">warning</span>
                        <h6>Alunos não encontrados (${missingStudents.length})</h6>
                    </div>
                    <p>Os seguintes IDs de alunos estão na turma mas não existem na base de usuários:</p>
                    <div class="missing-students-list">
                        ${missingStudents.map(id => `<code>${id}</code>`).join(', ')}
                    </div>
                    <div class="alert-actions">
                        <button type="button" class="btn btn-warning btn-sm" onclick="cleanupMissingStudents()">
                            <span class="material-icons">cleaning_services</span> Limpar IDs Inválidos
                        </button>
                    </div>
                </div>
            `;
        }

        // Show existing students in an improved grid
        if (studentsData.length > 0) {
            html += `
                <div class="enrolled-students-grid">
                    ${studentsData.map(student => `
                        <div class="enrolled-student-card">
                            <div class="student-info">
                                <div class="student-avatar">
                                    ${student.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div class="student-details">
                                    <div class="student-name">${student.displayName}</div>
                                    <div class="student-email">${student.email}</div>
                                    ${student.uid ? `<div class="student-uid">UID: ${student.uid.substring(0, 8)}...</div>` : ''}
                                </div>
                            </div>
                            <div class="student-actions">
                                <button class="btn btn-danger btn-sm" onclick="removeStudentFromTurma('${student.id}')" title="Remover aluno da turma">
                                    <span class="material-icons">person_remove</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return html || `
            <div class="no-enrolled-students">
                <div class="no-enrolled-icon">
                    <span class="material-icons">person_outline</span>
                </div>
                <h4>Nenhum aluno válido encontrado</h4>
                <p>Todos os alunos podem ter sido removidos ou não existem mais no sistema.</p>
            </div>
        `;
    }

    async addStudentToTurma(turmaId, type) {
        try {
            let studentId;
            
            if (type === 'existing') {
                studentId = document.getElementById('existingStudentSelect').value;
                if (!studentId) {
                    alert('Selecione um aluno existente.');
                    return;
                }
            } else if (type === 'new') {
                const name = document.getElementById('newStudentName').value;
                const email = document.getElementById('newStudentEmail').value;
                
                if (!name || !email) {
                    alert('Preencha todos os campos obrigatórios.');
                    return;
                }

                // Check if email already exists
                const existingUsers = await this.turmasCRUD.getUsersByEmail(email);
                if (existingUsers.length > 0) {
                    alert('Já existe um usuário com este email.');
                    return;
                }

                // Create new student with uid field
                const newStudentData = {
                    displayName: name,
                    email: email,
                    uid: null,
                    tipos: ['aluno'],
                    dataCriacao: new Date()
                };

                await this.turmasCRUD.createUser(newStudentData);
                
                // Get the created student to get its ID
                const createdUsers = await this.turmasCRUD.getUsersByEmail(email);
                studentId = createdUsers[0].id;
            }

            // Get current turma data
            const turma = await this.turmasCRUD.getTurma(turmaId);
            const alunosInscritos = turma.alunosInscritos || [];

            // Check if student is already enrolled
            if (alunosInscritos.includes(studentId)) {
                alert('Este aluno já está inscrito na turma.');
                return;
            }

            // Add student to turma
            alunosInscritos.push(studentId);
            await this.turmasCRUD.updateTurma(turmaId, { alunosInscritos });

            alert('Aluno adicionado com sucesso!');
            
            // Return success to trigger modal refresh
            return true;
            
        } catch (error) {
            console.error('Erro ao adicionar aluno:', error);
            alert('Erro ao adicionar aluno. Tente novamente.');
            return false;
        }
    }

    async addSelectedStudentsToTurma(turmaId, studentIds) {
        try {
            if (!studentIds || studentIds.length === 0) {
                alert('Selecione pelo menos um aluno para adicionar.');
                return false;
            }

            // Get current turma data
            const turma = await this.turmasCRUD.getTurma(turmaId);
            let alunosInscritos = turma.alunosInscritos || [];

            // Filter out students that are already enrolled
            const newStudents = studentIds.filter(id => !alunosInscritos.includes(id));
            
            if (newStudents.length === 0) {
                alert('Todos os alunos selecionados já estão inscritos na turma.');
                return false;
            }

            // Add new students to turma
            alunosInscritos = [...alunosInscritos, ...newStudents];
            await this.turmasCRUD.updateTurma(turmaId, { alunosInscritos });

            const message = newStudents.length === 1 ? 
                'Aluno adicionado com sucesso!' : 
                `${newStudents.length} alunos adicionados com sucesso!`;
            
            alert(message);
            return true;
            
        } catch (error) {
            console.error('Erro ao adicionar alunos:', error);
            alert('Erro ao adicionar alunos. Tente novamente.');
            return false;
        }
    }

    async removeStudentFromTurma(studentId, turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            
            const alunosInscritos = (turma.alunosInscritos || []).filter(id => id !== studentId);
            await this.turmasCRUD.updateTurma(turmaId, { alunosInscritos });

            return true;
            
        } catch (error) {
            console.error('Erro ao remover aluno:', error);
            alert('Erro ao remover aluno. Tente novamente.');
            return false;
        }
    }

    async removeAllStudentsFromTurma(turmaId) {
        try {
            await this.turmasCRUD.updateTurma(turmaId, { alunosInscritos: [] });
            return true;
        } catch (error) {
            console.error('Erro ao remover todos os alunos:', error);
            alert('Erro ao remover alunos. Tente novamente.');
            return false;
        }
    }

    async refreshEnrolledStudentsList(turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            const enrolledStudentsList = document.getElementById('enrolledStudentsList');
            const enrolledCount = document.getElementById('enrolledCount');
            
            if (enrolledStudentsList) {
                enrolledStudentsList.innerHTML = await this.renderEnrolledStudents(turma.alunosInscritos || []);
            }
            
            if (enrolledCount) {
                enrolledCount.textContent = (turma.alunosInscritos || []).length;
            }

            // Update the remove all button visibility
            const removeAllBtn = document.getElementById('removeAllStudents');
            if (removeAllBtn) {
                if ((turma.alunosInscritos || []).length === 0) {
                    removeAllBtn.style.display = 'none';
                } else {
                    removeAllBtn.style.display = 'flex';
                }
            }

            // Refresh the available students grid
            await this.refreshAvailableStudentsList(turmaId);
            
        } catch (error) {
            console.error('Erro ao atualizar lista de alunos:', error);
        }
    }

    async refreshAvailableStudentsList(turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            const allUsers = await this.turmasCRUD.getAllUsers();
            const students = allUsers.filter(user => user.tipos?.includes('aluno'));
            const enrolledStudentIds = turma.alunosInscritos || [];
            
            const studentsGrid = document.getElementById('studentsGrid');
            const searchResults = document.getElementById('searchResults');
            
            if (studentsGrid) {
                const modalsManager = window.turmasModalsManager;
                studentsGrid.innerHTML = modalsManager.renderStudentCheckboxList(students, enrolledStudentIds);
                
                // Re-setup event listeners for checkboxes
                this.setupCheckboxEventListeners();
            }
            
            if (searchResults) {
                const availableCount = students.filter(s => !enrolledStudentIds.includes(s.id)).length;
                searchResults.textContent = `Mostrando ${availableCount} alunos disponíveis`;
            }
            
            // Update stats
            const availableCount = students.filter(s => !enrolledStudentIds.includes(s.id)).length;
            const statNumbers = document.querySelectorAll('.students-stats .stat-number');
            if (statNumbers[0]) {
                statNumbers[0].textContent = availableCount;
            }
            
        } catch (error) {
            console.error('Erro ao atualizar lista de alunos disponíveis:', error);
        }
    }

    setupCheckboxEventListeners() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        const selectAllBtn = document.getElementById('selectAllStudents');
        const deselectAllBtn = document.getElementById('deselectAllStudents');
        const addSelectedBtn = document.getElementById('addSelectedStudents');
        const selectedCount = document.getElementById('selectedCount');

        const updateSelectedCount = () => {
            const selected = document.querySelectorAll('.student-checkbox:checked');
            const count = selected.length;
            
            if (selectedCount) selectedCount.textContent = count;
            if (addSelectedBtn) addSelectedBtn.disabled = count === 0;
        };

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCount);
        });

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const visibleCheckboxes = document.querySelectorAll('.student-checkbox-item:not([style*="display: none"]) .student-checkbox');
                visibleCheckboxes.forEach(cb => cb.checked = true);
                updateSelectedCount();
            });
        }

        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                checkboxes.forEach(cb => cb.checked = false);
                updateSelectedCount();
            });
        }

        updateSelectedCount();
    }

    async handleMissingStudentsSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const totalStudents = parseInt(formData.get('totalStudents'));
        const turmaId = formData.get('turmaId');
        
        const studentsToCreate = [];
        
        for (let i = 0; i < totalStudents; i++) {
            const displayName = formData.get(`displayName_${i}`);
            const email = formData.get(`email_${i}`);
            const uid = formData.get(`uid_${i}`);
            
            if (!displayName || !email) {
                alert(`Por favor, preencha todos os campos para o aluno ${i + 1}.`);
                return false;
            }
            
            // Check if email already exists
            try {
                const existingUsers = await this.turmasCRUD.getUsersByEmail(email);
                if (existingUsers.length > 0) {
                    alert(`O email ${email} já está em uso por outro usuário.`);
                    return false;
                }
            } catch (error) {
                console.error('Erro ao verificar email:', error);
            }
            
            studentsToCreate.push({
                id: uid, // Use the authentication UID as the document ID
                displayName: displayName,
                email: email,
                uid: uid, // Store the authentication UID
                tipos: ['aluno'],
                dataCriacao: new Date()
            });
        }
        
        try {
            // Create all students
            for (const studentData of studentsToCreate) {
                await this.turmasCRUD.createUser(studentData);
            }
            
            alert(`${studentsToCreate.length} usuário(s) criado(s) com sucesso!`);
            return { success: true, turmaId };
            
        } catch (error) {
            console.error('Erro ao criar usuários:', error);
            alert('Erro ao criar usuários. Tente novamente.');
            return { success: false };
        }
    }

    getCurrentTurmaId() {
        // Extract turma ID from current modal context
        const studentsSection = document.querySelector('.students-management h4');
        if (studentsSection) {
            const addButton = document.querySelector('button[onclick*="addStudentToTurma"]');
            if (addButton) {
                const match = addButton.onclick.toString().match(/addStudentToTurma\('([^']+)'/);
                return match ? match[1] : null;
            }
        }
        return null;
    }
}