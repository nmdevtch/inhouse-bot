import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// =====================
// 🔧 CONFIGURAÇÃO
// =====================
const commands = [
  // /registrar
  new SlashCommandBuilder()
    .setName("registrar")
    .setDescription("Registre seu elo e rota principal para participar das inhouses."),

  // /meusdados
  new SlashCommandBuilder()
    .setName("meusdados")
    .setDescription("Exibe seus dados registrados no sistema de inhouse."),
].map(cmd => cmd.toJSON());

// =====================
// 🚀 DEPLOY DE COMANDOS
// =====================
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Iniciando atualização dos comandos Slash...");

    // 🔸 Modo global (disponível em todos os servidores do bot)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Comandos globais atualizados com sucesso!");

    // 🔸 Se quiser registrar só em um servidor específico (mais rápido para testes):
    // await rest.put(
    //   Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    //   { body: commands }
    // );
    // console.log("✅ Comandos registrados no servidor de teste!");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
})();
