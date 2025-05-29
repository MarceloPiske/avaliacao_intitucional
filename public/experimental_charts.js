/**
 * Experimental Charts Module
 * Advanced visualizations for survey data analysis
 */

export class ExperimentalCharts {
    constructor(data) {
        this.originalData = data;
        this.data = data;
        this.d3 = window.d3;
        
        // Set up tooltip
        this.tooltip = this.d3.select("#chartTooltip");
        
        // Color scales
        this.colors = {
            correlation: d3.scaleOrdinal()
                .domain(['aluno', 'professor', 'disciplina'])
                .range(['#4299e1', '#805ad5', '#f6ad55']),
                
            comparison: d3.scaleOrdinal()
                .domain(['low', 'medium', 'high'])
                .range(['#fc8181', '#f6e05e', '#68d391']),
                
            heatmap: d3.scaleSequential()
                .domain([1, 5])
                .interpolator(d3.interpolateInferno),
                
            trend: d3.scaleOrdinal()
                .domain(['aluno', 'professor', 'disciplina'])
                .range(['#4299e1', '#805ad5', '#f6ad55'])
        };
    }
    
    /**
     * Update the data used for visualizations
     */
    updateData(newData) {
        this.data = newData;
    }
    
    /**
     * Calculate average responses by category and question
     */
    calculateAverages(category) {
        const questionSums = {};
        const questionCounts = {};
        
        this.data.forEach(entry => {
            if (entry[category]) {
                Object.entries(entry[category]).forEach(([key, value]) => {
                    if (!questionSums[key]) {
                        questionSums[key] = 0;
                        questionCounts[key] = 0;
                    }
                    if (value.resposta) {
                        questionSums[key] += value.resposta;
                        questionCounts[key]++;
                    }
                });
            }
        });
        
        return Object.keys(questionSums).map(key => ({
            question: key,
            text: this.data.find(d => d[category] && d[category][key])
                    ?.[category][key]?.pergunta || key,
            average: questionCounts[key] > 0 
                    ? questionSums[key] / questionCounts[key] 
                    : 0,
            count: questionCounts[key]
        }));
    }
    
    /**
     * Create a correlation network visualization between different categories
     */
    renderCorrelationChart() {
        const container = document.getElementById('correlation-chart');
        container.innerHTML = '<div class="chart-title">Correlação entre Respostas das Categorias</div>';
        
        if (this.data.length === 0) {
            container.innerHTML += '<p style="text-align: center; padding: 20px;">Sem dados suficientes para análise</p>';
            return;
        }
        
        const width = container.clientWidth - 60;
        const height = 500;
        
        // Create SVG
        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        // Prepare data for force layout
        const categories = ['aluno', 'professor', 'disciplina'];
        
        // Create nodes for each question
        const nodes = [];
        const links = [];
        
        categories.forEach(category => {
            const averages = this.calculateAverages(category);
            
            averages.forEach(q => {
                nodes.push({
                    id: `${category}-${q.question}`,
                    group: category,
                    label: q.question,
                    text: q.text,
                    value: q.average
                });
            });
        });
        
        // Calculate correlations between questions
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                // Only connect nodes from different categories
                if (nodes[i].group !== nodes[j].group) {
                    // Simple correlation based on averages
                    const correlation = 1 - Math.abs(nodes[i].value - nodes[j].value) / 4;
                    
                    if (correlation > 0.7) { // Only show strong correlations
                        links.push({
                            source: nodes[i].id,
                            target: nodes[j].id,
                            value: correlation
                        });
                    }
                }
            }
        }
        
        // Create force simulation
        const simulation = this.d3.forceSimulation(nodes)
            .force('link', this.d3.forceLink(links).id(d => d.id).distance(d => 200 * (1 - d.value)))
            .force('charge', this.d3.forceManyBody().strength(-200))
            .force('center', this.d3.forceCenter(width / 2, height / 2))
            .force('collision', this.d3.forceCollide().radius(30));
            
        // Add links
        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke-width', d => d.value * 3)
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6);
            
        // Add nodes
        const node = svg.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', 10)
            .attr('fill', d => this.colors.correlation(d.group))
            .call(this.d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
                
        // Add labels
        const label = svg.append('g')
            .selectAll('text')
            .data(nodes)
            .enter().append('text')
            .text(d => d.label)
            .attr('font-size', 10)
            .attr('dx', 12)
            .attr('dy', 4);
            
        // Add title for hover
        node.append('title')
            .text(d => `${d.text}\nMédia: ${d.value.toFixed(2)}`);
            
        // Update positions
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
                
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
                
            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
        
        // Drag functions
        const that = this;
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(20, 20)');
            
        const legendItems = [
            { label: 'Aluno', color: this.colors.correlation('aluno') },
            { label: 'Professor', color: this.colors.correlation('professor') },
            { label: 'Disciplina', color: this.colors.correlation('disciplina') }
        ];
        
        legendItems.forEach((item, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);
                
            legendItem.append('circle')
                .attr('r', 6)
                .attr('fill', item.color);
                
            legendItem.append('text')
                .attr('x', 15)
                .attr('y', 4)
                .text(item.label)
                .attr('font-size', 12);
        });
        
        // Add explanation text
        svg.append('text')
            .attr('x', width - 20)
            .attr('y', 30)
            .attr('text-anchor', 'end')
            .text('As linhas indicam correlações entre as questões. Quanto mais grossa a linha, maior a correlação.')
            .attr('font-size', 12)
            .attr('fill', '#666');
    }
    
    /**
     * Create a comparison chart between professors or disciplines
     */
    renderComparisonChart() {
        const container = document.getElementById('comparison-chart');
        container.innerHTML = '<div class="chart-title">Comparação Entre Professores/Disciplinas</div>';
        
        if (this.data.length === 0) {
            container.innerHTML += '<p style="text-align: center; padding: 20px;">Sem dados suficientes para análise</p>';
            return;
        }
        
        const width = container.clientWidth - 60;
        const height = 500;
        const margin = { top: 40, right: 200, bottom: 60, left: 80 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Group data by professor or discipline
        const professors = [...new Set(this.data.map(d => d.professor_name))];
        
        // Calculate average scores for each professor
        const professorScores = professors.map(professor => {
            const professorData = this.data.filter(d => d.professor_name === professor);
            
            // Calculate average for each category
            const categoryScores = {};
            ['aluno', 'professor', 'disciplina'].forEach(category => {
                let totalSum = 0;
                let totalCount = 0;
                
                professorData.forEach(entry => {
                    if (entry[category]) {
                        Object.values(entry[category]).forEach(q => {
                            if (q.resposta) {
                                totalSum += q.resposta;
                                totalCount++;
                            }
                        });
                    }
                });
                
                categoryScores[category] = totalCount > 0 ? totalSum / totalCount : 0;
            });
            
            return {
                professor,
                ...categoryScores,
                average: (categoryScores.aluno + categoryScores.professor + categoryScores.disciplina) / 3
            };
        });
        
        // Sort by average score
        professorScores.sort((a, b) => b.average - a.average);
        
        // Create SVG
        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
        // Create scales
        const x0 = this.d3.scaleBand()
            .domain(professorScores.map(d => d.professor))
            .range([0, innerWidth])
            .padding(0.2);
            
        const x1 = this.d3.scaleBand()
            .domain(['aluno', 'professor', 'disciplina'])
            .range([0, x0.bandwidth()])
            .padding(0.05);
            
        const y = this.d3.scaleLinear()
            .domain([0, 5])
            .range([innerHeight, 0]);
            
        // Add gridlines
        g.append('g')
            .attr('class', 'grid')
            .call(this.d3.axisLeft(y)
                .tickSize(-innerWidth)
                .tickFormat(''));
                
        // Create grouped bars
        const categories = ['aluno', 'professor', 'disciplina'];
        const colors = this.colors.correlation;
        
        professorScores.forEach(d => {
            const professorG = g.append('g')
                .attr('transform', `translate(${x0(d.professor)}, 0)`);
                
            categories.forEach(category => {
                professorG.append('rect')
                    .attr('x', x1(category))
                    .attr('width', x1.bandwidth())
                    .attr('y', y(d[category]))
                    .attr('height', innerHeight - y(d[category]))
                    .attr('fill', colors(category))
                    .attr('rx', 4)
                    .on('mouseover', (event) => {
                        this.tooltip
                            .style('opacity', 1)
                            .html(`
                                <strong>${d.professor}</strong><br>
                                Categoria: ${this.formatCategory(category)}<br>
                                Média: ${d[category].toFixed(2)}
                            `)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    })
                    .on('mouseout', () => {
                        this.tooltip.style('opacity', 0);
                    });
            });
        });
        
        // Add axes
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(this.d3.axisBottom(x0))
            .selectAll('text')
            .attr('transform', 'rotate(-30)')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em');
            
        g.append('g')
            .call(this.d3.axisLeft(y));
            
        // Add labels
        g.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .text('Professores')
            .attr('fill', '#666');
            
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -margin.left + 20)
            .attr('text-anchor', 'middle')
            .text('Média de Avaliação (1-5)')
            .attr('fill', '#666');
            
        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);
            
        categories.forEach((category, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);
                
            legendItem.append('rect')
                .attr('width', 18)
                .attr('height', 18)
                .attr('rx', 4)
                .attr('fill', colors(category));
                
            legendItem.append('text')
                .attr('x', 24)
                .attr('y', 9)
                .attr('dy', '.35em')
                .text(this.formatCategory(category));
        });
    }
    
    /**
     * Create a radar chart of trends by category
     */
    renderTrendChart() {
        const container = document.getElementById('trend-chart');
        container.innerHTML = '<div class="chart-title">Análise de Tendências por Categoria</div>';
        
        if (this.data.length === 0) {
            container.innerHTML += '<p style="text-align: center; padding: 20px;">Sem dados suficientes para análise</p>';
            return;
        }
        
        const width = container.clientWidth - 60;
        const height = 500;
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Calculate averages for each category
        const categoryData = {};
        const categories = ['aluno', 'professor', 'disciplina'];
        
        categories.forEach(category => {
            categoryData[category] = this.calculateAverages(category);
        });
        
        // Get a fixed number of questions from each category
        const numQuestions = 8;
        const chartData = categories.map(category => {
            const samples = categoryData[category].slice(0, numQuestions);
            return {
                category,
                values: samples.map(q => ({
                    question: q.question,
                    text: q.text,
                    value: q.average
                }))
            };
        });
        
        // Create SVG
        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
        // Create scales
        const x = this.d3.scalePoint()
            .domain(chartData[0].values.map(d => d.question))
            .range([0, innerWidth]);
            
        const y = this.d3.scaleLinear()
            .domain([0, 5])
            .range([innerHeight, 0]);
            
        // Add grid
        g.append('g')
            .attr('class', 'grid')
            .call(this.d3.axisLeft(y)
                .tickSize(-innerWidth)
                .tickFormat(''));
                
        // Add axes
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(this.d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em');
            
        g.append('g')
            .call(this.d3.axisLeft(y));
            
        // Create line generator
        const line = this.d3.line()
            .x(d => x(d.question))
            .y(d => y(d.value))
            .curve(this.d3.curveCardinal);
            
        // Add lines
        chartData.forEach(d => {
            const path = g.append('path')
                .datum(d.values)
                .attr('fill', 'none')
                .attr('stroke', this.colors.trend(d.category))
                .attr('stroke-width', 3)
                .attr('d', line);
                
            // Animate line
            const pathLength = path.node().getTotalLength();
            path
                .attr('stroke-dasharray', pathLength)
                .attr('stroke-dashoffset', pathLength)
                .transition()
                .duration(2000)
                .attr('stroke-dashoffset', 0);
        });
        
        // Add points
        chartData.forEach(d => {
            g.selectAll(`.point-${d.category}`)
                .data(d.values)
                .enter()
                .append('circle')
                .attr('class', `point-${d.category}`)
                .attr('cx', d => x(d.question))
                .attr('cy', d => y(d.value))
                .attr('r', 5)
                .attr('fill', this.colors.trend(d.category))
                .on('mouseover', (event, d) => {
                    this.tooltip
                        .style('opacity', 1)
                        .html(`
                            <strong>${d.text}</strong><br>
                            Média: ${d.value.toFixed(2)}
                        `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', () => {
                    this.tooltip.style('opacity', 0);
                });
        });
        
        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${margin.left}, ${margin.top - 30})`);
            
        categories.forEach((category, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(${i * 120}, 0)`);
                
            legendItem.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 20)
                .attr('y2', 0)
                .attr('stroke', this.colors.trend(category))
                .attr('stroke-width', 3);
                
            legendItem.append('text')
                .attr('x', 25)
                .attr('y', 4)
                .text(this.formatCategory(category));
        });
        
        // Add explanation
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .text('Comparação de tendências entre as diferentes categorias de perguntas')
            .attr('font-size', 12)
            .attr('fill', '#666');
    }
    
    /**
     * Create a heatmap visualization
     */
    renderHeatmapChart() {
        const container = document.getElementById('heatmap-chart');
        container.innerHTML = '<div class="chart-title">Mapa de Calor das Respostas</div>';
        
        if (this.data.length === 0) {
            container.innerHTML += '<p style="text-align: center; padding: 20px;">Sem dados suficientes para análise</p>';
            return;
        }
        
        const width = container.clientWidth - 60;
        const height = 500;
        const margin = { top: 70, right: 50, bottom: 100, left: 100 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Use professor and discipline data
        const professors = [...new Set(this.data.map(d => d.professor_name))];
        const disciplines = [...new Set(this.data.map(d => d.discipline_name))];
        
        // Create matrix for heatmap
        const matrix = [];
        
        professors.forEach((professor, i) => {
            const row = [];
            
            disciplines.forEach((discipline, j) => {
                const entries = this.data.filter(
                    d => d.professor_name === professor && d.discipline_name === discipline
                );
                
                if (entries.length > 0) {
                    // Calculate average across all categories
                    let totalSum = 0;
                    let totalCount = 0;
                    
                    entries.forEach(entry => {
                        ['aluno', 'professor', 'disciplina'].forEach(category => {
                            if (entry[category]) {
                                Object.values(entry[category]).forEach(q => {
                                    if (q.resposta) {
                                        totalSum += q.resposta;
                                        totalCount++;
                                    }
                                });
                            }
                        });
                    });
                    
                    row.push({
                        professor,
                        discipline,
                        average: totalCount > 0 ? totalSum / totalCount : 0,
                        count: entries.length
                    });
                } else {
                    row.push({
                        professor,
                        discipline,
                        average: 0,
                        count: 0
                    });
                }
            });
            
            matrix.push(row);
        });
        
        // Create SVG
        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
        // Create scales
        const x = this.d3.scaleBand()
            .domain(disciplines)
            .range([0, innerWidth])
            .padding(0.05);
            
        const y = this.d3.scaleBand()
            .domain(professors)
            .range([0, innerHeight])
            .padding(0.05);
            
        // Add axes
        g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(this.d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em');
            
        g.append('g')
            .call(this.d3.axisLeft(y));
            
        // Add cells
        matrix.forEach((row, i) => {
            row.forEach((cell, j) => {
                if (cell.count > 0) {
                    g.append('rect')
                        .attr('x', x(cell.discipline))
                        .attr('y', y(cell.professor))
                        .attr('width', x.bandwidth())
                        .attr('height', y.bandwidth())
                        .attr('fill', this.colors.heatmap(cell.average))
                        .on('mouseover', (event) => {
                            this.tooltip
                                .style('opacity', 1)
                                .html(`
                                    <strong>${cell.professor}</strong><br>
                                    Disciplina: ${cell.discipline}<br>
                                    Média: ${cell.average.toFixed(2)}<br>
                                    Respostas: ${cell.count}
                                `)
                                .style('left', (event.pageX + 10) + 'px')
                                .style('top', (event.pageY - 28) + 'px');
                        })
                        .on('mouseout', () => {
                            this.tooltip.style('opacity', 0);
                        });
                        
                    // Add text for average
                    g.append('text')
                        .attr('x', x(cell.discipline) + x.bandwidth() / 2)
                        .attr('y', y(cell.professor) + y.bandwidth() / 2)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .text(cell.average.toFixed(1))
                        .attr('font-size', '10px')
                        .attr('fill', cell.average > 3 ? 'black' : 'white');
                }
            });
        });
        
        // Add color legend
        const legendWidth = 200;
        const legendHeight = 20;
        
        const defs = svg.append('defs');
        
        const gradient = defs.append('linearGradient')
            .attr('id', 'heatmap-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');
            
        const stops = [
            { offset: '0%', color: this.colors.heatmap(1) },
            { offset: '25%', color: this.colors.heatmap(2) },
            { offset: '50%', color: this.colors.heatmap(3) },
            { offset: '75%', color: this.colors.heatmap(4) },
            { offset: '100%', color: this.colors.heatmap(5) }
        ];
        
        stops.forEach(stop => {
            gradient.append('stop')
                .attr('offset', stop.offset)
                .attr('stop-color', stop.color);
        });
        
        const legendX = margin.left;
        const legendY = height - margin.bottom + 40;
        
        svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#heatmap-gradient)');
            
        // Add legend ticks and labels
        const legendScale = this.d3.scaleLinear()
            .domain([1, 5])
            .range([0, legendWidth]);
            
        const legendAxis = this.d3.axisBottom(legendScale)
            .tickValues([1, 2, 3, 4, 5])
            .tickFormat(d => d);
            
        svg.append('g')
            .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
            .call(legendAxis);
            
        svg.append('text')
            .attr('x', legendX + legendWidth / 2)
            .attr('y', legendY + legendHeight + 35)
            .attr('text-anchor', 'middle')
            .text('Média de Avaliação')
            .attr('font-size', '12px');
            
        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .text('Mapa de Calor: Médias de Avaliação por Professor e Disciplina')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold');
    }
    
    /**
     * Helper function to format category names
     */
    formatCategory(category) {
        const formats = {
            'aluno': 'Aluno',
            'professor': 'Professor',
            'disciplina': 'Disciplina'
        };
        return formats[category] || category;
    }
}