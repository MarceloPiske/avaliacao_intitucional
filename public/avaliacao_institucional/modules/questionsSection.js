export function setupQuestionsSection() {
    const dimensionSelect = document.getElementById('dimension-select');
    const groupSelect = document.getElementById('group-select');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionsList = document.getElementById('questions-list');
    const questionFormContainer = document.getElementById('question-form-container');
    const questionForm = document.getElementById('question-form');
    const cancelQuestionBtn = document.getElementById('cancel-question-btn');
    const questionDimensionSelect = document.getElementById('question-dimension');
    
    let questions = [];
    let editingQuestionId = null;

    // Load questions
    loadQuestions();

    // Load dimensions
    loadDimensions();

    // Event listeners
    dimensionSelect.addEventListener('change', filterQuestions);
    groupSelect.addEventListener('change', filterQuestions);
    addQuestionBtn.addEventListener('click', showAddQuestionForm);
    cancelQuestionBtn.addEventListener('click', hideQuestionForm);
    questionForm.addEventListener('submit', saveQuestion);

    async function loadQuestions() {
        try {
            const db = firebase.firestore();
            const questionsRef = db.collection('perguntas');
            const snapshot = await questionsRef.get();
            
            if (snapshot.empty) {
                // If no questions in Firestore, try to load from JSON
                try {
                    const response = await fetch('avaliacao_cpa_perguntas.json');
                    if (!response.ok) {
                        throw new Error('Failed to fetch JSON file');
                    }
                    questions = await response.json();
                    
                    // Convert the JSON structure to the expected format
                    questions = questions.map(q => {
                        return {
                            id: q.id,
                            texto: q.texto,
                            dimensao: `Eixo ${q.eixo} - Dimensão ${q.dimensao}`,
                            grupos: [
                                ...(q.aluno ? ['alunos'] : []),
                                ...(q.professor ? ['professores'] : []),
                                ...(q.funcionario ? ['tecnicos'] : [])
                            ]
                        };
                    });
                    
                    // Store questions in Firestore for future use
                    questions.forEach(q => {
                        db.collection('perguntas').add({
                            id: q.id,
                            texto: q.texto,
                            dimensao: q.dimensao,
                            grupos: q.grupos
                        }).catch(err => console.error('Error adding question to Firestore:', err));
                    });
                } catch (jsonError) {
                    console.error('Error loading questions from JSON:', jsonError);
                    questionsList.innerHTML = '<p>Erro ao carregar perguntas do arquivo JSON. Verifique se o arquivo existe.</p>';
                    return;
                }
            } else {
                // Use questions from Firestore
                questions = snapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() };
                });
            }
            
            displayQuestions();
        } catch (error) {
            console.error('Erro ao carregar perguntas:', error);
            questionsList.innerHTML = '<p>Erro ao carregar perguntas. Tente novamente mais tarde.</p>';
        }
    }

    async function loadDimensions() {
        try {
            // Clear existing options first (except the "all" option)
            while (dimensionSelect.options.length > 1) {
                dimensionSelect.remove(1);
            }
            
            while (questionDimensionSelect.options.length > 1) {
                questionDimensionSelect.remove(1);
            }
            
            // Try to get dimensions from Firestore first
            const db = firebase.firestore();
            const questionsRef = db.collection('perguntas');
            const snapshot = await questionsRef.get();
            
            let dimensions = [];
            
            if (snapshot.empty) {
                // If no questions in Firestore, try to load from JSON
                const response = await fetch('avaliacao_cpa_perguntas.json');
                if (!response.ok) {
                    throw new Error('Failed to fetch JSON file');
                }
                const jsonQuestions = await response.json();
                
                // Extract unique dimensions from JSON
                const dimensionSet = new Set();
                jsonQuestions.forEach(q => {
                    dimensionSet.add(`Eixo ${q.eixo} - Dimensão ${q.dimensao}`);
                });
                dimensions = [...dimensionSet];
            } else {
                // Extract dimensions from Firestore data
                const dimensionSet = new Set();
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.dimensao) {
                        dimensionSet.add(data.dimensao);
                    }
                });
                dimensions = [...dimensionSet];
            }
            
            // Add dimensions to both selects
            dimensions.forEach(dimension => {
                // For filter select
                const option1 = document.createElement('option');
                option1.value = dimension;
                option1.textContent = dimension;
                dimensionSelect.appendChild(option1);
                
                // For form select
                const option2 = document.createElement('option');
                option2.value = dimension;
                option2.textContent = dimension;
                questionDimensionSelect.appendChild(option2);
            });
        } catch (error) {
            console.error('Erro ao carregar dimensões:', error);
        }
    }

    function filterQuestions() {
        displayQuestions();
    }

    function displayQuestions() {
        // Get filter values
        const dimensionFilter = dimensionSelect.value;
        const groupFilter = groupSelect.value;

        // Filter questions
        const filteredQuestions = questions.filter(question => {
            if (dimensionFilter !== 'all' && question.dimensao !== dimensionFilter) return false;
            if (groupFilter !== 'all' && !question.grupos.includes(groupFilter)) return false;
            return true;
        });

        // Clear previous questions
        questionsList.innerHTML = '';

        // Display filtered questions
        if (filteredQuestions.length === 0) {
            questionsList.innerHTML = '<p>Nenhuma pergunta encontrada para os filtros selecionados.</p>';
            return;
        }

        filteredQuestions.forEach(question => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            questionItem.dataset.id = question.id;

            const questionHeader = document.createElement('div');
            questionHeader.className = 'question-header';

            const questionContent = document.createElement('div');
            questionContent.className = 'question-content';

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.textContent = question.texto;
            questionContent.appendChild(questionText);

            const questionMeta = document.createElement('p');
            questionMeta.className = 'question-meta';
            questionMeta.textContent = `Dimensão: ${question.dimensao} | Grupos: ${question.grupos.join(', ')}`;
            questionContent.appendChild(questionMeta);

            const questionActions = document.createElement('div');
            questionActions.className = 'question-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => editQuestion(question.id));
            questionActions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.addEventListener('click', () => deleteQuestion(question.id));
            questionActions.appendChild(deleteBtn);

            questionHeader.appendChild(questionContent);
            questionHeader.appendChild(questionActions);
            questionItem.appendChild(questionHeader);
            questionsList.appendChild(questionItem);
        });
    }

    function showAddQuestionForm() {
        // Reset form
        questionForm.reset();
        document.getElementById('question-form-title').textContent = 'Nova Pergunta';
        editingQuestionId = null;
        
        // Show form
        questionFormContainer.style.display = 'block';
    }

    function hideQuestionForm() {
        questionFormContainer.style.display = 'none';
    }

    function editQuestion(id) {
        // Find question by id
        const question = questions.find(q => q.id === id);
        if (!question) return;

        // Fill form with question data
        document.getElementById('question-text').value = question.texto;
        document.getElementById('question-dimension').value = question.dimensao;
        
        // Check appropriate group checkboxes
        const groupCheckboxes = document.getElementsByName('question-group');
        groupCheckboxes.forEach(checkbox => {
            checkbox.checked = question.grupos.includes(checkbox.value);
        });

        // Set form title and editing id
        document.getElementById('question-form-title').textContent = 'Editar Pergunta';
        editingQuestionId = id;

        // Show form
        questionFormContainer.style.display = 'block';
    }

    function saveQuestion(event) {
        event.preventDefault();

        // Get form values
        const questionText = document.getElementById('question-text').value;
        const questionDimension = document.getElementById('question-dimension').value;
        const groupCheckboxes = document.getElementsByName('question-group');
        const selectedGroups = Array.from(groupCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        if (selectedGroups.length === 0) {
            alert('Selecione pelo menos um grupo.');
            return;
        }

        if (editingQuestionId) {
            // Update existing question
            const index = questions.findIndex(q => q.id === editingQuestionId);
            if (index !== -1) {
                questions[index] = {
                    ...questions[index],
                    texto: questionText,
                    dimensao: questionDimension,
                    grupos: selectedGroups
                };
            }
        } else {
            // Add new question
            const newId = Math.max(...questions.map(q => q.id), 0) + 1;
            questions.push({
                id: newId,
                texto: questionText,
                dimensao: questionDimension,
                grupos: selectedGroups
            });
        }

        // In a real app, we would save to server here
        // For now, just update the display
        displayQuestions();
        hideQuestionForm();
    }

    function deleteQuestion(id) {
        if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
            // Remove question from array
            questions = questions.filter(q => q.id !== id);
            
            // In a real app, we would delete from server here
            // For now, just update the display
            displayQuestions();
        }
    }
}