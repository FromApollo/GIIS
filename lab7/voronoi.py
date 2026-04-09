import math


# ─────────────────────────────────────────────
#  Вспомогательные функции
# ─────────────────────────────────────────────

def circumcircle(p1, p2, p3):
    """Возвращает (cx, cy, r) описанной окружности треугольника."""
    ax, ay = p1
    bx, by = p2
    cx, cy = p3

    D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(D) < 1e-10:
        return None

    ux = ((ax ** 2 + ay ** 2) * (by - cy) +
          (bx ** 2 + by ** 2) * (cy - ay) +
          (cx ** 2 + cy ** 2) * (ay - by)) / D
    uy = ((ax ** 2 + ay ** 2) * (cx - bx) +
          (bx ** 2 + by ** 2) * (ax - cx) +
          (cx ** 2 + cy ** 2) * (bx - ax)) / D

    r = math.hypot(ax - ux, ay - uy)
    return (ux, uy, r)


def point_in_circumcircle(p, tri_pts):
    """Проверка, находится ли точка внутри описанной окружности треугольника."""
    cc = circumcircle(*tri_pts)
    if cc is None:
        return False
    ux, uy, r = cc
    return math.hypot(p[0] - ux, p[1] - uy) < r - 1e-10


def _clip_ray_to_box(ox, oy, dx, dy, x0, y0, x1, y1):
    """Обрезает луч (ox,oy)+t*(dx,dy), t>=0 до прямоугольника."""
    t_min = 0
    t_max = 1e18

    # Обрезка по x
    if abs(dx) > 1e-12:
        t1 = (x0 - ox) / dx
        t2 = (x1 - ox) / dx
        if t1 > t2:
            t1, t2 = t2, t1
        t_min = max(t_min, t1)
        t_max = min(t_max, t2)

    # Обрезка по y
    if abs(dy) > 1e-12:
        t1 = (y0 - oy) / dy
        t2 = (y1 - oy) / dy
        if t1 > t2:
            t1, t2 = t2, t1
        t_min = max(t_min, t1)
        t_max = min(t_max, t2)

    if t_min >= t_max or t_max <= 0:
        return None

    # Возвращаем точку в конце луча, обрезанную по bbox
    if t_max < 1e17:
        return [ox + dx * t_max, oy + dy * t_max]
    return None


def is_edge_on_convex_hull(points, edge):
    """Проверяет, является ли ребро частью выпуклой оболочки."""
    # Простая проверка: ребро на оболочке, если все остальные точки лежат по одну сторону
    p1, p2 = edge
    x1, y1 = p1
    x2, y2 = p2

    # Вектор ребра
    vx, vy = x2 - x1, y2 - y1

    # Нормаль к ребру
    nx, ny = -vy, vx

    # Нормализуем
    ln = math.hypot(nx, ny)
    if ln < 1e-12:
        return False
    nx /= ln
    ny /= ln

    # Проверяем знак для всех остальных точек
    first_sign = None
    for p in points:
        if (p[0] == x1 and p[1] == y1) or (p[0] == x2 and p[1] == y2):
            continue
        # Вектор от p1 к точке
        wx, wy = p[0] - x1, p[1] - y1
        dot = wx * nx + wy * ny

        sign = 1 if dot > 0 else (-1 if dot < 0 else 0)
        if first_sign is None:
            first_sign = sign
        elif sign != 0 and sign != first_sign:
            return False
    return True


# ─────────────────────────────────────────────
#  Алгоритм Боуэра–Уотсона
# ─────────────────────────────────────────────

def bowyer_watson(points):
    if len(points) < 3:
        return [], []

    pts = [list(p) for p in points]

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    dx = max_x - min_x or 1
    dy = max_y - min_y or 1
    delta = max(dx, dy) * 10

    # Супертреугольник, содержащий все точки
    st = [
        [min_x - delta, min_y - delta],
        [min_x + 2 * delta, min_y - delta],
        [min_x + delta / 2, min_y + 2 * delta],
    ]
    n = len(pts)
    all_pts = pts + st
    si0, si1, si2 = n, n + 1, n + 2

    triangles = {(si0, si1, si2)}
    table = []

    for idx, p in enumerate(pts):
        px, py = p

        bad = set()
        for tri in triangles:
            tri_pts_c = [all_pts[t] for t in tri]
            if point_in_circumcircle([px, py], tri_pts_c):
                bad.add(tri)

        boundary = []
        for tri in bad:
            for i in range(3):
                edge = (tri[i], tri[(i + 1) % 3])
                # Проверяем, является ли ребро общим для двух плохих треугольников
                shared = False
                for other in bad:
                    if other is tri:
                        continue
                    rev = (edge[1], edge[0])
                    if (edge in [(other[j], other[(j + 1) % 3]) for j in range(3)] or
                            rev in [(other[j], other[(j + 1) % 3]) for j in range(3)]):
                        shared = True
                        break
                if not shared:
                    boundary.append(edge)

        triangles -= bad
        for e in boundary:
            triangles.add(tuple(sorted([idx, e[0], e[1]])))

        cc_info = []
        for tri in list(triangles)[:3]:
            cc = circumcircle(*[all_pts[t] for t in tri])
            if cc:
                cc_info.append(f"({cc[0]:.1f},{cc[1]:.1f}) r={cc[2]:.1f}")

        table.append({
            "Шаг": idx + 1,
            "Точка": f"({px},{py})",
            "Плохих △": len(bad),
            "Рёбер границы": len(boundary),
            "Всего △": len(triangles),
            "Примеры окружностей": "; ".join(cc_info),
        })

    super_verts = {si0, si1, si2}
    result = [tri for tri in triangles if not (set(tri) & super_verts)]

    triangles_coords = [
        [[pts[i][0], pts[i][1]],
         [pts[j][0], pts[j][1]],
         [pts[k][0], pts[k][1]]]
        for (i, j, k) in result
    ]
    return triangles_coords, table


# ─────────────────────────────────────────────
#  Диаграмма Вороного (исправленная версия)
# ─────────────────────────────────────────────

def voronoi_from_delaunay(points, triangles_coords):
    """
    Строит диаграмму Вороного по триангуляции Делоне.
    Возвращает: edges, centers, table
    """
    if not triangles_coords:
        return [], [], []

    # 1. Центры описанных окружностей (вершины Вороного)
    centers = []
    table = []
    for i, tri in enumerate(triangles_coords):
        cc = circumcircle(tri[0], tri[1], tri[2])
        if cc:
            cx, cy, r = cc
            centers.append([cx, cy])
            table.append({
                "△": i + 1,
                "V1": f"({tri[0][0]},{tri[0][1]})",
                "V2": f"({tri[1][0]},{tri[1][1]})",
                "V3": f"({tri[2][0]},{tri[2][1]})",
                "Центр (cx,cy)": f"({cx:.2f},{cy:.2f})",
                "Радиус r": f"{r:.2f}",
            })
        else:
            centers.append(None)

    # 2. Создаем карту: ребро (упорядоченная пара вершин) → список индексов треугольников
    # Используем frozenset для неупорядоченного сравнения
    edge_to_tris = {}
    for ti, tri in enumerate(triangles_coords):
        if centers[ti] is None:
            continue
        for k in range(3):
            a = tuple(tri[k])
            b = tuple(tri[(k + 1) % 3])
            key = frozenset([a, b])
            edge_to_tris.setdefault(key, []).append(ti)

    # 3. Определяем границы для обрезки лучей
    all_x = [p[0] for p in points]
    all_y = [p[1] for p in points]
    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    span = max(max_x - min_x, max_y - min_y, 10)
    pad = span * 2.0
    bx0, bx1 = min_x - pad, max_x + pad
    by0, by1 = min_y - pad, max_y + pad

    # 4. Сборка рёбер Вороного
    edges = []

    # Определяем, какие точки на выпуклой оболочке
    hull_points = set()
    points_set = [tuple(p) for p in points]

    for edge_key, tris in edge_to_tris.items():
        if len(tris) == 2:
            # Внутреннее ребро: соединяем центры двух смежных треугольников
            ti, tj = tris[0], tris[1]
            ci, cj = centers[ti], centers[tj]
            if ci is not None and cj is not None:
                edges.append([ci, cj])

        elif len(tris) == 1:
            # Ребро на границе выпуклой оболочки: нужно построить луч
            ti = tris[0]
            ci = centers[ti]
            if ci is None:
                continue

            # Получаем вершины ребра
            verts = list(edge_key)
            p1, p2 = verts[0], verts[1]

            # Находим третью вершину треугольника
            tri_verts = triangles_coords[ti]
            # Находим вершину, которая не входит в это ребро
            tri_set = {tuple(v) for v in tri_verts}
            edge_set = {p1, p2}
            third_vert = list(tri_set - edge_set)[0]

            # Вычисляем середину ребра
            mx = (p1[0] + p2[0]) / 2.0
            my = (p1[1] + p2[1]) / 2.0

            # Вектор от середины ребра к центру описанной окружности
            vx = ci[0] - mx
            vy = ci[1] - my

            # Нормаль к ребру (перпендикуляр)
            edx, edy = p2[0] - p1[0], p2[1] - p1[1]
            # Две возможные нормали
            nx1, ny1 = -edy, edx
            nx2, ny2 = edy, -edx

            # Нормализуем
            ln1 = math.hypot(nx1, ny1)
            if ln1 > 1e-12:
                nx1 /= ln1
                ny1 /= ln1
            ln2 = math.hypot(nx2, ny2)
            if ln2 > 1e-12:
                nx2 /= ln2
                ny2 /= ln2

            # Выбираем нормаль, которая указывает наружу
            # Вектор от центра треугольника к третьей вершине
            # Вычисляем центр треугольника
            tri_center_x = (p1[0] + p2[0] + third_vert[0]) / 3.0
            tri_center_y = (p1[1] + p2[1] + third_vert[1]) / 3.0

            # Вектор от середины ребра к центру треугольника
            to_tri_center_x = tri_center_x - mx
            to_tri_center_y = tri_center_y - my

            # Выбираем нормаль, противоположную направлению к центру треугольника
            dot1 = to_tri_center_x * nx1 + to_tri_center_y * ny1
            dot2 = to_tri_center_x * nx2 + to_tri_center_y * ny2

            # Берем нормаль, указывающую наружу (отрицательный скаляр)
            if dot1 < dot2:
                nx, ny = nx1, ny1
            else:
                nx, ny = nx2, ny2

            # Строим луч от центра Вороного вдоль нормали
            end = _clip_ray_to_box(ci[0], ci[1], nx, ny, bx0, by0, bx1, by1)
            if end is not None:
                edges.append([ci, end])

                # Добавляем также луч в противоположном направлении для полноты
                # (иногда нужно для визуализации границ)
                # Но для простоты оставляем один луч от центра

    # Удаляем дублирующиеся ребра
    unique_edges = []
    for e in edges:
        # Проверяем, нет ли уже такого ребра (в любом направлении)
        is_duplicate = False
        for ue in unique_edges:
            if (abs(ue[0][0] - e[0][0]) < 1e-10 and abs(ue[0][1] - e[0][1]) < 1e-10 and
                    abs(ue[1][0] - e[1][0]) < 1e-10 and abs(ue[1][1] - e[1][1]) < 1e-10):
                is_duplicate = True
                break
            if (abs(ue[0][0] - e[1][0]) < 1e-10 and abs(ue[0][1] - e[1][1]) < 1e-10 and
                    abs(ue[1][0] - e[0][0]) < 1e-10 and abs(ue[1][1] - e[0][1]) < 1e-10):
                is_duplicate = True
                break
        if not is_duplicate:
            unique_edges.append(e)

    valid_centers = [c for c in centers if c is not None]
    return unique_edges, valid_centers, table