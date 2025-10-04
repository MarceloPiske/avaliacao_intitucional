/**
 * Utility functions for exporting chart data to PDF
 */
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';
import { getRatingLegendElement } from './chart_legend.js';

// Import the improved chart export function
import { exportChartsToPDF as exportChartsWithHighQuality } from './response_exporter.js';

/**
 * Exports the charts container to PDF
 * @param {string} filename - The name of the PDF file
 * @param {string} containerSelector - The selector for the container to export
 */
export async function exportChartsToPDF(filename = 'resultados_avaliacao.pdf', containerSelector = '#charts-container') {
  // Use the improved export function from response_exporter.js
  return exportChartsWithHighQuality(filename, containerSelector);
}