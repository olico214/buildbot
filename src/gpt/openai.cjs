
const axios = require('axios');
const OPENAI_API_KEY = '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'
const pool = require("../mysql/config.cjs");
const id = 1

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


async function gpt(messages) {
  const ctx = await getData()

  try {

    const formattedMessages = messages.map(user => ({
      role: user.role,
      content: user.content
    }));

console.log(formattedMessages)
    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: ctx[0].contexto
        },
        ...formattedMessages 
      ]
    };

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestData)
      });
    
      if (response.ok) {
        const responseData = await response.json();
        // Hacer algo con la respuesta
      } else {
        console.error('Error al enviar la solicitud:', response.status);
        // Manejar el error
      }
    } catch (error) {
      console.error('Error al enviar la solicitud:', error.message);
      // Manejar el error
    }

    // Extract and return response
    const generatedMessage = response.data.choices[0].message;
    return generatedMessage;
    
  } catch (error) {
    console.error('Error sending message to OpenAI:', error);
    return 'Lo siento, no puedo responder en este momento.';
  }
}

module.exports = { gpt };
