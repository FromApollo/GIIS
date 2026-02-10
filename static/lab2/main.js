const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 20;
let points = [];
let stepIndex = 0;
let center = null;           // {x, y} — центр фигуры

// Переменные для параметров
let curveType = "circle";
let params = {};

// Смена типа кривой → показываем нужные поля
document.getElementById("curve-type").onchange = function () {
    curveType = this.value;
    updateParamVisibility();
};

function updateParamVisibility() {
    document.querySelectorAll(".param-group").forEach(el => el.style.display = "none");

    if (curveType === "circle") {
        document.getElementById("params-circle").style.display = "inline-block";
    } else if (curveType === "ellipse") {
        document.getElementById("params-ellipse").style.display = "inline-block";
    } else if (curveType === "parabola") {
        document.getElementById("params-parabola").style.display = "inline-block";
    } else if (curveType === "hyperbola") {
        document.getElementById("params-hyperbola").style.display = "inline-block";
    }
}

// Инициализация
updateParamVisibility();

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

canvas.onclick = e => {
    const x = Math.floor(e.offsetX / scale);
    const y = Math.floor(e.offsetY / scale);

    center = { x, y };
    drawCurve();
    redraw();
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

    // Оси координат (через центр)
    if (center) {
        const cx = center.x * scale + scale / 2;
        const cy = center.y * scale + scale / 2;
        ctx.strokeStyle = "rgba(200, 0, 0, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(canvas.width, cy);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, canvas.height);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ddd";
    }
}

function drawPixel(x, y, intensity = 1) {
    ctx.fillStyle = `rgba(0,0,0,${intensity})`;
    ctx.fillRect(x * scale, y * scale, scale, scale);
}

function drawPointMarker(point, color) {
    if (!point) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        point.x * scale + scale / 2,
        point.y * scale + scale / 2,
        scale / 4,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function drawCurve() {
    if (!center) return;

    const cx = center.x;
    const cy = center.y;

    let body = {
        type: curveType,
        cx: cx,
        cy: cy
    };

    if (curveType === "circle") {
        body.r = Number(document.getElementById("r").value) || 10;
    } else if (curveType === "ellipse") {
        body.a = Number(document.getElementById("a").value) || 15;
        body.b = Number(document.getElementById("b").value) || 10;
    } else if (curveType === "parabola") {
        body.p = Number(document.getElementById("p").value) || 5;
    } else if (curveType === "hyperbola") {
        body.a = Number(document.getElementById("ha").value) || 6;
        body.b = Number(document.getElementById("hb").value) || 4;
    }

    fetch("/lab2/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        points = data.points;
        buildTable(data.table);
        stepIndex = 0;
        redraw();
    })
    .catch(err => console.error(err));
}

function drawAll() {
    if (!points.length) return;
    stepIndex = points.length;
    redraw();
}

function step() {
    if (stepIndex >= points.length) return;
    const p = points[stepIndex];
    drawPixel(p[0], p[1]);
    stepIndex++;
}

function redraw() {
    drawGrid();

    for (let i = 0; i < stepIndex; i++) {
        const p = points[i];
        drawPixel(p[0], p[1]);
    }

    drawPointMarker(center, "green");
}

function reset() {
    center = null;
    points = [];
    stepIndex = 0;
    drawGrid();
    document.getElementById("table").innerHTML = "";
}

function buildTable(rows) {
    const table = document.getElementById("table");
    table.innerHTML = "";

    if (!rows || rows.length === 0) return;

    const header = Object.keys(rows[0]);
    let html = "<tr>" + header.map(h => `<th>${h}</th>`).join("") + "</tr>";

    rows.forEach(r => {
        html += "<tr>" +
            header.map(h => `<td>${r[h] !== undefined ? r[h] : ""}</td>`).join("") +
            "</tr>";
    });

    table.innerHTML = html;
}

drawGrid();