const mysql = require('mysql2');

let pool;

try {
  pool = mysql.createPool({
    host: '195.179.239.51',
    user: 'u124569701_notify',
    database: 'u124569701_notify',
    password: '*W0&cS$R1&o',
  });
} catch (err) {
  console.error(err);
}

module.exports = pool;
