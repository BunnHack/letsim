import { files, state, addVersion } from '../state.js';
import { updatePreview } from '../ui/preview.js';
import { loadFile } from '../ui/editor.js';
import { addMessage, renderAICodeMessage } from '../ui/chat-messages.js';
import { marked } from '/node_modules/marked/lib/marked.esm.js';

// The API Key is now on the server
// const OPENROUTER_API_KEY = '...'; 
const API_URL = '/api/generate'; // Our own backend endpoint

const CREATION_SYSTEM_PROMPT = `You are an expert web developer AI assistant. Your task is to generate the complete code for a user's request.
First, you must provide the full code for all necessary files (e.g., index.html, style.css, script.js, etc.).
Present the code as separate markdown code blocks, with the FULL FILENAME (including extension) as the language specifier.
After providing the code, you MUST provide a task summary in the specified format.
Do not add any explanations, introductions, or conclusions outside of the code blocks and summary.
The user will only see the final rendered website, so your response must be only the code.

IMPORTANT: Always use the complete filename with extension in the code fence, for example:
\`\`\`index.html
NOT \`\`\`html

Example response format:

\`\`\`index.html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello!</h1>
    <script src="script.js"></script>
</body>
</html>
\`\`\`

\`\`\`style.css
body {
    font-family: sans-serif;
}
\`\`\`

\`\`\`script.js
console.log("Hello from script!");
\`\`\`

<task_summary>
A short, high-level summary of what was created or changed.
</task_summary>
`;

const MODIFICATION_SYSTEM_PROMPT = `You are an expert web developer AI assistant. Your task is to modify an existing website based on a user's request.
The user will provide you with the current code for all project files, followed by their instructions for changes.
You must analyze the existing code and the user's request, then generate the updated code for any files that need to be changed. You can also create new files or delete existing ones.

IMPORTANT: Always use the complete filename with extension in the code fence, for example:
\`\`\`style.css
NOT \`\`\`css

- **To update a file:** Provide the *complete, updated code* for the file in a markdown code block with the FULL FILENAME.
- **To create a new file:** Provide the code for the new file in a markdown code block with the FULL new filename (including extension).
- **To delete a file:** Provide a code block with the full filename and the keyword "DELETE_FILE" inside. For example: \`\`\`obsolete.js
DELETE_FILE
\`\`\`
- **To rename a file:** This is a two-step process. First, create the new file with the content. Second, delete the old file.
- If a file does not need to be changed, do not include it in your response.

After providing the code, you MUST provide a task summary in the specified format.
Do not add any explanations, introductions, or conclusions outside of the code blocks and summary.

Example of changing CSS and deleting a script:

\`\`\`style.css
body {
    font-family: sans-serif;
    background-color: #f0f0f0; /* New background color */
}
\`\`\`

\`\`\`old-script.js
DELETE_FILE
\`\`\`

<task_summary>
Updated the background color and removed an old script file.
</task_summary>
`;

function parseAndApplyCode(response) {
    const codeBlocks = response.matchAll(/```(\S*)\n([\s\S]*?)```/g);
    let updated = false;
    const deletedFiles = new Set();
    const addedFiles = new Set();

    for (const match of codeBlocks) {
        let fileName = match[1] || '';
        let content = match[2]?.trim() || '';

        // Skip if no filename is provided
        if (!fileName) continue;

        // Extract just the filename if it has filepath= prefix or instruction
        const filePathMatch = fileName.match(/filepath=([^\s]+)/);
        if (filePathMatch) {
            fileName = filePathMatch[1];
        } else {
            // If it's just a language (no dot in the name), skip it as it's not a file
            if (!fileName.includes('.') && !fileName.includes('/')) {
                continue;
            }
            // Take only the first word before any space (removes instruction, etc.)
            fileName = fileName.split(/\s+/)[0];
        }

        if (fileName) {
            if (content.trim() === 'DELETE_FILE') {
                if (files[fileName]) {
                    delete files[fileName];
                    deletedFiles.add(fileName);
                    updated = true;
                }
            } else {
                if (!files[fileName]) {
                    files[fileName] = { name: fileName, content };
                    addedFiles.add(fileName);
                } else {
                    files[fileName].content = content;
                }
                updated = true;
            }
        }
    }

    if (updated) {
        if (deletedFiles.size > 0) {
            if (deletedFiles.has(state.currentFile)) {
                const remainingFiles = Object.keys(files);
                const newFileToOpen = remainingFiles.length > 0 ? remainingFiles[0] : null;
                if (!newFileToOpen) {
                    files['index.html'] = { name: 'index.html', content: ''};
                    state.currentFile = 'index.html';
                } else {
                    state.currentFile = newFileToOpen;
                }
            }
        }

        updatePreview();
        const editorPanel = document.getElementById('editor-panel');
        if (!editorPanel.classList.contains('hidden') && state.codeMirrorEditor) {
            loadFile(state.currentFile, true);
        }
    }
    return updated;
}

export async function generateCode(prompt) {
    const aiMessageContent = addMessage('', 'ai');
    let fullResponse = '';
    let codeBlockElements = [];

    const isInitialGeneration = Object.values(files).every(file => !file.content.trim());
    const systemPrompt = isInitialGeneration ? CREATION_SYSTEM_PROMPT : MODIFICATION_SYSTEM_PROMPT;
    
    let userMessageContent = prompt;
    if (!isInitialGeneration) {
        let existingCode = "Here is the current code for the project:\n\n";
        for (const fileName in files) {
            const file = files[fileName];
            const lang = fileName.split('.').pop() || '';
            existingCode += `**${fileName}**\n\`\`\`${lang}\n${file.content}\n\`\`\`\n\n`;
        }

        userMessageContent = `${existingCode}Now, please apply the following change: ${prompt}`;
    }

    const aiModel = state.selectedModel?.id || 'minimax/minimax-m2:free';

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: aiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessageContent }
            ],
            referer: location.href, // Pass client referer to backend
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last, possibly incomplete, line

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const content = line.substring(6);
                if (content === '[DONE]') {
                    break;
                }
                try {
                    const json = JSON.parse(content);
                    const token = json.choices[0]?.delta?.content;
                    if (token) {
                        fullResponse += token;
                        // Use the new renderer
                        codeBlockElements = renderAICodeMessage(fullResponse, aiMessageContent);
                        aiMessageContent.closest('.message-container').scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                } catch (error) {
                    console.error('Error parsing stream chunk:', error);
                }
            }
        }
    }
    
    // Final rendering after stream is complete
    codeBlockElements = renderAICodeMessage(fullResponse, aiMessageContent);

    if (fullResponse) {
        const taskSummaryMatch = fullResponse.match(/<task_summary>([\s\S]*?)<\/task_summary>/);
        let codePart = fullResponse;
        let summaryPart = '';

        if (taskSummaryMatch) {
            codePart = fullResponse.replace(taskSummaryMatch[0], '').trim();
            summaryPart = taskSummaryMatch[1].trim();

            const summaryEl = document.createElement('div');
            summaryEl.innerHTML = `<div class="task-summary mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p class="font-semibold text-blue-800">Task Summary</p>
                <p class="text-blue-700">${summaryPart}</p>
            </div>`;
            aiMessageContent.appendChild(summaryEl);
        }
        
        const updated = parseAndApplyCode(codePart);
        if (updated) {
            addVersion({ 
                prompt, 
                summary: summaryPart,
                model: aiModel 
            });
            // Update status icons to success
            codeBlockElements.forEach(el => {
                const statusIcon = el.querySelector('.status-icon');
                if (statusIcon) {
                    statusIcon.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4 text-green-600"></i>`;
                }
            });
            lucide.createIcons();
        } else {
            // If no files were updated, maybe they weren't found in the response. Mark as failed.
            codeBlockElements.forEach(el => {
                const statusIcon = el.querySelector('.status-icon');
                if (statusIcon) {
                    statusIcon.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-red-600" title="Code not applied. The AI did not provide a valid filename for this block (e.g., 'index.html')."></i>`;
                }
            });
            lucide.createIcons();
        }
    } else {
        throw new Error("Received an empty response from the AI.");
    }
}
