from flask import Blueprint, request, jsonify
from .clipping import (cohen_sutherland, midpoint_subdivision, cyrus_beck,
                       roberts_visibility, make_cube_faces)

lab8_bp = Blueprint("lab8", __name__)


@lab8_bp.route("/lab8/cohen_sutherland", methods=["POST"])
def route_cs():
    d = request.json
    visible, seg, table = cohen_sutherland(
        d["x1"], d["y1"], d["x2"], d["y2"],
        d["xmin"], d["xmax"], d["ymin"], d["ymax"]
    )
    return jsonify({"visible": visible, "segment": seg, "table": table})


@lab8_bp.route("/lab8/midpoint_subdivision", methods=["POST"])
def route_midpoint():
    """Маршрут для алгоритма разбиения средней точкой."""
    d = request.json
    visible, seg, table = midpoint_subdivision(
        d["x1"], d["y1"], d["x2"], d["y2"],
        d["xmin"], d["xmax"], d["ymin"], d["ymax"]
    )
    return jsonify({"visible": visible, "segment": seg, "table": table})


@lab8_bp.route("/lab8/cyrus_beck", methods=["POST"])
def route_cb():
    d = request.json
    visible, seg, table = cyrus_beck(
        d["x1"], d["y1"], d["x2"], d["y2"],
        d["vertices"]
    )
    return jsonify({"visible": visible, "segment": seg, "table": table})


@lab8_bp.route("/lab8/roberts", methods=["POST"])
def route_roberts():
    """
    Алгоритм Робертса.

    Принимает:
      view_dir — нормализованный вектор взгляда [vx, vy, vz].
                 main.js передаёт направление от позиции камеры Three.js
                 к началу координат (центру куба).
      faces    — (опционально) список кастомных граней.
      size     — (опционально) полуребро куба, по умолчанию 1
                 (куб от -1 до +1, как в Three.js сцене).

    Возвращает:
      results  — [{'name', 'normal', 'dot', 'visible'}, ...]
      table    — строки для таблицы шагов на странице.
    """
    d = request.json
    view_dir = d.get("view_dir", [-1, 0, -1])

    # Принимаем кастомные грани или строим куб.
    # size=1 → полуребро 1, куб от -1 до +1 — совпадает с Three.js сценой.
    if "faces" in d and d["faces"]:
        faces = d["faces"]
    else:
        size = d.get("size", 1)
        faces = make_cube_faces(0, 0, 0, size)

    results, table = roberts_visibility(faces, view_dir)
    return jsonify({"results": results, "table": table})