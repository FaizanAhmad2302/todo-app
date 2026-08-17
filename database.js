const Database = require('better-sqlite3');
const db=new Database('TODOs.db')
db.exec(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
)`);
module.exports=db;