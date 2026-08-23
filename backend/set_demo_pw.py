from app.middleware.auth import hash_password
import sqlite3

conn = sqlite3.connect("globetrotter.db")
cur = conn.cursor()
h = hash_password("Password123!")
cur.execute("UPDATE users SET password_hash = ? WHERE email = ?", (h, "demo@globetrotter.com"))
conn.commit()
print("Updated demo@globetrotter.com password to 'Password123!'")
conn.close()
