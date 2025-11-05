import { getElement } from '../utils.js';
import { generateCode } from '../services/ai.js';
import { updateVersionButton } from './version-history.js';
import { setupAttachments, clearAttachments } from './chat-attachments.js';
import { setupFileSuggestions, handleAtFileSuggestions, hideFileSuggestions } from './chat-file-suggestions.js';
import { addMessage, renderAICodeMessage } from './chat-messages.js';

const chatForm = getElement('chatForm');
const chatInput = getElement('chatInput');
const sendBtn = getElement('sendBtn');
const errorIcon = getElement('errorIcon');

let lastError = null;

export { addMessage, renderAICodeMessage };

export function setupChat() {
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
        handleAtFileSuggestions();
    });

    setupFileSuggestions();
    setupAttachments();

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Hide suggestions when focus is lost, unless clicking on a suggestion
    document.addEventListener('click', (e) => {
        if (!chatForm.contains(e.target)) {
            hideFileSuggestions();
        }
    });

    errorIcon.addEventListener('click', () => {
        if (lastError) {
            const errorMessage = `I encountered an error in my code. Can you please fix it? Here are the details:\n\nError message: ${lastError.message}\n\nPlease provide the corrected code for the relevant file(s).`;
            sendMessage(errorMessage);
        }
    });
    
    updateVersionButton(); // Initialize button state
}

async function sendMessage(messageOverride) {
    const message = messageOverride || chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    if (!messageOverride) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }
    // Clear attachments after sending
    clearAttachments();

    sendBtn.disabled = true;
    errorIcon.classList.add('hidden');

    const originalIcon = sendBtn.innerHTML;
    sendBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>`;
    lucide.createIcons();

    try {
        await generateCode(message);
        updateVersionButton();
    } catch (error) {
        console.error('Error during code generation flow:', error);
        // Remove the last streaming message if an error occurs
        const chatMessages = getElement('chatMessages');
        const lastMessage = chatMessages.lastChild;
        if (lastMessage && lastMessage.querySelector('.bg-gray-100')?.innerHTML === '') {
             lastMessage.remove();
        }
        addMessage(`Sorry, something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ai');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalIcon;
        lucide.createIcons();
    }
}

export function setLastError(error) {
    lastError = error;
}

export function clearLastError() {
    lastError = null;
}
