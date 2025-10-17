import { FirebaseCRUD } from '../../../shared/modules/firebase.js';

export class DashboardManager {
    constructor() {
        this.usuariosCRUD = new FirebaseCRUD("users");
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.avaliacoesCRUD = new FirebaseCRUD("ad_avaliacoes");
    }

    async loadData() {
        try {
            const [usuarios, disciplinas, turmas, avaliacoes] = await Promise.all([
                this.usuariosCRUD.readAll(),
                this.disciplinasCRUD.readAll(),
                this.turmasCRUD.readAll(),
                this.avaliacoesCRUD.readAll()
            ]);

            // Update dashboard cards
            document.getElementById('usuarios-count').textContent = usuarios?.length || 0;
            document.getElementById('disciplinas-count').textContent = disciplinas?.length || 0;
            document.getElementById('turmas-count').textContent = turmas?.length || 0;
            document.getElementById('avaliacoes-count').textContent = avaliacoes?.length || 0;

        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        }
    }
}