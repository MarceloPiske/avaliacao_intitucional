import { db } from '../../avaliacao_disciplinas/modules/shared/firebase.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export function initSettingsSection() {
    const section = document.getElementById('settings-section');
    
    section.innerHTML = `
        <div class="users-header-modern">
            <div>
                <h2>Configurações do Sistema CPA</h2>
                <p>Faça a gestão dos ciclos avaliativos e das regras globais da instituição.</p>
            </div>
        </div>

        <div style="max-width: 800px; display: flex; flex-direction: column; gap: 24px;">
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
                <div style="display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px;">
                    <div style="width: 48px; height: 48px; background: #f3e8ff; color: #a855f7; border-radius: 12px; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                        <span class="material-icons">update</span>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 18px;">Ciclo Avaliativo Ativo</h3>
                        <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                            A Avaliação Institucional (CPA) funciona por ciclos letivos. Ao alterar o nome do ciclo abaixo (ex: de "2025.2" para "2026.1"), o sistema inicia uma <strong>nova rodada limpa de avaliações</strong> para os utilizadores, preservando intacto todo o histórico e gráficos do ciclo anterior.
                        </p>
                    </div>
                </div>

                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                    <p style="margin: 0; color: #334155; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                        <span class="material-icons" style="color: #3b82f6; font-size: 18px;">info</span>
                        Alunos e professores que já responderam ao ciclo atual não poderão responder novamente até que o administrador defina um novo ciclo.
                    </p>
                </div>

                <div style="display: flex; gap: 16px; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">Nome/ID do Ciclo Atual (ex: 2026.1)</label>
                        <input type="text" id="config-ciclo-input" placeholder="A carregar..." style="width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; font-weight: 600; color: #0f172a; outline: none;">
                    </div>
                    <button id="btn-save-ciclo" class="modern-btn btn-primary" style="padding: 12px 24px; height: 46px;">
                        <span class="material-icons">save</span> Atualizar Ciclo
                    </button>
                </div>
            </div>

            </div>
    `;

    document.getElementById('btn-save-ciclo').addEventListener('click', saveActiveCycle);
    
    loadCurrentCycle();
}

async function loadCurrentCycle() {
    const input = document.getElementById('config-ciclo-input');
    const btn = document.getElementById('btn-save-ciclo');
    input.disabled = true;
    
    try {
        const configRef = doc(db, 'config', 'cpa_settings');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists() && configSnap.data().ciclo_atual) {
            input.value = configSnap.data().ciclo_atual;
        } else {
            input.value = new Date().getFullYear().toString();
        }
    } catch (error) {
        console.error("Erro ao carregar configuração:", error);
        input.value = "Erro ao carregar";
    } finally {
        input.disabled = false;
    }
}

async function saveActiveCycle() {
    const input = document.getElementById('config-ciclo-input');
    const novoCiclo = input.value.trim();
    
    if (!novoCiclo) {
        alert("O nome do ciclo não pode estar vazio.");
        return;
    }

    if (!confirm(`ATENÇÃO: Ao mudar o ciclo para "${novoCiclo}", todos os alunos poderão realizar uma nova avaliação na tela inicial. Tem certeza que deseja abrir um novo ciclo?`)) {
        return;
    }

    const btn = document.getElementById('btn-save-ciclo');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Salvando...';
    btn.disabled = true;

    try {
        const configRef = doc(db, 'config', 'cpa_settings');
        await setDoc(configRef, { ciclo_atual: novoCiclo }, { merge: true });
        
        // Simples alert, mas se preferir pode usar o seu sistema de Toast!
        alert(`Sucesso! O novo ciclo de avaliação "${novoCiclo}" foi ativado.`);
    } catch (error) {
        console.error("Erro ao salvar o ciclo:", error);
        alert("Erro ao guardar as configurações: " + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}