export function initResultsSection() {
    const section = document.getElementById('results-section');
    
    section.innerHTML = `
        <div class="section-content">
            <h2>Resultados das Avaliações</h2>
            <div class="filter-options">
                <div>
                    <span class="filter-label">Ano:</span>
                    <select id="results-year-filter">
                        <option value="all">Todos os Anos</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                    </select>
                </div>
                <div>
                    <span class="filter-label">Tipo:</span>
                    <select id="results-type-filter">
                        <option value="all">Todos</option>
                        <option value="aluno">Alunos</option>
                        <option value="professor">Professores</option>
                        <option value="tecnico">Técnicos</option>
                    </select>
                </div>
                <button id="load-results-btn" class="secondary">Carregar Resultados</button>
                <button id="export-results-btn">Exportar</button>
            </div>
            <div id="results-content">
                <p>Clique em "Carregar Resultados" para visualizar os dados.</p>
            </div>
        </div>
    `;

    document.getElementById('load-results-btn').addEventListener('click', loadResults);
    document.getElementById('export-results-btn').addEventListener('click', exportResults);
}

async function loadResults() {
    const db = firebase.firestore();
    const resultsDiv = document.getElementById('results-content');
    
    resultsDiv.innerHTML = '<p>Carregando resultados...</p>';
    
    try {
        const snapshot = await db.collection('respostas_avaliacao_institucional').get();
        
        if (snapshot.empty) {
            resultsDiv.innerHTML = '<p>Nenhuma resposta encontrada.</p>';
            return;
        }
        
        let html = '<h3>Resumo das Respostas</h3>';
        html += '<table class="users-table"><thead><tr><th>Usuário ID</th><th>Tipo</th><th>Data</th><th>Respostas</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString('pt-BR') : 'N/A';
            const answersCount = data.answers ? Object.keys(data.answers).length : 0;
            
            html += `
                <tr>
                    <td>${data.userId || 'N/A'}</td>
                    <td>${data.userRole || 'N/A'}</td>
                    <td>${date}</td>
                    <td>${answersCount} respostas</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        html += `<p style="margin-top: 20px;">Total de respostas: ${snapshot.size}</p>`;
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        console.error('Error loading results:', error);
        resultsDiv.innerHTML = '<p>Erro ao carregar resultados.</p>';
    }
}

async function exportResults() {
    alert('Funcionalidade de exportação será implementada em breve.');
}

