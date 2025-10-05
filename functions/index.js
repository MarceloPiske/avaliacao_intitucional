/* eslint-disable linebreak-style */
/* eslint-disable max-len */
// Importa os módulos necessários do Firebase (estilo CommonJS)
const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp} = require("firebase-admin/app");
const logger = require("firebase-functions/logger");

// Carrega os dados do arquivo JSON local. Simples assim.
const questionsData = require("./avaliacao_cpa_perguntas.json");

// Inicializa o app do Firebase Admin
initializeApp();

/**
 * Função HTTP para migrar as perguntas do JSON para o Firestore.
 */
exports.migrarPerguntas = onRequest(async (req, res) => {
  logger.info("Iniciando a migração das perguntas...");

  const db = getFirestore();
  const batch = db.batch(); // Usar batch é mais eficiente!

  try {
    questionsData.forEach((question) => {
      // Cria uma referência para o documento usando o ID da pergunta
      const docRef = db.collection("perguntas_avaliacao_institucional").doc(question.id.toString());
      batch.set(docRef, question); // Adiciona a operação ao batch
    });

    // Envia todas as perguntas para o Firestore de uma só vez
    await batch.commit();

    const successMessage = `Migração concluída! ${questionsData.length} perguntas foram adicionadas.`;
    logger.info(successMessage);
    res.status(200).send(successMessage);
  } catch (error) {
    logger.error("Erro durante a migração:", error);
    res.status(500).send("Ocorreu um erro ao migrar. Verifique os logs.");
  }
});
