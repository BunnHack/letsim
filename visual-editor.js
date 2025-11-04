import { getElement } from '../utils.js';

const visualEditorPanel = getElement('visualEditorPanel');
const previewFrame = getElement('previewFrame');

let selectedElement = null;
let highlightOverlay = null;

function createOverlays() {
    if (!previewFrame.contentDocument) return;
    const doc = previewFrame.contentDocument;

    const style = doc.createElement('style');
    style.textContent = `
        .highlight-overlay-ai-tool {
            position: absolute;
            background-color: rgba(0, 123, 255, 0.2);
            border: 1px dashed #007bff;
            z-index: 9998;
            pointer-events: none;
            transition: all 0.1s ease;
        }
        .selection-overlay-ai-tool {
            position: absolute;
            background-color: rgba(0, 123, 255, 0.25);
            border: 2px solid #007bff;
            z-index: 9999;
            pointer-events: none;
            transition: all 0.1s ease;
        }
    `;
    doc.head.appendChild(style);

    highlightOverlay = doc.createElement('div');
    highlightOverlay.className = 'highlight-overlay-ai-tool';
    doc.body.appendChild(highlightOverlay);
}

function updateOverlay(element, overlay) {
    if (!element || !overlay || !previewFrame.contentWindow) return;
    const rect = element.getBoundingClientRect();
    const scrollX = previewFrame.contentWindow.scrollX;
    const scrollY = previewFrame.contentWindow.scrollY;

    overlay.style.left = `${rect.left + scrollX}px`;
    overlay.style.top = `${rect.top + scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';
}

function handleMouseOver(e) {
    updateOverlay(e.target, highlightOverlay);
}

function handleMouseOut() {
    if(highlightOverlay) highlightOverlay.style.display = 'none';
}

function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    selectedElement = e.target;
    
    // Remove previous selection outlines
    const existingSelection = previewFrame.contentDocument.querySelector('.selection-overlay-ai-tool');
    if (existingSelection) {
        existingSelection.remove();
    }
    
    const selectionOverlay = previewFrame.contentDocument.createElement('div');
    selectionOverlay.className = 'selection-overlay-ai-tool';
    previewFrame.contentDocument.body.appendChild(selectionOverlay);
    
    updateOverlay(selectedElement, selectionOverlay);
    renderPropertyPanel(selectedElement);
}

function renderPropertyPanel(element) {
    if (!element) {
        visualEditorPanel.innerHTML = '<p class="p-4 text-sm text-gray-500">Click on an element in the preview to inspect and edit it.</p>';
        return;
    }

    const computedStyle = window.getComputedStyle(element);

    visualEditorPanel.innerHTML = `
        <div class="p-4 space-y-4">
            <div class="flex items-center gap-2">
                <span class="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${element.tagName.toLowerCase()}</span>
                ${element.id ? `<span class="text-xs text-gray-500 font-mono">#${element.id}</span>` : ''}
                ${element.className ? `<span class="text-xs text-gray-500 font-mono">.${element.className.split(' ').join('.')}</span>` : ''}
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Text Content</label>
                <textarea id="textContentEditor" class="w-full p-2 border rounded-md text-sm">${element.textContent.trim()}</textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Color</label>
                    <input type="color" id="colorEditor" class="w-full h-8 border-0 p-0" value="${rgbToHex(computedStyle.color)}">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Background</label>
                    <input type="color" id="bgColorEditor" class="w-full h-8 border-0 p-0" value="${rgbToHex(computedStyle.backgroundColor)}">
                </div>
            </div>
        </div>
    `;

    getElement('textContentEditor').addEventListener('input', (e) => {
        if(selectedElement) selectedElement.textContent = e.target.value;
    });
    getElement('colorEditor').addEventListener('input', (e) => {
        if(selectedElement) selectedElement.style.color = e.target.value;
    });
    getElement('bgColorEditor').addEventListener('input', (e) => {
        if(selectedElement) selectedElement.style.backgroundColor = e.target.value;
    });
}

function rgbToHex(rgb) {
    if (!rgb || !rgb.startsWith('rgb')) return '#000000';
    let [r, g, b] = rgb.match(/\d+/g).map(Number);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function setupVisualEditor() {
    if (!previewFrame.contentDocument || !previewFrame.contentDocument.body) {
        setTimeout(setupVisualEditor, 100); // Wait for iframe to load
        return;
    }
    createOverlays();
    previewFrame.contentDocument.body.addEventListener('mousemove', handleMouseOver);
    previewFrame.contentDocument.body.addEventListener('mouseout', handleMouseOut);
    previewFrame.contentDocument.body.addEventListener('click', handleClick);
    renderPropertyPanel(null); // Initial state
}

export function teardownVisualEditor() {
    if (!previewFrame.contentDocument || !previewFrame.contentDocument.body) return;
    previewFrame.contentDocument.body.removeEventListener('mousemove', handleMouseOver);
    previewFrame.contentDocument.body.removeEventListener('mouseout', handleMouseOut);
    previewFrame.contentDocument.body.removeEventListener('click', handleClick);

    const overlays = previewFrame.contentDocument.querySelectorAll('.highlight-overlay-ai-tool, .selection-overlay-ai-tool');
    overlays.forEach(o => o.remove());

    selectedElement = null;
    highlightOverlay = null;
}