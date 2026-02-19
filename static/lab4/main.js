const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d');
const fileSelect = document.getElementById('fileSelect');

let vertices = [];
let edges = [];
let modelMatrix = mat4.create();
let usePerspective = true;

// 1. При загрузке страницы получаем список файлов
fetch('/lab4/list_files')
    .then(r => r.json())
    .then(data => {
        fileSelect.innerHTML = ''; // Очищаем
        data.files.forEach(file => {
            let opt = document.createElement('option');
            opt.value = file;
            opt.innerHTML = file;
            fileSelect.appendChild(opt);
        });
        // Загружаем первый файл из списка по умолчанию
        if (data.files.length > 0) loadSelectedFile();
    });

// 2. Функция загрузки конкретного файла
function loadSelectedFile() {
    const filename = fileSelect.value;
    if (!filename) return;

    fetch(`/lab4/data/${filename}`)
        .then(r => r.json())
        .then(data => {
            vertices = data.vertices;
            edges = data.edges;
            // Сбрасываем матрицу при переключении модели, чтобы она была в центре
            mat4.identity(modelMatrix);
            render();
        });
}

function resetModel() {
    mat4.identity(modelMatrix);
    render();
}

// --- Функции отрисовки (project, drawAxes, render) остаются такими же как были ---
function project(v, matrix, center, d) {
    let vec = vec4.fromValues(v[0], v[1], v[2], 1);
    vec4.transformMat4(vec, vec, matrix);
    let x = vec[0], y = vec[1], z = vec[2];

    if (usePerspective) {
        let f = d / (d + z);
        if (d + z <= 0) f = 0;
        return { x: x * f + center.x, y: -y * f + center.y };
    } else {
        return { x: x + center.x, y: -y + center.y };
    }
}

function drawAxes(matrix, center, d) {
    const axisLen = 120;
    const p0 = project([0,0,0], matrix, center, d);
    const pX = project([axisLen,0,0], matrix, center, d);
    const pY = project([0,axisLen,0], matrix, center, d);
    const pZ = project([0,0,axisLen], matrix, center, d);

    ctx.font = "bold 14px Arial";
    ctx.fillStyle = "#333333"; // Тёмно-серый/чёрный цвет для букв

    // X - Красный (чуть темнее для лучшей видимости на белом)
    ctx.strokeStyle = '#cc0000';
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pX.x, pX.y); ctx.stroke();
    ctx.fillText("X", pX.x + 5, pX.y);

    // Y - Зеленый
    ctx.strokeStyle = '#008800';
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pY.x, pY.y); ctx.stroke();
    ctx.fillText("Y", pY.x + 5, pY.y);

    // Z - Синий
    ctx.strokeStyle = '#0000cc';
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(pZ.x, pZ.y); ctx.stroke();
    ctx.fillText("Z", pZ.x + 5, pZ.y);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const d = 400;

    drawAxes(modelMatrix, center, d);

    const projected = vertices.map(v => project(v, modelMatrix, center, d));

    // Цвет самого объекта — теперь сделаем его тёмным (например, тёмно-синим или чёрным)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    edges.forEach(e => {
        const p1 = projected[e[0]];
        const p2 = projected[e[1]];
        if (p1 && p2) { // Проверка на выход за пределы проекции
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    });
}
// Обработчик клавиш остается прежним, только вызываем render() в конце
window.addEventListener('keydown', e => {
    let step = 5;
    let angle = 0.05;
    let trans = mat4.create();

    switch(e.code) {
        case 'ArrowLeft':  mat4.fromTranslation(trans, [-step, 0, 0]); break;
        case 'ArrowRight': mat4.fromTranslation(trans, [step, 0, 0]); break;
        case 'ArrowUp':    mat4.fromTranslation(trans, [0, step, 0]); break;
        case 'ArrowDown':  mat4.fromTranslation(trans, [0, -step, 0]); break;
        case 'PageUp':     mat4.fromTranslation(trans, [0, 0, step]); break;
        case 'PageDown':   mat4.fromTranslation(trans, [0, 0, -step]); break;
        case 'KeyW': mat4.fromXRotation(trans, angle); break;
        case 'KeyS': mat4.fromXRotation(trans, -angle); break;
        case 'KeyA': mat4.fromYRotation(trans, angle); break;
        case 'KeyD': mat4.fromYRotation(trans, -angle); break;
        case 'KeyZ': mat4.fromZRotation(trans, angle); break;
        case 'KeyX': mat4.fromZRotation(trans, -angle); break;
        case 'Equal': mat4.fromScaling(trans, [1.1, 1.1, 1.1]); break;
        case 'Minus': mat4.fromScaling(trans, [0.9, 0.9, 0.9]); break;
        case 'KeyP': usePerspective = !usePerspective; break;
        case 'KeyR': resetModel(); return;
    }

    mat4.multiply(modelMatrix, trans, modelMatrix);
    render();
});