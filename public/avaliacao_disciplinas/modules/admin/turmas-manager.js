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
        this.setupDelegatedEvents(); // Nova abordagem limpa
    }

    setupFilters() {
        // Redireciona todos os filtros para chamar o render() que agora usa a memória
        ['turmasSemestreFilter', 'turmasStatusFilter', 'turmasSearchFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(id.includes('Search') ? 'input' : 'change', () => this.renderer.renderTurmas());
        });
    }

    setupDelegatedEvents() {
        const container = document.querySelector('#turmas-section');
        if (!container) return;

        container.addEventListener('click', async (e) => {
            const actionBtn = e.target.closest('.action-btn');
            if (!actionBtn) return;

            const turmaId = actionBtn.dataset.id;
            const action = actionBtn.dataset.action;

            if (action === 'view') await this.viewTurma(turmaId);
            else if (action === 'edit') await this.openEditModal(turmaId);
            else if (action === 'students') await this.openStudentsModal(turmaId);
            else if (action === 'delete') await this.deleteTurma(turmaId);
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

    // --- MÉTODOS DE AÇÃO ---

    async viewTurma(turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            const modalContent = this.modalsManager.createViewModal(turma);
            this.modalsManager.showModal('Detalhes da Turma', modalContent);
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        }
    }

    async deleteTurma(turmaId) {
        if (confirm('Tem certeza que deseja excluir esta turma?\n\nAtenção: Esta ação não pode ser desfeita e pode afetar avaliações existentes.')) {
            try {
                await this.turmasCRUD.deleteTurma(turmaId);
                this.loadData();
            } catch (error) {
                console.error('Erro ao excluir turma:', error);
            }
        }
    }

    async openAddModal() {
        try {
            const modalContent = await this.modalsManager.createAddModal();
            this.modalsManager.showModal('Nova Turma', modalContent);
            document.getElementById('turmaForm').addEventListener('submit', (e) => this.handleTurmaSubmit(e));
        } catch (error) {
            console.error('Erro ao abrir modal:', error);
        }
    }

    async handleTurmaSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const [disciplinas, professores, formularios] = await Promise.all([
                this.turmasCRUD.getDisciplinas(),
                this.turmasCRUD.getProfessores(),
                this.turmasCRUD.getFormularios()
            ]);
            
            const disciplina = disciplinas.find(d => d.id === formData.get('disciplinaId'));
            const professor = professores.find(p => p.id === formData.get('professorId'));
            const formulario = formularios.find(f => f.id === formData.get('formularioId'));
            
            const turmaData = {
                disciplinaId: disciplina.id, disciplinaNome: disciplina.name,
                professorId: professor.id, professorNome: professor.displayName,
                formularioId: formulario.id, formularioTitulo: formulario.titulo,
                semestre: formData.get('semestre'),
                statusAvaliacao: formData.get('statusAvaliacao'),
                alunosInscritos: [],
                dataCriacao: new Date()
            };

            await this.turmasCRUD.createTurma(turmaData);
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao criar turma:', error);
        }
    }

    async openEditModal(turmaId) {
        try {
            const modalContent = await this.modalsManager.createEditModal(turmaId);
            this.modalsManager.showModal('Configurar Turma', modalContent);
            document.getElementById('turmaEditForm').addEventListener('submit', (e) => this.handleTurmaEditSubmit(e));
        } catch (error) {
            console.error('Erro ao carregar turma:', error);
        }
    }

    async handleTurmaEditSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const turmaId = e.target.dataset.turmaId;
        
        try {
            const [disciplinas, professores, formularios] = await Promise.all([
                this.turmasCRUD.getDisciplinas(),
                this.turmasCRUD.getProfessores(),
                this.turmasCRUD.getFormularios()
            ]);
            
            const disciplina = disciplinas.find(d => d.id === formData.get('disciplinaId'));
            const professor = professores.find(p => p.id === formData.get('professorId'));
            const formulario = formularios.find(f => f.id === formData.get('formularioId'));
            
            const turmaData = {
                disciplinaId: disciplina.id, disciplinaNome: disciplina.name,
                professorId: professor.id, professorNome: professor.displayName,
                formularioId: formulario.id, formularioTitulo: formulario.titulo,
                semestre: formData.get('semestre'),
                statusAvaliacao: formData.get('statusAvaliacao')
            };

            await this.turmasCRUD.updateTurma(turmaId, turmaData);
            document.getElementById('modal-overlay').style.display = 'none';
            this.loadData();
        } catch (error) {
            console.error('Erro ao atualizar turma:', error);
        }
    }
 
    async openStudentsModal(turmaId) {
        // 1. Alarga o modal visualmente para caber as duas colunas
        const modalContainer = document.querySelector('.modal-container-modern');
        if (modalContainer) modalContainer.classList.add('modal-lg');

        try {
            const loadingContent = `
                <div style="padding: 40px; text-align: center;">
                    <div class="loading-pulse" style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px;"></div>
                    <p style="color: var(--text-secondary); font-weight: 500;">A carregar base de alunos...</p>
                </div>
            `;
            this.modalsManager.showModal('Matrículas da Turma', loadingContent);

            // 2. Processa o HTML pesado
            const modalContent = await this.modalsManager.createStudentsModal(turmaId);
            const modalBody = document.getElementById('modal-body');
            modalBody.innerHTML = modalContent;

            window.turmasModalsManager = this.modalsManager; // Necessário para refrescar as listas

            const layout = modalBody.querySelector('.students-manager-layout');
            if (!layout) return;

            // 3. EVENT DELEGATION DO MODAL
            // A. Busca Dinâmica (Search)
            const bulkSearch = document.getElementById('bulkStudentSearch');
            if (bulkSearch) {
                bulkSearch.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    layout.querySelectorAll('.student-checkbox-item').forEach(item => {
                        const isVisible = item.dataset.searchText.includes(searchTerm);
                        item.style.display = isVisible ? 'flex' : 'none';
                    });
                });
            }

            // B. Lógica de Checkboxes
            const updateCount = () => {
                const count = layout.querySelectorAll('.student-checkbox:checked').length;
                const countEl = document.getElementById('selectedCount');
                const addBtn = document.getElementById('addSelectedStudents');
                if (countEl) countEl.textContent = count;
                if (addBtn) addBtn.disabled = count === 0;
            };

            layout.addEventListener('change', (e) => {
                if (e.target.classList.contains('student-checkbox')) {
                    updateCount();
                } else if (e.target.id === 'selectAllStudents') {
                    const visibleCheckboxes = layout.querySelectorAll('.student-checkbox-item:not([style*="display: none"]) .student-checkbox');
                    visibleCheckboxes.forEach(cb => cb.checked = e.target.checked);
                    updateCount();
                }
            });

            // C. Lógica de Botões de Ação (Clique)
            layout.addEventListener('click', async (e) => {
                // Adicionar 1 Único Aluno
                const btnAddSingle = e.target.closest('.btn-add-single');
                if (btnAddSingle) {
                    await this.studentsManager.addSelectedStudentsToTurma(turmaId, [btnAddSingle.dataset.id]);
                    await this.refreshModalData(turmaId);
                    return;
                }

                // Remover 1 Único Aluno
                const btnRemoveSingle = e.target.closest('.btn-remove-single');
                if (btnRemoveSingle) {
                    await this.studentsManager.removeStudentFromTurma(btnRemoveSingle.dataset.id, turmaId);
                    await this.refreshModalData(turmaId);
                    return;
                }

                // ===================================
                // NOVO: Restaurar 1 Único Aluno
                // ===================================
                const btnRestoreSingle = e.target.closest('.btn-restore-single');
                if (btnRestoreSingle) {
                    await this.studentsManager.restoreStudentToTurma(btnRestoreSingle.dataset.id, turmaId);
                    await this.refreshModalData(turmaId);
                    return;
                }

                // Adicionar Lote
                const btnBulkAdd = e.target.closest('#addSelectedStudents');
                if (btnBulkAdd && !btnBulkAdd.disabled) {
                    const selected = Array.from(layout.querySelectorAll('.student-checkbox:checked')).map(cb => cb.value);
                    await this.studentsManager.addSelectedStudentsToTurma(turmaId, selected);
                    await this.refreshModalData(turmaId);
                    return;
                }

                // Remover Lote (Esvaziar)
                const btnRemoveAll = e.target.closest('#removeAllStudents');
                if (btnRemoveAll) {
                    if (confirm('Tem a certeza que deseja esvaziar esta turma?')) {
                        await this.studentsManager.removeAllStudentsFromTurma(turmaId);
                        await this.refreshModalData(turmaId);
                    }
                    return;
                }

                // Limpar Erros (Fantasmas)
                const btnCleanMissing = e.target.closest('#btnCleanMissing');
                if (btnCleanMissing) {
                    await this.cleanupMissingStudents(turmaId);
                    return;
                }
            });

        } catch (error) {
            document.getElementById('modal-body').innerHTML = `<p class="text-danger" style="text-align:center; padding:20px;">Erro fatal ao carregar dados.</p>`;
        }
    }

    // ==========================================
    // FUNÇÕES AUXILIARES DA AÇÃO DO MODAL
    // ==========================================
    async refreshModalData(turmaId) {
        // Recarrega as duas colunas do modal e limpa os checkboxes
        await this.studentsManager.refreshEnrolledStudentsList(turmaId);
        await this.studentsManager.refreshAvailableStudentsList(turmaId);
        
        // CORREÇÃO: Puxa do banco os dados frescos para a tabela de trás atualizar o número de alunos!
        const turmasFrescas = await this.turmasCRUD.loadData();
        this.renderer.renderTurmas(turmasFrescas); 
        
        // Reset da UI
        const countEl = document.getElementById('selectedCount');
        const addBtn = document.getElementById('addSelectedStudents');
        const selectAll = document.getElementById('selectAllStudents');
        if(countEl) countEl.textContent = '0';
        if(addBtn) addBtn.disabled = true;
        if(selectAll) selectAll.checked = false;
    }

    async cleanupMissingStudents(turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            const allUsers = await this.turmasCRUD.getAllUsers();
            const validUserIds = allUsers.map(u => u.id);
            
            const validStudents = (turma.alunosInscritos || []).filter(id => validUserIds.includes(id));
            const validDesmatriculados = (turma.alunosDesmatriculados || []).filter(id => validUserIds.includes(id));
            
            await this.turmasCRUD.updateTurma(turmaId, { 
                alunosInscritos: validStudents,
                alunosDesmatriculados: validDesmatriculados 
            });
            await this.refreshModalData(turmaId);
        } catch (e) {
            console.error(e);
        }
    }

    handleBulkStudentSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.student-checkbox-item').forEach(item => {
            const isVisible = item.dataset.searchText.includes(searchTerm);
            item.style.display = isVisible ? 'block' : 'none';
        });
    }

    // Mantivemos estas funções para não quebrar o HTML existente dos alunos (Parte 2 resolve isto)
    showSuccessMessage(message) { alert(message); }
}
