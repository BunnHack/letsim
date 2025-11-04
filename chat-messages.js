import { getElement } from '../utils.js';
import { marked } from '/node_modules/marked/lib/marked.esm.js';

const chatMessages = getElement('chatMessages');

export function renderAICodeMessage(text, targetElement) {
    // This regex now needs to handle an optional, unterminated code block at the end
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
    
    const parsedBlocks = [];
    let lastIndex = 0;
    
    // Split by ``` to find alternating text and code blocks
    const parts = text.split('```');

    for (let i = 0; i < parts.length; i++) {
        const content = parts[i];
        if (i % 2 === 0) { // Text block
            if (content) {
                parsedBlocks.push({ type: 'text', content });
            }
        } else { // Code block
            const newlineIndex = content.indexOf('\n');
            if (newlineIndex !== -1) {
                const lang = content.substring(0, newlineIndex).trim();
                const code = content.substring(newlineIndex + 1);
                parsedBlocks.push({ type: 'code', lang, content: code });
            } else {
                // It's a language definition without code yet, treat as a pending code block
                parsedBlocks.push({ type: 'code', lang: content.trim(), content: '' });
            }
        }
    }

    const codeBlockElements = [];

    // Reconcile parsed blocks with DOM
    parsedBlocks.forEach((block, i) => {
        let existingChild = targetElement.children[i];

        if (existingChild && existingChild.dataset.blockType === block.type) {
            // Update existing element
            if (block.type === 'text') {
                const newHTML = marked.parse(block.content);
                if (existingChild.innerHTML !== newHTML) {
                    existingChild.innerHTML = newHTML;
                }
            } else { // 'code'
                const codeEl = existingChild.querySelector('code');
                if (codeEl && codeEl.textContent !== block.content) {
                    codeEl.textContent = block.content;
                }
                 codeBlockElements.push(existingChild);
            }
        } else {
            // Create new element (or replace if type is different)
            let newElement;
            if (block.type === 'text') {
                newElement = document.createElement('div');
                newElement.dataset.blockType = 'text';
                newElement.innerHTML = marked.parse(block.content);
            } else { // 'code'
                const fileName = getFileNameFromLang(block.lang);
                newElement = document.createElement('div');
                newElement.className = 'code-collapsible mb-2 rounded-md border border-gray-300';
                newElement.dataset.blockType = 'code';
                newElement.dataset.filename = fileName;
                
                const header = document.createElement('div');
                header.className = 'code-header flex items-center justify-between p-2 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors';
                header.innerHTML = `
                    <div class="flex items-center gap-2">
                        <i data-lucide="file-code" class="w-4 h-4 text-gray-600"></i>
                        <span class="font-mono text-sm font-medium text-gray-800">${fileName}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="status-icon" data-status="loading">
                            <i data-lucide="loader-2" class="w-4 h-4 text-gray-500 animate-spin"></i>
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-gray-500 transition-transform"></i>
                    </div>
                `;

                const contentEl = document.createElement('div');
                contentEl.className = 'code-content hidden bg-gray-800 text-white text-xs font-mono';
                
                const pre = document.createElement('pre');
                pre.className = 'p-3 my-0 overflow-x-auto';
                
                const codeEl = document.createElement('code');
                codeEl.textContent = block.content;
                
                pre.appendChild(codeEl);
                contentEl.appendChild(pre);

                newElement.appendChild(header);
                newElement.appendChild(contentEl);
                codeBlockElements.push(newElement);

                header.addEventListener('click', () => {
                    contentEl.classList.toggle('hidden');
                    const chevron = header.querySelector('[data-lucide="chevron-down"]');
                    chevron.classList.toggle('rotate-180');
                });
            }

            if (existingChild) {
                targetElement.replaceChild(newElement, existingChild);
            } else {
                targetElement.appendChild(newElement);
            }
            lucide.createIcons();
        }
    });

    // Remove extra children from the DOM that are no longer present in parsed blocks
    while (targetElement.children.length > parsedBlocks.length) {
        targetElement.removeChild(targetElement.lastChild);
    }
    
    return codeBlockElements;
}

function getFileNameFromLang(lang) {
    return lang.split(/\s+/)[0] || 'file';
}

export function addMessage(text, type) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container group relative max-w-[85%] animate-[slideIn_0.2s_ease] mb-8 ${type === 'user' ? 'self-end' : 'self-start'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = `p-3 rounded-xl text-sm leading-relaxed ${type === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-black'}`;
    
    if (type === 'ai') {
        contentDiv.innerHTML = marked.parse(text);
        // Add styling to code blocks
        contentDiv.querySelectorAll('pre').forEach(pre => {
            pre.className = 'bg-gray-800 text-white rounded-md p-3 my-2 text-xs font-mono overflow-x-auto';
        });
        contentDiv.querySelectorAll('code:not(pre > code)').forEach(code => {
             code.className = 'bg-gray-200 text-red-600 rounded px-1 py-0.5 font-mono text-xs';
        });
    } else {
        contentDiv.textContent = text;
    }

    messageContainer.appendChild(contentDiv);

    if (type === 'ai') {
        const actionBar = document.createElement('div');
        actionBar.className = 'action-bar absolute left-0 bottom-0 translate-y-full flex items-center gap-1 opacity-0 transition-opacity pt-1';

        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:bg-gray-200';
        reloadBtn.title = 'Reload';
        reloadBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 text-gray-500"></i>`;
        reloadBtn.addEventListener('click', () => {
            console.log('Reloading response for:', text);
            // This is a placeholder for regeneration logic
            alert('Regeneration functionality coming soon!');
        });

        const copyBtn = document.createElement('button');
        copyBtn.className = 'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:bg-gray-200';
        copyBtn.title = 'Copy';
        copyBtn.innerHTML = `<i data-lucide="copy" class="w-4 h-4 text-gray-500"></i>`;
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-green-500"></i>`;
                lucide.createIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = `<i data-lucide="copy" class="w-4 h-4 text-gray-500"></i>`;
                    lucide.createIcons();
                }, 1500);
            });
        });

        actionBar.appendChild(reloadBtn);
        actionBar.appendChild(copyBtn);
        messageContainer.appendChild(actionBar);
    }

    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    lucide.createIcons();
    return contentDiv;
}