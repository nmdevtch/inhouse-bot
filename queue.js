import { ChannelType, PermissionFlagsBits } from "discord.js";
import db from "./database.js";

export async function entrarNaFila(interaction) {
  const user = interaction.user;
  const member = await interaction.guild.members.fetch(user.id);
  const player = db.prepare("SELECT * FROM players WHERE id = ?").get(user.id);

  if (!player) {
    return interaction.reply({
      content: "❌ Você precisa se registrar primeiro antes de entrar na fila.",
      ephemeral: true,
    });
  }

  // Determina a série com base no elo
  let serie = null;
  switch (player.elo) {
    case "Desafiante":
    case "Monarca":
      serie = "queue_a";
      break;
    case "Grão Mestre":
    case "Mestre":
      serie = "queue_b";
      break;
    case "Diamante":
    case "Gold":
      serie = "queue_c";
      break;
    default:
      return interaction.reply({
        content: "❌ Seu elo não corresponde a nenhuma série válida.",
        ephemeral: true,
      });
  }

  // Verifica se o jogador já está em alguma fila
  const filas = ["queue_a", "queue_b", "queue_c"];
  for (const fila of filas) {
    const exists = db.prepare(`SELECT * FROM ${fila} WHERE id = ?`).get(user.id);
    if (exists) {
      return interaction.reply({
        content: "⚠️ Você já está em uma fila.",
        ephemeral: true,
      });
    }
  }

  // Adiciona o jogador à fila correspondente
  db.prepare(`INSERT INTO ${serie} (id, name, role, elo) VALUES (?, ?, ?, ?)`)
    .run(user.id, user.username, player.role, player.elo);

  interaction.reply({
    content: `✅ Você entrou na **Série ${serie.toUpperCase().replace("QUEUE_", "")}** (${player.elo}).`,
    ephemeral: true,
  });

  // Verifica se já existem 10 jogadores na fila
  const queueList = db.prepare(`SELECT * FROM ${serie}`).all();
  if (queueList.length === 10) {
    await criarSala(interaction, serie, queueList);
    db.prepare(`DELETE FROM ${serie}`).run(); // Limpa a fila após montar os times
  }
}

export async function sairDaFila(interaction) {
  const user = interaction.user;
  let removed = false;

  ["queue_a", "queue_b", "queue_c"].forEach((fila) => {
    const player = db.prepare(`SELECT * FROM ${fila} WHERE id = ?`).get(user.id);
    if (player) {
      db.prepare(`DELETE FROM ${fila} WHERE id = ?`).run(user.id);
      removed = true;
    }
  });

  if (removed) {
    interaction.reply({ content: "🚪 Você saiu da fila.", ephemeral: true });
  } else {
    interaction.reply({ content: "⚠️ Você não está em nenhuma fila.", ephemeral: true });
  }
}

async function criarSala(interaction, serie, jogadores) {
  const guild = interaction.guild;
  const serieNome =
    serie === "queue_a" ? "Série A" : serie === "queue_b" ? "Série B" : "Série C";

  // Cria a categoria da série
  const categoria = await guild.channels.create({
    name: `🏆 ${serieNome}`,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });

  // Cria canais dentro da categoria
  const texto = await guild.channels.create({
    name: "📜・times",
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });

  const vozA = await guild.channels.create({
    name: "🎧・Time A",
    type: ChannelType.GuildVoice,
    parent: categoria.id,
  });

  const vozB = await guild.channels.create({
    name: "🎧・Time B",
    type: ChannelType.GuildVoice,
    parent: categoria.id,
  });

  // Divide os jogadores em dois times aleatórios
  const embaralhados = jogadores.sort(() => Math.random() - 0.5);
  const timeA = embaralhados.slice(0, 5);
  const timeB = embaralhados.slice(5);

  const formatarTime = (time) =>
    time.map((p) => `• **${p.name}** (${p.role} - ${p.elo})`).join("\n");

  const mensagem = `
🏆 **${serieNome} iniciada!**
  
**🟥 Time A**
${formatarTime(timeA)}

**🟦 Time B**
${formatarTime(timeB)}
`;

  texto.send(mensagem);
}
