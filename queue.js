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

  // Inicializa MMR se ainda não tiver
  if (!player.mmr) {
    db.prepare("UPDATE players SET mmr = ? WHERE id = ?").run(200, user.id);
    player.mmr = 200;
  }

  // Verifica se o jogador já está na fila
  const exists = db.prepare("SELECT * FROM queue_all WHERE id = ?").get(user.id);
  if (exists) {
    return interaction.reply({
      content: "⚠️ Você já está na fila.",
      ephemeral: true,
    });
  }

  // Adiciona o jogador à fila
  db.prepare("INSERT INTO queue_all (id, name, role, elo, mmr) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.username, player.role, player.elo, player.mmr);

  interaction.reply({
    content: `✅ Você entrou na fila geral com **${player.mmr} MMR**.`,
    ephemeral: true,
  });

  // Verifica se há 10 jogadores para iniciar uma partida
  const filaAtual = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();
  if (filaAtual.length >= 10) {
    // Seleciona os 10 jogadores com maior MMR
    const top10 = filaAtual.slice(0, 10);
    await criarSala(interaction, top10);

    // Remove os 10 jogadores da fila
    const stmt = db.prepare("DELETE FROM queue_all WHERE id = ?");
    for (const p of top10) stmt.run(p.id);
  }
}

export async function sairDaFila(interaction) {
  const user = interaction.user;
  const exists = db.prepare("SELECT * FROM queue_all WHERE id = ?").get(user.id);

  if (!exists) {
    return interaction.reply({
      content: "⚠️ Você não está em nenhuma fila.",
      ephemeral: true,
    });
  }

  db.prepare("DELETE FROM queue_all WHERE id = ?").run(user.id);
  interaction.reply({
    content: "🚪 Você saiu da fila com sucesso.",
    ephemeral: true,
  });
}

async function criarSala(interaction, jogadores) {
  const guild = interaction.guild;

  // Cria a categoria "Partida Inhouse"
  const categoria = await guild.channels.create({
    name: `🏆 Inhouse - ${new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });

  // Cria canais de texto e voz
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

  // Montagem de times balanceados (ordenados por MMR)
  const sorted = jogadores.sort((a, b) => b.mmr - a.mmr);

  const timeA = [];
  const timeB = [];

  // Distribui alternando para tentar equilibrar MMR
  sorted.forEach((jogador, index) => {
    if (index % 2 === 0) timeA.push(jogador);
    else timeB.push(jogador);
  });

  const formatarTime = (time) =>
    time
      .map((p) => `• **${p.name}** (${p.role} - ${p.elo}, ${p.mmr} MMR)`)
      .join("\n");

  const mensagem = `
🏆 **Nova partida iniciada!**

**🟥 Time A**
${formatarTime(timeA)}

**🟦 Time B**
${formatarTime(timeB)}
`;

  texto.send(mensagem);
}