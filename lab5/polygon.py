import math


def check_convexity(vertices):
    n = len(vertices)
    if n < 3:
        return {"status": "Недостаточно вершин", "convex": False}, []

    cross_list = []
    table = []

    for i in range(n):
        v0 = vertices[i]
        v1 = vertices[(i + 1) % n]
        v2 = vertices[(i + 2) % n]

        dx1 = v1[0] - v0[0]
        dy1 = v1[1] - v0[1]
        dx2 = v2[0] - v1[0]
        dy2 = v2[1] - v1[1]

        cross = dx1 * dy2 - dy1 * dx2
        cross_list.append(cross)

        table.append({
            "i": i,
            "V_i": f"({v0[0]},{v0[1]})",
            "V_i+1": f"({v1[0]},{v1[1]})",
            "V_i+2": f"({v2[0]},{v2[1]})",
            "ВП": round(cross, 4)
        })

    pos   = sum(1 for c in cross_list if c > 0)
    neg   = sum(1 for c in cross_list if c < 0)
    zeros = sum(1 for c in cross_list if c == 0)

    if zeros == n:
        status, convex = "Вырождён в отрезок", False
    elif pos > 0 and neg > 0:
        status, convex = "Вогнутый (есть + и − знаки)", False
    elif neg == 0:
        status, convex = "Выпуклый (нормали влево)", True
    else:
        status, convex = "Выпуклый (нормали вправо)", True

    return {"status": status, "convex": convex}, table


def find_inner_normals(vertices):
    n = len(vertices)
    normals = []
    table = []

    for i in range(n):
        v0 = vertices[i]
        v1 = vertices[(i + 1) % n]
        v2 = vertices[(i + 2) % n]

        vx, vy = v1[0] - v0[0], v1[1] - v0[1]   # вектор стороны
        cx, cy = v2[0] - v0[0], v2[1] - v0[1]   # хорда

        nx, ny = -vy, vx                           # перпендикуляр

        dot = nx * cx + ny * cy
        if dot < 0:
            nx, ny = -nx, -ny

        normals.append([nx, ny])
        table.append({
            "i": i,
            "сторона": f"V{i}–V{(i+1)%n}",
            "нормаль": f"[{nx},{ny}]",
            "ск.пр.": round(dot, 4),
            "ориентация": "внутрь" if dot >= 0 else "перевёрнута"
        })

    return normals, table


def graham_scan(points):
    if len(points) < 3:
        return list(points), []

    pts = [list(p) for p in points]
    p0 = min(pts, key=lambda p: (p[1], p[0]))
    others = [p for p in pts if p != p0]
    others.sort(key=lambda p: (
        math.atan2(p[1] - p0[1], p[0] - p0[0]),
        (p[0] - p0[0]) ** 2 + (p[1] - p0[1]) ** 2
    ))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    stack = [p0, others[0]]
    table = []
    step = 1

    table.append({
        "шаг": step,
        "точка": f"({others[0][0]},{others[0][1]})",
        "e": 0,
        "действие": "Инициализация",
        "стек": str([[p[0], p[1]] for p in stack])
    })
    step += 1

    for pt in others[1:]:
        while len(stack) > 1:
            e = cross(stack[-2], stack[-1], pt)
            if e > 0:
                break
            removed = stack.pop()
            table.append({
                "шаг": step,
                "точка": f"({pt[0]},{pt[1]})",
                "e": round(e, 4),
                "действие": f"Правый. Удалить ({removed[0]},{removed[1]})",
                "стек": str([[p[0], p[1]] for p in stack])
            })
            step += 1

        e = cross(stack[-2], stack[-1], pt) if len(stack) >= 2 else 0
        stack.append(pt)
        table.append({
            "шаг": step,
            "точка": f"({pt[0]},{pt[1]})",
            "e": round(e, 4),
            "действие": "Левый поворот. Добавить",
            "стек": str([[p[0], p[1]] for p in stack])
        })
        step += 1

    return stack, table


def jarvis_march(points):
    if len(points) < 3:
        return list(points), []

    pts = [list(p) for p in points]
    n = len(pts)
    start = min(range(n), key=lambda i: (pts[i][1], pts[i][0]))

    hull = []
    table = []
    current = start
    step = 1

    while True:
        hull.append(pts[current])
        nxt = (current + 1) % n

        for i in range(n):
            o, a, b = pts[current], pts[nxt], pts[i]
            cross = (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
            if cross < 0:
                nxt = i

        ang = math.degrees(math.atan2(
            pts[nxt][1] - pts[current][1],
            pts[nxt][0] - pts[current][0]
        ))
        table.append({
            "шаг": step,
            "из": f"({pts[current][0]},{pts[current][1]})",
            "в": f"({pts[nxt][0]},{pts[nxt][1]})",
            "угол°": round(ang, 2),
            "оболочка": str([[p[0], p[1]] for p in hull])
        })
        step += 1
        current = nxt

        if current == start or len(hull) >= n:
            break

    return hull, table


def segment_polygon_intersection(p1, p2, vertices):
    n = len(vertices)
    intersections = []
    table = []

    D = [p2[0] - p1[0], p2[1] - p1[1]]

    for i in range(n):
        vi = vertices[i]
        vj = vertices[(i + 1) % n]

        side = [vj[0] - vi[0], vj[1] - vi[1]]
        nv = [-side[1], side[0]]           # перпендикуляр к стороне

        W = [p1[0] - vi[0], p1[1] - vi[1]]
        nD = nv[0] * D[0] + nv[1] * D[1]
        nW = nv[0] * W[0] + nv[1] * W[1]

        row = {
            "сторона": f"V{i}–V{(i+1)%n}",
            "n": f"[{nv[0]},{nv[1]}]",
            "n·D": round(nD, 4),
            "n·W": round(nW, 4),
        }

        if abs(nD) < 1e-10:
            row["t"] = "–"
            row["точка"] = "параллельно"
        else:
            t = -nW / nD
            row["t"] = round(t, 4)

            if -1e-9 <= t <= 1 + 1e-9:
                ix = p1[0] + D[0] * t
                iy = p1[1] + D[1] * t

                side_len2 = side[0] ** 2 + side[1] ** 2
                on_side = False
                if side_len2 > 1e-10:
                    u = ((ix - vi[0]) * side[0] + (iy - vi[1]) * side[1]) / side_len2
                    on_side = -1e-9 <= u <= 1 + 1e-9

                if on_side:
                    pt = [round(ix, 2), round(iy, 2)]
                    intersections.append(pt)
                    row["точка"] = f"({pt[0]},{pt[1]})"
                else:
                    row["точка"] = "вне стороны"
            else:
                row["точка"] = "нет (t∉[0,1])"

        table.append(row)

    return intersections, table


def point_in_polygon(point, vertices):
    px, py = point
    n = len(vertices)
    count = 0
    table = []

    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]

        row = {
            "ребро": f"V{i}–V{(i+1)%n}",
            "V_i": f"({x1},{y1})",
            "V_i+1": f"({x2},{y2})",
        }

        if y1 == y2:
            row["тип"] = "горизонтальное (игнор)"
            table.append(row)
            continue

        if not (min(y1, y2) <= py < max(y1, y2)):
            row["тип"] = "вне y-диапазона"
            table.append(row)
            continue

        x_int = x1 + (py - y1) * (x2 - x1) / (y2 - y1)

        if px <= x_int:
            count += 1
            row["тип"] = f"пересекающее x={round(x_int,2)} (счётчик={count})"
        else:
            row["тип"] = f"безразличное x={round(x_int,2)}"

        table.append(row)

    return {"inside": count % 2 == 1, "count": count}, table