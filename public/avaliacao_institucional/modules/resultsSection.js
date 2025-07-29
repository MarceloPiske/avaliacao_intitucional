export function setupResultsSection() {
    // Update selector for admin.html page to use unique IDs
    const dimensionFilter = document.getElementById('dimension-filter-admin') || document.getElementById('dimension-filter');
    const yearFilter = document.getElementById('year-filter-admin') || document.getElementById('year-filter');
    const groupFilter = document.getElementById('group-filter-admin') || document.getElementById('group-filter');
    const axisFilter = document.getElementById('axis-filter-admin') || document.getElementById('axis-filter');
    const applyFiltersBtn = document.getElementById('apply-filters-btn') || document.getElementById('apply-filters');
    const exportPdfBtn = document.getElementById('export-pdf-btn') || document.getElementById('export-pdf');
    const exportExcelBtn = document.getElementById('export-excel-btn') || document.getElementById('export-excel');
    const resultsContainer = document.getElementById('results-container-admin') || document.getElementById('results-container');
    const resultsSummary = document.getElementById('results-summary-admin') || document.getElementById('results-summary');

    // Export options checkboxes
    const exportOptions = document.getElementsByName('export-option-admin') || document.getElementsByName('export-option');

    // Only proceed if elements are found
    if (!dimensionFilter || !resultsContainer) {
        console.error('Results section elements not found in DOM');
        return;
    }

    // Load dimensions and axes for filters
    loadFilterOptions();

    // Event listeners for filters and export buttons
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', filterResults);
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportToPdf);
    }

    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }

    // Initial load of results
    loadResults();

    async function loadFilterOptions() {
        try {
            const response = await fetch('avaliacao_cpa_perguntas.json');
            const questions = await response.json();

            // Get unique dimensions
            const dimensions = [...new Set(questions.map(q => `Eixo ${q.eixo} - Dimensão ${q.dimensao}`))];
            dimensions.sort();

            // Get unique axes
            const axes = [...new Set(questions.map(q => q.eixo))];
            axes.sort((a, b) => parseInt(a) - parseInt(b));

            // Add dimensions to the filter
            dimensions.forEach(dimension => {
                const option = document.createElement('option');
                option.value = dimension;
                option.textContent = dimension;
                if (dimensionFilter) dimensionFilter.appendChild(option);
            });

            // Add axes to the filter
            axes.forEach(axis => {
                const option = document.createElement('option');
                option.value = axis;
                option.textContent = `Eixo ${axis}`;
                if (axisFilter) axisFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar opções de filtro:', error);
        }
    }

    function filterResults() {
        // Get filter values
        const dimension = dimensionFilter.value;
        const year = yearFilter.value;
        const group = groupFilter.value;
        const axis = axisFilter.value;

        // Show loading indicator
        resultsContainer.innerHTML = '<div class="loading-spinner"></div>';
        resultsSummary.innerHTML = '';

        // Load results with filters (with small delay to show the loading spinner)
        setTimeout(() => {
            loadResults(dimension, year, group, axis);
        }, 500);
    }

    async function loadResults(dimension = 'all', year = 'all', group = 'all', axis = 'all') {
        // Clear previous results
        resultsContainer.innerHTML = '';
        resultsSummary.innerHTML = '';

        // Show loading indicator
        resultsContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            // Get real results from Firestore
            const db = firebase.firestore();
            const responseSnapshot = await db.collection('survey_responses').get();

            // Get questions mapping from JSON file for reference
            const questions = await loadQuestionsMapping();

            if (responseSnapshot.empty) {
                resultsContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>';
                return;
            }

            // Process results data
            const resultsData = {};
            let totalResponses = 0;
            let totalRatingsSum = 0;
            let totalRatingsCount = 0;

            // Group data by different criteria
            const groupData = {
                alunos: { count: 0, ratings: 0, sum: 0 },
                professores: { count: 0, ratings: 0, sum: 0 },
                tecnicos: { count: 0, ratings: 0, sum: 0 }
            };

            // Axis and dimension data
            const axisData = {};
            const dimensionData = {};

            responseSnapshot.forEach(doc => {
                const responseData = doc.data();
                const userType = responseData.userType;
                const yearResponse = new Date(responseData.timestamp?.toDate() || new Date()).getFullYear().toString();

                // Skip if filtering by group/year and this doesn't match
                if (group !== 'all' && userType !== group) return;
                if (year !== 'all' && yearResponse !== year) return;

                // Count response for summary
                totalResponses++;

                // Count by group
                if (groupData[userType]) {
                    groupData[userType].count++;
                }

                // Process each answer
                const answers = responseData.answers || {};

                Object.keys(answers).forEach(questionId => {
                    const value = parseInt(answers[questionId]);
                    if (isNaN(value)) return;

                    // Find question details from our mapping
                    const question = questions.find(q => q.id == questionId);
                    if (!question) return;

                    const questionText = question.texto;
                    const questionDimension = `Eixo ${question.eixo} - Dimensão ${question.dimensao}`;
                    const questionAxis = question.eixo;

                    // Skip if filtering by dimension/axis and this doesn't match
                    if (dimension !== 'all' && questionDimension !== dimension) return;
                    if (axis !== 'all' && questionAxis !== axis) return;

                    // Add to total ratings
                    totalRatingsSum += value;
                    totalRatingsCount++;

                    // Add to group ratings
                    if (groupData[userType]) {
                        groupData[userType].sum += value;
                        groupData[userType].ratings++;
                    }

                    // Track axis data
                    if (!axisData[questionAxis]) {
                        axisData[questionAxis] = { sum: 0, count: 0 };
                    }
                    axisData[questionAxis].sum += value;
                    axisData[questionAxis].count++;

                    // Track dimension data
                    const dimensionKey = `${question.eixo}-${question.dimensao}`;
                    if (!dimensionData[dimensionKey]) {
                        dimensionData[dimensionKey] = {
                            sum: 0,
                            count: 0,
                            label: questionDimension
                        };
                    }
                    dimensionData[dimensionKey].sum += value;
                    dimensionData[dimensionKey].count++;

                    // Initialize result object if not exists
                    if (!resultsData[questionId]) {
                        resultsData[questionId] = {
                            question: questionText,
                            dimension: questionDimension,
                            axis: questionAxis,
                            group: userType,
                            year: yearResponse,
                            responses: [
                                { answer: 'Excelente', count: 0, value: 5 },
                                { answer: 'Bom', count: 0, value: 4 },
                                { answer: 'Regular', count: 0, value: 3 },
                                { answer: 'Ruim', count: 0, value: 2 },
                                { answer: 'Péssimo', count: 0, value: 1 }
                            ]
                        };
                    }

                    // Increment the count for this rating
                    const responseIndex = 5 - value; // Convert value (1-5) to index (4-0)
                    if (responseIndex >= 0 && responseIndex < 5) {
                        resultsData[questionId].responses[responseIndex].count++;
                    }
                });
            });

            // Calculate overall average
            const overallAverage = totalRatingsCount > 0 ? (totalRatingsSum / totalRatingsCount).toFixed(2) : '0.00';

            // Display summary information
            displayResultsSummary({
                totalResponses,
                overallAverage,
                groupData,
                axisData,
                dimensionData
            });

            // Convert to array and display results
            const results = Object.values(resultsData);

            if (results.length === 0) {
                resultsContainer.innerHTML = '<p>Nenhum resultado encontrado para os filtros selecionados.</p>';
                return;
            }

            // Clear loading spinner
            resultsContainer.innerHTML = '';

            // Sort results by question ID
            results.sort((a, b) => {
                const idA = parseInt(questions.find(q => q.texto === a.question)?.id || 0);
                const idB = parseInt(questions.find(q => q.texto === b.question)?.id || 0);
                return idA - idB;
            });

            // Display results
            results.forEach(result => {
                displayResultItem(result);
            });
        } catch (error) {
            console.error("Error loading results:", error);
            resultsContainer.innerHTML = '<p>Erro ao carregar resultados. Por favor, tente novamente mais tarde.</p>';
        }
    }
    const summaryCharts = [];

    function displayResultsSummary(summaryData) {
        if (!resultsSummary) return;

        // Destrói gráficos antigos
        summaryCharts.forEach(chart => chart.destroy());
        summaryCharts.length = 0;

        // Limpa container do resumo
        resultsSummary.innerHTML = '';

        // Create summary container
        const summaryContent = document.createElement('div');

        // Add summary header
        const summaryHeader = document.createElement('h3');
        summaryHeader.textContent = 'Resumo dos Resultados';
        summaryContent.appendChild(summaryHeader);

        // Add stats container
        const statsContainer = document.createElement('div');
        statsContainer.className = 'summary-stats';

        // Add total responses stat
        const responsesStat = createSummaryStat(
            summaryData.totalResponses,
            'Total de Respostas'
        );
        statsContainer.appendChild(responsesStat);

        // Add overall average stat
        const averageStat = createSummaryStat(
            summaryData.overallAverage,
            'Média Geral (1-5)'
        );
        statsContainer.appendChild(averageStat);

        // Add group stats
        Object.keys(summaryData.groupData).forEach(group => {
            const groupStats = summaryData.groupData[group];
            const average = groupStats.ratings > 0
                ? (groupStats.sum / groupStats.ratings).toFixed(2)
                : '0.00';

            if (groupStats.count > 0) {
                const groupStat = createSummaryStat(
                    average,
                    getGroupName(group)
                );
                statsContainer.appendChild(groupStat);
            }
        });

        summaryContent.appendChild(statsContainer);

        // Add dimension chart
        const dimensionChartContainer = document.createElement('div');
        dimensionChartContainer.className = 'chart-container';

        const dimensionChartHeader = document.createElement('h4');
        dimensionChartHeader.textContent = 'Média por Dimensão';
        dimensionChartContainer.appendChild(dimensionChartHeader);

        const dimensionChartCanvas = document.createElement('canvas');
        dimensionChartContainer.appendChild(dimensionChartCanvas);

        // Prepare dimension chart data
        const dimensions = Object.keys(summaryData.dimensionData);
        const dimensionLabels = dimensions.map(d => summaryData.dimensionData[d].label);
        const dimensionValues = dimensions.map(d => {
            const dim = summaryData.dimensionData[d];
            return dim.count > 0 ? (dim.sum / dim.count).toFixed(2) : 0;
        });

        // Create dimension chart
        const radarChart = new Chart(dimensionChartCanvas, {
            type: 'radar',
            data: {
                labels: dimensionLabels,
                datasets: [{
                    label: 'Média por Dimensão',
                    data: dimensionValues,
                    backgroundColor: 'rgba(75, 108, 183, 0.2)',
                    borderColor: 'rgba(75, 108, 183, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(75, 108, 183, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        summaryCharts.push(radarChart);

        summaryContent.appendChild(dimensionChartContainer);

        // Add axis chart
        const axisChartContainer = document.createElement('div');
        axisChartContainer.className = 'chart-container';

        const axisChartHeader = document.createElement('h4');
        axisChartHeader.textContent = 'Média por Eixo';
        axisChartContainer.appendChild(axisChartHeader);

        const axisChartCanvas = document.createElement('canvas');
        axisChartContainer.appendChild(axisChartCanvas);

        // Prepare axis chart data
        const axes = Object.keys(summaryData.axisData).sort((a, b) => parseInt(a) - parseInt(b));
        const axisLabels = axes.map(a => `Eixo ${a}`);
        const axisValues = axes.map(a => {
            const axis = summaryData.axisData[a];
            return axis.count > 0 ? (axis.sum / axis.count).toFixed(2) : 0;
        });

        // Create axis chart
        const barChart = new Chart(axisChartCanvas, {
            type: 'bar',
            data: {
                labels: axisLabels,
                datasets: [{
                    label: 'Média por Eixo',
                    data: axisValues,
                    backgroundColor: 'rgba(238, 168, 73, 0.7)',
                    borderColor: 'rgba(238, 168, 73, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        summaryCharts.push(barChart);

        summaryContent.appendChild(axisChartContainer);

        // Add to DOM
        resultsSummary.appendChild(summaryContent);
    }

    function createSummaryStat(value, label) {
        const stat = document.createElement('div');
        stat.className = 'summary-stat';

        const statValue = document.createElement('div');
        statValue.className = 'summary-stat-value';
        statValue.textContent = value;
        stat.appendChild(statValue);

        const statLabel = document.createElement('div');
        statLabel.className = 'summary-stat-label';
        statLabel.textContent = label;
        stat.appendChild(statLabel);

        return stat;
    }

    // Helper function to load questions from JSON file
    async function loadQuestionsMapping() {
        try {
            const response = await fetch('avaliacao_cpa_perguntas.json');
            return await response.json();
        } catch (error) {
            console.error("Error loading questions mapping:", error);
            return [];
        }
    }

    // Helper function to display a single result item
    function displayResultItem(result) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const title = document.createElement('h3');
        title.textContent = result.question;
        resultItem.appendChild(title);

        const meta = document.createElement('p');
        meta.className = 'result-meta';
        meta.textContent = `Dimensão: ${result.dimension} | Eixo: ${result.axis} | Grupo: ${getGroupName(result.group)} | Ano: ${result.year}`;
        resultItem.appendChild(meta);

        // Create chart
        const chartContainer = document.createElement('div');
        chartContainer.className = 'result-chart';
        resultItem.appendChild(chartContainer);

        // Create canvas for chart
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);

        // Prepare data for chart
        const labels = result.responses.map(r => r.answer);
        const data = result.responses.map(r => r.count);
        const backgroundColor = [
            'rgba(75, 108, 183, 0.7)',
            'rgba(56, 239, 125, 0.7)',
            'rgba(238, 168, 73, 0.7)',
            'rgba(255, 102, 102, 0.7)',
            'rgba(153, 102, 255, 0.7)'
        ];

        // Create chart
        new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Create table
        const table = document.createElement('table');
        table.className = 'result-table';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Resposta', 'Quantidade', 'Porcentagem'];

        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        const totalResponses = result.responses.reduce((sum, response) => sum + response.count, 0);

        // Calculate weighted average
        let weightedSum = 0;
        result.responses.forEach(response => {
            weightedSum += response.count * response.value;
        });
        const average = totalResponses > 0 ? (weightedSum / totalResponses).toFixed(2) : '0.00';

        result.responses.forEach(response => {
            const row = document.createElement('tr');

            const answerCell = document.createElement('td');
            answerCell.textContent = response.answer;
            row.appendChild(answerCell);

            const countCell = document.createElement('td');
            countCell.textContent = response.count;
            row.appendChild(countCell);

            const percentCell = document.createElement('td');
            const percentage = totalResponses > 0 ? ((response.count / totalResponses) * 100).toFixed(2) : '0.00';
            percentCell.textContent = `${percentage}%`;
            row.appendChild(percentCell);

            tbody.appendChild(row);
        });

        // Add average row
        const averageRow = document.createElement('tr');
        averageRow.className = 'average-row';

        const averageLabelCell = document.createElement('td');
        averageLabelCell.colSpan = 2;
        averageLabelCell.textContent = 'Média Ponderada (1-5):';
        averageLabelCell.style.fontWeight = 'bold';
        averageRow.appendChild(averageLabelCell);

        const averageValueCell = document.createElement('td');
        averageValueCell.textContent = average;
        averageValueCell.style.fontWeight = 'bold';
        averageRow.appendChild(averageValueCell);

        tbody.appendChild(averageRow);

        table.appendChild(tbody);
        resultItem.appendChild(table);
        resultsContainer.appendChild(resultItem);
    }

    function getGroupName(groupKey) {
        const groups = {
            'alunos': 'Discentes',
            'professores': 'Docentes',
            'tecnicos': 'Técnicos Administrativos'
        };
        return groups[groupKey] || groupKey;
    }

    async function exportToPdf() {
        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 14;
        const usableWidth = pageWidth - 2 * margin;
        let yPosition = margin;

        // Título
        doc.setFontSize(18);
        doc.text('Relatório de Avaliação CPA', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Filtros
        doc.setFontSize(12);
        const dimension = dimensionFilter.options[dimensionFilter.selectedIndex].text;
        const year = yearFilter.options[yearFilter.selectedIndex].text;
        const group = groupFilter.options[groupFilter.selectedIndex].text;
        const axis = axisFilter ? axisFilter.options[axisFilter.selectedIndex].text : 'Todos os Eixos';

        const filtros = `Filtros: Dimensão: ${dimension} | Ano: ${year} | Grupo: ${group} | Eixo: ${axis}`;
        const data = `Data de geração: ${new Date().toLocaleDateString()}`;

        doc.text(doc.splitTextToSize(filtros, usableWidth), margin, yPosition);
        yPosition += 6;
        doc.text(data, margin, yPosition);
        yPosition += 10;

        const includeGraphs = getExportOption('graphs');
        const includeTables = getExportOption('tables');
        const includeSummaries = getExportOption('summaries');

        // Resumo
        if (includeSummaries && resultsSummary) {
            doc.setFontSize(16);
            doc.text('Resumo dos Resultados', margin, yPosition);
            yPosition += 8;

            const summaryStats = resultsSummary.querySelectorAll('.summary-stat');
            doc.setFontSize(12);

            summaryStats.forEach((stat, index) => {
                const value = stat.querySelector('.summary-stat-value').textContent;
                const label = stat.querySelector('.summary-stat-label').textContent;

                const xPos = margin + (index % 3) * (usableWidth / 3);
                doc.text(`${label}: ${value}`, xPos, yPosition);

                if (index % 3 === 2) yPosition += 6;
            });

            if (summaryStats.length % 3 !== 0) yPosition += 6;

            yPosition += 4;

            if (includeGraphs) {
                const chartContainers = resultsSummary.querySelectorAll('.chart-container');

                for (const container of chartContainers) {
                    // Pega o título do gráfico (se houver)
                    const titleElement = container.querySelector('h4');
                    const canvas = container.querySelector('canvas');

                    if (!canvas) continue;

                    // Adiciona o título do gráfico antes da imagem
                    if (titleElement) {
                        const titleText = titleElement.textContent;
                        const titleLines = doc.splitTextToSize(titleText, usableWidth);
                        const titleHeight = titleLines.length * 6;

                        if (yPosition + titleHeight > pageHeight - margin) {
                            doc.addPage();
                            yPosition = margin;
                        }

                        doc.setFontSize(13);
                        doc.text(titleLines, margin, yPosition);
                        yPosition += titleHeight + 2;
                    }

                    // Adiciona o gráfico (canvas)
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const aspectRatio = canvas.width / canvas.height;
                    const imgWidth = usableWidth;
                    const imgHeight = imgWidth / aspectRatio;

                    if (yPosition + imgHeight > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin;
                    }

                    doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + 6;
                }
            }

            yPosition += 4;
        }

        // Itens de resultado
        const results = document.querySelectorAll('.result-item');
        for (const result of results) {
            const title = result.querySelector('h3').textContent;
            const meta = result.querySelector('.result-meta').textContent;

            const titleLines = doc.splitTextToSize(title, usableWidth);
            const metaLines = doc.splitTextToSize(meta, usableWidth);
            const textHeight = titleLines.length * 6 + metaLines.length * 5 + 4;

            if (yPosition + textHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text(titleLines, margin, yPosition);
            yPosition += titleLines.length * 6;

            doc.setFontSize(10);
            doc.text(metaLines, margin, yPosition);
            yPosition += metaLines.length * 5 + 2;

            if (includeGraphs) {
                const canvas = result.querySelector('canvas');
                if (canvas) {
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const aspectRatio = canvas.width / canvas.height;
                    const imgWidth = usableWidth;
                    const imgHeight = imgWidth / aspectRatio;

                    if (yPosition + imgHeight > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin;
                    }

                    doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
                    yPosition += imgHeight + 4;
                }
            }

            if (includeTables) {
                const table = result.querySelector('.result-table');
                const rows = table.querySelectorAll('tbody tr');

                doc.setFontSize(11);
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    let rowText = '';
                    cells.forEach(cell => rowText += cell.textContent + ' | ');

                    const lines = doc.splitTextToSize(rowText, usableWidth);
                    const lineHeight = lines.length * 5;

                    if (yPosition + lineHeight > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin;
                    }

                    doc.text(lines, margin, yPosition);
                    yPosition += lineHeight;
                }

                yPosition += 4;
            }

            yPosition += 6;
        }

        doc.save('relatorio-cpa.pdf');
    }


    function exportToExcel() {
        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Check which sections to include
        const includeGraphs = getExportOption('graphs');
        const includeTables = getExportOption('tables');
        const includeSummaries = getExportOption('summaries');
        const includeComments = getExportOption('comments');

        // Create worksheet data
        const wsData = [];

        // Add title row
        wsData.push(['Relatório de Avaliação CPA']);
        wsData.push([]);

        // Add filters info
        const dimension = dimensionFilter.options[dimensionFilter.selectedIndex].text;
        const year = yearFilter.options[yearFilter.selectedIndex].text;
        const group = groupFilter.options[groupFilter.selectedIndex].text;
        const axis = axisFilter ? axisFilter.options[axisFilter.selectedIndex].text : 'Todos os Eixos';

        wsData.push([`Filtros: Dimensão: ${dimension} | Ano: ${year} | Grupo: ${group} | Eixo: ${axis}`]);
        wsData.push([`Data de geração: ${new Date().toLocaleDateString()}`]);
        wsData.push([]);

        // Add summary if selected
        if (includeSummaries && resultsSummary) {
            wsData.push(['Resumo dos Resultados']);
            wsData.push([]);

            // Add summary stats
            const summaryStats = resultsSummary.querySelectorAll('.summary-stat');
            const summaryRow = [];
            const labelRow = [];

            summaryStats.forEach(stat => {
                const value = stat.querySelector('.summary-stat-value').textContent;
                const label = stat.querySelector('.summary-stat-label').textContent;

                summaryRow.push(value);
                labelRow.push(label);
            });

            wsData.push(summaryRow);
            wsData.push(labelRow);
            wsData.push([]);
        }

        // Add each result
        const results = document.querySelectorAll('.result-item');

        results.forEach(result => {
            // Add question title
            const title = result.querySelector('h3').textContent;
            wsData.push([title]);

            // Add metadata
            const meta = result.querySelector('.result-meta').textContent;
            wsData.push([meta]);
            wsData.push([]);

            // Add table data if selected
            if (includeTables) {
                // Add table headers
                wsData.push(['Resposta', 'Quantidade', 'Porcentagem']);

                // Add table data
                const rows = result.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    const rowData = [];
                    cells.forEach(cell => {
                        rowData.push(cell.textContent);
                    });
                    wsData.push(rowData);
                });
            }

            // Add spacing between results
            wsData.push([]);
            wsData.push([]);
        });

        // Create worksheet and add to workbook
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

        // Save the Excel file
        XLSX.writeFile(wb, 'relatorio-cpa.xlsx');
    }

    // Helper function to check export options
    function getExportOption(option) {
        const checkboxes = document.getElementsByName('export-option-admin') ||
            document.getElementsByName('export-option');

        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].value === option && checkboxes[i].checked) {
                return true;
            }
        }

        return false;
    }
}