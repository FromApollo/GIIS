import math


# ═══════════════════════════════════════════════════════════
#  Часть 1: Отсечение отрезков (2D)
# ═══════════════════════════════════════════════════════════

# ── Алгоритм Коэна–Сазерленда ──────────────────────────────

INSIDE = 0
LEFT   = 1
RIGHT  = 2
BOTTOM = 4
TOP    = 8


def _compute_code(x, y, xmin, ymin, xmax, ymax):
    code = INSIDE
    if x < xmin:   code |= LEFT
    elif x > xmax: code |= RIGHT
    if y < ymin:   code |= BOTTOM
    elif y > ymax: code |= TOP
    return code


def _code_name(code):
    parts = []
    if code & TOP:    parts.append("В")
    if code & BOTTOM: parts.append("Н")
    if code & RIGHT:  parts.append("П")
    if code & LEFT:   parts.append("Л")
    return "".join(parts) if parts else "0000"


def cohen_sutherland(x0, y0, x1, y1, xmin, ymin, xmax, ymax):
    """
    Возвращает {'visible': bool, 'x0','y0','x1','y1', 'table': [...]}
    """
    table = []
    step = 0

    code0 = _compute_code(x0, y0, xmin, ymin, xmax, ymax)
    code1 = _compute_code(x1, y1, xmin, ymin, xmax, ymax)

    while True:
        step += 1
        table.append({
            "step": step,
            "P1": f"({x0:.1f},{y0:.1f})",
            "P2": f"({x1:.1f},{y1:.1f})",
            "code1": f"{code0:04b} ({_code_name(code0)})",
            "code2": f"{code1:04b} ({_code_name(code1)})",
            "action": ""
        })

        if not (code0 | code1):          # оба внутри
            table[-1]["action"] = "Тривиально видим"
            return {"visible": True,
                    "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                    "table": table}

        if code0 & code1:                # оба по одну сторону
            table[-1]["action"] = "Тривиально невидим"
            return {"visible": False,
                    "x0": x0, "y0": y0, "x1": x1, "y1": y1,
                    "table": table}

        # Пересечение
        code_out = code0 if code0 else code1
        if code_out & TOP:
            x = x0 + (x1 - x0) * (ymax - y0) / (y1 - y0) if (y1 - y0) else x0
            y = ymax
        elif code_out & BOTTOM:
            x = x0 + (x1 - x0) * (ymin - y0) / (y1 - y0) if (y1 - y0) else x0
            y = ymin
        elif code_out & RIGHT:
            y = y0 + (y1 - y0) * (xmax - x0) / (x1 - x0) if (x1 - x0) else y0
            x = xmax
        else:  # LEFT
            y = y0 + (y1 - y0) * (xmin - x0) / (x1 - x0) if (x1 - x0) else y0
            x = xmin

        table[-1]["action"] = f"Пересечение → ({x:.1f},{y:.1f})"

        if code_out == code0:
            x0, y0 = x, y
            code0 = _compute_code(x0, y0, xmin, ymin, xmax, ymax)
        else:
            x1, y1 = x, y
            code1 = _compute_code(x1, y1, xmin, ymin, xmax, ymax)

        if step > 20:  # защита от бесконечного цикла
            break

    return {"visible": False, "x0": x0, "y0": y0, "x1": x1, "y1": y1, "table": table}


# ── Алгоритм Кируса–Бэка ──────────────────────────────────

def cyrus_beck(x0, y0, x1, y1, xmin, ymin, xmax, ymax):
    """
    Параметрическое отсечение Кируса–Бэка для прямоугольного выпуклого окна.
    P(t) = P0 + t*D, 0 <= t <= 1.
    Внутренние нормали к сторонам:
      Левая   (x=xmin): n=( 1, 0) — внутрь вправо
      Правая  (x=xmax): n=(-1, 0) — внутрь влево
      Верхняя (y=ymin): n=( 0, 1) — внутрь вниз (canvas: y растёт вниз)
      Нижняя  (y=ymax): n=( 0,-1) — внутрь вверх
    Условие нахождения P(t) внутри полуплоскости: n·(P(t)−f) >= 0
    => n·W + t·(n·D) >= 0  где W = P0 − f
    => если n·D > 0: t >= −n·W / n·D  → tL = max(tL, t)
       если n·D < 0: t <= −n·W / n·D  → tU = min(tU, t)
       если n·D = 0: параллельно; если n·W < 0 — весь отрезок снаружи
    """
    D = [x1 - x0, y1 - y0]
    normals = [( 1, 0), (-1, 0), ( 0, 1), ( 0,-1)]
    f_pts   = [(xmin, ymin), (xmax, ymin), (xmin, ymin), (xmin, ymax)]
    names   = ["Левая", "Правая", "Верхняя", "Нижняя"]

    tL = 0.0   # нижняя граница параметра
    tU = 1.0   # верхняя граница параметра
    table = []

    for n, f, name in zip(normals, f_pts, names):
        W  = [x0 - f[0], y0 - f[1]]
        nD = n[0]*D[0] + n[1]*D[1]
        nW = n[0]*W[0] + n[1]*W[1]

        if abs(nD) < 1e-12:
            # Параллельно ребру: проверяем, внутри ли
            if nW < 0:
                tL, tU = 1.0, 0.0   # весь отрезок снаружи
            status = "Параллельно"
            t = None
        else:
            t = -nW / nD
            if nD > 0:
                tL = max(tL, t)
                status = f"tL ← {t:.4f}"
            else:
                tU = min(tU, t)
                status = f"tU ← {t:.4f}"

        table.append({
            "edge": name,
            "n": str(n),
            "nD": round(nD, 4),
            "nW": round(nW, 4),
            "t": f"{t:.4f}" if t is not None else "—",
            "status": status,
            "tL": round(tL, 4),
            "tU": round(tU, 4)
        })

    visible = tL <= tU
    if visible:
        cx0 = x0 + tL * D[0]
        cy0 = y0 + tL * D[1]
        cx1 = x0 + tU * D[0]
        cy1 = y0 + tU * D[1]
    else:
        cx0, cy0, cx1, cy1 = x0, y0, x1, y1

    return {
        "visible": visible,
        "x0": cx0, "y0": cy0, "x1": cx1, "y1": cy1,
        "tL": round(tL, 4), "tU": round(tU, 4),
        "table": table
    }


# ═══════════════════════════════════════════════════════════
#  Часть 2: Удаление невидимых граней (алгоритм Робертса, 3D)
# ═══════════════════════════════════════════════════════════

def _dot3(a, b):
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]


def _cross3(a, b):
    return (
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    )


def _sub3(a, b):
    return (a[0]-b[0], a[1]-b[1], a[2]-b[2])


def _norm3(v):
    n = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
    if n < 1e-12:
        return (0, 0, 0)
    return (v[0]/n, v[1]/n, v[2]/n)


def _face_normal(v0, v1, v2):
    """Нормаль к грани через три вершины."""
    a = _sub3(v1, v0)
    b = _sub3(v2, v0)
    return _cross3(a, b)


def roberts_visibility(vertices, faces, view_dir):
    """
    vertices: [[x,y,z], ...]
    faces: [[i0,i1,i2,...], ...]  (индексы вершин)
    view_dir: [dx, dy, dz]  (направление взгляда ОТ наблюдателя К объекту)

    Грань ВИДИМА если её нормаль (наружу) образует угол < 90° с вектором,
    направленным ОТ грани К наблюдателю, то есть dot(n, -view_dir) > 0,
    что эквивалентно dot(n, view_dir) < 0.

    Возвращает список граней с пометкой visible/hidden и таблицу.
    """
    vd = tuple(view_dir)
    vd_norm = _norm3(vd)

    result = []
    table = []

    for fi, face in enumerate(faces):
        verts = [tuple(vertices[i]) for i in face]

        # Нормаль к грани (по первым трём вершинам)
        n_raw = _face_normal(verts[0], verts[1], verts[2])
        n_norm = _norm3(n_raw)

        # Скалярное произведение нормали и вектора наблюдения
        # dot < 0  → нормаль смотрит ПРОТИВ направления взгляда → к наблюдателю → ВИДИМА
        # dot > 0  → нормаль смотрит В сторону взгляда → от наблюдателя → СКРЫТА
        # dot == 0 → грань ребром к наблюдателю → считаем невидимой
        dot = _dot3(n_norm, vd_norm)

        visible = dot < 0

        result.append({
            "face_id": fi,
            "indices": face,
            "visible": visible
        })

        table.append({
            "Грань": fi,
            "Вершины": str(face),
            "Нормаль": f"({n_norm[0]:.3f}, {n_norm[1]:.3f}, {n_norm[2]:.3f})",
            "dot(n,v)": round(dot, 4),
            "Видимость": "Видима" if visible else "Скрыта"
        })

    return result, table


def project_perspective(vertices, d=400):
    """
    Перспективная проекция: камера смотрит вдоль -Z,
    d — фокусное расстояние.
    Возвращает список [x2d, y2d].
    """
    projected = []
    for v in vertices:
        x, y, z = v
        denom = (d - z) if abs(d - z) > 1e-6 else 1e-6
        px = d * x / denom
        py = d * y / denom
        projected.append([px, py])
    return projected