import 'dotenv/config';
import express from 'express';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField
} from 'discord.js';
import db from './database.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// --- Servidor web (mantém ativo no deploy)
const app = express();
app.get('/', (_, res) => res.send('🌐 Inhouse Bot está ativo e online!'));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Servidor web ativo!'));

// --- Evento ready
client.once('ready', () => {
  console.log(`✅ Bot iniciado com sucesso como ${client.user.tag}`);
});

// --- Comando registrar (dropdowns de rota e elo)
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName, user, guild } = interaction;

    try {
      if (commandName === 'registrar') {
        const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);
        if (existing) {
          await interaction.reply({
            content: '⚠️ Você já está registrado! Caso precise alterar suas informações, entre em contato com a moderação.',
            flags: 64
          });
          return;
        }

        // Dropdowns
        const rotaMenu = new StringSelectMenuBuilder()
          .setCustomId('selecionarRota')
          .setPlaceholder('Selecione sua rota')
          .addOptions([
            { label: 'Top', value: 'Top' },
            { label: 'Jungle', value: 'Jungle' },
            { label: 'Mid', value: 'Mid' },
            { label: 'ADC', value: 'ADC' },
            { label: 'Support', value: 'Support' }
          ]);

        const eloMenu = new StringSelectMenuBuilder()
          .setCustomId('selecionarElo')
          .setPlaceholder('Selecione seu elo')
          .addOptions([
            { label: 'Ferro', value: 'Ferro' },
            { label: 'Bronze', value: 'Bronze' },
            { label: 'Prata', value: 'Prata' },
            { label: 'Ouro', value: 'Ouro' },
            { label: 'Platina', value: 'Platina' },
            { label: 'Esmeralda', value: 'Esmeralda' },
            { label: 'Diamante', value: 'Diamante' },
            { label: 'Mestre+', value: 'Mestre+' }
          ]);

        await interaction.reply({
          content: '🎮 Escolha sua rota e seu elo abaixo:',
          components: [
            new ActionRowBuilder().addComponents(rotaMenu),
            new ActionRowBuilder().addComponents(eloMenu)
          ],
          flags: 64
        });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocorreu um erro ao executar o comando.',
        flags: 64
      });
    }
  }

  // --- Interação com o dropdown
  if (interaction.isStringSelectMenu()) {
    const { user, guild, customId, values } = interaction;

    try {
      let player = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);

      if (!player && customId === 'selecionarRota') {
        // Cria registro temporário com a rota
        db.prepare('INSERT INTO players (id, role) VALUES (?, ?)').run(user.id, values[0]);
        await interaction.reply({
          content: `✅ ${user.username}, sua rota **${values[0]}** foi registrada! Agora selecione seu elo.`,
          flags: 64
        });
      } else if (player && !player.elo && customId === 'selecionarElo') {
        // Atualiza elo do jogador
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(values[0], user.id);

        // Atribui cargo “Jogador Wild Rift” e remove “Visitante”
        const membro = await guild.members.fetch(user.id);
        const roleJogador = guild.roles.cache.find(r => r.name === 'Jogador Wild Rift');
        const roleVisitante = guild.roles.cache.find(r => r.name === 'Visitante');
        if (roleJogador) await membro.roles.add(roleJogador);
        if (roleVisitante) await membro.roles.remove(roleVisitante);

        await interaction.reply({
          content: `🏆 Registro completo! Seu elo **${values[0]}** foi salvo. Bem-vindo à Inhouse Wild Rift!`,
          flags: 64
        });
      } else {
        await interaction.reply({
          content: '⚠️ Você já concluiu seu registro. Caso precise alterar algo, contate a moderação.',
          flags: 64
        });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Erro ao processar sua seleção.',
        flags: 64
      });
    }
  }
});

client.login(process.env.TOKEN);
