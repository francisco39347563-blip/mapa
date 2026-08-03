from flask import Flask, jsonify, request, send_from_directory
import sqlite3
from pathlib import Path
from werkzeug.utils import secure_filename
import uuid

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'mapa.db'
UPLOAD_DIR = BASE_DIR / 'fotos'

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS mapa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    status TEXT,
    categoria TEXT,
    latitude REAL,
    longitude REAL
);
'''

CREATE_PHOTOS_SQL = '''
CREATE TABLE IF NOT EXISTS fotos (
    id_foto INTEGER PRIMARY KEY AUTOINCREMENT,
    mapa_id INTEGER NOT NULL,
    referencia TEXT NOT NULL,
    descricao TEXT,
    FOREIGN KEY (mapa_id) REFERENCES mapa(id)
);
'''

CREATE_TRILHAS_SQL = '''
CREATE TABLE IF NOT EXISTS trilhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_trilha TEXT NOT NULL,
    cor TEXT NOT NULL
);
'''

CREATE_PONTOS_SQL = '''
CREATE TABLE IF NOT EXISTS pontos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_trilha INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (id_trilha) REFERENCES trilhas(id) ON DELETE CASCADE
);
'''

app = Flask(__name__, static_folder='.', static_url_path='')


def init_db():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute('PRAGMA foreign_keys = ON')
    cursor.execute(CREATE_TABLE_SQL)
    cursor.execute(CREATE_PHOTOS_SQL)
    cursor.execute(CREATE_TRILHAS_SQL)
    cursor.execute(CREATE_PONTOS_SQL)
    connection.commit()
    connection.close()


def get_db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    return connection


def fetch_trilhas(connection, trilha_id=None):
    cursor = connection.cursor()
    if trilha_id is None:
        cursor.execute('SELECT id, nome_trilha, cor FROM trilhas ORDER BY id')
    else:
        cursor.execute(
            'SELECT id, nome_trilha, cor FROM trilhas WHERE id = ?',
            (trilha_id,)
        )
    trilha_rows = cursor.fetchall()
    if not trilha_rows:
        return []

    ids = [row['id'] for row in trilha_rows]
    placeholders = ','.join('?' * len(ids))
    cursor.execute(
        f'''
        SELECT id, id_trilha, latitude, longitude, ordem
        FROM pontos
        WHERE id_trilha IN ({placeholders})
        ORDER BY id_trilha, ordem, id
        ''',
        ids
    )
    pontos_by_trilha = {}
    for row in cursor.fetchall():
        ponto = dict(row)
        pontos_by_trilha.setdefault(ponto['id_trilha'], []).append(ponto)

    trilhas = []
    for row in trilha_rows:
        trilha = dict(row)
        trilha['pontos'] = pontos_by_trilha.get(trilha['id'], [])
        trilhas.append(trilha)
    return trilhas


@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/user')
def user_page():
    return send_from_directory(BASE_DIR, 'user.html')


@app.route('/api/markers', methods=['GET'])
def get_markers():
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute('SELECT id, nome, descricao, status, categoria, latitude, longitude FROM mapa')
    rows = cursor.fetchall()
    cursor.execute('SELECT id_foto, mapa_id, referencia, descricao FROM fotos')
    photo_rows = cursor.fetchall()
    connection.close()

    photos_by_marker = {}
    for row in photo_rows:
        photo = dict(row)
        photos_by_marker.setdefault(photo['mapa_id'], []).append(photo)

    markers = []
    for row in rows:
        marker = dict(row)
        marker['fotos'] = photos_by_marker.get(marker['id'], [])
        markers.append(marker)

    return jsonify(markers)


@app.route('/api/markers/<int:marker_id>', methods=['GET'])
def get_marker(marker_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute('SELECT id, nome, descricao, status, categoria, latitude, longitude FROM mapa WHERE id = ?', (marker_id,))
    row = cursor.fetchone()
    if row is None:
        connection.close()
        return jsonify({'error': 'Marcador não encontrado'}), 404

    cursor.execute('SELECT id_foto, mapa_id, referencia, descricao FROM fotos WHERE mapa_id = ?', (marker_id,))
    photo_rows = cursor.fetchall()
    connection.close()

    marker = dict(row)
    marker['fotos'] = [dict(photo) for photo in photo_rows]
    return jsonify(marker)


@app.route('/api/markers', methods=['POST'])
def create_marker():
    data = request.get_json() or {}
    required = ['nome', 'descricao', 'status', 'categoria', 'latitude', 'longitude']
    if not all(key in data for key in required):
        return jsonify({'error': 'Dados incompletos'}), 400

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        'INSERT INTO mapa (nome, descricao, status, categoria, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
        (data['nome'], data['descricao'], data['status'], data['categoria'], data['latitude'], data['longitude'])
    )
    connection.commit()
    marker_id = cursor.lastrowid
    connection.close()
    return jsonify({'id': marker_id}), 201


@app.route('/api/photos', methods=['POST'])
def create_photo():
    if 'photo' not in request.files or 'mapa_id' not in request.form:
        return jsonify({'error': 'Dados incompletos'}), 400

    files = request.files.getlist('photo')
    if len(files) == 0:
        return jsonify({'error': 'Nenhuma imagem enviada'}), 400

    mapa_id = request.form.get('mapa_id')
    descricao = request.form.get('descricao')
    try:
        mapa_id = int(mapa_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'mapa_id inválido'}), 400

    saved_photos = []
    connection = get_db_connection()
    cursor = connection.cursor()

    for photo_file in files:
        if photo_file.filename == '':
            continue

        filename = secure_filename(photo_file.filename)
        if not filename:
            continue

        unique_name = f"{uuid.uuid4().hex}_{filename}"
        target_path = UPLOAD_DIR / unique_name
        photo_file.save(target_path)
        referencia = f"fotos/{unique_name}"

        cursor.execute(
            'INSERT INTO fotos (mapa_id, referencia, descricao) VALUES (?, ?, ?)',
            (mapa_id, referencia, descricao)
        )
        saved_photos.append({'id_foto': cursor.lastrowid, 'referencia': referencia})

    connection.commit()
    connection.close()

    return jsonify({'saved': saved_photos}), 201


@app.route('/api/markers/<int:marker_id>/photos', methods=['GET'])
def get_marker_photos(marker_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        'SELECT id_foto, mapa_id, referencia, descricao FROM fotos WHERE mapa_id = ?',
        (marker_id,)
    )
    rows = cursor.fetchall()
    connection.close()
    photos = [dict(row) for row in rows]
    return jsonify(photos)


@app.route('/api/trilhas', methods=['GET'])
def get_trilhas():
    connection = get_db_connection()
    trilhas = fetch_trilhas(connection)
    connection.close()
    return jsonify(trilhas)


@app.route('/api/trilhas/<int:trilha_id>', methods=['GET'])
def get_trilha(trilha_id):
    connection = get_db_connection()
    trilhas = fetch_trilhas(connection, trilha_id=trilha_id)
    connection.close()
    if not trilhas:
        return jsonify({'error': 'Trilha não encontrada'}), 404
    return jsonify(trilhas[0])


@app.route('/api/trilhas', methods=['POST'])
def create_trilha():
    data = request.get_json() or {}
    nome_trilha = (data.get('nome_trilha') or '').strip()
    cor = (data.get('cor') or '').strip() or '#e67e22'
    pontos = data.get('pontos')

    if not nome_trilha:
        return jsonify({'error': 'nome_trilha é obrigatório'}), 400
    if not isinstance(pontos, list) or len(pontos) < 2:
        return jsonify({'error': 'É necessário pelo menos 2 pontos'}), 400

    normalized_pontos = []
    for index, ponto in enumerate(pontos):
        try:
            latitude = float(ponto['latitude'])
            longitude = float(ponto['longitude'])
        except (KeyError, TypeError, ValueError):
            return jsonify({'error': f'Ponto inválido no índice {index}'}), 400
        ordem = ponto.get('ordem', index)
        try:
            ordem = int(ordem)
        except (TypeError, ValueError):
            ordem = index
        normalized_pontos.append((latitude, longitude, ordem))

    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            'INSERT INTO trilhas (nome_trilha, cor) VALUES (?, ?)',
            (nome_trilha, cor)
        )
        trilha_id = cursor.lastrowid
        cursor.executemany(
            'INSERT INTO pontos (id_trilha, latitude, longitude, ordem) VALUES (?, ?, ?, ?)',
            [(trilha_id, lat, lng, ordem) for lat, lng, ordem in normalized_pontos]
        )
        connection.commit()
    except Exception:
        connection.rollback()
        connection.close()
        return jsonify({'error': 'Não foi possível salvar a trilha'}), 500

    trilhas = fetch_trilhas(connection, trilha_id=trilha_id)
    connection.close()
    return jsonify(trilhas[0]), 201


@app.route('/api/trilhas/<int:trilha_id>', methods=['DELETE'])
def delete_trilha(trilha_id):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute('SELECT id FROM trilhas WHERE id = ?', (trilha_id,))
    if cursor.fetchone() is None:
        connection.close()
        return jsonify({'error': 'Trilha não encontrada'}), 404

    cursor.execute('DELETE FROM pontos WHERE id_trilha = ?', (trilha_id,))
    cursor.execute('DELETE FROM trilhas WHERE id = ?', (trilha_id,))
    connection.commit()
    connection.close()
    return jsonify({'ok': True})


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(BASE_DIR, path)


if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5000, debug=True)
