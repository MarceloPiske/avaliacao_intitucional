export class TurmasRenderer {
    renderTurmas(turmas) {
        const tbody = document.querySelector('#turmas-table tbody');
        tbody.innerHTML = '';

        turmas.forEach(turma => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${turma.disciplinaNome}</td>
                <td>${turma.professorNome}</td>
                <td>${turma.semestre}</td>
                <td><span class="status-badge ${turma.statusAvaliacao}">${turma.statusAvaliacao}</span></td>
                <td>${turma.formularioTitulo || 'Não definido'}</td>
                <td>${turma.alunosInscritos?.length || 0}</td>
                <td>
                    <button class="action-btn view" onclick="viewTurma('${turma.id}')">Ver</button>
                    <button class="action-btn edit" onclick="editTurma('${turma.id}')">Editar</button>
                    <button class="action-btn questions" onclick="manageStudents('${turma.id}')">Alunos</button>
                    <button class="action-btn delete" onclick="deleteTurma('${turma.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterTurmas() {
        const semestreFilter = document.getElementById('turmasSemestreFilter').value;
        const statusFilter = document.getElementById('turmasStatusFilter').value;
        const searchFilter = document.getElementById('turmasSearchFilter').value.toLowerCase();
        
        const rows = document.querySelectorAll('#turmas-table tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const disciplina = cells[0].textContent.toLowerCase();
            const professor = cells[1].textContent.toLowerCase();
            const semestre = cells[2].textContent;
            const status = cells[3].textContent.toLowerCase();
            
            const matchesSemestre = !semestreFilter || semestre === semestreFilter;
            const matchesStatus = !statusFilter || status.includes(statusFilter);
            const matchesSearch = !searchFilter || 
                disciplina.includes(searchFilter) || 
                professor.includes(searchFilter);
            
            row.style.display = matchesSemestre && matchesStatus && matchesSearch ? '' : 'none';
        });
    }

    filterStudents() {
        const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
        const select = document.getElementById('existingStudentSelect');
        
        for (let i = 1; i < select.options.length; i++) {
            const option = select.options[i];
            const text = option.text.toLowerCase();
            option.style.display = text.includes(searchTerm) ? '' : 'none';
        }
    }
}