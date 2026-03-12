export class TurmasStudents {
    constructor(turmasCRUD) {
        this.turmasCRUD = turmasCRUD;
    }

    async renderEnrolledStudents(turmaData, preloadedUsers = null) {
        const isArray = Array.isArray(turmaData);
        const alunosInscritos = isArray ? turmaData : (turmaData.alunosInscritos || []);
        const alunosDesmatriculados = isArray ? [] : (turmaData.alunosDesmatriculados || []);

        if (alunosInscritos.length === 0) {
            return `
                <div class="empty-state" style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">
                    <span class="material-icons" style="font-size:40px; color:var(--border-color);">person_outline</span>
                    <p style="margin-top:12px;">A turma está vazia.<br>Selecione alunos na lista ao lado.</p>
                </div>
            `;
        }

        const studentsData = [];
        const missingStudents = [];

        for (const alunoId of alunosInscritos) {
            // ========================================================
            // A CORREÇÃO: Ignorar IDs nulos, indefinidos ou vazios
            // ========================================================
            if (!alunoId || typeof alunoId !== 'string') continue; 

            try {
                let student = preloadedUsers ? preloadedUsers.find(u => u.id === alunoId) : null;
                if (!student) student = await this.turmasCRUD.getUser(alunoId);

                if (student) studentsData.push(student);
                else missingStudents.push(alunoId);
            } catch (error) {
                console.warn(`Erro isolado ao buscar aluno ${alunoId}:`, error);
                missingStudents.push(alunoId);
            }
        }

        let html = '';

        if (missingStudents.length > 0) {
            html += `
                <div class="alert-box warning">
                    <div class="alert-icon"><span class="material-icons">warning</span></div>
                    <div class="alert-content">
                        <strong>${missingStudents.length} conta(s) com anomalia.</strong>
                        <p>Estes alunos foram excluídos da base de dados ou contêm IDs inválidos.</p>
                        <button id="btnCleanMissing" class="btn-cancel" style="font-size:12px; padding: 6px 12px; margin-top: 8px;">Limpar Falhas</button>
                    </div>
                </div>
            `;
        }

        let ativosHtml = '';
        let inativosHtml = '';

        studentsData.forEach(student => {
            const isDesmatriculado = alunosDesmatriculados.includes(student.id);
            const initial = (student.displayName || student.email || 'U').charAt(0).toUpperCase();
            
            const cardHtml = `
                <div class="sm-item ${isDesmatriculado ? 'desmatriculado-card' : ''}">
                    <div class="sm-item-info" ${isDesmatriculado ? 'style="opacity: 0.6;"' : ''}>
                        <div class="avatar-wrapper" style="width: 32px; height: 32px; font-size: 14px; ${isDesmatriculado ? 'filter: grayscale(1);' : ''}">${student.photoURL ? `<img src="${student.photoURL}">` : initial}</div>
                        <div class="sm-item-text">
                            <strong>
                                ${student.displayName || 'S/ Nome'} 
                                ${isDesmatriculado ? '<span class="badge-modern status-inactive" style="font-size:10px; padding:2px 6px; margin-left:4px;">Desmatriculado</span>' : ''}
                            </strong>
                            <small>${student.email}</small>
                        </div>
                    </div>
                    ${isDesmatriculado 
                        ? `<button class="action-btn success btn-restore-single" data-id="${student.id}" title="Restaurar Matrícula"><span class="material-icons">settings_backup_restore</span></button>`
                        : `<button class="action-btn delete btn-remove-single" data-id="${student.id}" title="Desmatricular Aluno"><span class="material-icons">person_off</span></button>`
                    }
                </div>
            `;

            if (isDesmatriculado) inativosHtml += cardHtml;
            else ativosHtml += cardHtml;
        });

        html += ativosHtml;
        if (inativosHtml) {
            html += `<div style="margin: 16px 0 8px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: var(--text-menu);">Histórico / Desmatriculados</div>`;
            html += inativosHtml;
        }

        return html;
    }

    async addSelectedStudentsToTurma(turmaId, studentIds) {
        if (!studentIds || studentIds.length === 0) return false;
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            let alunosInscritos = turma.alunosInscritos || [];
            
            const newStudents = studentIds.filter(id => !alunosInscritos.includes(id));
            if (newStudents.length === 0) return false;

            alunosInscritos = [...alunosInscritos, ...newStudents];
            await this.turmasCRUD.updateTurma(turmaId, { alunosInscritos });
            return true;
        } catch (error) {
            console.error(error); return false;
        }
    }

    // SOFT DELETE: Adiciona à lista de desmatriculados (não apaga do array principal)
    async removeStudentFromTurma(studentId, turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            let alunosDesmatriculados = turma.alunosDesmatriculados || [];
            
            if (!alunosDesmatriculados.includes(studentId)) {
                alunosDesmatriculados.push(studentId);
                await this.turmasCRUD.updateTurma(turmaId, { alunosDesmatriculados });
            }
            return true;
        } catch (error) {
            console.error(error); return false;
        }
    }

    // RESTORE: Remove da lista de desmatriculados
    async restoreStudentToTurma(studentId, turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            let alunosDesmatriculados = turma.alunosDesmatriculados || [];
            
            alunosDesmatriculados = alunosDesmatriculados.filter(id => id !== studentId);
            await this.turmasCRUD.updateTurma(turmaId, { alunosDesmatriculados });
            return true;
        } catch (error) {
            console.error(error); return false;
        }
    }

    // DESMATRICULAR TODOS
    async removeAllStudentsFromTurma(turmaId) {
        try {
            const turma = await this.turmasCRUD.getTurma(turmaId);
            const alunosInscritos = turma.alunosInscritos || [];
            await this.turmasCRUD.updateTurma(turmaId, { alunosDesmatriculados: [...alunosInscritos] });
            return true;
        } catch (error) {
            console.error(error); return false;
        }
    }

    async refreshEnrolledStudentsList(turmaId) {
        const turma = await this.turmasCRUD.getTurma(turmaId);
        const enrolledList = document.getElementById('enrolledStudentsList');
        const countEl = document.getElementById('enrolledCount');
        
        if (enrolledList) enrolledList.innerHTML = await this.renderEnrolledStudents(turma);
        
        // Atualiza a contagem visual para mostrar apenas os alunos ativos
        const ativos = (turma.alunosInscritos || []).length - (turma.alunosDesmatriculados || []).length;
        if (countEl) countEl.textContent = ativos;
    }

    async refreshAvailableStudentsList(turmaId) {
        const [turma, allUsers] = await Promise.all([this.turmasCRUD.getTurma(turmaId), this.turmasCRUD.getAllUsers()]);
        const students = allUsers.filter(user => user.tipos?.includes('aluno'));
        
        const grid = document.getElementById('studentsGrid');
        if (grid && window.turmasModalsManager) {
            grid.innerHTML = window.turmasModalsManager.renderStudentCheckboxList(students, turma.alunosInscritos || []);
        }
    }
}