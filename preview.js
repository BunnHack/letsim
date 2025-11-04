import { getElement } from '../utils.js';
import { files } from '../state.js';
import { setLastError, clearLastError } from './chat.js';

const previewFrame = getElement('previewFrame');
const errorIcon = getElement('errorIcon');
const previewLoadingOverlay = getElement('previewLoadingOverlay');

let parentMessageListenerAttached = false;
let loadingTimeout = null;

function hideLoadingOverlay() {
    previewLoadingOverlay.classList.add('hidden');
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
}

function handleError(error) {
    console.error("Error in preview iframe:", error);
    const errorDetails = {
        message: error.message || (error.error && error.error.message) || 'Unknown error',
        filename: error.filename || '',
        lineno: error.lineno || 0,
        colno: error.colno || 0,
    };
    setLastError(errorDetails);
    errorIcon.title = `Error: ${errorDetails.message}`;
    errorIcon.classList.remove('hidden');
    lucide.createIcons();
}

function handleConsoleError(message, source, lineno, colno, error) {
    const errorDetails = {
        message: message || (error && error.message) || 'Unknown error',
        filename: source,
        lineno: lineno,
        colno: colno,
    };
    setLastError(errorDetails);
    errorIcon.title = `Error: ${errorDetails.message}`;
    errorIcon.classList.remove('hidden');
    lucide.createIcons();
}

function clearErrorState() {
    clearLastError();
    errorIcon.classList.add('hidden');
    errorIcon.title = 'An error was detected in the preview console.';
}

export function getPreviewContent() {
    const htmlFile = files['index.html'];
    if (!htmlFile) {
        return `<html><head></head><body><p>No index.html file found.</p></body></html>`;
    }
    const htmlContent = htmlFile.content || '';

    let fullHtml = htmlContent;

    // Find all CSS and JS files in the project
    const cssFiles = Object.values(files).filter(f => f.name.endsWith('.css'));
    const jsFiles = Object.values(files).filter(f => f.name.endsWith('.js'));
    const binaryFiles = Object.values(files).filter(f => f.isBinary && f.dataURL);

    let cssLinks = '';
    let jsScripts = '';

    const injectedScript = `
        <script>
            window.addEventListener('error', function(event) {
                event.preventDefault(); // Stop it from showing in the main console
                const errorData = {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                };
                window.parent.postMessage({ type: 'preview_error', error: errorData }, '*');
            }, true); // Use capture to catch all errors

            window.addEventListener('unhandledrejection', function(event) {
                event.preventDefault();
                const reason = event.reason || {};
                const errorData = {
                    message: reason.message || 'Unhandled promise rejection',
                    filename: '',
                    lineno: 0,
                    colno: 0,
                };
                window.parent.postMessage({ type: 'preview_error', error: errorData }, '*');
            });

            window.addEventListener('load', function() {
                window.parent.postMessage({ type: 'preview_loaded' }, '*');
            });
        </script>
    `;

    cssFiles.forEach(file => {
        const linkRegex = new RegExp(`<link[^>]*href\\s*=\\s*['"](?:\\.\\/)?${file.name}['"][^>]*>`, 'gi');
        if (linkRegex.test(fullHtml)) {
            fullHtml = fullHtml.replace(linkRegex, `<style data-filename="${file.name}">${file.content}</style>`);
        } else {
            cssLinks += `<style data-filename="${file.name}">${file.content}</style>`;
        }
    });

    jsFiles.forEach(file => {
        const scriptRegex = new RegExp(`<script[^>]*src\\s*=\\s*['"](?:\\.\\/)?${file.name}['"][^>]*><\\/script>`, 'gi');
        if (scriptRegex.test(fullHtml)) {
            fullHtml = fullHtml.replace(scriptRegex, `<script data-filename="${file.name}">${file.content}<\/script>`);
        } else {
            jsScripts += `<script data-filename="${file.name}">${file.content}<\/script>`;
        }
    });
    
    // Replace binary file references with data URLs
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    
    binaryFiles.forEach(file => {
        // Simple string replacement for attributes might be safer if DOM parsing re-formats things undesirably
        const fileName = file.name;
        const dataURL = file.dataURL;
        
        // Use regex to replace src attributes to avoid issues with DOM parsing special cases
        // This looks for src="filename", src='filename', src=`filename`
        const srcRegex = new RegExp(`src\\s*=\\s*['"\`]((?:\\.\\/)?${fileName})['"\`]`, 'gi');
        fullHtml = fullHtml.replace(srcRegex, `src="${dataURL}"`);
    });


    // Check if it's an HTML fragment or a full document
    if (!htmlContent.trim().match(/<html/i)) {
        // It's a fragment, so wrap it.
        fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                ${injectedScript}
                ${cssLinks}
            </head>
            <body>
                ${htmlContent}
                ${jsScripts}
            </body>
            </html>
        `;
    } else {
        // It's a full document, inject if not already replaced
        if (!fullHtml.match(/<head/i)) {
            // No head tag, insert one before body.
            fullHtml = fullHtml.replace(/<body/i, `<head>${injectedScript}</head><body`);
        } else {
             // Inject script at the beginning of the head tag
             fullHtml = fullHtml.replace(/<head[^>]*>/i, `$&${injectedScript}`);
        }

        if (cssLinks) {
            fullHtml = fullHtml.replace('</head>', `${cssLinks}</head>`);
        }
        if (jsScripts) {
            fullHtml = fullHtml.replace('</body>', `${jsScripts}</body>`);
        }
    }

    return fullHtml;
}

export function updatePreview() {
    clearErrorState();
    previewLoadingOverlay.classList.remove('hidden');

    if (loadingTimeout) clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(hideLoadingOverlay, 5000); // Failsafe timeout
    
    if (!parentMessageListenerAttached) {
        window.addEventListener('message', (event) => {
            if (event.source === previewFrame.contentWindow && event.data) {
                if (event.data.type === 'preview_error') {
                    hideLoadingOverlay();
                    handleError(event.data.error);
                }
                if (event.data.type === 'preview_loaded') {
                    hideLoadingOverlay();
                    // Force a resize event inside the iframe. This helps libraries like Three.js
                    // that depend on window dimensions to correctly initialize their canvas size,
                    // especially in a dynamic layout where the iframe size might settle after the initial load.
                    if (previewFrame.contentWindow) {
                        previewFrame.contentWindow.dispatchEvent(new Event('resize'));
                    }
                }
            }
        });
        parentMessageListenerAttached = true;
    }

    const fullHtml = getPreviewContent();
    previewFrame.srcdoc = fullHtml;
}