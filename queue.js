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

  if (!player.mmr) {
    db.prepare("UPDATE players SET mmr = ? WHERE id = ?").run(200, user.id);
    player.mmr = 200;
  }

  const exists = db.prepare("SELECT * FROM queue_all WHERE id = ?").get(user.id);
  if (exists) {
    return interaction.reply({
      content: "⚠️ Você já está na fila.",
      ephemeral: true,
    });
  }

  db.prepare("INSERT INTO queue_all (id, name, role, elo, mmr) VALUES (?, ?, ?, ?, ?)").run(
    user.id,
    user.username,
    player.role,
    player.elo,
    player.mmr
  );

  interaction.reply({
    content: `✅ Você entrou na fila geral como **${player.role.toUpperCase()}** (${player.mmr} MMR).`,
    ephemeral: true,
  });

  await atualizarFilaMensagem(interaction);

  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();
  const rolesNecessarias = ["top", "jungle", "mid", "adc", "sup"];
  const selecionados = [];

  for (const role of rolesNecessarias) {
    const jogadoresRole = fila.filter(p => p.role.toLowerCase() === role).slice(0, 2);
    if (jogadoresRole.length < 2) return;
    selecionados.push(...jogadoresRole);
  }

  if (selecionados.length === 10) {
    await criarSala(interaction, selecionados);
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

  await atualizarFilaMensagem(interaction);
}

/* ✅ Atualiza a mensagem da fila 24/7 */
export async function atualizarFilaMensagem(interaction) {
  try {
    const canalFila = interaction.channel;
    const fila = db.prepare("SELECT * FROM queue_all").all();
    const roles = ["Top", "Jungle", "Mid", "ADC", "Support"];

    let filaTexto = "**🎯 FILA ATUAL DE INHOUSE 🎯**\n\n";
    if (!fila.length) filaTexto += "_Nenhum jogador na fila._";

    roles.forEach((role) => {
      const jogadores = fila.filter(p => p.role?.toLowerCase() === role.toLowerCase());
      filaTexto += `**${role} (${jogadores.length})**:\n${
        jogadores.map((p) => `> ${p.name} (${p.mmr} MMR)`).join("\n") || "_vazio_"
      }\n\n`;
    });

    const mensagens = await canalFila.messages.fetch({ limit: 10 });
    const mensagemFila = mensagens.find((m) => m.author.id === interaction.client.user.id && m.content.includes("🎯 FILA ATUAL"));
    if (mensagemFila) {
      await mensagemFila.edit(filaTexto);
    } else {
      await canalFila.send(filaTexto);
    }
  } catch (err) {
    console.error("❌ Erro ao atualizar fila:", err);
  }
}

async function criarSala(interaction, jogadores) {
  const guild = interaction.guild;

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

  const roles = ["top", "jungle", "mid", "adc", "sup"];
  const timeA = [];
  const timeB = [];

  for (const role of roles) {
    const jogadoresRole = jogadores
      .filter(j => j.role.toLowerCase() === role)
      .sort((a, b) => b.mmr - a.mmr);

    if (jogadoresRole.length === 2) {
      const [jogadorAlto, jogadorBaixo] = jogadoresRole;
      const totalA = timeA.reduce((acc, j) => acc + j.mmr, 0);
      const totalB = timeB.reduce((acc, j) => acc + j.mmr, 0);

      if (totalA <= totalB) {
        timeA.push(jogadorAlto);
        timeB.push(jogadorBaixo);
      } else {
        timeA.push(jogadorBaixo);
        timeB.push(jogadorAlto);
      }
    }
  }

  const totalA = timeA.reduce((acc, j) => acc + j.mmr, 0);
  const totalB = timeB.reduce((acc, j) => acc + j.mmr, 0);
  const diff = Math.abs(totalA - totalB);

  const formatarTime = (time) =>
    time.map((p) => `• **${p.name}** (${p.role.toUpperCase()} - ${p.elo}, ${p.mmr} MMR)`).join("\n");

  const mensagem = `
🏆 **Nova partida iniciada!**

**🟥 Time A** — MMR Total: **${totalA}**
${formatarTime(timeA)}

**🟦 Time B** — MMR Total: **${totalB}**
${formatarTime(timeB)}

⚖️ Diferença total de MMR: **${diff}**
`;

  texto.send(mensagem);
  console.log("✅ Partida criada e balanceada com sucesso!");
}
