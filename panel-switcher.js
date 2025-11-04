import { getElement } from '../utils.js';
import { setupVisualEditor, teardownVisualEditor } from './visual-editor.js';
import { renderVersionHistory } from './version-history.js';

const chatPanelContent = getElement('chatPanelContent');
const chatPanelTitle = getElement('chatPanelTitle');
const chatMessages = getElement('chatMessages');
const versionHistoryPanel = getElement('versionHistoryPanel');
const visualEditorPanel = getElement('visualEditorPanel');
const chatInputArea = getElement('chatInputArea');
const visualEditorBtn = getElement('visualEditorBtn');
const versionHistoryBtn = getElement('versionHistoryBtn');

const views = {
    'chat': { title: 'AI Assistant', panel: chatMessages, showInput: true },
    'history': { title: 'Version History', panel: versionHistoryPanel, showInput: false },
    'visual': { title: 'Visual Editor', panel: visualEditorPanel, showInput: false }
};

function toggleView(targetView) {
    const currentView = chatPanelContent.dataset.view;
    if (currentView === targetView) { // Toggle off to chat view
        targetView = 'chat';
    }

    if (currentView === 'visual') teardownVisualEditor();

    Object.values(views).forEach(view => view.panel.classList.add('hidden'));

    const newView = views[targetView];
    chatPanelContent.dataset.view = targetView;
    chatPanelTitle.textContent = newView.title;
    newView.panel.classList.remove('hidden');

    if (newView.showInput) {
        chatInputArea.classList.remove('hidden');
    } else {
        chatInputArea.classList.add('hidden');
    }

    if (targetView === 'history') renderVersionHistory();
    if (targetView === 'visual') setupVisualEditor();
}

export function setupPanelSwitcher() {
    visualEditorBtn.addEventListener('click', () => {
        toggleView('visual');
    });
    versionHistoryBtn.addEventListener('click', () => {
        toggleView('history');
    });
}

