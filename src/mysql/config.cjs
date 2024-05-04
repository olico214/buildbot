const mysql = require('mysql2/promise');

let pool;

try {
  pool = mysql.createPool({
    host: process.env.host,
    user: process.env.user,
    database: process.env.database,
    password: process.env.password,
  });
} catch (err) {
  console.error(err);
}

module.exports = pool;
