export class FormulariosRenderer {
    renderFormularios(formularios) {
        const tbody = document.querySelector('#formularios-table tbody');
        tbody.innerHTML = '';

        formularios.forEach(formulario => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formulario.titulo}</td>
                <td><span class="status-badge ${formulario.ativo ? 'active' : 'inactive'}">${formulario.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>0</td>
                <td>${this.formatDate(formulario.dataCriacao)}</td>
                <td>
                    <button class="action-btn view" onclick="viewFormulario('${formulario.id}')">Ver</button>
                    <button class="action-btn questions" onclick="manageQuestions('${formulario.id}')">Questões</button>
                    <button class="action-btn edit" onclick="editFormulario('${formulario.id}')">Editar</button>
                    <button class="action-btn duplicate" onclick="duplicateFormulario('${formulario.id}')">Duplicar</button>
                    <button class="action-btn delete" onclick="deleteFormulario('${formulario.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    createAddFormModal() {
        return `
            <form id="formularioForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="titulo">Título do Formulário *</label>
                        <input type="text" id="titulo" name="titulo" required>
                    </div>
                    <div class="form-group">
                        <label for="ativo">Status *</label>
                        <select id="ativo" name="ativo" required>
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Formulário</button>
                </div>
            </form>
        `;
    }

    createEditFormModal(formulario, formularioId) {
        return `
            <form id="formularioEditForm" data-formulario-id="${formularioId}">
                <div class="form-grid">
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
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Atualizar Formulário</button>
                </div>
            </form>
        `;
    }

    createViewFormModal(formulario) {
        return `
            <div class="formulario-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Título:</label>
                        <span>${formulario.titulo}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="status-badge ${formulario.ativo ? 'active' : 'inactive'}">${formulario.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Data de Criação:</label>
                        <span>${new Date(formulario.dataCriacao.toDate()).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
            </div>
        `;
    }

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }
}