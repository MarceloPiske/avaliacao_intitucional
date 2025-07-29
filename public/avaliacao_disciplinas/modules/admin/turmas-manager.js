import { TurmasCRUD } from './turmas/turmas-crud.js';
import { TurmasRenderer } from './turmas/turmas-renderer.js';
import { TurmasStudents } from './turmas/turmas-students.js';
import { TurmasModals } from './turmas/turmas-modals.js';

export class TurmasManager {
    constructor() {
        this.turmasCRUD = new TurmasCRUD();
        this.renderer = new TurmasRenderer();
        this.studentsManager = new TurmasStudents(this.turmasCRUD);
        this.modalsManager = new TurmasModals(this.turmasCRUD, this.studentsManager);
        this.setupFilters();
    }

    setupFilters() {
        document.getElementById('turmasSemestreFilter').addEventListener('change', () => {
            this.renderer.filterTurmas();
        });

        document.getElementById('turmasStatusFilter').addEventListener('change', () => {
            this.renderer.filterTurmas();
        });

        document.getElementById('turmasSearchFilter').addEventListener('input', () => {
            this.renderer.filterTurmas();
        });
    }

    async loadData() {
        try {
            const turmas = await this.turmasCRUD.loadData();
            this.renderer.renderTurmas(turmas);
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        }
    }

    async openAddModal() {
        try {
            const modalContent = await this.modalsManager.createAddModal();
            this.modalsManager.showModal('Adicionar Turma', modalContent);
            
            document.getElementById('turmaForm').addEventListener('submit', async (e) => {
                await this.handleTurmaSubmit(e);
            });
        } catch (error) {
            console.error('Erro ao abrir modal de adicionar:', error);
            alert('Erro ao carregar formulário. Tente novamente.');
        }
    }

    async handleTurmaSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const disciplinaId = formData.get('disciplinaId');
        const professorId = formData.get('professorId');
        const formularioId = formData.get('formularioId');
        
        try {
            const [disciplinas, professores, formularios] = await Promise.all([
                this.turmasCRUD.getDisciplinas(),
                this.turmasCRUD.getProfessores(),
                this.turmasCRUD.getFormularios()
            ]);
            
            const disciplina = disciplinas.find(d => d.id === disciplinaId);
            const professor = professores.find(p => p.id === professorId);
            const formulario = formularios.find(f => f.id === formularioId);
            
            const turmaData = {
                disciplinaId: disciplinaId,
                disciplinaNome: disciplina.name,
                professorId: professorId,
                professorNome: professor.displayName,
                formularioId: formularioId,
                formularioTitulo: formulario.titulo,
                semestre: formData.get('semestre'),
                statusAvaliacao: formData.get('statusAvaliacao'),
                alunosInscritos: [],
                dataCriacao: new Date()
            };

            await this.turmasCRUD.createTurma(turmaData);
            alert('Turma criada com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao criar turma:', error);
            alert('Erro ao criar turma. Tente novamente.');
        }
    }

    async openEditModal(turmaId) {
        try {
            const modalContent = await this.modalsManager.createEditModal(turmaId);
            this.modalsManager.showModal('Editar Turma', modalContent);

            document.getElementById('turmaEditForm').addEventListener('submit', async (e) => {
                await this.handleTurmaEditSubmit(e);
            });
        } catch (error) {
            console.error('Erro ao carregar turma:', error);
            alert('Erro ao carregar dados da turma.');
        }
    }

    async handleTurmaEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const turmaId = e.target.dataset.turmaId;
        const disciplinaId = formData.get('disciplinaId');
        const professorId = formData.get('professorId');
        const formularioId = formData.get('formularioId');
        
        try {
            const [disciplinas, professores, formularios] = await Promise.all([
                this.turmasCRUD.getDisciplinas(),
                this.turmasCRUD.getProfessores(),
                this.turmasCRUD.getFormularios()
            ]);
            
            const disciplina = disciplinas.find(d => d.id === disciplinaId);
            const professor = professores.find(p => p.id === professorId);
            const formulario = formularios.find(f => f.id === formularioId);
            
            const turmaData = {
                disciplinaId: disciplinaId,
                disciplinaNome: disciplina.name,
                professorId: professorId,
                professorNome: professor.displayName,
                formularioId: formularioId,
                formularioTitulo: formulario.titulo,
                semestre: formData.get('semestre'),
                statusAvaliacao: formData.get('statusAvaliacao')
            };

            await this.turmasCRUD.updateTurma(turmaId, turmaData);
            alert('Turma atualizada com sucesso!');
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao atualizar turma:', error);
            alert('Erro ao atualizar turma. Tente novamente.');
        }
    }

    async openStudentsModal(turmaId) {
        try {
            const modalContent = await this.modalsManager.createStudentsModal(turmaId);
            this.modalsManager.showModal('Gerenciar Alunos', modalContent);

            // Store the turma ID globally for easy access
            window.currentTurmaId = turmaId;
            window.turmasModalsManager = this.modalsManager;

            // Setup search functionality for bulk add
            document.getElementById('bulkStudentSearch').addEventListener('input', this.handleBulkStudentSearch);
            
            // Setup search functionality for individual add
            document.getElementById('individualStudentSearch').addEventListener('input', this.renderer.filterStudents);

            // Setup bulk selection event listeners
            this.studentsManager.setupCheckboxEventListeners();

            // Setup bulk add button
            document.getElementById('addSelectedStudents').addEventListener('click', async () => {
                const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
                const studentIds = Array.from(selectedCheckboxes).map(cb => cb.value);
                
                const success = await this.studentsManager.addSelectedStudentsToTurma(turmaId, studentIds);
                if (success) {
                    // Refresh both lists
                    await this.studentsManager.refreshEnrolledStudentsList(turmaId);
                    await this.studentsManager.refreshAvailableStudentsList(turmaId);
                    
                    // Clear selections
                    selectedCheckboxes.forEach(cb => cb.checked = false);
                    document.getElementById('selectedCount').textContent = '0';
                    document.getElementById('addSelectedStudents').disabled = true;
                }
            });

            // Setup remove all students button
            const removeAllBtn = document.getElementById('removeAllStudents');
            if (removeAllBtn) {
                removeAllBtn.addEventListener('click', async () => {
                    if (confirm('Tem certeza que deseja remover TODOS os alunos desta turma?')) {
                        const success = await this.studentsManager.removeAllStudentsFromTurma(turmaId);
                        if (success) {
                            await this.studentsManager.refreshEnrolledStudentsList(turmaId);
                            await this.studentsManager.refreshAvailableStudentsList(turmaId);
                            this.showSuccessMessage('Todos os alunos foram removidos da turma.');
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Erro ao carregar alunos da turma:', error);
            alert('Erro ao carregar alunos da turma.');
        }
    }

    handleBulkStudentSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const studentItems = document.querySelectorAll('.student-checkbox-item');
        const searchResults = document.getElementById('searchResults');
        
        let visibleCount = 0;
        
        studentItems.forEach(item => {
            const searchText = item.dataset.searchText;
            const isVisible = searchText.includes(searchTerm);
            item.style.display = isVisible ? 'block' : 'none';
            if (isVisible) visibleCount++;
        });
        
        if (searchResults) {
            searchResults.textContent = `Mostrando ${visibleCount} aluno${visibleCount !== 1 ? 's' : ''} ${searchTerm ? 'encontrado' + (visibleCount !== 1 ? 's' : '') : 'disponíveis'}`;
        }
        
        // Update selected count to only count visible checkboxes
        const visibleSelected = document.querySelectorAll('.student-checkbox-item:not([style*="display: none"]) .student-checkbox:checked');
        const selectedCount = document.getElementById('selectedCount');
        const addSelectedBtn = document.getElementById('addSelectedStudents');
        
        if (selectedCount) selectedCount.textContent = visibleSelected.length;
        if (addSelectedBtn) addSelectedBtn.disabled = visibleSelected.length === 0;
    }

    async openMissingStudentsForm(missingStudentIds) {
        const turmaId = this.studentsManager.getCurrentTurmaId();
        const modalContent = this.modalsManager.createMissingStudentsModal(missingStudentIds, turmaId);
        this.modalsManager.showModal('Usuários Ausentes', modalContent);

        document.getElementById('missingStudentsForm').addEventListener('submit', async (e) => {
            const result = await this.studentsManager.handleMissingStudentsSubmit(e);
            if (result.success) {
                document.getElementById('modal-overlay').style.display = 'none';
                await this.openStudentsModal(result.turmaId);
            }
        });
    }

    async addStudentToTurma(turmaId, type) {
        // Remove the 'new' type handling since we're removing student creation
        if (type === 'existing') {
            const studentId = document.getElementById('existingStudentSelect')?.value;
            if (!studentId) {
                alert('Selecione um aluno existente.');
                return;
            }

            const success = await this.studentsManager.addSelectedStudentsToTurma(turmaId, [studentId]);
            if (success) {
                await this.studentsManager.refreshEnrolledStudentsList(turmaId);
                await this.studentsManager.refreshAvailableStudentsList(turmaId);
                this.showSuccessMessage('Aluno adicionado com sucesso!');
            }
        }
    }

    async removeStudentFromTurma(studentId) {
        const turmaId = window.currentTurmaId;
        const success = await this.studentsManager.removeStudentFromTurma(studentId, turmaId);
        if (success) {
            await this.studentsManager.refreshEnrolledStudentsList(turmaId);
            await this.studentsManager.refreshAvailableStudentsList(turmaId);
            this.showSuccessMessage('Aluno removido com sucesso!');
        }
    }

    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.innerHTML = `
            <span class="material-icons">check_circle</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Global functions for table actions
window.viewTurma = async (id) => {
    try {
        const turmasManager = new TurmasManager();
        const turma = await turmasManager.turmasCRUD.getTurma(id);
        
        const modalContent = turmasManager.modalsManager.createViewModal(turma);
        turmasManager.modalsManager.showModal('Detalhes da Turma', modalContent);
    } catch (error) {
        console.error('Erro ao carregar turma:', error);
        alert('Erro ao carregar detalhes da turma.');
    }
};

window.editTurma = async (id) => {
    const turmasManager = new TurmasManager();
    await turmasManager.openEditModal(id);
};

window.manageStudents = async (id) => {
    const turmasManager = new TurmasManager();
    await turmasManager.openStudentsModal(id);
};

window.addStudentToTurma = async (turmaId, type) => {
    const turmasManager = new TurmasManager();
    await turmasManager.addStudentToTurma(turmaId, type);
};

window.removeStudentFromTurma = async (studentId) => {
    const turmasManager = new TurmasManager();
    await turmasManager.removeStudentFromTurma(studentId);
};

window.deleteTurma = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta turma?\n\nEsta ação não pode ser desfeita e pode afetar avaliações existentes.')) {
        try {
            const turmasManager = new TurmasManager();
            await turmasManager.turmasCRUD.deleteTurma(id);
            alert('Turma excluída com sucesso!');
            location.reload();
        } catch (error) {
            console.error('Erro ao excluir turma:', error);
            alert('Erro ao excluir turma. Tente novamente.');
        }
    }
};

window.addSingleStudent = async (studentId) => {
    const turmaId = window.currentTurmaId;
    const turmasManager = new TurmasManager();
    await turmasManager.addStudentToTurma(turmaId, 'existing');
    
    // Manually trigger the addition since we removed the form
    const success = await turmasManager.studentsManager.addSelectedStudentsToTurma(turmaId, [studentId]);
    if (success) {
        await turmasManager.studentsManager.refreshEnrolledStudentsList(turmaId);
        await turmasManager.studentsManager.refreshAvailableStudentsList(turmaId);
        turmasManager.showSuccessMessage('Aluno adicionado com sucesso!');
    }
};

window.cleanupMissingStudents = async () => {
    const turmaId = window.currentTurmaId;
    if (confirm('Tem certeza que deseja remover os IDs inválidos da turma?')) {
        try {
            const turmasManager = new TurmasManager();
            const turma = await turmasManager.turmasCRUD.getTurma(turmaId);
            const allUsers = await turmasManager.turmasCRUD.getAllUsers();
            const validUserIds = allUsers.map(u => u.id);
            
            const validStudents = (turma.alunosInscritos || []).filter(id => validUserIds.includes(id));
            
            await turmasManager.turmasCRUD.updateTurma(turmaId, { alunosInscritos: validStudents });
            
            await turmasManager.studentsManager.refreshEnrolledStudentsList(turmaId);
            turmasManager.showSuccessMessage('IDs inválidos removidos com sucesso!');
        } catch (error) {
            console.error('Erro ao limpar IDs inválidos:', error);
            alert('Erro ao limpar IDs inválidos.');
        }
    }
};