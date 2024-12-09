import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { init_app } from "./init_firebase_app.js"

// Inicializa o Firebase
const app = init_app();
const auth = getAuth(app);

/* NOTE Utils section == */
function pages_redirect(page) {
    if (!window.location.href.includes(page + ".html")) {
        if (!window.location.href.includes("avaliacao_intitucional"))
            window.location.href = "/avaliacao_intitucional/" + page + ".html"
        window.location.href = page + ".html";
    }
}
/* NOTE Utils section == */
// Classe FirebaseAuth
export class FirebaseAuth {
    constructor() {
        this.provider = new GoogleAuthProvider();

        // Filtrar por domínio (substitua "example.com" pelo domínio desejado)
        /* this.provider.setCustomParameters({
            hd: "seminarioconcordia.com.br" // Substitua pelo domínio permitido, como "suaempresa.com"
        }); */
    }

    // Verifica o status de login
    check_login_status(callback) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Usuário está logado:", user);
                callback(user); // Executa o callback passando o usuário logado
                if (user.email.includes("secretaria") || user.email.includes("leonidiosg")) {
                    pages_redirect("visualizar_respostas")

                } else {
                    pages_redirect("index")
                }
            } else {
                console.log("Usuário não está logado");
                pages_redirect("login")
                callback(null);

            }
        });
    }

    // Login com Google
    async loginWithGoogle() {

        try {
            // Faz o login com o provedor Google
            const result = await signInWithPopup(auth, this.provider);

            // Obtém o email do usuário autenticado
            const user = result.user
            const email = result.user.email;
            const domain = email.split("@")[1]; // Extrai o domínio do email

            // Lista de domínios permitidos
            const allowedDomains = ["seminarioconcordia.com.br", "faculdadeluteranaconcordia.com.br"];

            // Verifica se o domínio do email é permitido
            if (allowedDomains.includes(domain)) {
                console.log("Autenticação bem-sucedida para:", email);
                // Continue o fluxo da aplicação
                return user
            } else {
                // Se o domínio não for permitido, desloga o usuário
                await signOut(auth);
                console.error("Domínio não permitido:", domain);
                alert("Seu domínio de email não é autorizado para login.");
            }
        } catch (error) {
            console.error("Erro na autenticação:", error.message);
            alert("Erro ao fazer login. Tente novamente.");
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(auth);
            console.log("Usuário deslogado com sucesso!");
            pages_redirect("login")
        } catch (error) {
            console.error("Erro ao deslogar:", error);
        }
    }
}

// Exemplo de uso
(async () => {
    const authInstance = new FirebaseAuth();

    // Verifica o status de login
    authInstance.check_login_status((user) => {
        if (user) {
            console.log("Usuário conectado:", user.email);
        } else {
            console.log("Nenhum usuário conectado.");
        }
    });
})();
