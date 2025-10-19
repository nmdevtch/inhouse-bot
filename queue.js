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

  // Adiciona o jogador à fila geral
  db.prepare("INSERT INTO queue_all (id, name, role, elo, mmr) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.username, player.role, player.elo, player.mmr);

  interaction.reply({
    content: `✅ Você entrou na fila geral como **${player.role.toUpperCase()}** (${player.mmr} MMR).`,
    ephemeral: true,
  });

  // Verifica se há jogadores suficientes (2 por função)
  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();

  const rolesNecessarias = ["top", "jungle", "mid", "adc", "sup"];
  const selecionados = [];

  for (const role of rolesNecessarias) {
    const jogadoresRole = fila.filter(p => p.role.toLowerCase() === role).slice(0, 2);
    if (jogadoresRole.length < 2) return; // ainda não há 2 para essa função
    selecionados.push(...jogadoresRole);
  }

  if (selecionados.length === 10) {
    await criarSala(interaction, selecionados);

    // Remove os jogadores que entraram na partida
    const delStmt = db.prepare("DELETE FROM queue_all WHERE id = ?");
    for (const p of selecionados) delStmt.run(p.id);
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

  // Cria a categoria da partida
  const categoria = await guild.channels.create({
    name: `🏆 Inhouse - ${new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    ],
  });

  // Canais de texto e voz
  const texto = await guild.channels.create({
    name: "📜・times",
    type: ChannelType.GuildText,
    parent: categoria.id,
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

  // Separa por função e divide um de cada em cada time
  const roles = ["top", "jungle", "mid", "adc", "sup"];
  const timeA = [];
  const timeB = [];

  for (const role of roles) {
    const jogadoresRole = jogadores
      .filter(j => j.role.toLowerCase() === role)
      .sort((a, b) => b.mmr - a.mmr);

    if (jogadoresRole.length === 2) {
      timeA.push(jogadoresRole[0]);
      timeB.push(jogadoresRole[1]);
    }
  }

  const formatarTime = (time) =>
    time
      .map((p) => `• **${p.name}** (${p.role.toUpperCase()} - ${p.elo}, ${p.mmr} MMR)`)
      .join("\n");

  const mensagem = `
🏆 **Nova partida iniciada!**

**🟥 Time A**
${formatarTime(timeA)}

**🟦 Time B**
${formatarTime(timeB)}
`;

  texto.send(mensagem);
  console.log("✅ Partida criada com sucesso!");
}
