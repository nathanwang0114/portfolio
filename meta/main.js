let data = [];
let commits = [];
let xScale, yScale;  
let brushSelection = null;  

async function loadData() {
    try {
        // 1) Load CSV data
        data = await d3.csv("loc.csv");
        console.log("CSV Data Loaded:", data);
        commits = processCommits(); 
        displayStats();
        createScatterPlot();
    } catch (error) {
        console.error("Error loading CSV:", error);
    }
}

function processCommits() {
    return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        return {
            id: commit,
            author,
            date,
            time,
            timezone,
            datetime: new Date(datetime),
            totalLines: lines.length,
            lines: lines, // IMPORTANT: store all line objects for breakdown
            url: `https://github.com/user/repo/commit/${commit}`
        };
    });
}

function displayStats() {
    let totalCommits = commits.length;
    let totalFiles = d3.rollup(data, v => v.length, d => d.file).size;
    let totalLOC = data.length;
    let maxDepth = d3.max(data, d => (d.depth ? d.depth.length : 0)) || 0;
    
    const fileLengths = d3.rollups(
        data,
        v => d3.max(v, v => v.line),
        d => d.file
    );
    
    let averageFileLength = d3.mean(fileLengths, d => d[1]);
    let maxLines = d3.max(d3.rollup(data, v => v.length, d => d.filename).values()) || 0;

    let statsContainer = d3.select("#stats");
    statsContainer.html("");

    const summaryBox = statsContainer.append("div").attr("class", "summary-box");
    summaryBox.append("h2").text("Summary");

    const dl = summaryBox.append("dl").attr("class", "stats");

    const summaryData = [
        { label: "COMMITS", value: totalCommits },
        { label: "FILES", value: totalFiles },
        { label: "TOTAL LOC", value: totalLOC },
        { label: "MAX DEPTH", value: maxDepth },
        { label: "AVERAGE FILE LENGTH", value: averageFileLength },
        { label: "MAX LINES", value: maxLines }
    ];

    summaryData.forEach(stat => {
        dl.append("dt").text(stat.label);
        dl.append("dd").text(stat.value);
    });
}

document.addEventListener("DOMContentLoaded", loadData);

function createScatterPlot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    if (!data || data.length === 0 || !commits || commits.length === 0) {
        console.error("No data or no commits available!");
        return;
    }

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // ---------------------
    //      SCALES
    // ---------------------
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    // Sort so largest dots go behind smaller ones
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Create the SVG
    const svg = d3
        .select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // Gridlines
    svg.append("g")
        .attr("class", "gridlines")
        .attr("transform", `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

    // Dots
    svg.append("g")
        .attr("class", "dots")
        .selectAll("circle")
        .data(sortedCommits)
        .join("circle")
        .attr("cx", (d) => xScale(d.datetime))
        .attr("cy", (d) => yScale(d.datetime.getHours() + d.datetime.getMinutes() / 60))
        .attr("r", (d) => rScale(d.totalLines))
        .attr("fill", "steelblue")
        .style("fill-opacity", 0.7)
        .on("mouseenter", function (event, d) {
            d3.select(event.currentTarget).style("fill-opacity", 1);
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mousemove", updateTooltipPosition)
        .on("mouseleave", function (event) {
            d3.select(event.currentTarget).style("fill-opacity", 0.7);
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });

    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

    svg.append("g")
        .attr("transform", `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append("g")
        .attr("transform", `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Brush logic
    brushSelector(svg);
}

// ---------------------
//    Tooltip Functions
// ---------------------
function updateTooltipContent(commit) {
    document.getElementById("commit-link").href = commit.url;
    document.getElementById("commit-link").textContent = commit.id;
    document.getElementById("commit-date").textContent =
        commit.datetime?.toLocaleDateString("en", { dateStyle: "full" });
    document.getElementById("commit-time").textContent = commit.time;
    document.getElementById("commit-author").textContent = commit.author;
    document.getElementById("commit-lines").textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById("commit-tooltip");
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById("commit-tooltip");
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}

// ---------------------
//      Brush Logic
// ---------------------
function brushSelector(svg) {
    const brush = d3.brush()
        .on("start brush end", brushed);

    svg.call(brush);

    // Bring dots above the brush rectangle
    svg.selectAll(".dots, .overlay ~ *").raise();
}

function brushed(event) {
    console.log("Brush event:", event);
    brushSelection = event.selection; // Store selection
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown(); // NEW: Step 5.6
}

// ---------------------
//   Selection Logic
// ---------------------
function isCommitSelected(commit) {
    if (!brushSelection) return false;

    // Pixel bounds: [[x0, y0], [x1, y1]]
    const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
    const max = { x: brushSelection[1][0], y: brushSelection[1][1] };

    // Circle's pixel position
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.datetime.getHours() + commit.datetime.getMinutes() / 60);

    return cx >= min.x && cx <= max.x && cy >= min.y && cy <= max.y;
}

function updateSelection() {
    // Add/remove .selected class for each circle
    d3.selectAll("circle").classed("selected", (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const countElement = document.getElementById("selection-count");
    if (!countElement) return;

    // Filter using the same set of commit objects
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];

    countElement.textContent = `${
        selectedCommits.length || "No"
    } commits selected`;
}

// ---------------------
//   Language Breakdown
// ---------------------
function updateLanguageBreakdown() {
    const container = document.getElementById("language-breakdown");
    if (!container) return;

    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];

    if (selectedCommits.length === 0) {
        container.innerHTML = "";
        return;
    }

    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    // Update DOM with breakdown
    container.innerHTML = "";

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format(".1~%")(proportion);

        const languageBlock = `
            <dl>
                <dt>${language}</dt>
                <dd>${count} lines</dd>
                <dd>(${formatted})</dd>
            </dl>
        `;


        container.innerHTML += languageBlock;
    }
}
