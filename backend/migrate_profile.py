"""
Database migration script to add new profile fields to users table.
Run this once to update existing database.
"""
import sqlite3

DB_PATH = "remindly.db"

def run_migration():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = [row[1] for row in cursor.fetchall()]
    print(f"Existing columns: {existing_columns}")
    
    # New columns to add
    new_columns = [
        ("first_name", "TEXT"),
        ("last_name", "TEXT"),
        ("date_of_birth", "TEXT"),
        ("country", "TEXT"),
        ("city", "TEXT"),
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"Added column: {col_name}")
            except sqlite3.OperationalError as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column {col_name} already exists")
    
    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
