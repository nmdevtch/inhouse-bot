// =====================
// 🔸 DEPLOY DE COMANDOS SLASH
// =====================
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// =====================
// 🔹 CONFIGURAÇÃO
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("🎮 Registre seu elo e rota para participar das Inhouses!"),

  new SlashCommandBuilder()
    .setName("meusdados")
    .setDescription("📊 Veja seus dados de registro (elo e rota)."),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("⚔️ Entra na fila da sua série conforme seu elo."),
].map((command) => command.toJSON());

// =====================
// 🔹 DEPLOY
// =====================
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// ⚠️ Troque pelo ID do seu bot e do seu servidor
const CLIENT_ID = process.env.CLIENT_ID; // ID do bot
const GUILD_ID = process.env.GUILD_ID;   // ID da sua guilda (servidor) — opcional

(async () => {
  try {
    console.log("🔄 Atualizando comandos slash...");

    // Se quiser registrar apenas no seu servidor (mais rápido para testes):
    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log("✅ Comandos registrados localmente na guild!");
    } else {
      // Registro global (leva ~1h para propagar)
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log("🌍 Comandos registrados globalmente!");
    }
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
})();
