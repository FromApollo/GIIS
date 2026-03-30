from flask import Blueprint, request, jsonify
from .voronoi import bowyer_watson, voronoi_from_delaunay

lab7_bp = Blueprint("lab7", __name__)


@lab7_bp.route("/lab7/delaunay", methods=["POST"])
def route_delaunay():
    data = request.json
    points = data["points"]
    triangles, table = bowyer_watson(points)
    return jsonify({"triangles": triangles, "table": table})


@lab7_bp.route("/lab7/voronoi", methods=["POST"])
def route_voronoi():
    data = request.json
    points = data["points"]
    triangles, _ = bowyer_watson(points)
    edges, centers, table = voronoi_from_delaunay(points, triangles)
    return jsonify({"edges": edges, "centers": centers,
                    "triangles": triangles, "table": table})
