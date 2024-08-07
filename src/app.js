import fs, { readFile } from "fs";
import path from 'path';

import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
} from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import { EVENTS } from "@builderbot/bot";
import { gpt } from "./gpt/openai.cjs";
import { insertValues } from "./mysql/saveData.cjs"
const PORT = process.env.PORT ?? 3001;



const flowPrincipal = addKeyword(EVENTS.WELCOME).addAction(
  { capture: false },
  async (ctx, { flowDynamic }) => {
    const mensaje = ctx.body;

    await insertValues(mensaje, 'user', ctx.from, 'incoming')



    // Actualizar el estado con los mensajes acumulados y la respuesta generada
    const data = { mensajes: mensaje, phone: ctx.from }

    const respuesta = await gpt(data);

    if (!respuesta) {
      return
    }

    console.log(respuesta)
    await insertValues(respuesta, 'assistant', ctx.from, 'ia')

    // Devolver la respuesta al flujo dinámico
    return await flowDynamic(respuesta);
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
      const { number, message } = req.body;


      await bot.sendMessage(number, message, {});

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "success", message: "mensaje enviado" }));
      return;
    })
  );


  adapterProvider.server.post(
    "/v1/QR",
    handleCtx(async (bot, req, res) => {



      const qr = './bot.qr.png';

      fs.readFile(qr, (err, data) => {
        if (err) {
          res.setHeader("Content-Type", "application/json");
          res.status(500).end(JSON.stringify({ status: "error", message: "File could not be read" }));
          return;
        }

        const binaryqr = data.toString('base64');

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "success", message: binaryqr }));
      });

    })
  );



  adapterProvider.server.post(
    "/v1/file",
    handleCtx(async (bot, req, res) => {
      const { token, number, message, file } = req.body;
      if (
        token !=
        "12345"
      ) {
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
