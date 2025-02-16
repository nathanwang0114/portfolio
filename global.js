console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    // add the rest of your pages here
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/nathanwang0114', title: 'Github' },
    { url: 'resume/', title: 'Resume' },
    { url: 'meta/', title: 'Meta' }
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );
    a.toggleAttribute(
        "target",
        a.host !== location.host
    );
    if (a.hasAttribute("target")) {
        a.setAttribute("target", "_blank");
    }
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
        Theme:
        <select>
            <option id="automatic-option" value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>`
);

const select = document.querySelector(".color-scheme");
const automaticOption = document.querySelector("#automatic-option");

const updateAutomaticLabel = () => {
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    automaticOption.textContent = isDarkMode ? "Automatic (Dark)" : "Automatic (Light)";
};

updateAutomaticLabel();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateAutomaticLabel);

const setColorScheme = (colorScheme) => {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
}

select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    setColorScheme(event.target.value);
    localStorage.colorScheme = event.target.value;
});

if (localStorage.colorScheme) {
    setColorScheme(localStorage.colorScheme);
    const select = document.querySelector(".color-scheme select");
    select.value = localStorage.colorScheme;
};

const form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(form)
    const params = [];
    for (let [name, value] of data) {
        params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    }
    const mailto = `${form.action}?${params.join("&")}`;
    location.href = mailto;
});

export async function fetchJSON(url) {
    try {
        // Fetch the JSON file from the given URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        console.log('Fetch Response:', response);
        const data = await response.json();
        console.log('Fetched Data:', data);
        return data; 

    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = '';
    const titleElement = document.querySelector('.projects-title');
    if (titleElement) {
        titleElement.textContent = `${projects.length} Projects`;
    }

    projects.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <div class="project-info">
                <p class="project-year">${project.year}</p>
                <p>${project.description}</p>
            </div>
        `;

        containerElement.appendChild(article);
    });
}


export async function fetchGitHubData(username) {
    // return statement here
    return fetchJSON(`https://api.github.com/users/${username}`);
}