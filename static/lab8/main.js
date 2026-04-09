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

// --- Roberts (Three.js state) ---
let rob = { viewDir: [-1, 0, -1], results: [] };
let robThree = null;   // хранит Three.js объекты

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

// ══════════════════════════════════════════════════════════════
//  Roberts 3D — Three.js
// ══════════════════════════════════════════════════════════════

async function initRoberts3D() {
    if (robThree) return;

    const W = canvas.offsetWidth  || canvas.width;
    const H = canvas.offsetHeight || canvas.height;

    const container = document.createElement("div");
    container.id = "rob-three-container";
    container.style.cssText = [
        `width:${W}px`, `height:${H}px`,
        "border:1px solid #aaa", "display:block",
        "margin-top:6px", "position:relative",
    ].join(";");
    canvas.parentNode.insertBefore(container, canvas.nextSibling);

    const hint = document.createElement("div");
    hint.style.cssText = [
        "position:absolute", "bottom:12px", "right:12px",
        "background:rgba(0,0,0,.6)", "color:#ccc",
        "font:11px monospace", "padding:5px 10px",
        "border-radius:5px", "pointer-events:none",
    ].join(";");
    hint.textContent = "🖱 ЛКМ: вращение | ПКМ: сдвиг | Scroll: масштаб";
    container.appendChild(hint);

    try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        const { LineMaterial }       = await import("three/addons/lines/LineMaterial.js");
        const { LineSegments2 }      = await import("three/addons/lines/LineSegments2.js");
        const { LineSegmentsGeometry } = await import("three/addons/lines/LineSegmentsGeometry.js");

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        camera.position.set(4, 3, 5);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.sortObjects = true;
        renderer.domElement.style.display = "block";
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 1.5;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.target.set(0, 0, 0);

        const verts = [
            [-1,-1, 1], [ 1,-1, 1], [ 1, 1, 1], [-1, 1, 1],
            [-1,-1,-1], [ 1,-1,-1], [ 1, 1,-1], [-1, 1,-1],
        ];

        const faceDefs = [
            { indices:[0,1,2,3], color:0xffffff, normal:[ 0, 0, 1], name:"Передняя" },
            { indices:[4,7,6,5], color:0xffffff, normal:[ 0, 0,-1], name:"Задняя"   },
            { indices:[0,4,5,1], color:0xffffff, normal:[ 0,-1, 0], name:"Нижняя"   },
            { indices:[2,6,7,3], color:0xffffff, normal:[ 0, 1, 0], name:"Верхняя"  },
            { indices:[0,3,7,4], color:0xffffff, normal:[-1, 0, 0], name:"Левая"    },
            { indices:[1,5,6,2], color:0xffffff, normal:[ 1, 0, 0], name:"Правая"   },
        ];

        function createRobQuadMesh(verts, indices, color, normalArr) {
            const [v0, v1, v2, v3] = indices.map(i => verts[i]);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
                v0[0], v0[1], v0[2], v1[0], v1[1], v1[2],
                v2[0], v2[1], v2[2], v3[0], v3[1], v3[2],
            ]), 3));
            geometry.setIndex([0, 1, 2, 0, 2, 3]);
            geometry.computeVertexNormals();

            const material = new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.normal = new THREE.Vector3(...normalArr).normalize();
            return mesh;
        }

        const meshes = [];
        faceDefs.forEach(fd => {
            const mesh = createRobQuadMesh(verts, fd.indices, fd.color, fd.normal);
            mesh.userData.faceName = fd.name;
            scene.add(mesh);
            meshes.push(mesh);
        });

        // ─── толстые рёбра через LineMaterial ───────────────────
        const edgesGeo = new THREE.BoxGeometry(2, 2, 2);
        const edgesBase = new THREE.EdgesGeometry(edgesGeo);
        const lineGeo = new LineSegmentsGeometry().fromEdgesGeometry(edgesBase);
        const lineMat = new LineMaterial({
            color: 0x000000,
            linewidth: 3,
            resolution: new THREE.Vector2(W, H),
        });
        const edges = new LineSegments2(lineGeo, lineMat);
        scene.add(edges);

        const axes = new THREE.AxesHelper(3);
        axes.material.transparent = true;
        axes.material.opacity = 0.15;
        scene.add(axes);

        function updateVisibilityRoberts() {
            const transparent = document.getElementById("rob-transparent")?.checked ?? true;
            const camPos = camera.position;
            meshes.forEach(mesh => {
                const n = mesh.userData.normal;
                if (!n) return;
                const pos = mesh.geometry.attributes.position.array;
                const cnt = pos.length / 3;
                const center = new THREE.Vector3();
                for (let i = 0; i < cnt; i++) {
                    center.x += pos[i * 3];
                    center.y += pos[i * 3 + 1];
                    center.z += pos[i * 3 + 2];
                }
                center.divideScalar(cnt);
                const viewDir = new THREE.Vector3().subVectors(camPos, center).normalize();
                const visible = n.dot(viewDir) > 0;

                if (transparent) {
                    // полупрозрачный режим: видимые — синие, скрытые — тёмные и прозрачные
                    mesh.material.color.set(visible ? 0x457b9d : 0x222222);
                    mesh.material.transparent = true;
                    mesh.material.depthWrite  = true;
                    mesh.material.opacity     = visible ? 0.9 : 0.45;
                    mesh.visible = true;
                } else {
                    // непрозрачный режим: скрытые грани полностью не рисуются
                    mesh.material.color.set(0x457b9d);
                    mesh.material.transparent = false;
                    mesh.material.depthWrite  = true;
                    mesh.material.opacity     = 1.0;
                    mesh.visible = visible;
                }
            });
        }

        let animId;
        function animate() {
            animId = requestAnimationFrame(animate);
            controls.update();
            updateVisibilityRoberts();
            renderer.render(scene, camera);
        }
        animate();

        robThree = { container, renderer, scene, camera, controls, meshes, animId, THREE };
        setStatus("Алгоритм Робертса активен. Синие грани — видимые. Вращайте куб мышью.");

    } catch (err) {
        console.error("Three.js load error:", err);
        container.innerHTML = `<p style="color:red;padding:20px;">Ошибка: ${err.message}</p>`;
    }
}

/** Уничтожает Three.js сцену и восстанавливает 2D canvas. */
function destroyRoberts3D() {
    if (!robThree) return;
    cancelAnimationFrame(robThree.animId);
    robThree.renderer.dispose();
    if (robThree.container && robThree.container.parentNode)
        robThree.container.parentNode.removeChild(robThree.container);
    robThree = null;
}

/** Заглушка — рендеринг Робертса ведёт Three.js, не 2D ctx. */
function drawRoberts() { /* Three.js управляет своим canvas */ }

// ─── главный redraw ──────────────────────────
function redraw() {
    if      (tab === "cs")  drawCS();
    else if (tab === "mid") drawMid();
    else if (tab === "cb")  drawCB();
    // "rob" — Three.js рендерит независимо
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

    if (t === "rob") {
        canvas.style.display = "none";
        initRoberts3D();
    } else {
        destroyRoberts3D();
        canvas.style.display = "block";
        redraw();
    }
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
    let vx, vy, vz;

    if (robThree && robThree.camera) {
        const cam = robThree.camera.position;
        const len = Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z) || 1;
        vx = cam.x / len;
        vy = cam.y / len;
        vz = cam.z / len;
    } else {
        vx = -1; vy = 0; vz = -1;
    }

    rob.viewDir = [vx, vy, vz];

    fetch("/lab8/roberts", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ view_dir: rob.viewDir })
    }).then(r => r.json()).then(data => {
        rob.results = data.results;
        buildTable(data.table);
        const vis = data.results.filter(r => r.visible).map(r => r.name);
        setResult(`Видимые грани: ${vis.join(", ") || "нет"}`);
    });
}

// ─── вспомогательные ─────────────────────────
function setStatus(msg) { document.getElementById("status").textContent = msg; }
function setResult(msg)  { document.getElementById("result").textContent = msg; }

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

    if (tab === "rob") {
        destroyRoberts3D();
        initRoberts3D();
    }

    setStatus("Готов");
    redraw();
}

// ─── инициализация ───────────────────────────
switchTab("cs");