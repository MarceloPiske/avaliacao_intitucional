export class AnalyticsTabsRenderers {
    renderStudentsGrid(container, studentAnalytics, detailViewMode) {
        const sortedStudents = studentAnalytics
            .filter(student => student.totalRespostas > 0)
            .sort((a, b) => b.mediaGeral - a.mediaGeral);

        container.innerHTML = `
            <div class="view-controls">
                <div class="view-mode-selector">
                    <button class="view-mode-btn ${detailViewMode === 'grid' ? 'active' : ''}" data-mode="grid">
                        <span class="material-icons">grid_view</span> Grade
                    </button>
                    <button class="view-mode-btn ${detailViewMode === 'detailed' ? 'active' : ''}" data-mode="detailed">
                        <span class="material-icons">view_list</span> Detalhado
                    </button>
                </div>
            </div>
            <div class="students-grid">
                ${sortedStudents.map((student, index) => `
                    <div class="student-analytics-card">
                        <div class="student-avatar">
                            ${String.fromCharCode(65 + (index % 26))}
                        </div>
                        <div class="student-info">
                            <h4>Aluno ${String.fromCharCode(65 + (index % 26))}</h4>
                            <p>ID: ***${student.alunoId.slice(-4)}</p>
                        </div>
                        <div class="student-metrics">
                            <div class="metric">
                                <div class="metric-value">${student.mediaGeral.toFixed(2)}</div>
                                <div class="metric-label">Média Geral</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${student.totalRespostas}</div>
                                <div class="metric-label">Respostas</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${student.disciplinas.length}</div>
                                <div class="metric-label">Disciplinas</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${student.avaliacoes.length}</div>
                                <div class="metric-label">Avaliações</div>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(student.mediaGeral / 5) * 100}%"></div>
                        </div>
                        <div class="student-tags">
                            ${student.semestres.map(sem => `<span class="tag">${sem}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderStudentsDetailed(container, studentAnalytics, filteredData, detailViewMode) {
        container.innerHTML = `
            <div class="view-controls">
                <div class="view-mode-selector">
                    <button class="view-mode-btn ${detailViewMode === 'grid' ? 'active' : ''}" data-mode="grid">
                        <span class="material-icons">grid_view</span> Grade
                    </button>
                    <button class="view-mode-btn ${detailViewMode === 'detailed' ? 'active' : ''}" data-mode="detailed">
                        <span class="material-icons">view_list</span> Detalhado
                    </button>
                </div>
            </div>
            <div class="detailed-students-list">
                ${studentAnalytics.map((student, index) => `
                    <div class="detailed-student-item">
                        <div class="student-header">
                            <div class="student-avatar">${String.fromCharCode(65 + (index % 26))}</div>
                            <div class="student-basic-info">
                                <h4>Aluno ${String.fromCharCode(65 + (index % 26))}</h4>
                                <p>ID: ***${student.alunoId.slice(-4)}</p>
                                <div class="quick-stats">
                                    <span>Média: ${student.mediaGeral.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>${student.totalRespostas} respostas</span>
                                    <span>•</span>
                                    <span>${student.disciplinas.length} disciplinas</span>
                                </div>
                            </div>
                            <button class="expand-btn" onclick="toggleStudentExpand(this, '${student.alunoId}')">
                                <span class="material-icons">expand_more</span>
                            </button>
                        </div>
                        <div class="student-expanded-content" style="display: none;">
                            <div class="expanded-metrics">
                                <div class="metric-group">
                                    <h5>Disciplinas Avaliadas</h5>
                                    <div class="discipline-list">
                                        ${student.disciplinas.map(disc => `<span class="discipline-tag">${disc}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="metric-group">
                                    <h5>Professores Avaliados</h5>
                                    <div class="professor-list">
                                        ${student.professores.map(prof => `<span class="professor-tag">${prof}</span>`).join('')}
                                    </div>
                                </div>
                                ${student.comentarios.length > 0 ? `
                                    <div class="metric-group">
                                        <h5>Comentários (${student.comentarios.length})</h5>
                                        <div class="comments-preview">
                                            ${student.comentarios.slice(0, 3).map(c => `
                                                <div class="comment-preview">
                                                    <strong>${c.disciplina}</strong>: ${c.comentario.substring(0, 100)}${c.comentario.length > 100 ? '...' : ''}
                                                </div>
                                            `).join('')}
                                            ${student.comentarios.length > 3 ? `<p>+${student.comentarios.length - 3} comentários</p>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderProfessorsGrid(container, professorAnalytics, detailViewMode) {
        const sortedProfessors = professorAnalytics
            .filter(professor => professor.totalRespostas > 0)
            .sort((a, b) => b.mediaGeral - a.mediaGeral);

        container.innerHTML = `
            <div class="view-controls">
                <div class="view-mode-selector">
                    <button class="view-mode-btn ${detailViewMode === 'grid' ? 'active' : ''}" data-mode="grid">
                        <span class="material-icons">grid_view</span> Grade
                    </button>
                    <button class="view-mode-btn ${detailViewMode === 'detailed' ? 'active' : ''}" data-mode="detailed">
                        <span class="material-icons">view_list</span> Detalhado
                    </button>
                </div>
            </div>
            <div class="professors-grid">
                ${sortedProfessors.map(professor => `
                    <div class="professor-analytics-card" onclick="showProfessorDetail('${professor.professorId}')">
                        <div class="professor-avatar">
                            ${professor.professorNome.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div class="professor-info">
                            <h4>${professor.professorNome}</h4>
                        </div>
                        <div class="professor-metrics">
                            <div class="metric">
                                <div class="metric-value">${professor.mediaGeral.toFixed(2)}</div>
                                <div class="metric-label">Média Geral</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${professor.totalRespostas}</div>
                                <div class="metric-label">Respostas</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${professor.disciplinas.length}</div>
                                <div class="metric-label">Disciplinas</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${professor.alunos.length}</div>
                                <div class="metric-label">Alunos</div>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(professor.mediaGeral / 5) * 100}%"></div>
                        </div>
                        <div class="rating-indicator ${professor.mediaGeral >= 4 ? 'excellent' : professor.mediaGeral >= 3 ? 'good' : 'needs-improvement'}">
                            <span class="material-icons">
                                ${professor.mediaGeral >= 4 ? 'star' : professor.mediaGeral >= 3 ? 'star_half' : 'star_border'}
                            </span>
                            ${professor.mediaGeral >= 4 ? 'Excelente' : professor.mediaGeral >= 3 ? 'Bom' : 'Precisa Melhorar'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderProfessorsDetailed(container, professorAnalytics, filteredData, detailViewMode) {
        container.innerHTML = `
            <div class="view-controls">
                <div class="view-mode-selector">
                    <button class="view-mode-btn ${detailViewMode === 'grid' ? 'active' : ''}" data-mode="grid">
                        <span class="material-icons">grid_view</span> Grade
                    </button>
                    <button class="view-mode-btn ${detailViewMode === 'detailed' ? 'active' : ''}" data-mode="detailed">
                        <span class="material-icons">view_list</span> Detalhado
                    </button>
                </div>
            </div>
            <div class="detailed-professors-list">
                ${professorAnalytics.map(professor => `
                    <div class="detailed-professor-item">
                        <div class="professor-header">
                            <div class="professor-avatar">
                                ${professor.professorNome.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div class="professor-basic-info">
                                <h4>${professor.professorNome}</h4>
                                <div class="quick-stats">
                                    <span>Média: ${professor.mediaGeral.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>${professor.totalRespostas} respostas</span>
                                    <span>•</span>
                                    <span>${professor.disciplinas.length} disciplinas</span>
                                </div>
                            </div>
                            <div class="rating-badge ${professor.mediaGeral >= 4 ? 'excellent' : professor.mediaGeral >= 3 ? 'good' : 'needs-improvement'}">
                                ${professor.mediaGeral.toFixed(1)}
                            </div>
                            <button class="expand-btn" onclick="toggleProfessorExpand(this, '${professor.professorId}')">
                                <span class="material-icons">expand_more</span>
                            </button>
                        </div>
                        <div class="professor-expanded-content" style="display: none;">
                            <div class="expanded-metrics">
                                <div class="category-analysis">
                                    <h5>Avaliação por Categoria</h5>
                                    <div class="category-grid">
                                        ${Object.entries(professor.questoesPorCategoria).map(([categoria, respostas]) => {
                                            if (respostas.length === 0) return '';
                                            const media = respostas.reduce((sum, r) => sum + r.resposta, 0) / respostas.length;
                                            return `
                                                <div class="category-metric">
                                                    <div class="category-name">${categoria === 'disciplina' ? 'Disciplina' : categoria === 'professor' ? 'Professor' : 'Aluno'}</div>
                                                    <div class="category-value">${media.toFixed(2)}</div>
                                                    <div class="category-bar">
                                                        <div class="category-fill" style="width: ${(media / 5) * 100}%"></div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                <div class="metric-group">
                                    <h5>Disciplinas Lecionadas</h5>
                                    <div class="discipline-list">
                                        ${professor.disciplinas.map(disc => `<span class="discipline-tag">${disc}</span>`).join('')}
                                    </div>
                                </div>
                                ${professor.comentarios.length > 0 ? `
                                    <div class="metric-group">
                                        <h5>Feedback dos Alunos (${professor.comentarios.length})</h5>
                                        <div class="comments-preview">
                                            ${professor.comentarios.slice(0, 3).map(c => `
                                                <div class="comment-preview">
                                                    <strong>${c.disciplina}</strong>: ${c.comentario.substring(0, 100)}${c.comentario.length > 100 ? '...' : ''}
                                                </div>
                                            `).join('')}
                                            ${professor.comentarios.length > 3 ? `<p>+${professor.comentarios.length - 3} comentários</p>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDisciplinesGrid(container, disciplineAnalytics, detailViewMode) {
        const sortedDisciplines = disciplineAnalytics
            .filter(discipline => discipline.totalRespostas > 0)
            .sort((a, b) => b.mediaGeral - a.mediaGeral);

        container.innerHTML = `
            <div class="view-controls">
                <div class="view-mode-selector">
                    <button class="view-mode-btn ${detailViewMode === 'grid' ? 'active' : ''}" data-mode="grid">
                        <span class="material-icons">grid_view</span> Grade
                    </button>
                    <button class="view-mode-btn ${detailViewMode === 'detailed' ? 'active' : ''}" data-mode="detailed">
                        <span class="material-icons">view_list</span> Detalhado
                    </button>
                </div>
            </div>
            <div class="disciplines-grid">
                ${sortedDisciplines.map(discipline => `
                    <div class="discipline-analytics-card" onclick="showDisciplineDetail('${discipline.disciplinaId}')">
                        <div class="discipline-header">
                            <div class="discipline-icon">
                                <span class="material-icons">book</span>
                            </div>
                            <div class="discipline-code">${discipline.disciplinaCodigo}</div>
                        </div>
                        <div class="discipline-info">
                            <h4>${discipline.disciplinaNome}</h4>
                        </div>
                        <div class="discipline-metrics">
                            <div class="metric">
                                <div class="metric-value">${discipline.mediaGeral.toFixed(2)}</div>
                                <div class="metric-label">Média Geral</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${discipline.totalRespostas}</div>
                                <div class="metric-label">Respostas</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${discipline.professores.length}</div>
                                <div class="metric-label">Professores</div>
                            </div>
                            <div class="metric">
                                <div class="metric-value">${discipline.alunos.length}</div>
                                <div class="metric-label">Alunos</div>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(discipline.mediaGeral / 5) * 100}%"></div>
                        </div>
                        <div class="professor-comparison">
                            <h6>Por Professor:</h6>
                            <div class="mini-chart">
                                ${Array.from(discipline.mediaPorProfessor.entries()).slice(0, 3).map(([prof, media]) => `
                                    <div class="mini-bar">
                                        <div class="mini-bar-fill" style="height: ${(media / 5) * 100}%" title="${prof}: ${media.toFixed(2)}"></div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDisciplinesDetailed(container, disciplineAnalytics, filteredData, detailViewMode) {
        container.innerHTML = `
            <div class="view-controls">
                <div class="view-mode-selector">
                    <button class="view-mode-btn ${detailViewMode === 'grid' ? 'active' : ''}" data-mode="grid">
                        <span class="material-icons">grid_view</span> Grade
                    </button>
                    <button class="view-mode-btn ${detailViewMode === 'detailed' ? 'active' : ''}" data-mode="detailed">
                        <span class="material-icons">view_list</span> Detalhado
                    </button>
                </div>
            </div>
            <div class="detailed-disciplines-list">
                ${disciplineAnalytics.map(discipline => `
                    <div class="detailed-discipline-item">
                        <div class="discipline-header">
                            <div class="discipline-icon">
                                <span class="material-icons">book</span>
                            </div>
                            <div class="discipline-basic-info">
                                <h4>${discipline.disciplinaNome}</h4>
                                <p>Código: ${discipline.disciplinaCodigo}</p>
                                <div class="quick-stats">
                                    <span>Média: ${discipline.mediaGeral.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>${discipline.totalRespostas} respostas</span>
                                    <span>•</span>
                                    <span>${discipline.professores.length} professores</span>
                                </div>
                            </div>
                            <button class="expand-btn" onclick="toggleDisciplineExpand(this, '${discipline.disciplinaId}')">
                                <span class="material-icons">expand_more</span>
                            </button>
                        </div>
                        <div class="discipline-expanded-content" style="display: none;">
                            <div class="expanded-metrics">
                                <div class="professor-performance">
                                    <h5>Desempenho por Professor</h5>
                                    <div class="professor-performance-list">
                                        ${Array.from(discipline.mediaPorProfessor.entries()).map(([professor, media]) => `
                                            <div class="professor-performance-item">
                                                <div class="professor-name">${professor}</div>
                                                <div class="performance-bar">
                                                    <div class="performance-fill" style="width: ${(media / 5) * 100}%"></div>
                                                </div>
                                                <div class="performance-value">${media.toFixed(2)}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="metric-group">
                                    <h5>Semestres Ofertados</h5>
                                    <div class="semester-list">
                                        ${discipline.semestres.map(sem => `<span class="semester-tag">${sem}</span>`).join('')}
                                    </div>
                                </div>
                                ${discipline.comentarios.length > 0 ? `
                                    <div class="metric-group">
                                        <h5>Feedback dos Alunos (${discipline.comentarios.length})</h5>
                                        <div class="comments-preview">
                                            ${discipline.comentarios.slice(0, 3).map(c => `
                                                <div class="comment-preview">
                                                    <strong>Prof. ${c.professor}</strong>: ${c.comentario.substring(0, 100)}${c.comentario.length > 100 ? '...' : ''}
                                                </div>
                                            `).join('')}
                                            ${discipline.comentarios.length > 3 ? `<p>+${discipline.comentarios.length - 3} comentários</p>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCommentsTab(container, allAvaliacoes, allTurmas) {
        const comments = allAvaliacoes
            .filter(av => av.comentarios && av.comentarios.trim() !== '')
            .map(av => {
                const turma = allTurmas.find(t => t.id === av.turmaId);
                return {
                    comentario: av.comentarios,
                    disciplina: turma ? turma.disciplinaNome : 'N/A',
                    professor: turma ? turma.professorNome : 'N/A',
                    semestre: turma ? turma.semestre : 'N/A',
                    data: av.dataResposta
                };
            });
        
        container.innerHTML = '';
        
        if (comments.length === 0) {
            container.innerHTML = '<div class="no-data-message">Nenhum comentário encontrado</div>';
            return;
        }
        
        comments.forEach(comment => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'comment-item';
            itemDiv.innerHTML = `
                <div class="comment-meta">
                    <span><strong>${comment.disciplina}</strong> - ${comment.professor}</span>
                    <span>${comment.semestre}</span>
                </div>
                <div class="comment-text">${comment.comentario}</div>
            `;
            
            container.appendChild(itemDiv);
        });
    }

    renderQuestionsTab(container, data, groupByQuestion) {
        const questionsData = groupByQuestion(data);
        
        container.innerHTML = '';
        
        Object.entries(questionsData).forEach(([question, responses]) => {
            const numericResponses = responses.filter(r => typeof r.respostaValor === 'number');
            if (numericResponses.length === 0) return;
            
            const average = numericResponses.reduce((sum, r) => sum + r.respostaValor, 0) / numericResponses.length;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'analysis-item';
            itemDiv.innerHTML = `
                <h4>${question}</h4>
                <div class="analysis-metrics">
                    <div class="metric">
                        <div class="metric-value">${average.toFixed(2)}</div>
                        <div class="metric-label">Média</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${numericResponses.length}</div>
                        <div class="metric-label">Respostas</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${responses[0]?.tipo || 'N/A'}</div>
                        <div class="metric-label">Categoria</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(average / 5) * 100}%"></div>
                </div>
            `;
            
            container.appendChild(itemDiv);
        });
    }
}