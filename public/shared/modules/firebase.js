import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_57qRozqidb0HsvkssMkZw3DZqRWew9s",
    authDomain: "avaliacao-institucional-a1764.firebaseapp.com",
    projectId: "avaliacao-institucional-a1764",
    storageBucket: "avaliacao-institucional-a1764.firebasestorage.app",
    messagingSenderId: "598583018519",
    appId: "1:598583018519:web:d9f1f96f2434367e6ec852",
    measurementId: "G-W7YZK1RG3F"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firebase Auth Module
export class FirebaseAuth {
    constructor() {
        this.provider = new GoogleAuthProvider();
    }

    check_login_status(callback) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                callback(user);
                // Let each page handle its own redirect logic
            } else {
                callback(null);
            }
        });
    }

    async loginWithGoogle() {
        try {
            const result = await signInWithPopup(auth, this.provider);
            const user = result.user;
            const email = result.user.email;
            const domain = email.split("@")[1];

            const allowedDomains = ["seminarioconcordia.com.br", "faculdadeluteranaconcordia.com.br"];

            if (allowedDomains.includes(domain)) {
                const usersCRUD = new FirebaseCRUD("users");
                const registeredUsers = await usersCRUD.readWhere("email", "==", email);
                
                if (registeredUsers.length > 0) {
                    const userData = registeredUsers[0];
                    
                    // Check if user has uid, if not, update it with the authentication uid
                    if (!userData.uid) {
                        await usersCRUD.update(userData.id, { uid: user.uid });
                        console.log("UID atualizado para o usuário:", email);
                    }
                    
                    localStorage.setItem("user_id", userData.id);
                    localStorage.setItem("user_tipos", JSON.stringify(userData.tipos || ["aluno"]));
                    localStorage.setItem("user_email", email);
                    localStorage.setItem("user_name", userData.displayName || user.displayName);
                    
                    console.log("Usuário autorizado e registrado:", email);
                    return user;
                } else {
                    await signOut(auth);
                    console.error("Usuário não está registrado no sistema:", email);
                    throw new Error("Seu email não esta cadastrado, entre em contato com a secretaria");
                }
            } else {
                await signOut(auth);
                console.error("Domínio não permitido:", domain);
                throw new Error("Seu domínio de email não é autorizado para login.");
            }
        } catch (error) {
            console.error("Erro na autenticação:", error.message);
            throw error; // Re-throw to be handled by the calling code
        }
    }

    async logout() {
        try {
            await signOut(auth);
            // Clear all stored user data
            localStorage.removeItem("user_id");
            localStorage.removeItem("user_tipos");
            localStorage.removeItem("user_email");
            localStorage.removeItem("user_name");
            localStorage.removeItem("atual_turma_id");
            localStorage.removeItem("atual_disciplina_nome");
            localStorage.removeItem("atual_professor_nome");
            localStorage.removeItem("atual_professor_id");
            localStorage.removeItem("atual_disciplina_id");
            
            console.log("Usuário deslogado com sucesso!");
            this.pages_redirect("login");
        } catch (error) {
            console.error("Erro ao deslogar:", error);
            throw error;
        }
    }

    pages_redirect(page) {
        const currentPath = window.location.pathname;
        const targetPath = `${page}.html`;
        
        // Only redirect if not already on the target page
        if (!currentPath.includes(targetPath)) {
            if (window.location.href.includes("avaliacao_intitucional")) {
                window.location.href = `/avaliacao_intitucional/${targetPath}`;
            } else {
                window.location.href = targetPath;
            }
        }
    }
}

// Firebase CRUD Module
export class FirebaseCRUD {
    constructor(collectionName) {
        this.collection = collectionName;
    }

    async create(docData) {
        try {
            const { id, ...data } = docData;
            const docRef = id ? doc(db, this.collection, id) : doc(collection(db, this.collection));
            await setDoc(docRef, data);
            console.log("Documento criado com sucesso!");
            return true;
        } catch (error) {
            console.error("Erro ao criar documento:", error);
        }
    }

    async createMultiple(documents) {
        try {
            const promises = documents.map(async (docData) => {
                const { id, ...data } = docData;
                const docRef = id ? doc(db, this.collection, id) : doc(collection(db, this.collection));
                await setDoc(docRef, data);
            });

            await Promise.all(promises);
            console.log("Documentos criados com sucesso!");
        } catch (error) {
            console.error("Erro ao criar múltiplos documentos:", error);
        }
    }

    async read(id) {
        try {
            const docRef = doc(db, this.collection, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log("Dados do documento:", docSnap.data());
                return docSnap.data();
            } else {
                console.log("Nenhum documento encontrado!");
                return null;
            }
        } catch (error) {
            console.error("Erro ao ler documento:", error);
        }
    }

    async readWhere(field, operator, value) {
        try {
            const q = query(collection(db, this.collection), where(field, operator, value));
            const querySnapshot = await getDocs(q);

            const documents = [];
            querySnapshot.forEach((doc) => {
                documents.push({ id: doc.id, ...doc.data() });
            });

            console.log(`Documentos encontrados com ${field} ${operator} ${value}:`, documents);
            return documents;
        } catch (error) {
            console.error("Erro ao buscar documentos com condição:", error);
        }
    }
    
    async readAll() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collection));
            const documents = [];
            querySnapshot.forEach((doc) => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            console.log("Todos os documentos:", documents);
            return documents;
        } catch (error) {
            console.error("Erro ao obter documentos:", error);
        }
    }

    async update(id, data) {
        try {
            const docRef = doc(db, this.collection, id);
            await updateDoc(docRef, data);
            console.log("Documento atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar documento:", error);
        }
    }

    async delete(id) {
        try {
            const docRef = doc(db, this.collection, id);
            await deleteDoc(docRef);
            console.log("Documento excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir documento:", error);
        }
    }
}