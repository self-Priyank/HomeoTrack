import sys
from pathlib import Path

# Auto-resolve root directory for direct script execution from any sub-folder CWD
_ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

import gzip
import sqlite3
import time
import json
import os
import psycopg2
from homeotrack.config import DATABASE_URL, OOREP_SQL_GZ, BASE_DIR
from homeotrack.database.connection import init_db


def parse_sql_value(val: str):
    """Convert PostgreSQL dump tab-separated value to Python value."""
    if val == r"\N" or val == "":
        return None
    return val


def parse_array_value(val: str):
    """Parse PostgreSQL array format like '{synonym1,synonym2}' to JSON string."""
    if not val or val == r"\N":
        return None
    if val.startswith("{") and val.endswith("}"):
        items = val[1:-1].split(",")
        return json.dumps([i.strip('"') for i in items if i])
    return val


def ingest_oorep_data(db_url: str = DATABASE_URL, sql_gz_path: Path = OOREP_SQL_GZ):
    """Parses oorep.sql.gz and ingests all records into PostgreSQL or SQLite database."""
    print(f"[Ingestion] Initializing DB schema for {db_url.split('@')[-1] if '@' in db_url else db_url}...")
    init_db()

    is_sqlite = db_url.startswith("sqlite")

    if is_sqlite:
        db_path = Path(db_url.replace("sqlite:///", ""))
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA synchronous = OFF;")
        cursor.execute("PRAGMA journal_mode = MEMORY;")
    else:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        # Disable FK checks during bulk ingestion in PostgreSQL
        try:
            cursor.execute("SET session_replication_role = 'replica';")
        except Exception:
            pass

    print(f"[Ingestion] Opening raw dump file: {sql_gz_path}...")
    start_time = time.time()

    current_table = None
    batch = []
    batch_size = 50000

    target_tables = {
        "info": ("info", "(abbrev, title, languag, authorlastname, authorfirstname, yearr, publisher, license, edition, access, displaytitle) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"),
        "rubric": ("rubric", "(abbrev, rubric_id, mother, ismother, chapterid, fullpath, path, textt) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"),
        "remedy": ("remedy", "(id, nameabbrev, namelong, namealt) VALUES (%s, %s, %s, %s)"),
        "rubricremedy": ("rubricremedy", "(abbrev, rubricid, remedyid, weight, chapterid) VALUES (%s, %s, %s, %s, %s)"),
        "mminfo": ("mminfo", "(id, abbrev, lang, fulltitle, authorlastname, authorfirstname, publisher, yearr, license, access, displaytitle) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"),
        "mmchapter": ("mmchapter", "(id, mminfo_id, heading, remedy_id) VALUES (%s, %s, %s, %s)"),
        "mmsection": ("mmsection", "(id, mmchapter_id, depth, parent_sec_id, succ_sec_id, heading, content) VALUES (%s, %s, %s, %s, %s, %s, %s)"),
    }

    counts = {table: 0 for table in target_tables}

    def flush_batch(table, rows):
        if not rows or table not in target_tables:
            return
        tbl_name, cols_values = target_tables[table]
        if is_sqlite:
            sql = f"INSERT INTO {tbl_name} {cols_values.replace('%s', '?')}"
            cursor.executemany(sql, rows)
        else:
            from psycopg2.extras import execute_values
            cols_only = cols_values[:cols_values.find("VALUES")]
            sql = f"INSERT INTO {tbl_name} {cols_only} VALUES %s ON CONFLICT DO NOTHING"
            execute_values(cursor, sql, rows, page_size=10000)
        counts[table] += len(rows)

    with gzip.open(sql_gz_path, "rt", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.startswith("COPY public."):
                if current_table and batch:
                    flush_batch(current_table, batch)
                    batch = []

                parts = line.strip().split()
                table_raw = parts[1].replace("public.", "")

                if table_raw in target_tables:
                    current_table = table_raw
                    print(f"[Ingestion] Processing table '{current_table}'...")
                else:
                    current_table = None

            elif line == "\\.\n":
                if current_table and batch:
                    flush_batch(current_table, batch)
                    batch = []
                current_table = None

            elif current_table:
                raw_vals = line.rstrip("\r\n").split("\t")
                row = [parse_sql_value(v) for v in raw_vals]

                if current_table == "info":
                    row[5] = int(row[5]) if row[5] else None
                elif current_table == "rubric":
                    abbrev, id_, mother, ismother, chapterid, fullpath, path, textt = row
                    row = [
                        abbrev,
                        int(id_),
                        int(mother) if mother else None,
                        True if ismother in ("t", "true", "1") else False,
                        int(chapterid),
                        fullpath,
                        path,
                        textt
                    ]
                elif current_table == "remedy":
                    id_, nameabbrev, namelong, namealt = row
                    row = [
                        int(id_),
                        nameabbrev,
                        namelong,
                        parse_array_value(namealt)
                    ]
                elif current_table == "rubricremedy":
                    abbrev, rubricid, remedyid, weight, chapterid = row
                    row = [
                        abbrev,
                        int(rubricid),
                        int(remedyid),
                        int(weight),
                        int(chapterid)
                    ]
                elif current_table == "mminfo":
                    row[0] = int(row[0])
                    row[7] = int(row[7]) if row[7] else None
                elif current_table == "mmchapter":
                    row[0] = int(row[0])
                    row[1] = int(row[1]) if row[1] else None
                    row[3] = int(row[3]) if row[3] else None
                elif current_table == "mmsection":
                    row[0] = int(row[0])
                    row[1] = int(row[1]) if row[1] else None
                    row[2] = int(row[2]) if row[2] else 0
                    row[3] = int(row[3]) if row[3] else None
                    row[4] = int(row[4]) if row[4] else None

                batch.append(row)
                if len(batch) >= batch_size:
                    flush_batch(current_table, batch)
                    batch = []

    if not is_sqlite:
        try:
            cursor.execute("SET session_replication_role = 'origin';")
        except Exception:
            pass

    conn.commit()

    print("[Ingestion] Creating database indexes for sub-50ms query latency...")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rubric_textt ON rubric(textt);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rubric_fullpath ON rubric(fullpath);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rubric_abbrev_rubricid ON rubric(abbrev, rubric_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_remedy_nameabbrev ON remedy(nameabbrev);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_remedy_namelong ON remedy(namelong);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rr_rubric_remedy ON rubricremedy(rubricid, remedyid, weight);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rr_remedy_rubric ON rubricremedy(remedyid, rubricid, weight);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rr_abbrev_rubric ON rubricremedy(abbrev, rubricid);")
    conn.commit()

    if is_sqlite:
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute("PRAGMA journal_mode = WAL;")

    conn.close()

    elapsed = time.time() - start_time
    print(f"[Ingestion Completed] Successfully ingested oorep data into {('SQLite' if is_sqlite else 'PostgreSQL')} in {elapsed:.2f} seconds!")
    for table, count in counts.items():
        print(f"  - {table}: {count:,} records")

    return counts


def main():
    ingest_oorep_data()


if __name__ == "__main__":
    main()
