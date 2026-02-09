from flask import Flask, render_template
from lab1.routes import lab1_bp

app = Flask(__name__)
app.register_blueprint(lab1_bp)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/lab1")
def lab1_page():
    return render_template("lab1.html")

if __name__ == "__main__":
    app.run(debug=True)
