// analytics-exporter.js

// 1. IMPORTAÇÕES CORRIGIDAS
// Importamos o jsPDF
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
// Importamos o html2canvas (que os seus ficheiros antigos usam)
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';
// REMOVEMOS a importação do 'jspdf-autotable' que causou o erro.

// Importar a legenda (do seu 'chart_legend.js')
import { getRatingLegendElement } from '../../../../chart_legend.js';

export class AnalyticsExporter {

    constructor() {
        this.pdf = null;
        this.yOffset = 0; // Para controlar a posição vertical no PDF
        this.pdfWidth = 0;
        this.pdfHeight = 0;
        this.pageMargin = 15;
    }

    /**
     * Função principal chamada pelo avaliacoes-manager.js
     */
    async exportAnalytics(summary, studentAnalytics, professorAnalytics, disciplineAnalytics, activeFiltersText) {
        this.showLoading(true);

        try {
            this.pdf = new jsPDF('p', 'mm', 'a4');
            this.pdfWidth = this.pdf.internal.pageSize.getWidth();
            this.pdfHeight = this.pdf.internal.pageSize.getHeight();
            this.yOffset = this.pageMargin;

            // Passamos o texto dos filtros para o cabeçalho
            this.addHeader(activeFiltersText);

            await this.addLegend();
            await this.addSummaryData(summary);

            // Tabelas melhoradas
            await this.addDataTables(professorAnalytics, disciplineAnalytics);

            await this.addCharts();

            this.pdf.save(`relatorio-filtrado-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro na geração do PDF.');
        } finally {
            this.showLoading(false);
        }
    }

    addHeader(filterText) {
        // Título Principal
        this.pdf.setFillColor(14, 165, 233); // Azul Primary
        this.pdf.rect(0, 0, this.pdfWidth, 25, 'F');

        this.pdf.setTextColor(255, 255, 255);
        this.pdf.setFontSize(22);
        this.pdf.setFont("helvetica", "bold");
        this.pdf.text('Relatório de Avaliação', this.pageMargin, 16);

        this.yOffset = 35;

        // Data e Filtros
        this.pdf.setTextColor(80, 80, 80);
        this.pdf.setFontSize(10);
        this.pdf.setFont("helvetica", "normal");

        const today = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR');
        this.pdf.text(`Gerado em: ${today}`, this.pageMargin, this.yOffset);
        this.yOffset += 6;

        // Mostra os filtros que vieram do Manager
        if (filterText) {
            this.pdf.setFont("helvetica", "bold");
            this.pdf.text(`Filtros Aplicados:`, this.pageMargin, this.yOffset);
            this.pdf.setFont("helvetica", "normal");

            // Quebra de linha se o texto for muito longo
            const splitText = this.pdf.splitTextToSize(filterText, this.pdfWidth - (this.pageMargin * 2));
            this.pdf.text(splitText, this.pageMargin + 30, this.yOffset);
            this.yOffset += (splitText.length * 5) + 10;
        } else {
            this.yOffset += 10;
        }
    }

    async addDataTables(professorAnalytics, disciplineAnalytics) {
        // Estilo CSS para as tabelas (injetado no HTML)
        const tableStyle = `
            width: 100%; 
            border-collapse: collapse; 
            font-family: 'Helvetica', sans-serif; 
            font-size: 11px;
            color: #333;
        `;
        const thStyle = `
            background-color: #0ea5e9; 
            color: white; 
            padding: 8px; 
            text-align: left; 
            font-weight: bold;
            border-bottom: 2px solid #0284c7;
        `;
        const tdStyle = `
            padding: 8px; 
            border-bottom: 1px solid #e2e8f0;
        `;
        const rowStriped = `background-color: #f8fafc;`;

        // --- Tabela de Professores ---
        // Ordenar por Média (descendente) para ficar mais útil
        const sortedProfessors = professorAnalytics.sort((a, b) => b.mediaGeral - a.mediaGeral);

        let profHtml = `
            <div style="padding: 15px; background: white; width: 750px;">
            <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 15px; border-left: 4px solid #0ea5e9; padding-left: 10px;">
                Desempenho por Professor (Top Resultados)
            </h3>
            <table style="${tableStyle}">
                <thead>
                    <tr>
                        <th style="${thStyle}">Professor</th>
                        <th style="${thStyle} text-align: center;">Média</th>
                        <th style="${thStyle} text-align: center;">NPS/Qualidade</th>
                        <th style="${thStyle} text-align: center;">Respostas</th>
                        <th style="${thStyle} text-align: center;">Disciplinas</th>
                    </tr>
                </thead>
                <tbody>
        `;

        sortedProfessors.forEach((p, index) => {
            const bg = index % 2 === 0 ? rowStriped : '';
            // Badge visual para a nota
            let badgeColor = p.mediaGeral >= 4.5 ? '#166534' : (p.mediaGeral >= 3.5 ? '#15803d' : '#ca8a04');
            let badgeText = p.mediaGeral >= 4.5 ? 'Excelente' : (p.mediaGeral >= 3.5 ? 'Bom' : 'Atenção');
            if (p.mediaGeral < 3) { badgeColor = '#dc2626'; badgeText = 'Crítico'; }

            profHtml += `
                <tr style="${bg}">
                    <td style="${tdStyle} font-weight: 500;">${p.professorNome}</td>
                    <td style="${tdStyle} text-align: center; font-weight: bold; font-size: 12px;">${p.mediaGeral.toFixed(2)}</td>
                    <td style="${tdStyle} text-align: center;">
                        <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 9px;">${badgeText}</span>
                    </td>
                    <td style="${tdStyle} text-align: center;">${p.totalRespostas}</td>
                    <td style="${tdStyle} text-align: center;">${p.disciplinas.length}</td>
                </tr>
            `;
        });
        profHtml += `</tbody></table></div>`;

        // Renderiza e adiciona Professor Table
        let elProf = document.createElement('div');
        elProf.innerHTML = profHtml;
        let imgProf = await this.renderHtmlToImage(elProf, 750); // Largura fixa para consistência

        // Ajuste de escala para caber na página A4 (largura ~190mm com margens)
        let imgWidthProf = this.pdfWidth - (this.pageMargin * 2);
        let imgHeightProf = (imgProf.height * imgWidthProf) / imgProf.width;

        this.checkPageBreak(imgHeightProf + 10);
        this.pdf.addImage(imgProf.url, 'PNG', this.pageMargin, this.yOffset, imgWidthProf, imgHeightProf);
        this.yOffset += imgHeightProf + 10;

        // ... Repita lógica similar para Disciplinas se desejar, ou mantenha simplificado ...
    }

    // --- FUNÇÕES AUXILIARES ---

    /**
     * Adiciona um cabeçalho ao PDF com título, data e filtros.
     */
    addHeader() {
        this.pdf.setFontSize(18);
        this.pdf.text('Relatório de Análise de Avaliações', this.pdfWidth / 2, this.yOffset, { align: 'center' });
        this.yOffset += 8;

        const today = new Date();
        this.pdf.setFontSize(10);
        this.pdf.text(`Exportado em: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`, this.pdfWidth / 2, this.yOffset, { align: 'center' });
        this.yOffset += 5;

        // ... (Lógica dos filtros permanece a mesma) ...
        const year = document.getElementById('yearFilter')?.value || 'all';
        const professor = document.getElementById('professorAnalyticsFilter')?.value || 'all';
        let filterText = "Filtros: ";
        if (year !== 'all') filterText += `Ano: ${year} | `;
        if (professor !== 'all') filterText += `Professor: ${professor} | `;

        if (filterText !== "Filtros: ") {
            this.pdf.setFontSize(9);
            this.pdf.text(filterText, this.pdfWidth / 2, this.yOffset, { align: 'center' });
            this.yOffset += 10;
        }
    }

    /**
     * Helper para renderizar um elemento HTML para uma imagem.
     * (Lógica dos seus 'response_exporter.js')
     */
    async renderHtmlToImage(element, width) {
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px'; // Renderizar fora do ecrã
        tempContainer.style.width = `${width}px`;
        tempContainer.style.background = 'white';
        tempContainer.appendChild(element);
        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempContainer, {
            scale: 2, // Alta resolução
            logging: false,
            useCORS: true,
            backgroundColor: 'white'
        });

        document.body.removeChild(tempContainer); // Limpar o DOM

        return {
            url: canvas.toDataURL('image/png', 1.0),
            width: canvas.width,
            height: canvas.height
        };
    }

    /**
     * Adiciona a legenda de notas (1-5) usando html2canvas
     */
    async addLegend() {
        // Esta é a linha que causou o erro (144). Agora corrigida.
        // this.pdf.autoTable(...) FOI REMOVIDA.

        // Usamos a sua função de 'chart_legend.js' para obter o HTML
        const legendElement = getRatingLegendElement();

        // Usamos o 'html2canvas' para "fotografar" o elemento
        const imgData = await this.renderHtmlToImage(legendElement, 600);

        const imgWidth = this.pdfWidth - (this.pageMargin * 2);
        const imgHeight = (imgData.height * imgWidth) / imgData.width;

        this.checkPageBreak(imgHeight + 10); // Verificar espaço
        this.pdf.addImage(imgData.url, 'PNG', this.pageMargin, this.yOffset, imgWidth, imgHeight);
        this.yOffset += imgHeight + 10;
    }

    /**
     * Adiciona os dados do sumário usando html2canvas
     */
    async addSummaryData(summary) {
        if (!summary) return;

        // 1. Criar o HTML para o sumário
        const summaryHtml = `
            <div style="padding: 10px; background: white; font-family: Helvetica; font-size: 11px; width: 600px; color: #333;">
                <h3 style="font-size: 14px; color: #1e40af; margin-bottom: 8px;">Resumo Geral</h3>
                <table style="width: 100%;">
                    <tr style="vertical-align: top;">
                        <td style="padding: 3px;">
                            <div><strong>Total de Avaliações:</strong> ${summary.totalAvaliacoes}</div>
                            <div><strong>Total de Alunos:</strong> ${summary.totalAlunos}</div>
                            <div><strong>Total de Turmas:</strong> ${summary.totalTurmas}</div>
                        </td>
                        <td style="padding: 3px;">
                            <div><strong>Total de Professores:</strong> ${summary.totalProfessores}</div>
                            <div><strong>Total de Disciplinas:</strong> ${summary.totalDisciplinas}</div>
                            <div><strong>Média Geral:</strong> ${summary.mediaGeral}</div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 3px;">
                            <div><strong>Taxa de Participação:</strong> ${summary.taxaParticipacao}</div>
                        </td>
                    </tr>
                </table>
            </div>
        `;
        const el = document.createElement('div');
        el.innerHTML = summaryHtml;

        // 2. Renderizar o HTML para imagem
        const imgData = await this.renderHtmlToImage(el, 600);
        const imgWidth = this.pdfWidth - (this.pageMargin * 2);
        const imgHeight = (imgData.height * imgWidth) / imgData.width;

        // 3. Adicionar imagem ao PDF
        this.checkPageBreak(imgHeight + 10);
        this.pdf.addImage(imgData.url, 'PNG', this.pageMargin, this.yOffset, imgWidth, imgHeight);
        this.yOffset += imgHeight + 10;
    }

    /**
     * Adiciona as tabelas de dados de Professores e Disciplinas usando html2canvas
     */
    async addDataTables(professorAnalytics, disciplineAnalytics) {
        // --- Tabela de Professores ---
        let profHtml = `
            <div style="padding: 10px; background: white; font-family: Helvetica; font-size: 10px; width: 800px;">
            <h3 style="font-size: 14px; color: #1e40af; margin-bottom: 8px;">Desempenho por Professor</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead style="background-color: #f0f4f8; color: #333;">
                    <tr>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Professor</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Média Geral</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Respostas</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Disciplinas</th>
                    </tr>
                </thead>
                <tbody>
        `;
        professorAnalytics.forEach(p => {
            profHtml += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${p.professorNome}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${p.mediaGeral.toFixed(2)}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${p.totalRespostas}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${p.disciplinas.length}</td>
                </tr>
            `;
        });
        profHtml += `</tbody></table></div>`;

        let elProf = document.createElement('div');
        elProf.innerHTML = profHtml;
        let imgProf = await this.renderHtmlToImage(elProf, 800);
        let imgWidthProf = this.pdfWidth - (this.pageMargin * 2);
        let imgHeightProf = (imgProf.height * imgWidthProf) / imgProf.width;

        this.checkPageBreak(imgHeightProf + 10);
        this.pdf.addImage(imgProf.url, 'PNG', this.pageMargin, this.yOffset, imgWidthProf, imgHeightProf);
        this.yOffset += imgHeightProf + 10;

        // --- Tabela de Disciplinas ---
        let discHtml = `
            <div style="padding: 10px; background: white; font-family: Helvetica; font-size: 10px; width: 800px;">
            <h3 style="font-size: 14px; color: #1e40af; margin-bottom: 8px;">Desempenho por Disciplina</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead style="background-color: #f0f4f8; color: #333;">
                    <tr>
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Disciplina</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Código</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Média Geral</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Respostas</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Alunos</th>
                    </tr>
                </thead>
                <tbody>
        `;
        disciplineAnalytics.forEach(d => {
            discHtml += `
                <tr>
                    <td style="padding: 5px; border: 1px solid #ddd;">${d.disciplinaNome}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${d.disciplinaCodigo}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${d.mediaGeral.toFixed(2)}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${d.totalRespostas}</td>
                    <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${d.alunos.length}</td>
                </tr>
            `;
        });
        discHtml += `</tbody></table></div>`;

        let elDisc = document.createElement('div');
        elDisc.innerHTML = discHtml;
        let imgDisc = await this.renderHtmlToImage(elDisc, 800);
        let imgWidthDisc = this.pdfWidth - (this.pageMargin * 2);
        let imgHeightDisc = (imgDisc.height * imgWidthDisc) / imgDisc.width;

        this.checkPageBreak(imgHeightDisc + 10);
        this.pdf.addImage(imgDisc.url, 'PNG', this.pageMargin, this.yOffset, imgWidthDisc, imgHeightDisc);
        this.yOffset += imgHeightDisc + 10;
    }

    /**
     * Adiciona os gráficos da aba "Visão Geral" ao PDF.
     * (Esta função estava correta e permanece a mesma)
     */
    async addCharts() {
        const chartIds = [
            { id: 'categoryChart', title: 'Respostas por Categoria' },
            { id: 'distributionChart', title: 'Distribuição das Respostas (1-5)' },
            { id: 'semesterChart', title: 'Média por Semestre' },
            //{ id: 'timelineChart', title: 'Avaliações ao Longo do Tempo' }
        ];

        // Adiciona uma nova página para os gráficos
        this.pdf.addPage();
        this.yOffset = this.pageMargin;
        this.pdf.setFontSize(16);
        this.pdf.text("Gráficos da Visão Geral", this.pdfWidth / 2, this.yOffset, { align: 'center' });
        this.yOffset += 10;

        for (const chartInfo of chartIds) {
            const canvas = document.getElementById(chartInfo.id);
            if (!canvas) {
                console.warn(`Gráfico ${chartInfo.id} não encontrado.`);
                continue;
            }

            // Usar 'toDataURL' diretamente do canvas (melhor que html2canvas)
            const imgData = canvas.toDataURL('image/png', 1.0);

            const canvasAspect = canvas.width / canvas.height;
            const imgWidth = this.pdfWidth - (this.pageMargin * 2);
            const imgHeight = imgWidth / canvasAspect;

            this.checkPageBreak(imgHeight + 10);

            this.pdf.setFontSize(12);
            this.pdf.text(chartInfo.title, this.pageMargin, this.yOffset);
            this.yOffset += 5;

            this.pdf.addImage(imgData, 'PNG', this.pageMargin, this.yOffset, imgWidth, imgHeight);
            this.yOffset += imgHeight + 10;
        }
    }

    /**
     * Verifica se o conteúdo cabe na página atual, se não, adiciona uma nova.
     * (Nenhuma mudança aqui)
     */
    checkPageBreak(contentHeight) {
        if (this.yOffset + contentHeight > this.pdfHeight - this.pageMargin) {
            this.pdf.addPage();
            this.yOffset = this.pageMargin;
        }
    }

    /**
     * Mostra ou esconde um 'overlay' de carregamento.
     * (Nenhuma mudança aqui)
     */
    showLoading(show) {
        let loadingEl = document.getElementById('pdf-loading-overlay');
        if (show) {
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.id = 'pdf-loading-overlay';
                loadingEl.innerHTML = `
                    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:9998;">
                        <div style="padding:25px 30px;background:white;border-radius:8px;box-shadow:0 0 15px rgba(0,0,0,0.2);text-align:center;">
                            <h3 style="margin:0;color:#333;">Gerando Relatório PDF...</h3>
                            <p style="margin:10px 0 0;color:#555;">Isto pode demorar alguns segundos.</p>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingEl);
            }
        } else {
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }
}