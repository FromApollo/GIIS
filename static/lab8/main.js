// ═══════════════════════════════════════════════
//  Общие переменные
// ═══════════════════════════════════════════════
let activeTab = "clip2d";

function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + tab).style.display = "block";
    document.getElementById("tabBtn-" + tab).classList.add("active");
}

// ═══════════════════════════════════════════════
//  ЛАБ 2D: Отсечение отрезков
// ═══════════════════════════════════════════════

const c2 = document.getElementById("canvas2d");
const ctx2 = c2.getContext("2d");
const W2 = c2.width, H2 = c2.height;

// Окно отсечения (в пикселях canvas)
let win2d = { xmin: 150, ymin: 120, xmax: 500, ymax: 420 };
let segs2d = [];          // [{x0,y0,x1,y1}, ...]
let clipResults2d = [];
let mode2d = "segment";   // "segment" | "window-corner"
let clickBuf2d = [];

c2.addEventListener("click", (e) => {
    const r = c2.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (mode2d === "segment") {
        clickBuf2d.push({x, y});
        if (clickBuf2d.length === 2) {
            segs2d.push({
                x0: clickBuf2d[0].x, y0: clickBuf2d[0].y,
                x1: clickBuf2d[1].x, y1: clickBuf2d[1].y
            });
            clipResults2d = [];
            clickBuf2d = [];
        }
        draw2d();
    }
});

function draw2d() {
    ctx2.clearRect(0, 0, W2, H2);

    // Окно отсечения
    ctx2.save();
    ctx2.strokeStyle = "#27ae60";
    ctx2.lineWidth = 2;
    ctx2.setLineDash([6,3]);
    ctx2.strokeRect(win2d.xmin, win2d.ymin,
                    win2d.xmax - win2d.xmin, win2d.ymax - win2d.ymin);
    ctx2.setLineDash([]);
    ctx2.restore();

    // Все отрезки (до отсечения — серые)
    ctx2.save();
    ctx2.strokeStyle = "#aaa";
    ctx2.lineWidth = 1.5;
    ctx2.setLineDash([4,4]);
    for (const s of segs2d) {
        ctx2.beginPath();
        ctx2.moveTo(s.x0, s.y0);
        ctx2.lineTo(s.x1, s.y1);
        ctx2.stroke();
    }
    ctx2.setLineDash([]);
    ctx2.restore();

    // Точки-черновики
    if (clickBuf2d.length === 1) {
        ctx2.save();
        ctx2.fillStyle = "#e74c3c";
        ctx2.beginPath();
        ctx2.arc(clickBuf2d[0].x, clickBuf2d[0].y, 4, 0, Math.PI*2);
        ctx2.fill();
        ctx2.restore();
    }

    // Результаты отсечения
    for (const r of clipResults2d) {
        ctx2.save();
        if (r.visible) {
            ctx2.strokeStyle = "#2980b9";
            ctx2.lineWidth = 3;
            ctx2.beginPath();
            ctx2.moveTo(r.x0, r.y0);
            ctx2.lineTo(r.x1, r.y1);
            ctx2.stroke();
        }
        ctx2.restore();
    }

    // Точки на отрезках
    for (const s of segs2d) {
        for (const [x, y, label] of [[s.x0,s.y0,"P1"],[s.x1,s.y1,"P2"]]) {
            ctx2.fillStyle = "#333";
            ctx2.beginPath();
            ctx2.arc(x, y, 3, 0, Math.PI*2);
            ctx2.fill();
            ctx2.fillStyle = "#333";
            ctx2.font = "11px sans-serif";
            ctx2.fillText(label, x+5, y-4);
        }
    }

    // Метки окна
    ctx2.fillStyle = "#27ae60";
    ctx2.font = "12px sans-serif";
    ctx2.fillText(`xmin=${win2d.xmin.toFixed(0)} ymin=${win2d.ymin.toFixed(0)}`,
                   win2d.xmin, win2d.ymin - 4);
    ctx2.fillText(`xmax=${win2d.xmax.toFixed(0)} ymax=${win2d.ymax.toFixed(0)}`,
                   win2d.xmax - 120, win2d.ymax + 14);
}

async function clip2d(algo) {
    if (segs2d.length === 0) { alert("Добавьте хотя бы один отрезок"); return; }
    clipResults2d = [];
    let allTables = [];

    for (const s of segs2d) {
        const body = {
            x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1,
            xmin: win2d.xmin, ymin: win2d.ymin,
            xmax: win2d.xmax, ymax: win2d.ymax
        };
        const url = algo === "cs" ? "/lab8/cohen_sutherland" : "/lab8/cyrus_beck";
        const resp = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body)
        });
        const data = await resp.json();
        clipResults2d.push(data);
        allTables.push({seg: s, result: data});
    }

    draw2d();
    buildTable2d(allTables, algo);

    const vis = clipResults2d.filter(r => r.visible).length;
    document.getElementById("result2d").textContent =
        `Видимых: ${vis} / ${segs2d.length}`;
}

function buildTable2d(allTables, algo) {
    let html = "";
    for (let i = 0; i < allTables.length; i++) {
        const {seg, result} = allTables[i];
        html += `<h4>Отрезок ${i+1}: P1(${seg.x0.toFixed(1)},${seg.y0.toFixed(1)}) → P2(${seg.x1.toFixed(1)},${seg.y1.toFixed(1)})</h4>`;
        html += `<p><b>Результат: ${result.visible ? "Видим ✓" : "Невидим ✗"}</b>`;
        if (result.visible) {
            html += ` → (${result.x0.toFixed(1)},${result.y0.toFixed(1)}) – (${result.x1.toFixed(1)},${result.y1.toFixed(1)})`;
        }
        html += `</p>`;

        if (algo === "cs") {
            html += `<table><tr><th>Шаг</th><th>P1</th><th>P2</th><th>Код P1</th><th>Код P2</th><th>Действие</th></tr>`;
            for (const row of result.table) {
                html += `<tr><td>${row.step}</td><td>${row.P1}</td><td>${row.P2}</td>
                    <td>${row.code1}</td><td>${row.code2}</td><td>${row.action}</td></tr>`;
            }
            html += `</table>`;
        } else {
            html += `<table><tr><th>Ребро</th><th>n</th><th>n·D</th><th>n·w</th><th>t</th><th>Статус</th><th>tL</th><th>tU</th></tr>`;
            for (const row of result.table) {
                html += `<tr><td>${row.edge}</td><td>${row.n}</td><td>${row.nD}</td>
                    <td>${row.nW}</td><td>${row.t}</td><td>${row.status}</td>
                    <td>${row.tL}</td><td>${row.tU}</td></tr>`;
            }
            if (result.tL !== undefined) {
                html += `<tr><td colspan="8"><b>tL=${result.tL.toFixed(4)}, tU=${result.tU.toFixed(4)}</b></td></tr>`;
            }
            html += `</table>`;
        }
    }
    document.getElementById("table2d").innerHTML = html;
}

function reset2d() {
    segs2d = [];
    clipResults2d = [];
    clickBuf2d = [];
    document.getElementById("result2d").textContent = "";
    document.getElementById("table2d").innerHTML = "";
    draw2d();
}

// Update window from inputs
function updateWindow() {
    win2d.xmin = parseFloat(document.getElementById("w-xmin").value) || 150;
    win2d.ymin = parseFloat(document.getElementById("w-ymin").value) || 120;
    win2d.xmax = parseFloat(document.getElementById("w-xmax").value) || 500;
    win2d.ymax = parseFloat(document.getElementById("w-ymax").value) || 420;
    clipResults2d = [];
    draw2d();
}

// ═══════════════════════════════════════════════
//  ЛАБ 3D: Удаление невидимых граней (Робертс)
// ═══════════════════════════════════════════════

const c3 = document.getElementById("canvas3d");
const ctx3 = c3.getContext("2d");
const W3 = c3.width, H3 = c3.height;

// Предустановленные фигуры
// Порядок вершин задаётся так, чтобы нормаль (cross-product первых 3 вершин)
// смотрела НАРУЖУ от тела (right-hand rule при взгляде снаружи на грань).
const FIGURES = {
    cube: {
        vertices: [
            [-1,-1,-1],[ 1,-1,-1],[ 1, 1,-1],[-1, 1,-1],  // 0-3: z=-1 сторона
            [-1,-1, 1],[ 1,-1, 1],[ 1, 1, 1],[-1, 1, 1]   // 4-7: z=+1 сторона
        ],
        faces: [
            [3,2,1,0], // Зад (z=-1): нормаль (0,0,-1)
            [4,5,6,7], // Перед (z=+1): нормаль (0,0,+1)
            [0,1,5,4], // Низ (y=-1): нормаль (0,-1,0)
            [3,7,6,2], // Верх (y=+1): нормаль (0,+1,0)
            [0,4,7,3], // Лево (x=-1): нормаль (-1,0,0)
            [1,2,6,5]  // Право (x=+1): нормаль (+1,0,0)
        ],
        face_names: ["Зад","Перед","Низ","Верх","Лево","Право"]
    },
    pyramid: {
        vertices: [
            [0, 1.5, 0],                              // 0: вершина
            [-1,-1,-1],[ 1,-1,-1],[ 1,-1, 1],[-1,-1, 1]  // 1-4: основание
        ],
        faces: [
            [1,2,3,4], // Основание (y=-1): нормаль (0,-1,0) наружу
            [0,2,1],   // Грань 1: нормаль наружу (0,+z сторона)
            [0,3,2],   // Грань 2: нормаль наружу (+x сторона)
            [0,4,3],   // Грань 3: нормаль наружу (0,-z сторона)
            [0,1,4]    // Грань 4: нормаль наружу (-x сторона)
        ],
        face_names: ["Основание","Грань 1","Грань 2","Грань 3","Грань 4"]
    }
};

let currentFig = "cube";
let rotX = 0.3, rotY = 0.5;  // небольшой начальный поворот чтобы видеть 3D
let robResult = null;

function matMul(m, v) {
    return [
        m[0]*v[0]+m[1]*v[1]+m[2]*v[2],
        m[3]*v[0]+m[4]*v[1]+m[5]*v[2],
        m[6]*v[0]+m[7]*v[1]+m[8]*v[2]
    ];
}

function rotateY(v, a) {
    const c=Math.cos(a), s=Math.sin(a);
    return matMul([c,0,s, 0,1,0, -s,0,c], v);
}
function rotateX(v, a) {
    const c=Math.cos(a), s=Math.sin(a);
    return matMul([1,0,0, 0,c,-s, 0,s,c], v);
}

function getTransformedVertices() {
    const fig = FIGURES[currentFig];
    const scale = 120;
    return fig.vertices.map(v => {
        let rv = rotateY(v, rotY);
        rv = rotateX(rv, rotX);
        return [rv[0]*scale, rv[1]*scale, rv[2]*scale];
    });
}

function projectPoint(v) {
    const focal = 400;
    const denom = focal - v[2];
    return [
        W3/2 + focal * v[0] / denom,
        H3/2 - focal * v[1] / denom
    ];
}

function drawScene3d() {
    ctx3.clearRect(0, 0, W3, H3);
    const verts3d = getTransformedVertices();
    const pts2d = verts3d.map(projectPoint);
    const fig = FIGURES[currentFig];

    // Сначала рисуем скрытые грани (пунктир)
    for (let fi = 0; fi < fig.faces.length; fi++) {
        const face = fig.faces[fi];
        const faceVerts = face.map(i => pts2d[i]);

        let isVisible = null;
        if (robResult) {
            const match = robResult.faces.find(f => f.face_id === fi);
            if (match) isVisible = match.visible;
        }

        if (isVisible === false) {
            ctx3.save();
            ctx3.beginPath();
            ctx3.moveTo(faceVerts[0][0], faceVerts[0][1]);
            for (let k = 1; k < faceVerts.length; k++) {
                ctx3.lineTo(faceVerts[k][0], faceVerts[k][1]);
            }
            ctx3.closePath();
            ctx3.strokeStyle = "#e74c3c";
            ctx3.lineWidth = 1;
            ctx3.setLineDash([5, 5]);
            ctx3.stroke();
            ctx3.setLineDash([]);
            ctx3.restore();
        }
    }

    // Потом рисуем видимые грани (поверх)
    for (let fi = 0; fi < fig.faces.length; fi++) {
        const face = fig.faces[fi];
        const faceVerts = face.map(i => pts2d[i]);

        let isVisible = null;
        if (robResult) {
            const match = robResult.faces.find(f => f.face_id === fi);
            if (match) isVisible = match.visible;
        }

        ctx3.save();
        ctx3.beginPath();
        ctx3.moveTo(faceVerts[0][0], faceVerts[0][1]);
        for (let k = 1; k < faceVerts.length; k++) {
            ctx3.lineTo(faceVerts[k][0], faceVerts[k][1]);
        }
        ctx3.closePath();

        if (isVisible === null) {
            // Ещё не вычислено — рисуем серым
            ctx3.strokeStyle = "#888";
            ctx3.lineWidth = 1.5;
            ctx3.stroke();
        } else if (isVisible) {
            ctx3.fillStyle = "rgba(41,128,185,0.20)";
            ctx3.fill();
            ctx3.strokeStyle = "#1a6fa8";
            ctx3.lineWidth = 2.5;
            ctx3.stroke();
        }
        // скрытые уже нарисованы выше пунктиром

        // Номер грани в центре
        const cx = faceVerts.reduce((s,p)=>s+p[0],0)/faceVerts.length;
        const cy = faceVerts.reduce((s,p)=>s+p[1],0)/faceVerts.length;
        if (isVisible !== null) {
            ctx3.fillStyle = isVisible ? "#1a5276" : "#922b21";
            ctx3.font = "bold 13px sans-serif";
            ctx3.fillText(fi, cx - 5, cy + 5);
        }
        ctx3.restore();
    }

    // Рёбра куба/пирамиды поверх всего (тонкие чёрные)
    if (!robResult) {
        ctx3.save();
        ctx3.strokeStyle = "#333";
        ctx3.lineWidth = 1;
        for (let fi = 0; fi < fig.faces.length; fi++) {
            const face = fig.faces[fi];
            const faceVerts = face.map(i => pts2d[i]);
            ctx3.beginPath();
            ctx3.moveTo(faceVerts[0][0], faceVerts[0][1]);
            for (let k = 1; k < faceVerts.length; k++) {
                ctx3.lineTo(faceVerts[k][0], faceVerts[k][1]);
            }
            ctx3.closePath();
            ctx3.stroke();
        }
        ctx3.restore();
    }
}

async function computeRoberts() {
    const fig = FIGURES[currentFig];
    const verts3d = getTransformedVertices();

    // Направление взгляда: от наблюдателя (0,0,+∞) к объекту → (0,0,-1)
    const view_dir = [0, 0, -1];

    const resp = await fetch("/lab8/roberts", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            vertices: verts3d,
            faces: fig.faces,
            view_dir: view_dir,
            focal: 400
        })
    });
    const data = await resp.json();
    robResult = data;
    drawScene3d();
    buildTable3d(data.table, fig.face_names);

    const vis = data.faces.filter(f => f.visible).length;
    document.getElementById("result3d").textContent =
        `Видимых граней: ${vis} / ${fig.faces.length}`;
}

function buildTable3d(table, names) {
    let html = `<tr><th>Грань №</th><th>Название</th><th>Вершины</th><th>Нормаль</th><th>dot(n,v)</th><th>Видимость</th></tr>`;
    for (let i = 0; i < table.length; i++) {
        const row = table[i];
        const name = names[i] || "";
        html += `<tr>
            <td>${row["Грань"]}</td>
            <td>${name}</td>
            <td>${row["Вершины"]}</td>
            <td>${row["Нормаль"]}</td>
            <td>${row["dot(n,v)"]}</td>
            <td style="color:${row["Видимость"]==="Видима"?"#1a5276":"#922b21"};font-weight:bold">
                ${row["Видимость"]}
            </td>
        </tr>`;
    }
    document.getElementById("table3d").innerHTML = html;
}

function selectFigure(fig) {
    currentFig = fig;
    robResult = null;
    document.getElementById("result3d").textContent = "";
    document.getElementById("table3d").innerHTML = "";
    drawScene3d();
}

// Вращение мышью
let dragging = false, lastX, lastY;
c3.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
});
c3.addEventListener("mousemove", e => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.01;
    rotX += (e.clientY - lastY) * 0.01;
    lastX = e.clientX; lastY = e.clientY;
    robResult = null;
    drawScene3d();
});
c3.addEventListener("mouseup", () => dragging = false);
c3.addEventListener("mouseleave", () => dragging = false);

// Инициализация
draw2d();
drawScene3d();
switchTab("clip2d");