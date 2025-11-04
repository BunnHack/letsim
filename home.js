const myProjects = [
    {
        href: "editor.html",
        img: null,
        title: "Portfolio Website",
        description: "A personal portfolio to showcase my work.",
        user: {
            avatar: "https://i.pravatar.cc/24?u=my_user",
            name: "my_username",
        },
        stats: {
            time: "2d",
            likes: 56,
            views: "1.2k"
        }
    },
    {
        href: "editor.html",
        img: null,
        title: "E-commerce Store",
        description: "An online store for selling handmade goods.",
        user: {
            avatar: "https://i.pravatar.cc/24?u=my_user",
            name: "my_username",
        },
        stats: {
            time: "5d",
            likes: 102,
            views: "3.5k"
        }
    }
];

const communityProjects = [
    {
        href: "editor.html",
        img: null,
        title: "Interactive Data Visualization",
        description: "A D3.js project showcasing global climate data.",
        user: {
            avatar: "https://i.pravatar.cc/24?u=dataviz_guru",
            name: "@dataviz_guru",
        },
        stats: {
            time: "7d",
            likes: 245,
            views: "8.1k"
        }
    },
    {
        href: "editor.html",
        img: null,
        title: "Minimalist Weather App",
        description: "A clean weather app using a public API.",
        user: {
            avatar: "https://i.pravatar.cc/24?u=jane_codes",
            name: "@jane_codes",
        },
        stats: {
            time: "11d",
            likes: 412,
            views: "12.4k"
        }
    },
    {
        href: "editor.html",
        img: null,
        title: "Retro Platformer Game",
        description: "A simple game built with pure JavaScript.",
        user: {
            avatar: "https://i.pravatar.cc/24?u=game_dev_dave",
            name: "@game_dev_dave",
        },
        stats: {
            time: "15d",
            likes: 890,
            views: "25.7k"
        }
    }
];

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = "relative group rounded-lg border bg-white shadow-sm hover:shadow-md transition-all";

    const imagePlaceholder = project.img ? `<img src="${project.img}" class="w-full h-full object-cover rounded-t-lg">` : `<i data-lucide="image" class="w-12 h-12 text-gray-400"></i>`;

    card.innerHTML = `
        <a href="${project.href}" class="block">
            <div class="h-40 bg-gray-200 rounded-t-lg flex items-center justify-center">
                ${imagePlaceholder}
            </div>
            <div class="p-4">
                <h3 class="text-lg font-semibold text-gray-900">${project.title}</h3>
                <p class="mt-1 text-sm text-gray-500">${project.description}</p>
            </div>
        </a>
        <div class="p-4 border-t border-gray-100 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <img class="w-6 h-6 rounded-full" src="${project.user.avatar}" alt="User avatar">
                <span class="text-xs font-medium">${project.user.name}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
                <span>${project.stats.time}</span>
                <div class="flex items-center gap-1">
                    <i data-lucide="heart" class="w-3.5 h-3.5"></i>
                    <span>${project.stats.likes}</span>
                </div>
                <div class="flex items-center gap-1">
                    <i data-lucide="play-circle" class="w-3.5 h-3.5"></i>
                    <span>${project.stats.views}</span>
                </div>
            </div>
        </div>
    `;
    return card;
}

function populateProjects() {
    const myProjectsContainer = document.getElementById('my-projects-grid');
    if(myProjectsContainer) {
        myProjects.forEach(p => myProjectsContainer.appendChild(createProjectCard(p)));
    }

    const communityProjectsContainer = document.getElementById('community-projects-grid');
    if(communityProjectsContainer) {
        communityProjects.forEach(p => communityProjectsContainer.appendChild(createProjectCard(p)));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // Dropdown functionality
    const sortMenuButton = document.getElementById('sort-menu-button');
    const sortMenu = document.getElementById('sort-menu');
    const sortMenuLabel = document.getElementById('sort-menu-label');
    const sortOptions = document.querySelectorAll('.sort-option');

    if (sortMenuButton && sortMenu) {
        sortMenuButton.addEventListener('click', () => {
            sortMenu.classList.toggle('hidden');
        });

        sortOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                if(sortMenuLabel) sortMenuLabel.textContent = e.target.dataset.value;
                sortMenu.classList.add('hidden');
            });
        });

        document.addEventListener('click', (e) => {
            if (!sortMenuButton.contains(e.target) && !sortMenu.contains(e.target)) {
                sortMenu.classList.add('hidden');
            }
        });
    }

    populateProjects();
    // After populating, we need to re-run createIcons for the new icons in cards
    lucide.createIcons();
});