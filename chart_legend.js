/**
 * Adds a legend to the charts page explaining the rating scale
 */
export function addRatingLegend(containerId = 'charts-container') {
  // Create legend container element
  const legendContainer = document.createElement('div');
  legendContainer.className = 'rating-legend';
  legendContainer.style.cssText = `
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin: 0 auto 30px;
    max-width: 900px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  `;

  // Create legend content
  legendContainer.innerHTML = `
    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.2em;">Legenda para Interpretação dos Dados</h3>
    <p style="margin-bottom: 10px;">Os respondentes optaram em cada questão por uma das alternativas abaixo:</p>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center;">
      <div style="font-weight: bold; color: #34495e;">1</div>
      <div>Discordo Totalmente</div>
      <div style="font-weight: bold; color: #34495e;">2</div>
      <div>Discordo</div>
      <div style="font-weight: bold; color: #34495e;">3</div>
      <div>Concordo Parcialmente</div>
      <div style="font-weight: bold; color: #34495e;">4</div>
      <div>Concordo</div>
      <div style="font-weight: bold; color: #34495e;">5</div>
      <div>Concordo Totalmente</div>
    </div>
  `;

  // Get the target container
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID ${containerId} not found`);
    return;
  }

  // Insert the legend at the top of the container
  container.insertBefore(legendContainer, container.firstChild);
}

// New function that returns the legend element without adding it to DOM
export function getRatingLegendElement() {
  const legendContainer = document.createElement('div');
  legendContainer.className = 'rating-legend';
  legendContainer.style.cssText = `
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin: 0 auto 30px;
    max-width: 900px;
  `;

  legendContainer.innerHTML = `
    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.2em;">Legenda para Interpretação dos Dados</h3>
    <p style="margin-bottom: 10px;">Os respondentes optaram em cada questão por uma das alternativas abaixo:</p>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center;">
      <div style="font-weight: bold; color: #34495e;">1</div>
      <div>Discordo Totalmente</div>
      <div style="font-weight: bold; color: #34495e;">2</div>
      <div>Discordo</div>
      <div style="font-weight: bold; color: #34495e;">3</div>
      <div>Concordo Parcialmente</div>
      <div style="font-weight: bold; color: #34495e;">4</div>
      <div>Concordo</div>
      <div style="font-weight: bold; color: #34495e;">5</div>
      <div>Concordo Totalmente</div>
    </div>
  `;
  
  return legendContainer;
}