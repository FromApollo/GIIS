from flask import Blueprint, request, jsonify
from .polygon import (check_convexity, find_inner_normals,
                      graham_scan, jarvis_march,
                      segment_polygon_intersection, point_in_polygon)

lab5_bp = Blueprint("lab5", __name__)


@lab5_bp.route("/lab5/check_convexity", methods=["POST"])
def route_check_convexity():
    data = request.json
    result, table = check_convexity(data["vertices"])
    return jsonify({"result": result, "table": table})


@lab5_bp.route("/lab5/normals", methods=["POST"])
def route_normals():
    data = request.json
    normals, table = find_inner_normals(data["vertices"])
    return jsonify({"normals": normals, "table": table})


@lab5_bp.route("/lab5/convex_hull", methods=["POST"])
def route_convex_hull():
    data = request.json
    algo = data.get("algorithm", "graham")
    if algo == "graham":
        hull, table = graham_scan(data["points"])
    else:
        hull, table = jarvis_march(data["points"])
    return jsonify({"hull": hull, "table": table})


@lab5_bp.route("/lab5/intersection", methods=["POST"])
def route_intersection():
    data = request.json
    intersections, table = segment_polygon_intersection(
        data["p1"], data["p2"], data["vertices"]
    )
    return jsonify({"intersections": intersections, "table": table})


@lab5_bp.route("/lab5/point_in_polygon", methods=["POST"])
def route_point_in_polygon():
    data = request.json
    result, table = point_in_polygon(data["point"], data["vertices"])
    return jsonify({"result": result, "table": table})