// deploy-commands.js
import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

// --- ⚙️ Definição dos comandos Slash
const commands = [
  new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("🎮 Inicia seu registro no sistema Arena Mythos House."),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("🕹️ Entra na fila para jogar uma partida Inhouse."),

  new SlashCommandBuilder()
    .setName("sairdafila")
    .setDescription("🚪 Sai da fila atual."),

  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("📋 Mostra todos os jogadores atualmente na fila.")
].map(cmd => cmd.toJSON());

// --- 🔐 Inicialização do cliente REST
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// --- 🚀 Função principal de deploy
async function deployCommands() {
  try {
    console.log("🔄 Iniciando atualização dos comandos Slash...");

    if (!process.env.CLIENT_ID) {
      throw new Error("❌ CLIENT_ID não definido no arquivo .env!");
    }

    if (process.env.GUILD_ID) {
      // ✅ Registro instantâneo para um servidor específico (teste)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Comandos registrados instantaneamente no servidor: ${process.env.GUILD_ID}`);
    } else {
      // 🌍 Registro global (leva até 1h para propagar)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log("🌍 Comandos globais registrados com sucesso!");
    }

    console.log("🎯 Deploy dos comandos finalizado com êxito!");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos Slash:");
    console.error(error);
  }
}

// --- 🧩 Execução automática
deployCommands();
