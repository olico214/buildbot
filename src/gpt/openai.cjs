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
    const sql = `select * from history where phone =  ? limit 6`;

    const [result, fields] = await connection.query(sql, [phone]);
   
    return  result
  } catch (err) {
      console.log(err);
  } finally {
      connection.release();
  }
}

async function gpt(data) {
  const ctx = await getData()
  const retrieveMessages = await fetchCtx(data.phone)
  const mensajes = retrieveMessages[0]
  try {

    
    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: ctx[0].contexto
        },
        mensajes
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
