import { getElement } from '../utils.js';
import { files, state, setCurrentFile, setCodeMirrorEditor } from '../state.js';
import { updatePreview } from './preview.js';
import { setupSplitLayout } from './split-panels.js';

const codeEditorBtn = getElement('codeEditorBtn');
const previewPanel = getElement('preview-panel');
const editorPanel = getElement('editor-panel');
const editorContainer = getElement('editorContainer');
const currentFileName = getElement('currentFileName');
const fileList = getElement('fileList');
const saveCodeBtn = getElement('saveCodeBtn');
const editorTabs = getElement('editorTabs');

const openTabs = new Set();

function calculateTokens(content) {
    if (!content) return 0;
    // Count characters divided by 4 as approximation for tokens
    return Math.ceil(content.length / 4);
}

function renderFileList() {
    fileList.innerHTML = '';
    for (const fileName in files) {
        const file = files[fileName];
        const fileItem = document.createElement('div');
        fileItem.className = `file-item p-2 rounded hover:bg-gray-200 cursor-pointer text-sm flex items-center justify-between ${state.currentFile === fileName ? 'bg-gray-200' : ''}`;
        fileItem.dataset.file = fileName;

        const nameAndIcon = document.createElement('div');
        nameAndIcon.className = 'flex items-center gap-2';

        const icon = document.createElement('i');
        icon.dataset.lucide = 'file-code';
        icon.className = 'w-4 h-4';

        const name = document.createElement('span');
        name.textContent = fileName;

        nameAndIcon.appendChild(icon);
        nameAndIcon.appendChild(name);

        const tokenCount = document.createElement('span');
        tokenCount.className = 'text-xs text-gray-500';
        tokenCount.textContent = `${calculateTokens(file.content)} tokens`;

        fileItem.appendChild(nameAndIcon);
        fileItem.appendChild(tokenCount);
        fileList.appendChild(fileItem);
    }
    lucide.createIcons();
}

function getModeForFile(fileName) {
    if (fileName.endsWith('.html')) return 'htmlmixed';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js')) return 'javascript';
    return 'text/plain';
}

function initializeCodeMirror() {
    const editor = CodeMirror(editorContainer, {
        lineNumbers: true,
        mode: 'htmlmixed',
        theme: 'material-darker',
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentWithTabs: false
    });

    editor.on('change', () => {
        if (files[state.currentFile]) {
            files[state.currentFile].content = editor.getValue();
            renderFileList(); // Update token count on change
        }
    }); 
    
    setCodeMirrorEditor(editor);
}

function renderTabs() {
    editorTabs.innerHTML = '';

    openTabs.forEach(fileName => {
        const tab = document.createElement('div');
        tab.className = `editor-tab ${fileName === state.currentFile ? 'active' : ''}`;
        tab.dataset.file = fileName;

        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'file-code');
        icon.className = 'w-3.5 h-3.5';

        const name = document.createElement('span');
        name.textContent = fileName;

        const closeBtn = document.createElement('div');
        closeBtn.className = 'close-tab';
        closeBtn.innerHTML = '<i data-lucide=\"x\" class=\"w-3.5 h-3.5\"></i>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTabs.delete(fileName);
            if (fileName === state.currentFile && openTabs.size > 0) {
                const nextFile = Array.from(openTabs)[0];
                loadFile(nextFile);
            } else if (fileName === state.currentFile && openTabs.size === 0) {
                loadFile(null);
            }
            renderTabs();
        });

        tab.appendChild(icon);
        tab.appendChild(name);
        tab.appendChild(closeBtn);

        tab.addEventListener('click', () => {
            if (fileName !== state.currentFile) {
                loadFile(fileName);
            }
        });

        editorTabs.appendChild(tab);
    });

    lucide.createIcons();
}

function openTab(fileName) {
    if (!openTabs.has(fileName)) {
        openTabs.add(fileName);
    }
    loadFile(fileName);
    renderTabs();
}

export function loadFile(fileName, forceReload = false) {
    if (state.codeMirrorEditor && files[state.currentFile] && !forceReload) {
        files[state.currentFile].content = state.codeMirrorEditor.getValue();
    }

    setCurrentFile(fileName);

    if (fileName) {
        currentFileName.textContent = fileName;
        if (state.codeMirrorEditor) {
            state.codeMirrorEditor.setValue(files[fileName]?.content || '');
            state.codeMirrorEditor.setOption('mode', getModeForFile(fileName));
            state.codeMirrorEditor.refresh();
        }
    } else {
        currentFileName.textContent = 'No file open';
        if (state.codeMirrorEditor) {
            state.codeMirrorEditor.setValue('');
            state.codeMirrorEditor.setOption('mode', 'text/plain');
            state.codeMirrorEditor.refresh();
        }
    }

    // This part is now handled by renderFileList
    /* document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('bg-gray-200');
        if (item.getAttribute('data-file') === fileName) {
            item.classList.add('bg-gray-200');
        }
    }); */

    if (fileName && !openTabs.has(fileName)) {
        openTabs.add(fileName);
    }
    renderTabs();
    renderFileList();
}

export function setupEditor() {
    codeEditorBtn.addEventListener('click', () => {
        const isEditorVisible = !editorPanel.classList.contains('hidden');

        if (isEditorVisible) {
            editorPanel.classList.add('hidden');
            previewPanel.classList.remove('hidden');
            codeEditorBtn.classList.remove('bg-black', 'text-white');
        } else {
            previewPanel.classList.add('hidden');
            editorPanel.classList.remove('hidden');
            codeEditorBtn.classList.add('bg-black', 'text-white');

            if (!state.codeMirrorEditor) {
                initializeCodeMirror();
            }

            renderFileList(); // Initial render
            if (state.currentFile) {
                loadFile(state.currentFile, true);
            } else if (Object.keys(files).length > 0) {
                loadFile(Object.keys(files)[0], true);
            } else {
                loadFile(null, true);
            }
            lucide.createIcons();
        }
        setupSplitLayout();
    }); 
    
    getElement('uploadFileBtn').addEventListener('click', () => {
        getElement('editorFileInput').click();
    });

    getElement('editorFileInput').addEventListener('change', async (e) => {
        const uploadedFiles = e.target.files;
        if (!uploadedFiles || uploadedFiles.length === 0) return;

        const fileReadPromises = Array.from(uploadedFiles).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    files[file.name] = { name: file.name, content: event.target.result };
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsText(file);
            });
        });

        try {
            await Promise.all(fileReadPromises);

            renderFileList();
            if (uploadedFiles.length > 0) {
                // Open the first uploaded file in a new tab
                openTab(uploadedFiles[0].name);
            }
        } catch (error) {
            console.error("Error reading uploaded files:", error);
            alert("There was an error reading one or more files.");
        }

        // Reset file input to allow uploading the same file again
        e.target.value = '';
    });

    fileList.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (fileItem) {
            const fileName = fileItem.getAttribute('data-file');
            if (fileName) openTab(fileName);
        }
    });

    saveCodeBtn.addEventListener('click', () => {
        if (state.codeMirrorEditor && files[state.currentFile]) {
            files[state.currentFile].content = state.codeMirrorEditor.getValue();
            updatePreview();
            saveCodeBtn.textContent = 'Saved!';
            setTimeout(() => { saveCodeBtn.textContent = 'Save'; }, 1000);
        }
    });
}