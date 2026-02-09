# app.py
from flask import Flask, render_template, request, jsonify
from lab1 import dda, bresenham, wu

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/draw", methods=["POST"])
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

    return jsonify({
        "points": points,
        "table": table
    })


if __name__ == "__main__":
    app.run(debug=True)
