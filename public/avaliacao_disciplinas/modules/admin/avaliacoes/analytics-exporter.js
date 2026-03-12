import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import autoTableModule from 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/+esm';

const autoTable = autoTableModule.default || autoTableModule;

export class AnalyticsExporter {

    constructor() {
        this.pdf = null;
        this.yOffset = 0;
        this.pdfWidth = 0;
        this.pdfHeight = 0;
        this.pageMargin = 15;
    }

    async exportAnalytics(summary, studentAnalytics, professorAnalytics, disciplineAnalytics, activeFiltersText, filteredData = [], isDetailed = false) {
        this.showLoading(true);

        try {
            this.pdf = new jsPDF('p', 'mm', 'a4');
            this.pdfWidth = this.pdf.internal.pageSize.getWidth();
            this.pdfHeight = this.pdf.internal.pageSize.getHeight();
            this.yOffset = this.pageMargin;

            // 1. Cabeçalho Executivo Refinado
            this.addExecutiveHeader(activeFiltersText);

            // 2. Cartões de KPI Melhorados (Fontes maiores, melhor alinhamento)
            this.addNativeKPICards(summary);

            // 3. Gráficos com Proporção Controlada
            await this.addCompactCharts();

            // 4. Rankings com Alto Contraste
            this.addNativeRankings(professorAnalytics, disciplineAnalytics);

            // 5. Relatório Detalhado (Otimizado para não esmagar textos)
            if (isDetailed && filteredData && filteredData.length > 0) {
                await this.addDetailedResponses(filteredData);
            }

            this.pdf.save(`relatorio-institucional-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro na geração do PDF.');
        } finally {
            this.showLoading(false);
        }
    }

    addExecutiveHeader(filterText) {
        // Fundo Escuro Moderno (Slate-900)
        this.pdf.setFillColor(15, 23, 42); 
        this.pdf.rect(0, 0, this.pdfWidth, 28, 'F');

        // Título Maior e Mais Limpo
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.setFontSize(20);
        this.pdf.setFont("helvetica", "bold");
        this.pdf.text('Relatório Institucional de Avaliações', this.pageMargin, 18);

        this.yOffset = 36;

        // Metadados com melhor hierarquia
        this.pdf.setTextColor(100, 116, 139); 
        this.pdf.setFontSize(9);
        this.pdf.setFont("helvetica", "normal");
        const today = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR');
        this.pdf.text(`Documento gerado em: ${today}`, this.pageMargin, this.yOffset);
        
        if (filterText) {
            this.yOffset += 6;
            this.pdf.setFont("helvetica", "bold");
            this.pdf.setTextColor(2, 132, 199); // Azul Sky-600
            this.pdf.text(`Filtros Aplicados: ${filterText}`, this.pageMargin, this.yOffset);
        }
        this.yOffset += 14;
    }

    addNativeKPICards(summary) {
        if (!summary) return;

        // Espaçamento e dimensionamento melhorados
        const gap = 6;
        const cardWidth = (this.pdfWidth - (this.pageMargin * 2) - (gap * 2)) / 3; 
        const cardHeight = 24;

        const metrics = [
            { title: 'MÉDIA GERAL', value: summary.mediaGeral, color: [14, 165, 233] },
            { title: 'TOTAL AVALIAÇÕES', value: summary.totalAvaliacoes, color: [16, 185, 129] },
            { title: 'NPS', value: summary.nps !== undefined ? summary.nps : 'N/A', color: [245, 158, 11] },
            { title: 'PROFESSORES', value: summary.totalProfessores, color: [100, 116, 139] },
            { title: 'DISCIPLINAS', value: summary.totalDisciplinas, color: [100, 116, 139] },
            { title: 'ALUNOS', value: summary.totalAlunos, color: [100, 116, 139] }
        ];

        let startX = this.pageMargin;
        let startY = this.yOffset;

        metrics.forEach((metric, index) => {
            if (index > 0 && index % 3 === 0) {
                startX = this.pageMargin;
                startY += cardHeight + gap;
            }

            // Fundo do cartão
            this.pdf.setFillColor(248, 250, 252);
            this.pdf.setDrawColor(203, 213, 225);
            this.pdf.roundedRect(startX, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

            // Linha lateral mais grossa (4px)
            this.pdf.setFillColor(...metric.color);
            this.pdf.roundedRect(startX, startY, 4, cardHeight, 1.5, 1.5, 'F');

            // Título (Ajustado verticalmente)
            this.pdf.setFontSize(8);
            this.pdf.setTextColor(100, 116, 139);
            this.pdf.setFont("helvetica", "bold");
            this.pdf.text(metric.title, startX + 10, startY + 8);

            // Valor (Maior e mais escuro)
            this.pdf.setFontSize(18);
            this.pdf.setTextColor(15, 23, 42);
            this.pdf.text(String(metric.value), startX + 10, startY + 18);

            startX += cardWidth + gap;
        });

        this.yOffset = startY + cardHeight + 16;
    }

    async addCompactCharts() {
        const getHighResImg = (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(canvas, 0, 0);
            return { data: tempCanvas.toDataURL('image/jpeg', 1.0), aspect: canvas.width / canvas.height };
        };

        const catImg = getHighResImg('categoryChart');
        const distImg = getHighResImg('distributionChart');
        const semImg = getHighResImg('semesterChart');

        const contentWidth = this.pdfWidth - (this.pageMargin * 2);
        const gap = 10;
        const halfWidth = (contentWidth - gap) / 2;

        this.pdf.setFontSize(11);
        this.pdf.setTextColor(15, 23, 42);
        this.pdf.setFont("helvetica", "bold");
        
        if (catImg && distImg) {
            this.checkPageBreak(halfWidth / catImg.aspect + 20);
            
            this.pdf.text("Respostas por Categoria", this.pageMargin, this.yOffset);
            this.pdf.text("Distribuição de Notas", this.pageMargin + halfWidth + gap, this.yOffset);
            this.yOffset += 6;

            this.pdf.addImage(catImg.data, 'JPEG', this.pageMargin, this.yOffset, halfWidth, halfWidth / catImg.aspect);
            this.pdf.addImage(distImg.data, 'JPEG', this.pageMargin + halfWidth + gap, this.yOffset, halfWidth, halfWidth / distImg.aspect);
            
            this.yOffset += (halfWidth / catImg.aspect) + 16;
        }

        if (semImg) {
            // CORREÇÃO: Limitar a altura máxima do gráfico de semestre para não virar um bloco azul
            let semHeight = contentWidth / semImg.aspect;
            if (semHeight > 55) semHeight = 55; 

            this.checkPageBreak(semHeight + 20);
            
            this.pdf.text("Evolução por Semestre", this.pageMargin, this.yOffset);
            this.yOffset += 6;
            this.pdf.addImage(semImg.data, 'JPEG', this.pageMargin, this.yOffset, contentWidth, semHeight);
            this.yOffset += semHeight + 16;
        }
    }

    addNativeRankings(professorAnalytics, disciplineAnalytics) {
        const topProfs = professorAnalytics.sort((a, b) => b.mediaGeral - a.mediaGeral).slice(0, 10);
        const topDiscs = disciplineAnalytics.sort((a, b) => b.mediaGeral - a.mediaGeral).slice(0, 10);

        // Configuração Premium para Tabelas
        const tableConfig = {
            theme: 'striped',
            headStyles: { 
                fillColor: [15, 23, 42], // Azul muito escuro para contraste
                textColor: 255, 
                fontStyle: 'bold', 
                fontSize: 9,
                cellPadding: 5
            },
            bodyStyles: { 
                textColor: [51, 65, 85], 
                fontSize: 9,
                cellPadding: 5
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: this.pageMargin, right: this.pageMargin }
        };

        if (topProfs.length > 0) {
            this.checkPageBreak(60); 
            this.pdf.setFontSize(13);
            this.pdf.setTextColor(15, 23, 42);
            this.pdf.text("Top 10 - Desempenho de Professores", this.pageMargin, this.yOffset);
            this.yOffset += 6;

            autoTable(this.pdf, {
                ...tableConfig,
                startY: this.yOffset,
                head: [['Professor', 'Média', 'Respostas', 'Disciplinas']],
                body: topProfs.map(p => [p.professorNome, p.mediaGeral.toFixed(2), p.totalRespostas, p.disciplinas.length]),
                didDrawPage: (data) => { this.yOffset = data.cursor.y + 16; }
            });
        }

        if (topDiscs.length > 0) {
            this.checkPageBreak(60);
            this.pdf.setFontSize(13);
            this.pdf.setTextColor(15, 23, 42);
            this.pdf.text("Top 10 - Desempenho de Disciplinas", this.pageMargin, this.yOffset);
            this.yOffset += 6;

            autoTable(this.pdf, {
                ...tableConfig,
                startY: this.yOffset,
                head: [['Disciplina', 'Código', 'Média', 'Respostas']],
                body: topDiscs.map(d => [d.disciplinaNome, d.disciplinaCodigo || '-', d.mediaGeral.toFixed(2), d.totalRespostas]),
                didDrawPage: (data) => { this.yOffset = data.cursor.y + 16; }
            });
        }
    }

    async addDetailedResponses(filteredData) {
        const avaliacoesMap = new Map();
        
        filteredData.forEach(item => {
            if (!avaliacoesMap.has(item.avaliacaoId)) {
                avaliacoesMap.set(item.avaliacaoId, {
                    disciplina: item.disciplinaNome,
                    semestre: item.semestre,
                    professor: item.professorNome,
                    respostas: {}
                });
            }
            avaliacoesMap.get(item.avaliacaoId).respostas[item.questaoTexto] = item.respostaValor;
        });

        const questoesPorCategoria = { disciplina: new Set(), professor: new Set(), aluno: new Set() };
        filteredData.forEach(item => {
            if (questoesPorCategoria[item.tipo]) {
                questoesPorCategoria[item.tipo].add(item.questaoTexto);
            }
        });

        const categorias = [
            { id: 'disciplina', titulo: 'Avaliação da Disciplina' },
            { id: 'professor', titulo: 'Avaliação do Professor' },
            { id: 'aluno', titulo: 'Autoavaliação do Aluno' }
        ];

        categorias.forEach(cat => {
            const perguntas = Array.from(questoesPorCategoria[cat.id]);
            if (perguntas.length === 0) return; 

            const head = [['Disciplina', 'Professor', ...perguntas]];
            const body = [];
            
            avaliacoesMap.forEach(av => {
                let temResposta = false;
                const row = [`${av.disciplina}\n(${av.semestre})`, av.professor];
                
                perguntas.forEach(p => {
                    const resp = av.respostas[p];
                    if (resp !== undefined && typeof resp === 'number') temResposta = true;
                    row.push(resp !== undefined ? resp : '-');
                });

                if (temResposta) body.push(row);
            });

            if (body.length > 0) {
                this.pdf.addPage('a4', 'l'); 
                
                // CORREÇÃO DA TABELA DETALHADA: Mais legível e sem esmagar
                autoTable(this.pdf, {
                    startY: 28,
                    head: head,
                    body: body,
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [15, 23, 42], 
                        textColor: 255,
                        fontSize: 6.5, // Fonte menor no cabeçalho para acomodar textos longos
                        halign: 'center', 
                        valign: 'middle',
                        cellPadding: 2,
                        minCellHeight: 15 // Garante que o cabeçalho não fica bizarramente alto
                    },
                    bodyStyles: { 
                        fontSize: 7.5, 
                        halign: 'center', 
                        valign: 'middle',
                        textColor: [51, 65, 85]
                    },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    columnStyles: {
                        0: { halign: 'left', cellWidth: 35, fontStyle: 'bold' }, 
                        1: { halign: 'left', cellWidth: 30 }  
                    },
                    margin: { left: 10, right: 10, bottom: 15 },
                    didDrawPage: (data) => {
                        const pageWidth = this.pdf.internal.pageSize.getWidth();
                        this.pdf.setFillColor(15, 23, 42);
                        this.pdf.rect(0, 0, pageWidth, 18, 'F');
                        
                        this.pdf.setTextColor(255, 255, 255);
                        this.pdf.setFontSize(14);
                        this.pdf.setFont("helvetica", "bold");
                        this.pdf.text(`Respostas Detalhadas: ${cat.titulo} (Anônimo)`, 10, 12);
                    }
                });
            }
        });
    }

    checkPageBreak(contentHeight) {
        if (this.yOffset + contentHeight > this.pdfHeight - this.pageMargin) {
            this.pdf.addPage();
            this.yOffset = this.pageMargin + 5;
        }
    }

    showLoading(show) {
        let loadingEl = document.getElementById('pdf-loading-overlay');
        if (show) {
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.id = 'pdf-loading-overlay';
                loadingEl.innerHTML = `
                    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.8);display:flex;justify-content:center;align-items:center;z-index:9998; backdrop-filter: blur(4px);">
                        <div style="padding:30px;background:white;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);text-align:center;">
                            <h3 style="margin:0 0 10px;color:#0f172a;font-family:sans-serif;">Gerando Relatório Executivo</h3>
                            <p style="margin:0;color:#64748b;font-family:sans-serif;">Processando dados e formatando tabelas...</p>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingEl);
            }
        } else {
            if (loadingEl) loadingEl.remove();
        }
    }
}