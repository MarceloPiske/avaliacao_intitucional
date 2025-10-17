export function setupDashboardSection() {
    // Dashboard elements - use unique IDs for each page
    const totalResponsesEl = document.getElementById('total-responses');
    const totalUsersEl = document.getElementById('total-users');
    const participationRateEl = document.getElementById('participation-rate');
    const averageRatingEl = document.getElementById('average-rating');
    
    // Dashboard tabs
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    
    // Only proceed if elements are found
    if (!totalResponsesEl) {
        console.error('Dashboard elements not found in DOM');
        return;
    }
    
    // Setup tab functionality
    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Get the view to show
            const viewToShow = tab.dataset.view;
            
            // Remove active class from all tabs
            dashboardTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all views
            const views = document.querySelectorAll('.dashboard-view');
            views.forEach(view => view.classList.remove('active'));
            
            // Show selected view (handle both admin and regular page)
            const viewEl = document.getElementById(`dashboard-${viewToShow}`) || 
                          document.getElementById(`dashboard-${viewToShow}-admin`);
            if (viewEl) {
                viewEl.classList.add('active');
                
                // Load data for the view if it's not already loaded
                loadViewData(viewToShow);
            }
        });
    });
    
    // Load dashboard data
    loadDashboardData();
    
    // Function to load data for specific views
    function loadViewData(view) {
        switch(view) {
            case 'overview':
                // Already loaded in loadDashboardData
                break;
            case 'profile':
                loadProfileView();
                break;
            case 'axis':
                loadAxisView();
                break;
            case 'dimension':
                loadDimensionView();
                break;
            case 'trends':
                loadTrendsView();
                break;
            case 'ranking':
                loadRankingView();
                break;
        }
    }
    
    async function loadDashboardData() {
        try {
            const db = firebase.firestore();
            
            // Get users count
            const userSnapshot = await db.collection('users').get();
            const totalUsers = userSnapshot.size;
            
            // Get real response data from Firestore
            const responseSnapshot = await db.collection('respostas_avaliacao_institucional').get();
            const totalResponses = responseSnapshot.size;
            
            // Calculate participation rate - number of unique users who submitted responses
            const uniqueUserIds = new Set();
            responseSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.userId) {
                    uniqueUserIds.add(data.userId);
                }
            });
            
            const participationRate = Math.round((uniqueUserIds.size / totalUsers) * 100) || 0;
            
            // Calculate average rating
            let totalRatingSum = 0;
            let totalRatingCount = 0;
            
            responseSnapshot.forEach(doc => {
                const data = doc.data();
                const answers = data.answers || {};
                
                Object.values(answers).forEach(rating => {
                    const ratingValue = parseInt(rating);
                    if (!isNaN(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
                        totalRatingSum += ratingValue;
                        totalRatingCount++;
                    }
                });
            });
            
            const averageRating = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(1) : '0.0';
            
            // Update dashboard cards
            if (totalResponsesEl) totalResponsesEl.textContent = totalResponses;
            if (totalUsersEl) totalUsersEl.textContent = totalUsers;
            if (participationRateEl) participationRateEl.textContent = `${participationRate}%`;
            if (averageRatingEl) averageRatingEl.textContent = averageRating;
            
            // Initialize charts with real data
            await initParticipationChart(db);
            await initDimensionChart(db);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }

    async function initParticipationChart(db) {
        // Replace chart placeholder with actual chart
        const participationChartEl = document.getElementById('participation-chart');
        participationChartEl.innerHTML = '';
        participationChartEl.classList.remove('chart-placeholder');
        
        const canvas = document.createElement('canvas');
        participationChartEl.appendChild(canvas);
        
        // Get response data from Firestore
        const responseSnapshot = await db.collection('respostas_avaliacao_institucional').get();
        const usersByType = {
            'alunos': 0,
            'professores': 0,
            'tecnicos': 0
        };
        
        // Count unique users by type
        const userTypesMap = new Map();
        responseSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId && data.userType) {
                userTypesMap.set(data.userId, data.userType);
            }
        });
        
        // Count participation by user type
        userTypesMap.forEach((type) => {
            if (usersByType.hasOwnProperty(type)) {
                usersByType[type]++;
            }
        });
        
        // Get total users by type for participation rate calculation
        const usersSnapshot = await db.collection('users').get();
        const totalUsersByType = {
            'alunos': 0,
            'professores': 0,
            'tecnicos': 0
        };
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.tipo && totalUsersByType.hasOwnProperty(data.tipo)) {
                totalUsersByType[data.tipo]++;
            }
        });
        
        // Calculate participation rates
        const participationRates = Object.keys(usersByType).map(type => {
            const totalForType = totalUsersByType[type] || 1; // Avoid division by zero
            return Math.round((usersByType[type] / totalForType) * 100) || 0;
        });
        
        // Render chart with real data
        const data = {
            labels: ['Discentes', 'Docentes', 'Técnicos Administrativos'],
            datasets: [{
                label: 'Taxa de Participação (%)',
                data: participationRates,
                backgroundColor: [
                    'rgba(75, 108, 183, 0.7)',
                    'rgba(56, 239, 125, 0.7)',
                    'rgba(238, 168, 73, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 108, 183, 1)',
                    'rgba(56, 239, 125, 1)',
                    'rgba(238, 168, 73, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        };
        
        new Chart(canvas, config);
    }

    async function initDimensionChart(db) {
        // Replace chart placeholder with actual chart
        const dimensionChartEl = document.getElementById('dimension-chart');
        dimensionChartEl.innerHTML = '';
        dimensionChartEl.classList.remove('chart-placeholder');
        
        const canvas = document.createElement('canvas');
        dimensionChartEl.appendChild(canvas);
        
        try {
            // Load questions mapping
            const response = await fetch('avaliacao_cpa_perguntas.json');
            const questions = await response.json();
            
            // Get response data from Firestore
            const responseSnapshot = await db.collection('respostas_avaliacao_institucional').get();
            
            // Initialize ratings by dimension
            const dimensionMap = new Map();
            const dimensionCounts = new Map();
            
            // Group questions by dimension
            questions.forEach(q => {
                const dimensionKey = `${q.eixo}-${q.dimensao}`;
                if (!dimensionMap.has(dimensionKey)) {
                    dimensionMap.set(dimensionKey, 0);
                    dimensionCounts.set(dimensionKey, 0);
                }
            });
            
            // Process responses
            responseSnapshot.forEach(doc => {
                const data = doc.data();
                const answers = data.answers || {};
                
                Object.keys(answers).forEach(questionId => {
                    const questionData = questions.find(q => q.id == questionId);
                    if (!questionData) return;
                    
                    const dimensionKey = `${questionData.eixo}-${questionData.dimensao}`;
                    const rating = parseInt(answers[questionId]);
                    
                    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                        dimensionMap.set(dimensionKey, dimensionMap.get(dimensionKey) + rating);
                        dimensionCounts.set(dimensionKey, dimensionCounts.get(dimensionKey) + 1);
                    }
                });
            });
            
            // Calculate averages
            const dimensionLabels = [];
            const dimensionAverages = [];
            
            dimensionMap.forEach((total, key) => {
                const count = dimensionCounts.get(key);
                if (count > 0) {
                    const [eixo, dimensao] = key.split('-');
                    dimensionLabels.push(`Eixo ${eixo} - Dim ${dimensao}`);
                    dimensionAverages.push((total / count).toFixed(1));
                }
            });
            
            // Render chart with real data
            const data = {
                labels: dimensionLabels,
                datasets: [{
                    label: 'Avaliação Média (1-5)',
                    data: dimensionAverages,
                    backgroundColor: 'rgba(75, 108, 183, 0.2)',
                    borderColor: 'rgba(75, 108, 183, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(75, 108, 183, 1)',
                    tension: 0.3
                }]
            };
            
            const config = {
                type: 'radar',
                data: data,
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
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Avaliação: ${context.raw}`;
                                }
                            }
                        }
                    }
                }
            };
            
            new Chart(canvas, config);
        } catch (error) {
            console.error("Error initializing dimension chart:", error);
        }
    }
    
    async function loadProfileView() {
        try {
            const db = firebase.firestore();
            const profileFilterEl = document.getElementById('profile-filter') || 
                                   document.getElementById('profile-filter-admin');
            const applyFilterBtn = document.getElementById('apply-profile-filter') || 
                                  document.getElementById('apply-profile-filter-admin');
            
            if (applyFilterBtn) {
                applyFilterBtn.addEventListener('click', () => {
                    const selectedProfile = profileFilterEl.value;
                    updateProfileCharts(selectedProfile);
                });
            }
            
            // Load initial profile view
            updateProfileCharts(profileFilterEl ? profileFilterEl.value : 'alunos');
            
            async function updateProfileCharts(profileType) {
                // Get response data for the selected profile
                const responseSnapshot = await db.collection('respostas_avaliacao_institucional')
                    .where('userType', '==', profileType)
                    .get();
                
                // Get questions data
                const questions = await loadQuestionsMapping();
                
                // Process response data
                const responsesData = {};
                const dimensionData = {};
                
                responseSnapshot.forEach(doc => {
                    const data = doc.data();
                    const answers = data.answers || {};
                    
                    // Count responses by question
                    Object.keys(answers).forEach(questionId => {
                        if (!responsesData[questionId]) {
                            responsesData[questionId] = 0;
                        }
                        responsesData[questionId]++;
                        
                        // Group by dimension
                        const question = questions.find(q => q.id == questionId);
                        if (question) {
                            const dimension = `${question.eixo}-${question.dimensao}`;
                            if (!dimensionData[dimension]) {
                                dimensionData[dimension] = {
                                    count: 0,
                                    sum: 0,
                                    label: `Eixo ${question.eixo} - Dim ${question.dimensao}`
                                };
                            }
                            
                            const rating = parseInt(answers[questionId]);
                            if (!isNaN(rating)) {
                                dimensionData[dimension].count++;
                                dimensionData[dimension].sum += rating;
                            }
                        }
                    });
                });
                
                // Update profile responses chart
                updateProfileResponsesChart(responsesData, questions);
                
                // Update profile dimension chart
                updateProfileDimensionChart(dimensionData);
            }
        } catch (error) {
            console.error("Error loading profile view:", error);
        }
    }
    
    function updateProfileResponsesChart(responsesData, questions) {
        // Get chart container
        const chartContainer = document.getElementById('profile-responses-chart') || 
                              document.getElementById('profile-responses-chart-admin');
        
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = '';
        chartContainer.classList.remove('chart-placeholder');
        
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        // Prepare data for chart
        const questionIds = Object.keys(responsesData).sort((a, b) => parseInt(a) - parseInt(b));
        const labels = questionIds.map(id => {
            const question = questions.find(q => q.id == id);
            return question ? `Q${id}` : `Questão ${id}`;
        });
        const data = questionIds.map(id => responsesData[id]);
        
        // Create chart
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de Respostas',
                    data: data,
                    backgroundColor: 'rgba(75, 108, 183, 0.7)',
                    borderColor: 'rgba(75, 108, 183, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                const questionId = questionIds[tooltipItems[0].dataIndex];
                                const question = questions.find(q => q.id == questionId);
                                return question ? question.texto : `Questão ${questionId}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateProfileDimensionChart(dimensionData) {
        // Get chart container
        const chartContainer = document.getElementById('profile-dimension-chart') || 
                              document.getElementById('profile-dimension-chart-admin');
        
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = '';
        chartContainer.classList.remove('chart-placeholder');
        
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        // Prepare data for chart
        const dimensions = Object.keys(dimensionData).sort();
        const labels = dimensions.map(d => dimensionData[d].label);
        const data = dimensions.map(d => {
            const dim = dimensionData[d];
            return dim.count > 0 ? (dim.sum / dim.count).toFixed(2) : 0;
        });
        
        // Create chart
        new Chart(canvas, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média por Dimensão',
                    data: data,
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
    }
    
    async function loadAxisView() {
        try {
            const db = firebase.firestore();
            
            // Get questions data
            const questions = await loadQuestionsMapping();
            
            // Get response data
            const responseSnapshot = await db.collection('respostas_avaliacao_institucional').get();
            
            // Process data for charts
            const axisQuestions = {};
            const axisRatings = {};
            
            // Count questions by axis
            questions.forEach(q => {
                const axis = q.eixo;
                if (!axisQuestions[axis]) {
                    axisQuestions[axis] = 0;
                    axisRatings[axis] = {
                        count: 0,
                        sum: 0
                    };
                }
                axisQuestions[axis]++;
            });
            
            // Calculate ratings by axis
            responseSnapshot.forEach(doc => {
                const data = doc.data();
                const answers = data.answers || {};
                
                Object.keys(answers).forEach(questionId => {
                    const question = questions.find(q => q.id == questionId);
                    if (question) {
                        const axis = question.eixo;
                        const rating = parseInt(answers[questionId]);
                        
                        if (!isNaN(rating)) {
                            axisRatings[axis].count++;
                            axisRatings[axis].sum += rating;
                        }
                    }
                });
            });
            
            // Update axis questions chart
            updateAxisQuestionsChart(axisQuestions);
            
            // Update axis average chart
            updateAxisAverageChart(axisRatings);
        } catch (error) {
            console.error("Error loading axis view:", error);
        }
    }
    
    function updateAxisQuestionsChart(axisQuestions) {
        // Get chart container
        const chartContainer = document.getElementById('axis-questions-chart') || 
                              document.getElementById('axis-questions-chart-admin');
        
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = '';
        chartContainer.classList.remove('chart-placeholder');
        
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        // Prepare data for chart
        const axes = Object.keys(axisQuestions).sort((a, b) => parseInt(a) - parseInt(b));
        const labels = axes.map(axis => `Eixo ${axis}`);
        const data = axes.map(axis => axisQuestions[axis]);
        
        // Create chart
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de Perguntas',
                    data: data,
                    backgroundColor: 'rgba(56, 239, 125, 0.7)',
                    borderColor: 'rgba(56, 239, 125, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    function updateAxisAverageChart(axisRatings) {
        // Get chart container
        const chartContainer = document.getElementById('axis-average-chart') || 
                              document.getElementById('axis-average-chart-admin');
        
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = '';
        chartContainer.classList.remove('chart-placeholder');
        
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);
        
        // Prepare data for chart
        const axes = Object.keys(axisRatings).sort((a, b) => parseInt(a) - parseInt(b));
        const labels = axes.map(axis => `Eixo ${axis}`);
        const data = axes.map(axis => {
            const ratings = axisRatings[axis];
            return ratings.count > 0 ? (ratings.sum / ratings.count).toFixed(2) : 0;
        });
        
        // Create chart
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média de Avaliação',
                    data: data,
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
    }
    
    async function loadDimensionView() {
        // Implement dimension view logic here
    }
    
    async function loadTrendsView() {
        // Implement trends view logic here
    }
    
    async function loadRankingView() {
        // Implement ranking view logic here
    }
    
    // Helper function to load questions mapping
    async function loadQuestionsMapping() {
        try {
            const response = await fetch('avaliacao_cpa_perguntas.json');
            return await response.json();
        } catch (error) {
            console.error("Error loading questions mapping:", error);
            return [];
        }
    }
}