import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.resolve('pdd_database.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  console.log('--- Cleaning test data ---');
  db.run('DELETE FROM test_attempts', function(err) {
    if (err) console.error('Error clearing test_attempts:', err);
    else console.log('Cleared test_attempts. Rows affected:', this.changes);
  });

  db.run("DELETE FROM users WHERE role != 'admin' AND username != 'admin'", function(err) {
    if (err) console.error('Error deleting test users:', err);
    else console.log('Deleted test users. Rows affected:', this.changes);
  });

  db.run("UPDATE users SET device_id = NULL, current_token = NULL WHERE username = 'admin'", function(err) {
    if (err) console.error('Error resetting admin session:', err);
    else console.log('Reset admin session token and device binding.');
  });

  db.all('SELECT id, username, full_name, role, has_access, phone, device_id FROM users', (err, rows) => {
    if (err) console.error(err);
    else console.log('Remaining users in database:', rows);
  });
});
