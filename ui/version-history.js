import { getElement } from '../utils.js';
import { state, restoreVersion } from '../state.js';
import { updatePreview } from './preview.js';
import { loadFile } from './editor.js';
import * as Diff from '/node_modules/diff/dist/diff.js';

const versionHistoryPanel = getElement('versionHistoryPanel');
const versionHistoryBtn = getElement('versionHistoryBtn');

function getModeForFile(fileName) {
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.js')) return 'javascript';
    return 'text';
}

function showCodeViewerModal(versionIndex) {
    const version = state.versionHistory[versionIndex];
    if (!version) return;

    const previousVersion = versionIndex > 0 ? state.versionHistory[versionIndex - 1] : null;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'code-viewer-modal';
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4';
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });

    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden';

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0';
    header.innerHTML = `<h2 class="text-lg font-semibold">Code for Version ${versionIndex + 1}</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-gray-100';
    closeBtn.innerHTML = `<i data-lucide="x" class="w-5 h-5 text-gray-500"></i>`;
    closeBtn.onclick = () => modalOverlay.remove();
    header.appendChild(closeBtn);

    // Main content area
    const mainArea = document.createElement('div');
    mainArea.className = 'flex-1 flex overflow-hidden';
    
    // File Explorer
    const fileExplorer = document.createElement('div');
    fileExplorer.className = 'w-[240px] bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-y-auto p-2 space-y-1';

    // Code View Area
    const codeView = document.createElement('div');
    codeView.className = 'flex-1 flex flex-col overflow-hidden bg-white';

    const codeHeader = document.createElement('div');
    codeHeader.className = 'p-3 border-b border-gray-200 bg-white text-sm font-mono text-gray-800 flex-shrink-0';
    codeHeader.textContent = 'Select a file to view changes';
    
    const codeContainer = document.createElement('div');
    codeContainer.className = 'flex-1 overflow-auto p-4 bg-white'; // Changed background to white
    const pre = document.createElement('pre');
    pre.className = 'text-sm font-mono'; // Added font-mono for better code alignment
    const code = document.createElement('code');
    pre.appendChild(code);
    codeContainer.appendChild(pre);

    codeView.appendChild(codeHeader);
    codeView.appendChild(codeContainer);

    const currentFiles = version.files || {};
    const previousFiles = previousVersion ? (previousVersion.files || {}) : {};
    const allFileNames = new Set([...Object.keys(currentFiles), ...Object.keys(previousFiles)]);


    allFileNames.forEach(fileName => {
        const inCurrent = fileName in currentFiles;
        const inPrevious = fileName in previousFiles;

        let status = 'unchanged';
        if (inCurrent && !inPrevious) {
            status = 'added';
        } else if (!inCurrent && inPrevious) {
            status = 'deleted';
        } else if (inCurrent && inPrevious && currentFiles[fileName].content !== previousFiles[fileName].content) {
            status = 'modified';
        }

        // Only show files that have changed, unless it's the very first version
        if (status === 'unchanged' && previousVersion) {
            return;
        }

        const fileItem = document.createElement('button');
        fileItem.className = 'w-full text-left px-3 py-1.5 text-sm rounded-md text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors';
        fileItem.dataset.file = fileName;
        
        const statusIcon = document.createElement('span');
        statusIcon.className = 'font-mono w-4 text-center font-bold';
        
        const fileText = document.createElement('span');
        fileText.textContent = fileName;
        
        switch(status) {
            case 'added':
                statusIcon.textContent = '+';
                statusIcon.classList.add('text-green-600');
                break;
            case 'deleted':
                statusIcon.textContent = '-';
                statusIcon.classList.add('text-red-600');
                fileText.classList.add('line-through');
                break;
            case 'modified':
                statusIcon.textContent = '±';
                statusIcon.classList.add('text-blue-600');
                break;
            default:
                statusIcon.innerHTML = '&nbsp;'; // for alignment
                break;
        }

        fileItem.appendChild(statusIcon);
        fileItem.appendChild(fileText);

        fileItem.onclick = () => {
            fileExplorer.querySelectorAll('button').forEach(t => t.classList.remove('bg-blue-100', 'text-blue-800', 'font-semibold'));
            fileItem.classList.add('bg-blue-100', 'text-blue-800', 'font-semibold');
            
            codeHeader.textContent = fileName;
            const fileContent = currentFiles[fileName]?.content || '';
            const prevFileContent = previousFiles[fileName]?.content || ``;
            
            code.innerHTML = ''; // Clear previous content

            if (!previousVersion && status !== 'deleted') {
                // No previous version, just show the code
                const escapedContent = fileContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                code.innerHTML = `<span class="text-gray-800">${escapedContent}</span>`;
            } else {
                // Generate and display diff
                const diff = Diff.diffLines(prevFileContent, fileContent, {
                    ignoreWhitespace: false, 
                    newlineIsToken: true 
                });

                diff.forEach(part => {
                    const span = document.createElement('span');
                    const escapedValue = part.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");

                    if (part.added) {
                        span.className = 'bg-green-100 text-green-800 block';
                        span.innerHTML = `<span class="select-none pr-2 text-green-500">+</span>${escapedValue}`;
                    } else if (part.removed) {
                        span.className = 'bg-red-100 text-red-800 block';
                        span.innerHTML = `<span class="select-none pr-2 text-red-500">-</span>${escapedValue}`;
                    } else {
                        span.className = 'text-gray-500 block';
                        // Add an empty span for alignment with diff lines
                        span.innerHTML = `<span class="select-none pr-2 text-gray-400"> </span>${escapedValue}`;
                    }
                    code.appendChild(span);
                });
            }
        };
        fileExplorer.appendChild(fileItem);
    });

    mainArea.appendChild(fileExplorer);
    mainArea.appendChild(codeView);

    modalContent.appendChild(header);
    modalContent.appendChild(mainArea);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    lucide.createIcons();
    
    // Select first tab by default
    const firstFile = fileExplorer.querySelector('button');
    if (firstFile) {
        firstFile.click();
    }
}

export function updateVersionButton() {
    versionHistoryBtn.textContent = `V${state.versionHistory.length}`;
}

export function renderVersionHistory() {
    versionHistoryPanel.innerHTML = ''; // Clear previous content
    const versionList = document.createElement('div');
    versionList.className = 'flex-1 overflow-y-auto p-3 space-y-2';

    if (state.versionHistory.length === 0) {
        versionList.innerHTML = `<p class="text-center text-gray-500 text-sm p-4">No versions saved yet.</p>`;
    } else {
        [...state.versionHistory].reverse().forEach((version, index) => {
            const reversedIndex = state.versionHistory.length - 1 - index;
            const versionItem = document.createElement('div');
            versionItem.className = `p-3 rounded-lg border transition-all ${reversedIndex === state.currentVersion ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`;

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between';

            const title = document.createElement('h3');
            title.className = 'font-semibold text-sm';
            title.textContent = `Version ${reversedIndex + 1}`;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'flex items-center gap-2';

            const viewCodeBtn = document.createElement('button');
            viewCodeBtn.className = 'px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200';
            viewCodeBtn.textContent = 'View Code';
            viewCodeBtn.onclick = () => {
                showCodeViewerModal(reversedIndex);
            };

            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600';
            restoreBtn.textContent = 'Restore';
            restoreBtn.onclick = () => {
                restoreVersion(reversedIndex);
                updatePreview();
                if(state.codeMirrorEditor) {
                   loadFile(state.currentFile, true);
                }
                renderVersionHistory(); // Re-render to show active state
            };

            header.appendChild(title);
            buttonGroup.appendChild(viewCodeBtn);
            buttonGroup.appendChild(restoreBtn);
            header.appendChild(buttonGroup);

            const summary = document.createElement('p');
            summary.className = 'text-xs text-gray-600 mt-1 italic';
            summary.textContent = version.summary || "No summary available.";

            const metaContainer = document.createElement('div');
            metaContainer.className = 'mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500';

            const tokenInfo = document.createElement('div');
            tokenInfo.className = 'flex items-center gap-2';

            const sign = version.tokenDiff >= 0 ? '+' : '-';
            const diffClass = version.tokenDiff >= 0 ? 'text-green-600' : 'text-red-600';
            const diffValue = Math.abs(version.tokenDiff);

            tokenInfo.innerHTML = `
                <span title="Total tokens">${version.tokens} tokens</span>
                <span class="${diffClass}" title="Token difference from previous version">
                    (${sign}${diffValue})
                </span>
            `;

            const modelInfo = document.createElement('div');
            modelInfo.className = 'font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-sm';
            modelInfo.textContent = version.model ? version.model.split('/')[1] : 'unknown';
            modelInfo.title = `Model: ${version.model || 'Unknown'}`;

            metaContainer.appendChild(tokenInfo);
            metaContainer.appendChild(modelInfo);

            versionItem.appendChild(header);
            versionItem.appendChild(summary);
            versionItem.appendChild(metaContainer);
            versionList.appendChild(versionItem);
        });
    }

    versionHistoryPanel.appendChild(versionList);
}
