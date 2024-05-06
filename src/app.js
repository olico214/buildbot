import fs from "fs";

import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  utils,
} from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import { EVENTS } from "@builderbot/bot";
import { gpt } from "./gpt/openai.cjs";
import {insertValues} from "./mysql/config.cjs"


const PORT = process.env.PORT ?? 3008;




const flowPrincipal = addKeyword(EVENTS.WELCOME).addAction(
  { capture: false },
  async (ctx, { flowDynamic, state }) => {
    const mensaje = ctx.body;
    await insertValues(mensaje,'Incoming',ctx.from)
    // Obtener el estado actual
    const estado = await state.getMyState();
    let mensajes = [];

    if (estado) {
      // Si hay un estado anterior, agregar los mensajes anteriores
      mensajes = estado.mensajes;
    }

    // Agregar el nuevo mensaje al array de mensajes
    mensajes.push({
      role: "user",
      content: mensaje,
    });

    if (mensajes.length > 5) {
      mensajes.shift();
    }

    // Obtener la respuesta de OpenAI con el contexto acumulado
    const respuesta = await gpt(mensajes);

    // Actualizar el estado con los mensajes acumulados y la respuesta generada
    await state.update({ mensajes: mensajes, respuesta: respuesta });


    await insertValues(respuesta,'Outgoing',ctx.from)

    // Devolver la respuesta al flujo dinámico
    return await flowDynamic(respuesta.content);
  }
);

const main = async () => {
  const adapterFlow = createFlow([flowPrincipal]);

  const adapterProvider = createProvider(Provider);
  const adapterDB = new Database({
    host: '195.179.239.51',
    user: 'u124569701_notify',
    database: 'u124569701_notify',
    password: '*W0&cS$R1&o',
})
  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  adapterProvider.server.post(
    "/v1/messages",
    handleCtx(async (bot, req, res) => {
      const { token, number, message } = req.body;
      if (
        token !=
        "12345"
      ) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "error", message: "token invalido" }));
        return;
      }

      await bot.sendMessage(number, message, {});

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "success", message: "mensaje enviado" }));
      return;
    })
  );

  adapterProvider.server.post(
    "/v1/file",
    handleCtx(async (bot, req, res) => {
      const { token, number, message, file } = req.body;
      if (
        token !=
        "12345"
      )  {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "error", message: "token invalido" }));
        return;
      }

      await bot.sendMessage(number, message, { media: file });

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "success", message: "mensaje enviado" }));
      return;
    })
  );
  adapterProvider.server.post(
    "/v1/status",
    handleCtx(async (bot, req, res) => {
      const { token } = req.body;
      
      if (
        token !==
        '12345'
      ) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "error", message: "token invalido" }));
        return;
      }
  
      const filePath = "./src/status/validate.json";
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          console.error("Error al leer el archivo:", err);
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ status: "error", message: "Error al leer el archivo" })
          );
          return;
        }
  
        let jsonData;
        try {
          jsonData = JSON.parse(data);
          console.log(jsonData);
          const response = jsonData.status
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "success", message: response }));
        } catch (parseError) {
          console.error("Error al analizar JSON existente:", parseError);
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ status: "error", message: "Error al analizar JSON" })
          );
        }
      });
    })
  );
  

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "success", number, intent }));
    })
  );

  httpServer(+PORT);
};

main();
