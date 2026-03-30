from flask import Flask, render_template
from lab1.routes import lab1_bp
from lab2.routes import lab2_bp
from lab3.routes import lab3_bp
from lab4.routes import lab4_bp
from lab5.routes import lab5_bp
from lab5.routes6 import lab6_bp as lab6_fill_bp
from lab7.routes import lab7_bp
from lab8.routes import lab8_bp

app = Flask(__name__)
app.register_blueprint(lab1_bp)
app.register_blueprint(lab2_bp)
app.register_blueprint(lab3_bp)
app.register_blueprint(lab4_bp)
app.register_blueprint(lab5_bp)
app.register_blueprint(lab6_fill_bp)
app.register_blueprint(lab7_bp)
app.register_blueprint(lab8_bp)

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

@app.route("/lab4")
def lab4_page():
    return render_template("lab4.html")

@app.route("/lab5")
def lab5_page():
    return render_template("lab5.html")

@app.route("/lab6")
def lab6_page():
    return render_template("lab6.html")

@app.route("/lab7")
def lab7_page():
    return render_template("lab7.html")

@app.route("/lab8")
def lab8_page():
    return render_template("lab8.html")

if __name__ == "__main__":
    app.run(debug=True)
