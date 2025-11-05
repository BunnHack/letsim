let splitInstance = null;

export function setupSplitLayout() {
    // Ensure elements exist before proceeding
    const chatPanel = document.getElementById('chat-panel-container');
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    if (!chatPanel || !editorPanel || !previewPanel) {
        console.error("One or more panels for split layout not found.");
        return;
    }

    const elements = ['#chat-panel-container'];
    if (!previewPanel.classList.contains('hidden')) {
        elements.push('#preview-panel');
    } else if (!editorPanel.classList.contains('hidden')) {
        elements.push('#editor-panel');
    }

    if (splitInstance) {
        splitInstance.destroy();
        splitInstance = null;
    }

    if (elements.length > 1) {
        splitInstance = Split(elements, {
            sizes: [25, 75],
            minSize: [350, 400],
            gutterSize: 8,
            cursor: 'col-resize',
            direction: 'horizontal',
            gutter: (index, direction) => {
                const gutter = document.createElement('div');
                gutter.className = `gutter gutter-${direction} bg-gray-100`;
                return gutter;
            },
            elementStyle: (dimension, size, gutterSize) => ({
                'flex-basis': `calc(${size}% - ${gutterSize}px)`,
            }),
            gutterStyle: (dimension, gutterSize) => ({
                'flex-basis': `${gutterSize}px`,
            }),
        });
    }
}
