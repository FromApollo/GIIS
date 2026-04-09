const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 30;
let points = [];
let triangles = [];
let voronoiEdges = [];
let voronoiCenters = [];

let showDelaunay  = true;
let showVoronoi   = false;
let showCircles   = false;

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

canvas.onclick = e => {
    const x = Math.round(e.offsetX / scale);
    const y = Math.round(e.offsetY / scale);
    points.push([x, y]);
    triangles = []; voronoiEdges = []; voronoiCenters = [];
    redraw();
};

// ─── координатные хелперы ───────────────────
function cx(gx) { return gx * scale; }
function cy(gy) { return gy * scale; }

// ─── сетка ──────────────────────────────────
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += scale) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += scale) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    // оси
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, canvas.height); ctx.stroke();
}

// ─── точки ──────────────────────────────────
function drawPoints() {
    points.forEach((p, i) => {
        ctx.fillStyle = "#e63946";
        ctx.beginPath();
        ctx.arc(cx(p[0]), cy(p[1]), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#333";
        ctx.font = "11px sans-serif";
        ctx.fillText(`P${i}`, cx(p[0]) + 7, cy(p[1]) - 5);
    });
}

// ─── треугольники Делоне ────────────────────
function drawDelaunay() {
    if (!showDelaunay || !triangles.length) return;
    ctx.strokeStyle = "#457b9d";
    ctx.lineWidth = 1.5;
    triangles.forEach(tri => {
        ctx.beginPath();
        ctx.moveTo(cx(tri[0][0]), cy(tri[0][1]));
        ctx.lineTo(cx(tri[1][0]), cy(tri[1][1]));
        ctx.lineTo(cx(tri[2][0]), cy(tri[2][1]));
        ctx.closePath();
        ctx.fillStyle = "rgba(69,123,157,0.07)";
        ctx.fill();
        ctx.stroke();
    });
}

// ─── описанные окружности ───────────────────
function circumcircleOf(tri) {
    const [ax, ay] = tri[0];
    const [bx, by] = tri[1];
    const [cx_, cy_] = tri[2];
    const D = 2 * (ax * (by - cy_) + bx * (cy_ - ay) + cx_ * (ay - by));
    if (Math.abs(D) < 1e-10) return null;
    const ux = ((ax**2 + ay**2) * (by - cy_) +
                (bx**2 + by**2) * (cy_ - ay) +
                (cx_**2 + cy_**2) * (ay - by)) / D;
    const uy = ((ax**2 + ay**2) * (cx_ - bx) +
                (bx**2 + by**2) * (ax - cx_) +
                (cx_**2 + cy_**2) * (bx - ax)) / D;
    const r = Math.hypot(ax - ux, ay - uy);
    return {ux, uy, r};
}

function drawCircumcircles() {
    if (!showCircles || !triangles.length) return;
    ctx.strokeStyle = "rgba(180,0,180,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    triangles.forEach(tri => {
        const cc = circumcircleOf(tri);
        if (!cc) return;
        ctx.beginPath();
        ctx.arc(cx(cc.ux), cy(cc.uy), cc.r * scale, 0, Math.PI * 2);
        ctx.stroke();
        // центр
        ctx.fillStyle = "rgba(180,0,180,0.6)";
        ctx.beginPath();
        ctx.arc(cx(cc.ux), cy(cc.uy), 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.setLineDash([]);
}

// ─── рёбра Вороного ─────────────────────────
function drawVoronoi() {
    if (!showVoronoi || !voronoiEdges.length) return;
    ctx.strokeStyle = "#e76f51";
    ctx.lineWidth = 2;
    voronoiEdges.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(cx(e[0][0]), cy(e[0][1]));
        ctx.lineTo(cx(e[1][0]), cy(e[1][1]));
        ctx.stroke();
    });
    // центры (узлы Вороного)
    voronoiCenters.forEach(c => {
        ctx.fillStyle = "#e76f51";
        ctx.beginPath();
        ctx.arc(cx(c[0]), cy(c[1]), 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function redraw() {
    drawGrid();
    drawDelaunay();
    drawCircumcircles();
    drawVoronoi();
    drawPoints();
}

// ─── статус / результат / таблица ───────────
function setStatus(msg) { document.getElementById("status").textContent = msg; }
function setResult(msg) { document.getElementById("result").textContent = msg; }

function buildTable(rows) {
    const table = document.getElementById("table");
    table.innerHTML = "";
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]);
    table.innerHTML = "<tr>" + keys.map(k => `<th>${k}</th>`).join("") + "</tr>";
    rows.forEach(r => {
        table.innerHTML += "<tr>" + keys.map(k => `<td>${r[k] ?? ""}</td>`).join("") + "</tr>";
    });
}

// ─── кнопки ─────────────────────────────────
function runDelaunay() {
    if (points.length < 3) return setStatus("Нужно минимум 3 точки");
    fetch("/lab7/delaunay", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({points})
    }).then(r => r.json()).then(data => {
        triangles = data.triangles;
        voronoiEdges = []; voronoiCenters = [];
        showDelaunay = true; showVoronoi = false;
        buildTable(data.table);
        setResult(`Триангуляция Делоне: ${triangles.length} треугольник(ов)`);
        redraw();
    });
}

function runVoronoi() {
    if (points.length < 3) return setStatus("Нужно минимум 3 точки");
    fetch("/lab7/voronoi", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({points})
    }).then(r => r.json()).then(data => {
        triangles       = data.triangles;
        voronoiEdges    = data.edges;
        voronoiCenters  = data.centers;
        showDelaunay = true; showVoronoi = true;
        buildTable(data.table);
        setResult(`Диаграмма Вороного: ${voronoiEdges.length} ребро(ёв), ${voronoiCenters.length} узел(ов)`);
        redraw();
    });
}

function toggleDelaunay() {
    showDelaunay = !showDelaunay;
    document.getElementById("btn-del").classList.toggle("active", showDelaunay);
    redraw();
}

function toggleVoronoi() {
    showVoronoi = !showVoronoi;
    document.getElementById("btn-vor").classList.toggle("active", showVoronoi);
    redraw();
}

function toggleCircles() {
    showCircles = !showCircles;
    document.getElementById("btn-circ").classList.toggle("active", showCircles);
    redraw();
}

function addRandom() {
    const W = Math.floor(canvas.width  / scale);
    const H = Math.floor(canvas.height / scale);
    for (let i = 0; i < 8; i++) {
        points.push([
            Math.floor(Math.random() * (W - 2)) + 1,
            Math.floor(Math.random() * (H - 2)) + 1
        ]);
    }
    triangles = []; voronoiEdges = []; voronoiCenters = [];
    setResult(""); buildTable([]);
    redraw();
}

function reset() {
    points = []; triangles = []; voronoiEdges = []; voronoiCenters = [];
    setResult(""); setStatus("Кликайте по canvas чтобы добавить точки");
    buildTable([]);
    redraw();
}

setStatus("Кликайте по canvas чтобы добавить точки");
drawGrid();
