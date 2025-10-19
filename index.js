import 'dotenv/config';
import express from 'express';
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events
} from 'discord.js';
import db from './database.js';
import { entrarNaFila, sairDaFila } from './queue.js'; // ✅ Importa o sistema de filas

// --- Inicialização do cliente Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- Servidor web (mantém ativo no deploy)
const app = express();
app.get('/', (_, res) => res.send('🌐 Inhouse Bot está ativo e online!'));
app.listen(process.env.PORT || 4000, () => console.log('🚀 Servidor web ativo!'));

// --- IDs dos cargos (substitua pelos reais do seu servidor)
const roleIds = {
  jogador: '1426957458617663589',
  visitante: '1426957075384369292',

  // Rotas
  top: '1427195793168666634',
  jungle: '1427195874454540339',
  mid: '1427195943463419904',
  adc: '1427196010769158179',
  support: '1427196093950591097',

  // Elos
  ouro: '1427116853196488875',
  platina: '1427116930719813642',
  esmeralda: '1427117033958674432',
  diamante: '1427117094549458944',
  mestre: '1427117203853148170',
  graomestre: '1428538683036012794',
  desafiante: '1428538843392381071',
  monarca: '1428538981976379464'
};

// --- Evento clientReady
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
          ephemeral: true
        });
        return;
      }

      // --- Menus suspensos
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
          { label: 'Mestre', value: 'Mestre' },
          { label: 'Grão Mestre', value: 'Grão Mestre' },
          { label: 'Desafiante', value: 'Desafiante' },
          { label: 'Monarca', value: 'Monarca' }
        ]);

      await interaction.reply({
        content: '🎮 Escolha sua rota e seu elo abaixo:',
        components: [
          new ActionRowBuilder().addComponents(rotaMenu),
          new ActionRowBuilder().addComponents(eloMenu)
        ],
        ephemeral: true
      });
    }

    // --- Comando: /entrar (fila)
    if (interaction.isChatInputCommand() && commandName === 'entrar') {
      await entrarNaFila(interaction);
      return;
    }

    // --- Comando: /sair (fila)
    if (interaction.isChatInputCommand() && commandName === 'sair') {
      await sairDaFila(interaction);
      return;
    }

    // --- Interações com dropdowns
    if (interaction.isStringSelectMenu()) {
      const { guild, customId, values } = interaction;
      let player = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);
      const membro = await guild.members.fetch(user.id);

      // Escolha de rota
      if (!player && customId === 'selecionarRota') {
        const rota = values[0];
        db.prepare('INSERT INTO players (id, name, role) VALUES (?, ?, ?)').run(user.id, user.username, rota);

        await interaction.reply({
          content: `✅ ${user.username}, sua rota **${rota}** foi registrada! Agora selecione seu elo.`,
          ephemeral: true
        });
        return;
      }

      // Escolha de elo
      if (player && !player.elo && customId === 'selecionarElo') {
        const elo = values[0];
        db.prepare('UPDATE players SET elo = ? WHERE id = ?').run(elo, user.id);

        // --- Aplicar cargos via IDs fixos
        const cargoJogador = guild.roles.cache.get(roleIds.jogador);
        const cargoVisitante = guild.roles.cache.get(roleIds.visitante);
        const cargoRota = guild.roles.cache.get(roleIds[player.role.toLowerCase()]);
        const cargoElo = guild.roles.cache.get(roleIds[elo.toLowerCase().replace(' ', '').replace('+', '')]);

        if (cargoJogador) await membro.roles.add(cargoJogador);
        if (cargoRota) await membro.roles.add(cargoRota);
        if (cargoElo) await membro.roles.add(cargoElo);
        if (cargoVisitante) await membro.roles.remove(cargoVisitante);

        await interaction.reply({
          content: `🏆 Registro completo!\n> **Rota:** ${player.role}\n> **Elo:** ${elo}\n\nBem-vindo à Inhouse Wild Rift!`,
          ephemeral: true
        });
        return;
      }

      // Tentativa de alterar rota/elo depois do registro
      if (player && (customId === 'selecionarRota' || customId === 'selecionarElo')) {
        await interaction.reply({
          content: '⚠️ Você já concluiu seu registro! Caso precise alterar algo, procure a moderação ou administração.',
          ephemeral: true
        });
        return;
      }
    }
  } catch (err) {
    console.error('❌ Erro ao processar interação:', err);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Erro ao processar sua ação.',
        ephemeral: true
      });
    }
  }
});

// --- Login
client.login(process.env.TOKEN).catch(err => {
  console.error('❌ Falha ao logar no Discord:', err);
});
