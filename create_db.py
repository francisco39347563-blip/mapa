import sqlite3

DB_PATH = 'mapa.db'

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

def create_database(path: str = DB_PATH) -> None:
    """Create the SQLite database and required tables."""
    connection = sqlite3.connect(path)
    cursor = connection.cursor()
    cursor.execute(CREATE_TABLE_SQL)
    cursor.execute(CREATE_PHOTOS_SQL)
    cursor.execute(CREATE_TRILHAS_SQL)
    cursor.execute(CREATE_PONTOS_SQL)
    connection.commit()
    connection.close()
    print(f"Banco de dados criado em '{path}' com as tabelas 'mapa', 'fotos', 'trilhas' e 'pontos'.")


if __name__ == '__main__':
    create_database()
