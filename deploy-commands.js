import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

// --- Definição dos comandos Slash
const commands = [
  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('🎮 Inicia seu registro no sistema Inhouse Wild Rift.'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('🕹️ Entra na fila para jogar uma partida Inhouse.'),

  new SlashCommandBuilder()
    .setName('sairdafila')
    .setDescription('🚪 Sai da fila atual.'),

  new SlashCommandBuilder()
    .setName('fila')
    .setDescription('📋 Mostra todos os jogadores atualmente na fila.')
].map(cmd => cmd.toJSON());

// --- Inicialização do cliente REST
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function deployCommands() {
  try {
    console.log('🔄 Iniciando atualização dos comandos Slash...');

    if (process.env.GUILD_ID) {
      // ✅ Registro instantâneo para ambiente de testes (guilda específica)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Comandos registrados instantaneamente no servidor de ID: ${process.env.GUILD_ID}`);
    } else {
      // 🌍 Registro global (pode levar até 1 hora para propagar)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('🌍 Comandos globais registrados com sucesso!');
    }

    console.log('🎯 Deploy finalizado com êxito!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos Slash:', error);
  }
}

// --- Execução automática
deployCommands();
