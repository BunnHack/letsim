import { getElement } from '../utils.js';
import { files } from '../state.js';

const attachmentBtn = getElement('attachmentBtn');
const fileInput = getElement('fileInput');
const attachmentPreviewContainer = getElement('attachmentPreviewContainer');

export let attachedFiles = [];

export async function addUploadedFilesToProject(uploadedFiles) {
    const fileReadPromises = Array.from(uploadedFiles).map(file => {
        return new Promise((resolve, reject) => {
            // We only handle text-based files for now to avoid corrupting binary files
            if (file.type.startsWith('text/') || file.type === 'application/javascript' || file.type === 'application/json' || !file.type) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!files[file.name]) {
                        files[file.name] = { name: file.name, content: event.target.result, isBinary: false };
                    }
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsText(file);
            } else {
                // For non-text files, read as Data URL to be used in the preview
                const reader = new FileReader();
                reader.onload = (event) => {
                     if (!files[file.name]) {
                        files[file.name] = { 
                            name: file.name, 
                            content: `[Binary file: ${file.type}]`, // This content is for the AI's context
                            isBinary: true,
                            dataURL: event.target.result
                        };
                    }
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
        });
    });

    try {
        await Promise.all(fileReadPromises);
    } catch (error) {
        console.error("Error reading uploaded files:", error);
        alert("There was an error reading one or more files.");
    }
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
        // images
        'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'gif': 'image', 'svg': 'image', 'webp': 'image',
        // documents
        'pdf': 'file-text', 'doc': 'file-text', 'docx': 'file-text', 'txt': 'file-text', 'md': 'file-text',
        // spreadsheets
        'xls': 'file-spreadsheet', 'xlsx': 'file-spreadsheet', 'csv': 'file-spreadsheet',
        // presentations
        'ppt': 'file-slideshow', 'pptx': 'file-slideshow',
        // code
        'html': 'code', 'css': 'code', 'js': 'code', 'json': 'braces', 'py': 'code-2',
        // archives
        'zip': 'file-archive', 'rar': 'file-archive', '7z': 'file-archive',
        // audio/video
        'mp3': 'audio-lines', 'wav': 'audio-lines', 'mp4': 'video', 'mov': 'video',
    };
    return iconMap[extension] || 'file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function renderAttachmentPreviews() {
    if (attachedFiles.length > 0) {
        attachmentPreviewContainer.classList.remove('hidden');
        attachmentPreviewContainer.classList.add('flex');
    } else {
        attachmentPreviewContainer.classList.add('hidden');
        attachmentPreviewContainer.classList.remove('flex');
    }

    attachmentPreviewContainer.innerHTML = '';
    attachedFiles.forEach((file, index) => {
        const fileCard = document.createElement('div');
        fileCard.className = 'bg-gray-100 rounded-lg p-2 flex items-center gap-2 text-sm max-w-[200px] relative group';

        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex-grow overflow-hidden';
        
        const fileName = document.createElement('div');
        fileName.className = 'font-medium text-gray-800 truncate';
        fileName.textContent = file.name;
        fileName.title = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'text-xs text-gray-500';
        fileSize.textContent = formatFileSize(file.size);

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 hover:bg-opacity-75 z-10';
        removeBtn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            attachedFiles.splice(index, 1);
            renderAttachmentPreviews();
        };

        if (file.type.startsWith('image/')) {
            const imgPreviewContainer = document.createElement('div');
            imgPreviewContainer.className = 'w-10 h-10 rounded-md bg-gray-200 flex-shrink-0';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                img.className = 'w-full h-full object-cover rounded-md';
                imgPreviewContainer.innerHTML = '';
                imgPreviewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
            
            fileCard.appendChild(imgPreviewContainer);
        } else {
            const icon = document.createElement('i');
            icon.dataset.lucide = getFileIcon(file.name);
            icon.className = 'w-5 h-5 text-gray-500 flex-shrink-0';
            fileCard.appendChild(icon);
        }
        
        fileCard.appendChild(fileInfo);
        fileCard.appendChild(removeBtn);
        attachmentPreviewContainer.appendChild(fileCard);
    });
    lucide.createIcons();
}

export function setupAttachments() {
    attachmentBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
        const newFiles = Array.from(fileInput.files);
        if (newFiles.length === 0) return;

        await addUploadedFilesToProject(newFiles);
        
        for (const file of newFiles) {
            if (!attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
                attachedFiles.push(file);
            }
        }
        renderAttachmentPreviews();
        fileInput.value = ''; // Reset file input
    });
}

export function clearAttachments() {
    attachedFiles = [];
    renderAttachmentPreviews();
}
