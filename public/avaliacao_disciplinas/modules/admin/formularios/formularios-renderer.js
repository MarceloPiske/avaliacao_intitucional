export class FormulariosRenderer {
    constructor() {
        this.formulariosData = [];
    }

    renderFormularios(formularios) {
        if (formularios) this.formulariosData = formularios;

        const tbody = document.querySelector('#formularios-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.formulariosData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
                            <span class="material-icons" style="font-size: 48px; color: var(--border-color);">dynamic_form</span>
                            <p style="margin-top: 8px;">Nenhum formulário cadastrado.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Ordena para colocar os ativos primeiro
        const sortedData = [...this.formulariosData].sort((a, b) => (a.ativo === b.ativo) ? 0 : a.ativo ? -1 : 1);

        sortedData.forEach(formulario => {
            const statusClass = formulario.ativo ? 'status-active' : 'status-inactive';
            const statusText = formulario.ativo ? 'Ativo' : 'Inativo';
            const opacity = formulario.ativo ? '1' : '0.6';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="opacity: ${opacity};"><strong>${formulario.titulo}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td style="opacity: ${opacity};">
                    <span class="badge-modern" style="background: #f1f5f9; color: var(--text-primary);">
                        <span class="material-icons" style="font-size: 14px; margin-right: 4px;">format_list_bulleted</span>
                        Questões
                    </span>
                </td>
                <td style="opacity: ${opacity}; color: var(--text-secondary); font-size: 13px;">${this.formatDate(formulario.dataCriacao)}</td>
                <td class="text-right">
                    <button class="action-btn questions" data-action="questions" data-id="${formulario.id}" title="Gerir Questões" style="background: #e0e7ff; color: #3b82f6;"><span class="material-icons">list_alt</span></button>
                    <button class="action-btn edit" data-action="edit" data-id="${formulario.id}" title="Editar Formulário"><span class="material-icons">edit</span></button>
                    <button class="action-btn success" data-action="duplicate" data-id="${formulario.id}" title="Duplicar"><span class="material-icons">content_copy</span></button>
                    <button class="action-btn delete" data-action="delete" data-id="${formulario.id}" title="Excluir"><span class="material-icons">delete_outline</span></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    createAddFormModal() {
        return `
            <form id="formularioForm">
                <div class="form-grid single-col">
                    <div class="form-group">
                        <label for="titulo">Título do Formulário *</label>
                        <input type="text" id="titulo" name="titulo" placeholder="Ex: Avaliação de Docentes 2026.1" required>
                    </div>
                    <div class="form-group">
                        <label for="ativo">Status Inicial *</label>
                        <select id="ativo" name="ativo" required>
                            <option value="true">Ativo (Pronto a usar)</option>
                            <option value="false">Inativo (Rascunho)</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btnCancelModal">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">save</span> Salvar Formulário</button>
                </div>
            </form>
        `;
    }

    createEditFormModal(formulario, formularioId) {
        return `
            <form id="formularioEditForm" data-formulario-id="${formularioId}">
                <div class="form-grid single-col">
                    <div class="form-group">
                        <label for="titulo">Título do Formulário *</label>
                        <input type="text" id="titulo" name="titulo" value="${formulario.titulo}" required>
                    </div>
                    <div class="form-group">
                        <label for="ativo">Status *</label>
                        <select id="ativo" name="ativo" required>
                            <option value="true" ${formulario.ativo ? 'selected' : ''}>Ativo</option>
                            <option value="false" ${!formulario.ativo ? 'selected' : ''}>Inativo</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" id="btnCancelModal">Cancelar</button>
                    <button type="submit" class="btn-primary-modern"><span class="material-icons">sync</span> Atualizar Formulário</button>
                </div>
            </form>
        `;
    }

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }
}