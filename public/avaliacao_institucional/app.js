import { FirebaseAuth, db } from '../avaliacao_disciplinas/modules/shared/firebase.js';
import { collection, getDocs, addDoc, query, where, serverTimestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

class CPAEvaluationApp {
    constructor() {
        this.auth = new FirebaseAuth();
        this.currentUser = null;
        
        // Variável Dinâmica do Ciclo
        this.CICLO_ATUAL = null; 
        
        this.questions = [];
        this.answers = {}; 
        this.currentIndex = 0;

        this.ui = {
            loader: document.getElementById('app-loader'),
            wizardCard: document.getElementById('wizard-card'),
            statusCard: document.getElementById('status-card'),
            questionText: document.getElementById('question-text'),
            currentQNum: document.getElementById('current-q-num'),
            totalQNum: document.getElementById('total-q-num'),
            progressText: document.getElementById('progress-text'),
            progressFill: document.getElementById('progress-fill'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            btnSubmit: document.getElementById('btn-submit'),
            ratingInputs: document.querySelectorAll('input[name="rating"]')
        };

        this.init();
    }

    async init() {
        this.auth.check_login_status(async (user) => {
            if (!user) {
                window.location.href = '/institucional/login';
                return;
            }

            const userId = localStorage.getItem("user_id");
            const userRole = localStorage.getItem("user_tipos") ? JSON.parse(localStorage.getItem("user_tipos"))[0] : 'aluno';
            const userName = localStorage.getItem("user_nome") || user.email;

            document.getElementById('header-user-name').textContent = `${userName} (${userRole})`;
            this.currentUser = { id: userId, role: userRole };

            // 1º - LÊ O CICLO DINÂMICO DO BANCO DE DADOS
            await this.loadActiveCycle();

            // 2º - VERIFICA SE JÁ RESPONDEU NESTE CICLO
            const hasResponded = await this.checkIfAlreadyResponded();
            
            if (hasResponded) {
                this.showStatus('success', 'Avaliação Já Concluída!', `Você já preencheu a avaliação institucional para o ciclo ${this.CICLO_ATUAL}. Obrigado pelo seu tempo!`);
                return;
            }

            // 3º - CARREGA AS PERGUNTAS SE AINDA NÃO RESPONDEU
            await this.loadQuestions();
        });

        this.setupEventListeners();
    }

    async loadActiveCycle() {
        try {
            const configRef = doc(db, 'config', 'cpa_settings');
            const configSnap = await getDoc(configRef);
            
            if (configSnap.exists() && configSnap.data().ciclo_atual) {
                this.CICLO_ATUAL = configSnap.data().ciclo_atual;
            } else {
                // Auto-Criação: Se não existir, define o ano atual como padrão
                this.CICLO_ATUAL = new Date().getFullYear().toString(); 
                await setDoc(configRef, { ciclo_atual: this.CICLO_ATUAL }, { merge: true });
            }
            console.log("Ciclo de Avaliação Ativo:", this.CICLO_ATUAL);
        } catch (error) {
            console.error("Erro ao carregar configurações do ciclo:", error);
            this.CICLO_ATUAL = new Date().getFullYear().toString(); // Fallback de segurança
        }
    }

    async checkIfAlreadyResponded() {
        try {
            const q = query(
                collection(db, 'respostas_avaliacao_institucional'),
                where('userId', '==', this.currentUser.id),
                where('year', '==', this.CICLO_ATUAL) // Filtra pelo ciclo dinâmico
            );
            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error("Erro ao verificar submissão:", error);
            return false;
        }
    }

    async loadQuestions() {
        try {
            const snapshot = await getDocs(collection(db, 'perguntas_avaliacao_institucional'));
            const allQ = [];
            
            snapshot.forEach(doc => {
                const q = { id: doc.id, ...doc.data() };
                if (this.currentUser.role === 'aluno' && q.aluno) allQ.push(q);
                else if (this.currentUser.role === 'professor' && q.professor) allQ.push(q);
                else if ((this.currentUser.role === 'tecnico' || this.currentUser.role === 'admin') && q.funcionario) allQ.push(q);
            });

            this.questions = allQ.sort((a, b) => parseInt(a.id) - parseInt(b.id));

            if (this.questions.length === 0) {
                this.showStatus('info', 'Nenhuma pergunta disponível', 'A coordenação ainda não disponibilizou perguntas para o seu perfil no ciclo atual.');
                return;
            }

            this.ui.currentQNum.parentElement.innerHTML = `Pergunta&nbsp;<span id="current-q-num">1</span>&nbsp;de&nbsp;<span id="total-q-num">${this.questions.length}</span>`;
            
            this.ui.currentQNum = document.getElementById('current-q-num');
            this.ui.totalQNum = document.getElementById('total-q-num');

            this.ui.loader.style.display = 'none';
            this.ui.wizardCard.style.display = 'flex';
            
            this.renderQuestion();

        } catch (error) {
            console.error("Erro ao carregar perguntas:", error);
            this.showStatus('error', 'Erro de Conexão', 'Não foi possível carregar o questionário. Tente novamente mais tarde.');
        }
    }

    renderQuestion() {
        if (this.currentIndex >= this.questions.length || this.currentIndex < 0) return; 

        const qArea = document.getElementById('question-area');
        qArea.style.animation = 'none';
        qArea.offsetHeight; 
        qArea.style.animation = 'fadeIn 0.4s ease';

        const q = this.questions[this.currentIndex];
        
        this.ui.currentQNum.textContent = this.currentIndex + 1;
        this.ui.questionText.textContent = q.texto;
        
        this.ui.btnPrev.style.visibility = this.currentIndex === 0 ? 'hidden' : 'visible';
        
        if (this.currentIndex === this.questions.length - 1) {
            this.ui.btnNext.style.display = 'none';
            this.ui.btnSubmit.style.display = 'inline-flex';
        } else {
            this.ui.btnNext.style.display = 'inline-flex';
            this.ui.btnSubmit.style.display = 'none';
        }

        this.ui.ratingInputs.forEach(input => {
            input.checked = false;
            if (this.answers[q.id] && input.value === this.answers[q.id]) {
                input.checked = true;
            }
        });

        this.updateProgress();
    }

    updateProgress() {
        const answeredCount = Object.keys(this.answers).length;
        const percentage = (answeredCount / this.questions.length) * 100;
        
        this.ui.progressText.textContent = `${answeredCount} de ${this.questions.length} respondidas`;
        this.ui.progressFill.style.width = `${percentage}%`;
    }

    setupEventListeners() {
        let autoAdvanceTimeout;

        document.getElementById('btn-logout').addEventListener('click', () => {
            this.auth.logout().then(() => { window.location.href = '/institucional/login'; });
        });

        this.ui.btnPrev.addEventListener('click', () => {
            if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout); 
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.renderQuestion();
            }
        });

        this.ui.btnNext.addEventListener('click', () => {
            if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);
            if (!this.getCurrentAnswer()) {
                alert('Por favor, selecione uma nota antes de avançar.');
                return;
            }
            if (this.currentIndex < this.questions.length - 1) {
                this.currentIndex++;
                this.renderQuestion();
            }
        });

        this.ui.ratingInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (this.currentIndex >= this.questions.length) return;

                const qId = this.questions[this.currentIndex].id;
                this.answers[qId] = e.target.value;
                this.updateProgress();

                if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);

                if (this.currentIndex < this.questions.length - 1) {
                    autoAdvanceTimeout = setTimeout(() => {
                        this.currentIndex++;
                        this.renderQuestion();
                    }, 400); 
                } else {
                    this.ui.btnSubmit.style.transform = 'scale(1.05)';
                    setTimeout(() => this.ui.btnSubmit.style.transform = 'scale(1)', 200);
                }
            });
        });

        this.ui.btnSubmit.addEventListener('click', () => this.submitEvaluation());
    }

    getCurrentAnswer() {
        if (this.currentIndex >= this.questions.length) return null;
        const qId = this.questions[this.currentIndex].id;
        return this.answers[qId] || null;
    }

    async submitEvaluation() {
        if (!this.getCurrentAnswer()) {
            alert('Por favor, responda à última pergunta antes de enviar.');
            return;
        }

        const answeredCount = Object.keys(this.answers).length;
        if (answeredCount < this.questions.length) {
            if (!confirm(`Você respondeu apenas ${answeredCount} de ${this.questions.length}. Deseja mesmo enviar o formulário incompleto?`)) return;
        }

        this.ui.btnSubmit.innerHTML = '<div class="loader-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Enviando...';
        this.ui.btnSubmit.disabled = true;

        try {
            const payload = {
                userId: this.currentUser.id,
                userRole: this.currentUser.role,
                answers: this.answers,
                year: this.CICLO_ATUAL, // SALVA COM O CICLO CORRETO!
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'respostas_avaliacao_institucional'), payload);
            this.showStatus('success', 'Avaliação Concluída!', `Obrigado pelo seu feedback no ciclo ${this.CICLO_ATUAL}. As suas respostas foram registadas.`);

        } catch (error) {
            console.error("Erro ao enviar:", error);
            alert("Erro de conexão ao enviar respostas. Verifique a internet e tente novamente.");
            this.ui.btnSubmit.innerHTML = '<span class="material-icons">check_circle</span> Enviar Avaliação';
            this.ui.btnSubmit.disabled = false;
        }
    }

    showStatus(type, title, message) {
        this.ui.loader.style.display = 'none';
        this.ui.wizardCard.style.display = 'none';
        
        const iconEl = document.getElementById('status-icon');
        iconEl.className = `status-icon status-${type === 'success' ? 'success' : 'info'}`;
        iconEl.innerHTML = `<span class="material-icons" style="font-size: 40px;">${type === 'success' ? 'check' : 'info_outline'}</span>`;
        
        document.getElementById('status-title').textContent = title;
        document.getElementById('status-message').textContent = message;
        
        this.ui.statusCard.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CPAEvaluationApp();
});