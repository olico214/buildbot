require('dotenv').config();
const axios = require('axios');
const pool = require("../mysql/config.cjs");
const id = process.env.ID;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getData() {
    const connection = await pool.getConnection();
    try {
        const sql = `SELECT * FROM bot WHERE userid = ?`;
        const [result] = await connection.query(sql, [id]);
        return result;
    } catch (err) {
        console.log(err);
        throw err;
    } finally {
        connection.release();
    }
}

async function fetchCtx(phone) {
    const connection = await pool.getConnection();
    try {
        const sql = `
            SELECT role, content
            FROM (
                SELECT role, content, date
                FROM history
                WHERE phone = ?
                ORDER BY date DESC
                LIMIT 6
            ) AS subquery
            ORDER BY date ASC;
        `;
        const [result] = await connection.query(sql, [phone]);
        return result;
    } catch (err) {
        console.log(err);
        throw err;
    } finally {
        connection.release();
    }
}

async function fetchResponse(phone) {
    const connection = await pool.getConnection();
    try {
        const sql = `SELECT * FROM responseBot WHERE phone = ? AND iduser = ?`;
        const [result] = await connection.query(sql, [phone, id]);
        return result.length === 0;
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        connection.release();
    }
}

async function stopBot(phone) {
    const connection = await pool.getConnection();
    try {
        const sql = `INSERT INTO responseBot (phone, iduser, status) VALUES (?, ?, 1)`;
        await connection.query(sql, [phone, id]);
        return false;
    } catch (err) {
        console.error(err);
        throw err;
    } finally {
        connection.release();
    }
}

async function gpt(data) {
    try {
        const ctx = await getData();

        if (ctx[0].connected == 1) {
            return false;
        }

        const getstopped = await fetchResponse(data.phone);

        if (!getstopped) {
            return false;
        }

        const mensaje = data.mensajes;
        if (mensaje.toLowerCase() === "asesor") {
            await stopBot(data.phone);
            return false;
        }

        const delay = ctx[0].delay;
        await new Promise(resolve => setTimeout(resolve, delay * 1000));

        const retrieveMessages = await fetchCtx(data.phone);
        const mensajes = retrieveMessages.map(mensaje => ({
            role: mensaje.role,
            content: mensaje.content
        }));

        const requestData = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `nombre: ${ctx[0].name}, personalidad: ${ctx[0].personality}, contexto: ${ctx[0].contexto}`
                },
                ...mensajes
            ],
            temperature: 1,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        const generatedMessage = response.data.choices[0].message.content;
        return generatedMessage;
    } catch (error) {
        console.error('Error sending message to OpenAI:', error);
        return false;
    }
}

module.exports = { gpt };
