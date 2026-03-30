from flask import Blueprint, request, jsonify
from .voronoi import delaunay_triangulation, voronoi_from_delaunay

lab7_bp = Blueprint("lab7", __name__)


@lab7_bp.route("/lab7/delaunay", methods=["POST"])
def route_delaunay():
    data = request.json
    pts = data.get("points", [])
    triangles, log = delaunay_triangulation(pts)
    return jsonify({"triangles": triangles, "log": log})


@lab7_bp.route("/lab7/voronoi", methods=["POST"])
def route_voronoi():
    data = request.json
    pts = data.get("points", [])
    triangles = data.get("triangles", [])
    segments = voronoi_from_delaunay(pts, triangles)
    return jsonify({"segments": segments})
