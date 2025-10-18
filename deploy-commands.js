// ============================
// 🔸 deploy-commands.js
// ============================

import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const { CLIENT_ID, GUILD_ID, TOKEN, NODE_ENV } = process.env;

// ============================
// 🔸 Lista de Comandos
// ============================
const commands = [
  {
    name: "registrar",
    description: "Registre seu elo e rota para participar das inhouses.",
  },
  {
    name: "meusdados",
    description: "Veja seus dados registrados (elo e rota principal).",
  },
];

// ============================
// 🔸 Inicializa REST client
// ============================
const rest = new REST({ version: "10" }).setToken(TOKEN);

// ============================
// 🔸 Função principal
// ============================
(async () => {
  try {
    console.log("🔁 Iniciando deploy dos comandos...");

    const isProduction = NODE_ENV === "production";

    if (isProduction) {
      // 🌍 Deploy Global — visível em todos os servidores (demora até 1 hora)
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("✅ Comandos (/) globais atualizados com sucesso!");
    } else {
      // 🧪 Deploy Local (Guild) — instantâneo no servidor de teste
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands,
      });
      console.log(`✅ Comandos (/) atualizados com sucesso no servidor: ${GUILD_ID}`);
    }

    console.log("🎯 Deploy finalizado sem warnings!");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
})();
