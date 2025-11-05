import { getElement } from '../utils.js';
import { files } from '../state.js';

const chatInput = getElement('chatInput');
const atFileSuggestions = getElement('atFileSuggestions');

export function handleAtFileSuggestions() {
    const text = chatInput.value;
    const cursorPosition = chatInput.selectionStart;

    const atMatch = text.slice(0, cursorPosition).match(/@(\S*)$/);

    if (atMatch) {
        const query = atMatch[1];
        const fileNames = Object.keys(files);
        const filteredFiles = fileNames.filter(name => name.toLowerCase().includes(query.toLowerCase()));

        if (filteredFiles.length > 0) {
            atFileSuggestions.innerHTML = '';
            filteredFiles.forEach(fileName => {
                const item = document.createElement('div');
                item.className = 'px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer';
                item.textContent = fileName;
                item.onclick = () => selectFileSuggestion(fileName, atMatch.index);
                atFileSuggestions.appendChild(item);
            });
            atFileSuggestions.classList.remove('hidden');
        } else {
            atFileSuggestions.classList.add('hidden');
        }
    } else {
        atFileSuggestions.classList.add('hidden');
    }
}

function selectFileSuggestion(fileName, startIndex) {
    const text = chatInput.value;
    const preText = text.substring(0, startIndex);
    const postText = text.substring(chatInput.selectionStart);

    chatInput.value = `${preText}@${fileName} ${postText}`;
    atFileSuggestions.classList.add('hidden');
    chatInput.focus();

    // Move cursor after the inserted filename + space
    const newCursorPos = (preText + `@${fileName} `).length;
    chatInput.setSelectionRange(newCursorPos, newCursorPos);
}

export function setupFileSuggestions() {
    chatInput.addEventListener('click', handleAtFileSuggestions);
    chatInput.addEventListener('keyup', (e) => {
        // Handle arrow keys if suggestions are open, for now just re-check
        if (e.key.includes('Arrow')) {
            handleAtFileSuggestions();
        }
    });
}

export function hideFileSuggestions() {
    atFileSuggestions.classList.add('hidden');
}
