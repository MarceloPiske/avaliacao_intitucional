import { FirebaseCRUD } from '../shared/firebase.js';

export class DashboardManager {
    constructor() {
        this.usuariosCRUD = new FirebaseCRUD("users");
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
        
        this.initStaticUI();
    }

    initStaticUI() {
        // Mostrar a data atual no Banner de forma elegante
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const todayStr = new Date().toLocaleDateString('pt-BR', dateOptions);
        
        const dateDisplay = document.getElementById('currentDateDisplay');
        if (dateDisplay) {
            // Capitalizar a primeira letra
            dateDisplay.textContent = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
        }
    }

    async loadData() {
        try {
            // Busca tudo em paralelo para máxima velocidade
            const [usuarios, disciplinas, turmas, avaliacoes] = await Promise.all([
                this.usuariosCRUD.readAll(),
                this.disciplinasCRUD.readAll(),
                this.turmasCRUD.readAll(),
                this.avaliacoesCRUD.readAll()
            ]);

            const usersData = usuarios || [];

            // 1. Atualizar KPIs Base
            this.safeSetText('usuarios-count', usersData.length);
            this.safeSetText('disciplinas-count', disciplinas?.length || 0);
            this.safeSetText('turmas-count', turmas?.length || 0);
            this.safeSetText('avaliacoes-count', avaliacoes?.length || 0);

            // 2. Renderizar Distribuição de Perfis
            this.renderRolesDistribution(usersData);

            // 3. Renderizar Feed de Últimos Usuários
            this.renderRecentUsers(usersData);

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            document.getElementById('recentUsersList').innerHTML = '<p class="text-danger">Erro ao carregar atividades.</p>';
        }
    }

    renderRolesDistribution(users) {
        const container = document.getElementById('rolesDistribution');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum dado disponível.</p>';
            return;
        }

        // Contar tipos de utilizador
        let totalAlunos = 0, totalProfs = 0, totalAdmins = 0;
        
        users.forEach(u => {
            const tipos = u.tipos || [];
            if (tipos.includes('aluno')) totalAlunos++;
            if (tipos.includes('professor')) totalProfs++;
            if (tipos.includes('admin')) totalAdmins++;
        });

        const total = users.length; // Usa o total real para a %
        
        const getPerc = (val) => ((val / total) * 100).toFixed(1);

        container.innerHTML = `
            <div class="role-stat">
                <div class="role-header">
                    <span>👨‍🎓 Alunos (${totalAlunos})</span>
                    <span>${getPerc(totalAlunos)}%</span>
                </div>
                <div class="role-bar-bg"><div class="role-bar-fill" style="width: ${getPerc(totalAlunos)}%; background: #94a3b8;"></div></div>
            </div>
            <div class="role-stat">
                <div class="role-header">
                    <span>👨‍🏫 Professores (${totalProfs})</span>
                    <span>${getPerc(totalProfs)}%</span>
                </div>
                <div class="role-bar-bg"><div class="role-bar-fill" style="width: ${getPerc(totalProfs)}%; background: var(--accent);"></div></div>
            </div>
            <div class="role-stat">
                <div class="role-header">
                    <span>🛡️ Administradores (${totalAdmins})</span>
                    <span>${getPerc(totalAdmins)}%</span>
                </div>
                <div class="role-bar-bg"><div class="role-bar-fill" style="width: ${getPerc(totalAdmins)}%; background: var(--success);"></div></div>
            </div>
        `;
    }

    renderRecentUsers(users) {
        const container = document.getElementById('recentUsersList');
        if (!container) return;

        // Ordenar usuários pela data de criação (mais recentes primeiro)
        const sortedUsers = [...users].sort((a, b) => {
            const dateA = a.dataCriacao?.toDate ? a.dataCriacao.toDate() : new Date(a.dataCriacao || 0);
            const dateB = b.dataCriacao?.toDate ? b.dataCriacao.toDate() : new Date(b.dataCriacao || 0);
            return dateB - dateA;
        });

        // Pegar os 5 mais recentes
        const recent = sortedUsers.slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhuma atividade recente.</p>';
            return;
        }

        let html = '';
        recent.forEach(user => {
            const dateObj = user.dataCriacao?.toDate ? user.dataCriacao.toDate() : new Date(user.dataCriacao);
            const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            
            // Lógica para gerar Avatar Rápido
            let avatarHtml = '';
            if (user.photoURL) {
                avatarHtml = `<div class="avatar-wrapper" style="width:36px; height:36px; font-size:14px;"><img src="${user.photoURL}"></div>`;
            } else {
                const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
                avatarHtml = `<div class="avatar-wrapper initials" style="width:36px; height:36px; font-size:14px;">${initial}</div>`;
            }

            // Descobrir o perfil principal
            let mainRole = 'Usuário';
            if (user.tipos?.includes('admin')) mainRole = 'Administrador';
            else if (user.tipos?.includes('professor')) mainRole = 'Professor';
            else if (user.tipos?.includes('aluno')) mainRole = 'Aluno';

            html += `
                <div class="activity-item">
                    ${avatarHtml}
                    <div class="activity-info">
                        <h4>${user.displayName || 'Usuário Sem Nome'}</h4>
                        <p>${mainRole} • ${user.email}</p>
                    </div>
                    <div class="activity-time">${dateStr}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
}