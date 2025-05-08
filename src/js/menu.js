async function loadMenu() {
    try {
        const response = await fetch('src/html/menu.html');
        const menuHtml = await response.text();
        document.getElementById('menu').innerHTML = menuHtml;

        // Highlight the active tab based on the current page
        const currentPage = window.location.pathname.split("/").pop();
        const activeButton = document.querySelector(`a[href='${currentPage}']`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Dark mode logic
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            // Check if user has manually set a preference
            const userPreference = localStorage.getItem('darkMode');
            
            if (userPreference === null) {
                // If no manual preference, check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.classList.toggle('dark-mode', prefersDark);
                localStorage.setItem('darkMode', prefersDark);
            } else {
                // Apply saved user preference
                document.body.classList.toggle('dark-mode', userPreference === 'true');
            }

            // Listen for system preference changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                // Only auto-switch if user hasn't set a manual preference
                if (localStorage.getItem('darkMode') === null) {
                    document.body.classList.toggle('dark-mode', e.matches);
                    localStorage.setItem('darkMode', e.matches);
                }
            });

            // Manual toggle
            darkModeToggle.addEventListener('click', function() {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkMode);
            });
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}
