import math

def dda(x1, y1, x2, y2):
    points = []
    table = []

    dx = x2 - x1
    dy = y2 - y1
    length = max(abs(dx), abs(dy))

    if length == 0:
        px, py = int(x1), int(y1)
        points.append((px, py))
        table.append({"i": 0, "x": x1, "y": y1, "plot_x": px, "plot_y": py})
        return points, table

    dx /= length
    dy /= length


    x = float(x1)
    y = float(y1)

    for i in range(int(length) + 1):

        px = int(x + 0.5)
        py = int(y + 0.5)

        points.append((px, py))
        table.append({
            "i": i,
            "x": x,
            "y": y,
            "plot_x": px,
            "plot_y": py
        })

        x += dx
        y += dy

    return points, table


def bresenham(x1, y1, x2, y2):
    points = []
    table = []

    dx = x2 - x1
    dy = y2 - y1

    sx = 1 if dx > 0 else -1
    sy = 1 if dy > 0 else -1

    dx = abs(dx)
    dy = abs(dy)

    x, y = x1, y1

    if dy <= dx:
        e = 2 * dy - dx
        for i in range(dx + 1):
            points.append((x, y))
            table.append({
                "i": i,
                "x": x,
                "y": y,
                "e": e
            })
            if e >= 0:
                y += sy
                e -= 2 * dx
            x += sx
            e += 2 * dy
    else:
        e = 2 * dx - dy
        for i in range(dy + 1):
            points.append((x, y))
            table.append({
                "i": i,
                "x": x,
                "y": y,
                "e": e
            })
            if e >= 0:
                x += sx
                e -= 2 * dy
            y += sy
            e += 2 * dx

    return points, table


def wu(x1, y1, x2, y2):
    points = []
    table = []

    def fpart(x):
        return x - math.floor(x)

    def rfpart(x):
        return 1 - fpart(x)

    if x1 == x2:
        y_start, y_end = sorted([y1, y2])
        for y in range(y_start, y_end + 1):
            points.append((x1, y, 1))
            table.append({"x": x1, "y": y, "p1": (x1, y), "i1": 1})
        return points, table

    if y1 == y2:
        x_start, x_end = sorted([x1, x2])
        for x in range(x_start, x_end + 1):
            points.append((x, y1, 1))
            table.append({"x": x, "y": y1, "p1": (x, y1), "i1": 1})
        return points, table

    steep = abs(y2 - y1) > abs(x2 - x1)
    if steep:
        x1, y1 = y1, x1
        x2, y2 = y2, x2

    if x1 > x2:
        x1, x2 = x2, x1
        y1, y2 = y2, y1

    dx = x2 - x1
    dy = y2 - y1
    gradient = dy / dx if dx != 0 else 1

    y = y1
    for x in range(x1, x2 + 1):
        p1 = (int(y), x) if steep else (x, int(y))
        p2 = (int(y) + 1, x) if steep else (x, int(y) + 1)

        i1 = rfpart(y)
        i2 = fpart(y)

        points.append((p1[0], p1[1], i1))
        points.append((p2[0], p2[1], i2))

        table.append({
            "x": x,
            "y": y,
            "p1": p1,
            "p2": p2,
            "i1": i1,
            "i2": i2
        })

        y += gradient

    return points, table
