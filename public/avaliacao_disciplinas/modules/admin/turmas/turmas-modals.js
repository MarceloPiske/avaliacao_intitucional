export class TurmasModals {
    constructor(turmasCRUD, turmasStudents) {
        this.turmasCRUD = turmasCRUD;
        this.turmasStudents = turmasStudents;
    }

    // --- (As funções createAddModal e createEditModal continuam iguais ao que já fizemos, 
    // com um pequeno ajuste na primeira linha para remover o tamanho 'largo' do modal) ---
    async createAddModal() {
        document.querySelector('.modal-container-modern')?.classList.remove('modal-lg');
        const [professores, disciplinas, formularios] = await Promise.all([this.turmasCRUD.getProfessores(), this.turmasCRUD.getDisciplinas(), this.turmasCRUD.getFormularios()]);
        return `
            <form id="turmaForm">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Disciplina Base *</label>
                        <select name="disciplinaId" required>
                            <option value="">Selecione uma disciplina...</option>
                            ${disciplinas.map(d => `<option value="${d.id}">${d.name} (${d.codigo || 'S/C'})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Professor Responsável *</label>
                        <select name="professorId" required>
                            <option value="">Selecione um docente...</option>
                            ${professores.map(p => `<option value="${p.id}">${p.displayName}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Semestre *</label>
                        <select name="semestre" required><option value="">Ex: 2024.1</option>${this.turmasCRUD.generateSemesterOptions()}</select>
                    </div>
                    <div class="form-group">
                        <label>Status da Turma *</label>
                        <select name="statusAvaliacao" required>
                            <option value="planejada">Planeada (A aguardar)</option>
                            <option value="aberta">Aberta (Em avaliação)</option>
                            <option value="fechada">Fechada (Concluída)</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Formulário de Avaliação Vinculado *</label>
                        <select name="formularioId" required>
                            <option value="">Selecione o modelo de questões...</option>
                            ${formularios.filter(f => f.ativo).map(f => `<option value="${f.id}">${f.titulo}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">save</span> Criar Turma</button>
                </div>
            </form>
        `;
    }

    async createEditModal(turmaId) {
        document.querySelector('.modal-container-modern')?.classList.remove('modal-lg');
        const [turma, professores, disciplinas, formularios] = await Promise.all([this.turmasCRUD.getTurma(turmaId), this.turmasCRUD.getProfessores(), this.turmasCRUD.getDisciplinas(), this.turmasCRUD.getFormularios()]);
        const semesterOptions = this.turmasCRUD.generateSemesterOptions().replace(`value="${turma.semestre}"`, `value="${turma.semestre}" selected`);
        return `
            <form id="turmaEditForm" data-turma-id="${turmaId}">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label>Disciplina Base *</label><select name="disciplinaId" required>${disciplinas.map(d => `<option value="${d.id}" ${d.id === turma.disciplinaId ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
                    </div>
                    <div class="form-group full-width">
                        <label>Professor Responsável *</label><select name="professorId" required>${professores.map(p => `<option value="${p.id}" ${p.id === turma.professorId ? 'selected' : ''}>${p.displayName}</option>`).join('')}</select>
                    </div>
                    <div class="form-group"><label>Semestre *</label><select name="semestre" required>${semesterOptions}</select></div>
                    <div class="form-group">
                        <label>Status da Turma *</label>
                        <select name="statusAvaliacao" required>
                            <option value="planejada" ${turma.statusAvaliacao === 'planejada' ? 'selected' : ''}>Planeada</option>
                            <option value="aberta" ${turma.statusAvaliacao === 'aberta' ? 'selected' : ''}>Aberta</option>
                            <option value="fechada" ${turma.statusAvaliacao === 'fechada' ? 'selected' : ''}>Fechada</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Formulário de Avaliação *</label><select name="formularioId" required>${formularios.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === turma.formularioId ? 'selected' : ''}>${f.titulo}</option>`).join('')}</select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="document.getElementById('modal-overlay').style.display='none'">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">sync</span> Guardar Alterações</button>
                </div>
            </form>
        `;
    }

    createViewModal(turma) {
        document.querySelector('.modal-container-modern')?.classList.remove('modal-lg');
        // ... (O código desta função mantém-se exatamente igual ao que fizemos na mensagem anterior)
        return `<div class="turma-details-modern" style="padding: 20px;"><h2>${turma.disciplinaNome}</h2></div>`; // Versão simplificada para manter foco, use a sua completa.
    }

    // ==========================================
    // NOVA INTERFACE: O PAINEL DE ALUNOS DUPLO
    // ==========================================
    async createStudentsModal(turmaId) {
        const [turma, allUsers] = await Promise.all([
            this.turmasCRUD.getTurma(turmaId),
            this.turmasCRUD.getAllUsers()
        ]);

        const students = allUsers.filter(user => user.tipos?.includes('aluno'));
        const enrolledStudentIds = turma.alunosInscritos || [];
        const desmatriculadosIds = turma.alunosDesmatriculados || [];
        
        // CORREÇÃO: Passamos a 'turma' completa, não o array!
        const enrolledHtml = await this.turmasStudents.renderEnrolledStudents(turma, allUsers);
        const availableHtml = this.renderStudentCheckboxList(students, enrolledStudentIds);

        // A contagem mostra apenas os ativos reais
        const activeCount = enrolledStudentIds.length - desmatriculadosIds.length;

        return `
            <div class="students-manager-layout">
                <div class="sm-panel">
                    <div class="sm-header">
                        <h5><span class="material-icons">person_add</span> Base de Alunos</h5>
                        <div class="sm-search">
                            <span class="material-icons">search</span>
                            <input type="text" id="bulkStudentSearch" placeholder="Buscar por nome ou email...">
                        </div>
                    </div>
                    <div class="sm-list" id="studentsGrid">
                        ${availableHtml}
                    </div>
                    <div class="sm-footer">
                        <label class="custom-checkbox" style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" id="selectAllStudents">
                            <span style="font-size:13px; font-weight:600; color:var(--text-secondary);">Selecionar Visíveis</span>
                        </label>
                        <button id="addSelectedStudents" class="btn-primary-modern" disabled>
                            Adicionar (<span id="selectedCount">0</span>)
                        </button>
                    </div>
                </div>

                <div class="sm-panel bg-surface-alt">
                    <div class="sm-header">
                        <h5>
                            <span><span class="material-icons">groups</span> Alunos na Turma (<span id="enrolledCount">${activeCount}</span>)</span>
                        </h5>
                        ${activeCount > 0 ? `<button id="removeAllStudents" class="action-btn warning" title="Desmatricular Todos"><span class="material-icons">group_remove</span> Desmatricular Todos</button>` : ''}
                    </div>
                    <div class="sm-list" id="enrolledStudentsList">
                        ${enrolledHtml}
                    </div>
                </div>
            </div>
        `;
    }

    renderStudentCheckboxList(students, enrolledStudentIds) {
        const availableStudents = students.filter(s => !enrolledStudentIds.includes(s.id));
        
        if (availableStudents.length === 0) {
            return `
                <div class="empty-state" style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">
                    <span class="material-icons" style="font-size:40px; color:var(--success);">check_circle</span>
                    <p style="margin-top:12px;">Todos os alunos da base já estão inscritos nesta turma.</p>
                </div>
            `;
        }
        
        return availableStudents.map(student => {
            const initial = (student.displayName || student.email || 'U').charAt(0).toUpperCase();
            return `
            <div class="sm-item student-checkbox-item" data-search-text="${(student.displayName||'').toLowerCase()} ${(student.email||'').toLowerCase()}">
                <label class="sm-checkbox">
                    <input type="checkbox" class="student-checkbox" value="${student.id}">
                    <span class="checkbox-box"></span>
                </label>
                <div class="sm-item-info">
                    <div class="avatar-wrapper" style="width: 32px; height: 32px; font-size: 14px;">${student.photoURL ? `<img src="${student.photoURL}">` : initial}</div>
                    <div class="sm-item-text">
                        <strong>${student.displayName || 'S/ Nome'}</strong>
                        <small>${student.email}</small>
                    </div>
                </div>
                <button class="action-btn view btn-add-single" data-id="${student.id}" title="Adicionar Aluno" style="background:var(--bg-app);">
                    <span class="material-icons">add</span>
                </button>
            </div>
        `}).join('');
    }

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'flex';
    }
}