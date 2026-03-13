import { db } from '../../avaliacao_disciplinas/modules/shared/firebase.js';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export function initQuestionsSection() {
    const section = document.getElementById('questions-section');
    
    const style = document.createElement('style');
    style.innerHTML = `
        .q-kpi-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .q-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: white; }
        .badge-eixo { background: #0ea5e9; }
        .badge-dim { background: #8b5cf6; }
        .tag-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .audience-tag { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; border: 1px solid #e2e8f0; background: white; color: #64748b; }
        .audience-tag.active-tag { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
        .question-text-cell { font-size: 14px; font-weight: 500; color: #1e293b; max-width: 400px; line-height: 1.5; }
        * { box-sizing: border-box; }
    `;
    document.head.appendChild(style);

    section.innerHTML = `
        <div class="users-header-modern">
            <div>
                <h2>Matriz de Perguntas (SINAES)</h2>
                <p>Gira as questões por Eixos, Dimensões e defina o público-alvo da avaliação.</p>
            </div>
            <button id="toggle-question-form-btn" class="modern-btn btn-primary">
                <span class="material-icons">add_box</span> Nova Pergunta
            </button>
        </div>

        <div class="kpi-grid">
            <div class="q-kpi-card">
                <div>
                    <h4 style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">Total de Perguntas</h4>
                    <span id="total-q-stat" style="font-size: 28px; font-weight: 800; color: #0f172a;">0</span>
                </div>
                <div class="kpi-icon" style="background: #f1f5f9; color: #0f172a;"><span class="material-icons">rule</span></div>
            </div>
            <div class="q-kpi-card">
                <div>
                    <h4 style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">Para Alunos</h4>
                    <span id="aluno-q-stat" style="font-size: 24px; font-weight: 700; color: #16a34a;">0</span>
                </div>
                <div class="kpi-icon" style="background: #dcfce7; color: #16a34a;"><span class="material-icons">school</span></div>
            </div>
            <div class="q-kpi-card">
                <div>
                    <h4 style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">Para Professores</h4>
                    <span id="prof-q-stat" style="font-size: 24px; font-weight: 700; color: #ea580c;">0</span>
                </div>
                <div class="kpi-icon" style="background: #ffedd5; color: #ea580c;"><span class="material-icons">history_edu</span></div>
            </div>
            <div class="q-kpi-card">
                <div>
                    <h4 style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">Para Técnicos</h4>
                    <span id="tec-q-stat" style="font-size: 24px; font-weight: 700; color: #2563eb;">0</span>
                </div>
                <div class="kpi-icon" style="background: #dbeafe; color: #2563eb;"><span class="material-icons">badge</span></div>
            </div>
        </div>

        <div id="question-form-panel" class="form-panel">
            <h3 id="question-form-title" style="margin: 0 0 20px 0; font-size: 18px;">Nova Pergunta da Matriz</h3>
            <input type="hidden" id="edit-question-id">
            
            <div class="input-group" style="margin-bottom: 16px;">
                <label>Texto da Pergunta</label>
                <textarea id="question-text" rows="3" placeholder="Insira o texto oficial da pergunta CPA..." style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 14px; outline: none;"></textarea>
            </div>

            <div class="form-grid" style="grid-template-columns: 1fr 1fr 2fr;">
                <div class="input-group">
                    <label>Eixo (1 a 5)</label>
                    <input type="number" id="question-eixo" placeholder="Ex: 2" min="1" max="5" required>
                </div>
                <div class="input-group">
                    <label>Dimensão (1 a 10)</label>
                    <input type="number" id="question-dimensao" placeholder="Ex: 8" min="1" max="10" required>
                </div>
                <div class="input-group">
                    <label>Público-Alvo</label>
                    <div style="display: flex; gap: 16px; margin-top: 8px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="question-aluno"> Alunos
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="question-professor"> Professores
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="question-funcionario"> Técnicos
                        </label>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="save-question-btn" class="modern-btn btn-primary"><span class="material-icons">save</span> Salvar Pergunta</button>
                <button id="cancel-question-btn" class="modern-btn btn-outline"><span class="material-icons">close</span> Cancelar</button>
            </div>
        </div>

        <div class="modern-table-container">
            <table class="modern-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">ID</th>
                        <th>Pergunta Oficial</th>
                        <th>Classificação</th>
                        <th>Público-Alvo</th>
                        <th style="text-align: right;">Ações</th>
                    </tr>
                </thead>
                <tbody id="questions-tbody"></tbody>
            </table>
        </div>
    `;

    document.getElementById('toggle-question-form-btn').addEventListener('click', () => {
        const panel = document.getElementById('question-form-panel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        clearQuestionForm();
    });

    document.getElementById('save-question-btn').addEventListener('click', saveQuestion);
    document.getElementById('cancel-question-btn').addEventListener('click', () => {
        document.getElementById('question-form-panel').style.display = 'none';
        clearQuestionForm();
    });

    loadQuestions();
}

async function loadQuestions() {
    try {
        const querySnapshot = await getDocs(collection(db, 'perguntas_avaliacao_institucional'));
        const questions = [];
        let counts = { total: 0, aluno: 0, prof: 0, tec: 0 };

        querySnapshot.forEach(docSnap => {
            const q = { id: docSnap.id, ...docSnap.data() };
            questions.push(q);
            counts.total++;
            if(q.aluno) counts.aluno++;
            if(q.professor) counts.prof++;
            if(q.funcionario) counts.tec++;
        });
        
        document.getElementById('total-q-stat').textContent = counts.total;
        document.getElementById('aluno-q-stat').textContent = counts.aluno;
        document.getElementById('prof-q-stat').textContent = counts.prof;
        document.getElementById('tec-q-stat').textContent = counts.tec;

        questions.sort((a, b) => parseInt(a.id || 0) - parseInt(b.id || 0));
        
        const tbody = document.getElementById('questions-tbody');
        tbody.innerHTML = '';

        questions.forEach(q => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong style="color: #94a3b8;">#${q.id}</strong></td>
                <td><div class="question-text-cell">${q.texto || 'Sem texto'}</div></td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <span class="q-badge badge-eixo">Eixo ${q.eixo || '?'}</span>
                        <span class="q-badge badge-dim">Dim. ${q.dimensao || '?'}</span>
                    </div>
                </td>
                <td>
                    <div class="tag-group">
                        <span class="audience-tag ${q.aluno ? 'active-tag' : ''}">Aluno</span>
                        <span class="audience-tag ${q.professor ? 'active-tag' : ''}">Prof</span>
                        <span class="audience-tag ${q.funcionario ? 'active-tag' : ''}">Téc</span>
                    </div>
                </td>
                <td>
                    <div class="action-btns" style="justify-content: flex-end;">
                        <button class="btn-icon-only edit-btn" data-id="${q.id}" title="Editar">
                            <span class="material-icons">edit_note</span>
                        </button>
                        <button class="btn-icon-only btn-delete delete-btn" data-id="${q.id}" title="Excluir">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editQuestion(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteQuestion(btn.dataset.id));
        });
    } catch(e) {
        console.error('Erro ao carregar perguntas:', e);
    }
}

async function saveQuestion() {
    const questionId = document.getElementById('edit-question-id').value;
    const text = document.getElementById('question-text').value.trim();
    const eixo = document.getElementById('question-eixo').value.trim();
    const dimensao = document.getElementById('question-dimensao').value.trim();
    const aluno = document.getElementById('question-aluno').checked;
    const professor = document.getElementById('question-professor').checked;
    const funcionario = document.getElementById('question-funcionario').checked;

    if (!text || !eixo || !dimensao) {
        alert('Por favor, preencha o Texto, o Eixo e a Dimensão.');
        return;
    }

    const questionData = { texto: text, eixo: eixo, dimensao: dimensao, aluno: aluno, professor: professor, funcionario: funcionario };
    const btn = document.getElementById('save-question-btn');
    btn.disabled = true; btn.innerHTML = '<span class="material-icons">hourglass_empty</span> Salvando...';

    try {
        if (questionId) {
            await updateDoc(doc(db, 'perguntas_avaliacao_institucional', questionId), questionData);
        } else {
            const querySnapshot = await getDocs(collection(db, 'perguntas_avaliacao_institucional'));
            let maxId = 0;
            querySnapshot.forEach(docSnap => {
                const docId = parseInt(docSnap.id);
                if (!isNaN(docId) && docId > maxId) maxId = docId;
            });
            const newId = (maxId + 1).toString();
            questionData.id = parseInt(newId); 
            await setDoc(doc(db, 'perguntas_avaliacao_institucional', newId), questionData);
        }
        
        clearQuestionForm();
        document.getElementById('question-form-panel').style.display = 'none';
        loadQuestions();
    } catch (error) {
        console.error('Erro ao salvar pergunta:', error);
        alert('Erro: ' + error.message);
    } finally {
        btn.disabled = false; btn.innerHTML = '<span class="material-icons">save</span> Salvar Pergunta';
    }
}

async function editQuestion(id) {
    const docSnap = await getDoc(doc(db, 'perguntas_avaliacao_institucional', id));
    if(docSnap.exists()) {
        const q = docSnap.data();
        document.getElementById('edit-question-id').value = id;
        document.getElementById('question-form-title').textContent = `Editar Pergunta #${id}`;
        document.getElementById('question-text').value = q.texto || '';
        document.getElementById('question-eixo').value = q.eixo || '';
        document.getElementById('question-dimensao').value = q.dimensao || '';
        document.getElementById('question-aluno').checked = q.aluno || false;
        document.getElementById('question-professor').checked = q.professor || false;
        document.getElementById('question-funcionario').checked = q.funcionario || false;
        
        const panel = document.getElementById('question-form-panel');
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function deleteQuestion(id) {
    if (!confirm('ATENÇÃO: Ao excluir esta pergunta os relatórios passados poderão falhar. Deseja mesmo excluir?')) return;

    try {
        await deleteDoc(doc(db, 'perguntas_avaliacao_institucional', id));
        loadQuestions();
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir: ' + error.message);
    }
}

function clearQuestionForm() {
    document.getElementById('edit-question-id').value = '';
    document.getElementById('question-form-title').textContent = 'Nova Pergunta da Matriz';
    document.getElementById('question-text').value = '';
    document.getElementById('question-eixo').value = '';
    document.getElementById('question-dimensao').value = '';
    document.getElementById('question-aluno').checked = false;
    document.getElementById('question-professor').checked = false;
    document.getElementById('question-funcionario').checked = false;
}