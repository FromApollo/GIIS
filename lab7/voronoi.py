import math


# ──────────────────────────────────────────────
#  Вспомогательные геометрические функции
# ──────────────────────────────────────────────

def _dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def _circumcircle(a, b, c):
    """Возвращает (cx, cy, r2) описанной окружности треугольника abc.
    Возвращает None если точки коллинеарны."""
    ax, ay = a
    bx, by = b
    cx, cy = c
    D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(D) < 1e-10:
        return None
    ux = ((ax**2 + ay**2) * (by - cy) +
          (bx**2 + by**2) * (cy - ay) +
          (cx**2 + cy**2) * (ay - by)) / D
    uy = ((ax**2 + ay**2) * (cx - bx) +
          (bx**2 + by**2) * (ax - cx) +
          (cx**2 + cy**2) * (bx - ax)) / D
    r2 = (ax - ux)**2 + (ay - uy)**2
    return ux, uy, r2


def _in_circumcircle(a, b, c, p):
    """True если p лежит строго внутри описанной окружности треугольника abc."""
    cc = _circumcircle(a, b, c)
    if cc is None:
        return False
    ux, uy, r2 = cc
    return (p[0] - ux)**2 + (p[1] - uy)**2 < r2 - 1e-10


# ──────────────────────────────────────────────
#  Инкрементальный алгоритм триангуляции Делоне
# ──────────────────────────────────────────────

def delaunay_triangulation(pts):
    """
    Возвращает список треугольников [(i,j,k), ...] и лог шагов.
    pts: список [x, y]
    """
    points = [tuple(p) for p in pts]
    n = len(points)
    if n < 3:
        return [], []

    # Супер-треугольник: достаточно большой, чтобы охватить все точки
    min_x = min(p[0] for p in points)
    max_x = max(p[0] for p in points)
    min_y = min(p[1] for p in points)
    max_y = max(p[1] for p in points)
    dx = max_x - min_x or 1
    dy = max_y - min_y or 1
    delta = max(dx, dy) * 10
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2

    st_a = (cx - 20 * delta, cy - delta)
    st_b = (cx, cy + 20 * delta)
    st_c = (cx + 20 * delta, cy - delta)

    all_pts = list(points) + [st_a, st_b, st_c]
    ia, ib, ic = n, n + 1, n + 2

    # Список треугольников как наборы индексов
    triangles = [(ia, ib, ic)]
    log = []

    for idx, p in enumerate(points):
        # Найти все треугольники, чья описанная окружность содержит p
        bad = []
        for tri in triangles:
            a, b, c = all_pts[tri[0]], all_pts[tri[1]], all_pts[tri[2]]
            if _in_circumcircle(a, b, c, p):
                bad.append(tri)

        # Найти граничный многоугольник (ребра, которые встречаются только один раз)
        edge_count = {}
        for tri in bad:
            edges = [(tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])]
            for e in edges:
                key = tuple(sorted(e))
                edge_count[key] = edge_count.get(key, 0) + 1

        boundary = [e for e, cnt in edge_count.items() if cnt == 1]

        # Удалить плохие треугольники
        for tri in bad:
            triangles.remove(tri)

        # Добавить новые треугольники, соединяя p с граничными рёбрами
        new_tris = []
        for e in boundary:
            new_tri = (idx, e[0], e[1])
            triangles.append(new_tri)
            new_tris.append(new_tri)

        log.append({
            "step": idx + 1,
            "point": list(p),
            "removed": len(bad),
            "added": len(new_tris)
        })

    # Удалить треугольники, содержащие вершины супер-треугольника
    st_indices = {ia, ib, ic}
    result = []
    for tri in triangles:
        if not (tri[0] in st_indices or tri[1] in st_indices or tri[2] in st_indices):
            result.append([tri[0], tri[1], tri[2]])

    return result, log


# ──────────────────────────────────────────────
#  Диаграмма Вороного через двойственность с триангуляцией Делоне
# ──────────────────────────────────────────────

def voronoi_from_delaunay(pts, triangles):
    """
    Строит рёбра диаграммы Вороного как список отрезков.
    Каждое ребро триангуляции порождает отрезок между центрами описанных окружностей
    смежных треугольников (или луч наружу для граничных рёбер).
    """
    points = [tuple(p) for p in pts]

    # Вычислить центры описанных окружностей для каждого треугольника
    centers = []
    for tri in triangles:
        a, b, c = points[tri[0]], points[tri[1]], points[tri[2]]
        cc = _circumcircle(a, b, c)
        if cc:
            centers.append((cc[0], cc[1]))
        else:
            # коллинеарные — берём центроид
            centers.append(((a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3))

    # Для каждого ребра найти смежные треугольники
    edge_to_tris = {}
    for ti, tri in enumerate(triangles):
        edges = [
            tuple(sorted((tri[0], tri[1]))),
            tuple(sorted((tri[1], tri[2]))),
            tuple(sorted((tri[2], tri[0]))),
        ]
        for e in edges:
            edge_to_tris.setdefault(e, []).append(ti)

    segments = []
    for e, tris in edge_to_tris.items():
        if len(tris) == 2:
            # Внутреннее ребро: отрезок между двумя центрами
            c0 = centers[tris[0]]
            c1 = centers[tris[1]]
            segments.append({
                "type": "segment",
                "x1": c0[0], "y1": c0[1],
                "x2": c1[0], "y2": c1[1]
            })
        else:
            # Граничное ребро: луч из центра описанной окружности
            # перпендикулярно ребру триангуляции наружу
            ti = tris[0]
            cx, cy = centers[ti]
            p0 = points[e[0]]
            p1 = points[e[1]]
            mx = (p0[0] + p1[0]) / 2
            my = (p0[1] + p1[1]) / 2
            # Направление: от центра треугольника через середину ребра
            dx = mx - ((points[triangles[ti][0]][0] + points[triangles[ti][1]][0] + points[triangles[ti][2]][0]) / 3)
            dy = my - ((points[triangles[ti][0]][1] + points[triangles[ti][1]][1] + points[triangles[ti][2]][1]) / 3)
            length = math.hypot(dx, dy) or 1
            # Луч длиной 1000 (будет обрезан canvas-ом)
            scale = 2000 / length
            segments.append({
                "type": "ray",
                "x1": cx, "y1": cy,
                "x2": cx + dx * scale, "y2": cy + dy * scale
            })

    return segments
