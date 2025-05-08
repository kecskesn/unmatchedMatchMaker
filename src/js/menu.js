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

        // Dark mode toggle logic
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', function() {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkMode);
            });
        }

        // Check localStorage for dark mode preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}
