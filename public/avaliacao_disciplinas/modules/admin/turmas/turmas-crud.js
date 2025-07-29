import { FirebaseCRUD } from '../../shared/firebase.js';

export class TurmasCRUD {
    constructor() {
        this.turmasCRUD = new FirebaseCRUD("ad_turmas");
        this.usuariosCRUD = new FirebaseCRUD("users");
        this.disciplinasCRUD = new FirebaseCRUD("disciplinas");
        this.formulariosCRUD = new FirebaseCRUD("ad_formularios");
    }

    async loadData() {
        try {
            return await this.turmasCRUD.readAll();
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            return [];
        }
    }

    async getTurma(turmaId) {
        return await this.turmasCRUD.read(turmaId);
    }

    async getProfessores() {
        return await this.usuariosCRUD.readWhere("tipos", "array-contains", "professor");
    }

    async getDisciplinas() {
        return await this.disciplinasCRUD.readAll();
    }

    async createTurma(turmaData) {
        return await this.turmasCRUD.create(turmaData);
    }

    async updateTurma(turmaId, turmaData) {
        return await this.turmasCRUD.update(turmaId, turmaData);
    }

    async deleteTurma(turmaId) {
        return await this.turmasCRUD.delete(turmaId);
    }

    async getUser(userId) {
        return await this.usuariosCRUD.read(userId);
    }

    async createUser(userData) {
        return await this.usuariosCRUD.create(userData);
    }

    async getUsersByEmail(email) {
        return await this.usuariosCRUD.readWhere("email", "==", email);
    }

    async getAllUsers() {
        return await this.usuariosCRUD.readAll();
    }

    async getFormularios() {
        return await this.formulariosCRUD.readAll();
    }

    generateSemesterOptions() {
        const options = [];
        const currentYear = new Date().getFullYear();
        
        // Generate semesters from 2024.2 to current year + 1
        for (let year = 2024; year <= currentYear + 1; year++) {
            if (year === 2024) {
                options.push(`<option value="2024.2">2024.2</option>`);
            } else {
                options.push(`<option value="${year}.1">${year}.1</option>`);
                options.push(`<option value="${year}.2">${year}.2</option>`);
            }
        }
        
        return options.join('');
    }
}