"""
Database migration script to add missing columns and tables.
Run this once to sync the database schema with the latest models.
"""
import sqlite3
import os

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), 'remindly.db')
print(f"Database path: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns in users table
cursor.execute('PRAGMA table_info(users)')
existing_cols = [col[1] for col in cursor.fetchall()]
print(f'Existing columns in users: {existing_cols}')

# New columns to add to users
new_user_cols = [
    ('first_name', 'TEXT'),
    ('last_name', 'TEXT'),
    ('date_of_birth', 'TEXT'),
    ('country', 'TEXT'),
    ('city', 'TEXT'),
]

for col_name, col_type in new_user_cols:
    if col_name not in existing_cols:
        print(f'Adding column to users: {col_name}')
        cursor.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}')
    else:
        print(f'Column {col_name} already exists')

# Check if notifications table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'")
if not cursor.fetchone():
    print('Creating notifications table')
    cursor.execute('''
        CREATE TABLE notifications (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            event_id INTEGER,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            notification_type TEXT DEFAULT 'reminder',
            is_read INTEGER DEFAULT 0,
            created_at INTEGER,
            expires_at INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
    ''')
    print('Notifications table created')
else:
    print('Notifications table already exists')

conn.commit()
conn.close()
print('Database migration complete!')
