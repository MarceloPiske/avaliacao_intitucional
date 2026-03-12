export class TurmasModals {
    constructor(turmasCRUD, turmasStudents) {
        this.turmasCRUD = turmasCRUD;
        this.turmasStudents = turmasStudents;
    }

    async createAddModal() {
        const [professores, disciplinas, formularios] = await Promise.all([
            this.turmasCRUD.getProfessores(),
            this.turmasCRUD.getDisciplinas(),
            this.turmasCRUD.getFormularios()
        ]);

        return `
            <form id="turmaForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="disciplinaId">Disciplina *</label>
                        <select id="disciplinaId" name="disciplinaId" required>
                            <option value="">Selecione uma disciplina</option>
                            ${disciplinas.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="professorId">Professor *</label>
                        <select id="professorId" name="professorId" required>
                            <option value="">Selecione um professor</option>
                            ${professores.map(p => `<option value="${p.id}">${p.displayName}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="semestre">Semestre *</label>
                        <select id="semestre" name="semestre" required>
                            <option value="">Selecione o semestre</option>
                            ${this.turmasCRUD.generateSemesterOptions()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="formularioId">Formulário de Avaliação *</label>
                        <select id="formularioId" name="formularioId" required>
                            <option value="">Selecione um formulário</option>
                            ${formularios.filter(f => f.ativo).map(f => `<option value="${f.id}">${f.titulo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="statusAvaliacao">Status da Avaliação *</label>
                        <select id="statusAvaliacao" name="statusAvaliacao" required>
                            <option value="planejada">Planejada</option>
                            <option value="aberta">Aberta</option>
                            <option value="fechada">Fechada</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Turma</button>
                </div>
            </form>
        `;
    }

    async createEditModal(turmaId) {
        const [turma, professores, disciplinas, formularios] = await Promise.all([
            this.turmasCRUD.getTurma(turmaId),
            this.turmasCRUD.getProfessores(),
            this.turmasCRUD.getDisciplinas(),
            this.turmasCRUD.getFormularios()
        ]);

        const semesterOptions = this.turmasCRUD.generateSemesterOptions().replace(`value="${turma.semestre}"`, `value="${turma.semestre}" selected`);

        return `
            <form id="turmaEditForm" data-turma-id="${turmaId}">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="disciplinaId">Disciplina *</label>
                        <select id="disciplinaId" name="disciplinaId" required>
                            <option value="">Selecione uma disciplina</option>
                            ${disciplinas.map(d => `<option value="${d.id}" ${d.id === turma.disciplinaId ? 'selected' : ''}>${d.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="professorId">Professor *</label>
                        <select id="professorId" name="professorId" required>
                            <option value="">Selecione um professor</option>
                            ${professores.map(p => `<option value="${p.id}" ${p.id === turma.professorId ? 'selected' : ''}>${p.displayName}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="semestre">Semestre *</label>
                        <select id="semestre" name="semestre" required>
                            <option value="">Selecione o semestre</option>
                            ${semesterOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="formularioId">Formulário de Avaliação *</label>
                        <select id="formularioId" name="formularioId" required>
                            <option value="">Selecione um formulário</option>
                            ${formularios.filter(f => f.ativo).map(f => `<option value="${f.id}" ${f.id === turma.formularioId ? 'selected' : ''}>${f.titulo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="statusAvaliacao">Status da Avaliação *</label>
                        <select id="statusAvaliacao" name="statusAvaliacao" required>
                            <option value="planejada" ${turma.statusAvaliacao === 'planejada' ? 'selected' : ''}>Planejada</option>
                            <option value="aberta" ${turma.statusAvaliacao === 'aberta' ? 'selected' : ''}>Aberta</option>
                            <option value="fechada" ${turma.statusAvaliacao === 'fechada' ? 'selected' : ''}>Fechada</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Atualizar Turma</button>
                </div>
            </form>
        `;
    }

    async createStudentsModal(turmaId) {
        // PERFORMANCE: Busca turma e usuários em PARALELO em vez de sequencial
        const [turma, allUsers] = await Promise.all([
            this.turmasCRUD.getTurma(turmaId),
            this.turmasCRUD.getAllUsers()
        ]);

        const students = allUsers.filter(user => user.tipos?.includes('aluno'));
        const enrolledStudentIds = turma.alunosInscritos || [];
        
        // PERFORMANCE: Passamos 'allUsers' para o renderEnrolledStudents para ele não buscar no banco de novo
        const enrolledHtml = await this.turmasStudents.renderEnrolledStudents(enrolledStudentIds, allUsers);

        return `
            <div class="students-management">
                <h4>Gerenciar Alunos - ${turma.disciplinaNome}</h4>
                
                <div class="students-grid-container">
                    <div class="students-grid" id="studentsGrid">
                        ${this.renderStudentCheckboxList(students, enrolledStudentIds)}
                    </div>
                </div>
                </div>
                
                <div class="enrolled-students-section">
                    <div class="section-header">
                        <h5>👥 Alunos Inscritos</h5>
                        <div class="enrolled-stats">
                            <span class="stat-item">
                                <span class="stat-number" id="enrolledCount">${enrolledStudentIds.length}</span>
                                <span class="stat-label">Inscritos</span>
                            </span>
                            ${enrolledStudentIds.length > 0 ? `
                                <button type="button" class="btn btn-danger btn-sm" id="removeAllStudents">
                                    <span class="material-icons">clear_all</span> Remover Todos
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="enrolled-students-container">
                        <div id="enrolledStudentsList">
                            ${enrolledHtml} </div>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <span class="material-icons">close</span> Fechar
                </button>
            </div>
        `;
    }

    renderStudentCheckboxList(students, enrolledStudentIds) {
        const availableStudents = students.filter(s => !enrolledStudentIds.includes(s.id));
        
        if (availableStudents.length === 0) {
            return `
                <div class="no-students-message">
                    <div class="no-students-icon">
                        <span class="material-icons">school</span>
                    </div>
                    <h4>Todos os alunos já estão inscritos</h4>
                    <p>Não há alunos disponíveis para adicionar nesta turma.</p>
                </div>
            `;
        }
        
        return availableStudents.map(student => `
            <div class="student-checkbox-item" data-student-id="${student.id}" data-search-text="${student.displayName.toLowerCase()} ${student.email.toLowerCase()}">
                <label class="student-checkbox-label">
                    <input type="checkbox" class="student-checkbox" value="${student.id}">
                    <div class="student-info-card">
                        <div class="student-avatar">
                            ${student.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div class="student-details">
                            <div class="student-name">${student.displayName}</div>
                            <div class="student-email">${student.email}</div>
                            <div class="student-actions">
                                <button type="button" class="btn btn-xs btn-primary" onclick="addSingleStudent('${student.id}')">
                                    <span class="material-icons">person_add</span>
                                </button>
                            </div>
                        </div>
                        <div class="selection-indicator">
                            <span class="material-icons">check_circle</span>
                        </div>
                    </div>
                </label>
            </div>
        `).join('');
    }

    createMissingStudentsModal(missingStudentIds, turmaId) {
        const ids = JSON.parse(missingStudentIds);
        
        return `
            <div class="missing-students-form">
                <h4>Criar Usuários para Alunos Ausentes</h4>
                <p>Crie os usuários correspondentes aos IDs de autenticação encontrados na turma:</p>
                
                <form id="missingStudentsForm">
                    ${ids.map((id, index) => `
                        <div class="missing-student-item">
                            <h6>Aluno ${index + 1} - UID: <code>${id}</code></h6>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="displayName_${index}">Nome Completo *</label>
                                    <input type="text" id="displayName_${index}" name="displayName_${index}" required>
                                </div>
                                <div class="form-group">
                                    <label for="email_${index}">Email *</label>
                                    <input type="email" id="email_${index}" name="email_${index}" required>
                                </div>
                            </div>
                            <input type="hidden" name="uid_${index}" value="${id}">
                        </div>
                    `).join('')}
                    
                    <input type="hidden" name="totalStudents" value="${ids.length}">
                    <input type="hidden" name="turmaId" value="${turmaId}">
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Criar ${ids.length} Usuário(s)</button>
                    </div>
                </form>
            </div>
        `;
    }

    createViewModal(turma) {
        return `
            <div class="turma-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Disciplina:</label>
                        <span>${turma.disciplinaNome}</span>
                    </div>
                    <div class="detail-item">
                        <label>Professor:</label>
                        <span>${turma.professorNome}</span>
                    </div>
                    <div class="detail-item">
                        <label>Semestre:</label>
                        <span>${turma.semestre}</span>
                    </div>
                    <div class="detail-item">
                        <label>Formulário:</label>
                        <span>${turma.formularioTitulo || 'Não definido'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge ${turma.statusAvaliacao}">${turma.statusAvaliacao}</span>
                    </div>
                    <div class="detail-item">
                        <label>Alunos Inscritos:</label>
                        <span>${turma.alunosInscritos?.length || 0}</span>
                    </div>
                    <div class="detail-item">
                        <label>Data de Criação:</label>
                        <span>${new Date(turma.dataCriacao.toDate()).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
            </div>
        `;
    }

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').style.display = 'block';
    }
}