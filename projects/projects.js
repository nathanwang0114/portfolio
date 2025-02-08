import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
}

let selectedIndex = -1;
let query = '';
let arcData = []; 

function applyFilters() {
    let filteredProjects = projects;

    if (query) {
        filteredProjects = projects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            return values.includes(query.toLowerCase());
          });
    }

    if (selectedIndex !== -1 && arcData.length > 0) {
        let selectedYear = arcData[selectedIndex].data.label;
        filteredProjects = filteredProjects.filter(project => project.year === selectedYear);
    }

    renderProjects(filteredProjects, projectsContainer, "h2");
}

function renderPieChart(projectsGiven) {
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    let newData = newRolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    let colors = d3.scaleOrdinal(d3.schemePaired);

    let sliceGenerator = d3.pie().value((d) => d.value);
    arcData = sliceGenerator(newData); // Store arcData globally
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

    let svg = d3.select("#projects-pie-plot");
    svg.selectAll("path").remove();

    arcData.forEach((arc, i) => {
        svg.append("path")
            .attr("d", arcGenerator(arc))
            .attr("fill", colors(i))
            .style("cursor", "pointer")
            .on("click", () => {
                selectedIndex = selectedIndex === i ? -1 : i;

                svg.selectAll("path")
                    .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));

                legend.selectAll("li")
                    .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));

                applyFilters(); // Apply both filters together
            });
    });

    let legend = d3.select(".legend");
    legend.selectAll("li").remove();

    newData.forEach((data, i) => {
        legend.append("li")
            .html(`<span class="swatch" style="background-color:${colors(i)}"></span> ${data.label} <em>(${data.value})</em>`)
            .style("cursor", "pointer")
            .on("click", () => {
                selectedIndex = selectedIndex === i ? -1 : i;
    
                svg.selectAll("path")
                    .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));
    
                legend.selectAll("li")
                    .attr("class", (_, idx) => (idx === selectedIndex ? "selected" : ""));
    
                applyFilters();
            });
    });
}

renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    applyFilters();
});