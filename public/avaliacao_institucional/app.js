import { initializeFirebase } from './modules/firebaseConfig.js';

// Initialize Firebase
initializeFirebase();

const auth = firebase.auth();
const db = firebase.firestore();

// Elements
const loginContainer = document.getElementById('login-container');
const evaluationContainer = document.getElementById('evaluation-container');
const googleLoginButton = document.getElementById('google-login-button');
const loginError = document.getElementById('login-error');
const evalLogoutButton = document.getElementById('eval-logout-button');

// Check auth state
auth.onAuthStateChanged(user => {
    if (user && localStorage.getItem('isLoggedIn') === 'true') {
        checkLoggedInUser();
    }
});

// Google login
googleLoginButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        hd: 'seminarioconcordia.com.br,faculdadeluterananconcordia.com.br'
    });
    
    auth.signInWithPopup(provider)
        .then((result) => {
            const email = result.user.email;
            const domain = email.substring(email.lastIndexOf('@') + 1);
            
            if (domain === 'seminarioconcordia.com.br' || domain === 'faculdadeluterananconcordia.com.br') {
                checkOrCreateUser(result.user.uid, email, result.user.displayName);
            } else {
                auth.signOut();
                loginError.textContent = 'Este email não é de um domínio institucional permitido.';
            }
        })
        .catch((error) => {
            console.error("Error during Google sign in:", error);
            loginError.textContent = 'Erro ao fazer login: ' + error.message;
        });
});

// Check or create user in database
async function checkOrCreateUser(uid, email, displayName) {
    try {
        const querySnapshot = await db.collection('users')
            .where('email', '==', email)
            .get();
        
        if (querySnapshot.empty) {
            const docRef = await db.collection('users').add({
                email: email,
                nome: displayName || email.split('@')[0],
                role: 'aluno',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'aluno');
            localStorage.setItem('userId', docRef.id);
            localStorage.setItem('userName', displayName || email.split('@')[0]);
            
            showEvaluationPanel(displayName || email.split('@')[0], 'aluno');
        } else {
            const userData = querySnapshot.docs[0].data();
            const userRole = userData.role;
            const userId = querySnapshot.docs[0].id;
            
            if (userRole === 'admin') {
                auth.signOut();
                loginError.textContent = 'Administradores devem acessar pelo painel administrativo.';
                return;
            }
            
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('userId', userId);
            localStorage.setItem('userName', userData.nome);
            
            showEvaluationPanel(userData.nome, userRole);
        }
    } catch (error) {
        console.error("Error checking user:", error);
        auth.signOut();
        loginError.textContent = 'Erro ao verificar perfil de usuário: ' + error.message;
    }
}

function checkLoggedInUser() {
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    
    if (userName && userRole && userRole !== 'admin') {
        showEvaluationPanel(userName, userRole);
    }
}

function showEvaluationPanel(userName, userRole) {
    loginContainer.style.display = 'none';
    evaluationContainer.style.display = 'flex';
    document.getElementById('user-name-display').textContent = userName;
    loadUserQuestions(userRole);
}

// Load and display questions for evaluation
function loadUserQuestions(userRole) {
    const questionContainer = document.getElementById('question-container');
    const questionText = document.getElementById('question-text');
    const currentQuestionNum = document.getElementById('current-question-num');
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const submitButton = document.getElementById('submit-evaluation');
    const progressFill = document.getElementById('progress-fill');
    const progressCurrent = document.getElementById('progress-current');
    const progressTotal = document.getElementById('progress-total');
    const evaluationComplete = document.getElementById('evaluation-complete');
    const returnButton = document.getElementById('return-button');
    
    let questions = [];
    let currentQuestionIndex = 0;
    let answers = {};
    
    console.log('Loading questions for user role:', userRole);
    
    // Fetch questions from Firestore
    db.collection('perguntas_avaliacao_institucional').get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const q = doc.data();
                q.id = doc.id;
                
                // Filter questions based on user role
                if (userRole === 'aluno' && q.aluno === true) {
                    questions.push(q);
                } else if (userRole === 'professor' && q.professor === true) {
                    questions.push(q);
                } else if (userRole === 'tecnico' && q.funcionario === true) {
                    questions.push(q);
                }
            });
            
            // Sort questions by numeric ID
            questions.sort((a, b) => {
                const idA = parseInt(a.id) || 0;
                const idB = parseInt(b.id) || 0;
                return idA - idB;
            });
            
            console.log('Loaded questions:', questions);
            console.log('Total questions for this user role:', questions.length);
            
            if (questions.length === 0) {
                questionText.textContent = 'Nenhuma pergunta disponível para seu perfil no momento.';
                prevButton.style.display = 'none';
                nextButton.style.display = 'none';
                submitButton.style.display = 'none';
                return;
            }
            
            progressTotal.textContent = questions.length;
            updateQuestion();
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            questionText.textContent = 'Erro ao carregar as perguntas. Por favor, tente novamente mais tarde.';
        });
    
    prevButton.addEventListener('click', showPreviousQuestion);
    nextButton.addEventListener('click', showNextQuestion);
    submitButton.addEventListener('click', submitEvaluation);
    returnButton.addEventListener('click', returnToLogin);
    evalLogoutButton.addEventListener('click', returnToLogin);
    
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    ratingInputs.forEach(input => {
        input.addEventListener('change', () => {
            const selectedValue = document.querySelector('input[name="rating"]:checked').value;
            saveAnswer(selectedValue);
        });
    });
    
    function updateQuestion() {
        if (currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
            const question = questions[currentQuestionIndex];
            questionText.textContent = question.texto;
            currentQuestionNum.textContent = currentQuestionIndex + 1;
            progressCurrent.textContent = currentQuestionIndex + 1;
            progressFill.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
            
            prevButton.style.display = currentQuestionIndex === 0 ? 'none' : 'flex';
            if (currentQuestionIndex === questions.length - 1) {
                nextButton.style.display = 'none';
                submitButton.style.display = 'flex';
            } else {
                nextButton.style.display = 'flex';
                submitButton.style.display = 'none';
            }
            
            ratingInputs.forEach(input => {
                input.checked = false;
            });
            
            const questionId = question.id;
            if (answers[questionId]) {
                const savedInput = document.querySelector(`input[name="rating"][value="${answers[questionId]}"]`);
                if (savedInput) {
                    savedInput.checked = true;
                }
            }
        }
    }
    
    function showPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateQuestion();
        }
    }
    
    function showNextQuestion() {
        const selectedRating = document.querySelector('input[name="rating"]:checked');
        if (!selectedRating) {
            alert('Por favor, selecione uma resposta antes de continuar.');
            return;
        }
        
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            updateQuestion();
        }
    }
    
    function saveAnswer(value) {
        const questionId = questions[currentQuestionIndex].id;
        answers[questionId] = value;
    }
    
    function submitEvaluation() {
        const selectedRating = document.querySelector('input[name="rating"]:checked');
        if (!selectedRating) {
            alert('Por favor, selecione uma resposta antes de enviar.');
            return;
        }
        
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < questions.length) {
            if (!confirm(`Você respondeu ${answeredCount} de ${questions.length} perguntas. Deseja realmente enviar a avaliação incompleta?`)) {
                return;
            }
        }
        
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        
        db.collection('respostas_avaliacao_institucional').add({
            userId: userId,
            userRole: userRole,
            answers: answers,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            year: new Date().getFullYear()
        })
        .then(() => {
            questionContainer.style.display = 'none';
            evaluationComplete.style.display = 'block';
        })
        .catch(error => {
            console.error('Error saving answers:', error);
            alert('Erro ao salvar suas respostas. Por favor, tente novamente.');
        });
    }
    
    function returnToLogin() {
        auth.signOut().then(() => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            
            questionContainer.style.display = 'block';
            evaluationComplete.style.display = 'none';
            currentQuestionIndex = 0;
            answers = {};
            
            evaluationContainer.style.display = 'none';
            loginContainer.style.display = 'flex';
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    }
}