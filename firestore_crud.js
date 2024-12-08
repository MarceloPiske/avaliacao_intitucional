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
import { init_app } from "./init_firebase_app.js"

// Inicializa o Firebase
const app = init_app();
const db = getFirestore(app);

// Classe CRUD
export class FirebaseCRUD {
    constructor(collectionName) {
        this.collection = collectionName;
    }

    // Create/Insert
    async create(docData) {
        try {
            const { id, ...data } = docData;
            const docRef = id ? doc(db, this.collection, id) : doc(collection(db, this.collection));
            await setDoc(docRef, data);
            console.log("Documento criado com sucesso!");
            return true
        } catch (error) {
            console.error("Erro ao criar documento:", error);
        }
    }

    // Create Multiple
    async createMultiple(documents) {
        try {
            const promises = documents.map(async (docData) => {
                const { id, ...data } = docData; // Extraindo ID do restante dos dados
                const docRef = id ? doc(db, this.collection, id) : doc(collection(db, this.collection));
                await setDoc(docRef, data);
            });

            await Promise.all(promises); // Aguarda todas as criações serem concluídas
            console.log("Documentos criados com sucesso!");
        } catch (error) {
            console.error("Erro ao criar múltiplos documentos:", error);
        }
    }

    // Read/Get by ID
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

    // Read with where condition
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
    
    // Read All
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

    // Update
    async update(id, data) {
        try {
            const docRef = doc(db, this.collection, id);
            await updateDoc(docRef, data);
            console.log("Documento atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar documento:", error);
        }
    }

    // Delete
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

/* // Exemplo de uso
(async () => {
    const usersCRUD = new FirebaseCRUD("users");

    // Create
    await usersCRUD.create("user1", { name: "John Doe", email: "john@example.com" });

    // Read
    const user = await usersCRUD.read("user1");
    console.log(user);

    // Update
    await usersCRUD.update("user1", { email: "newjohn@example.com" });

    // Read All
    const allUsers = await usersCRUD.readAll();
    console.log(allUsers);

    // Delete
    await usersCRUD.delete("user1");
})();
 */