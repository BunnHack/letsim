export const files = {};

export let state = {
    currentFile: null,
    codeMirrorEditor: null,
    versionHistory: [],
    currentVersion: -1, // -1 means the live version, not a historical one
    models: [],
    selectedModel: null,
};

function calculateTotalTokens(filesObject) {
    return Object.values(filesObject).reduce((acc, file) => {
        const content = file.content || '';
        // Count characters divided by 4 as a better approximation for tokens
        const tokens = Math.ceil(content.length / 4);
        return acc + tokens;
    }, 0);
}

export function addVersion(versionData) {
    // Deep copy of files
    const filesSnapshot = JSON.parse(JSON.stringify(files));

    const newTokens = calculateTotalTokens(filesSnapshot);
    const lastVersion = state.versionHistory.length > 0 ? state.versionHistory[state.versionHistory.length - 1] : null;
    const oldTokens = lastVersion ? lastVersion.tokens : 0;

    state.versionHistory.push({
        files: filesSnapshot,
        tokens: newTokens,
        tokenDiff: newTokens - oldTokens,
        ...versionData,
    });
    // The current version is now the latest in history
    state.currentVersion = state.versionHistory.length - 1;
}

export function restoreVersion(index) {
    if (index < 0 || index >= state.versionHistory.length) return;

    const version = state.versionHistory[index];
    // Deep copy back to the main files object
    const filesSnapshot = JSON.parse(JSON.stringify(version.files));
    
    const currentFileNames = Object.keys(files);
    const snapshotFileNames = Object.keys(filesSnapshot);

    // Files to delete
    currentFileNames.forEach(fileName => {
        if (!snapshotFileNames.includes(fileName)) {
            delete files[fileName];
        }
    });

    // Files to add or update
    snapshotFileNames.forEach(fileName => {
        files[fileName] = filesSnapshot[fileName];
    });

    state.currentVersion = index;
}

export function setCurrentFile(fileName) {
    state.currentFile = fileName;
}

export function setCodeMirrorEditor(editor) {
    state.codeMirrorEditor = editor;
}