
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
    const generatedMessage = response.data.choices[0].message;
    return generatedMessage;
    
  } catch (error) {
    console.error('Error sending message to OpenAI:', error);
    return 'Lo siento, no puedo responder en este momento.';
  }
}

module.exports = { gpt };
