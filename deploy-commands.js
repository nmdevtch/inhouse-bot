import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Registra um jogador no sistema.')
    .addStringOption(opt =>
      opt.setName('nome').setDescription('Seu nick').setRequired(true))
    .addStringOption(opt =>
      opt.setName('rota')
        .setDescription('Sua rota principal')
        .setRequired(true)
        .addChoices(
          { name: 'Topo', value: 'Topo' },
          { name: 'Selva', value: 'Selva' },
          { name: 'Meio', value: 'Meio' },
          { name: 'Atirador', value: 'Atirador' },
          { name: 'Suporte', value: 'Suporte' }
        )),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Entra na fila para jogar.'),

  new SlashCommandBuilder()
    .setName('sairdafila')
    .setDescription('Sai da fila atual.'),

  new SlashCommandBuilder()
    .setName('fila')
    .setDescription('Mostra os jogadores na fila.')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
  console.log('🚀 Atualizando comandos...');
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('✅ Comandos registrados com sucesso!');
} catch (error) {
  console.error('❌ Erro ao registrar comandos:', error);
}
