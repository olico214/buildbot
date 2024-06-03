const mysql = require('mysql2/promise');

let pool;

try {
  pool = mysql.createPool({
    host: '193.203.166.182',
    user: 'u408972741_notify',
    database: 'u408972741_notify',
    password: 'P$7CL>WVv3',
  });
} catch (err) {
  console.error(err);
}

module.exports = pool;
