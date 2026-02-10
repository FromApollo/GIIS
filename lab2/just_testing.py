import matplotlib.pyplot as plt
import matplotlib.ticker as ticker


class BresenhamVisualizer:
    def __init__(self):
        # Используем set для уникальности, чтобы при наложениях не дублировать объекты
        self.points = set()

    def add_pixel(self, x, y):
        self.points.add((x, y))

    def add_symmetry(self, x, y, symmetry_type='quad'):
        """
        Добавляет точки с учетом визуальной симметрии относительно осей,
        проходящих МЕЖДУ пикселями.

        Логика:
        Rectangle((x, y)) рисует квадрат от x до x+1.
        Для симметрии слева нужно рисовать от -x-1 до -x.
        """
        # 1. Первая четверть (x, y) -> рисуем как есть
        self.add_pixel(x, y)

        if symmetry_type == 'quad':
            # 2. Вторая четверть (-x, y) -> сдвигаем X влево на 1
            self.add_pixel(-x - 1, y)
            # 3. Третья четверть (-x, -y) -> сдвигаем X и Y
            self.add_pixel(-x - 1, -y - 1)
            # 4. Четвертая четверть (x, -y) -> сдвигаем Y вниз на 1
            self.add_pixel(x, -y - 1)

        elif symmetry_type == 'x_axis':
            # Отражение только по X (вертикально вниз), то есть y -> -y
            self.add_pixel(x, -y - 1)

    # --- АЛГОРИТМЫ ---

    def circle_full(self, R):
        """Полная окружность (Мичнер)"""
        x, y = 0, R
        d = 3 - 2 * R
        # Рисуем 1/8 часть и зеркалим на все 8 частей (здесь через quad симметрию)
        while y >= x:
            self.add_symmetry(x, y, 'quad')
            self.add_symmetry(y, x, 'quad')  # Дополнительная симметрия x <-> y
            x += 1
            if d > 0:
                y -= 1
                d = d + 4 * (x - y) + 10
            else:
                d = d + 4 * x + 6

    def ellipse_full(self, a, b):
        """Полный эллипс (алгоритм средней точки)"""
        x, y = 0, b
        a2, b2 = a * a, b * b

        # Участок 1: пологий (dx > dy для эллипса начинается сверху, так что dy меняется быстрее)
        # В классике это Region 1, где наклон < 1. Начинаем сверху (0, b).

        # d для средней точки
        d = 4 * b2 - 4 * a2 * b + a2

        while a2 * (2 * y - 1) > 2 * b2 * (x + 1):
            self.add_symmetry(x, y, 'quad')
            if d < 0:
                x += 1
                d += 4 * b2 * (2 * x + 3)
            else:
                x += 1
                y -= 1
                d += 4 * b2 * (2 * x + 3) + 4 * a2 * (2 - 2 * y)

        # Участок 2: крутой
        d = b2 * (2 * x + 1) ** 2 + 4 * a2 * (y - 1) ** 2 - 4 * a2 * b2
        while y >= 0:
            self.add_symmetry(x, y, 'quad')
            if d < 0:
                x += 1
                y -= 1
                d += 4 * b2 * (2 * x + 2) + 4 * a2 * (3 - 2 * y)
            else:
                y -= 1
                d += 4 * a2 * (3 - 2 * y)

    def parabola_full(self, p, x_limit=20):
        """Полная парабола y^2 = 2px"""
        x, y = 0, 0
        d = 1 - 2 * p

        # Участок 1: Крутой (y растет быстрее x)
        while y < p and x <= x_limit:
            self.add_symmetry(x, y, 'x_axis')
            y += 1
            if d >= 0:
                x += 1
                d += 2 * y + 3 - 2 * p
            else:
                d += 2 * y + 3

        # Участок 2: Пологий (x растет быстрее y)
        d = (y + 0.5) ** 2 - 2 * p * (x + 1)
        while x <= x_limit:
            self.add_symmetry(x, y, 'x_axis')
            x += 1
            if d < 0:
                y += 1
                d += 2 * y + 2 - 2 * p
            else:
                d -= 2 * p

    def hyperbola_full(self, a, b, x_limit=20):
        """Гипербола b^2 * x^2 - a^2 * y^2 = a^2 * b^2"""
        x, y = a, 0
        a2 = a * a
        b2 = b * b

        # Участок 1: Крутой наклон (растем вверх от вершины)
        # dy > dx (тангенс > 1)
        d = 4 * b2 * a - 4 * a2 + b2  # Инициализация (x+0.5, y+1)

        while (2 * a2 * y <= 2 * b2 * x) and x <= x_limit:
            self.add_symmetry(x, y, 'quad')
            y += 1
            if d >= 0:
                d += -4 * a2 * (2 * y + 1)
            else:
                x += 1
                d += 4 * b2 * (2 * x + 2) - 4 * a2 * (2 * y + 1)

        # Участок 2: Пологий наклон
        # Пересчет d для точки (x+1, y+0.5)
        d = 4 * b2 * (x + 1) ** 2 - 4 * a2 * (y + 0.5) ** 2 - 4 * a2 * b2

        while x <= x_limit:
            self.add_symmetry(x, y, 'quad')
            x += 1
            if d < 0:
                y += 1
                d += 4 * b2 * (2 * x + 1) - 4 * a2 * (2 * y + 2)
            else:
                d += 4 * b2 * (2 * x + 1)

    def render(self, title):
        fig, ax = plt.subplots(figsize=(10, 10))

        # Рисуем прямоугольники. Сдвигать их НЕ нужно, так как add_symmetry
        # уже рассчитал правильные координаты для всех четвертей.
        for x, y in self.points:
            ax.add_patch(plt.Rectangle((x, y), 1, 1, color="skyblue", ec="blue"))

        # Вычисление границ для красивого отображения
        if not self.points:
            all_x, all_y = [0], [0]
        else:
            all_x = [p[0] for p in self.points]
            all_y = [p[1] for p in self.points]

        # Добавляем отступы
        max_x, max_y = max(all_x) + 2, max(all_y) + 2
        min_x, min_y = min(all_x) - 1, min(all_y) - 1

        # Устанавливаем тики строго по целым числам (границы пикселей)
        ax.set_xticks(range(int(min_x), int(max_x) + 1))
        ax.set_yticks(range(int(min_y), int(max_y) + 1))

        # Сетка по границам
        ax.grid(True, which='both', linestyle='--', color='gray', alpha=0.5)

        # Оси координат:
        # Поскольку мы используем симметрию "между пикселями",
        # ось 0 проходит ровно между пикселем -1 (заканчивается в 0) и 0 (начинается в 0).
        ax.axhline(0, color='red', linewidth=2)
        ax.axvline(0, color='red', linewidth=2)

        ax.set_aspect('equal')
        plt.title(title)

        # Очистка для следующего вызова
        self.points = set()
        plt.show()


# Запуск
if __name__ == "__main__":
    v = BresenhamVisualizer()

    # 1. Круг
    v.circle_full(R=10)
    v.render("Брезенхем: Полный круг (R=10)")

    # 2. Эллипс
    v.ellipse_full(a=15, b=10)
    v.render("Брезенхем: Полный эллипс (a=15, b=10)")

    # 3. Парабола
    v.parabola_full(p=5, x_limit=18)
    v.render("Брезенхем: Полная парабола (p=5)")

    # 4. Гипербола
    v.hyperbola_full(a=6, b=4, x_limit=16)
    v.render("Брезенхем: Полная гипербола (a=6, b=4)")
