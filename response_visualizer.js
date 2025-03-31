/**
 * Enhanced visualization and export functionality for responses
 */

export class ResponseVisualizer {
    constructor() {
      this.filterOptions = {
        professor: 'all',
        discipline: 'all',
        category: 'all',
        searchText: ''
      };
      
      this.viewModes = ['table', 'summary', 'compact'];
      this.currentViewMode = 'table';
    }
    
    /**
     * Initialize the visualizer with data and DOM elements
     * @param {Array} responses - All response data
     * @param {string} containerId - Container to render visualizations
     */
    initialize(responses, containerId = 'responses-container') {
      this.allResponses = responses;
      this.container = document.getElementById(containerId);
      
      this.addViewModeSwitcher();
      this.displayResponses(this.filterData());
    }
    
    /**
     * Add view mode switcher buttons
     */
    addViewModeSwitcher() {
      const switcherContainer = document.createElement('div');
      switcherContainer.className = 'view-mode-switcher';
      switcherContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        justify-content: center;
        background: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      `;
      
      const modeLabels = {
        'table': 'Tabela Completa',
        'summary': 'Resumo por Categoria',
        'compact': 'Visualização Compacta'
      };
      
      this.viewModes.forEach(mode => {
        const button = document.createElement('button');
        button.textContent = modeLabels[mode];
        button.className = `view-mode-btn ${mode === this.currentViewMode ? 'active' : ''}`;
        button.dataset.mode = mode;
        button.style.cssText = `
          padding: 8px 16px;
          background: ${mode === this.currentViewMode ? '#3b82f6' : 'white'};
          color: ${mode === this.currentViewMode ? 'white' : '#333'};
          border: 1px solid #3b82f6;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        `;
        
        button.addEventListener('click', () => {
          this.currentViewMode = mode;
          
          // Update active state of buttons
          switcherContainer.querySelectorAll('.view-mode-btn').forEach(btn => {
            if (btn.dataset.mode === mode) {
              btn.style.backgroundColor = '#3b82f6';
              btn.style.color = 'white';
              btn.classList.add('active');
            } else {
              btn.style.backgroundColor = 'white';
              btn.style.color = '#333';
              btn.classList.remove('active');
            }
          });
          
          // Update display
          this.displayResponses(this.filterData());
        });
        
        switcherContainer.appendChild(button);
      });
      
      if (this.container.firstChild) {
        this.container.insertBefore(switcherContainer, this.container.firstChild);
      } else {
        this.container.appendChild(switcherContainer);
      }
    }
    
    /**
     * Update filter options and redisplay data
     * @param {Object} options - New filter options
     */
    updateFilters(options) {
      this.filterOptions = {...this.filterOptions, ...options};
      this.displayResponses(this.filterData());
    }
    
    /**
     * Filter the data based on current filter options
     * @returns {Array} - Filtered responses
     */
    filterData() {
      let filteredData = [...this.allResponses];
      
      if (this.filterOptions.professor !== 'all') {
        filteredData = filteredData.filter(r => r.professor_name === this.filterOptions.professor);
      }
      
      if (this.filterOptions.discipline !== 'all') {
        filteredData = filteredData.filter(r => r.discipline_name === this.filterOptions.discipline);
      }
      
      if (this.filterOptions.searchText) {
        const searchText = this.filterOptions.searchText.toLowerCase();
        filteredData = filteredData.filter(r => {
          // Check comments and suggestions
          if (r.comentarios?.toLowerCase().includes(searchText) || 
              r.sugestoes?.toLowerCase().includes(searchText)) {
            return true;
          }
          
          // Check questions and answers in all categories
          const categories = ['aluno', 'professor', 'disciplina'];
          for (const category of categories) {
            if (r[category]) {
              for (const key in r[category]) {
                if (r[category][key].pergunta?.toLowerCase().includes(searchText)) {
                  return true;
                }
              }
            }
          }
          
          return false;
        });
      }
      
      return filteredData;
    }
    
    /**
     * Display responses in the appropriate view mode
     * @param {Array} responses - Filtered responses to display
     */
    displayResponses(responses) {
      // Clear container except for the view mode switcher
      const switcher = this.container.querySelector('.view-mode-switcher');
      this.container.innerHTML = '';
      if (switcher) {
        this.container.appendChild(switcher);
      }
      
      if (responses.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'responses-section';
        noData.innerHTML = `
          <div class="no-data">Nenhuma resposta encontrada para os filtros selecionados.</div>
        `;
        this.container.appendChild(noData);
        return;
      }
      
      switch (this.currentViewMode) {
        case 'table':
          this.displayTableView(responses);
          break;
        case 'summary':
          this.displaySummaryView(responses);
          break;
        case 'compact':
          this.displayCompactView(responses);
          break;
        default:
          this.displayTableView(responses);
      }
    }
    
    /**
     * Display full table view of responses
     */
    displayTableView(responses) {
      // Display textual responses (comments and suggestions)
      const textualSection = document.createElement('div');
      textualSection.className = 'responses-section';
      textualSection.innerHTML = `
        <h3>Comentários e Sugestões</h3>
        <table>
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Professor</th>
              <th>Comentários</th>
              <th>Sugestões</th>
            </tr>
          </thead>
          <tbody>
            ${responses.map(r => `
              <tr>
                <td>${r.discipline_name}</td>
                <td>${r.professor_name}</td>
                <td class="text-comments">${r.comentarios || 'Não fornecido'}</td>
                <td class="text-comments">${r.sugestoes || 'Não fornecido'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      this.container.appendChild(textualSection);
      
      // Only show selected category or all categories
      const categories = this.filterOptions.category === 'all'
        ? ['aluno', 'professor', 'disciplina']
        : [this.filterOptions.category];
        
      // Display numeric responses for each category
      categories.forEach(category => {
        const sectionTitle = {
          'aluno': 'Avaliação do Aluno',
          'professor': 'Avaliação do Professor',
          'disciplina': 'Avaliação da Disciplina'
        }[category];
        
        const section = document.createElement('div');
        section.className = 'responses-section';
        
        // Build a set of all questions from this category
        const allQuestions = new Set();
        responses.forEach(r => {
          if (r[category]) {
            Object.keys(r[category]).forEach(key => {
              allQuestions.add(key);
            });
          }
        });
        
        // Sort questions by key
        const sortedQuestions = Array.from(allQuestions).sort();
        
        // Create table
        const tableHTML = `
          <h3>${sectionTitle}</h3>
          <table>
            <thead>
              <tr>
                <th>Disciplina</th>
                <th>Professor</th>
                ${sortedQuestions.map(q => `<th>${q}</th>`).join('')}
              </tr>
              <tr>
                <th colspan="2">Descrição da Pergunta</th>
                ${sortedQuestions.map(q => {
                  const question = responses.find(r => r[category]?.[q])
                  return `<th>${question?.[category]?.[q]?.pergunta || 'N/A'}</th>`
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${responses.map(r => `
                <tr>
                  <td>${r.discipline_name}</td>
                  <td>${r.professor_name}</td>
                  ${sortedQuestions.map(q => {
                    const value = r[category]?.[q]?.resposta;
                    return `<td>${value !== undefined ? value : 'N/A'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        
        section.innerHTML = tableHTML;
        this.container.appendChild(section);
      });
    }
    
    /**
     * Display summary view with averages and statistics
     */
    displaySummaryView(responses) {
      const categories = this.filterOptions.category === 'all'
        ? ['aluno', 'professor', 'disciplina']
        : [this.filterOptions.category];
      
      categories.forEach(category => {
        const sectionTitle = {
          'aluno': 'Resumo da Avaliação do Aluno',
          'professor': 'Resumo da Avaliação do Professor',
          'disciplina': 'Resumo da Avaliação da Disciplina'
        }[category];
        
        const section = document.createElement('div');
        section.className = 'responses-section';
        
        // Get all questions for this category
        const questions = {};
        
        responses.forEach(r => {
          if (r[category]) {
            Object.entries(r[category]).forEach(([key, value]) => {
              if (!questions[key]) {
                questions[key] = {
                  text: value.pergunta,
                  responses: [],
                  sum: 0,
                  count: 0
                };
              }
              
              if (value.resposta) {
                questions[key].responses.push(value.resposta);
                questions[key].sum += value.resposta;
                questions[key].count++;
              }
            });
          }
        });
        
        // Sort questions by key
        const sortedQuestionKeys = Object.keys(questions).sort();
        
        // Create summary table
        let tableHTML = `
          <h3>${sectionTitle}</h3>
          <table>
            <thead>
              <tr>
                <th>Questão</th>
                <th>Descrição</th>
                <th>Média</th>
                <th>Respostas</th>
                <th>Distribuição</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        sortedQuestionKeys.forEach(key => {
          const q = questions[key];
          const average = q.count > 0 ? (q.sum / q.count).toFixed(2) : 'N/A';
          
          // Calculate distribution
          const distribution = [0, 0, 0, 0, 0]; // For responses 1-5
          q.responses.forEach(resp => {
            if (resp >= 1 && resp <= 5) {
              distribution[resp-1]++;
            }
          });
          
          // Create mini bar chart for distribution
          const maxCount = Math.max(...distribution);
          const barChart = distribution.map((count, index) => {
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return `
              <div style="display: inline-block; text-align: center; margin: 0 2px;">
                <div style="background: #3b82f6; width: 20px; height: ${percentage}px; margin: 0 auto;"></div>
                <div>${index + 1}</div>
                <div>${count}</div>
              </div>
            `;
          }).join('');
          
          tableHTML += `
            <tr>
              <td>${key}</td>
              <td>${q.text}</td>
              <td><strong>${average}</strong></td>
              <td>${q.count}</td>
              <td>
                <div style="display: flex; justify-content: center; align-items: flex-end; height: 120px;">
                  ${barChart}
                </div>
              </td>
            </tr>
          `;
        });
        
        tableHTML += `
            </tbody>
          </table>
        `;
        
        section.innerHTML = tableHTML;
        this.container.appendChild(section);
      });
    }
    
    /**
     * Display compact view focused on key information
     */
    displayCompactView(responses) {
      // Group responses by professor and discipline
      const groupedResponses = {};
      
      responses.forEach(r => {
        const key = `${r.professor_name}:${r.discipline_name}`;
        if (!groupedResponses[key]) {
          groupedResponses[key] = {
            professor: r.professor_name,
            discipline: r.discipline_name,
            count: 0,
            aluno: {},
            professor: {},
            disciplina: {},
            comments: []
          };
        }
        
        groupedResponses[key].count++;
        
        // Add comments if provided
        if (r.comentarios) {
          groupedResponses[key].comments.push(r.comentarios);
        }
        
        // Process each category
        ['aluno', 'professor', 'disciplina'].forEach(category => {
          if (r[category]) {
            Object.entries(r[category]).forEach(([qKey, value]) => {
              if (!groupedResponses[key][category][qKey]) {
                groupedResponses[key][category][qKey] = {
                  text: value.pergunta,
                  sum: 0,
                  count: 0
                };
              }
              
              if (value.resposta) {
                groupedResponses[key][category][qKey].sum += value.resposta;
                groupedResponses[key][category][qKey].count++;
              }
            });
          }
        });
      });
      
      // Create compact cards for each professor/discipline combination
      Object.values(groupedResponses).forEach(group => {
        const card = document.createElement('div');
        card.className = 'response-card';
        card.style.cssText = `
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          margin-bottom: 20px;
          overflow: hidden;
        `;
        
        const headerSection = document.createElement('div');
        headerSection.style.cssText = `
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          color: white;
          padding: 15px 20px;
        `;
        
        headerSection.innerHTML = `
          <h3 style="margin: 0; font-size: 1.3em;">${group.discipline}</h3>
          <p style="margin: 5px 0 0;">Professor: ${group.professor}</p>
          <p style="margin: 5px 0 0;">Respostas: ${group.count}</p>
        `;
        
        card.appendChild(headerSection);
        
        // Only show categories specified in filter
        const categories = this.filterOptions.category === 'all'
          ? ['aluno', 'professor', 'disciplina']
          : [this.filterOptions.category];
        
        categories.forEach(category => {
          const categoryTitle = {
            'aluno': 'Avaliação do Aluno',
            'professor': 'Avaliação do Professor',
            'disciplina': 'Avaliação da Disciplina'
          }[category];
          
          const categorySection = document.createElement('div');
          categorySection.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
          `;
          
          let categoryContent = `<h4 style="margin: 0 0 10px; color: #1e40af;">${categoryTitle}</h4>`;
          
          // Get top 5 questions with highest and lowest averages
          const questions = Object.entries(group[category])
            .map(([key, data]) => ({
              key,
              text: data.text,
              average: data.count > 0 ? data.sum / data.count : 0
            }))
            .sort((a, b) => a.average - b.average);
          
          const lowestQuestions = questions.slice(0, 3);
          const highestQuestions = questions.slice(-3).reverse();
          
          if (questions.length > 0) {
            categoryContent += `
              <div style="margin-bottom: 15px;">
                <p style="font-weight: 600; color: #333;">Pontos Fortes:</p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${highestQuestions.map(q => `
                    <li>
                      <strong>${q.key}:</strong> ${q.text} 
                      <span style="color: #2e7d32; font-weight: 600; margin-left: 5px;">
                        (${q.average.toFixed(2)})
                      </span>
                    </li>
                  `).join('')}
                </ul>
              </div>
              
              <div>
                <p style="font-weight: 600; color: #333;">Pontos a Melhorar:</p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${lowestQuestions.map(q => `
                    <li>
                      <strong>${q.key}:</strong> ${q.text}
                      <span style="color: #c62828; font-weight: 600; margin-left: 5px;">
                        (${q.average.toFixed(2)})
                      </span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            `;
          } else {
            categoryContent += `<p>Sem dados disponíveis para esta categoria.</p>`;
          }
          
          categorySection.innerHTML = categoryContent;
          card.appendChild(categorySection);
        });
        
        // Add comments section if there are any
        if (group.comments.length > 0) {
          const commentsSection = document.createElement('div');
          commentsSection.style.cssText = `
            padding: 15px 20px;
          `;
          
          commentsSection.innerHTML = `
            <h4 style="margin: 0 0 10px; color: #1e40af;">Comentários (${group.comments.length})</h4>
            <div style="max-height: 150px; overflow-y: auto; background: #f5f7fb; padding: 10px; border-radius: 5px;">
              ${group.comments.map(comment => `
                <p style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
                  "${comment}"
                </p>
              `).join('')}
            </div>
          `;
          
          card.appendChild(commentsSection);
        }
        
        this.container.appendChild(card);
      });
    }
  }
  