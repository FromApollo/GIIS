/* ============================================================
   Лабораторная работа №6 — Заполнение полигонов
   ============================================================ */

const canvas  = document.getElementById("canvas");
const ctx     = canvas.getContext("2d");

let scale = 20;
let mode  = "polygon";   // polygon | seed

let polygonPoints  = [];
let polygonClosed  = false;
let seedPoint      = null;

// Результаты последнего вызова
let filledPixels   = [];   // [[x,y], ...]
let allSteps       = [];   // пошаговые данные
let currentStep    = 0;    // для режима отладки
let debugMode      = false;
let fillColor      = "#4a90d9";

// ────────────────────────────────────────────
// Масштаб
// ────────────────────────────────────────────
document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

document.getElementById("fillColor").oninput = e => {
    fillColor = e.target.value;
    redraw();
};

// ────────────────────────────────────────────
// Клик по canvas
// ────────────────────────────────────────────
canvas.onclick = e => {
    const x = Math.floor(e.offsetX / scale);
    const y = Math.floor(e.offsetY / scale);

    if (mode === "polygon") {
        if (polygonClosed) return;
        polygonPoints.push([x, y]);
        filledPixels = []; allSteps = []; currentStep = 0;
        updateStepUI();
    } else if (mode === "seed") {
        seedPoint = [x, y];
    }
    redraw();
};

// ────────────────────────────────────────────
// Режим
// ────────────────────────────────────────────
function setMode(m) {
    mode = m;
    ["polygon", "seed"].forEach(id =>
        document.getElementById("btn-" + id).classList.toggle("active", id === m)
    );
}

// ────────────────────────────────────────────
// Замкнуть / Сброс
// ────────────────────────────────────────────
function closePolygon() {
    if (polygonPoints.length >= 3) {
        polygonClosed = true;
        redraw();
    } else {
        setStatus("Нужно минимум 3 вершины");
    }
}

function reset() {
    polygonPoints = []; polygonClosed = false;
    seedPoint = null;
    filledPixels = []; allSteps = []; currentStep = 0;
    debugMode = false;
    document.getElementById("debug-panel").style.display = "none";
    setResult(""); buildTable([]);
    setStatus("Кликайте по canvas чтобы добавить вершины полигона");
    redraw();
}

// ────────────────────────────────────────────
// Канвасные хелперы
// ────────────────────────────────────────────
function cx(gx) { return gx * scale + scale / 2; }
function cy(gy) { return gy * scale + scale / 2; }

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ────────────────────────────────────────────
// Отрисовка
// ────────────────────────────────────────────
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

function drawFilledPixels() {
    // В пошаговом режиме рисуем только до currentStep
    let pixels = filledPixels;
    if (debugMode && allSteps.length > 0) {
        pixels = getPixelsUpToStep(currentStep);
    }
    pixels.forEach(([px, py]) => {
        ctx.fillStyle = hexToRgba(fillColor, 0.75);
        ctx.fillRect(px * scale + 1, py * scale + 1, scale - 1, scale - 1);
    });
}

function getPixelsUpToStep(stepIdx) {
    // Для scan-line шагов: собираем все pixels из steps[0..stepIdx]
    if (!allSteps.length) return [];
    const pixels = [];
    for (let i = 0; i <= Math.min(stepIdx, allSteps.length - 1); i++) {
        const s = allSteps[i];
        if (s.interval_pixels) {
            s.interval_pixels.forEach(p => pixels.push(p));
        } else if (s.pixel) {
            pixels.push(s.pixel);
        } else if (s.pairs) {
            // scanline OEL / AEL: рисуем весь интервал
            if (s.pairs) {
                s.pairs.forEach(([x1, x2]) => {
                    for (let px = Math.round(x1); px <= Math.round(x2); px++) {
                        pixels.push([px, s.y]);
                    }
                });
            }
        }
    }
    return pixels;
}

function drawPolygon() {
    if (!polygonPoints.length) return;
    ctx.strokeStyle = "#333";
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(cx(polygonPoints[0][0]), cy(polygonPoints[0][1]));
    for (let i = 1; i < polygonPoints.length; i++)
        ctx.lineTo(cx(polygonPoints[i][0]), cy(polygonPoints[i][1]));
    if (polygonClosed) {
        ctx.closePath();
        ctx.strokeStyle = "#333";
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

function drawSeed() {
    if (!seedPoint) return;
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(cx(seedPoint[0]), cy(seedPoint[1]), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "12px sans-serif";
    ctx.fillText("S", cx(seedPoint[0]) + 8, cy(seedPoint[1]) - 5);
}

// Подсвечиваем текущую строку / пиксель в пошаговом режиме
function drawCurrentStepHighlight() {
    if (!debugMode || !allSteps.length) return;
    const s = allSteps[Math.min(currentStep, allSteps.length - 1)];
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    if (s.y !== undefined) {
        // Сканирующая строка
        const yCanvas = s.y * scale;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(0, yCanvas + scale / 2);
        ctx.lineTo(canvas.width, yCanvas + scale / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (s.pixel) {
        const [px, py] = s.pixel;
        ctx.strokeStyle = "red";
        ctx.strokeRect(px * scale + 1, py * scale + 1, scale - 1, scale - 1);
    }
    if (s.seed) {
        const [px, py] = s.seed;
        ctx.strokeStyle = "red";
        ctx.strokeRect(px * scale + 1, py * scale + 1, scale - 1, scale - 1);
    }
}

function redraw() {
    drawGrid();
    drawFilledPixels();
    drawPolygon();
    drawSeed();
    drawCurrentStepHighlight();
}

// ────────────────────────────────────────────
// Статус / результат / таблица
// ────────────────────────────────────────────
function setStatus(msg) { document.getElementById("status").textContent = msg; }
function setResult(msg) { document.getElementById("result").textContent = msg; }

function buildTable(rows) {
    const table = document.getElementById("table");
    table.innerHTML = "";
    if (!rows || !rows.length) return;
    const keys = Object.keys(rows[0]);
    table.innerHTML = "<tr>" + keys.map(k => `<th>${k}</th>`).join("") + "</tr>";
    rows.forEach(r => {
        table.innerHTML += "<tr>" +
            keys.map(k => `<td>${r[k] !== undefined ? JSON.stringify(r[k]) : ""}</td>`).join("") +
            "</tr>";
    });
}

// ────────────────────────────────────────────
// Пошаговый режим UI
// ────────────────────────────────────────────
function updateStepUI() {
    const panel = document.getElementById("debug-panel");
    if (!debugMode || !allSteps.length) {
        panel.style.display = "none";
        return;
    }
    panel.style.display = "flex";
    const idx = Math.min(currentStep, allSteps.length - 1);
    document.getElementById("step-info").textContent =
        `Шаг ${idx + 1} / ${allSteps.length}`;

    // Отображаем данные текущего шага в таблице
    buildTable([allSteps[idx]]);
    redraw();
}

function stepPrev() {
    if (currentStep > 0) { currentStep--; updateStepUI(); }
}
function stepNext() {
    if (currentStep < allSteps.length - 1) { currentStep++; updateStepUI(); }
}
function stepFirst() { currentStep = 0; updateStepUI(); }
function stepLast()  { currentStep = allSteps.length - 1; updateStepUI(); }

function toggleDebug() {
    debugMode = !debugMode;
    document.getElementById("btn-debug").classList.toggle("active", debugMode);
    if (debugMode && allSteps.length) {
        currentStep = 0;
        updateStepUI();
    } else {
        document.getElementById("debug-panel").style.display = "none";
        buildTable(allSteps);   // показываем всю таблицу
        redraw();
    }
}

// ────────────────────────────────────────────
// Общий обработчик ответа от сервера
// ────────────────────────────────────────────
function handleFillResult(data, algoName) {
    filledPixels = data.pixels || [];
    allSteps     = data.steps  || [];
    currentStep  = 0;

    setResult(`${algoName}: закрашено ${filledPixels.length} пикселей, шагов: ${allSteps.length}`);

    if (debugMode) {
        updateStepUI();
    } else {
        buildTable(allSteps);
        redraw();
    }
}

// ────────────────────────────────────────────
// Проверка перед вызовом
// ────────────────────────────────────────────
function requireClosedPolygon() {
    if (!polygonClosed || polygonPoints.length < 3) {
        setStatus("Замкните полигон (минимум 3 вершины)");
        return false;
    }
    return true;
}

function requireSeed() {
    if (!seedPoint) {
        setStatus("Укажите затравку (режим «Затравка»)");
        return false;
    }
    return true;
}

// ────────────────────────────────────────────
// Алгоритмы
// ────────────────────────────────────────────

function fillScanlineOEL() {
    if (!requireClosedPolygon()) return;
    setStatus("Вычисляется...");
    fetch("lab6/scanline_oel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertices: polygonPoints })
    }).then(r => r.json()).then(data => {
        setStatus("");
        handleFillResult(data, "Упорядоченный список рёбер");
    });
}

function fillScanlineAEL() {
    if (!requireClosedPolygon()) return;
    setStatus("Вычисляется...");
    fetch("lab6/scanline_ael", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertices: polygonPoints })
    }).then(r => r.json()).then(data => {
        setStatus("");
        handleFillResult(data, "Список активных рёбер (CAP)");
    });
}

function fillSeedSimple() {
    if (!requireClosedPolygon() || !requireSeed()) return;
    setStatus("Вычисляется...");
    fetch("lab6/seed_simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertices: polygonPoints, seed: seedPoint })
    }).then(r => r.json()).then(data => {
        setStatus("");
        handleFillResult(data, "Простая затравка (4-связная)");
    });
}

function fillSeedScanline() {
    if (!requireClosedPolygon() || !requireSeed()) return;
    setStatus("Вычисляется...");
    fetch("lab6/seed_scanline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertices: polygonPoints, seed: seedPoint })
    }).then(r => r.json()).then(data => {
        setStatus("");
        handleFillResult(data, "Построчная затравка");
    });
}

// ────────────────────────────────────────────
// Инициализация
// ────────────────────────────────────────────
drawGrid();