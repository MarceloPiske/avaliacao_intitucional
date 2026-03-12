export class AnalyticsTabsRenderers {
    
    // ==========================================
    // 1. RENDERIZADOR DE PROFESSORES
    // ==========================================
    renderProfessorsDetailed(container, professorAnalytics, filteredData, detailViewMode, limit = 20) {
        const sorted = [...professorAnalytics].sort((a, b) => b.mediaGeral - a.mediaGeral);
        const displayed = sorted.slice(0, limit);
        const hasMore = sorted.length > limit;

        let html = `
            <div class="tab-header-modern">
                <div class="tab-title-group">
                    <span class="material-icons">person</span>
                    <div>
                        <h3>Desempenho dos Professores</h3>
                        <p>Ranking e detalhamento das avaliações por docente</p>
                    </div>
                </div>
                <button class="btn-primary-modern export-tab-btn" data-export="professors">
                    <span class="material-icons">download</span> Exportar Aba
                </button>
            </div>
            <div class="items-list-modern">
        `;

        displayed.forEach((prof, index) => {
            const percentage = (prof.mediaGeral / 5) * 100;
            const colorClass = prof.mediaGeral >= 4 ? 'bg-success' : (prof.mediaGeral >= 3 ? 'bg-warning' : 'bg-danger');

            html += `
                <div class="modern-data-card detailed-professor-item">
                    <div class="card-main-row">
                        <div class="rank-badge">#${index + 1}</div>
                        <div class="main-info">
                            <h4>${prof.professorNome}</h4>
                            <div class="tags-row">
                                <span class="badge-modern"><span class="material-icons" style="font-size:12px; margin-right:4px;">book</span>${prof.disciplinas.length} Disciplinas</span>
                                <span class="badge-modern"><span class="material-icons" style="font-size:12px; margin-right:4px;">forum</span>${prof.totalRespostas} Respostas</span>
                            </div>
                        </div>
                        <div class="score-display">
                            <span class="score-value">${prof.mediaGeral.toFixed(2)}</span>
                            <span class="score-max">/ 5.00</span>
                        </div>
                        <button class="btn-icon-modern expand-btn">
                            <span class="material-icons">expand_more</span>
                        </button>
                    </div>
                    <div class="progress-track"><div class="progress-fill ${colorClass}" style="width: ${percentage}%"></div></div>
                    
                    <div class="professor-expanded-content expanded-panel" style="display: none;">
                        <div class="panel-grid">
                            <div class="panel-col">
                                <h5>Disciplinas Lecionadas</h5>
                                <div class="chip-group">${prof.disciplinas.map(d => `<span class="chip">${d}</span>`).join('')}</div>
                            </div>
                            <div class="panel-col">
                                <h5>Feedback Recente (${prof.comentarios.length})</h5>
                                <ul class="comment-list">
                                    ${prof.comentarios.slice(0,3).map(c => `<li><strong>${c.disciplina}:</strong> "${c.comentario}"</li>`).join('')}
                                    ${prof.comentarios.length === 0 ? '<li class="text-muted">Sem comentários registados.</li>' : ''}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        if (hasMore) html += this.getLoadMoreButton('professors', limit, sorted.length);
        container.innerHTML = html;
    }

    // ==========================================
    // 2. RENDERIZADOR DE DISCIPLINAS
    // ==========================================
    renderDisciplinesDetailed(container, disciplineAnalytics, filteredData, detailViewMode, limit = 20) {
        const sorted = [...disciplineAnalytics].sort((a, b) => b.mediaGeral - a.mediaGeral);
        const displayed = sorted.slice(0, limit);
        const hasMore = sorted.length > limit;

        let html = `
            <div class="tab-header-modern">
                <div class="tab-title-group">
                    <span class="material-icons">class</span>
                    <div>
                        <h3>Análise de Disciplinas</h3>
                        <p>Ranking das disciplinas mais bem avaliadas</p>
                    </div>
                </div>
                <button class="btn-primary-modern export-tab-btn" data-export="disciplines">
                    <span class="material-icons">download</span> Exportar Aba
                </button>
            </div>
            <div class="items-list-modern">
        `;

        displayed.forEach((disc, index) => {
            const percentage = (disc.mediaGeral / 5) * 100;
            const colorClass = disc.mediaGeral >= 4 ? 'bg-success' : (disc.mediaGeral >= 3 ? 'bg-warning' : 'bg-danger');

            html += `
                <div class="modern-data-card detailed-discipline-item">
                    <div class="card-main-row">
                        <div class="rank-badge">#${index + 1}</div>
                        <div class="main-info">
                            <h4>${disc.disciplinaNome} <small class="text-muted">(${disc.disciplinaCodigo || 'S/C'})</small></h4>
                            <div class="tags-row">
                                <span class="badge-modern"><span class="material-icons" style="font-size:12px; margin-right:4px;">person</span>${disc.professores.length} Professores</span>
                                <span class="badge-modern"><span class="material-icons" style="font-size:12px; margin-right:4px;">groups</span>${disc.alunos.length} Alunos</span>
                            </div>
                        </div>
                        <div class="score-display">
                            <span class="score-value">${disc.mediaGeral.toFixed(2)}</span>
                            <span class="score-max">/ 5.00</span>
                        </div>
                        <button class="btn-icon-modern expand-btn">
                            <span class="material-icons">expand_more</span>
                        </button>
                    </div>
                    <div class="progress-track"><div class="progress-fill ${colorClass}" style="width: ${percentage}%"></div></div>
                    
                    <div class="discipline-expanded-content expanded-panel" style="display: none;">
                        <div class="panel-grid">
                            <div class="panel-col">
                                <h5>Média por Professor</h5>
                                <div class="mini-bar-chart">
                                    ${Array.from(disc.mediaPorProfessor.entries()).map(([prof, media]) => `
                                        <div class="mini-bar-row">
                                            <span class="mini-bar-label">${prof}</span>
                                            <div class="mini-bar-track"><div class="mini-bar-fill bg-primary" style="width: ${(media/5)*100}%"></div></div>
                                            <span class="mini-bar-value">${media.toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        if (hasMore) html += this.getLoadMoreButton('disciplines', limit, sorted.length);
        container.innerHTML = html;
    }

    // ==========================================
    // 3. RENDERIZADOR DE ALUNOS (Anónimo)
    // ==========================================
    renderStudentsDetailed(container, studentAnalytics, filteredData, detailViewMode, limit = 20) {
        // Ordena por quantidade de respostas (engajamento)
        const sorted = [...studentAnalytics].sort((a, b) => b.totalRespostas - a.totalRespostas);
        const displayed = sorted.slice(0, limit);
        const hasMore = sorted.length > limit;

        let html = `
            <div class="tab-header-modern">
                <div class="tab-title-group">
                    <span class="material-icons">face</span>
                    <div>
                        <h3>Engajamento dos Alunos</h3>
                        <p>Alunos mais participativos (Dados anonimizados)</p>
                    </div>
                </div>
                <button class="btn-primary-modern export-tab-btn" data-export="students">
                    <span class="material-icons">download</span> Exportar Aba
                </button>
            </div>
            <div class="items-list-modern">
        `;

        displayed.forEach((student, index) => {
            const percentage = (student.mediaGeral / 5) * 100;
            const letter = String.fromCharCode(65 + (index % 26)); // Letra A, B, C...

            html += `
                <div class="modern-data-card detailed-student-item">
                    <div class="card-main-row">
                        <div class="avatar-badge">${letter}</div>
                        <div class="main-info">
                            <h4>Aluno ${letter} <small class="text-muted">***${student.alunoId.slice(-4)}</small></h4>
                            <div class="tags-row">
                                <span class="badge-modern">${student.totalRespostas} Respostas Submetidas</span>
                                <span class="badge-modern">${student.disciplinas.length} Disciplinas Avaliadas</span>
                            </div>
                        </div>
                        <div class="score-display">
                            <span class="score-value">${student.mediaGeral.toFixed(2)}</span>
                            <span class="score-max">Média Dada</span>
                        </div>
                        <button class="btn-icon-modern expand-btn">
                            <span class="material-icons">expand_more</span>
                        </button>
                    </div>
                    <div class="progress-track"><div class="progress-fill bg-primary" style="width: ${percentage}%"></div></div>
                    
                    <div class="student-expanded-content expanded-panel" style="display: none;">
                         <div class="panel-grid">
                            <div class="panel-col">
                                <h5>Disciplinas Avaliadas</h5>
                                <div class="chip-group">${student.disciplinas.map(d => `<span class="chip">${d}</span>`).join('')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        if (hasMore) html += this.getLoadMoreButton('students', limit, sorted.length);
        container.innerHTML = html;
    }

    // ==========================================
    // 4. RENDERIZADOR DE COMENTÁRIOS
    // ==========================================
    renderCommentsTab(container, allAvaliacoes, allTurmas, limit = 20) {
        // Extrai comentários de avaliações que contenham texto
        const comments = allAvaliacoes
            .filter(av => av.comentarios && av.comentarios.trim() !== '')
            .map(av => {
                const turma = allTurmas.find(t => t.id === av.turmaId);
                return {
                    comentario: av.comentarios,
                    disciplina: turma ? turma.disciplinaNome : 'Desconhecida',
                    professor: turma ? turma.professorNome : 'Desconhecido',
                    semestre: turma ? turma.semestre : 'N/A',
                    data: av.dataResposta
                };
            });

        const displayed = comments.slice(0, limit);
        const hasMore = comments.length > limit;

        let html = `
            <div class="tab-header-modern">
                <div class="tab-title-group">
                    <span class="material-icons">forum</span>
                    <div>
                        <h3>Mural de Feedbacks</h3>
                        <p>Comentários qualitativos e sugestões deixadas pelos alunos</p>
                    </div>
                </div>
            </div>
            <div class="comments-grid-modern">
        `;

        if (comments.length === 0) {
            html += `<div class="empty-state"><span class="material-icons">speaker_notes_off</span><p>Nenhum comentário encontrado para os filtros atuais.</p></div>`;
        } else {
            displayed.forEach(c => {
                html += `
                    <div class="comment-modern-card">
                        <div class="comment-header">
                            <div class="comment-context">
                                <strong>${c.disciplina}</strong>
                                <span>Prof. ${c.professor} • ${c.semestre}</span>
                            </div>
                            <span class="material-icons format-quote">format_quote</span>
                        </div>
                        <div class="comment-body">"${c.comentario}"</div>
                    </div>
                `;
            });
        }

        html += `</div>`;
        if (hasMore) html += this.getLoadMoreButton('comments', limit, comments.length);
        container.innerHTML = html;
    }

    // ==========================================
    // HELPER: Botão de Carregar Mais
    // ==========================================
    getLoadMoreButton(tabName, currentLimit, total) {
        return `
            <div class="load-more-container" style="margin-top: 24px; text-align: center;">
                <button class="btn-secondary load-more-btn" data-tab="${tabName}" style="margin: 0 auto;">
                    Mostrar mais <span class="material-icons">expand_more</span>
                </button>
                <p class="text-muted" style="margin-top: 8px; font-size: 13px;">Mostrando ${currentLimit} de ${total}</p>
            </div>
        `;
    }

    renderQuestionsTab(container, data, groupByQuestion, limit = 20) {
        const questionsData = groupByQuestion(data);
        
        // 1. Processar e ordenar as questões da melhor para a pior média
        const processedQuestions = Object.entries(questionsData).map(([question, responses]) => {
            const numericResponses = responses.filter(r => typeof r.respostaValor === 'number');
            const average = numericResponses.length > 0 
                ? numericResponses.reduce((sum, r) => sum + r.respostaValor, 0) / numericResponses.length 
                : 0;
            return { question, responses: numericResponses, average, tipo: responses[0]?.tipo || 'N/A' };
        }).filter(q => q.responses.length > 0).sort((a, b) => b.average - a.average);

        // Paginação
        const displayedQuestions = processedQuestions.slice(0, limit);
        const hasMore = processedQuestions.length > limit;

        // 2. Renderizar UI Moderna
        let html = `
            <div class="tab-header-modern">
                <div class="tab-title-group">
                    <span class="material-icons">rule</span>
                    <div>
                        <h3>Análise de Desempenho por Questão</h3>
                        <p>Ranking das questões com base na avaliação dos alunos</p>
                    </div>
                </div>
                <button class="btn-primary-modern export-tab-btn" data-export="questions">
                    <span class="material-icons">download</span> Exportar Aba
                </button>
            </div>
            
            <div class="questions-list-modern">
        `;

        displayedQuestions.forEach((q, index) => {
            const percentage = (q.average / 5) * 100;
            // Cores dinâmicas: Verde (>4), Amarelo (>3), Vermelho (<3)
            const colorClass = q.average >= 4 ? 'bg-success' : (q.average >= 3 ? 'bg-warning' : 'bg-danger');

            html += `
                <div class="question-modern-card">
                    <div class="q-header">
                        <span class="q-rank">#${index + 1}</span>
                        <div class="q-info">
                            <span class="q-category badge-modern">${q.tipo.toUpperCase()}</span>
                            <h4>${q.question}</h4>
                        </div>
                    </div>
                    <div class="q-stats-row">
                        <div class="q-stat">
                            <span class="label">Média</span>
                            <span class="value">${q.average.toFixed(2)} <small>/ 5.00</small></span>
                        </div>
                        <div class="q-stat">
                            <span class="label">Respostas</span>
                            <span class="value">${q.responses.length}</span>
                        </div>
                    </div>
                    <div class="q-progress-container">
                        <div class="q-progress-bar">
                            <div class="q-progress-fill ${colorClass}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        // Botão Load More
        if (hasMore) {
            html += `
                <div class="load-more-container">
                    <button class="btn-secondary load-more-btn" data-tab="questions">
                        Mostrar mais questões <span class="material-icons">expand_more</span>
                    </button>
                    <p class="text-muted">Mostrando ${limit} de ${processedQuestions.length}</p>
                </div>
            `;
        }

        container.innerHTML = html;
    }
}