# lab2/curves.py
def circle(cx, cy, r):
    points = []
    table = []
    x, y = 0, r
    d = 2-2*r
    i = 0

    while x <= y:
        for dx, dy in [(x, y), (y, x), (-x, y), (-y, x),
                       (x, -y), (y, -x), (-x, -y), (-y, -x)]:
            points.append((cx + dx, cy + dy))

        table.append({"i": i, "x": x, "y": y, "d": d})

        if d < 0:
            # Случай А: Мы внутри окружности
            delta = 2 * (d + y) - 1
            if delta <= 0:
                # Переход H (Horizontal)
                d += 2 * x + 1
                x += 1
            else:
                # Переход D (Diagonal)
                d += 2 * (x - y + 1)
                x += 1
                y -= 1
        elif d > 0:
            # Случай Б: Мы снаружи окружности
            delta_star = 2 * (d - x) - 1
            if delta_star <= 0:
                # Переход D (Diagonal)
                d += 2 * (x - y + 1)
                x += 1
                y -= 1
            else:
                # Переход V (Vertical)
                d += -2 * y + 1
                y -= 1
        else:
            # Случай В: Мы точно на линии
            # Переход D (Diagonal)
            d += 2 * (x - y + 1)
            x += 1
            y -= 1

        i += 1

    return points, table


def ellipse(cx, cy, a, b):
    points = []
    table = []
    x, y = 0, b

    # Константы для ускорения расчетов
    a2 = a * a
    b2 = b * b

    d = a2 + b2 -2*a2*b
    i = 0

    # --- РЕГИОН 1 (Горизонтальный участок) ---
    # Условие перехода в Регион 2: производная dy/dx становится > 1
    # Математически: b²x >= a²y
    while b2 * x <= a2 * y:
        # 4-сторонняя симметрия
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))

        table.append({"i": i, "region": 1, "x": x, "y": y, "d": d})
        i += 1

        if d < 0:
            # Случай А: Внутри эллипса
            delta = 2 * (d + a2 * y) - a2
            if delta <= 0:
                # Переход H: (x+1, y)
                d += b2 * (2 * x + 1)
                x += 1
            else:
                # Переход D: (x+1, y-1)
                d += b2 * (2 * x + 1) + a2 * (1 - 2 * y)
                x += 1
                y -= 1
        elif d > 0:
            # Случай Б: Снаружи эллипса
            delta_star = 2 * (d - b2 * x) - b2
            if delta_star <= 0:
                # Переход D: (x+1, y-1)
                d += b2 * (2 * x + 1) + a2 * (1 - 2 * y)
                x += 1
                y -= 1
            else:
                # Переход V: (x, y-1)
                d += a2 * (1 - 2 * y)
                y -= 1
        else:
            # Случай В: Точно на линии
            d += b2 * (2 * x + 1) + a2 * (1 - 2 * y)
            x += 1
            y -= 1

    # --- РЕГИОН 2 (Вертикальный участок) ---
    # Продолжаем от текущей точки до y = 0
    while y >= 0:
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))

        table.append({"i": i, "region": 2, "x": x, "y": y, "d": d})
        i += 1

        if d > 0:
            # Случай Б: Снаружи (здесь это основной случай для спуска вниз)
            delta_star = 2 * (d - b2 * x) - b2
            if delta_star <= 0:
                # Переход D: (x+1, y-1)
                d += b2 * (2 * x + 1) + a2 * (1 - 2 * y)
                x += 1
                y -= 1
            else:
                # Переход V: (x, y-1)
                d += a2 * (1 - 2 * y)
                y -= 1
        elif d < 0:
            # Случай А: Внутри
            delta = 2 * (d + a2 * y) - a2
            if delta <= 0:
                # Переход H: (x+1, y)
                d += b2 * (2 * x + 1)
                x += 1
            else:
                # Переход D: (x+1, y-1)
                d += b2 * (2 * x + 1) + a2 * (1 - 2 * y)
                x += 1
                y -= 1
        else:
            # Случай В: Точно на линии
            d += b2 * (2 * x + 1) + a2 * (1 - 2 * y)
            x += 1
            y -= 1

    return points, table


def parabola(cx, cy, p, limit=100):
    points = []
    table = []

    p_abs = abs(p)
    direction = 1 if p >= 0 else -1

    x, y = 0, 0
    d = 1- 2*p_abs
    i = 0

    # РЕГИОН 1: y — быстрая переменная (растет от 0 до p)
    while y <= p_abs:
        for dy in [y, -y]:
            points.append((cx + x * direction, cy + dy))
        table.append({"i": i, "reg": 1, "x": x, "y": y, "d": d})
        i += 1

        if d < 0:  # Внутри параболы (справа от линии)
            # Аналог Case A: проверяем шаг V(x, y+1) против D(x+1, y+1)
            delta = 2 * (d + p_abs) - 1  # уточнение расстояния
            if delta <= 0:
                d += 2 * y + 1  # Шаг V
            else:
                d += 2 * y + 1 - 2 * p_abs  # Шаг D
                x += 1
        elif d > 0:  # Снаружи параболы (слева от линии)
            # Аналог Case B: проверяем шаг D(x+1, y+1) против V(x, y+1)
            delta_star = 2 * (d - y) - 1
            if delta_star <= 0:
                d += 2 * y + 1 - 2 * p_abs  # Шаг D
                x += 1
            else:
                d += 2 * y + 1  # Шаг V
        else:  # Case C: точно на линии
            d += 2 * y + 1 - 2 * p_abs
            x += 1

        y += 1
        if abs(x) > limit: break

    # РЕГИОН 2: x — быстрая переменная (растет до limit)
    while abs(x) <= limit:
        for dy in [y, -y]:
            points.append((cx + x * direction, cy + dy))
        table.append({"i": i, "reg": 2, "x": x, "y": y, "d": d})
        i += 1

        if d > 0:  # Снаружи (слева/сверху)
            # Проверяем шаг D(x+1, y+1) против H(x+1, y)
            delta_star = 2 * (d - p_abs) - 1
            if delta_star <= 0:
                d += 2 * y + 1 - 2 * p_abs  # Шаг D
                y += 1
            else:
                d += -2 * p_abs  # Шаг H
        elif d < 0:  # Внутри (справа/снизу)
            # Проверяем шаг H(x+1, y) против D(x+1, y+1)
            delta = 2 * (d + y) + 1
            if delta <= 0:
                d += -2 * p_abs  # Шаг H
            else:
                d += 2 * y + 1 - 2 * p_abs  # Шаг D
                y += 1
        else:  # Точно на линии
            d += 2 * y + 1 - 2 * p_abs
            y += 1

        x += 1

    return points, table


def hyperbola(cx, cy, a, b, limit=100):
    points = []
    table = []
    a, b = abs(a), abs(b)
    x, y = a, 0  # Начинаем с вершины гиперболы (a, 0)

    a2 = a * a
    b2 = b * b

    # d — это отклонение Δ = b²x² - a²y² - a²b²
    d = 2*a*b2 + b2 - a2
    i = 0

    # --- РЕГИОН 1 ---
    # Начинаем от y=0, здесь y растет быстрее x (dy/dx > 1)
    # Условие: b²x >= a²y
    while b2 * x >= a2 * y and x <= limit:
        # 4-сторонняя симметрия (две ветви гиперболы)
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))

        table.append({"i": i, "reg": 1, "x": x, "y": y, "d": d})
        i += 1

        # В Регионе 1 шаг по y делается всегда (y = y + 1)
        if d > 0:
            # Случай Б: Снаружи (справа от кривой)
            # Увеличение y уменьшает d, приближая нас к линии
            delta_star = 2 * (d - a2 * y) - a2
            if delta_star <= 0:
                # Переход D (Диагональный): x+1, y+1
                d += b2 * (2 * x + 1) - a2 * (2 * y + 1)
                x += 1
                y += 1
            else:
                # Переход V (Вертикальный): x, y+1
                d += -a2 * (2 * y + 1)
                y += 1
        elif d < 0:
            # Случай А: Внутри (между ветвями)
            # Нужно увеличить x, чтобы вернуться к линии
            delta = 2 * (d + b2 * x) + b2
            if delta <= 0:
                # Переход V (Вертикальный): x, y+1
                d += -a2 * (2 * y + 1)
                y += 1
            else:
                # Переход D (Диагональный): x+1, y+1
                d += b2 * (2 * x + 1) - a2 * (2 * y + 1)
                x += 1
                y += 1
        else:
            # Случай В: Точно на линии
            d += b2 * (2 * x + 1) - a2 * (2 * y + 1)
            x += 1
            y += 1

    # --- РЕГИОН 2 ---
    # Здесь x растет быстрее y (x — быстрая переменная)
    while x <= limit:
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))

        table.append({"i": i, "reg": 2, "x": x, "y": y, "d": d})
        i += 1

        # В Регионе 2 шаг по x делается всегда (x = x + 1)
        if d < 0:
            # Случай А: Внутри
            delta = 2 * (d + b2 * x) + b2
            if delta <= 0:
                # Переход H (Горизонтальный): x+1, y
                d += b2 * (2 * x + 1)
                x += 1
            else:
                # Переход D (Диагональный): x+1, y+1
                d += b2 * (2 * x + 1) - a2 * (2 * y + 1)
                x += 1
                y += 1
        elif d > 0:
            # Случай Б: Снаружи
            delta_star = 2 * (d - a2 * y) - a2
            if delta_star <= 0:
                # Переход D (Диагональный): x+1, y+1
                d += b2 * (2 * x + 1) - a2 * (2 * y + 1)
                x += 1
                y += 1
            else:
                # Переход H (Горизонтальный): x+1, y
                d += b2 * (2 * x + 1)
                x += 1
        else:
            # Случай В: Точно на линии
            d += b2 * (2 * x + 1) - a2 * (2 * y + 1)
            x += 1
            y += 1

    return points, table