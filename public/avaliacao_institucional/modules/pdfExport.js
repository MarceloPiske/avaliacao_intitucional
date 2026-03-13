import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import autoTableModule from 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/+esm';

const autoTable = autoTableModule.default || autoTableModule;

export async function exportResultsToPDF(questionFilter, typeFilter, allResponses, allQuestions) {
    showLoading(true);

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - 2 * margin;
        let yPos = margin;

        // Cabeçalho
        doc.setFillColor(126, 34, 206);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('Relatório Executivo - CPA', margin, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(233, 213, 255);
        doc.text(`Comissão Própria de Avaliação Institucional | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, 26);

        yPos = 45;

        // Filtros
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const typeLabel = typeFilter === 'all' ? 'Todos os Perfis' : (typeFilter === 'aluno' ? 'Apenas Alunos' : (typeFilter === 'professor' ? 'Apenas Professores' : 'Apenas Técnicos'));
        const questionLabel = questionFilter === 'all' ? 'Todas as Perguntas' : `ID da Questão: ${questionFilter}`;
        doc.text(`Filtros: ${typeLabel} | ${questionLabel}`, margin, yPos);
        yPos += 12;

        // KPIs
        const stats = calculateStatistics(allResponses, questionFilter);
        const cardWidth = (contentWidth - 10) / 3;
        const cardHeight = 22;
        const kpis = [
            { title: 'TOTAL AVALIAÇÕES', value: stats.totalResponses, color: [168, 85, 247] },
            { title: 'MÉDIA GERAL', value: stats.avgRating, color: [14, 165, 233] },
            { title: 'PARTICIPAÇÃO (ALUNOS)', value: stats.alunoResponses, color: [34, 197, 94] }
        ];

        kpis.forEach((kpi, index) => {
            const startX = margin + index * (cardWidth + 5);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(startX, yPos, cardWidth, cardHeight, 2, 2, 'FD');
            doc.setFillColor(...kpi.color);
            doc.roundedRect(startX, yPos, 3, cardHeight, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.setFont("helvetica", "bold");
            doc.text(kpi.title, startX + 8, yPos + 8);
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            doc.text(String(kpi.value), startX + 8, yPos + 18);
        });

        yPos += cardHeight + 15;

        // Gráficos
        yPos = await drawChartsToPDF(doc, yPos, margin, contentWidth, stats, allResponses, questionFilter);

        if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin; }

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalhamento por Pergunta Oficial (SINAES)', margin, yPos);
        yPos += 8;

        const tableData = prepareTableData(allResponses, allQuestions, questionFilter);

        autoTable(doc, {
            startY: yPos,
            head: [['ID', 'Texto da Pergunta', 'Média', 'Alunos', 'Prof/Téc', 'Distr. (1 a 5)']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [126, 34, 206], textColor: 255, fontStyle: 'bold', fontSize: 9, valign: 'middle' },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 9, valign: 'middle' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
                1: { cellWidth: 80 },
                2: { halign: 'center', fontStyle: 'bold', textColor: [126, 34, 206] },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center', fontSize: 8, textColor: [100, 116, 139] }
            },
            margin: { left: margin, right: margin }
        });

        doc.save(`Relatorio_CPA_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Erro na exportação PDF:', error);
        alert('Ocorreu um erro ao gerar o PDF.');
    } finally {
        showLoading(false);
    }
}

function calculateStatistics(allResponses, questionFilter) {
    const totalResponses = allResponses.length;
    const alunoResponses = allResponses.filter(r => r.userRole === 'aluno').length;
    const professorResponses = allResponses.filter(r => r.userRole === 'professor').length;
    const tecnicoResponses = allResponses.filter(r => r.userRole === 'tecnico').length;
    let totalRatings = 0; let ratingCount = 0;
    const distributionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    const r = parseInt(rating);
                    totalRatings += r; ratingCount++; distributionData[r]++;
                }
            });
        }
    });

    return { totalResponses, alunoResponses, profTecResponses: professorResponses + tecnicoResponses, avgRating: ratingCount > 0 ? (totalRatings / ratingCount).toFixed(2) : '0.00', distributionData };
}

function prepareTableData(allResponses, allQuestions, questionFilter) {
    const questionData = {};
    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || String(qId) === String(questionFilter)) {
                    if (!questionData[qId]) {
                        questionData[qId] = { ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0, count: 0, byRole: { aluno: { total: 0, count: 0 }, profTec: { total: 0, count: 0 } } };
                    }
                    const r = parseInt(rating);
                    questionData[qId].ratings[r]++; questionData[qId].total += r; questionData[qId].count++;
                    if (response.userRole === 'aluno') {
                        questionData[qId].byRole.aluno.total += r; questionData[qId].byRole.aluno.count++;
                    } else {
                        questionData[qId].byRole.profTec.total += r; questionData[qId].byRole.profTec.count++;
                    }
                }
            });
        }
    });

    const sortedQuestions = Object.keys(questionData).sort((a, b) => parseInt(a) - parseInt(b));
    const tableRows = [];

    sortedQuestions.forEach(qId => {
        const data = questionData[qId];
        
        // CORREÇÃO AQUI: Força a comparação de Strings para encontrar a pergunta
        const question = allQuestions.find(q => String(q.id) === String(qId));
        
        const questionText = question ? question.texto : `Pergunta não mapeada (ID: ${qId})`;
        const avgGen = (data.total / data.count).toFixed(2);
        const avgAluno = data.byRole.aluno.count > 0 ? (data.byRole.aluno.total / data.byRole.aluno.count).toFixed(2) : '-';
        const avgProf = data.byRole.profTec.count > 0 ? (data.byRole.profTec.total / data.byRole.profTec.count).toFixed(2) : '-';
        const distStr = `${data.ratings[1]} | ${data.ratings[2]} | ${data.ratings[3]} | ${data.ratings[4]} | ${data.ratings[5]}`;
        tableRows.push([qId, questionText, avgGen, avgAluno, avgProf, distStr]);
    });

    return tableRows;
}

async function drawChartsToPDF(doc, yPos, margin, contentWidth, stats, allResponses, questionFilter) {
    const halfWidth = (contentWidth - 10) / 2;
    doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text("Distribuição de Notas Finais", margin, yPos);
    doc.text("Satisfação por Perfil", margin + halfWidth + 10, yPos);
    yPos += 5;

    const canvas1 = document.createElement('canvas'); canvas1.width = 800; canvas1.height = 450;
    const ctx1 = canvas1.getContext('2d'); ctx1.fillStyle = '#FFFFFF'; ctx1.fillRect(0, 0, canvas1.width, canvas1.height);
    const chart1 = new Chart(ctx1, {
        type: 'bar',
        data: { labels: ['Nota 1', 'Nota 2', 'Nota 3', 'Nota 4', 'Nota 5'], datasets: [{ data: [stats.distributionData[1], stats.distributionData[2], stats.distributionData[3], stats.distributionData[4], stats.distributionData[5]], backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'], borderRadius: 8 }] },
        options: { animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const roleAverages = { aluno: { t: 0, c: 0 }, prof: { t: 0, c: 0 }, tec: { t: 0, c: 0 } };
    allResponses.forEach(r => {
        if (r.answers) {
            Object.entries(r.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || String(qId) === String(questionFilter)) {
                    if (r.userRole === 'aluno') { roleAverages.aluno.t += parseInt(rating); roleAverages.aluno.c++; }
                    else if (r.userRole === 'professor') { roleAverages.prof.t += parseInt(rating); roleAverages.prof.c++; }
                    else { roleAverages.tec.t += parseInt(rating); roleAverages.tec.c++; }
                }
            });
        }
    });

    const canvas2 = document.createElement('canvas'); canvas2.width = 800; canvas2.height = 450;
    const ctx2 = canvas2.getContext('2d'); ctx2.fillStyle = '#FFFFFF'; ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
    const chart2 = new Chart(ctx2, {
        type: 'bar',
        data: { labels: ['Alunos', 'Professores', 'Técnicos'], datasets: [{ data: [ roleAverages.aluno.c > 0 ? roleAverages.aluno.t / roleAverages.aluno.c : 0, roleAverages.prof.c > 0 ? roleAverages.prof.t / roleAverages.prof.c : 0, roleAverages.tec.c > 0 ? roleAverages.tec.t / roleAverages.tec.c : 0 ], backgroundColor: ['#3b82f6', '#f59e0b', '#a855f7'], borderRadius: 8 }] },
        options: { animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5 } } }
    });

    await new Promise(resolve => setTimeout(resolve, 300));
    doc.addImage(canvas1.toDataURL('image/jpeg', 1.0), 'JPEG', margin, yPos, halfWidth, halfWidth * 0.6);
    doc.addImage(canvas2.toDataURL('image/jpeg', 1.0), 'JPEG', margin + halfWidth + 10, yPos, halfWidth, halfWidth * 0.6);
    chart1.destroy(); chart2.destroy();
    
    return yPos + (halfWidth * 0.6) + 15;
}

function showLoading(show) {
    let loader = document.getElementById('pdf-loader-overlay');
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'pdf-loader-overlay';
            loader.innerHTML = `
                <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.8); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);">
                    <div style="background:white; padding:32px 40px; border-radius:16px; text-align:center; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                        <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px auto;"></div>
                        <h3 style="margin:0 0 8px; color:#0f172a; font-family:sans-serif;">Processando Relatório...</h3>
                        <p style="margin:0; color:#64748b; font-size:14px; font-family:sans-serif;">Formatando tabelas e gerando gráficos vetoriais.</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else if (loader) {
        loader.style.display = 'none';
    }
}