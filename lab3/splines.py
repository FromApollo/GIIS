import numpy as np


def generate_spline(all_points, algo, steps=20):
    # Если точек меньше 4, строить кубический сплайн/кривую нельзя
    if len(all_points) < 4:
        return [], []

    Px = np.array([p['x'] for p in all_points])
    Py = np.array([p['y'] for p in all_points])

    result_points = []
    table_data = []

    # --- ЛОГИКА ДЛЯ B-SPLINE (Произвольное кол-во точек) ---
    if algo == "bspline":
        # Матрица B-сплайна
        M = np.array([
            [-1, 3, -3, 1],
            [3, -6, 3, 0],
            [-3, 0, 3, 0],
            [1, 4, 1, 0]
        ]) / 6.0

        # Проходим скользящим окном по точкам: [0,1,2,3], [1,2,3,4], и т.д.
        # Количество сегментов = N - 3
        for i in range(len(all_points) - 3):
            # Берем 4 точки для текущего сегмента
            Gx = Px[i:i + 4]
            Gy = Py[i:i + 4]

            Cx = M.dot(Gx)
            Cy = M.dot(Gy)

            # Генерируем точки сегмента
            for j in range(steps + 1):
                t = j / steps
                T = np.array([t ** 3, t ** 2, t, 1])

                x = T.dot(Cx)
                y = T.dot(Cy)

                px, py = int(round(x)), int(round(y))
                result_points.append((px, py, 1))

                # Записываем в таблицу (немного реже, чтобы не спамить)
                if j == 0:
                    table_data.append({
                        "t": f"Seg{i}_t{round(t, 1)}",
                        "x": round(x, 2),
                        "y": round(y, 2),
                        "px": px,
                        "py": py
                    })

        return result_points, table_data

    # --- ЛОГИКА ДЛЯ ЭРМИТА И БЕЗЬЕ (Только 4 точки) ---
    # Если точек больше 4, берем только первые 4
    if len(all_points) > 4:
        Px = Px[:4]
        Py = Py[:4]

    if algo == "hermite":
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
    else:
        return [], []

    Cx = M.dot(Gx)
    Cy = M.dot(Gy)

    for i in range(steps * 2 + 1):  # Чуть больше шагов для одной кривой
        t = i / (steps * 2)
        T = np.array([t ** 3, t ** 2, t, 1])
        x = T.dot(Cx)
        y = T.dot(Cy)
        px, py = int(round(x)), int(round(y))
        result_points.append((px, py, 1))

        if i % 5 == 0:
            table_data.append({"t": round(t, 2), "x": round(x, 2), "y": round(y, 2), "px": px, "py": py})

    return result_points, table_data