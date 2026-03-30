from flask import Blueprint, request, jsonify
from .clipping import (cohen_sutherland, cyrus_beck,
                        roberts_visibility, project_perspective)

lab8_bp = Blueprint("lab8", __name__)


# ── 2D отсечение ──────────────────────────────────────────

@lab8_bp.route("/lab8/cohen_sutherland", methods=["POST"])
def route_cohen_sutherland():
    d = request.json
    result = cohen_sutherland(
        d["x0"], d["y0"], d["x1"], d["y1"],
        d["xmin"], d["ymin"], d["xmax"], d["ymax"]
    )
    return jsonify(result)


@lab8_bp.route("/lab8/cyrus_beck", methods=["POST"])
def route_cyrus_beck():
    d = request.json
    result = cyrus_beck(
        d["x0"], d["y0"], d["x1"], d["y1"],
        d["xmin"], d["ymin"], d["xmax"], d["ymax"]
    )
    return jsonify(result)


# ── 3D удаление невидимых граней ─────────────────────────

@lab8_bp.route("/lab8/roberts", methods=["POST"])
def route_roberts():
    d = request.json
    faces_vis, table = roberts_visibility(
        d["vertices"], d["faces"], d["view_dir"]
    )
    projected = project_perspective(d["vertices"], d.get("focal", 400))
    return jsonify({"faces": faces_vis, "projected": projected, "table": table})
