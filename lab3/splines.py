import numpy as np


def generate_spline(all_points, algo, steps=100):
    # Проверяем, что пришло ровно 4 точки
    if len(all_points) < 4:
        return [], []

    # Извлекаем координаты X и Y в массивы numpy
    Px = np.array([p['x'] for p in all_points])
    Py = np.array([p['y'] for p in all_points])

    result_points = []
    table_data = []

    # Матрицы по Самодумкину
    if algo == "hermite":
        # P1, P4 - точки; P2-P1 и P3-P4 - векторы касательных
        Gx = np.array([Px[0], Px[3], Px[1] - Px[0], Px[3] - Px[2]])
        Gy = np.array([Py[0], Py[3], Py[1] - Py[0], Py[3] - Py[2]])
        M = np.array([
            [2, -2, 1, 1],
            [-3, 3, -2, -1],
            [0, 0, 1, 0],
            [1, 0, 0, 0]
        ])
    elif algo == "bezier":
        Gx, Gy = Px, Py
        M = np.array([
            [-1, 3, -3, 1],
            [3, -6, 3, 0],
            [-3, 3, 0, 0],
            [1, 0, 0, 0]
        ])
    elif algo == "bspline":
        Gx, Gy = Px, Py
        M = np.array([
            [-1, 3, -3, 1],
            [3, -6, 3, 0],
            [-3, 0, 3, 0],
            [1, 4, 1, 0]
        ]) / 6.0
    else:
        return [], []

    Cx = M.dot(Gx)
    Cy = M.dot(Gy)

    for i in range(steps + 1):
        t = i / steps
        T = np.array([t ** 3, t ** 2, t, 1])

        x = T.dot(Cx)
        y = T.dot(Cy)

        px, py = int(round(x)), int(round(y))

        # Добавляем точку для отрисовки (x, y, интенсивность)
        result_points.append((px, py, 1))

        # Данные для таблицы (каждый 10-й шаг)
        if i % 10 == 0 or i == steps:
            table_data.append({
                "t": round(t, 2),
                "x": round(x, 2),
                "y": round(y, 2),
                "px": px,
                "py": py
            })

    return result_points, table_data