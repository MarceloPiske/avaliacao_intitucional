export function initQuestionsSection() {
    const section = document.getElementById('questions-section');
    
    section.innerHTML = `
        <div class="section-content">
            <h2>Gerenciar Perguntas</h2>
            
            <div class="info-legend">
                <h4><i class="fas fa-info-circle"></i> Legenda da Escala de Avaliação</h4>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="legend-number">1</span>
                        <span class="legend-text">Discordo Totalmente</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-number">2</span>
                        <span class="legend-text">Discordo Parcialmente</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-number">3</span>
                        <span class="legend-text">Neutro</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-number">4</span>
                        <span class="legend-text">Concordo Parcialmente</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-number">5</span>
                        <span class="legend-text">Concordo Totalmente</span>
                    </div>
                </div>
            </div>
            
            <div class="form-container">
                <h3 id="question-form-title">Adicionar Pergunta</h3>
                <input type="hidden" id="edit-question-id">
                <div class="form-group">
                    <label for="question-text">Texto da Pergunta</label>
                    <textarea id="question-text" placeholder="Digite o texto da pergunta" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="question-eixo">Eixo (1-5)</label>
                        <input type="text" id="question-eixo" placeholder="Ex: 1" required>
                    </div>
                    <div class="form-group">
                        <label for="question-dimensao">Dimensão (1-10)</label>
                        <input type="text" id="question-dimensao" placeholder="Ex: 8" required>
                    </div>
                </div>
                <div class="form-group">
                    <label style="font-weight: 500; display: block; margin-bottom: 10px;">Aplicável para:</label>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" id="question-aluno">
                            <span>Aluno</span>
                        </label>
                        <label>
                            <input type="checkbox" id="question-professor">
                            <span>Professor</span>
                        </label>
                        <label>
                            <input type="checkbox" id="question-funcionario">
                            <span>Técnico Administrativo</span>
                        </label>
                    </div>
                </div>
                <div class="form-actions">
                    <button id="save-question-btn"><i class="fas fa-save"></i> Salvar Pergunta</button>
                    <button id="cancel-question-btn" class="secondary" style="display: none;"><i class="fas fa-times"></i> Cancelar</button>
                </div>
            </div>
            <div id="questions-list"></div>
        </div>
    `;

    document.getElementById('save-question-btn').addEventListener('click', saveQuestion);
    document.getElementById('cancel-question-btn').addEventListener('click', cancelQuestionEdit);

    loadQuestions();
}

async function loadQuestions() {
    const db = firebase.firestore();
    const snapshot = await db.collection('perguntas_avaliacao_institucional').get();
    
    const listDiv = document.getElementById('questions-list');
    listDiv.innerHTML = `
        <h3>Lista de Perguntas</h3>
        <div class="questions-table-container">
            <table class="users-table questions-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th class="question-text-col">Texto</th>
                        <th>Eixo</th>
                        <th>Dimensão</th>
                        <th>Público</th>
                        <th class="actions-col">Ações</th>
                    </tr>
                </thead>
                <tbody id="questions-tbody"></tbody>
            </table>
        </div>
        <div id="questions-cards" class="questions-cards"></div>
    `;
    
    const tbody = document.getElementById('questions-tbody');
    const cardsContainer = document.getElementById('questions-cards');
    
    const questions = [];
    snapshot.forEach(doc => {
        questions.push({ id: doc.id, ...doc.data() });
    });
    
    questions.sort((a, b) => (a.id || 0) - (b.id || 0));
    
    questions.forEach(q => {
        const publico = [];
        if (q.aluno) publico.push('Aluno');
        if (q.professor) publico.push('Professor');
        if (q.funcionario) publico.push('Técnico');
        
        // Table row for desktop
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="question-id-badge">${q.id || '-'}</span></td>
            <td class="question-text-col">${q.texto || ''}</td>
            <td><span class="badge badge-eixo">Eixo ${q.eixo || ''}</span></td>
            <td><span class="badge badge-dimensao">Dim. ${q.dimensao || ''}</span></td>
            <td><div class="publico-tags">${publico.map(p => `<span class="publico-tag">${p}</span>`).join('')}</div></td>
            <td class="actions-col">
                <button class="edit-btn" data-id="${q.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="delete-btn" data-id="${q.id}"><i class="fas fa-trash"></i> Excluir</button>
            </td>
        `;
        tbody.appendChild(row);
        
        // Card for mobile
        const card = document.createElement('div');
        card.className = 'question-card';
        card.innerHTML = `
            <div class="question-card-header">
                <span class="question-id-badge">ID: ${q.id || '-'}</span>
                <div class="question-card-meta">
                    <span class="badge badge-eixo">Eixo ${q.eixo || ''}</span>
                    <span class="badge badge-dimensao">Dim. ${q.dimensao || ''}</span>
                </div>
            </div>
            <div class="question-card-text">${q.texto || ''}</div>
            <div class="question-card-footer">
                <div class="publico-tags">${publico.map(p => `<span class="publico-tag">${p}</span>`).join('')}</div>
                <div class="question-card-actions">
                    <button class="edit-btn" data-id="${q.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${q.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    // Add event listeners for both table and cards
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editQuestion(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteQuestion(btn.dataset.id));
    });
}

async function saveQuestion() {
    const db = firebase.firestore();
    const questionId = document.getElementById('edit-question-id').value;
    const text = document.getElementById('question-text').value.trim();
    const eixo = document.getElementById('question-eixo').value.trim();
    const dimensao = document.getElementById('question-dimensao').value.trim();
    const aluno = document.getElementById('question-aluno').checked;
    const professor = document.getElementById('question-professor').checked;
    const funcionario = document.getElementById('question-funcionario').checked;

    if (!text || !eixo || !dimensao) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    if (!aluno && !professor && !funcionario) {
        alert('Por favor, selecione pelo menos um tipo de público.');
        return;
    }

    const questionData = {
        texto: text,
        eixo: eixo,
        dimensao: dimensao,
        aluno: aluno,
        professor: professor,
        funcionario: funcionario
    };

    try {
        if (questionId) {
            await db.collection('perguntas_avaliacao_institucional').doc(questionId).update(questionData);
            alert('Pergunta atualizada com sucesso!');
        } else {
            const snapshot = await db.collection('perguntas_avaliacao_institucional').get();
            let maxId = 0;
            snapshot.forEach(doc => {
                const docId = parseInt(doc.id);
                if (!isNaN(docId) && docId > maxId) {
                    maxId = docId;
                }
            });
            
            const newId = (maxId + 1).toString();
            await db.collection('perguntas_avaliacao_institucional').doc(newId).set(questionData);
            alert('Pergunta adicionada com sucesso!');
        }
        
        clearQuestionForm();
        loadQuestions();
    } catch (error) {
        console.error('Error saving question:', error);
        alert('Erro ao salvar pergunta: ' + error.message);
    }
}

async function editQuestion(id) {
    const db = firebase.firestore();
    const doc = await db.collection('perguntas_avaliacao_institucional').doc(id).get();
    const question = doc.data();

    document.getElementById('edit-question-id').value = id;
    document.getElementById('question-form-title').textContent = 'Editar Pergunta';
    document.getElementById('question-text').value = question.texto || '';
    document.getElementById('question-eixo').value = question.eixo || '';
    document.getElementById('question-dimensao').value = question.dimensao || '';
    document.getElementById('question-aluno').checked = question.aluno || false;
    document.getElementById('question-professor').checked = question.professor || false;
    document.getElementById('question-funcionario').checked = question.funcionario || false;
    
    document.getElementById('cancel-question-btn').style.display = 'inline-block';
    document.getElementById('question-text').focus();
}

async function deleteQuestion(id) {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) {
        return;
    }

    const db = firebase.firestore();
    try {
        await db.collection('perguntas_avaliacao_institucional').doc(id).delete();
        alert('Pergunta excluída com sucesso!');
        loadQuestions();
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('Erro ao excluir pergunta: ' + error.message);
    }
}

function cancelQuestionEdit() {
    clearQuestionForm();
}

function clearQuestionForm() {
    document.getElementById('edit-question-id').value = '';
    document.getElementById('question-form-title').textContent = 'Adicionar Pergunta';
    document.getElementById('question-text').value = '';
    document.getElementById('question-eixo').value = '';
    document.getElementById('question-dimensao').value = '';
    document.getElementById('question-aluno').checked = false;
    document.getElementById('question-professor').checked = false;
    document.getElementById('question-funcionario').checked = false;
    document.getElementById('cancel-question-btn').style.display = 'none';
}