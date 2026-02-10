# lab2/curves.py
def circle(cx, cy, r):
    points = []
    table = []
    x, y = 0, r
    d = 3 - 2 * r
    i = 0

    while y >= x:
        # 8 симметричных точек
        for dx, dy in [(x, y), (y, x), (-x, y), (-y, x),
                       (x, -y), (y, -x), (-x, -y), (-y, -x)]:
            points.append((cx + dx, cy + dy))

        table.append({"i": i, "x": x, "y": y, "d": d})

        x += 1
        if d > 0:
            y -= 1
            d += 4 * (x - y) + 10
        else:
            d += 4 * x + 6
        i += 1

    return points, table


def ellipse(cx, cy, a, b):
    points = []
    table = []
    x, y = 0, b
    a2 = a * a
    b2 = b * b
    i = 0

    # Region 1
    d = 4 * b2 - 4 * a2 * b + a2
    while a2 * (2 * y - 1) > 2 * b2 * (x + 1):
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))
        table.append({"i": i, "region": 1, "x": x, "y": y, "d": d})
        i += 1

        if d < 0:
            x += 1
            d += 4 * b2 * (2 * x + 3)
        else:
            x += 1
            y -= 1
            d += 4 * b2 * (2 * x + 3) + 4 * a2 * (2 - 2 * y)

    # Region 2
    d = b2 * (2 * x + 1) ** 2 + 4 * a2 * (y - 1) ** 2 - 4 * a2 * b2
    while y >= 0:
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))
        table.append({"i": i, "region": 2, "x": x, "y": y, "d": d})
        i += 1

        if d < 0:
            x += 1
            y -= 1
            d += 4 * b2 * (2 * x + 2) + 4 * a2 * (3 - 2 * y)
        else:
            y -= 1
            d += 4 * a2 * (3 - 2 * y)

    return points, table


def parabola(cx, cy, p, limit=40):
    """y² = 2px (открыта вправо)"""
    points = []
    table = []
    x, y = 0, 0
    d = 1 - 2 * p
    i = 0

    # Участок 1 (крутой)
    while y <= p and x <= limit:
        for dy in [y, -y]:
            points.append((cx + x, cy + dy))
        table.append({"i": i, "x": x, "y": y, "d": d})
        i += 1

        y += 1
        if d >= 0:
            x += 1
            d += 2 * y + 3 - 2 * p
        else:
            d += 2 * y + 3

    # Участок 2 (пологий)
    d = (y + 0.5) ** 2 - 2 * p * (x + 1)
    while x <= limit:
        for dy in [y, -y]:
            points.append((cx + x, cy + dy))
        table.append({"i": i, "x": x, "y": y, "d": d})
        i += 1

        x += 1
        if d < 0:
            y += 1
            d += 2 * y + 2 - 2 * p
        else:
            d -= 2 * p

    return points, table


def hyperbola(cx, cy, a, b, limit=40):
    """b²x² - a²y
² = a²b²"""
    points = []
    table = []
    x, y = a, 0
    a2, b2 = a * a, b * b
    i = 0

    # Участок 1
    d = 4 * b2 * a - 4 * a2 + b2
    while (2 * a2 * y <= 2 * b2 * x) and x <= limit:
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))
        table.append({"i": i, "x": x, "y": y, "d": d})
        i += 1

        y += 1
        if d >= 0:
            d -= 4 * a2 * (2 * y + 1)
        else:
            x += 1
            d += 4 * b2 * (2 * x + 2) - 4 * a2 * (2 * y + 1)

    # Участок 2
    d = 4 * b2 * (x + 1) ** 2 - 4 * a2 * (y + 0.5) ** 2 - 4 * a2 * b2
    while x <= limit:
        for dx, dy in [(x, y), (-x, y), (x, -y), (-x, -y)]:
            points.append((cx + dx, cy + dy))
        table.append({"i": i, "x": x, "y": y, "d": d})
        i += 1

        x += 1
        if d < 0:
            y += 1
            d += 4 * b2 * (2 * x + 1) - 4 * a2 * (2 * y + 2)
        else:
            d += 4 * b2 * (2 * x + 1)

    return points, table