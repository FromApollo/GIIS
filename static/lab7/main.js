const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

let points = [];
let triangles = [];
let voronoiSegs = [];
let showDelaunay = true;
let showVoronoi = false;

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    points.push([x, y]);
    updateStatus();
    draw();
});

function updateStatus() {
    document.getElementById("status").textContent =
        `Точек: ${points.length}. Кликайте для добавления точек.`;
}

async function computeDelaunay() {
    if (points.length < 3) {
        alert("Нужно минимум 3 точки");
        return;
    }
    const resp = await fetch("/lab7/delaunay", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({points})
    });
    const data = await resp.json();
    triangles = data.triangles;
    voronoiSegs = [];
    showDelaunay = true;
    showVoronoi = false;
    document.getElementById("btn-delaunay").classList.add("active");
    document.getElementById("btn-voronoi").classList.remove("active");
    draw();
    buildTable(data.log);
    document.getElementById("result").textContent =
        `Треугольников: ${triangles.length}`;
}

async function computeVoronoi() {
    if (triangles.length === 0) {
        await computeDelaunay();
    }
    const resp = await fetch("/lab7/voronoi", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({points, triangles})
    });
    const data = await resp.json();
    voronoiSegs = data.segments;
    showVoronoi = true;
    document.getElementById("btn-voronoi").classList.add("active");
    draw();
    document.getElementById("result").textContent =
        `Рёбер Вороного: ${voronoiSegs.length}`;
}

function toggleDelaunay() {
    showDelaunay = !showDelaunay;
    document.getElementById("btn-delaunay").classList.toggle("active", showDelaunay);
    draw();
}

function toggleVoronoi() {
    showVoronoi = !showVoronoi;
    document.getElementById("btn-voronoi").classList.toggle("active", showVoronoi);
    draw();
}

function reset() {
    points = [];
    triangles = [];
    voronoiSegs = [];
    showDelaunay = true;
    showVoronoi = false;
    document.getElementById("result").textContent = "";
    document.getElementById("table").innerHTML = "";
    document.getElementById("btn-delaunay").classList.add("active");
    document.getElementById("btn-voronoi").classList.remove("active");
    updateStatus();
    draw();
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    // Voronoi diagram (behind triangulation)
    if (showVoronoi && voronoiSegs.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        for (const seg of voronoiSegs) {
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Delaunay triangulation
    if (showDelaunay && triangles.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#2980b9";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        for (const tri of triangles) {
            const [i, j, k] = tri;
            ctx.beginPath();
            ctx.moveTo(points[i][0], points[i][1]);
            ctx.lineTo(points[j][0], points[j][1]);
            ctx.lineTo(points[k][0], points[k][1]);
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }

    // Points
    ctx.save();
    for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#555";
        ctx.font = "11px sans-serif";
        ctx.fillText(i, x + 6, y - 4);
    }
    ctx.restore();
}

function buildTable(log) {
    if (!log || log.length === 0) {
        document.getElementById("table").innerHTML = "";
        return;
    }
    let html = `<tr><th>Шаг</th><th>Точка</th><th>Удалено треуг.</th><th>Добавлено треуг.</th></tr>`;
    for (const row of log) {
        html += `<tr>
            <td>${row.step}</td>
            <td>(${row.point[0].toFixed(1)}, ${row.point[1].toFixed(1)})</td>
            <td>${row.removed}</td>
            <td>${row.added}</td>
        </tr>`;
    }
    document.getElementById("table").innerHTML = html;
}

updateStatus();
draw();
