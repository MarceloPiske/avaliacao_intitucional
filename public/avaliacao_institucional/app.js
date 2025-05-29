import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA_57qRozqidb0HsvkssMkZw3DZqRWew9s",
  authDomain: "avaliacao-institucional-a1764.firebaseapp.com",
  projectId: "avaliacao-institucional-a1764",
  storageBucket: "avaliacao-institucional-a1764.firebasestorage.app",
  messagingSenderId: "598583018519",
  appId: "1:598583018519:web:d9f1f96f2434367e6ec852",
  measurementId: "G-W7YZK1RG3F"
};

// Inicializando Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Estados da aplicação
let currentUser = null;
let userRole = null;
let questions = [];
let userSubmitted = false; // Flag para verificar se o usuário já respondeu

// Elementos DOM
const loginSection = document.getElementById('login-section');
const surveySection = document.getElementById('survey-section');
const confirmationSection = document.getElementById('confirmation-section');
const questionsContainer = document.getElementById('questions-container');
const userRoleSpan = document.getElementById('user-role');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const googleSignInBtn = document.getElementById('google-signin-btn');
const codeLoginForm = document.getElementById('code-login-form');
const surveyForm = document.getElementById('survey-form');
const printBtn = document.getElementById('print-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminLink = document.getElementById('admin-link');
const adminLoginSection = document.getElementById('admin-login-section');
const returnToUserLogin = document.getElementById('return-to-user-login');

// Carregar perguntas do JSON
async function loadQuestions() {
    try {
        const response = await fetch('./avaliacao_cpa_perguntas.json');
        questions = await response.json();
        console.log('Perguntas carregadas:', questions);
    } catch (error) {
        console.error('Erro ao carregar perguntas:', error);
    }
}

// Filtrar perguntas baseadas no papel do usuário
function filterQuestionsByRole(role) {
    return questions.filter(question => {
        if (role === 'aluno' && question.aluno) return true;
        if (role === 'professor' && question.professor) return true;
        if (role === 'funcionario' && question.funcionario) return true;
        return false;
    });
}

// Renderizar perguntas
function renderQuestions(filteredQuestions) {
    questionsContainer.innerHTML = '';
    
    filteredQuestions.forEach(question => {
        const questionId = `q${question.id}`;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        
        questionDiv.innerHTML = `
            <p><strong>${question.id}. ${question.texto}</strong></p>
            <p class="question-meta">Eixo ${question.eixo} | Dimensão ${question.dimensao}</p>
            <label><input type="radio" name="${questionId}" value="1" required> Discordo totalmente</label><br>
            <label><input type="radio" name="${questionId}" value="2"> Discordo</label><br>
            <label><input type="radio" name="${questionId}" value="3"> Concordo parcialmente</label><br>
            <label><input type="radio" name="${questionId}" value="4"> Concordo</label><br>
            <label><input type="radio" name="${questionId}" value="5"> Concordo totalmente</label>
        `;
        
        questionsContainer.appendChild(questionDiv);
    });
}

// Login com Google 
async function loginWithGoogle() {
    try {
        // Configurar para aceitar apenas os domínios permitidos
        googleProvider.setCustomParameters({
            hd: 'seminarioconcordia.com.br' // Domínio padrão para o prompt
        });
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Verificar domínios permitidos
        const email = user.email;
        const allowedDomains = ['seminarioconcordia.com.br', 'faculdadeluteranaconcordia.com.br'];
        const domain = email.split('@')[1];
        
        if (!allowedDomains.includes(domain)) {
            await signOut(auth);
            alert("Por favor, use um email institucional válido para acessar o sistema.");
            return;
        }
        
        currentUser = user;
        
        // Verificar se o usuário já existe no Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            // Usuário já existe, verificar se já respondeu
            const userData = userSnap.data();
            userRole = userData.role;
            userSubmitted = userData.submitted || false;
            
            if (userSubmitted) {
                alert("Você já respondeu à avaliação. Obrigado pela participação!");
                // Mostrar tela de confirmação diretamente
                loginSection.classList.remove('active');
                confirmationSection.classList.add('active');
                return;
            }
            
            startSurvey();
        } else {
            // Usuário não existe, solicitar papel
            showRoleSelection();
        }
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            console.error("Erro no login com Google:", error);
            alert("Erro de autenticação: " + error.message);
        }
    }
}

// Mostrar seleção de papel para novos usuários
function showRoleSelection() {
    // Esconder seção de login
    loginSection.classList.remove('active');
    
    // Criar e mostrar modal de seleção de papel
    const modal = document.createElement('div');
    modal.className = 'role-selection-modal';
    
    modal.innerHTML = `
        <div class="role-selection-content">
            <h2>Selecione seu perfil</h2>
            <p>Por favor, selecione qual é o seu papel na instituição:</p>
            <div class="role-options">
                <button id="role-aluno" class="role-btn">Aluno</button>
                <button id="role-professor" class="role-btn">Professor</button>
                <button id="role-funcionario" class="role-btn">Funcionário</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar event listeners para os botões
    document.getElementById('role-aluno').addEventListener('click', () => selectRole('aluno'));
    document.getElementById('role-professor').addEventListener('click', () => selectRole('professor'));
    document.getElementById('role-funcionario').addEventListener('click', () => selectRole('funcionario'));
}

// Selecionar papel e criar usuário no Firestore
async function selectRole(role) {
    try {
        userRole = role;
        
        // Salvar usuário no Firestore
        await setDoc(doc(db, "users", currentUser.uid), {
            email: currentUser.email,
            role: role,
            displayName: currentUser.displayName || '',
            created_at: serverTimestamp(),
            submitted: false
        });
        
        // Remover modal
        const modal = document.querySelector('.role-selection-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
        
        // Iniciar pesquisa
        startSurvey();
    } catch (error) {
        console.error("Erro ao salvar perfil do usuário:", error);
        alert("Erro ao salvar perfil: " + error.message);
    }
}

// Iniciar pesquisa
function startSurvey() {
    userRoleSpan.textContent = userRole;
    
    // Filtrar e renderizar perguntas específicas para o papel
    const filteredQuestions = filterQuestionsByRole(userRole);
    renderQuestions(filteredQuestions);
    
    // Mostrar seção da pesquisa
    loginSection.classList.remove('active');
    surveySection.classList.add('active');
}

// Enviar respostas
async function submitSurvey(event) {
    event.preventDefault();
    
    const answers = {};
    const formData = new FormData(surveyForm);
    
    // Coletar todas as respostas
    for (const [name, value] of formData.entries()) {
        if (name !== 'suggestions') {
            answers[name] = parseInt(value);
        }
    }
    
    // Validar se todas as perguntas foram respondidas
    const filteredQuestions = filterQuestionsByRole(userRole);
    const allQuestionsAnswered = filteredQuestions.every(question => {
        const questionId = `q${question.id}`;
        return answers[questionId] !== undefined;
    });
    
    if (!allQuestionsAnswered) {
        alert("Por favor, responda todas as perguntas.");
        return;
    }
    
    try {
        // Adicionar resposta ao Firestore
        await addDoc(collection(db, "survey_responses"), {
            user_id: currentUser.uid || null,
            role: userRole,
            answers: answers,
            suggestions: formData.get('suggestions') || '',
            created_at: serverTimestamp()
        });
        
        // Se for login com Google, marcar usuário como já respondeu
        if (currentUser.uid) {
            await updateDoc(doc(db, "users", currentUser.uid), {
                submitted: true,
                submitted_at: serverTimestamp()
            });
        }
        
        // Se login foi por código, marcar como usado
        if (currentUser.isCodeLogin) {
            await updateDoc(doc(db, "access_codes", currentUser.accessCodeId), {
                used: true,
                used_at: serverTimestamp()
            });
        }
        
        // Mostrar confirmação
        surveySection.classList.remove('active');
        confirmationSection.classList.add('active');
    } catch (error) {
        console.error("Erro ao enviar respostas:", error);
        alert("Erro ao enviar respostas: " + error.message);
    }
}

// Login com código de acesso
async function loginWithCode(accessCode) {
    try {
        // Verificar se o código existe e não foi usado
        const q = query(collection(db, "access_codes"), 
                         where("code", "==", accessCode), 
                         where("used", "==", false));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert("Código inválido ou já utilizado.");
            return;
        }
        
        const codeDoc = querySnapshot.docs[0];
        const codeData = codeDoc.data();
        
        // Salvar referência para marcar como usado após submissão
        currentUser = { accessCodeId: codeDoc.id, isCodeLogin: true };
        userRole = codeData.role || 'funcionario';
        
        startSurvey();
    } catch (error) {
        console.error("Erro ao verificar código:", error);
        alert("Erro ao verificar código: " + error.message);
    }
}

// Logout
function logout() {
    if (!currentUser.isCodeLogin) {
        signOut(auth);
    }
    
    // Resetar estado e voltar para tela de login
    currentUser = null;
    userRole = null;
    
    confirmationSection.classList.remove('active');
    loginSection.classList.add('active');
    
    // Limpar formulários
    codeLoginForm.reset();
    surveyForm.reset();
}

// Imprimir formulário
function printSurvey() {
    window.print();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar perguntas
    await loadQuestions();
    
    // Tabs de login
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Desativar todos os botões e conteúdos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Ativar o botão clicado e conteúdo correspondente
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Botão de login com Google
    googleSignInBtn.addEventListener('click', loginWithGoogle);
    
    // Formulário de login com código
    codeLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const accessCode = document.getElementById('access-code').value;
        loginWithCode(accessCode);
    });
    
    // Formulário da pesquisa
    surveyForm.addEventListener('submit', submitSurvey);
    
    // Botão de impressão
    printBtn.addEventListener('click', printSurvey);
    
    // Botão de logout
    logoutBtn.addEventListener('click', logout);
    
    // Link para área de administrador
    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.remove('active');
        adminLoginSection.classList.add('active');
    });
    
    returnToUserLogin.addEventListener('click', (e) => {
        e.preventDefault();
        adminLoginSection.classList.remove('active');
        loginSection.classList.add('active');
    });
});