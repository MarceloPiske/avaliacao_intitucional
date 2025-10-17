export async function exportResultsToPDF(questionFilter, typeFilter, allResponses, allQuestions) {
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'pdf-loading';
    loadingDiv.innerHTML = `
        <div class="pdf-loading-content">
            <div class="loading-spinner"></div>
            <p>Gerando PDF... Por favor, aguarde.</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - 2 * margin;
        let yPos = margin;

        // Title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Relatório de Avaliação CPA', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Filter info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Filtros Aplicados:', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const typeLabel = typeFilter === 'all' ? 'Todos' : 
                         typeFilter === 'aluno' ? 'Alunos' : 
                         typeFilter === 'professor' ? 'Professores' : 'Técnicos';
        doc.text(`• Tipo de Usuário: ${typeLabel}`, margin + 5, yPos);
        yPos += 5;

        const questionLabel = questionFilter === 'all' ? 'Todas as Perguntas' : 
                            `Pergunta ${questionFilter}`;
        doc.text(`• Pergunta: ${questionLabel}`, margin + 5, yPos);
        yPos += 10;

        // Statistics
        const stats = calculateStatistics(allResponses, questionFilter);

        doc.setFillColor(102, 126, 234);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Estatísticas Gerais', margin + 3, yPos + 5.5);
        yPos += 8;
        doc.setTextColor(0, 0, 0);

        // Stats boxes
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const statBoxWidth = (contentWidth - 10) / 5;
        const statBoxHeight = 20;
        const statBoxY = yPos + 5;

        const statData = [
            { label: 'Total de Respostas', value: stats.totalResponses, color: [102, 126, 234] },
            { label: 'Média Geral', value: stats.avgRating, color: [118, 75, 162] },
            { label: 'Respostas Alunos', value: stats.alunoResponses, color: [17, 153, 142] },
            { label: 'Respostas Professores', value: stats.professorResponses, color: [244, 107, 69] },
            { label: 'Respostas Técnicos', value: stats.tecnicoResponses, color: [142, 45, 226] }
        ];

        statData.forEach((stat, index) => {
            const x = margin + index * (statBoxWidth + 2);
            doc.setFillColor(stat.color[0], stat.color[1], stat.color[2], 0.1);
            doc.rect(x, statBoxY, statBoxWidth, statBoxHeight, 'F');
            doc.setDrawColor(stat.color[0], stat.color[1], stat.color[2]);
            doc.rect(x, statBoxY, statBoxWidth, statBoxHeight);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
            doc.text(String(stat.value), x + statBoxWidth / 2, statBoxY + 10, { align: 'center' });

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const lines = doc.splitTextToSize(stat.label, statBoxWidth - 2);
            doc.text(lines, x + statBoxWidth / 2, statBoxY + 16, { align: 'center' });
        });

        doc.setTextColor(0, 0, 0);
        yPos = statBoxY + statBoxHeight + 10;

        // Charts
        yPos = await addChartsToPDF(doc, yPos, pageHeight, margin, contentWidth, questionFilter, allResponses);

        // Detailed table
        yPos = addDetailedTable(doc, yPos, pageHeight, margin, contentWidth, questionFilter, allResponses, allQuestions);

        // Save
        doc.save(`relatorio_avaliacao_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Erro ao gerar PDF: ' + error.message);
    } finally {
        document.body.removeChild(loadingDiv);
    }
}

function calculateStatistics(allResponses, questionFilter) {
    const totalResponses = allResponses.length;
    const alunoResponses = allResponses.filter(r => r.userRole === 'aluno').length;
    const professorResponses = allResponses.filter(r => r.userRole === 'professor').length;
    const tecnicoResponses = allResponses.filter(r => r.userRole === 'tecnico').length;

    let totalRatings = 0;
    let ratingCount = 0;

    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    totalRatings += parseInt(rating);
                    ratingCount++;
                }
            });
        }
    });

    const avgRating = ratingCount > 0 ? (totalRatings / ratingCount).toFixed(1) : '0.0';

    return {
        totalResponses,
        avgRating,
        alunoResponses,
        professorResponses,
        tecnicoResponses
    };
}

async function addChartsToPDF(doc, yPos, pageHeight, margin, contentWidth, questionFilter, allResponses) {
    // Distribution Chart
    if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
    }

    doc.setFillColor(102, 126, 234);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição de Respostas', margin + 3, yPos + 5.5);
    yPos += 10;
    doc.setTextColor(0, 0, 0);

    const distributionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    distributionData[rating]++;
                }
            });
        }
    });

    const chartCanvas = document.createElement('canvas');
    chartCanvas.width = 600;
    chartCanvas.height = 300;
    const ctx = chartCanvas.getContext('2d');

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1', '2', '3', '4', '5'],
            datasets: [{
                label: 'Respostas',
                data: [distributionData[1], distributionData[2], distributionData[3], distributionData[4], distributionData[5]],
                backgroundColor: [
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(230, 126, 34, 0.8)',
                    'rgba(241, 196, 15, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)'
                ]
            }]
        },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const chartImage = chartCanvas.toDataURL('image/png');
    doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, 60);
    chart.destroy();
    yPos += 65;

    // Legend
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const legendY = yPos;
    const legendItems = [
        '1: Discordo Totalmente',
        '2: Discordo Parcialmente',
        '3: Neutro',
        '4: Concordo Parcialmente',
        '5: Concordo Totalmente'
    ];
    legendItems.forEach((item, i) => {
        doc.text(`• ${item}`, margin + (i % 3) * 60, legendY + Math.floor(i / 3) * 4);
    });
    yPos += 10;

    // Average by Role Chart
    if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
    }

    doc.setFillColor(118, 75, 162);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Média por Tipo de Usuário', margin + 3, yPos + 5.5);
    yPos += 10;
    doc.setTextColor(0, 0, 0);

    const roleAverages = {
        aluno: { total: 0, count: 0 },
        professor: { total: 0, count: 0 },
        tecnico: { total: 0, count: 0 }
    };

    allResponses.forEach(response => {
        const role = response.userRole;
        if (response.answers && roleAverages[role]) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    roleAverages[role].total += parseInt(rating);
                    roleAverages[role].count++;
                }
            });
        }
    });

    const chartCanvas2 = document.createElement('canvas');
    chartCanvas2.width = 600;
    chartCanvas2.height = 300;
    const ctx2 = chartCanvas2.getContext('2d');

    const chart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Alunos', 'Professores', 'Técnicos'],
            datasets: [{
                label: 'Média',
                data: [
                    roleAverages.aluno.count > 0 ? roleAverages.aluno.total / roleAverages.aluno.count : 0,
                    roleAverages.professor.count > 0 ? roleAverages.professor.total / roleAverages.professor.count : 0,
                    roleAverages.tecnico.count > 0 ? roleAverages.tecnico.total / roleAverages.tecnico.count : 0
                ],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(17, 153, 142, 0.8)'
                ]
            }]
        },
        options: {
            responsive: false,
            animation: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: { stepSize: 0.5 }
                }
            }
        }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const chartImage2 = chartCanvas2.toDataURL('image/png');
    doc.addImage(chartImage2, 'PNG', margin, yPos, contentWidth, 60);
    chart2.destroy();
    yPos += 70;

    return yPos;
}

function addDetailedTable(doc, yPos, pageHeight, margin, contentWidth, questionFilter, allResponses, allQuestions) {
    if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
    }

    doc.setFillColor(17, 153, 142);
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento por Pergunta', margin + 3, yPos + 5.5);
    yPos += 12;
    doc.setTextColor(0, 0, 0);

    const questionData = {};
    allResponses.forEach(response => {
        if (response.answers) {
            Object.entries(response.answers).forEach(([qId, rating]) => {
                if (questionFilter === 'all' || qId === questionFilter) {
                    if (!questionData[qId]) {
                        questionData[qId] = {
                            ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                            total: 0,
                            count: 0,
                            byRole: {
                                aluno: { total: 0, count: 0 },
                                professor: { total: 0, count: 0 },
                                tecnico: { total: 0, count: 0 }
                            }
                        };
                    }

                    const r = parseInt(rating);
                    questionData[qId].ratings[r]++;
                    questionData[qId].total += r;
                    questionData[qId].count++;

                    const role = response.userRole;
                    if (questionData[qId].byRole[role]) {
                        questionData[qId].byRole[role].total += r;
                        questionData[qId].byRole[role].count++;
                    }
                }
            });
        }
    });

    const sortedQuestions = Object.keys(questionData).sort((a, b) => parseInt(a) - parseInt(b));

    sortedQuestions.forEach((qId, index) => {
        if (yPos > pageHeight - 35) {
            doc.addPage();
            yPos = margin;
        }

        const data = questionData[qId];
        const question = allQuestions.find(q => q.id === qId);
        const questionText = question ? question.texto : `Pergunta ${qId}`;

        doc.setFillColor(245, 247, 250);
        doc.rect(margin, yPos, contentWidth, 30, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, contentWidth, 30);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(102, 126, 234);
        doc.text(`Pergunta ${qId}`, margin + 2, yPos + 5);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const textLines = doc.splitTextToSize(questionText, contentWidth - 4);
        doc.text(textLines.slice(0, 2), margin + 2, yPos + 9);

        const avgGeneral = (data.total / data.count).toFixed(2);
        const avgAluno = data.byRole.aluno.count > 0 ? (data.byRole.aluno.total / data.byRole.aluno.count).toFixed(2) : 'N/A';
        const avgProfessor = data.byRole.professor.count > 0 ? (data.byRole.professor.total / data.byRole.professor.count).toFixed(2) : 'N/A';
        const avgTecnico = data.byRole.tecnico.count > 0 ? (data.byRole.tecnico.total / data.byRole.tecnico.count).toFixed(2) : 'N/A';

        doc.setFontSize(8);
        doc.text(`Média Geral: ${avgGeneral}`, margin + 2, yPos + 20);
        doc.text(`Total: ${data.count}`, margin + 35, yPos + 20);
        doc.text(`Alunos: ${avgAluno}`, margin + 55, yPos + 20);
        doc.text(`Prof: ${avgProfessor}`, margin + 80, yPos + 20);
        doc.text(`Téc: ${avgTecnico}`, margin + 105, yPos + 20);

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Distribuição: 1(${data.ratings[1]}) 2(${data.ratings[2]}) 3(${data.ratings[3]}) 4(${data.ratings[4]}) 5(${data.ratings[5]})`, 
                 margin + 2, yPos + 26);

        doc.setTextColor(0, 0, 0);
        yPos += 33;
    });

    return yPos;
}