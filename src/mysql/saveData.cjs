const pool = require("./config.cjs");
const id = process.env.id
async function insertValues(message, role, phone,tipo) {
    const connection = await pool.getConnection();
    try {
        const sql = `INSERT INTO history (content, date, role, phone,type, idUser) VALUES (?, NOW(), ?, ?, ?, ?)`;
        const values = [message, role, phone, tipo, id];
        const [result, fields] = await connection.query(sql, values);
        
        // Si necesitas el resultado de la inserción por alguna razón, puedes retornarlo.
        return result;
    } catch (err) {
        console.log(err);
    } finally {
        connection.release();
    }
  }
  module.exports = { insertValues };