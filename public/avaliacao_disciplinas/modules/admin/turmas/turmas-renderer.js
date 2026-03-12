export class TurmasRenderer {
    constructor() {
        this.turmasData = []; // Cache para filtro rápido
    }

    renderTurmas(turmas) {
        // Atualiza o cache se vierem dados novos, senão usa o cache atual
        if (turmas) this.turmasData = turmas;

        const tbody = document.querySelector('#turmas-table tbody');
        if (!tbody) return;

        const semestreFilter = document.getElementById('turmasSemestreFilter')?.value || '';
        const statusFilter = document.getElementById('turmasStatusFilter')?.value || '';
        const searchFilter = document.getElementById('turmasSearchFilter')?.value.toLowerCase() || '';

        // Filtra os dados na memória de forma segura
        const filteredData = this.turmasData.filter(turma => {
            const disciplina = (turma.disciplinaNome || '').toLowerCase();
            const professor = (turma.professorNome || '').toLowerCase();
            
            const matchesSemestre = !semestreFilter || turma.semestre === semestreFilter;
            const matchesStatus = !statusFilter || turma.statusAvaliacao === statusFilter;
            const matchesSearch = !searchFilter || disciplina.includes(searchFilter) || professor.includes(searchFilter);
            
            return matchesSemestre && matchesStatus && matchesSearch;
        });

        tbody.innerHTML = '';

        if (filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
                            <span class="material-icons" style="font-size: 48px; color: var(--border-color);">school</span>
                            <p style="margin-top: 8px;">Nenhuma turma encontrada para estes filtros.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const statusMap = {
            'planejada': { class: 'status-pending', label: 'Planeada' },
            'aberta': { class: 'status-active', label: 'Aberta' },
            'fechada': { class: 'status-inactive', label: 'Fechada' }
        };

        filteredData.forEach(turma => {
            const status = statusMap[turma.statusAvaliacao] || { class: '', label: turma.statusAvaliacao || 'S/ Status' };
            
            // PREVENÇÃO DE ERROS (Crash Preventers)
            const profNome = turma.professorNome || 'Sem Professor';
            const discNome = turma.disciplinaNome || 'Sem Disciplina';
            const profInicial = profNome.charAt(0).toUpperCase();
            
            // CÁLCULO EXATO DE ALUNOS ATIVOS (Inscritos - Desmatriculados)
            const totalInscritos = turma.alunosInscritos?.length || 0;
            const totalDesmatriculados = turma.alunosDesmatriculados?.length || 0;
            const alunosAtivos = totalInscritos - totalDesmatriculados;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${discNome}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="avatar-wrapper initials" style="width: 24px; height: 24px; font-size: 10px;">${profInicial}</div>
                        ${profNome}
                    </div>
                </td>
                <td><span class="badge-modern">${turma.semestre || 'S/ Semestre'}</span></td>
                <td><span class="status-badge ${status.class}">${status.label}</span></td>
                <td style="color: var(--text-secondary); font-size: 13px;">${turma.formularioTitulo || 'Não definido'}</td>
                <td>
                    <span class="badge-modern" style="background: #f1f5f9; color: var(--text-primary);" title="${totalDesmatriculados} desmatriculados">
                        <span class="material-icons" style="font-size: 14px; margin-right: 4px;">groups</span>
                        ${alunosAtivos}
                    </span>
                </td>
                <td class="text-right">
                    <button class="action-btn view" data-action="view" data-id="${turma.id}" title="Ver Detalhes"><span class="material-icons">visibility</span></button>
                    <button class="action-btn edit" data-action="edit" data-id="${turma.id}" title="Editar Turma"><span class="material-icons">edit</span></button>
                    <button class="action-btn questions" data-action="students" data-id="${turma.id}" title="Gerir Alunos"><span class="material-icons">person_add</span></button>
                    <button class="action-btn delete" data-action="delete" data-id="${turma.id}" title="Excluir Turma"><span class="material-icons">delete_outline</span></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterStudents() {
        const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase();
        const select = document.getElementById('existingStudentSelect');
        if(!select) return;
        
        for (let i = 1; i < select.options.length; i++) {
            const option = select.options[i];
            const text = option.text.toLowerCase();
            option.style.display = text.includes(searchTerm) ? '' : 'none';
        }
    }
}