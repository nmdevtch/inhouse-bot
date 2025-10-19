import 'dotenv/config';
import express from 'express';
import pkg from 'discord.js';
import db from './database.js';
import { entrarNaFila, sairDaFila } from './queue.js';

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

// --- Servidor Web
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

// --- Evento clientReady
client.once(Events.ClientReady, (client) => {
  console.log(`✅ Bot iniciado com sucesso como ${client.user.tag}`);
});

// --- Verificação periódica para manter apelidos sincronizados
setInterval(async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const players = db.prepare('SELECT id, name FROM players').all();
  for (const player of players) {
    try {
      const membro = await guild.members.fetch(player.id);
      if (membro && membro.nickname !== player.name) {
        await membro.setNickname(player.name);
        console.log(`🔄 Nickname atualizado para ${player.name} (${player.id})`);
      }
    } catch (err) {
      console.warn(`⚠️ Não foi possível atualizar o nickname de ${player.name}:`, err.message);
    }
  }
}, 5 * 60 * 1000); // A cada 5 minutos

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

      // Solicita nickname
      await interaction.reply({
        content: '✏️ Digite seu **nickname completo** (ex: `MeuNick#1234`) no chat.',
        flags: MessageFlags.Ephemeral,
      });

      const filter = (m) => m.author.id === user.id;
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000 });

      if (!collected.size) {
        await interaction.followUp({
          content: '⏰ Tempo esgotado! Use `/registrar` novamente para reiniciar o registro.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const nickname = collected.first().content.trim();

      if (!nickname.includes('#')) {
        await interaction.followUp({
          content: '❌ O nickname precisa conter uma tag. Exemplo: `MeuNick#1234`.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Salva no banco
      db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(user.id, nickname);

      // Tenta alterar o nickname do usuário
      const membro = await interaction.guild.members.fetch(user.id);
      try {
        await membro.setNickname(nickname);
      } catch (err) {
        console.warn(`⚠️ Não foi possível alterar o nickname de ${nickname}:`, err.message);
      }

      // Menus
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

      await interaction.followUp({
        content: `🎮 ${nickname}, agora escolha sua **rota** e seu **elo** abaixo:`,
        components: [
          new ActionRowBuilder().addComponents(rotaMenu),
          new ActionRowBuilder().addComponents(eloMenu),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // --- Comando: /queue
    if (interaction.isChatInputCommand() && commandName === 'queue') {
      await entrarNaFila(interaction);
      return;
    }

    // --- Comando: /sairdafila
    if (interaction.isChatInputCommand() && commandName === 'sairdafila') {
      await sairDaFila(interaction);
      return;
    }

    // --- Comando: /fila
    if (interaction.isChatInputCommand() && commandName === 'fila') {
      const allQueues = [
        { nome: 'Série A', tabela: 'queue_a' },
        { nome: 'Série B', tabela: 'queue_b' },
        { nome: 'Série C', tabela: 'queue_c' },
      ];

      let resposta = '📋 **Filas Atuais:**\n';
      for (const fila of allQueues) {
        const jogadores = db.prepare(`SELECT name, role, elo FROM ${fila.tabela}`).all();
        resposta += `\n**${fila.nome}:**\n${
          jogadores.length
            ? jogadores.map((p) => `• ${p.name} (${p.role} - ${p.elo})`).join('\n')
            : '_Vazia_'
        }\n`;
      }

      await interaction.reply({
        content: resposta,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // --- Interações com dropdowns
    if (interaction.isStringSelectMenu()) {
      const { guild, customId, values } = interaction;
      const membro = await guild.members.fetch(user.id);
      let player = db.prepare('SELECT * FROM players WHERE id = ?').get(user.id);

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
          content: `🏆 Registro completo!\n> **Nickname:** ${player.name}\n> **Rota:** ${player.role}\n> **Elo:** ${elo}\n\nAgora você pode entrar na fila usando **/queue**.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Impedir alterações
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
        content: '❌ Erro ao processar sua ação.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// --- Login
client.login(process.env.TOKEN).catch((err) => {
  console.error('❌ Falha ao logar no Discord:', err);
});
