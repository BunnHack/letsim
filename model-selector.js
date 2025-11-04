import { getElement } from '../utils.js';
import { state } from '../state.js';

const modelSelector = getElement('modelSelector');
const modelSelectorBtn = getElement('modelSelectorBtn');
const modelSelectorDropdown = getElement('modelSelectorDropdown');
const selectedModelEl = getElement('selectedModel');

async function populateModels() {
    try {
        const response = await fetch('/models.json');
        if (!response.ok) throw new Error('Failed to load models.json');
        const models = await response.json();
        state.models = models;

        modelSelectorDropdown.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'py-1';

        models.forEach(model => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100';
            a.dataset.modelId = model.id;
            a.textContent = model.name;
            list.appendChild(a);

            if (model.default) {
                state.selectedModel = model;
            }
        });
        
        if (!state.selectedModel && models.length > 0) {
            state.selectedModel = models[0];
        }

        if(state.selectedModel) {
            selectedModelEl.textContent = state.selectedModel.name;
            const defaultLink = list.querySelector(`[data-model-id="${state.selectedModel.id}"]`);
            if (defaultLink) {
                defaultLink.classList.add('font-semibold', 'text-gray-900');
                defaultLink.classList.remove('text-gray-700');
            }
        }

        modelSelectorDropdown.appendChild(list);
    } catch (error) {
        console.error('Error populating models:', error);
        modelSelector.style.display = 'none';
    }
}

export function setupModelSelector() {
    populateModels();

    modelSelectorBtn.addEventListener('click', () => {
        modelSelectorDropdown.classList.toggle('hidden');
    });

    modelSelectorDropdown.addEventListener('click', (e) => {
        const target = e.target;
        const modelItem = target.closest('[data-model-id]');
        if (modelItem) {
            e.preventDefault();
            const modelId = modelItem.getAttribute('data-model-id');
            const model = state.models.find(m => m.id === modelId);
            if (model) {
                state.selectedModel = model;
                selectedModelEl.textContent = model.name;
                modelSelectorDropdown.querySelectorAll('a').forEach(a => {
                    a.classList.remove('font-semibold', 'text-gray-900');
                    a.classList.add('text-gray-700');
                });
                modelItem.classList.add('font-semibold', 'text-gray-900');
                modelItem.classList.remove('text-gray-700');
            }
            modelSelectorDropdown.classList.add('hidden');
        }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (e) => {
        if (!modelSelector.contains(e.target)) {
            modelSelectorDropdown.classList.add('hidden');
        }
    });
}