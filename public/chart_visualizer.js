/**
 * Chart Visualizer Module
 * Provides different visualization options for the survey data
 */

import * as d3 from "https://d3js.org/d3.v7.min.js";

export class ChartVisualizer {
  constructor() {
    this.chartTypes = ["bar", "line", "radar"];
    this.colors = {
      bar: "#3498db",
      line: "#2ecc71",
      radar: "#9b59b6"
    };
    // D3 is loaded globally from the script tag in graficos.html
    this.d3 = window.d3;
  }
  
  /**
   * Creates a visualization switcher UI for charts
   * @param {string} containerId - The ID of the chart container
   * @param {Array} data - The data to visualize
   * @param {string} category - Data category (aluno, professor, disciplina)
   */
  createVisualizationSwitcher(containerId, data, category) {
    const container = document.getElementById(containerId);
    
    // Create switcher UI
    const switcherContainer = document.createElement('div');
    switcherContainer.className = 'chart-switcher';
    switcherContainer.style.cssText = `
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
      gap: 10px;
    `;
    
    this.chartTypes.forEach(type => {
      const button = document.createElement('button');
      button.textContent = this.formatChartType(type);
      button.dataset.chartType = type;
      button.className = 'chart-type-btn';
      button.style.cssText = `
        padding: 8px 16px;
        background: ${type === 'bar' ? this.colors[type] : 'white'};
        color: ${type === 'bar' ? 'white' : '#333'};
        border: 1px solid ${this.colors[type]};
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
      `;
      
      button.addEventListener('mouseenter', () => {
        if (button.dataset.active !== 'true') {
          button.style.backgroundColor = `${this.colors[type]}22`;
        }
      });
      
      button.addEventListener('mouseleave', () => {
        if (button.dataset.active !== 'true') {
          button.style.backgroundColor = 'white';
        }
      });
      
      button.addEventListener('click', () => {
        // Update active state of buttons
        switcherContainer.querySelectorAll('.chart-type-btn').forEach(btn => {
          if (btn.dataset.chartType === type) {
            btn.style.backgroundColor = this.colors[type];
            btn.style.color = 'white';
            btn.dataset.active = 'true';
          } else {
            btn.style.backgroundColor = 'white';
            btn.style.color = '#333';
            btn.dataset.active = 'false';
          }
        });
        
        // Clear existing chart
        const chartArea = container.querySelector('.chart-area');
        if (chartArea) {
          chartArea.innerHTML = '';
        }
        
        // Create new chart based on selected type
        const averages = this.calculateAverages(data, category);
        this.renderChart(type, chartArea, averages, category);
      });
      
      if (type === 'bar') {
        button.dataset.active = 'true';
      }
      
      switcherContainer.appendChild(button);
    });
    
    // Create chart area
    const chartArea = document.createElement('div');
    chartArea.className = 'chart-area';
    
    // Preserve existing title or create default one
    let titleElement = container.querySelector('.chart-title');
    let titleText = '';
    
    if (titleElement) {
      titleText = titleElement.textContent;
    } else {
      // Default titles based on category
      titleText = {
        'aluno': 'Avaliação do Aluno',
        'professor': 'Avaliação do Professor',
        'disciplina': 'Avaliação da Disciplina'
      }[category] || 'Avaliação';
    }
    
    // Clear existing content and add new elements with preserved title
    container.innerHTML = '';
    const newTitleElement = document.createElement('div');
    newTitleElement.className = 'chart-title';
    newTitleElement.textContent = titleText;
    container.appendChild(newTitleElement);
    container.appendChild(switcherContainer);
    container.appendChild(chartArea);
    
    // Initialize with bar chart
    const averages = this.calculateAverages(data, category);
    this.renderChart('bar', chartArea, averages, category);
    
    return container;
  }
  
  /**
   * Format chart type for display
   */
  formatChartType(type) {
    const typeMap = {
      'bar': 'Barras',
      'line': 'Linha',
      'radar': 'Radar'
    };
    return typeMap[type] || type;
  }
  
  /**
   * Calculate data averages 
   */
  calculateAverages(data, category) {
    if (!data || data.length === 0 || !data[0][category]) {
      return [];
    }

    const questionCounts = {};
    const questionSums = {};

    data.forEach(entry => {
      if (entry[category]) {  
        Object.entries(entry[category]).forEach(([key, value]) => {
          if (!questionSums[key]) {
            questionSums[key] = 0;
            questionCounts[key] = 0;
          }
          questionSums[key] += value.resposta;
          questionCounts[key]++;
        });
      }
    });

    return Object.keys(questionSums)
      .map(key => ({
        question: key,
        average: questionSums[key] / questionCounts[key],
        text: data[0][category][key].pergunta,
        professorName: data[0].professor_name,
        disciplineName: data[0].discipline_name,
        count: questionCounts[key] 
      }))
      .sort((a, b) => {
        // Extract numeric part from question key and sort numerically
        const numA = parseInt(a.question.replace(/\D/g,'')) || 0;
        const numB = parseInt(b.question.replace(/\D/g,'')) || 0;
        return numA - numB;
      });
  }
  
  /**
   * Render the appropriate chart based on type
   */
  renderChart(type, container, data, category) {
    switch(type) {
      case 'bar':
        this.createBarChart(container, data, category);
        break;
      case 'line':
        this.createLineChart(container, data, category);
        break;
      case 'radar':
        this.createRadarChart(container, data, category);
        break;
      default:
        this.createBarChart(container, data, category);
    }
  }
  
  /**
   * Create bar chart
   */
  createBarChart(container, averages, category) {
    if (!averages || averages.length === 0) return;
    
    const margin = { top: 30, right: 30, bottom: 140, left: 70 };
    const width = 850 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = this.d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = this.d3.scaleBand()
      .range([0, width])
      .padding(0.2)
      .domain(averages.map(d => d.question));
    
    const y = this.d3.scaleLinear()
      .range([height, 0])
      .domain([0, 5]);
    
    // Add grid
    svg.append("g")
      .attr("class", "grid")
      .call(this.d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      );
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(this.d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");
    
    svg.append("g")
      .call(this.d3.axisLeft(y));
    
    // Add bars with animation
    svg.selectAll(".bar")
      .data(averages)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.question))
      .attr("width", x.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", this.colors.bar)
      .attr("rx", 4)
      .attr("ry", 4)
      .on("mouseover", (event, d) => this.showTooltip(event, d))
      .on("mouseout", () => this.hideTooltip())
      .on("mousemove", (event) => this.moveTooltip(event))
      .transition()
      .duration(800)
      .attr("y", d => y(d.average))
      .attr("height", d => height - y(d.average));
    
    // Add value labels
    svg.selectAll(".value-label")
      .data(averages)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.question) + x.bandwidth() / 2)
      .attr("y", d => y(d.average) - 5)
      .attr("text-anchor", "middle")
      .style("fill", "#34495e")
      .style("font-size", "12px")
      .style("opacity", 0)
      .text(d => d.average.toFixed(1))
      .transition()
      .duration(800)
      .style("opacity", 1);
    
    this.addLegend(container, averages);
  }
  
  /**
   * Create line chart
   */
  createLineChart(container, averages, category) {
    if (!averages || averages.length === 0) return;
    
    const margin = { top: 30, right: 30, bottom: 140, left: 70 };
    const width = 850 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = this.d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = this.d3.scaleBand()
      .range([0, width])
      .padding(0.2)
      .domain(averages.map(d => d.question));
    
    const y = this.d3.scaleLinear()
      .range([height, 0])
      .domain([0, 5]);
    
    // Add grid
    svg.append("g")
      .attr("class", "grid")
      .call(this.d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      );
    
    // Add axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(this.d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");
    
    svg.append("g")
      .call(this.d3.axisLeft(y));
    
    // Create line generator
    const line = this.d3.line()
      .x(d => x(d.question) + x.bandwidth() / 2)
      .y(d => y(d.average))
      .curve(this.d3.curveMonotoneX);
    
    // Add line path with animation
    const path = svg.append("path")
      .datum(averages)
      .attr("fill", "none")
      .attr("stroke", this.colors.line)
      .attr("stroke-width", 3)
      .attr("d", line);
    
    // Animate the line
    const pathLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", pathLength)
      .attr("stroke-dashoffset", pathLength)
      .transition()
      .duration(1000)
      .attr("stroke-dashoffset", 0);
    
    // Add points
    svg.selectAll(".point")
      .data(averages)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", d => x(d.question) + x.bandwidth() / 2)
      .attr("cy", d => y(d.average))
      .attr("r", 0)
      .attr("fill", this.colors.line)
      .on("mouseover", (event, d) => this.showTooltip(event, d))
      .on("mouseout", () => this.hideTooltip())
      .on("mousemove", (event) => this.moveTooltip(event))
      .transition()
      .delay(1000)
      .duration(300)
      .attr("r", 5);
    
    // Add value labels
    svg.selectAll(".value-label")
      .data(averages)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.question) + x.bandwidth() / 2)
      .attr("y", d => y(d.average) - 15)
      .attr("text-anchor", "middle")
      .style("fill", "#34495e")
      .style("font-size", "12px")
      .style("opacity", 0)
      .text(d => d.average.toFixed(1))
      .transition()
      .delay(1000)
      .duration(500)
      .style("opacity", 1);
    
    this.addLegend(container, averages);
  }
  
  /**
   * Create radar chart
   */
  createRadarChart(container, averages, category) {
    if (!averages || averages.length === 0) return;
    
    const width = 850;
    const height = 600;
    const radius = Math.min(width, height) / 2 - 80;
    
    // Create SVG
    const svg = this.d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2},${height/2})`);
    
    // Create scales
    const angleScale = this.d3.scaleBand()
      .domain(averages.map(d => d.question))
      .range([0, 2 * Math.PI]);
    
    const radiusScale = this.d3.scaleLinear()
      .domain([0, 5])
      .range([0, radius]);
    
    // Draw the axis lines
    svg.selectAll(".axis-line")
      .data(averages)
      .enter()
      .append("line")
      .attr("class", "axis-line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d, i) => radius * Math.cos(angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2))
      .attr("y2", (d, i) => radius * Math.sin(angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2))
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1);
    
    // Draw the concentric circles
    const circleRadii = [1, 2, 3, 4, 5];
    svg.selectAll(".circle")
      .data(circleRadii)
      .enter()
      .append("circle")
      .attr("class", "circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", d => radiusScale(d))
      .attr("fill", "none")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");
    
    // Add labels for concentric circles
    svg.selectAll(".circle-label")
      .data(circleRadii)
      .enter()
      .append("text")
      .attr("class", "circle-label")
      .attr("x", 5)
      .attr("y", d => -radiusScale(d))
      .text(d => d)
      .attr("font-size", "10px")
      .attr("fill", "#666");
    
    // Create radar line generator
    const radarLine = this.d3.lineRadial()
      .angle(d => angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2)
      .radius(d => radiusScale(d.average))
      .curve(this.d3.curveLinearClosed);
    
    // Add radar path
    const path = svg.append("path")
      .datum(averages)
      .attr("class", "radar-path")
      .attr("fill", `${this.colors.radar}44`)
      .attr("stroke", this.colors.radar)
      .attr("stroke-width", 2)
      .attr("d", radarLine);
    
    // Animate the radar
    const pathLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", pathLength)
      .attr("stroke-dashoffset", pathLength)
      .transition()
      .duration(1000)
      .attr("stroke-dashoffset", 0);
    
    // Add data points
    svg.selectAll(".point")
      .data(averages)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", d => radiusScale(d.average) * Math.cos(angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2))
      .attr("cy", d => radiusScale(d.average) * Math.sin(angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2))
      .attr("r", 0)
      .attr("fill", this.colors.radar)
      .on("mouseover", (event, d) => this.showTooltip(event, d))
      .on("mouseout", () => this.hideTooltip())
      .on("mousemove", (event) => this.moveTooltip(event))
      .transition()
      .delay(1000)
      .duration(300)
      .attr("r", 5);
    
    // Add axis labels
    svg.selectAll(".axis-label")
      .data(averages)
      .enter()
      .append("text")
      .attr("class", "axis-label")
      .attr("x", d => (radius + 20) * Math.cos(angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2))
      .attr("y", d => (radius + 20) * Math.sin(angleScale(d.question) + angleScale.bandwidth() / 2 - Math.PI / 2))
      .attr("text-anchor", d => {
        const angle = angleScale(d.question) + angleScale.bandwidth() / 2;
        if (angle < Math.PI / 2 || angle > 3 * Math.PI / 2) return "start";
        else if (angle === Math.PI / 2 || angle === 3 * Math.PI / 2) return "middle";
        else return "end";
      })
      .attr("dominant-baseline", d => {
        const angle = angleScale(d.question) + angleScale.bandwidth() / 2;
        if (angle === 0 || angle === Math.PI) return "middle";
        else if (angle < Math.PI) return "hanging";
        else return "auto";
      })
      .text(d => d.question)
      .attr("font-size", "12px")
      .attr("fill", "#333");
    
    this.addLegend(container, averages);
  }
  
  /**
   * Add legend to chart
   */
  addLegend(container, averages) {
    const legendContainer = document.createElement('div');
    legendContainer.className = 'legend-container';
    
    averages.forEach(d => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <span class="legend-question">${d.question}:</span>
        <span class="legend-text">${d.text}</span>
      `;
      legendContainer.appendChild(item);
    });
    
    // Make legend container scrollable but with larger height for PDF export
    legendContainer.style.maxHeight = 'none';
    legendContainer.style.overflow = 'visible';
    
    container.appendChild(legendContainer);
  }
  
  /**
   * Show tooltip with data
   */
  showTooltip(event, d) {
    this.d3.select("#chartTooltip")
      .style("opacity", 1)
      .html(`
        <strong>${d.text}</strong><br>
        Média: ${d.average.toFixed(2)}<br>
        Respostas: ${d.count}
      `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 28) + "px");
  }
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.d3.select("#chartTooltip").style("opacity", 0);
  }
  
  /**
   * Move tooltip with cursor
   */
  moveTooltip(event) {
    this.d3.select("#chartTooltip")
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 28) + "px");
  }
}