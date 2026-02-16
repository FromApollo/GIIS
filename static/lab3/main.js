const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 20;
let userPoints = []; // Опорные точки (максимум 4)
let resultPoints = []; // Точки кривой от сервера

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

canvas.onclick = e => {
    if (userPoints.length >= 4) return; // Больше 4 точек для кубического сплайна не берем

    const x = Math.floor(e.offsetX / scale);
    const y = Math.floor(e.offsetY / scale);

    userPoints.push({x, y});
    updateStatus();
    redraw();
};

// Функция, которая вызывается по кнопке "Нарисовать"
function drawAll() {
    if (userPoints.length < 4) {
        alert("Сначала поставьте 4 точки на сетке!");
        return;
    }

    const algo = document.getElementById("algorithm").value;

    fetch("/lab3/draw", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            algorithm: algo,
            points: userPoints
        })
    })
    .then(r => r.json())
    .then(data => {
        resultPoints = data.points;
        buildTable(data.table);
        redraw();
    });
}

function redraw() {
    drawGrid();

    // Рисуем пунктирные линии между опорными точками ("скелет")
    if (userPoints.length > 1) {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.moveTo(userPoints[0].x * scale + scale/2, userPoints[0].y * scale + scale/2);
        for(let i = 1; i < userPoints.length; i++) {
            ctx.lineTo(userPoints[i].x * scale + scale/2, userPoints[i].y * scale + scale/2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Рисуем саму кривую
    resultPoints.forEach(p => {
        drawPixel(p[0], p[1], p[2] || 1);
    });

    // Рисуем маркеры опорных точек
    userPoints.forEach((p, i) => {
        drawPointMarker(p, i);
    });
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#ddd";
    for (let x = 0; x <= canvas.width; x += scale) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += scale) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function drawPixel(x, y, intensity) {
    ctx.fillStyle = `rgba(0, 0, 255, ${intensity})`;
    ctx.fillRect(x * scale, y * scale, scale, scale);
}

function drawPointMarker(p, index) {
    const cx = p.x * scale + scale/2;
    const cy = p.y * scale + scale/2;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(cx, cy, scale/4, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    ctx.fillText("P" + (index + 1), p.x * scale, p.y * scale - 5);
}

function buildTable(data) {
    const tbody = document.querySelector("#table tbody");
    tbody.innerHTML = "";
    data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.t}</td>
            <td>${row.x}</td>
            <td>${row.y}</td>
            <td>${row.px}, ${row.py}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStatus() {
    document.getElementById("status").innerText = `Точек: ${userPoints.length}/4`;
}

function reset() {
    userPoints = [];
    resultPoints = [];
    document.querySelector("#table tbody").innerHTML = "";
    updateStatus();
    redraw();
}

// Первичная отрисовка сетки
drawGrid();