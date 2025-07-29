export function setupAdminAuth() {
    const googleLoginButton = document.getElementById('google-login-button');
    const logoutButton = document.getElementById('logout-button');
    const loginError = document.getElementById('login-error');
    const adminPanel = document.getElementById('admin-panel');
    const loginContainer = document.getElementById('login-container');

    // Check if user is already logged in as admin
    if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('isAdmin') === 'true') {
        showAdminPanel();
    }

    // Handle Google login
    googleLoginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Only allow specific domains
        provider.setCustomParameters({
            hd: 'seminarioconcordia.com.br,faculdadeluterananconcordia.com.br'
        });
        
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                // Get user email
                const email = result.user.email;
                
                // Check if user is an admin
                checkIfAdmin(result.user.uid, email);
            })
            .catch((error) => {
                console.error("Error during Google sign in:", error);
                loginError.textContent = 'Erro ao fazer login: ' + error.message;
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

    // Check if user is an admin
    function checkIfAdmin(uid, email) {
        firebase.firestore().collection('admins')
            .where('email', '==', email)
            .get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    // User is an admin
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userType', 'admin');
                    localStorage.setItem('userId', uid);
                    localStorage.setItem('userName', querySnapshot.docs[0].data().nome || 'Administrador');
                    localStorage.setItem('isAdmin', 'true');
                    showAdminPanel();
                } else {
                    // User is not an admin
                    firebase.auth().signOut();
                    loginError.textContent = 'Você não tem permissão para acessar o painel administrativo.';
                }
            })
            .catch((error) => {
                console.error("Error checking admin status:", error);
                loginError.textContent = 'Erro ao verificar status de administrador: ' + error.message;
            });
    }

    function showAdminPanel() {
        loginContainer.style.display = 'none';
        adminPanel.style.display = 'flex';
    }

    function hideAdminPanel() {
        adminPanel.style.display = 'none';
        loginContainer.style.display = 'flex';
        loginError.textContent = '';
    }
}