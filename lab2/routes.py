from flask import Blueprint, request, jsonify
from .curves import circle, ellipse, parabola, hyperbola

lab2_bp = Blueprint("lab2", __name__)

@lab2_bp.route("/lab2/draw", methods=["POST"])
def draw():
    data = request.json
    curve_type = data["type"]
    cx = data["cx"]
    cy = data["cy"]

    if curve_type == "circle":
        points, table = circle(cx, cy, data["r"])
    elif curve_type == "ellipse":
        points, table = ellipse(cx, cy, data["a"], data["b"])
    elif curve_type == "parabola":
        points, table = parabola(cx, cy, data["p"])
    elif curve_type == "hyperbola":
        points, table = hyperbola(cx, cy, data["a"], data["b"])
    else:
        return jsonify({"error": "Unknown curve type"})

    return jsonify({"points": points, "table": table})