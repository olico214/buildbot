require('dotenv').config();

const axios = require('axios');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const pool = require("../mysql/config.cjs");
const id = process.env.id

async function getData() {

    const connection = await pool.getConnection();
    try {
        const sql = `select * from bot where userid =  ?`;

        const [result, fields] = await connection.query(sql, [id]);
       
        return  result
    } catch (err) {
        console.log(err);
    } finally {
        connection.release();
        
    }
}



async function fetchCtx(phone) {
  const connection = await pool.getConnection();
  
  try {
    const sql = `SELECT role, content
    FROM (
        SELECT role, content, date
        FROM history
        WHERE phone = ?
        ORDER BY date DESC
        LIMIT 6
    ) AS subquery
    ORDER BY date ASC;
    `;

    const [result, fields] = await connection.query(sql, [phone]);
   
    return  result
  } catch (err) {
      console.log(err);
  } finally {
      connection.release();
  }
}



async function fecthResponse(phone, id) {
  const connection = await pool.getConnection();
  
  try {
    const sql = `SELECT * FROM responseBot WHERE phone = ? AND iduser = ?`;

    const [result, fields] = await connection.query(sql, [phone, id]);
   
    if (result.length === 0) {
      return true;
    }
    
    return false;
  } catch (err) {
    console.error(err);
    return false;
  } finally {
    connection.release();
  }
}


async function gpt(data) {
  const ctx = await getData()

  console.log(ctx)
  if(ctx[0].connected == 1){
    return false
  }

  const getstopped = await fecthResponse(data.phone)
  
  if(!getstopped){
    return false
  }
  const retrieveMessages = await fetchCtx(data.phone)
  const mensajes = retrieveMessages
// Crear un nuevo array con la estructura deseada
  const nuevoArray = mensajes.map(mensaje => {
    return {
        role: mensaje.role,
        content: mensaje.content
    };
  });
  try {

      console.log(nuevoArray)
    
    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `nombre: ${ctx[0].name}, personalidad: ${ctx[0].personality}, contexto: ${ctx[0].contexto} ` 
        },
        ...nuevoArray
      ]
    };

    // Make request to OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Extract and return response
    const generatedMessage = response.data.choices[0].message.content;
    return generatedMessage;
    
  } catch (error) {
    // console.error('Error sending message to OpenAI:', error);
    return 'Lo siento, no puedo responder en este momento.';
  }
}

module.exports = { gpt };
