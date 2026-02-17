const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 20;
let userPoints = [];
let resultPoints = [];

// При изменении алгоритма сбрасываем, чтобы не путаться
document.getElementById("algorithm").onchange = () => {
    reset();
    updateStatus();
};

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

canvas.onclick = e => {
    const algo = document.getElementById("algorithm").value;

    // Ограничение: для Безье и Эрмита только 4 точки
    if (algo !== 'bspline' && userPoints.length >= 4) {
        alert("Для алгоритмов Безье и Эрмита используется ровно 4 точки.");
        return;
    }

    const x = Math.floor(e.offsetX / scale);
    const y = Math.floor(e.offsetY / scale);

    userPoints.push({x, y});
    updateStatus();
    redraw();
};

function drawAll() {
    const algo = document.getElementById("algorithm").value;

    if (userPoints.length < 4) {
        alert("Поставьте минимум 4 точки!");
        return;
    }

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

    // Рисуем пунктирную ломаную линию между точками
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

    // Рисуем полученную кривую
    ctx.fillStyle = "blue";
    resultPoints.forEach(p => {
        ctx.fillRect(p[0] * scale, p[1] * scale, scale, scale);
    });

    // Рисуем опорные точки
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

function drawPointMarker(p, index) {
    const cx = p.x * scale + scale/2;
    const cy = p.y * scale + scale/2;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(cx, cy, scale/4, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    // Сдвигаем надпись, чтобы не перекрывала точку
    ctx.fillText("P" + (index + 1), p.x * scale + 5, p.y * scale - 5);
}

function buildTable(data) {
    const tbody = document.querySelector("#table tbody");
    tbody.innerHTML = "";
    data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.t}</td><td>${row.x}</td><td>${row.y}</td><td>${row.px}, ${row.py}</td>`;
        tbody.appendChild(tr);
    });
}

function updateStatus() {
    const algo = document.getElementById("algorithm").value;
    const count = userPoints.length;
    const limit = (algo === 'bspline') ? "∞" : "4";
    document.getElementById("status").innerText = `Точек: ${count} / ${limit}`;
}

function reset() {
    userPoints = [];
    resultPoints = [];
    document.querySelector("#table tbody").innerHTML = "";
    updateStatus();
    redraw();
}

drawGrid();
updateStatus();