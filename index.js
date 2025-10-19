// index.js
import "dotenv/config";
import express from "express";
import pkg from "discord.js";
import db from "./database.js";
import { entrarNaFila, sairDaFila } from "./queue.js";

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

// --- Servidor Web (mantém o bot ativo)
const app = express();
app.get("/", (_, res) => res.send("🌐 Inhouse Bot está ativo e online!"));
app.listen(process.env.PORT || 4000, () => console.log("🚀 Servidor web ativo!"));

// --- IDs dos cargos no servidor
const roleIds = {
  jogador: "1426957458617663589",
  visitante: "1426957075384369292",
  top: "1427195793168666634",
  jungle: "1427195874454540339",
  mid: "1427195943463419904",
  adc: "1427196010769158179",
  support: "1427196093950591097",
  ouro: "1427116853196488875",
  platina: "1427116930719813642",
  esmeralda: "1427117033958674432",
  diamante: "1427117094549458944",
  mestre: "1427117203853148170",
  graomestre: "1428538683036012794",
  desafiante: "1428538843392381071",
  monarca: "1428538981976379464",
};

// --- Mapeamento Elo → MMR e Série
const eloToMMR = {
  Ferro: 200,
  Bronze: 200,
  Prata: 200,
  Ouro: 200,
  Platina: 200,
  Esmeralda: 200,
  Diamante: 200,
  Mestre: 200,
  GraoMestre: 200,
  Desafiante: 200,
  Monarca: 200,
};

const eloToSerie = (elo) => {
  if (["Desafiante", "Monarca"].includes(elo)) return "A";
  if (["Mestre", "Grão Mestre"].includes(elo)) return "B";
  return "C";
};

// --- Inicialização
client.once(Events.ClientReady, (client) => {
  console.log(`✅ Bot iniciado com sucesso como ${client.user.tag}`);
});

// --- Handler principal de interações
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;
  const { commandName, user } = interaction;

  try {
    /* ---------------------------------------
       /registrar
    ----------------------------------------*/
    if (interaction.isChatInputCommand() && commandName === "registrar") {
      const existing = db.prepare("SELECT * FROM players WHERE id = ?").get(user.id);
      if (existing) {
        return interaction.reply({
          content: "⚠️ Você já está registrado! Caso precise alterar suas informações, contate a moderação.",
          flags: MessageFlags.Ephemeral,
        });
      }

      db.prepare("INSERT INTO players (id, name) VALUES (?, ?)").run(user.id, user.username);

      const rotaMenu = new StringSelectMenuBuilder()
        .setCustomId("selecionarRota")
        .setPlaceholder("Selecione sua rota")
        .addOptions([
          { label: "Top", value: "Top" },
          { label: "Jungle", value: "Jungle" },
          { label: "Mid", value: "Mid" },
          { label: "ADC", value: "ADC" },
          { label: "Support", value: "Support" },
        ]);

      const eloMenu = new StringSelectMenuBuilder()
        .setCustomId("selecionarElo")
        .setPlaceholder("Selecione seu elo")
        .addOptions(Object.keys(eloToMMR).map((elo) => ({ label: elo, value: elo })));

      return interaction.reply({
        content: "🎮 Escolha sua **rota** e seu **elo** abaixo:",
        components: [
          new ActionRowBuilder().addComponents(rotaMenu),
          new ActionRowBuilder().addComponents(eloMenu),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    /* ---------------------------------------
       /queue
    ----------------------------------------*/
    if (interaction.isChatInputCommand() && commandName === "queue") {
      await entrarNaFila(interaction);
      return;
    }

    /* ---------------------------------------
       /sairdafila
    ----------------------------------------*/
    if (interaction.isChatInputCommand() && commandName === "sairdafila") {
      await sairDaFila(interaction);
      return;
    }

    /* ---------------------------------------
       /fila → mostra quem está aguardando
    ----------------------------------------*/
    if (interaction.isChatInputCommand() && commandName === "fila") {
      const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();
      if (!fila.length) {
        return interaction.reply({
          content: "📭 Nenhum jogador está na fila no momento.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const roles = ["top", "jungle", "mid", "adc", "sup"];
      let msg = "🎯 **Fila Atual (Ordenada por MMR)**\n\n";

      for (const role of roles) {
        const jogadores = fila.filter(p => p.role.toLowerCase() === role);
        if (jogadores.length > 0) {
          msg += `**${role.toUpperCase()}** (${jogadores.length})\n`;
          msg += jogadores
            .map(p => `> ${p.name} — ${p.elo} (${p.mmr} MMR)`)
            .join("\n");
          msg += "\n\n";
        }
      }

      msg += `👥 **Total de jogadores na fila:** ${fila.length}`;

      return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
    }

    /* ---------------------------------------
       /ranking
    ----------------------------------------*/
    if (interaction.isChatInputCommand() && commandName === "ranking") {
      const topPlayers = db
        .prepare("SELECT name, serie, wins, losses, points FROM ranking ORDER BY points DESC LIMIT 10")
        .all();

      if (!topPlayers.length) {
        return interaction.reply({
          content: "📊 Nenhum jogador ranqueado ainda!",
          flags: MessageFlags.Ephemeral,
        });
      }

      let rankingText = "**🏆 TOP 10 RANKING GERAL 🏆**\n\n";
      topPlayers.forEach((p, i) => {
        rankingText += `**${i + 1}.** ${p.name} — Série ${p.serie} | 🥇 ${p.points} pts | ✅ ${p.wins}V / ❌ ${p.losses}D\n`;
      });

      return interaction.reply({ content: rankingText });
    }

    /* ---------------------------------------
       Menus de seleção
    ----------------------------------------*/
    if (interaction.isStringSelectMenu()) {
      const { guild, customId, values } = interaction;
      const membro = await guild.members.fetch(user.id);
      const player = db.prepare("SELECT * FROM players WHERE id = ?").get(user.id);

      // Escolha de rota
      if (player && !player.role && customId === "selecionarRota") {
        const rota = values[0];
        db.prepare("UPDATE players SET role = ? WHERE id = ?").run(rota, user.id);
        return interaction.reply({
          content: `✅ ${player.name}, sua rota **${rota}** foi registrada! Agora selecione seu elo.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Escolha de elo
      if (player && !player.elo && customId === "selecionarElo") {
        const elo = values[0];
        db.prepare("UPDATE players SET elo = ? WHERE id = ?").run(elo, user.id);

        const serie = eloToSerie(elo);
        const alreadyInRanking = db.prepare("SELECT id FROM ranking WHERE id = ?").get(user.id);
        if (!alreadyInRanking) {
          db.prepare(
            "INSERT INTO ranking (id, name, serie, wins, losses, points) VALUES (?, ?, ?, 0, 0, 0)"
          ).run(user.id, player.name, serie);
        }

        // Atribuição de cargos
        const cargoJogador = guild.roles.cache.get(roleIds.jogador);
        const cargoVisitante = guild.roles.cache.get(roleIds.visitante);
        const cargoRota = guild.roles.cache.get(roleIds[player.role?.toLowerCase()]);
        const cargoElo = guild.roles.cache.get(roleIds[elo.toLowerCase().replace(/\s+/g, "")]);

        if (cargoJogador) await membro.roles.add(cargoJogador);
        if (cargoRota) await membro.roles.add(cargoRota);
        if (cargoElo) await membro.roles.add(cargoElo);
        if (cargoVisitante) await membro.roles.remove(cargoVisitante);

        return interaction.reply({
          content: `🏆 Registro completo!\n> **Nome:** ${player.name}\n> **Rota:** ${player.role}\n> **Elo:** ${elo}\n> **Série:** ${serie}\n\nAgora você pode entrar na fila usando **/queue**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Re-registro indevido
      if (player && (customId === "selecionarRota" || customId === "selecionarElo")) {
        await interaction.reply({
          content: "⚠️ Você já concluiu seu registro! Caso precise alterar, contate a moderação.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  } catch (err) {
    console.error("❌ Erro ao processar interação:", err);
    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Ocorreu um erro ao processar sua ação.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// --- Login
client.login(process.env.TOKEN).catch((err) => {
  console.error("❌ Falha ao logar no Discord:", err);
});
