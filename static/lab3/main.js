const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let scale = 20;
let userPoints = [];
let resultPoints = [];

// Переменные для перетаскивания
let isDragging = false;
let dragIndex = -1;

// --- Управление интерфейсом ---

document.getElementById("algorithm").onchange = () => {
    reset();
    updateStatus();
};

document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

// --- Обработка мыши (Drag & Drop) ---

canvas.onmousedown = e => {
    const coords = getMousePos(e);

    // 1. Проверяем, кликнули ли мы в существующую точку (для перетаскивания)
    // Ищем точку, которая находится близко к клику
    const clickedIndex = userPoints.findIndex(p => p.x === coords.x && p.y === coords.y);

    if (clickedIndex !== -1) {
        // Режим перетаскивания: запоминаем, какую точку тянем
        isDragging = true;
        dragIndex = clickedIndex;
    } else {
        // 2. Если не попали в точку - пытаемся добавить новую
        const algo = document.getElementById("algorithm").value;
        if (algo !== 'bspline' && userPoints.length >= 4) {
            // Не добавляем, если лимит исчерпан
            return;
        }
        userPoints.push(coords);
        updateStatus();
        redraw();
    }
};

canvas.onmousemove = e => {
    // Если мы ничего не тащим, просто выходим
    if (!isDragging) return;

    // Обновляем координаты точки, которую тащим
    const coords = getMousePos(e);

    // Проверка, чтобы не выйти за границы (опционально)
    if (coords.x >= 0 && coords.x < canvas.width/scale &&
        coords.y >= 0 && coords.y < canvas.height/scale) {

        userPoints[dragIndex] = coords;
        redraw(); // Перерисовываем точки и пунктир (кривую пока не пересчитываем, чтобы не лагало)
    }
};

canvas.onmouseup = () => {
    // Когда отпустили мышь
    if (isDragging) {
        isDragging = false;
        dragIndex = -1;
        // Сразу пересчитываем кривую с новым положением точки
        if (userPoints.length >= 4) {
            drawAll();
        }
    }
};

// Вспомогательная функция для получения координат клетки
function getMousePos(e) {
    return {
        x: Math.floor(e.offsetX / scale),
        y: Math.floor(e.offsetY / scale)
    };
}

// --- Логика отрисовки и запросов ---

function drawAll() {
    const algo = document.getElementById("algorithm").value;

    if (userPoints.length < 4) {
        // Если точек мало, просто очищаем кривую, но оставляем точки
        resultPoints = [];
        redraw();
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

    // Рисуем "каркас" (пунктирные линии)
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

    // Рисуем кривую (синим)
    ctx.fillStyle = "blue";
    resultPoints.forEach(p => {
        // p[2] - это интенсивность (альфа-канал), если сервер её шлёт
        // Если нет, считаем её равной 1
        ctx.fillStyle = `rgba(0, 0, 255, ${p[2] !== undefined ? p[2] : 1})`;
        ctx.fillRect(p[0] * scale, p[1] * scale, scale, scale);
    });

    // Рисуем опорные точки (красным)
    userPoints.forEach((p, i) => {
        drawPointMarker(p, i);
    });
}

function drawPointMarker(p, index) {
    const cx = p.x * scale + scale/2;
    const cy = p.y * scale + scale/2;

    // Если эту точку сейчас тащим, рисуем её чуть больше или другим цветом
    if (index === dragIndex) {
        ctx.fillStyle = "#ff00ff"; // Фиолетовый при перетаскивании
        ctx.beginPath();
        ctx.arc(cx, cy, scale/3, 0, Math.PI*2);
        ctx.fill();
    } else {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(cx, cy, scale/4, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.fillText("P" + (index + 1), p.x * scale + 5, p.y * scale - 5);
}

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
}

function buildTable(data) {
    const tbody = document.querySelector("#table tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    data.forEach(row => {
        const tr = document.createElement("tr");
        // Проверка: сервер может слать t как число или как строку
        tr.innerHTML = `<td>${row.t}</td><td>${row.x}</td><td>${row.y}</td><td>${row.px}, ${row.py}</td>`;
        tbody.appendChild(tr);
    });
}

function updateStatus() {
    const algo = document.getElementById("algorithm").value;
    const count = userPoints.length;
    const limit = (algo === 'bspline') ? "∞" : "4";
    const statusEl = document.getElementById("status");
    if(statusEl) statusEl.innerText = `Точек: ${count} / ${limit}`;
}

function reset() {
    userPoints = [];
    resultPoints = [];
    const tbody = document.querySelector("#table tbody");
    if(tbody) tbody.innerHTML = "";
    updateStatus();
    redraw();
}

// Инициализация
drawGrid();
updateStatus();