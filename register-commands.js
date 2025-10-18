import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// === DEFINIÇÃO DOS COMANDOS ===
const commands = [
  new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("Registre seu elo e rota principal para participar das inhouses!")
].map(command => command.toJSON());

// === CONFIGURAÇÃO DO REST ===
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// === FUNÇÃO PRINCIPAL ===
(async () => {
  try {
    console.log("🚀 Iniciando registro de comandos...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Comando /registrar registrado com sucesso!");
  } catch (error) {
    console.error("❌ Falha ao registrar o comando /registrar:");
    if (error.response?.data) {
      console.error("Detalhes:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  }
})();
