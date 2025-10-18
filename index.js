import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import db from './database.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- Web server (para manter ativo em plataformas de deploy)
const app = express();
app.get('/', (_, res) => res.send('Inhouse Bot está ativo!'));
app.listen(process.env.PORT || 4000, () => console.log('🌐 Servidor web ativo!'));

// --- Bot pronto
client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// --- Interações de comandos
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, options } = interaction;

  try {
    if (commandName === 'registrar') {
      const name = options.getString('nome');
      const role = options.getString('rota');

      db.prepare('INSERT OR REPLACE INTO players (id, name, role) VALUES (?, ?, ?)')
        .run(user.id, name, role);

      await interaction.reply({
        content: `✅ ${user.username}, você foi registrado como **${name}** (${role}).`,
        flags: 64
      });
    }

    else if (commandName === 'queue') {
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);
      if (!player) {
        await interaction.reply({ content: '❌ Registre-se primeiro com `/registrar`.', flags: 64 });
        return;
      }

      db.prepare('INSERT OR REPLACE INTO queue (id, name, role) VALUES (?, ?, ?)')
        .run(player.id, player.name, player.role);

      await interaction.reply({ content: `🎮 Você entrou na fila como **${player.role}**.`, flags: 64 });
    }

    else if (commandName === 'sairdafila') {
      const removed = db.prepare('DELETE FROM queue WHERE id = ?').run(user.id);
      if (removed.changes > 0)
        await interaction.reply({ content: '🚪 Você saiu da fila.', flags: 64 });
      else
        await interaction.reply({ content: '⚠️ Você não está na fila.', flags: 64 });
    }

    else if (commandName === 'fila') {
      const queue = db.prepare('SELECT * FROM queue').all();
      if (queue.length === 0) {
        await interaction.reply({ content: '📭 A fila está vazia.', flags: 64 });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00AEFF)
        .setTitle(`🎮 Jogadores na Fila (${queue.length})`)
        .setDescription(queue.map(p => `• **${p.name}** — ${p.role}`).join('\n'))
        .setFooter({ text: 'Use /sairdafila para sair.' });

      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: '❌ Ocorreu um erro ao executar o comando.',
      flags: 64
    });
  }
});

client.login(process.env.TOKEN);
