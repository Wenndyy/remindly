import sqlite3
import os

# Connect to database
db_path = os.path.join(os.path.dirname(__file__), 'remindly.db')
print(f"Connecting to: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if column exists
    cursor.execute("PRAGMA table_info(events)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'meeting_type' not in columns:
        cursor.execute("ALTER TABLE events ADD COLUMN meeting_type TEXT DEFAULT 'onsite'")
        conn.commit()
        print("Column 'meeting_type' added successfully!")
    else:
        print("Column 'meeting_type' already exists.")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
