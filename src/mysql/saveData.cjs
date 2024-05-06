const pool = require("./mysql/config.cjs");
async function insertValues(message, input, phone) {
    const connection = await pool.getConnection();
    try {
        const sql = `INSERT INTO history (message, date, input, phone) VALUES (?, NOW(), ?, ?)`;
        const values = [message, input, phone];
        const [result, fields] = await connection.query(sql, values);
        
        // Si necesitas el resultado de la inserción por alguna razón, puedes retornarlo.
        return result;
    } catch (err) {
        console.log(err);
    } finally {
        connection.release();
    }
  }
  