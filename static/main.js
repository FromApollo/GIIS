const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 20;
let points = [];
let stepIndex = 0;
let start = null;
let end = null;

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

canvas.onclick = e => {
    const x = Math.floor(e.offsetX / scale);
    const y = Math.floor(e.offsetY / scale);

    if (!start) start = {x, y};
    else {
        end = {x, y};
        drawLine();
    }
};

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ddd";

    for (let x = 0; x < canvas.width; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawPixel(x, y, intensity = 1) {
    ctx.fillStyle = `rgba(0,0,0,${intensity})`;
    ctx.fillRect(x * scale, y * scale, scale, scale);
}

function drawLine() {
    fetch("/draw", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            x1: start.x,
            y1: start.y,
            x2: end.x,
            y2: end.y,
            algorithm: document.getElementById("algorithm").value
        })
    })
    .then(r => r.json())
    .then(data => {
        points = data.points;
        buildTable(data.table);
        stepIndex = 0;
        redraw();
    });
}

function step() {
    if (stepIndex >= points.length) return;

    const p = points[stepIndex];
    if (p.length === 3)
        drawPixel(p[0], p[1], p[2]);
    else
        drawPixel(p[0], p[1]);

    stepIndex++;
}

function redraw() {
    drawGrid();
    for (let i = 0; i < stepIndex; i++) {
        const p = points[i];
        drawPixel(p[0], p[1], p[2] || 1);
    }
}

function reset() {
    start = null;
    end = null;
    points = [];
    stepIndex = 0;
    drawGrid();
    document.getElementById("table").innerHTML = "";
}

function buildTable(rows) {
    const table = document.getElementById("table");
    table.innerHTML = "";

    if (!rows.length) return;

    const header = Object.keys(rows[0]);
    table.innerHTML += "<tr>" + header.map(h => `<th>${h}</th>`).join("") + "</tr>";

    rows.forEach(r => {
        table.innerHTML += "<tr>" +
            header.map(h => `<td>${r[h]}</td>`).join("") +
            "</tr>";
    });
}

drawGrid();
