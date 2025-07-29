export function setupAdminPanel() {
    const viewDashboardBtn = document.getElementById('view-dashboard-btn');
    const viewResultsBtn = document.getElementById('view-results-btn');
    const manageQuestionsBtn = document.getElementById('manage-questions-btn');
    const manageUsersBtn = document.getElementById('manage-users-btn');
    const manageAdminsBtn = document.getElementById('manage-admins-btn');

    // Use unique IDs for each page
    const dashboardSection = document.getElementById('dashboard-section-admin') || document.getElementById('dashboard-section');
    const resultsSection = document.getElementById('results-section-admin') || document.getElementById('results-section');
    const questionsSection = document.getElementById('questions-section');
    const usersSection = document.getElementById('users-section');
    const adminsSection = document.getElementById('admins-section');

    // Only proceed if elements are found
    if (!dashboardSection || !viewDashboardBtn) {
        console.error('Admin panel elements not found in DOM');
        return;
    }

    // Initialize sections
    import('./dashboardSection.js').then(module => module.setupDashboardSection());
    import('./resultsSection.js').then(module => module.setupResultsSection());
    import('./questionsSection.js').then(module => module.setupQuestionsSection());
    import('./usersSection.js').then(module => module.setupUsersSection());
    import('./adminsSection.js').then(module => module.setupAdminsSection());

    // Navigation buttons
    viewDashboardBtn.addEventListener('click', () => {
        showSection(dashboardSection);
        setActiveButton(viewDashboardBtn);
    });
    
    viewResultsBtn.addEventListener('click', () => {
        showSection(resultsSection);
        setActiveButton(viewResultsBtn);
    });

    manageQuestionsBtn.addEventListener('click', () => {
        showSection(questionsSection);
        setActiveButton(manageQuestionsBtn);
    });

    manageUsersBtn.addEventListener('click', () => {
        showSection(usersSection);
        setActiveButton(manageUsersBtn);
    });

    manageAdminsBtn.addEventListener('click', () => {
        showSection(adminsSection);
        setActiveButton(manageAdminsBtn);
    });

    function showSection(section) {
        // Hide all sections
        dashboardSection.style.display = 'none';
        resultsSection.style.display = 'none';
        questionsSection.style.display = 'none';
        usersSection.style.display = 'none';
        adminsSection.style.display = 'none';

        // Show selected section
        section.style.display = 'block';
    }

    function setActiveButton(button) {
        // Remove active class from all buttons
        viewDashboardBtn.classList.remove('active');
        viewResultsBtn.classList.remove('active');
        manageQuestionsBtn.classList.remove('active');
        manageUsersBtn.classList.remove('active');
        manageAdminsBtn.classList.remove('active');

        // Add active class to selected button
        button.classList.add('active');
    }
}