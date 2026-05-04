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

def create_database(path: str = DB_PATH) -> None:
    """Create the SQLite database and the mapa and fotos tables."""
    connection = sqlite3.connect(path)
    cursor = connection.cursor()
    cursor.execute(CREATE_TABLE_SQL)
    cursor.execute(CREATE_PHOTOS_SQL)
    connection.commit()
    connection.close()
    print(f"Banco de dados criado em '{path}' com as tabelas 'mapa' e 'fotos'.")


if __name__ == '__main__':
    create_database()
