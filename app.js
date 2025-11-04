import { setupViewportControls } from './ui/viewport.js';
import { setupChat } from './ui/chat.js';
import { setupModelSelector } from './ui/model-selector.js';
import { setupEditor } from './ui/editor.js';
import { updatePreview } from './ui/preview.js';
import { setupTopbar } from './ui/topbar.js';
import { loadComponent } from './utils.js';
import { setupPanelSwitcher } from './ui/panel-switcher.js';
import { setupSplitLayout } from './ui/split-panels.js';

// Initialize
async function initializeApp() {
    // Load modal component
    await loadComponent('components/settings-modal.html', '#modalContainer');
    
    setupViewportControls();
    setupChat();
    setupModelSelector();
    setupEditor();
    setupTopbar();
    setupPanelSwitcher();
    setupSplitLayout();
    
    updatePreview();
    document.getElementById('previewLoadingOverlay').classList.add('hidden');
    lucide.createIcons();
}

initializeApp();