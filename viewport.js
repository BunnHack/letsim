import { getElement } from '../utils.js';

export function setupViewportControls() {
    const viewportButtons = document.querySelectorAll('.viewport-btn');
    const previewContainer = getElement('previewContainer');

    viewportButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewportButtons.forEach(b => {
                b.classList.remove('bg-black', 'text-white');
                b.classList.add('bg-transparent', 'text-gray-600', 'hover:bg-gray-200', 'hover:text-black');
            });
            btn.classList.remove('bg-transparent', 'text-gray-600', 'hover:bg-gray-200', 'hover:text-black');
            btn.classList.add('bg-black', 'text-white');

            const viewport = btn.dataset.viewport;
            previewContainer.className = `preview-container w-full h-full bg-white rounded-lg shadow-md transition-all overflow-hidden ${viewport}`;
        });
    });

    // Set initial state for mobile view
    const mobileButton = document.querySelector('.viewport-btn[data-viewport="mobile"]');
    if (mobileButton) mobileButton.click();
}