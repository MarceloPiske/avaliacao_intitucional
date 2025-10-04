import { auth, db, googleProvider } from './firebaseConfig.js';
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const evaluationScreen = document.getElementById('evaluation-screen');
const thankyouScreen = document.getElementById('thankyou-screen');
const googleLoginButton = document.getElementById('google-login-button');
const logoutButton = document.getElementById('logout-button');
const thankyouLogout = document.getElementById('thankyou-logout');
const userNameDisplay = document.getElementById('user-name');

let currentUser = null;
let userQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};

// Initialize auth state listener
export function setupAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await handleUserLogin(user);
        } else {
            showScreen('login');
        }
    });

    // Event listeners
    googleLoginButton.addEventListener('click', handleGoogleLogin);
    logoutButton.addEventListener('click', handleLogout);
    thankyouLogout.addEventListener('click', handleLogout);
}

async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await handleUserLogin(result.user);
    } catch (error) {
        console.error('Login error:', error);
        alert('Erro ao fazer login. Por favor, tente novamente.');
    }
}

async function handleUserLogin(user) {
    try {
        // Check if user exists in database
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
             // Let's try to find user by email as a fallback
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const usersByEmail = await getDocs(q);

            if (usersByEmail.empty) {
                alert('Usuário não cadastrado no sistema. Entre em contato com a administração.');
                await signOut(auth);
                return;
            }

            const foundUserDoc = usersByEmail.docs[0];
            const foundUserData = foundUserDoc.data();
            
            // Map field names correctly
            currentUser = {
                uid: user.uid,
                email: user.email,
                name: foundUserData.name || foundUserData.nome || user.displayName,
                type: foundUserData.type || foundUserData.tipo
            };
            
            // Update the document with UID as key
            await setDoc(doc(db, 'users', user.uid), {
                name: currentUser.name,
                email: currentUser.email,
                type: currentUser.type,
                nome: currentUser.name,
                tipo: currentUser.type
            });

        } else {
            const userData = userDoc.data();
            currentUser = {
                uid: user.uid,
                email: user.email,
                name: userData.name || userData.nome || user.displayName,
                type: userData.type || userData.tipo
            };
        }

        userNameDisplay.textContent = currentUser.name;

        // Check if user has already submitted evaluation
        const responsesRef = collection(db, 'responses');
        const responseQuery = query(responsesRef, where('userId', '==', user.uid));
        const responseDocs = await getDocs(responseQuery);
        
        if (!responseDocs.empty) {
            showScreen('thankyou');
            return;
        }

        // Load questions for user type
        await loadUserQuestions();
        showScreen('evaluation');
        displayQuestion();
    } catch (error) {
        console.error('Error handling user login:', error);
        alert('Erro ao processar login. Tente novamente.');
    }
}

async function loadUserQuestions() {
    try {
        // Load questions from JSON file
        const response = await fetch('avaliacao_cpa_perguntas.json');
        const allQuestions = await response.json();
        
        // Map user type correctly
        const userTypeMap = {
            'alunos': 'aluno',
            'professores': 'professor',
            'tecnicos': 'funcionario'
        };
        
        const questionField = userTypeMap[currentUser.type];
        
        // Filter questions based on user type
        userQuestions = allQuestions.filter(q => {
            return q[questionField] === true;
        });

        // Initialize answers object
        userAnswers = {};
        userQuestions.forEach(q => {
            userAnswers[q.id] = null;
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Erro ao carregar perguntas. Tente novamente.');
    }
}

function displayQuestion() {
    const question = userQuestions[currentQuestionIndex];
    const questionNumber = document.getElementById('question-number');
    const questionText = document.getElementById('question-text');
    const progressFill = document.getElementById('progress-fill');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const submitButton = document.getElementById('submit-button');

    // Update question display
    questionNumber.textContent = `Pergunta ${currentQuestionIndex + 1} de ${userQuestions.length}`;
    questionText.textContent = question.texto;

    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / userQuestions.length) * 100;
    progressFill.style.width = `${progress}%`;

    // Clear previous selection
    const radioButtons = document.querySelectorAll('input[name="rating"]');
    radioButtons.forEach(radio => {
        radio.checked = false;
        if (userAnswers[question.id] && radio.value == userAnswers[question.id]) {
            radio.checked = true;
        }
    });

    // Update navigation buttons
    prevButton.disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === userQuestions.length - 1;
    nextButton.style.display = isLastQuestion ? 'none' : 'flex';
    submitButton.style.display = isLastQuestion ? 'flex' : 'none';

    // Update next button state
    updateNextButtonState();

    // Add event listeners to radio buttons
    radioButtons.forEach(radio => {
        radio.addEventListener('change', handleAnswerChange);
    });
}

function handleAnswerChange(e) {
    const question = userQuestions[currentQuestionIndex];
    userAnswers[question.id] = parseInt(e.target.value);
    updateNextButtonState();
}

function updateNextButtonState() {
    const question = userQuestions[currentQuestionIndex];
    const nextButton = document.getElementById('next-button');
    const submitButton = document.getElementById('submit-button');
    
    const hasAnswer = userAnswers[question.id] !== null;
    nextButton.disabled = !hasAnswer;
    submitButton.disabled = !hasAnswer;
}

// Navigation functions
document.getElementById('prev-button').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
});

document.getElementById('next-button').addEventListener('click', () => {
    if (currentQuestionIndex < userQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
});

document.getElementById('submit-button').addEventListener('click', async () => {
    // Check if all questions are answered
    const unansweredQuestions = userQuestions.filter(q => userAnswers[q.id] === null);
    if (unansweredQuestions.length > 0) {
        alert(`Por favor, responda todas as perguntas antes de enviar. ${unansweredQuestions.length} pergunta(s) não respondida(s).`);
        return;
    }

    try {
        // Save responses to database
        await addDoc(collection(db, 'responses'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentUser.name,
            userType: currentUser.type,
            answers: userAnswers,
            submittedAt: new Date().toISOString(),
            timestamp: serverTimestamp()
        });

        showScreen('thankyou');
    } catch (error) {
        console.error('Error submitting evaluation:', error);
        alert('Erro ao enviar avaliação. Tente novamente.');
    }
});

async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        userQuestions = [];
        currentQuestionIndex = 0;
        userAnswers = {};
        showScreen('login');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showScreen(screenName) {
    loginScreen.classList.remove('active');
    evaluationScreen.classList.remove('active');
    thankyouScreen.classList.remove('active');

    switch(screenName) {
        case 'login':
            loginScreen.classList.add('active');
            break;
        case 'evaluation':
            evaluationScreen.classList.add('active');
            break;
        case 'thankyou':
            thankyouScreen.classList.add('active');
            break;
    }
}