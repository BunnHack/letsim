// Type assertion for querySelector and getElementById
export function getElement(selector) {
    const element = document.querySelector(selector) || document.getElementById(selector);
    if (!element) {
        throw new Error(`Element with selector "${selector}" not found.`);
    }
    return element;
}

// Load HTML component
export async function loadComponent(path, targetSelector) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${path}`);
        }
        const html = await response.text();
        const target = document.querySelector(targetSelector);
        if (target) {
            target.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component from ${path}:`, error);
    }
}

