import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');

renderProjects(projects, projectsContainer, 'h2');

if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
}

let selectedIndex = -1;

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
    let arcData = sliceGenerator(newData);
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
                    .attr("class", (d, idx) => (idx === selectedIndex ? "selected" : ""));

                legend.selectAll("li")
                    .attr("class", (d, idx) => (idx === selectedIndex ? "selected" : ""));

                if (selectedIndex === -1) {
                    renderProjects(projectsGiven, projectsContainer, "h2");
                } else {
                    let selectedYear = arcData[selectedIndex].data.label;
                    let filteredProjects = projectsGiven.filter(project => project.year === selectedYear);
                    renderProjects(filteredProjects, projectsContainer, "h2");
                }
            });
    });

    let legend = d3.select(".legend");
    legend.selectAll("li").remove();

    newData.forEach((data, i) => {
        legend.append("li")
            .attr("style", `--color:${colors(i)}`)
            .html(`<span class="swatch" style="background-color:${colors(i)}"></span> ${data.label} <em>(${data.value})</em>`)
            .style("cursor", "pointer")
            .on("click", () => {
                selectedIndex = selectedIndex === i ? -1 : i;

                svg.selectAll("path")
                    .attr("class", (d, idx) => (idx === selectedIndex ? "selected" : ""));

                legend.selectAll("li")
                    .attr("class", (d, idx) => (idx === selectedIndex ? "selected" : ""));

                if (selectedIndex === -1) {
                    renderProjects(projectsGiven, projectsContainer, "h2");
                } else {
                    let selectedYear = arcData[selectedIndex].data.label;
                    let filteredProjects = projectsGiven.filter(project => project.year === selectedYear);
                    renderProjects(filteredProjects, projectsContainer, "h2");
                }
            });
    });
}

renderPieChart(projects);

let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();

    let filteredProjects = projects.filter((project) => {
      let values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    });

    // Re-render filtered projects
    renderProjects(filteredProjects, projectsContainer, 'h2');

    // Update project count dynamically
    if (projectsTitle) {
        projectsTitle.textContent = `${filteredProjects.length} Projects`;
    }

    // Re-render pie chart based on filtered results
    renderPieChart(filteredProjects);
});