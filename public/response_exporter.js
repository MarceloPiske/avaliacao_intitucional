/**
 * Utility for exporting response data to PDF
 */
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';
import { getRatingLegendElement } from './chart_legend.js';

/**
 * Exports the responses table to PDF
 * @param {string} filename - The name of the PDF file
 * @param {string} containerSelector - The selector for the container to export
 */
export async function exportResponsesToPDF(filename = 'respostas_avaliacao.pdf', containerSelector = '#responses-container') {
  try {
    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error('Container not found');
    }
    
    // Show loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;"><div style="padding:20px;background:white;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,0.1);"><h3>Gerando PDF...<br>Não feixe esta aba do seu navegador</h3></div></div>';
    document.body.appendChild(loadingEl);
    
    // Create PDF
    const pdf = new jsPDF('l', 'mm', 'a4', true); 
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Add title
    pdf.setFontSize(16);
    pdf.text('Respostas da Avaliação das Disciplinas', pdfWidth / 2, 15, { align: 'center' });
    
    // Get current filters
    const professorFilter = document.getElementById('professorFilter')?.value || 'Todos';
    const disciplineFilter = document.getElementById('disciplineFilter')?.value || 'Todas';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'Todas';
    
    // Add filter information
    pdf.setFontSize(10);
    pdf.text(`Filtros aplicados: Professor: ${professorFilter} | Disciplina: ${disciplineFilter} | Categoria: ${categoryFilter}`, pdfWidth / 2, 22, { align: 'center' });
    
    // Add date information
    const today = new Date();
    pdf.text(`Exportado em: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`, pdfWidth / 2, 28, { align: 'center' });
    
    pdf.setFontSize(12);
    
    // Process tables individually with optimized settings
    const sections = container.querySelectorAll('.responses-section');
    let yOffset = 35; 
    let currentPage = 1;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const title = section.querySelector('h3')?.textContent || `Seção ${i+1}`;
      
      // Get table or card
      const table = section.querySelector('table');
      const cards = section.querySelectorAll('.response-card');
      
      if (table) {
        // Optimize table for PDF
        const tempTable = table.cloneNode(true);
        tempTable.style.width = '100%';
        tempTable.style.maxWidth = '100%';
        tempTable.style.fontSize = '8px'; 
        tempTable.style.borderCollapse = 'collapse';
        
        // Style table cells
        tempTable.querySelectorAll('th, td').forEach(cell => {
          cell.style.padding = '3px';
          cell.style.border = '1px solid #ddd';
          cell.style.maxWidth = '150px';
          cell.style.overflow = 'hidden';
          cell.style.whiteSpace = 'normal';
          cell.style.wordBreak = 'break-word';
        });
        
        // Create temporary container
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '1000px'; 
        
        // Add title and table
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.margin = '10px 0';
        titleEl.style.fontSize = '14px';
        titleEl.style.color = '#1e40af';
        
        tempContainer.appendChild(titleEl);
        tempContainer.appendChild(tempTable);
        document.body.appendChild(tempContainer);
        
        // Convert to image
        const canvas = await html2canvas(tempContainer, {
          scale: 2, 
          logging: false,
          useCORS: true
        });
        document.body.removeChild(tempContainer);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Calculate image dimensions to fit PDF page
        const imgWidth = pdfWidth - 20; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if we need a new page
        if (yOffset + imgHeight > pdfHeight) {
          pdf.addPage();
          currentPage++;
          yOffset = 15;
        }
        
        // Add table to PDF
        pdf.addImage(imgData, 'JPEG', 10, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 15; 
      } else if (cards.length > 0) {
        // Process card elements
        for (const card of cards) {
          // Create temporary container with card
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.width = '600px'; 
        
          // Add title
          const titleEl = document.createElement('h3');
          titleEl.textContent = title;
          titleEl.style.margin = '10px 0';
          titleEl.style.fontSize = '14px';
          titleEl.style.color = '#1e40af';
          
          tempContainer.appendChild(titleEl);
          tempContainer.appendChild(card.cloneNode(true));
          document.body.appendChild(tempContainer);
          
          // Convert to image
          const canvas = await html2canvas(tempContainer, {
            scale: 2, 
            logging: false,
            useCORS: true
          });
          document.body.removeChild(tempContainer);
          
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          // Calculate image dimensions to fit PDF page
          const imgWidth = pdfWidth - 20; 
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if we need a new page
          if (yOffset + imgHeight > pdfHeight) {
            pdf.addPage();
            currentPage++;
            yOffset = 15;
          }
          
          // Add card to PDF
          pdf.addImage(imgData, 'JPEG', 10, yOffset, imgWidth, imgHeight);
          yOffset += imgHeight + 15; 
        }
      } else {
        // Handle other content
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '800px';
        tempContainer.appendChild(section.cloneNode(true));
        document.body.appendChild(tempContainer);
        
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          logging: false,
          useCORS: true
        });
        document.body.removeChild(tempContainer);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Calculate image dimensions
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yOffset + imgHeight > pdfHeight) {
          pdf.addPage();
          currentPage++;
          yOffset = 15;
        }
        
        pdf.addImage(imgData, 'JPEG', 10, yOffset, imgWidth, imgHeight);
        yOffset += imgHeight + 15;
      }
      
      // Add page numbers
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Página ${currentPage}`, pdfWidth - 15, pdfHeight - 10, { align: 'right' });
    }
    
    // Save PDF
    pdf.save(filename);
    
    // Remove loading indicator
    document.body.removeChild(loadingEl);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Ocorreu um erro ao exportar o PDF. Por favor, tente novamente.');
  }
}

/**
 * Exports charts to PDF with improved rendering
 * @param {string} filename - The name of the PDF file
 * @param {string} containerSelector - The selector for the container to export
 */
export async function exportChartsToPDF(filename = 'resultados_avaliacao.pdf', containerSelector = '#charts-container') {
  try {
    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error('Container not found');
    }
    
    // Show loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);display:flex;justify-content:center;align-items:center;z-index:9999;"><div style="padding:20px;background:white;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,0.1);"><h3>Gerando PDF...</h3></div></div>';
    document.body.appendChild(loadingEl);
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Add title
    pdf.setFontSize(18);
    pdf.text('Resultados da Avaliação das Disciplinas', pdfWidth / 2, 15, { align: 'center' });
    pdf.setFontSize(12);
    
    // Add date information
    const today = new Date();
    pdf.setFontSize(10);
    pdf.text(`Exportado em: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`, pdfWidth / 2, 22, { align: 'center' });
    pdf.setFontSize(12);
    
    // Get filters if available
    const professorFilter = document.getElementById('professorFilter')?.value || 'Todos';
    const disciplineFilter = document.getElementById('disciplineFilter')?.value || 'Todas';
    
    // Add filter information if not default
    if (professorFilter !== 'all' || disciplineFilter !== 'all') {
      pdf.setFontSize(10);
      pdf.text(`Filtros: ${professorFilter !== 'all' ? 'Professor: ' + professorFilter : ''} ${disciplineFilter !== 'all' ? 'Disciplina: ' + disciplineFilter : ''}`, pdfWidth / 2, 28, { align: 'center' });
      pdf.setFontSize(12);
    }
    
    // Create a legend using the specialized function
    const legendElement = getRatingLegendElement();
    const tempLegendContainer = document.createElement('div');
    tempLegendContainer.style.position = 'absolute';
    tempLegendContainer.style.left = '-9999px';
    tempLegendContainer.style.width = '600px';
    tempLegendContainer.appendChild(legendElement);
    document.body.appendChild(tempLegendContainer);
    
    // Convert legend to image
    const legendCanvas = await html2canvas(tempLegendContainer, {
      scale: 2,
      logging: false,
      useCORS: true
    });
    document.body.removeChild(tempLegendContainer);
    
    const legendImgData = legendCanvas.toDataURL('image/png');
    const legendImgWidth = pdfWidth - 40;
    const legendImgHeight = (legendCanvas.height * legendImgWidth) / legendCanvas.width;
    
    pdf.addImage(legendImgData, 'PNG', 20, 35, legendImgWidth, legendImgHeight);
    
    // Get canvas from each chart and add to PDF
    const charts = container.querySelectorAll('.chart-container');
    let yOffset = 35 + legendImgHeight + 10;
    
    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      
      // Create a clone of the chart
      const chartClone = chart.cloneNode(true);
      
      // Ensure legend containers show all content
      chartClone.querySelectorAll('.legend-container').forEach(el => {
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
        // Increase font size for better readability
        el.querySelectorAll('.legend-item').forEach(item => {
          item.style.fontSize = '12px';
          item.style.margin = '12px 0';
          item.style.lineHeight = '1.4';
        });
      });
      
      // Create a temporary container with ample size
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '1200px'; // Increased width
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.appendChild(chartClone);
      document.body.appendChild(tempContainer);
      
      // Convert to image with high quality settings
      const canvas = await html2canvas(tempContainer, {
        scale: 2, 
        logging: false,
        useCORS: true,
        backgroundColor: 'white'
      });
      document.body.removeChild(tempContainer);
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Calculate image dimensions to fit PDF page
      const imgWidth = pdfWidth + 20; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page
      if (yOffset + imgHeight > pdfHeight) {
        pdf.addPage();
        yOffset = 15;
      }
      
      // Add chart to PDF
      pdf.addImage(imgData, 'PNG', -10, yOffset, imgWidth, imgHeight);
      yOffset += imgHeight + 15; 
      
      // Add description if space allows
      /* const chartTitle = chart.querySelector('.chart-title')?.textContent || `Gráfico ${i+1}`; */
      
      if (yOffset + 10 <= pdfHeight) {
        pdf.setFontSize(10);
        /* pdf.text(chartTitle, pdfWidth / 2, yOffset - 5, { align: 'center' }); */
        yOffset += 10;
      }
    }
    
    // Save PDF
    pdf.save(filename);
    
    // Remove loading indicator
    document.body.removeChild(loadingEl);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Ocorreu um erro ao exportar o PDF. Por favor, tente novamente.');
  }
}