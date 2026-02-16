from flask import Flask, render_template
from lab1.routes import lab1_bp
from lab2.routes import lab2_bp
from lab3.routes import lab3_bp
app = Flask(__name__)
app.register_blueprint(lab1_bp)
app.register_blueprint(lab2_bp)
app.register_blueprint(lab3_bp)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/lab1")
def lab1_page():
    return render_template("lab1.html")

@app.route("/lab2")
def lab2_page():
    return render_template("lab2.html")

@app.route("/lab3")
def lab3_page():
    return render_template("lab3.html")

if __name__ == "__main__":
    app.run(debug=True)
