const canvas = document.getElementById("canvas");
const ctx    = canvas.getContext("2d");

// ─── масштаб и состояние ─────────────────────
let scale = 20;
let tab   = "cs";   // текущая вкладка: "cs" | "cb" | "mid" | "rob"

// --- Cohen-Sutherland ---
let cs = { seg: null, window: {xmin:3,xmax:13,ymin:3,ymax:11}, clip: null, step: 0 };
let csClickStep = 0;   // 0=P1, 1=P2

// --- Midpoint Subdivision ---
let mid = { seg: null, window: {xmin:3,xmax:13,ymin:3,ymax:11}, clip: null };
let midClickStep = 0;

// --- Cyrus-Beck ---
let cb = { seg: null, poly: [], polyClosed: false, clip: null };
let cbMode = "poly";   // "poly" | "seg"

// --- Roberts ---
let rob = { viewDir: [-1, 0, -1], results: [] };

// ─── масштаб ────────────────────────────────
document.getElementById("scale").oninput = e => {
    scale = Number(e.target.value);
    redraw();
};

// ─── координатные хелперы ───────────────────
function cx(gx) { return gx * scale; }
function cy(gy) { return canvas.height - gy * scale; }

// ─── grid ────────────────────────────────────
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e0e0e0";
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
    ctx.beginPath(); ctx.moveTo(0, canvas.height); ctx.lineTo(canvas.width, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0);             ctx.lineTo(0, canvas.height);             ctx.stroke();
}

// ─── окно отсечения (CS / Midpoint) ─────────────────────
function drawWindow(w) {
    const x = cx(w.xmin), y = cy(w.ymax);
    const W = (w.xmax - w.xmin) * scale;
    const H = (w.ymax - w.ymin) * scale;
    ctx.strokeStyle = "#2a9d8f";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, W, H);
    ctx.fillStyle = "rgba(42,157,143,0.06)";
    ctx.fillRect(x, y, W, H);
    ctx.fillStyle = "#2a9d8f";
    ctx.font = "11px sans-serif";
    ctx.fillText(`(${w.xmin},${w.ymin})`, cx(w.xmin)+2, cy(w.ymin)-3);
    ctx.fillText(`(${w.xmax},${w.ymax})`, cx(w.xmax)+2, cy(w.ymax)-3);
}

function drawSegment(seg, dash=true) {
    if (!seg) return;
    const [x1,y1,x2,y2] = seg;
    if (dash) ctx.setLineDash([5,4]);
    ctx.strokeStyle = "rgba(100,100,200,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx(x1), cy(y1)); ctx.lineTo(cx(x2), cy(y2));
    ctx.stroke();
    ctx.setLineDash([]);
    [[x1,y1],[x2,y2]].forEach(([x,y],i) => {
        ctx.fillStyle = i === 0 ? "#264653" : "#e76f51";
        ctx.beginPath(); ctx.arc(cx(x), cy(y), 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#333"; ctx.font = "11px sans-serif";
        ctx.fillText(`P${i+1}(${x},${y})`, cx(x)+7, cy(y)-5);
    });
}

function drawClip(clip) {
    if (!clip) return;
    const [x1,y1,x2,y2] = clip;
    ctx.strokeStyle = "#e63946";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx(x1), cy(y1)); ctx.lineTo(cx(x2), cy(y2));
    ctx.stroke();
}

// ─── Cohen-Sutherland ─────────────────────────
function drawCS() {
    drawGrid();
    drawWindow(cs.window);
    drawSegment(cs.seg, true);
    drawClip(cs.clip);
}

// ─── Midpoint Subdivision ─────────────────────
function drawMid() {
    drawGrid();
    drawWindow(mid.window);
    drawSegment(mid.seg, true);
    drawClip(mid.clip);
}

// ─── Cyrus–Beck polygon + segment ────────────
function drawCBPoly() {
    if (!cb.poly.length) return;
    ctx.strokeStyle = "#2a9d8f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx(cb.poly[0][0]), cy(cb.poly[0][1]));
    for (let i = 1; i < cb.poly.length; i++)
        ctx.lineTo(cx(cb.poly[i][0]), cy(cb.poly[i][1]));
    if (cb.polyClosed) {
        ctx.closePath();
        ctx.fillStyle = "rgba(42,157,143,0.08)";
        ctx.fill();
    }
    ctx.stroke();
    cb.poly.forEach((p,i) => {
        ctx.fillStyle = "#2a9d8f";
        ctx.beginPath(); ctx.arc(cx(p[0]), cy(p[1]), 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#333"; ctx.font = "11px sans-serif";
        ctx.fillText(`V${i}`, cx(p[0])+5, cy(p[1])-4);
    });
}

function drawCBSeg() {
    if (!cb.seg) return;
    const [x1,y1,x2,y2] = cb.seg;
    ctx.strokeStyle = "rgba(100,100,200,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5,4]);
    ctx.beginPath();
    ctx.moveTo(cx(x1), cy(y1)); ctx.lineTo(cx(x2), cy(y2));
    ctx.stroke();
    ctx.setLineDash([]);
    [[x1,y1],[x2,y2]].forEach(([x,y],i) => {
        ctx.fillStyle = i===0 ? "#264653" : "#e76f51";
        ctx.beginPath(); ctx.arc(cx(x), cy(y), 5, 0, Math.PI*2); ctx.fill();
    });
}

function drawCBClip() {
    if (!cb.clip) return;
    const [x1,y1,x2,y2] = cb.clip;
    ctx.strokeStyle = "#e63946";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx(x1), cy(y1)); ctx.lineTo(cx(x2), cy(y2));
    ctx.stroke();
}

function drawCB() {
    drawGrid();
    drawCBPoly();
    drawCBSeg();
    drawCBClip();
}

// ─── Roberts 3D ──────────────────────────────
function drawRoberts() {
    if (!rob.results.length) { drawGrid(); return; }

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, W, H);

    // Изометрическая проекция
    const scale3 = 70;
    const offX = W / 2, offY = H / 2 + 20;

    function proj(x, y, z) {
        const px = (x - z) * Math.cos(Math.PI / 6);
        const py = (x + z) * Math.sin(Math.PI / 6) - y;
        return [offX + px * scale3, offY + py * scale3];
    }

    // Грани куба (заданы в make_cube_faces)
    const cubeFaces = [
        [[-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1]],
        [[ 1,-1,-1],[-1,-1,-1],[-1, 1,-1],[ 1, 1,-1]],
        [[-1,-1,-1],[-1,-1, 1],[-1, 1, 1],[-1, 1,-1]],
        [[ 1,-1, 1],[ 1,-1,-1],[ 1, 1,-1],[ 1, 1, 1]],
        [[-1, 1, 1],[ 1, 1, 1],[ 1, 1,-1],[-1, 1,-1]],
        [[-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1],[-1,-1, 1]],
    ];
    const faceNames = ["Передняя","Задняя","Левая","Правая","Верхняя","Нижняя"];

    rob.results.forEach((r, i) => {
        const verts3d = cubeFaces[i];
        const pts2d   = verts3d.map(v => proj(...v));

        ctx.beginPath();
        ctx.moveTo(pts2d[0][0], pts2d[0][1]);
        for (let j = 1; j < pts2d.length; j++)
            ctx.lineTo(pts2d[j][0], pts2d[j][1]);
        ctx.closePath();

        if (r.visible) {
            ctx.fillStyle   = "rgba(69,123,157,0.25)";
            ctx.strokeStyle = "#457b9d";
            ctx.lineWidth   = 2;
            ctx.setLineDash([]);
        } else {
            ctx.fillStyle   = "rgba(200,200,200,0.1)";
            ctx.strokeStyle = "#ccc";
            ctx.lineWidth   = 1;
            ctx.setLineDash([5, 4]);
        }
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Подпись в центре грани
        const mcx = pts2d.reduce((s, p) => s + p[0], 0) / 4;
        const mcy = pts2d.reduce((s, p) => s + p[1], 0) / 4;
        ctx.fillStyle = r.visible ? "#264653" : "#aaa";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(faceNames[i], mcx, mcy);
        ctx.textAlign = "left";
    });

    // Метка направления взгляда
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Взгляд: [${rob.viewDir.join(", ")}]`, 10, 20);
}

// ─── главный redraw ──────────────────────────
function redraw() {
    if (tab === "cs") {
        drawCS();
    } else if (tab === "mid") {
        drawMid();
    } else if (tab === "cb") {
        drawCB();
    } else {
        drawRoberts();
    }
}

// ─── клик по canvas ──────────────────────────
canvas.onclick = e => {
    const gx = Math.round(e.offsetX / scale);
    const gy = Math.round((canvas.height - e.offsetY) / scale);

    if (tab === "cs") {
        if (csClickStep === 0) {
            cs.seg = [gx, gy, gx, gy];
            csClickStep = 1;
        } else {
            cs.seg[2] = gx; cs.seg[3] = gy;
            csClickStep = 0;
            cs.clip = null;
        }
    } else if (tab === "mid") {
        if (midClickStep === 0) {
            mid.seg = [gx, gy, gx, gy];
            midClickStep = 1;
        } else {
            mid.seg[2] = gx; mid.seg[3] = gy;
            midClickStep = 0;
            mid.clip = null;
        }
    } else if (tab === "cb") {
        if (cbMode === "poly") {
            if (cb.polyClosed) return;
            cb.poly.push([gx, gy]);
            cb.clip = null;
        } else {
            if (!cb.seg) cb.seg = [gx, gy, gx, gy];
            else { cb.seg[2] = gx; cb.seg[3] = gy; cb.clip = null; }
        }
    }
    redraw();
};

// ─── вкладки ─────────────────────────────────
function switchTab(t) {
    tab = t;
    document.querySelectorAll(".tab-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.tab === t)
    );
    document.querySelectorAll(".tab-panel").forEach(p =>
        p.style.display = p.id === "panel-" + t ? "" : "none"
    );
    buildTable([]);
    setResult("");
    redraw();
}

// ─── Cohen-Sutherland ────────────────────────
function runCS() {
    if (!cs.seg || cs.seg[0] === cs.seg[2] && cs.seg[1] === cs.seg[3])
        return setStatus("Задайте отрезок (два клика)");
    const w = cs.window;
    fetch("/lab8/cohen_sutherland", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            x1: cs.seg[0], y1: cs.seg[1], x2: cs.seg[2], y2: cs.seg[3],
            xmin: w.xmin, xmax: w.xmax, ymin: w.ymin, ymax: w.ymax
        })
    }).then(r => r.json()).then(data => {
        cs.clip = data.visible ? data.segment : null;
        buildTable(data.table);
        setResult(data.visible
            ? `Видим. Отсечённый: (${data.segment[0]},${data.segment[1]}) — (${data.segment[2]},${data.segment[3]})`
            : "Отрезок невидим (полностью вне окна)");
        redraw();
    });
}

function updateCSWindow() {
    cs.window = {
        xmin: Number(document.getElementById("cs-xmin").value),
        xmax: Number(document.getElementById("cs-xmax").value),
        ymin: Number(document.getElementById("cs-ymin").value),
        ymax: Number(document.getElementById("cs-ymax").value),
    };
    cs.clip = null; redraw();
}

// ─── Midpoint Subdivision ────────────────────
function runMidpoint() {
    if (!mid.seg || mid.seg[0] === mid.seg[2] && mid.seg[1] === mid.seg[3])
        return setStatus("Задайте отрезок (два клика)");
    const w = mid.window;
    fetch("/lab8/midpoint_subdivision", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            x1: mid.seg[0], y1: mid.seg[1], x2: mid.seg[2], y2: mid.seg[3],
            xmin: w.xmin, xmax: w.xmax, ymin: w.ymin, ymax: w.ymax
        })
    }).then(r => r.json()).then(data => {
        mid.clip = data.visible ? data.segment : null;
        buildTable(data.table);
        setResult(data.visible
            ? `Видим. Отсечённый: (${data.segment[0]},${data.segment[1]}) — (${data.segment[2]},${data.segment[3]})`
            : "Отрезок невидим (полностью вне окна)");
        redraw();
    });
}

function updateMidWindow() {
    mid.window = {
        xmin: Number(document.getElementById("mid-xmin").value),
        xmax: Number(document.getElementById("mid-xmax").value),
        ymin: Number(document.getElementById("mid-ymin").value),
        ymax: Number(document.getElementById("mid-ymax").value),
    };
    mid.clip = null; redraw();
}

// ─── Cyrus-Beck ──────────────────────────────
function setCBMode(m) {
    cbMode = m;
    ["poly","seg"].forEach(id =>
        document.getElementById("cbm-"+id).classList.toggle("active", id===m)
    );
}

function closeCBPoly() {
    if (cb.poly.length >= 3) { cb.polyClosed = true; redraw(); }
    else setStatus("Нужно минимум 3 вершины");
}

function runCB() {
    if (!cb.polyClosed)          return setStatus("Замкните многоугольник");
    if (!cb.seg || cb.seg[0]===cb.seg[2] && cb.seg[1]===cb.seg[3])
                                 return setStatus("Задайте отрезок");
    fetch("/lab8/cyrus_beck", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            x1: cb.seg[0], y1: cb.seg[1], x2: cb.seg[2], y2: cb.seg[3],
            vertices: cb.poly
        })
    }).then(r => r.json()).then(data => {
        cb.clip = data.visible ? data.segment : null;
        buildTable(data.table);
        setResult(data.visible
            ? `Видим. Отсечённый: (${data.segment[0]},${data.segment[1]}) — (${data.segment[2]},${data.segment[3]})`
            : "Отрезок невидим");
        redraw();
    });
}

// ─── Roberts ─────────────────────────────────
function runRoberts() {
    const vx = Number(document.getElementById("rob-vx").value);
    const vy = Number(document.getElementById("rob-vy").value);
    const vz = Number(document.getElementById("rob-vz").value);
    rob.viewDir = [vx, vy, vz];

    fetch("/lab8/roberts", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({view_dir: rob.viewDir})
    }).then(r => r.json()).then(data => {
        rob.results = data.results;
        buildTable(data.table);
        const vis = data.results.filter(r => r.visible).map(r => r.name);
        setResult(`Видимые грани: ${vis.join(", ") || "нет"}`);
        redraw();
    });
}

// ─── вспомогательные ─────────────────────────
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

function resetAll() {
    cs = { seg: null, window: {xmin:3,xmax:13,ymin:3,ymax:11}, clip: null };
    csClickStep = 0;
    mid = { seg: null, window: {xmin:3,xmax:13,ymin:3,ymax:11}, clip: null };
    midClickStep = 0;
    cb = { seg: null, poly: [], polyClosed: false, clip: null };
    cbMode = "poly";
    rob.results = [];
    buildTable([]); setResult("");
    setStatus("Готов");
    redraw();
}

// ─── инициализация ───────────────────────────
switchTab("cs");