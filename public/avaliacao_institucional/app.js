import { FirebaseAuth, FirebaseCRUD, db } from '../avaliacao_disciplinas/modules/shared/firebase.js';

class CPAApp {
    constructor() {
        this.auth = new FirebaseAuth();
        this.avaliacoesCRUD = new FirebaseCRUD("cpa_avaliacoes");
        this.currentUser = null;
        this.perguntas = [];
        this.perguntasFiltradas = [];
        
        // Nomes oficiais dos Eixos SINAES/MEC
        this.nomesEixos = {
            "1": "Planejamento e Avaliação Institucional",
            "2": "Desenvolvimento Institucional",
            "3": "Políticas Acadêmicas",
            "4": "Políticas de Gestão",
            "5": "Infraestrutura Física"
        };

        this.init();
    }

    async init() {
        // 1. Proteção de Rota e Identificação
        this.auth.check_login_status(async (user) => {
            if (!user) {
                window.location.href = '/institucional/login'; // Redireciona para o login do CPA
                return;
            }

            // Vai buscar os dados completos do utilizador ao Firestore para saber a "role"
            const userCRUD = new FirebaseCRUD("users");
            this.currentUser = await userCRUD.read(user.uid);

            if (this.currentUser) {
                document.getElementById('userInfo').innerHTML = `
                    <span class="material-icons" style="font-size:16px; vertical-align:text-bottom;">account_circle</span> 
                    ${this.currentUser.displayName} (${this.currentUser.role || 'aluno'})
                `;
            }

            // 2. Carregar as Perguntas e Setup da UI
            await this.loadQuestions();
            this.setupEventListeners();
            this.checkExistingSubmission();
        });
    }

    async loadQuestions() {
        try {
            // Vamos ler o JSON diretamente para garantir que usamos a sua matriz perfeita
            const response = await fetch('./avaliacao_cpa_perguntas.json'); // Ajuste o nome do seu json aqui se necessário
            if (!response.ok) throw new Error("Erro ao carregar perguntas");
            
            const data = await response.json();
            
            // Converte o objeto do JSON num array para facilitar
            this.perguntas = Object.values(data);
            
            // 3. FILTRO MÁGICO DE ROLES (Aluno, Professor ou Funcionario)
            const userRole = this.currentUser?.role || 'aluno';
            
            this.perguntasFiltradas = this.perguntas.filter(q => {
                if (userRole === 'aluno' && q.aluno) return true;
                if (userRole === 'professor' && q.professor) return true;
                if (userRole === 'funcionario' && q.funcionario) return true;
                return false;
            });

            // Ordena pelo eixo e depois pela dimensão
            this.perguntasFiltradas.sort((a, b) => {
                if (a.eixo !== b.eixo) return a.eixo.localeCompare(b.eixo);
                return a.dimensao.localeCompare(b.dimensao);
            });

            this.renderQuestions();

        } catch (error) {
            console.error("Erro ao carregar a matriz da CPA:", error);
            this.showToast("Erro ao carregar o formulário. Contacte o suporte.", "error");
        }
    }

    renderQuestions() {
        const container = document.getElementById('form-dynamic-content');
        container.innerHTML = '';

        // Agrupa as perguntas por Eixo
        const perguntasPorEixo = {};
        this.perguntasFiltradas.forEach(q => {
            if (!perguntasPorEixo[q.eixo]) perguntasPorEixo[q.eixo] = [];
            perguntasPorEixo[q.eixo].push(q);
        });

        // Legendas sérias (Padrão MEC/CPA)
        const legends = ['Discordo Totalmente', 'Discordo', 'Não sei avaliar', 'Concordo', 'Concordo Totalmente'];

        // Renderiza as seções
        Object.keys(perguntasPorEixo).sort().forEach(eixoId => {
            const questoes = perguntasPorEixo[eixoId];
            const nomeEixo = this.nomesEixos[eixoId] || `Eixo ${eixoId}`;

            let htmlEixo = `
                <div class="axis-section">
                    <h2><span class="material-icons">account_balance</span> Eixo ${eixoId} - ${nomeEixo}</h2>
            `;

            questoes.forEach((q, index) => {
                const inputName = `q_${q.id}`;
                htmlEixo += `
                    <div class="question-group" id="group_${inputName}">
                        <p class="question-text">${index + 1}. ${q.texto}</p>
                        <div class="radio-group">
                            ${[1, 2, 3, 4, 5].map((value, idx) => `
                                <label class="radio-option">
                                    <input type="radio" name="${inputName}" value="${value}" required>
                                    <span class="radio-number">${value}</span>
                                    <span class="radio-label-text">${legends[idx]}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            htmlEixo += `</div>`;
            container.insertAdjacentHTML('beforeend', htmlEixo);
        });

        this.setupInteractiveUI();
    }

    // ==========================================
    // MAGIA DE UI: Auto-Scroll e Progresso
    // ==========================================
    setupInteractiveUI() {
        const requiredInputs = document.querySelectorAll('input[type="radio"]');
        const totalGroups = new Set(Array.from(requiredInputs).map(i => i.name)).size;

        const updateProgress = () => {
            const answeredGroups = new Set(Array.from(document.querySelectorAll('input[type="radio"]:checked')).map(i => i.name)).size;
            const percentage = totalGroups === 0 ? 100 : Math.round((answeredGroups / totalGroups) * 100);
            
            document.getElementById('progress-percentage').textContent = `${percentage}%`;
            document.getElementById('form-progress-fill').style.width = `${percentage}%`;
            
            const btnSubmit = document.getElementById('btnSubmitCpa');
            if (percentage === 100) {
                btnSubmit.style.transform = 'scale(1.05)';
                btnSubmit.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4)'; // Brilho roxo
            }
        };

        requiredInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                updateProgress();
                
                const qGroup = e.target.closest('.question-group');
                qGroup.classList.remove('has-error');

                const allGroups = Array.from(document.querySelectorAll('.question-group'));
                const currentIndex = allGroups.indexOf(qGroup);
                if (currentIndex >= 0 && currentIndex < allGroups.length - 1) {
                    setTimeout(() => {
                        allGroups[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 250);
                }
            });
        });

        updateProgress();
    }

    async checkExistingSubmission() {
        // Verifica se o aluno já enviou a avaliação deste ano
        try {
            const anoAtual = new Date().getFullYear();
            const querySnapshot = await this.avaliacoesCRUD.readAll();
            
            // Faremos uma procura na memória para simplificar, já que é o portal do aluno
            const jaRespondeu = querySnapshot.some(av => av.userId === this.currentUser.id && av.year === anoAtual);

            if (jaRespondeu) {
                const card = document.getElementById('cpaStartCard');
                card.innerHTML = `
                    <div class="card-icon" style="background: #dcfce7; color: #10b981;"><span class="material-icons">check_circle</span></div>
                    <h3>Avaliação Concluída</h3>
                    <p style="margin: 12px 0;">Você já submeteu a sua avaliação institucional para o ciclo de ${anoAtual}. Muito obrigado pela sua contribuição!</p>
                `;
                card.style.borderColor = '#10b981';
            }
        } catch (error) {
            console.error("Erro ao verificar submissão:", error);
        }
    }

    setupEventListeners() {
        document.getElementById('btnStartCpa')?.addEventListener('click', () => {
            document.getElementById('cpaModal').style.display = 'block';
        });

        document.getElementById('btnCloseCpa')?.addEventListener('click', () => {
            document.getElementById('cpaModal').style.display = 'none';
        });
        
        document.getElementById('btnCancelCpa')?.addEventListener('click', () => {
            document.getElementById('cpaModal').style.display = 'none';
        });

        document.getElementById('cpaForm')?.addEventListener('submit', (e) => this.handleSubmit(e));

        document.getElementById('logoutButton')?.addEventListener('click', () => {
            this.auth.logout().then(() => { window.location.href = '/institucional/login'; });
        });
    }

    validateForm() {
        let hasError = false;
        let firstErrorElement = null;

        document.querySelectorAll('.question-group.has-error').forEach(el => el.classList.remove('has-error'));

        this.perguntasFiltradas.forEach(q => {
            const inputName = `q_${q.id}`;
            const isAnswered = document.querySelector(`input[name="${inputName}"]:checked`);
            
            if (!isAnswered) {
                hasError = true;
                const groupEl = document.getElementById(`group_${inputName}`);
                if (groupEl) {
                    groupEl.classList.add('has-error');
                    if (!firstErrorElement) firstErrorElement = groupEl;
                }
            }
        });

        if (hasError) {
            this.showToast('Por favor, responda a todas as questões assinaladas a vermelho.', 'error');
            if (firstErrorElement) firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) return;

        const btnSubmit = document.getElementById('btnSubmitCpa');
        btnSubmit.innerHTML = '<div class="loader" style="width:20px;height:20px;border-width:2px;display:inline-block;"></div> A Enviar...';
        btnSubmit.disabled = true;

        try {
            const answers = {};
            this.perguntasFiltradas.forEach(q => {
                const inputName = `q_${q.id}`;
                const sel = document.querySelector(`input[name="${inputName}"]:checked`);
                if (sel) answers[q.id.toString()] = sel.value; // Guardar em formato string como no seu JSON antigo
            });

            const avaliacaoData = {
                userId: this.currentUser.id,
                userRole: this.currentUser.role || 'aluno',
                year: new Date().getFullYear(),
                timestamp: new Date(),
                answers: answers,
                comentarios: document.querySelector('textarea[name="comentarios"]').value || ""
            };

            await this.avaliacoesCRUD.create(avaliacaoData);

            this.showToast('🎉 Avaliação submetida com sucesso! Obrigado.', 'success');
            
            setTimeout(() => {
                document.getElementById('cpaModal').style.display = 'none';
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Erro ao submeter CPA:', error);
            this.showToast('Erro ao enviar. Verifique a sua internet.', 'error');
            btnSubmit.innerHTML = '<span class="material-icons">send</span> Enviar Respostas';
            btnSubmit.disabled = false;
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `modern-toast toast-${type}`;
        const icon = type === 'success' ? 'check_circle' : 'error_outline';
        toast.innerHTML = `<span class="material-icons">${icon}</span><p>${message}</p>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
    }
}

// Inicializa a App
document.addEventListener('DOMContentLoaded', () => {
    new CPAApp();
});