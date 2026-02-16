from flask import Blueprint, request, jsonify, render_template
# Проверь, что импорт правильный (относительно твоей структуры папок)
from .splines import generate_spline

lab3_bp = Blueprint("lab3", __name__)


@lab3_bp.route("/lab3")
def index():
    return render_template("lab3.html")


@lab3_bp.route("/lab3/draw", methods=["POST"])
def draw():
    data = request.json
    # Передаем список точек целиком и название алгоритма
    # Функция в splines.py теперь их примет как (all_points, algo)
    points_list, table = generate_spline(data['points'], data['algorithm'])

    return jsonify({
        "points": points_list,
        "table": table
    })