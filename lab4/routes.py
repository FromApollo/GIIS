from flask import Blueprint, render_template, jsonify
import os

lab4_bp = Blueprint('lab4', __name__)

# Определяем путь к папке data внутри папки lab4
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')


@lab4_bp.route('/lab4')
def index():
    return render_template('lab4.html')


@lab4_bp.route('/lab4/list_files')
def list_files():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    files = [f.replace('.txt', '') for f in os.listdir(DATA_DIR) if f.endswith('.txt')]
    return jsonify({'files': files})


@lab4_bp.route('/lab4/data/<filename>')
def get_data(filename):
    path = os.path.join(DATA_DIR, f'{filename}.txt')

    if not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404

    vertices = []
    edges = []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.split()
                if not parts: continue
                if parts[0] == 'v':
                    vertices.append([float(x) for x in parts[1:]])
                elif parts[0] == 'e':
                    edges.append([int(x) for x in parts[1:]])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'vertices': vertices, 'edges': edges})