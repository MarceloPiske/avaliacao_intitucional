/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
/* eslint-disable guard-for-in */
/* eslint-disable max-len */
const fs = require("fs");
const path = require("path");
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const {getFirestore, Timestamp, FieldValue} = require("firebase-admin/firestore");


admin.initializeApp();
const db = getFirestore();
const auth = admin.auth();

// Pasta onde os arquivos serão salvos
const OUTPUT_DIR = path.join(__dirname, "firestore-dumps");

exports.backupFirestore = async function backupFirestore() {
  // Garante que a pasta exista
  fs.mkdirSync(OUTPUT_DIR, {recursive: true});

  // Lista todas as coleções de primeiro nível
  const collections = await db.listCollections();

  for (const collection of collections) {
    const snapshot = await collection.get();
    const collData = {};

    snapshot.forEach((doc) => {
      collData[doc.id] = doc.data();
    });

    // Caminho do arquivo: ./firestore-dumps/<collection>.json
    const filePath = path.join(OUTPUT_DIR, `${collection.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(collData, null, 2));

    console.log(`✅  Coleção “${collection.id}” exportada para ${filePath}`);
  }

  console.log("\n🚀 Backup concluído!");
};


setGlobalOptions({timeoutSeconds: 540, memory: "2GiB"});

const disciplinas = require("./firestore-dumps/disciplinas.json");
const users = require("./firestore-dumps/users.json");
const respostas = require("./firestore-dumps/respostas.json");
const {logger} = require("firebase-functions");

// Dados dos novos professores que você forneceu, formatados para fácil uso
const newProfessorsData = {
  "Prunzel": {
    displayName: "Clovis Prunzel",
    emails: ["clovisjp@seminarioconcordia.com.br", "clovisprunzel@faculdadeluteranaconcordia.com.br"],
  },
  "Gedrat": {
    displayName: "Clovis Gedrat",
    emails: ["clovis@seminarioconcordia.com.br", "clovisgedrat@faculdadeluteranaconcordia.com.br"],
  },
  "Graff": {
    displayName: "Anselmo Graff",
    emails: ["anselmoeg@seminarioconariaconcordia.com.br", "agraff@faculdadeluteranaconcordia.com.br"],
  },
  "Linden": {
    displayName: "Gerson Linden",
    emails: ["gersonll@seminarioconcordia.com.br", "gersonlinden@faculdadeluteranaconcordia.com.br"],
  },
  "Hoffmann": {
    displayName: "Francis Hoffmann",
    emails: ["francis@seminarioconcordia.com.br", "francis@faculdadeluteranaconcordia.com.br"],
  },
  "Fuhrmann": {
    displayName: "Samuel Fuhrmann",
    emails: ["samuelfuhrmann@seminarioconcordia.com.br", "samuel@faculdadeluteranaconcordia.com.br"],
  },
  "Carla": {
    displayName: "Carla Rosana", // Nome "Carla" é curto, assume um nome completo aqui
    emails: ["carlarosana@seminarioconcordia.com.br", "carla@faculdadeluteranaconcordia.com.br"],
  },
  "Abner": {
    displayName: "Abner Campos", // Nome "Abner" é curto, assume um nome completo aqui
    emails: ["acampos@faculdadeluteranaconcordia.com.br"],
  },
  "Rios": {
    displayName: "Cesar Rios", // Assume nome completo
    emails: ["cesarmr@seminarioconcordia.com.br"],
  },
  "Silvio": {
    displayName: "Silvio FSF", // Assume nome completo
    emails: ["silviofsf@seminarioconcordia.com.br"],
  },
  "Blum": {
    displayName: "Raul Blum", // Assume nome completo
    emails: ["raulb@seminarioconcordia.com.br"],
  },
  "Scholz": {
    displayName: "Vilson Scholz", // Assume nome completo
    emails: ["vilsons@seminarioconcordia.com.br"],
  },
};

exports.migrarDados = onRequest(
    async (req, res) => {
      try {
        const semestre = "2024.2";
        const formularioId = "form_2024_2_t1";

        // --- 1. Cria o formulário padrão e suas questões (template) ---
        const questoesSet = new Set();
        Object.values(respostas).forEach((aval) => {
          ["disciplina", "aluno", "professor"].forEach((grupo) => {
            if (aval[grupo]) {
              Object.values(aval[grupo]).forEach((q) => questoesSet.add(q.pergunta));
            }
          });
        });

        const formRef = db.collection("ad_formularios").doc(formularioId);
        await formRef.set({
          titulo: `Avaliação Semestral ${semestre}`,
          ativo: true,
          dataCriacao: Timestamp.now(),
        });

        const batchForm = db.batch();
        Array.from(questoesSet).sort().forEach((texto, idx) => {
          const qRef = formRef.collection("questoes").doc(`q${idx + 1}`);
          batchForm.set(qRef, {
            texto,
            tipo: "escala_1_a_5",
            ordem: idx + 1,
          });
        });
        await batchForm.commit();
        console.log("1. Formulário e questões criados com sucesso.");

        // --- 2. PREPARAÇÃO: Mapeia professores existentes e identifica chaves ---
        // 'profMap': chave (ex: "Prunzel") -> UID do professor
        // 'existingProfessorsData': UID -> { displayName, email, ... } para facilitar lookup
        const profMap = {};
        const existingProfessorsData = {}; // Cache dos dados completos de usuários existentes

        Object.entries(users).forEach(([uid, u]) => {
          const nome = u.displayName || "";
          const chave = nome.split(" ").pop(); // Sobrenome como chave
          if (chave) profMap[chave] = uid; // Mapeia sobrenome para UID

          // Adiciona mapeamentos para facilitar a busca, como pelo email principal
          if (u.email) profMap[u.email.toLowerCase()] = uid;

          // Armazena os dados completos para lookup posterior do nome
          existingProfessorsData[uid] = u;
        });
        console.log("2.1 Mapeamento inicial de professores existentes (users.json) concluído.");


        // --- 2.2. CRIAÇÃO DE NOVOS PROFESSORES NA COLEÇÃO 'users' (se não existirem) ---
        const usersCreationBatch = db.batch();
        const createdProfessorUids = new Set(); // UIDs de professores recém-criados neste batch

        // Itera sobre a lista de professores que *deveriam* existir
        for (const [profKey, profData] of Object.entries(newProfessorsData)) {
          let profId = profMap[profKey]; // Tenta encontrar pelo sobrenome/chave
          let foundExisting = false;

          // Se não encontrou pelo sobrenome, tenta encontrar por um dos emails fornecidos
          if (!profId && profData.emails && profData.emails.length > 0) {
            for (const email of profData.emails) {
              if (profMap[email.toLowerCase()]) {
                profId = profMap[email.toLowerCase()];
                foundExisting = true;
                break;
              }
            }
          }

          // Se ainda não encontrou (realmente novo)
          if (!profId) {
          // GERA UM NOVO UID PARA O PROFESSOR E CRIA DOCUMENTO NA COLEÇÃO 'users'
            const newProfRef = db.collection("users").doc(); // <-- Cria na coleção 'users'
            profId = newProfRef.id;

            usersCreationBatch.set(newProfRef, {
              displayName: profData.displayName || `Professor ${profKey} (Placeholder)`,
              email: profData.emails && profData.emails[0] ? profData.emails[0] : null,
              emailsSecundarios: profData.emails ? profData.emails.slice(1) : [],
              role: "professor", // Atribui um papel de professor padrão
              tipos: ["professor"], // Adiciona tipo de usuário
              dataCriacao: Timestamp.now(),
              isPlaceholder: true, // Campo para identificar que este é um registro temporário
            });
            createdProfessorUids.add(profId); // Adiciona ao conjunto de UIDs recém-criados
            console.log(`Criando novo professor em 'users': ${profData.displayName} (UID: ${profId})`);
          } else {
            console.log(`Professor existente '${profData.displayName}' (UID: ${profId}) encontrado. Não será duplicado.`);
          }

          // Garante que o profMap inclua o professor recém-criado/identificado para uso futuro
          profMap[profKey] = profId; // Mapeia a chave para o UID
          // Se for um novo professor, adiciona seus dados ao cache de existentes para uso imediato
          if (!existingProfessorsData[profId] || createdProfessorUids.has(profId)) {
            existingProfessorsData[profId] = { // Adiciona dados para lookup de nome
              displayName: profData.displayName || `Professor ${profKey} (Placeholder)`,
              email: profData.emails && profData.emails[0] ? profData.emails[0] : null,
              role: "professor",
              tipos: ["professor"],
            };
          }
        }

        // Agora, percorre as disciplinas para garantir que todos os professores referenciados
        // tenham um UID associado, mesmo que não estivessem em newProfessorsData.
        // Isso captura professores que estão apenas em disciplinas.json (mas não users.json inicial nem newProfessorsData)
        for (const discId in disciplinas) {
          const disc = disciplinas[discId];
          const profKey = disc.professor;

          if (!profMap[profKey]) { // Se a chave do professor da disciplina não foi mapeada ainda
            const newProfRef = db.collection("users").doc(); // <-- Cria na coleção 'users'
            const profId = newProfRef.id;

            usersCreationBatch.set(newProfRef, {
              displayName: `Professor ${profKey} (Migração Genérica)`,
              email: `migracao-generica-${profKey.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
              role: "professor",
              tipos: ["professor"],
              dataCriacao: Timestamp.now(),
              isPlaceholder: true,
            });
            profMap[profKey] = profId;
            createdProfessorUids.add(profId); // Adiciona ao conjunto de UIDs recém-criados
            existingProfessorsData[profId] = { // Adiciona dados para lookup de nome
              displayName: `Professor ${profKey} (Migração Genérica)`,
              email: `migracao-generica-${profKey.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
              role: "professor",
              tipos: ["professor"],
            };
            console.log(`Criando professor genérico de disciplina em 'users': ${profKey} (UID: ${profId})`);
          }
        }

        // Executa o batch para criar/atualizar os documentos de usuário no Firestore
        await usersCreationBatch.commit();
        console.log("2.2 Professores (existentes e novos) mapeados e criados/atualizados na coleção 'users'.");

        // --- 3. Cria turmas ---
        const turmasBatch = db.batch();
        const turmasCriadas = new Set();

        for (const [discId, disc] of Object.entries(disciplinas)) {
          const profKey = disc.professor;
          const profId = profMap[profKey]; // Agora, profId deve sempre existir ou ser um placeholder!

          if (!profId) {
          // Este caso é um fallback de segurança, não deve mais ocorrer se a etapa 2.2 funcionou.
            console.error(`Erro crítico: Professor '${profKey}' não encontrado nem criado para a disciplina '${disc.name}'.`);
            continue;
          }

          const turmaId = `${discId}_${semestre.replace(".", "_")}`;
          if (turmasCriadas.has(turmaId)) {
            console.warn(`Aviso: Turma com ID "${turmaId}" já foi processada. Pulando duplicação.`);
            continue;
          }

          // Obtém o displayName do professor do cache de dados existentes
          let professorDisplayName = existingProfessorsData[profId] ? existingProfessorsData[profId].displayName : `Professor ${profKey} (Nome Indisponível)`;

          // Se por algum motivo o displayName ainda estiver ausente no cache (improvável agora),
          // pode tentar uma última busca no Firestore (menos eficiente) ou usar um placeholder.
          if (!professorDisplayName) {
            console.warn(`DisplayName para UID ${profId} não encontrado no cache. Usando placeholder.`);
            professorDisplayName = `Professor ${profKey} (Placeholder)`;
          }


          const turmaRef = db.collection("ad_turmas").doc(turmaId);
          turmasBatch.set(turmaRef, {
            disciplinaId: discId,
            disciplinaNome: disc.name,
            professorId: profId,
            professorNome: professorDisplayName,
            semestre,
            alunosInscritos: [],
            statusAvaliacao: "fechada",
            dataCriacao: Timestamp.now(),
          });
          turmasCriadas.add(turmaId);
        }
        await turmasBatch.commit();
        console.log("3. Turmas criadas com sucesso.");

        // --- 4. Atualiza alunosInscritos nas turmas ---
        const inscricaoBatch = db.batch();
        const turmasParaAtualizar = new Map();

        Object.values(respostas).forEach((aval) => {
          const discId = aval.discipline_id;
          const turmaId = `${discId}_${semestre.replace(".", "_")}`;
          const alunoId = aval.user_id;

          if (!turmasParaAtualizar.has(turmaId)) {
            turmasParaAtualizar.set(turmaId, new Set());
          }
          turmasParaAtualizar.get(turmaId).add(alunoId);
        });

        for (const [turmaId, alunosSet] of turmasParaAtualizar.entries()) {
          const turmaRef = db.collection("ad_turmas").doc(turmaId);
          inscricaoBatch.update(turmaRef, {
            alunosInscritos: FieldValue.arrayUnion(...Array.from(alunosSet)),
          });
        }
        await inscricaoBatch.commit();
        console.log("4. Alunos inscritos nas turmas atualizados com sucesso.");

        // --- 5. Insere avaliações e respostas ---
        for (const [avalId, aval] of Object.entries(respostas)) {
          const turmaId = `${aval.discipline_id}_${semestre.replace(".", "_")}`;
          const avalRef = db.collection("ad_avaliacoes").doc(avalId);

          await avalRef.set({
            alunoId: aval.user_id,
            turmaId,
            formularioId,
            dataResposta: aval.timestamp ? Timestamp.fromMillis(aval.timestamp * 1000) : Timestamp.now(),
            comentarios: aval.comentarios || "",
          });

          const respostasColRef = avalRef.collection("respostas");
          const respostaBatch = db.batch();

          ["disciplina", "aluno", "professor"].forEach((grupo) => {
            if (aval[grupo]) {
              Object.values(aval[grupo]).forEach((q) => {
                const respRef = respostasColRef.doc();
                respostaBatch.set(respRef, {
                  questaoTexto: q.pergunta,
                  respostaValor: q.resposta,
                });
              });
            }
          });
          await respostaBatch.commit();
        }
        console.log("5. Avaliações e respostas inseridas com sucesso.");

        res.status(200).send("Migração concluída com sucesso.");
      } catch (error) {
        console.error("Erro na migração:", error);
        res.status(500).send(`Erro na migração: ${error.message}`);
      }
    });


exports.migrarUsers = onRequest(async (req, res) => {
  try {
    const batchSize = 1000;
    let totalSincronizados = 0;

    const processarPagina = async (pageToken) => {
      const result = await auth.listUsers(batchSize, pageToken);
      const batch = db.batch();

      result.users.forEach((user) => {
        const userRef = db.collection("users").doc(user.uid);
        batch.set(userRef, {
          uid: user.uid,
          email: user.email || null,
          displayName: user.displayName || null,
          createdAt: Timestamp.fromDate(new Date(user.metadata.creationTime)),
        }, {merge: true});
      });

      await batch.commit();
      totalSincronizados += result.users.length;
      console.log(`Sincronizados ${result.users.length} usuários.`);

      if (result.pageToken) {
        await processarPagina(result.pageToken);
      }
    };

    await processarPagina();
    res.status(200).send(`Migração concluída com sucesso. Total sincronizados: ${totalSincronizados}`);
  } catch (error) {
    console.error("Erro ao migrar usuários:", error);
    res.status(500).send(`Erro ao migrar usuários: ${error.message}`);
  }
});


// =================================================================
// DADOS PARA MIGRAÇÃO (EMBUTIDOS NO CÓDIGO)
// =================================================================
const DADOS_PARA_MIGRAR = {
  "Semestres": [
    {
      "Semestre": "Semestre 1",
      "Ingresso": "2025/1",
      "Sala": "SALA 01",
      "Horarios": {
        "2ª feira": [{"Nome": "Sistemática I – Introdução à Teologia", "Codigo": "24048", "CargaHoraria": "60h", "Professor": "Fuhrmann", "Horario": "08:30-11:30"}],
        "3ª feira": [{"Nome": "Bíblia II: Introdução aos livros do Novo Testamento", "Codigo": "24005", "CargaHoraria": "60h", "Professor": "Linden", "Horario": "08:30-11:30"}],
        "4ª feira": [{"Nome": "Formação e pessoa do teólogo", "Codigo": "24021", "CargaHoraria": "30h", "Periodo": "fev-mai", "Professor": "Leonidio", "Horario": "08:30-11:30"}, {"Nome": "Lógica e Linguagem", "Codigo": "24036", "CargaHoraria": "30h", "Periodo": "mai-jul", "Professor": "Gedrat", "Horario": "08:30-11:30"}],
        "5ª feira": [{"Nome": "Língua Portuguesa", "Codigo": "24031", "CargaHoraria": "60h", "Professor": "Carla", "Horario": "08:30-11:30"}],
        "6ª feira": [{"Nome": "Bíblia I: Introdução aos livros do Antigo Testamento", "Codigo": "24004", "CargaHoraria": "60h", "Professor": "Graff", "Horario": "08:30-11:30"}],
        "EAD (Assíncrona)": [{"Nome": "Metodologia e pesquisa científica", "Codigo": "24037", "CargaHoraria": "30h", "Periodo": "fev-mai", "Professor": "Graff"}, {"Nome": "Introdução à Sociologia", "Codigo": "24029", "CargaHoraria": "30h", "Periodo": "mai-jul", "Professor": "Prunzel"}],
      },
    },
    {
      "Semestre": "Semestre 2",
      "Ingresso": "2024/2",
      "Sala": "SALA 02",
      "Horarios": {
        "2ª feira": [{"Nome": "Línguas bíblicas – Hebraico I", "Codigo": "24034", "CargaHoraria": "30h", "Periodo": "fev-mai", "Professor": "Francis", "Horario": "08:30-11:30"}, {"Nome": "Línguas bíblicas – Hebraico II", "Codigo": "24035", "CargaHoraria": "30h", "Periodo": "mai-jul", "Professor": "Francis", "Horario": "08:30-11:30"}],
        "3ª feira": [{"Nome": "História da Filosofia", "Codigo": "24022", "CargaHoraria": "60h", "Professor": "Gedrat", "Horario": "08:30-11:30"}],
        "4ª feira": [{"Nome": "Arte sacra I: teoria e prática da música", "Codigo": "24001", "CargaHoraria": "30h", "Periodo": "fev-mai", "Professor": "Abner", "Horario": "08:30-11:30"}, {"Nome": "Arte sacra II: teoria e prática da música", "Codigo": "24002", "CargaHoraria": "30h", "Periodo": "mai-jul", "Professor": "Abner", "Horario": "08:30-11:30"}],
        "5ª feira": [{"Nome": "Princípios de Interpretação Bíblica", "Codigo": "24059", "CargaHoraria": "60h", "Professor": "Graff", "Horario": "08:30-11:30"}],
        "6ª feira": [{"Nome": "História da Igreja Antiga e Medieval", "Codigo": "24023", "CargaHoraria": "60h", "Professor": "Francis", "Horario": "08:30-11:30"}],
        "EAD (Assíncrona)": [{"Nome": "Tópicos em estudos nos Direitos Humanos", "Codigo": "24056", "CargaHoraria": "60h", "Professor": "Prunzel"}, {"Nome": "Estudos na cultura e religiosidade brasileira", "Codigo": "24014", "CargaHoraria": "60h", "Professor": "Prunzel"}],
      },
    },
  ],
};


/**
 * =================================================================
 * FUNÇÃO DE MIGRAÇÃO DE DADOS DE HORÁRIOS (VIA GET)
 * =================================================================
 * Endpoint HTTP que pode ser ativado via GET para popular as coleções
 * a partir do objeto 'DADOS_PARA_MIGRAR' definido acima.
 *
 * @param {object} req - O objeto da requisição (não utilizado).
 * @param {object} res - O objeto da resposta.
 */
exports.migrarGradeHorariosGET = onRequest(
    // Configurações da função, como timeout.
    {timeoutSeconds: 300, memory: "256MiB"},
    async (req, res) => {
      logger.info("Iniciando migração da grade de horários via GET...");

      const counters = {
        turmasCriadas: 0,
        turmasIgnoradas: 0,
        disciplinasCriadas: 0,
        professoresCriados: 0,
      };

      // ATENÇÃO: Configure o ID do formulário padrão a ser associado às novas turmas.
      const FORMULARIO_ID_PADRAO = "form_2025_1_t1";

      try {
      // Loop principal usa a constante DADOS_PARA_MIGRAR em vez do corpo da requisição.
        for (const semestre of DADOS_PARA_MIGRAR.Semestres) {
          const semestreLetivo = semestre.Ingresso.replace("/", ".");

          for (const diaDaSemana in semestre.Horarios) {
            for (const aula of semestre.Horarios[diaDaSemana]) {
              const {id: disciplinaId, created: disciplinaCriada} =
              await getOrCreateDisciplina(aula.Codigo, aula.Nome);
              if (disciplinaCriada) counters.disciplinasCriadas++;

              const {id: professorId, created: professorCriado} =
              await getOrCreateProfessor(aula.Professor);
              if (professorCriado) counters.professoresCriados++;

              const turmaCriada = await createTurmaIfNotExists({
                semestre: semestreLetivo,
                disciplinaId,
                disciplinaNome: aula.Nome,
                professorId,
                professorNome: aula.Professor,
                formularioId: FORMULARIO_ID_PADRAO,
              });

              if (turmaCriada) counters.turmasCriadas++;
              else counters.turmasIgnoradas++;
            }
          }
        }

        const summaryHtml = `
        <h1>Migração Concluída!</h1>
        <p>O script de migração foi executado com sucesso.</p>
        <ul>
          <li><strong>Turmas Criadas:</strong> ${counters.turmasCriadas}</li>
          <li><strong>Turmas Ignoradas (já existiam):</strong> ${counters.turmasIgnoradas}</li>
          <li><strong>Disciplinas Criadas:</strong> ${counters.disciplinasCriadas}</li>
          <li><strong>Professores Criados:</strong> ${counters.professoresCriados}</li>
        </ul>
        <p>Verifique os logs da função no painel do Firebase para mais detalhes.</p>
      `;

        logger.info("Migração concluída com sucesso!", counters);
        res.status(200).send(summaryHtml);
      } catch (error) {
        logger.error("Erro crítico durante a migração:", error);
        res.status(500).send(`Ocorreu um erro interno. Verifique os logs da função. Erro: ${error.message}`);
      }
    },
);


// =================================================================
// FUNÇÕES AUXILIARES (INALTERADAS)
// =================================================================

async function getOrCreateDisciplina(codigo, nome) {
  const disciplinasRef = db.collection("disciplinas");
  const q = disciplinasRef.where("codigo", "==", codigo).limit(1);
  const snapshot = await q.get();

  if (snapshot.empty) {
    logger.info(`Criando nova disciplina: ${nome} (Código: ${codigo})`);
    const docRef = await disciplinasRef.add({
      codigo: codigo,
      nome: nome,
      dataCriacao: Timestamp.now(),
    });
    return {id: docRef.id, created: true};
  } else {
    return {id: snapshot.docs[0].id, created: false};
  }
}

async function getOrCreateProfessor(nome) {
  if (!nome) {
    logger.warn("Tentativa de criar professor com nome vazio.");
    return {id: null, created: false};
  }
  const usuariosRef = db.collection("users");
  const q = usuariosRef
      .where("displayName", "==", nome)
      .where("tipos", "array-contains", "professor")
      .limit(1);
  const snapshot = await q.get();

  if (snapshot.empty) {
    logger.info(`Criando novo usuário (professor): ${nome}`);
    const emailPlaceholder = `${nome.toLowerCase().replace(/\s+/g, ".")}@placeholder.seminario.com.br`;

    const docRef = await usuariosRef.add({
      displayName: nome,
      email: emailPlaceholder,
      tipos: ["professor"],
      dataCriacao: Timestamp.now(),
    });
    return {id: docRef.id, created: true};
  } else {
    return {id: snapshot.docs[0].id, created: false};
  }
}

async function createTurmaIfNotExists(turmaData) {
  const turmasRef = db.collection("ad_turmas");
  const q = turmasRef
      .where("semestre", "==", turmaData.semestre)
      .where("disciplinaId", "==", turmaData.disciplinaId)
      .where("professorId", "==", turmaData.professorId)
      .limit(1);

  const snapshot = await q.get();

  if (snapshot.empty) {
    logger.info(`Criando nova turma: ${turmaData.disciplinaNome} com ${turmaData.professorNome} para ${turmaData.semestre}`);
    await turmasRef.add({
      ...turmaData,
      alunosInscritos: [],
      statusAvaliacao: "planejada",
      dataCriacao: Timestamp.now(),
    });
    return true;
  }
  return false;
}

// =================================================================
// DADOS DOS ALUNOS POR TURMA PARA SINCRONIZAÇÃO
// =================================================================
const DADOS_DAS_TURMAS_DE_ALUNOS = {
  "Turmas": [
    {
      "Turma": "T1", "Semestre": "1º", "Ingresso": "2025/1", "Curso": "FACULDADE",
      "Alunos": [
        {"nome": "Adelso Schultz", "email": "adelso@faculdadeluteranaconcordia.com.br"},
        {"nome": "Dwayne Johnson Olay Vazquez", "email": "dvazquez@faculdadeluteranaconcordia.com.br"},
        {"nome": "Diego Rafael Gonçalves", "email": "dgoncalves@faculdadeluteranaconcordia.com.br", "observacao": "Transf. ULBRA"},
        {"nome": "Felipe Neiverth Amsberg", "email": "famsberg@faculdadeluteranaconcordia.com.br"},
        {"nome": "Fredi Erdmann Euzébio", "email": "feuzebio@faculdadeluteranaconcordia.com.br"},
        {"nome": "Gabriel Dutra", "email": "gabrieldutra@faculdadeluteranaconcordia.com.br"},
        {"nome": "Guilherme Ferreira Schulke", "email": "gschulke@faculdadeluteranaconcordia.com.br"},
        {"nome": "Hítalo Werneck Frederico", "email": "hfrederico@faculdadeluteranaconcordia.com.br"},
        {"nome": "Ícaro Fonseca Dias", "email": "idias@faculdadeluteranaconcordia.com.br"},
        {"nome": "Jessé Cominesi", "email": "jesse@faculdadeluteranaconcordia.com.br"},
        {"nome": "João Roberto Amsberg Nogueira", "email": "joaopedro@faculdadeluteranaconcordia.com.br"},
        {"nome": "Joaquim Airton Moreira Silva", "email": "jsilva@faculdadeluteranaconcordia.com.br"},
        {"nome": "Leonardo Hoffmann Petrich", "email": "lpetrich@faculdadeluteranaconcordia.com.br"},
        {"nome": "Lucas Haniel Munchow Klug", "email": "lklug@faculdadeluteranaconcordia.com.br"},
        {"nome": "Matheus Vitor Peres Pereira", "email": "mpereira@faculdadeluteranaconcordia.com.br"},
        {"nome": "Rafael Linhares Teixeira", "email": "rteixeira@faculdadeluteranaconcordia.com.br"},
        {"nome": "Solivan Charles Schroeder Schvanz", "email": "sschvanz@faculdadeluteranaconcordia.com.br"},
        {"nome": "Telmo Daniel Adams", "email": "tadams@faculdadeluteranaconcordia.com.br"},
        {"nome": "Vitor Augusto Piló Dos Santos", "email": "vsantos@faculdadeluteranaconcordia.com.br"},
        {"nome": "Vitor Emanuel Viante Paulino dos Santos", "email": "vitorviante@faculdadeluteranaconcordia.com.br"},
      ],
    },
    {
      "Turma": "T1", "Semestre": "2º", "Ingresso": "2024/2", "Curso": "FACULDADE",
      "Alunos": [
        {"nome": "Andrei Guilherme Bobato de Paula", "email": "andrei@faculdadeluteranaconcordia.com.br"},
        {"nome": "Bruno César Malaquias de Souza", "email": "brunocesar@faculdadeluteranaconcordia.com.br"},
        {"nome": "Cassiano Marquardt Mueller", "email": "cassiano@faculdadeluteranaconcordia.com.br"},
        {"nome": "Daniel Wilske Neto", "email": "daniel@faculdadeluteranaconcordia.com.br"},
        {"nome": "Felipe Alves Ferreira", "email": "felipe@faculdadeluteranaconcordia.com.br"},
        {"nome": "Frederico Guilherme Doege Hoffmann", "email": "frederico@faculdadeluteranaconcordia.com.br"},
        {"nome": "Gabriel do Amaral Rodrigues", "email": "gabriel@faculdadeluteranaconcordia.com.br"},
        {"nome": "Gabriel Santana Fernandes Gabre", "email": "ggabre@faculdadeluteranaconcordia.com.br"},
        {"nome": "Gean Elias Wagner Marquarte", "email": "gean@faculdadeluteranaconcordia.com.br"},
        {"nome": "Gilson Hoffmann Júnior", "email": "gilson@faculdadeluteranaconcordia.com.br"},
        {"nome": "Hendreo Lucas Oliveira", "email": "holiveira@faculdadeluteranaconcordia.com.br"},
        {"nome": "Herick Goese Schellmann", "email": "herick@faculdadeluteranaconcordia.com.br"},
        {"nome": "João Pedro Verdum Moré Rodrigues", "email": "joaopedro@faculdadeluteranaconcordia.com.br"},
        {"nome": "Lucas Grützmann Blank", "email": "lucas@faculdadeluteranaconcordia.com.br"},
        {"nome": "Luciano Brunow", "email": "luciano@faculdadeluteranaconcordia.com.br"},
        {"nome": "Mateus Schneider Pieper", "email": "mateus@faculdadeluteranaconcordia.com.br"},
        {"nome": "Rafael Moraes Folgiarini", "email": "rafael@faculdadeluteranaconcordia.com.br"},
        {"nome": "Samuel Grützmann Nörnberg", "email": "samuelg@faculdadeluteranaconcordia.com.br"},
        {"nome": "Thiago Vasconcellos Sazana", "email": "thiago@faculdadeluteranaconcordia.com.br"},
        {"nome": "Vinícius Arnholz Kloss", "email": "viniciuskloss@faculdadeluteranaconcordia.com.br"},
        {"nome": "Wellington Calixto dos Santos", "email": "wellington@faculdadeluteranaconcordia.com.br"},
      ],
    },
  ],
};

/**
 * =================================================================
 * FUNÇÃO DE SINCRONIZAÇÃO DE ALUNOS E MATRÍCULA EM TURMAS
 * =================================================================
 * @param {object} req - O objeto da requisição (não utilizado).
 * @param {object} res - O objeto da resposta.
 */
exports.sincronizarAlunos = onRequest(
    async (req, res) => {
      logger.info("Iniciando sincronização de alunos e matrículas via GET...");
      const counters = {
        alunosCriados: 0,
        alunosAtualizados: 0,
        alunosVerificados: 0,
        matriculasFeitas: 0,
      };
      const batch = db.batch();

      try {
        for (const turma of DADOS_DAS_TURMAS_DE_ALUNOS.Turmas) {
          const semestreLetivo = turma.Ingresso.replace("/", ".");

          // Busca todas as turmas (`ad_turmas`) do semestre correspondente de uma vez.
          const turmasDoSemestreRef = db.collection("ad_turmas").where("semestre", "==", semestreLetivo);
          const turmasSnapshot = await turmasDoSemestreRef.get();
          const turmasIds = turmasSnapshot.docs.map((doc) => doc.id);

          logger.info(`Encontradas ${turmasIds.length} turmas para o semestre ${semestreLetivo}.`);

          for (const aluno of turma.Alunos) {
            const {id: userId, created, updated} = await getOrCreateOrUpdateAluno(aluno);

            if (created) counters.alunosCriados++;
            else if (updated) counters.alunosAtualizados++;
            else counters.alunosVerificados++;

            // Adiciona o userId a todas as turmas do semestre.
            if (userId && turmasIds.length > 0) {
              for (const turmaId of turmasIds) {
                const turmaRef = db.collection("ad_turmas").doc(turmaId);
                batch.update(turmaRef, {
                  alunosInscritos: FieldValue.arrayUnion(userId),
                });
                counters.matriculasFeitas++;
              }
            }
          }
        }

        // Comita todas as atualizações de matrícula de uma só vez.
        await batch.commit();

        const summaryHtml = `
        <h1>Sincronização de Alunos Concluída!</h1>
        <p>O script foi executado com sucesso.</p>
        <ul>
          <li><strong>Alunos Criados:</strong> ${counters.alunosCriados}</li>
          <li><strong>Alunos Atualizados (nome/email):</strong> ${counters.alunosAtualizados}</li>
          <li><strong>Alunos Verificados (sem alterações):</strong> ${counters.alunosVerificados}</li>
          <li><strong>Total de Inscrições em Turmas Realizadas:</strong> ${counters.matriculasFeitas}</li>
        </ul>
        <p>Verifique os logs da função no painel do Firebase para mais detalhes.</p>
      `;

        logger.info("Sincronização concluída com sucesso!", counters);
        res.status(200).send(summaryHtml);
      } catch (error) {
        logger.error("Erro crítico durante a sincronização de alunos:", error);
        res.status(500).send(`Ocorreu um erro interno. Verifique os logs da função. Erro: ${error.message}`);
      }
    },
);


// =================================================================
// FUNÇÕES AUXILIARES
// =================================================================

/**
 * Busca um aluno por e-mail, depois por nome. Se não encontrar, cria um novo.
 * Se encontrar, verifica se precisa atualizar nome ou e-mail.
 * @param {object} alunoData - Objeto com { nome, email }.
 * @returns {Promise<{id: string, created: boolean, updated: boolean}>}
 */
async function getOrCreateOrUpdateAluno(alunoData) {
  const usuariosRef = db.collection("users");
  let snapshot;
  let docRef;

  // 1. Tenta encontrar por e-mail (método primário)
  snapshot = await usuariosRef.where("email", "==", alunoData.email).limit(1).get();

  if (!snapshot.empty) {
    docRef = snapshot.docs[0].ref;
    const dataExistente = snapshot.docs[0].data();
    // Verifica se o nome precisa ser atualizado
    if (dataExistente.displayName !== alunoData.nome) {
      logger.info(`Atualizando nome do aluno com email ${alunoData.email}: de "${dataExistente.displayName}" para "${alunoData.nome}"`);
      await docRef.update({displayName: alunoData.nome});
      return {id: docRef.id, created: false, updated: true};
    }
    return {id: docRef.id, created: false, updated: false};
  }

  // 2. Se não encontrou por e-mail, tenta por nome (fallback)
  snapshot = await usuariosRef.where("displayName", "==", alunoData.nome).limit(1).get();

  if (!snapshot.empty) {
    docRef = snapshot.docs[0].ref;
    logger.info(`Atualizando e-mail do aluno ${alunoData.nome} para ${alunoData.email}`);
    await docRef.update({email: alunoData.email});
    return {id: docRef.id, created: false, updated: true};
  }

  // 3. Se não encontrou de nenhuma forma, cria um novo aluno
  logger.info(`Criando novo aluno: ${alunoData.nome} (${alunoData.email})`);
  docRef = await usuariosRef.add({
    displayName: alunoData.nome,
    email: alunoData.email,
    tipos: ["aluno"],
    dataCriacao: Timestamp.now(),
  });
  return {id: docRef.id, created: true, updated: false};
}

// =================================================================
// DADOS DO NOVO FORMULÁRIO E SUAS QUESTÕES
// =================================================================

const DADOS_NOVO_FORMULARIO = {
  titulo: "teste de formulário",
  ativo: true,
};

const QUESTOES_DO_FORMULARIO = [
  // Categoria Disciplina
  {id: "disciplina_q1", texto: "O professor apresenta o Plano de Aprendizagem da disciplina com objetivos, metodologia de ensino e procedimentos de avaliação.", tipo: "escala_1_a_5", categoria: "disciplina", ordem: 1},
  {id: "disciplina_q2", texto: "A disciplina é relevante para minha formação.", tipo: "escala_1_a_5", categoria: "disciplina", ordem: 2},
  {id: "disciplina_q3", texto: "O Plano de Aprendizagem da disciplina foi cumprido conforme previsto.", tipo: "escala_1_a_5", categoria: "disciplina", ordem: 3},
  {id: "disciplina_q4", texto: "O material didático fornecido ou recomendado agrega conteúdo ao Plano de Aprendizagem.", tipo: "escala_1_a_5", categoria: "disciplina", ordem: 4},
  {id: "disciplina_q5", texto: "A biblioteca tem material de apoio para a disciplina.", tipo: "escala_1_a_5", categoria: "disciplina", ordem: 5},
  {id: "disciplina_q6", texto: "Esta disciplina precisa de mais tempo semanal (mais créditos).", tipo: "escala_1_a_5", categoria: "disciplina", ordem: 6},
  // Categoria Professor
  {id: "professor_q1", texto: "O professor demonstra domínio sobre o conteúdo.", tipo: "escala_1_a_5", categoria: "professor", ordem: 7},
  {id: "professor_q2", texto: "As aulas são bem preparadas pelo professor.", tipo: "escala_1_a_5", categoria: "professor", ordem: 8},
  {id: "professor_q3", texto: "A pedagogia do professor é adequada ao conteúdo.", tipo: "escala_1_a_5", categoria: "professor", ordem: 9},
  {id: "professor_q4", texto: "O professor utiliza metodologias diversificadas e criativas no processo de ensino com vista a qualificar a aprendizagem.", tipo: "escala_1_a_5", categoria: "professor", ordem: 10},
  {id: "professor_q5", texto: "O professor é pontual com os horários e prazos de atividades.", tipo: "escala_1_a_5", categoria: "professor", ordem: 11},
  {id: "professor_q6", texto: "As avaliações requeridas pelo professor são compatíveis com o conteúdo apresentado em sala.", tipo: "escala_1_a_5", categoria: "professor", ordem: 12},
  {id: "professor_q7", texto: "O professor estimula a participação dos alunos (abertura para dúvidas, preocupação em aplicação prática e entendimento dos alunos).", tipo: "escala_1_a_5", categoria: "professor", ordem: 13},
  {id: "professor_q8", texto: "O grau de disponibilidade do professor fora da aula para os alunos aprenderem (horário de atendimento, resposta a mensagens e etc.) é satisfatório.", tipo: "escala_1_a_5", categoria: "professor", ordem: 14},
  {id: "professor_q9", texto: "Eu faria outra disciplina com o mesmo professor.", tipo: "escala_1_a_5", categoria: "professor", ordem: 15},
  // Categoria Aluno (Autoavaliação)
  {id: "aluno_q1", texto: "É a primeira vez que eu curso essa disciplina.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 16},
  {id: "aluno_q2", texto: "A minha participação em aula desta disciplina é ativa.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 17},
  {id: "aluno_q3", texto: "A minha interação com o professor (fora de aula) para tirar dúvidas é frequente.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 18},
  {id: "aluno_q4", texto: "Compreendi o conteúdo desta disciplina.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 19},
  {id: "aluno_q5", texto: "Durante esta disciplina foquei meus esforços no aprendizado.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 20},
  {id: "aluno_q6", texto: "Os pré-requisitos da disciplina são adequados.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 21},
  {id: "aluno_q7", texto: "Após cursar a disciplina, meu interesse pelo assunto aumentou.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 22},
  {id: "aluno_q8", texto: "Esta disciplina proporcionou novos conhecimentos.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 23},
  {id: "aluno_q9", texto: "Percebo crescimento cognitivo da turma no decorrer da disciplina.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 24},
  {id: "aluno_q10", texto: "Houve entrosamento da turma na disciplina.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 25},
  {id: "aluno_q11", texto: "Eu percebi colaboração e dedicação mútua da turma na disciplina.", tipo: "escala_1_a_5", categoria: "aluno", ordem: 26},
];

/**
 * =================================================================
 * FUNÇÃO PARA CRIAR UM FORMULÁRIO DE TESTE
 * =================================================================
 * @param {object} req - O objeto da requisição (não utilizado).
 * @param {object} res - O objeto da resposta.
 */
exports.criarFormularioTeste = onRequest(async (req, res) => {
  logger.info("Iniciando a criação do formulário de teste...");

  try {
    const formRef = db.collection("ad_formularios");
    const q = formRef.where("titulo", "==", DADOS_NOVO_FORMULARIO.titulo).limit(1);
    const snapshot = await q.get();

    if (!snapshot.empty) {
      const formId = snapshot.docs[0].id;
      logger.warn(`O formulário '${DADOS_NOVO_FORMULARIO.titulo}' já existe com o ID: ${formId}. Nenhuma ação foi tomada.`);
      return res.status(200).send(`<h1>Aviso</h1><p>O formulário 'teste de formulário' já existe. Nenhuma ação foi tomada.</p>`);
    }

    // Cria o documento principal do formulário
    logger.info(`Criando o documento principal para '${DADOS_NOVO_FORMULARIO.titulo}'...`);
    const novoFormularioRef = await formRef.add({
      ...DADOS_NOVO_FORMULARIO,
      dataCriacao: Timestamp.now(),
    });

    // Usa um batch para criar todas as questões de uma vez
    logger.info(`Criando ${QUESTOES_DO_FORMULARIO.length} questões na subcoleção...`);
    const batch = db.batch();
    const questoesRef = novoFormularioRef.collection("questoes");

    QUESTOES_DO_FORMULARIO.forEach((questao) => {
      const docRef = questoesRef.doc(questao.id); // Usa o ID pré-definido (ex: "disciplina_q1")
      const {id, ...questaoData} = questao; // Remove o campo 'id' antes de salvar
      batch.set(docRef, questaoData);
    });

    await batch.commit();

    logger.info(`Formulário '${DADOS_NOVO_FORMULARIO.titulo}' criado com sucesso com o ID: ${novoFormularioRef.id}`);
    const successHtml = `
      <h1>Sucesso!</h1>
      <p>O formulário <strong>'${DADOS_NOVO_FORMULARIO.titulo}'</strong> e suas ${QUESTOES_DO_FORMULARIO.length} questões foram criados com sucesso.</p>
      <p>O novo ID do formulário é: <strong>${novoFormularioRef.id}</strong></p>
    `;
    res.status(200).send(successHtml);
  } catch (error) {
    logger.error("Erro ao criar formulário de teste:", error);
    res.status(500).send(`Ocorreu um erro interno. Verifique os logs da função. Erro: ${error.message}`);
  }
});
