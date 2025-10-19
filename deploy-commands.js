import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

// --- 🧩 Definição dos comandos Slash
const commands = [
  // --- Registro do jogador
  new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("🎮 Inicia seu registro no sistema Arena Mythos House.")
    .addStringOption(option =>
      option
        .setName("nickname")
        .setDescription("Digite seu nickname no formato NICKNAME#TAG")
        .setRequired(true)
    ),

  // --- Fila
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("🕹️ Entra na fila para jogar uma partida Inhouse."),

  // --- Sair da fila
  new SlashCommandBuilder()
    .setName("sairdafila")
    .setDescription("🚪 Sai da fila atual."),

  // --- Ver fila
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("📋 Mostra todos os jogadores atualmente na fila."),

  // --- Ranking
  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("🏆 Exibe o ranking geral das Séries A, B e C.")
].map(cmd => cmd.toJSON());

// --- Inicialização do cliente REST
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function deployCommands() {
  try {
    console.log("🔄 Iniciando atualização dos comandos Slash...");

    if (process.env.GUILD_ID) {
      // ✅ Registro instantâneo (para testes em servidor específico)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Comandos registrados instantaneamente no servidor ID: ${process.env.GUILD_ID}`);
    } else {
      // 🌍 Registro global (pode levar até 1 hora)
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log("🌍 Comandos globais registrados com sucesso!");
    }

    console.log("🎯 Deploy finalizado com êxito!");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos Slash:", error);
  }
}

// --- Execução automática
deployCommands();
