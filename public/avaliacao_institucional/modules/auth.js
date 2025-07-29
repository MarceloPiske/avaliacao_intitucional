export function setupAuth() {
    const emailTab = document.getElementById('email-tab');
    const codeTab = document.getElementById('code-tab');
    const emailLogin = document.getElementById('email-login');
    const codeLogin = document.getElementById('code-login');
    const googleLoginButton = document.getElementById('google-login-button');
    const codeLoginButton = document.getElementById('code-login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginError = document.getElementById('login-error');
    const adminPanel = document.getElementById('admin-panel');
    const loginContainer = document.getElementById('login-container');

    // Check if user is already logged in
    if (localStorage.getItem('isLoggedIn') === 'true') {
        checkAdminAccess();
    }

    // Handle tab switching
    emailTab.addEventListener('click', () => {
        emailTab.classList.add('active');
        codeTab.classList.remove('active');
        emailLogin.style.display = 'block';
        codeLogin.style.display = 'none';
        loginError.textContent = '';
    });

    codeTab.addEventListener('click', () => {
        codeTab.classList.add('active');
        emailTab.classList.remove('active');
        codeLogin.style.display = 'block';
        emailLogin.style.display = 'none';
        loginError.textContent = '';
    });

    // Handle Google login
    googleLoginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Only allow specific domains
        provider.setCustomParameters({
            hd: 'seminarioconcordia.com.br,faculdadeluterananconcordia.com.br'
        });
        
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                // Get user email domain
                const email = result.user.email;
                const domain = email.substring(email.lastIndexOf('@') + 1);
                
                // Verify domain
                if (domain === 'seminarioconcordia.com.br' || domain === 'faculdadeluterananconcordia.com.br') {
                    // Check if user exists in our database
                    checkUserType(result.user.uid, email);
                } else {
                    // Sign out if domain is not allowed
                    firebase.auth().signOut();
                    loginError.textContent = 'Este email não é de um domínio institucional permitido.';
                }
            })
            .catch((error) => {
                console.error("Error during Google sign in:", error);
                loginError.textContent = 'Erro ao fazer login: ' + error.message;
            });
    });

    // Handle code login for staff
    codeLoginButton.addEventListener('click', () => {
        const staffCode = document.getElementById('staff-code').value;
        const password = document.getElementById('password').value;

        if (!staffCode || !password) {
            loginError.textContent = 'Por favor, preencha todos os campos.';
            return;
        }

        // Check if staff code exists in usuarios collection
        firebase.firestore().collection('users')
            .where('codigo', '==', staffCode)
            .where('tipo', '==', 'tecnicos')
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    loginError.textContent = 'Código de funcionário inválido.';
                    return;
                }

                const userData = querySnapshot.docs[0].data();
                
                // Simple password check
                if (userData.senha === password) {
                    // Check if staff is an admin (separate collection)
                    checkIfAdmin(userData.email, querySnapshot.docs[0].id, userData.nome, 'tecnicos');
                } else {
                    loginError.textContent = 'Senha incorreta.';
                }
            })
            .catch((error) => {
                console.error("Error checking staff code:", error);
                loginError.textContent = 'Erro ao verificar código: ' + error.message;
            });
    });

    // Handle logout
    logoutButton.addEventListener('click', () => {
        // Sign out from Firebase
        firebase.auth().signOut().then(() => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userType');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('isAdmin');
            hideAdminPanel();
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    });

    // Check user type by email
    function checkUserType(uid, email) {
        firebase.firestore().collection('users')
            .where('email', '==', email)
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    // User not found in our database
                    firebase.auth().signOut();
                    loginError.textContent = 'Usuário não encontrado no sistema. Por favor, contate o administrador.';
                    return;
                }
                
                const userData = querySnapshot.docs[0].data();
                const userType = userData.role;
                
                // Check if user is admin in the admin collection
                checkIfAdmin(email, querySnapshot.docs[0].id, userData.nome, userType);
            })
            .catch((error) => {
                console.error("Error checking user type:", error);
                firebase.auth().signOut();
                loginError.textContent = 'Erro ao verificar perfil de usuário: ' + error.message;
            });
    }

    // Check if user is an admin
    function checkIfAdmin(email, userId, userName, userType) {
        firebase.firestore().collection('admins')
            .where('email', '==', email)
            .get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    // User is an admin
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userType', 'admin');
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('userName', userName || 'Administrador');
                    localStorage.setItem('isAdmin', 'true');
                    showAdminPanel();
                } else {
                    // User is not an admin - show evaluation instead
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userType', userType);
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('userName', userName);
                    
                    // Show the evaluation interface
                    showEvaluationPanel(userName, userType);
                }
            })
            .catch((error) => {
                console.error("Error checking admin status:", error);
                loginError.textContent = 'Erro ao verificar status de administrador: ' + error.message;
            });
    }

    function showEvaluationPanel(userName, userType) {
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'none';
        document.getElementById('evaluation-container').style.display = 'flex';
        document.getElementById('user-name-display').textContent = userName;
        
        // Load questions for the user's type
        loadUserQuestions(userType);
    }

    function showAdminPanel() {
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'flex';
    }

    function hideAdminPanel() {
        adminPanel.style.display = 'none';
        loginContainer.style.display = 'flex';
        loginError.textContent = '';
        loginError.style.color = '#e74c3c'; // Reset color
        document.getElementById('staff-code').value = '';
        document.getElementById('password').value = '';
    }

    // Check if logged in user is an admin
    function checkAdminAccess() {
        if (localStorage.getItem('isAdmin') === 'true') {
            showAdminPanel();
        } else {
            hideAdminPanel();
            // Only show error if on admin page
            if (window.location.pathname.includes('admin.html')) {
                loginError.textContent = 'Você não tem permissão para acessar o painel administrativo.';
            } else {
                loginError.textContent = 'Login realizado com sucesso! Redirecionando para avaliação...';
                loginError.style.color = '#4b6cb7';
                
                // In a real app, redirect to evaluation page
                setTimeout(() => {
                    loginError.textContent = 'Sistema de avaliação em desenvolvimento. Por favor, aguarde.';
                }, 2000);
            }
        }
    }
}

// New function to load and display questions for evaluation
function loadUserQuestions(userType) {
    const questionContainer = document.getElementById('question-container');
    const questionText = document.getElementById('question-text');
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const submitButton = document.getElementById('submit-evaluation');
    const progressFill = document.getElementById('progress-fill');
    const progressCurrent = document.getElementById('progress-current');
    const progressTotal = document.getElementById('progress-total');
    const evaluationComplete = document.getElementById('evaluation-complete');
    const returnButton = document.getElementById('return-button');
    const evalLogoutButton = document.getElementById('eval-logout-button');
    
    let questions = [];
    let currentQuestionIndex = 0;
    let answers = {};
    
    // Fetch questions from JSON file
    fetch('avaliacao_cpa_perguntas.json')
        .then(response => response.json())
        .then(data => {
            // Filter questions for the user type
            console.log('Loading questions for user type:', userType);
            
            if (userType === 'aluno') {
                questions = data.filter(q => q.aluno);
            } else if (userType === 'professor') {
                questions = data.filter(q => q.professor);
            } else if (userType === 'tecnicos') {
                questions = data.filter(q => q.funcionario);
            }
            console.log('Loaded questions:', questions);
            
            // Initialize progress indicators
            progressTotal.textContent = questions.length;
            updateQuestion();
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            questionText.textContent = 'Erro ao carregar as perguntas. Por favor, tente novamente mais tarde.';
        });
    
    // Add event listeners
    prevButton.addEventListener('click', showPreviousQuestion);
    nextButton.addEventListener('click', showNextQuestion);
    submitButton.addEventListener('click', submitEvaluation);
    returnButton.addEventListener('click', returnToLogin);
    evalLogoutButton.addEventListener('click', returnToLogin);
    
    // Add listener for rating selection
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    ratingInputs.forEach(input => {
        input.addEventListener('change', () => {
            // Save answer when rating is selected
            const selectedValue = document.querySelector('input[name="rating"]:checked').value;
            saveAnswer(selectedValue);
        });
    });
    
    function updateQuestion() {
        if (currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
            const question = questions[currentQuestionIndex];
            questionText.textContent = question.texto;
            progressCurrent.textContent = currentQuestionIndex + 1;
            progressFill.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
            
            // Update buttons visibility
            prevButton.style.display = currentQuestionIndex === 0 ? 'none' : 'block';
            if (currentQuestionIndex === questions.length - 1) {
                nextButton.style.display = 'none';
                submitButton.style.display = 'block';
            } else {
                nextButton.style.display = 'block';
                submitButton.style.display = 'none';
            }
            
            // Clear previous selection
            ratingInputs.forEach(input => {
                input.checked = false;
            });
            
            // Set saved answer if exists
            console.log('Current question:', question);
            
            const questionId = question.id;
            if (answers[questionId]) {
                document.querySelector(`input[name="rating"][value="${answers[questionId]}"]`).checked = true;
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
        // Validate that a rating is selected
        const selectedRating = document.querySelector('input[name="rating"]:checked');
        if (!selectedRating) {
            console.log('No rating selected for question:', questions[currentQuestionIndex]);
            
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
        // Validate that a rating is selected for the last question
        const selectedRating = document.querySelector('input[name="rating"]:checked');
        if (!selectedRating) {
            alert('Por favor, selecione uma resposta antes de enviar.');
            return;
        }
        
        // Check if all questions are answered
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < questions.length) {
            if (!confirm(`Você respondeu ${answeredCount} de ${questions.length} perguntas. Deseja realmente enviar a avaliação incompleta?`)) {
                return;
            }
        }
        
        // Save answers to Firestore
        const userId = localStorage.getItem('userId');
        const userType = localStorage.getItem('userType');
        
        firebase.firestore().collection('survey_responses').add({
            userId: userId,
            userType: userType,
            answers: answers,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            year: new Date().getFullYear()
        })
        .then(() => {
            // Show completion message
            questionContainer.style.display = 'none';
            evaluationComplete.style.display = 'block';
        })
        .catch(error => {
            console.error('Error saving answers:', error);
            alert('Erro ao salvar suas respostas. Por favor, tente novamente.');
        });
    }
    
    function returnToLogin() {
        // Sign out from Firebase
        firebase.auth().signOut().then(() => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userType');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('isAdmin');
            
            // Reset evaluation UI
            questionContainer.style.display = 'block';
            evaluationComplete.style.display = 'none';
            currentQuestionIndex = 0;
            answers = {};
            
            // Show login container
            document.getElementById('evaluation-container').style.display = 'none';
            document.getElementById('login-container').style.display = 'flex';
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    }
}