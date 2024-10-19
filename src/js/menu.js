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
    } catch (error) {
        console.error('Error loading menu:', error);
    }
}
