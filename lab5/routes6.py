from flask import Blueprint, request, jsonify
from .fill import (
    scanline_ordered_edge_list,
    scanline_active_edge_list,
    seed_fill_simple,
    seed_fill_scanline,
)

lab6_bp = Blueprint("lab6", __name__)


@lab6_bp.route("/lab6/scanline_oel", methods=["POST"])
def route_scanline_oel():
    """Растровая развёртка — упорядоченный список рёбер."""
    data = request.json
    pixels, steps, intersections = scanline_ordered_edge_list(data["vertices"])
    return jsonify({"pixels": pixels, "steps": steps,
                    "intersections": {str(k): v for k, v in intersections.items()}})


@lab6_bp.route("/lab6/scanline_ael", methods=["POST"])
def route_scanline_ael():
    """Растровая развёртка — список активных рёбер (CAP)."""
    data = request.json
    pixels, steps, _ = scanline_active_edge_list(data["vertices"])
    return jsonify({"pixels": pixels, "steps": steps})


@lab6_bp.route("/lab6/seed_simple", methods=["POST"])
def route_seed_simple():
    """Простой алгоритм заполнения с затравкой (4-связный)."""
    data = request.json
    pixels, steps = seed_fill_simple(data["vertices"], data["seed"])
    return jsonify({"pixels": pixels, "steps": steps})


@lab6_bp.route("/lab6/seed_scanline", methods=["POST"])
def route_seed_scanline():
    """Построчный алгоритм заполнения с затравкой."""
    data = request.json
    pixels, steps = seed_fill_scanline(data["vertices"], data["seed"])
    return jsonify({"pixels": pixels, "steps": steps})