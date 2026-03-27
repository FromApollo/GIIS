"""
Алгоритмы заполнения полигонов — Лабораторная работа №6
"""

from collections import defaultdict


# ─────────────────────────────────────────────────────────
# Вспомогательные функции
# ─────────────────────────────────────────────────────────

def _polygon_y_range(vertices):
    ys = [v[1] for v in vertices]
    return min(ys), max(ys)


def _is_local_extremum(vertices, i):
    """True если вершина i — локальный минимум или максимум."""
    n = len(vertices)
    prev_y = vertices[(i - 1) % n][1]
    curr_y = vertices[i][1]
    next_y = vertices[(i + 1) % n][1]
    return (prev_y > curr_y and next_y > curr_y) or \
           (prev_y < curr_y and next_y < curr_y)


# ─────────────────────────────────────────────────────────
# 1. Растровая развёртка — упорядоченный список рёбер (SLB)
# ─────────────────────────────────────────────────────────

def scanline_ordered_edge_list(vertices):
    """
    Возвращает:
      filled_pixels  — список всех пикселей для закраски
      steps          — пошаговые данные (по строкам сканирования)
      intersections  — {y: [x, ...]}
    """
    n = len(vertices)
    if n < 3:
        return [], [], {}

    y_min, y_max = _polygon_y_range(vertices)
    all_intersections = defaultdict(list)   # y -> [x]

    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]

        # Горизонтальные рёбра — пропускаем
        if y1 == y2:
            continue

        # Убеждаемся y1 < y2
        if y1 > y2:
            x1, y1, x2, y2 = x2, y2, x1, y1

        # Определяем, является ли нижняя вершина локальным экстремумом
        # (её индекс в оригинальном полигоне)
        orig_idx = None
        for k in range(n):
            if vertices[k] == [x1, y1] or (vertices[k][0] == x1 and vertices[k][1] == y1):
                orig_idx = k
                break

        for y in range(y1, y2):   # нижнюю включаем, верхнюю — нет
            if y < y_min or y > y_max:
                continue
            t = (y - y1) / (y2 - y1)
            x_int = x1 + t * (x2 - x1)
            all_intersections[y].append(round(x_int, 2))

    # Сортируем пересечения на каждой строке
    for y in all_intersections:
        all_intersections[y].sort()

    filled_pixels = []
    steps = []

    for y in range(y_min, y_max + 1):
        xs = all_intersections.get(y, [])
        row_pixels = []
        pairs = []
        for k in range(0, len(xs) - 1, 2):
            x_start = int(xs[k])
            x_end   = int(xs[k + 1]) if k + 1 < len(xs) else x_start
            pairs.append((x_start, x_end))
            for px in range(x_start, x_end + 1):
                row_pixels.append([px, y])
                filled_pixels.append([px, y])

        steps.append({
            "y": y,
            "intersections": xs,
            "pairs": pairs,
            "pixels_count": len(row_pixels)
        })

    return filled_pixels, steps, dict(all_intersections)


# ─────────────────────────────────────────────────────────
# 2. Растровая развёртка с CAR (список активных рёбер)
# ─────────────────────────────────────────────────────────

def scanline_active_edge_list(vertices):
    """
    y-bucket: для каждой строки храним рёбра, чья верхняя точка = y.
    Поле записи: {x, dx, dy_left}
    """
    n = len(vertices)
    if n < 3:
        return [], [], {}

    y_min, y_max = _polygon_y_range(vertices)

    # Строим y-таблицу (bucket)
    y_table = defaultdict(list)
    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]
        if y1 == y2:
            continue
        if y1 > y2:
            x1, y1, x2, y2 = x2, y2, x1, y1
        dy = y2 - y1
        dx = (x2 - x1) / dy
        y_table[y1].append({"x": float(x1), "dx": dx, "dy": dy})

    # Сортируем внутри bucket по x
    for y in y_table:
        y_table[y].sort(key=lambda e: e["x"])

    active = []       # активные рёбра
    filled_pixels = []
    steps = []

    for y in range(y_min, y_max + 1):
        # Добавляем новые рёбра из bucket
        if y in y_table:
            active.extend(y_table[y])

        # Удаляем рёбра, у которых dy == 0
        active = [e for e in active if e["dy"] > 0]

        # Сортируем по текущему x
        active.sort(key=lambda e: e["x"])

        xs = [e["x"] for e in active]
        pairs = []
        row_pixels = []
        for k in range(0, len(xs) - 1, 2):
            x_start = int(xs[k])
            x_end   = int(xs[k + 1]) if k + 1 < len(xs) else x_start
            pairs.append((round(xs[k], 2), round(xs[k + 1], 2) if k + 1 < len(xs) else round(xs[k], 2)))
            for px in range(x_start, x_end + 1):
                row_pixels.append([px, y])
                filled_pixels.append([px, y])

        steps.append({
            "y": y,
            "active_edges": [{"x": round(e["x"], 2), "dx": round(e["dx"], 4), "dy": e["dy"]} for e in active],
            "pairs": pairs,
            "pixels_count": len(row_pixels)
        })

        # Обновляем x и уменьшаем dy
        for e in active:
            e["x"] += e["dx"]
            e["dy"] -= 1

    return filled_pixels, steps, {}


# ─────────────────────────────────────────────────────────
# 3. Простой алгоритм заполнения с затравкой
# ─────────────────────────────────────────────────────────

def _build_boundary_set(vertices):
    """Строим множество граничных пикселей по рёбрам полигона."""
    boundary = set()
    n = len(vertices)
    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        sx = 1 if x1 < x2 else -1
        sy = 1 if y1 < y2 else -1
        err = dx - dy
        cx, cy = x1, y1
        while True:
            boundary.add((cx, cy))
            if cx == x2 and cy == y2:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                cx += sx
            if e2 < dx:
                err += dx
                cy += sy
    return boundary


def seed_fill_simple(vertices, seed):
    """
    4-связный простой алгоритм заполнения с затравкой.
    Возвращает (filled_pixels, steps).
    steps — список шагов: {step, pixel, stack_size, action}
    """
    boundary = _build_boundary_set(vertices)
    filled = set()
    stack = [tuple(seed)]
    result_pixels = []
    steps = []
    step_num = 0
    MAX_STEPS = 50000  # защита от переполнения

    while stack and step_num < MAX_STEPS:
        px, py = stack.pop()
        if (px, py) in filled or (px, py) in boundary:
            continue
        filled.add((px, py))
        result_pixels.append([px, py])
        step_num += 1

        action = "Закрасить"
        neighbors_added = []
        for nx, ny in [(px, py + 1), (px - 1, py), (px, py - 1), (px + 1, py)]:
            if (nx, ny) not in filled and (nx, ny) not in boundary:
                stack.append((nx, ny))
                neighbors_added.append([nx, ny])

        steps.append({
            "step": step_num,
            "pixel": [px, py],
            "action": action,
            "added_to_stack": neighbors_added,
            "stack_size": len(stack)
        })

    return result_pixels, steps


# ─────────────────────────────────────────────────────────
# 4. Построчный алгоритм заполнения с затравкой
# ─────────────────────────────────────────────────────────

def seed_fill_scanline(vertices, seed):
    """
    Построчный (span-filling) алгоритм заполнения с затравкой.
    """
    boundary = _build_boundary_set(vertices)
    filled = set()
    stack = [tuple(seed)]
    result_pixels = []
    steps = []
    step_num = 0
    MAX_STEPS = 10000

    def is_free(x, y):
        return (x, y) not in filled and (x, y) not in boundary

    while stack and step_num < MAX_STEPS:
        sx, sy = stack.pop()
        if not is_free(sx, sy):
            continue

        step_num += 1

        # Идём влево
        x_left = sx
        while is_free(x_left - 1, sy):
            x_left -= 1

        # Идём вправо
        x_right = sx
        while is_free(x_right + 1, sy):
            x_right += 1

        # Закрашиваем интервал
        interval_pixels = []
        for px in range(x_left, x_right + 1):
            if is_free(px, sy):
                filled.add((px, sy))
                result_pixels.append([px, sy])
                interval_pixels.append([px, sy])

        added_seeds = []
        # Проверяем строки выше и ниже
        for dy in [-1, 1]:
            in_span = False
            for px in range(x_left, x_right + 1):
                if is_free(px, sy + dy):
                    if not in_span:
                        stack.append((px, sy + dy))
                        added_seeds.append([px, sy + dy])
                        in_span = True
                else:
                    in_span = False

        steps.append({
            "step": step_num,
            "seed": [sx, sy],
            "interval": [x_left, x_right],
            "interval_pixels": interval_pixels,
            "added_seeds": added_seeds,
            "stack_size": len(stack)
        })

    return result_pixels, steps