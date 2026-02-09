from flask import Blueprint, request, jsonify
from .lines import dda, bresenham, wu

lab1_bp = Blueprint("lab1", __name__)

@lab1_bp.route("/lab1/draw", methods=["POST"])
def draw():
    data = request.json
    x1, y1 = data["x1"], data["y1"]
    x2, y2 = data["x2"], data["y2"]
    algo = data["algorithm"]

    if algo == "dda":
        points, table = dda(x1, y1, x2, y2)
    elif algo == "bresenham":
        points, table = bresenham(x1, y1, x2, y2)
    elif algo == "wu":
        points, table = wu(x1, y1, x2, y2)
    else:
        return jsonify({"error": "Unknown algorithm"})

    return jsonify({"points": points, "table": table})
