export function setupAdminPanel() {
    const viewAnalyticsBtn = document.getElementById('view-analytics-btn');
    const manageQuestionsBtn = document.getElementById('manage-questions-btn');
    const manageUsersBtn = document.getElementById('manage-users-btn');
    const manageAdminsBtn = document.getElementById('manage-admins-btn');

    const analyticsSection = document.getElementById('analytics-section');
    const questionsSection = document.getElementById('questions-section');
    const usersSection = document.getElementById('users-section');
    const adminsSection = document.getElementById('admins-section');

    if (!analyticsSection || !viewAnalyticsBtn || !questionsSection || !manageQuestionsBtn || !usersSection || !manageUsersBtn || !adminsSection || !manageAdminsBtn) {
        console.error('Admin panel elements not found in DOM');
        return;
    }

    const sections = {
        analytics: {
            element: analyticsSection,
            button: viewAnalyticsBtn,
            path: './sections/analytics.html',
            setup: async () => {
                const { setupAnalyticsSection } = await import('./analyticsSection.js');
                setupAnalyticsSection();
            },
            loaded: false
        },
        questions: {
            element: questionsSection,
            button: manageQuestionsBtn,
            path: './sections/questions.html',
            setup: async () => {
                const { setupQuestionsSection } = await import('./questionsSection.js');
                setupQuestionsSection();
            },
            loaded: false
        },
        users: {
            element: usersSection,
            button: manageUsersBtn,
            path: './sections/users.html',
            setup: async () => {
                const { setupUsersSection } = await import('./usersSection.js');
                setupUsersSection();
            },
            loaded: false
        },
        admins: {
            element: adminsSection,
            button: manageAdminsBtn,
            path: './sections/admins.html',
            setup: async () => {
                const { setupAdminsSection } = await import('./adminsSection.js');
                setupAdminsSection();
            },
            loaded: false
        }
    };

    async function showSection(sectionKey) {
        const sectionConfig = sections[sectionKey];

        // Hide all sections
        for (const key in sections) {
            sections[key].element.style.display = 'none';
        }

        // Load content if not already loaded
        if (!sectionConfig.loaded) {
            try {
                sectionConfig.element.innerHTML = '<div class="loading-spinner"></div>';
                sectionConfig.element.style.display = 'block';

                const response = await fetch(sectionConfig.path);
                if (!response.ok) throw new Error(`Failed to load ${sectionConfig.path}`);
                
                const html = await response.text();
                sectionConfig.element.innerHTML = html;
                await sectionConfig.setup();
                sectionConfig.loaded = true;
            } catch (error) {
                console.error(`Error loading section ${sectionKey}:`, error);
                sectionConfig.element.innerHTML = `<p class="error-message">Error loading content for this section.</p>`;
            }
        }

        // Show the target section
        sectionConfig.element.style.display = 'block';
        setActiveButton(sectionConfig.button);
    }

    function setActiveButton(button) {
        viewAnalyticsBtn.classList.remove('active');
        manageQuestionsBtn.classList.remove('active');
        manageUsersBtn.classList.remove('active');
        manageAdminsBtn.classList.remove('active');

        button.classList.add('active');
    }

    // Event listeners
    viewAnalyticsBtn.addEventListener('click', () => showSection('analytics'));
    manageQuestionsBtn.addEventListener('click', () => showSection('questions'));
    manageUsersBtn.addEventListener('click', () => showSection('users'));
    manageAdminsBtn.addEventListener('click', () => showSection('admins'));

    // Show initial section
    showSection('analytics');
}