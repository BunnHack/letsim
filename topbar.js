import { getElement } from '../utils.js';
import { updatePreview, getPreviewContent } from './preview.js';
import { files } from '../state.js';

export function setupTopbar() {
    const projectName = getElement('projectName');

    projectName.addEventListener('focus', () => {
        projectName.classList.remove('truncate');
    });

    projectName.addEventListener('blur', () => {
        projectName.classList.add('truncate');
        if (!projectName.textContent?.trim()) {
            projectName.textContent = 'Untitled Project';
        }
    });

    projectName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            projectName.blur();
        }
    });

    getElement('refreshBtn').addEventListener('click', () => {
        updatePreview();
    });

    getElement('openNewWindowBtn').addEventListener('click', () => {
        const content = getPreviewContent();
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    });

    getElement('downloadBtn').addEventListener('click', () => {
        if (Object.keys(files).length === 0) {
            alert("There are no files to download.");
            return;
        }

        const zip = new JSZip();

        for (const fileName in files) {
            const file = files[fileName];
            if (file.isBinary && file.dataURL) {
                const base64Data = file.dataURL.split(',')[1];
                zip.file(fileName, base64Data, { base64: true });
            } else if (typeof file.content === 'string') {
                zip.file(fileName, file.content);
            }
        }

        zip.generateAsync({ type: "blob" })
            .then(function(content) {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                const projectNameEl = getElement('projectName');
                const projectNameText = projectNameEl.textContent.trim().replace(/\s+/g, '_') || 'project';
                a.href = url;
                a.download = `${projectNameText}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }).catch(err => {
                console.error("Failed to generate zip file:", err);
                alert("An error occurred while creating the zip file.");
            });
    });

    const settingsModal = getElement('settingsModal');
    const openSettings = () => {
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('flex');
        lucide.createIcons();
    };
    const closeSettings = () => {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
    };

    getElement('settingsBtn').addEventListener('click', openSettings);
    getElement('userSettingsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        openSettings();
        getElement('userProfileDropdown').classList.add('hidden');
    });

    getElement('closeSettingsBtn').addEventListener('click', closeSettings);

    settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });

    getElement('deleteProjectBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            alert('Project deleted! (This would normally redirect to the projects page)');
            // window.location.href = '/index.html';
        }
    });

    // User profile dropdown
    const userProfileBtn = getElement('userProfileBtn');
    const userProfileDropdown = getElement('userProfileDropdown');

    userProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userProfileDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userProfileBtn.contains(e.target) && !userProfileDropdown.contains(e.target)) {
            userProfileDropdown.classList.add('hidden');
        }
    });
}