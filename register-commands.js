import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// ==========================
// 🔹 DEFINIÇÃO DOS COMANDOS
// ==========================
const commands = [
  new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("Registre seu elo e rota principal para participar das inhouses!"),

  new SlashCommandBuilder()
    .setName("meusdados")
    .setDescription("Veja suas informações de elo e rota registradas."),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Entre na fila da sua série conforme o seu elo registrado!"),
].map(command => command.toJSON());

// ==========================
// 🔹 CONFIGURAÇÃO DO REST
// ==========================
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// ==========================
// 🔹 DEPLOY DOS COMANDOS
// ==========================
(async () => {
  try {
    console.log("🚀 Iniciando registro dos comandos Slash...");

    // Publica os comandos no servidor específico (Guild Commands)
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log(`✅ ${commands.length} comandos registrados com sucesso!`);
    commands.forEach(cmd =>
      console.log(`   → /${cmd.name}`)
    );

    console.log("✨ Atualização concluída! Se os comandos não aparecerem imediatamente, aguarde até 1 minuto e reabra o Discord.");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos Slash:");
    if (error.response?.data) {
      console.error("📄 Detalhes do erro:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  }
})();
