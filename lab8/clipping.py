import math

# ══════════════════════════════════════════════════════════════
#  Часть 1.  Двумерные алгоритмы отсечения отрезков
# ══════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────
#  Алгоритм Коэна – Сазерленда
# ─────────────────────────────────────────────
LEFT = 1
RIGHT = 2
BOTTOM = 4
TOP = 8


def _outcode(x, y, x_min, x_max, y_min, y_max):
    code = 0
    if x < x_min: code |= LEFT
    if x > x_max: code |= RIGHT
    if y < y_min: code |= BOTTOM
    if y > y_max: code |= TOP
    return code


def _code_str(code):
    bits = []
    if code & TOP:    bits.append("В")
    if code & BOTTOM: bits.append("Н")
    if code & RIGHT:  bits.append("П")
    if code & LEFT:   bits.append("Л")
    return "".join(bits) if bits else "0000"


def cohen_sutherland(x1, y1, x2, y2, x_min, x_max, y_min, y_max):
    """
    Алгоритм Коэна – Сазерленда.
    Возвращает (visible, clipped_segment, table).
    clipped_segment = [x1c,y1c,x2c,y2c] или None.
    """
    table = []
    x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)

    code1 = _outcode(x1, y1, x_min, x_max, y_min, y_max)
    code2 = _outcode(x2, y2, x_min, x_max, y_min, y_max)

    step = 0
    while True:
        step += 1
        and_ = code1 & code2
        or_ = code1 | code2

        table.append({
            "Шаг": step,
            "P1": f"({x1:.2f},{y1:.2f})",
            "P2": f"({x2:.2f},{y2:.2f})",
            "Код P1": _code_str(code1),
            "Код P2": _code_str(code2),
            "И (AND)": _code_str(and_),
            "ИЛИ (OR)": _code_str(or_),
            "Действие": "",
        })

        if and_ != 0:
            table[-1]["Действие"] = "Тривиально невидим"
            return False, None, table

        if or_ == 0:
            table[-1]["Действие"] = "Тривиально видим"
            return True, [round(x1, 4), round(y1, 4),
                          round(x2, 4), round(y2, 4)], table

        # Выбираем точку вне окна
        outside = code1 if code1 != 0 else code2

        if outside & TOP:
            x = x1 + (x2 - x1) * (y_max - y1) / (y2 - y1)
            y = y_max
            action = f"Пересечение с верхней (y={y_max})"
        elif outside & BOTTOM:
            x = x1 + (x2 - x1) * (y_min - y1) / (y2 - y1)
            y = y_min
            action = f"Пересечение с нижней (y={y_min})"
        elif outside & RIGHT:
            y = y1 + (y2 - y1) * (x_max - x1) / (x2 - x1)
            x = x_max
            action = f"Пересечение с правой (x={x_max})"
        else:  # LEFT
            y = y1 + (y2 - y1) * (x_min - x1) / (x2 - x1)
            x = x_min
            action = f"Пересечение с левой (x={x_min})"

        table[-1]["Действие"] = action

        if outside == code1:
            x1, y1 = x, y
            code1 = _outcode(x1, y1, x_min, x_max, y_min, y_max)
        else:
            x2, y2 = x, y
            code2 = _outcode(x2, y2, x_min, x_max, y_min, y_max)

        if step > 20:
            break

    return False, None, table


# ─────────────────────────────────────────────
#  Алгоритм разбиения средней точкой (Midpoint Subdivision)
# ─────────────────────────────────────────────

def midpoint_subdivision(x1, y1, x2, y2, x_min, x_max, y_min, y_max, eps=0.0001):
    """
    Алгоритм разбиения средней точкой (метод двоичного поиска).
    Использует деление отрезка пополам для нахождения пересечения с окном.

    Возвращает (visible, clipped_segment, table).
    """
    table = []
    x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)

    # Вспомогательная функция для проверки, находится ли точка внутри окна
    def is_inside(x, y):
        return x_min <= x <= x_max and y_min <= y <= y_max

    # Вспомогательная функция для проверки тривиальной видимости
    def is_trivial_visible(c1, c2):
        return (c1 | c2) == 0

    # Вспомогательная функция для проверки тривиальной невидимости
    def is_trivial_invisible(c1, c2):
        return (c1 & c2) != 0

    # Рекурсивная функция для нахождения пересечения
    def find_intersection(px1, py1, px2, py2, c1, c2, depth=0, points=None):
        if points is None:
            points = []

        # Если отрезок мал или достигнута максимальная глубина
        length = math.hypot(px2 - px1, py2 - py1)
        if length < eps or depth > 50:
            return None

        # Находим среднюю точку
        mx = (px1 + px2) / 2
        my = (py1 + py2) / 2
        code_mid = _outcode(mx, my, x_min, x_max, y_min, y_max)

        # Если средняя точка внутри, проверяем каждую половину
        if is_inside(mx, my):
            points.append((mx, my))
            # Проверяем первую половину
            if not is_trivial_visible(c1, code_mid):
                find_intersection(px1, py1, mx, my, c1, code_mid, depth + 1, points)
            # Проверяем вторую половину
            if not is_trivial_visible(code_mid, c2):
                find_intersection(mx, my, px2, py2, code_mid, c2, depth + 1, points)
        else:
            # Средняя точка вне окна - продолжаем поиск в обе стороны
            find_intersection(px1, py1, mx, my, c1, code_mid, depth + 1, points)
            find_intersection(mx, my, px2, py2, code_mid, c2, depth + 1, points)

        return points

    # Основная функция отсечения
    def clip_segment(px1, py1, px2, py2, depth=0, step_counter=None):
        if step_counter is None:
            step_counter = [0]

        step_counter[0] += 1
        step = step_counter[0]

        code1 = _outcode(px1, py1, x_min, x_max, y_min, y_max)
        code2 = _outcode(px2, py2, x_min, x_max, y_min, y_max)

        table.append({
            "Шаг": step,
            "P1": f"({px1:.2f},{py1:.2f})",
            "P2": f"({px2:.2f},{py2:.2f})",
            "Код P1": _code_str(code1),
            "Код P2": _code_str(code2),
            "Длина": f"{math.hypot(px2 - px1, py2 - py1):.4f}",
            "Действие": ""
        })

        # Тривиально видим
        if is_trivial_visible(code1, code2):
            table[-1]["Действие"] = "Тривиально видим"
            return [(px1, py1), (px2, py2)]

        # Тривиально невидим
        if is_trivial_invisible(code1, code2):
            table[-1]["Действие"] = "Тривиально невидим"
            return None

        # Проверка на вырожденность отрезка
        length = math.hypot(px2 - px1, py2 - py1)
        if length < eps:
            if is_inside(px1, py1):
                table[-1]["Действие"] = "Точка внутри окна"
                return [(px1, py1)]
            else:
                table[-1]["Действие"] = "Точка вне окна"
                return None

        # Деление отрезка средней точкой
        mx = (px1 + px2) / 2
        my = (py1 + py2) / 2
        table[-1]["Действие"] = f"Деление в точке ({mx:.2f},{my:.2f})"

        # Рекурсивно обрабатываем обе половины
        left_seg = clip_segment(px1, py1, mx, my, depth + 1, step_counter)
        right_seg = clip_segment(mx, my, px2, py2, depth + 1, step_counter)

        # Объединяем результаты
        if left_seg is None and right_seg is None:
            return None
        elif left_seg is None:
            return right_seg
        elif right_seg is None:
            return left_seg
        else:
            # Соединяем сегменты, избегая дублирования точки соединения
            result = list(left_seg)
            if len(result) > 0 and len(right_seg) > 0:
                if abs(result[-1][0] - right_seg[0][0]) > eps or abs(result[-1][1] - right_seg[0][1]) > eps:
                    result.extend(right_seg)
                else:
                    result.extend(right_seg[1:])
            else:
                result.extend(right_seg)
            return result

    # Запускаем рекурсивное отсечение
    result_points = clip_segment(x1, y1, x2, y2)

    if result_points is None or len(result_points) < 2:
        return False, None, table

    # Преобразуем точки в формат [x1, y1, x2, y2]
    # Возможны несколько сегментов, но для простоты берем первый и последний
    x1c, y1c = result_points[0]
    x2c, y2c = result_points[-1]

    return True, [round(x1c, 4), round(y1c, 4), round(x2c, 4), round(y2c, 4)], table


# ─────────────────────────────────────────────
#  Алгоритм Кируса – Бэка
# ─────────────────────────────────────────────

def _poly_signed_area(vertices):
    """Знаковая площадь многоугольника. >0 → CCW (мат. система), <0 → CW."""
    n = len(vertices)
    s = 0.0
    for i in range(n):
        x0, y0 = vertices[i]
        x1, y1 = vertices[(i + 1) % n]
        s += x0 * y1 - x1 * y0
    return s / 2.0


def cyrus_beck(x1, y1, x2, y2, vertices):
    """
    Алгоритм Кируса–Бэка для выпуклого многоугольника.
    vertices — список вершин многоугольника [x, y].
    Внутренние нормали вычисляются автоматически с учётом обхода.
    Возвращает (visible, clipped_segment, table).

    Соглашение (n — внутренняя нормаль):
      n·D > 0  →  потенциально ВХОДЯЩАЯ точка  → t_enter = max(t_enter, t)
      n·D < 0  →  потенциально ВЫХОДЯЩАЯ точка → t_exit  = min(t_exit,  t)
    """
    table = []
    dx = x2 - x1
    dy = y2 - y1

    t_enter = 0.0
    t_exit = 1.0
    nv = len(vertices)

    # Определяем знак поворота, чтобы нормали всегда смотрели ВНУТРЬ
    # CCW (signed_area > 0): внутренняя нормаль = (-edge_dy,  edge_dx)
    # CW  (signed_area < 0): внутренняя нормаль = ( edge_dy, -edge_dx)
    sign = 1 if _poly_signed_area(vertices) >= 0 else -1

    for i in range(nv):
        ex = vertices[i][0];
        ey = vertices[i][1]
        ex2 = vertices[(i + 1) % nv][0];
        ey2 = vertices[(i + 1) % nv][1]

        edge_dx = ex2 - ex
        edge_dy = ey2 - ey

        # Внутренняя нормаль
        nx = -edge_dy * sign
        ny = edge_dx * sign

        # w = P1 − F  (F — любая точка на ребре)
        wx = x1 - ex
        wy = y1 - ey

        nD = nx * dx + ny * dy
        nw = nx * wx + ny * wy

        if abs(nD) < 1e-10:
            status = "Параллельно ребру"
            if nw < 0:
                status += " (P1 вне)"
                table.append({"Ребро": i + 1, "n·D": round(nD, 4),
                              "n·w": round(nw, 4), "t": "—", "Тип": status})
                return False, None, table
            table.append({"Ребро": i + 1, "n·D": round(nD, 4),
                          "n·w": round(nw, 4), "t": "—", "Тип": status})
            continue

        t = -nw / nD

        if nD > 0:
            # Потенциально ВХОДЯЩАЯ точка
            t_type = "Вход"
            t_enter = max(t_enter, t)
        else:
            # Потенциально ВЫХОДЯЩАЯ точка
            t_type = "Выход"
            t_exit = min(t_exit, t)

        table.append({
            "Ребро": i + 1,
            "n·D": round(nD, 4),
            "n·w": round(nw, 4),
            "t": round(t, 4),
            "Тип": t_type,
        })

    table.append({
        "Ребро": "Итог",
        "n·D": "",
        "n·w": "",
        "t": f"t_enter={t_enter:.4f}, t_exit={t_exit:.4f}",
        "Тип": "Видим" if t_enter <= t_exit else "Невидим",
    })

    if t_enter > t_exit:
        return False, None, table

    cx1 = round(x1 + t_enter * dx, 4)
    cy1 = round(y1 + t_enter * dy, 4)
    cx2 = round(x1 + t_exit * dx, 4)
    cy2 = round(y1 + t_exit * dy, 4)
    return True, [cx1, cy1, cx2, cy2], table


# ══════════════════════════════════════════════════════════════
#  Часть 2.  Удаление невидимых граней  (алгоритм Робертса)
#            Для произвольного выпуклого тела.
# ══════════════════════════════════════════════════════════════

def roberts_visibility(faces, view_dir):
    """
    faces    — список граней.  Каждая грань: {'name':str, 'vertices':[[x,y,z],...]}
    view_dir — вектор направления взгляда [vx, vy, vz]
    Возвращает (result_list, table).
    result_list — [{'name', 'normal', 'dot', 'visible'}]
    """

    def sub(a, b):
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

    def cross(a, b):
        return [a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0]]

    def dot(a, b):
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

    def norm(v):
        l = math.sqrt(dot(v, v))
        return [c / l for c in v] if l > 1e-10 else v

    vd = norm(view_dir)
    results = []
    table = []

    for face in faces:
        verts = face["vertices"]
        if len(verts) < 3:
            continue

        # Вычисляем нормаль как (V1-V0) × (V2-V0)
        e1 = sub(verts[1], verts[0])
        e2 = sub(verts[2], verts[0])
        n = norm(cross(e1, e2))

        d = dot(n, vd)
        visible = d > 0

        results.append({
            "name": face["name"],
            "normal": [round(c, 3) for c in n],
            "dot": round(d, 4),
            "visible": visible,
        })
        table.append({
            "Грань": face["name"],
            "Нормаль": f"({n[0]:.3f}, {n[1]:.3f}, {n[2]:.3f})",
            "n·v": round(d, 4),
            "Видима?": "Да" if visible else "Нет",
        })

    return results, table


def make_cube_faces(cx=0, cy=0, cz=0, size=1):
    """Возвращает грани куба с центром (cx,cy,cz) и полуребром size."""
    h = size
    return [
        {"name": "Передняя", "vertices": [
            [cx - h, cy - h, cz + h], [cx + h, cy - h, cz + h],
            [cx + h, cy + h, cz + h], [cx - h, cy + h, cz + h]]},
        {"name": "Задняя", "vertices": [
            [cx + h, cy - h, cz - h], [cx - h, cy - h, cz - h],
            [cx - h, cy + h, cz - h], [cx + h, cy + h, cz - h]]},
        {"name": "Левая", "vertices": [
            [cx - h, cy - h, cz - h], [cx - h, cy - h, cz + h],
            [cx - h, cy + h, cz + h], [cx - h, cy + h, cz - h]]},
        {"name": "Правая", "vertices": [
            [cx + h, cy - h, cz + h], [cx + h, cy - h, cz - h],
            [cx + h, cy + h, cz - h], [cx + h, cy + h, cz + h]]},
        {"name": "Верхняя", "vertices": [
            [cx - h, cy + h, cz + h], [cx + h, cy + h, cz + h],
            [cx + h, cy + h, cz - h], [cx - h, cy + h, cz - h]]},
        {"name": "Нижняя", "vertices": [
            [cx - h, cy - h, cz - h], [cx + h, cy - h, cz - h],
            [cx + h, cy - h, cz + h], [cx - h, cy - h, cz + h]]},
    ]


def project_isometric(x, y, z):
    """Изометрическая проекция -> (px, py)."""
    px = (x - z) * math.cos(math.radians(30))
    py = (x + z) * math.sin(math.radians(30)) - y
    return px, py