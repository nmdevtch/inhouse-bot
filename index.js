import 'dotenv/config';
import express from 'express';
import pkg from 'discord.js';
import db from './database.js';
import { addToQueue, removeFromQueue, showQueue, tryMatchmake } from './queueSystem.js';

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events,
  MessageFlags,
} = pkg;

// --- Inicialização do cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Servidor Web (para uptime)
const app = express();
app.get('/', (_, res) => res.send('🌐 Inhouse Bot está ativo e online!'));
app.listen(process.env.PORT || 4000, () => console.log('🚀 Servidor web ativo!'));

// --- IDs dos cargos
const roleIds = {
  jogador: '1426957458617663589',
  visitante: '1426957075384369292',
  top: '1427195793168666634',
  jungle: '1427195874454540339',
  mid: '1427195943463419904',
  adc: '1427196010769158179',
  support: '1427196093950591097',
  ouro: '1427116853196488875',
  platina: '1427116930719813642',
  esmeralda: '1427117033958674432',
  diamante: '1427117094549458944',
  mestre: '1427117203853148170',
  graomestre: '1428538683036012794',
  desafiante: '1428538843392381071',
  monarca: '1428538981976379464',
};

// --- Evento de inicialização
client.once(Events.ClientReady, (client) => {
  console.log(`✅ Bot iniciado com sucesso como ${client.user.tag}`);
});

// --- Evento principal de interação
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

  const { commandName, user } = interaction;

  try {
    // --- Comando: /registrar
    if (interaction.isChatInputCommand() && commandName === 'registrar') {
      const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);
      if (existing) {
        await interaction.reply({
          content: '⚠️ Você já está registrado! Caso precise alterar suas informações, entre em contato com a moderação.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(user.id, user.username);

      const rotaMenu = new StringSelectMenuBuilder()
        .setCustomId('selecionarRota')
        .setPlaceholder('Selecione sua rota')
        .addOptions([
          { label: 'Top', value: 'Top' },
          { label: 'Jungle', value: 'Jungle' },
          { label: 'Mid', value: 'Mid' },
          { label: 'ADC', value: 'ADC' },
          { label: 'Support', value: 'Support' },
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
          { label: 'Mestre', value: 'Mestre' },
          { label: 'Grão Mestre', value: 'Grão Mestre' },
          { label: 'Desafiante', value: 'Desafiante' },
          { label: 'Monarca', value: 'Monarca' },
        ]);

      await interaction.reply({
        content: '🎮 Escolha sua **rota** e seu **elo** abaixo:',
        components: [
          new ActionRowBuilder().addComponents(rotaMenu),
          new ActionRowBuilder().addComponents(eloMenu),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // --- Comando: /queue (agora com MMR)
    if (interaction.isChatInputCommand() && commandName === 'queue') {
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);
      if (!player || !player.elo) {
        await interaction.reply({
          content: '⚠️ Você precisa se registrar primeiro usando **/registrar** antes de entrar na fila.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Define o MMR com base no ELO do jogador (pode ser ajustado)
      const eloToMMR = {
        Ferro: 800,
        Bronze: 1000,
        Prata: 1200,
        Ouro: 1400,
        Platina: 1600,
        Esmeralda: 1800,
        Diamante: 2000,
        Mestre: 2200,
        'Grão Mestre': 2400,
        Desafiante: 2600,
        Monarca: 2800,
      };

      const mmr = eloToMMR[player.elo] || 1000;
      const result = addToQueue(user.id, player.name, mmr);
      await interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });

      // Tenta criar partida
      const match = tryMatchmake();
      if (match) {
        const queueChannel = interaction.guild.channels.cache.find(c => c.name.includes('filas-inhouse'));
        if (queueChannel) {
          await queueChannel.send(match.message);
        } else {
          await interaction.followUp(match.message);
        }
      }
      return;
    }

    // --- Comando: /sairdafila
    if (interaction.isChatInputCommand() && commandName === 'sairdafila') {
      const result = removeFromQueue(user.id);
      await interaction.reply({ content: result.message, flags: MessageFlags.Ephemeral });
      return;
    }

    // --- Comando: /fila
    if (interaction.isChatInputCommand() && commandName === 'fila') {
      const queueInfo = showQueue();
      await interaction.reply({ content: queueInfo, flags: MessageFlags.Ephemeral });
      return;
    }

    // --- Interações de menus
    if (interaction.isStringSelectMenu()) {
      const { guild, customId, values } = interaction;
      const membro = await guild.members.fetch(user.id);
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);

      // Escolha de rota
      if (player && !player.role && customId === 'selecionarRota') {
        const rota = values[0];
        db.prepare('UPDATE players SET role = ? WHERE id = ?').run(rota, user.id);
        await interaction.reply({
          content: `✅ ${player.name}, sua rota **${rota}** foi registrada! Agora selecione seu elo.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Escolha de elo
      if (player && !player.elo && customId === 'selecionarElo') {
        const elo = values[0];
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(elo, user.id);

        const cargoJogador = guild.roles.cache.get(roleIds.jogador);
        const cargoVisitante = guild.roles.cache.get(roleIds.visitante);
        const cargoRota = guild.roles.cache.get(roleIds[player.role?.toLowerCase()]);
        const cargoElo = guild.roles.cache.get(roleIds[elo.toLowerCase().replace(/\s+/g, '')]);

        if (cargoJogador) await membro.roles.add(cargoJogador);
        if (cargoRota) await membro.roles.add(cargoRota);
        if (cargoElo) await membro.roles.add(cargoElo);
        if (cargoVisitante) await membro.roles.remove(cargoVisitante);

        await interaction.reply({
          content: `🏆 Registro completo!\n> **Nome:** ${player.name}\n> **Rota:** ${player.role}\n> **Elo:** ${elo}\n\nAgora você pode entrar na fila usando **/queue** no canal #filas-inhouse.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Impedir re-registro
      if (player && (customId === 'selecionarRota' || customId === 'selecionarElo')) {
        await interaction.reply({
          content: '⚠️ Você já concluiu seu registro! Caso precise alterar algo, procure a moderação.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  } catch (err) {
    console.error('❌ Erro ao processar interação:', err);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao processar sua ação.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// --- Login
client.login(process.env.TOKEN).catch((err) => {
  console.error('❌ Falha ao logar no Discord:', err);
});
