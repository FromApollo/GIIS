const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 20;
let mode = "polygon";

let polygonPoints = [];
let polygonClosed = false;
let segmentPoints = [];
let testPoint = null;

let hull = [];
let normals = [];
let intersections = [];

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

canvas.onclick = e => {
    const x = Math.floor(e.offsetX / scale);
    const y = Math.floor(e.offsetY / scale);

    if (mode === "polygon") {
        if (polygonClosed) return;
        polygonPoints.push([x, y]);
        hull = []; normals = []; intersections = [];
    } else if (mode === "segment") {
        if (segmentPoints.length >= 2) segmentPoints = [];
        segmentPoints.push([x, y]);
    } else if (mode === "point") {
        testPoint = [x, y];
    }
    redraw();
};

function setMode(m) {
    mode = m;
    ["polygon", "segment", "point"].forEach(id =>
        document.getElementById("btn-" + id).classList.toggle("active", id === m)
    );
}

function closePolygon() {
    if (polygonPoints.length >= 3) { polygonClosed = true; redraw(); }
    else setStatus("Нужно минимум 3 вершины");
}

// canvas coords helpers
function cx(gx) { return gx * scale + scale / 2; }
function cy(gy) { return gy * scale + scale / 2; }

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += scale) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += scale) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function drawPolygon() {
    if (!polygonPoints.length) return;

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx(polygonPoints[0][0]), cy(polygonPoints[0][1]));
    for (let i = 1; i < polygonPoints.length; i++)
        ctx.lineTo(cx(polygonPoints[i][0]), cy(polygonPoints[i][1]));
    if (polygonClosed) {
        ctx.closePath();
        ctx.fillStyle = "rgba(100,150,255,0.15)";
        ctx.fill();
    }
    ctx.stroke();

    polygonPoints.forEach((p, i) => {
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(cx(p[0]), cy(p[1]), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "11px sans-serif";
        ctx.fillText(`V${i}`, cx(p[0]) + 5, cy(p[1]) - 4);
    });
}

function drawHull() {
    if (!hull.length) return;
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(cx(hull[0][0]), cy(hull[0][1]));
    for (let i = 1; i < hull.length; i++) ctx.lineTo(cx(hull[i][0]), cy(hull[i][1]));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawNormals() {
    if (!normals.length || !polygonPoints.length) return;
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1.5;

    normals.forEach((n, i) => {
        const p0 = polygonPoints[i];
        const p1 = polygonPoints[(i + 1) % polygonPoints.length];
        const mx = (p0[0] + p1[0]) / 2;
        const my = (p0[1] + p1[1]) / 2;
        const len = Math.sqrt(n[0] ** 2 + n[1] ** 2) || 1;
        const nx = n[0] / len, ny = n[1] / len;
        const sx = cx(mx), sy = cy(my);
        const ex = sx + nx * scale * 1.5, ey = sy + ny * scale * 1.5;
        const ang = Math.atan2(ey - sy, ex - sx);

        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8 * Math.cos(ang - 0.4), ey - 8 * Math.sin(ang - 0.4));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8 * Math.cos(ang + 0.4), ey - 8 * Math.sin(ang + 0.4));
        ctx.stroke();
    });
}

function drawSegment() {
    if (!segmentPoints.length) return;
    ctx.strokeStyle = "purple";
    ctx.lineWidth = 2;
    segmentPoints.forEach(p => {
        ctx.fillStyle = "purple";
        ctx.beginPath(); ctx.arc(cx(p[0]), cy(p[1]), 5, 0, Math.PI * 2); ctx.fill();
    });
    if (segmentPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(cx(segmentPoints[0][0]), cy(segmentPoints[0][1]));
        ctx.lineTo(cx(segmentPoints[1][0]), cy(segmentPoints[1][1]));
        ctx.stroke();
    }
}

function drawTestPoint() {
    if (!testPoint) return;
    ctx.fillStyle = "orange";
    ctx.beginPath(); ctx.arc(cx(testPoint[0]), cy(testPoint[1]), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    ctx.fillText("P", cx(testPoint[0]) + 7, cy(testPoint[1]) - 5);
}

function drawIntersections() {
    intersections.forEach(p => {
        ctx.fillStyle = "red";
        ctx.beginPath(); ctx.arc(cx(p[0]), cy(p[1]), 5, 0, Math.PI * 2); ctx.fill();
    });
}

function redraw() {
    drawGrid();
    drawPolygon();
    drawHull();
    drawNormals();
    drawSegment();
    drawTestPoint();
    drawIntersections();
}

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

function checkConvexity() {
    if (polygonPoints.length < 3) return setStatus("Нужно минимум 3 вершины");
    fetch("lab5/check_convexity", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({vertices: polygonPoints})
    }).then(r => r.json()).then(data => {
        setResult(data.result.status);
        buildTable(data.table);
    });
}

function findNormals() {
    if (!polygonClosed || polygonPoints.length < 3) return setStatus("Замкните полигон");
    fetch("lab5/normals", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({vertices: polygonPoints})
    }).then(r => r.json()).then(data => {
        normals = data.normals;
        buildTable(data.table);
        setResult("Внутренние нормали отображены");
        redraw();
    });
}

function buildHull(algo) {
    if (polygonPoints.length < 3) return setStatus("Нужно минимум 3 точки");
    fetch("lab5/convex_hull", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({points: polygonPoints, algorithm: algo})
    }).then(r => r.json()).then(data => {
        hull = data.hull;
        buildTable(data.table);
        setResult(`Оболочка (${algo}): ${hull.map(p => `(${p[0]},${p[1]})`).join(" → ")}`);
        redraw();
    });
}

function findIntersection() {
    if (!polygonClosed || polygonPoints.length < 3) return setStatus("Замкните полигон");
    if (segmentPoints.length < 2) return setStatus("Нарисуйте отрезок (режим Отрезок)");
    fetch("lab5/intersection", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({p1: segmentPoints[0], p2: segmentPoints[1], vertices: polygonPoints})
    }).then(r => r.json()).then(data => {
        intersections = data.intersections;
        buildTable(data.table);
        setResult(intersections.length
            ? `Пересечения: ${intersections.map(p => `(${p[0]},${p[1]})`).join(", ")}`
            : "Пересечений нет");
        redraw();
    });
}

function checkPoint() {
    if (!polygonClosed || polygonPoints.length < 3) return setStatus("Замкните полигон");
    if (!testPoint) return setStatus("Выберите точку (режим Точка)");
    fetch("lab5/point_in_polygon", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({point: testPoint, vertices: polygonPoints})
    }).then(r => r.json()).then(data => {
        buildTable(data.table);
        const r = data.result;
        setResult(r.inside
            ? `Точка (${testPoint[0]},${testPoint[1]}) ВНУТРИ полигона (счётчик: ${r.count})`
            : `Точка (${testPoint[0]},${testPoint[1]}) ВНЕ полигона (счётчик: ${r.count})`);
    });
}

function reset() {
    polygonPoints = []; polygonClosed = false;
    segmentPoints = []; testPoint = null;
    hull = []; normals = []; intersections = [];
    setResult(""); buildTable([]);
    setStatus("Кликайте по canvas чтобы добавить вершины полигона");
    redraw();
}

drawGrid();