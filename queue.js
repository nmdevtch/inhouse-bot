import { ChannelType, PermissionFlagsBits } from "discord.js";
import db from "./database.js";

let filaMessage = null; // Mensagem fixa para atualização automática

// ✅ Entrar na fila
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

  // Inicializa MMR padrão
  if (!player.mmr) {
    db.prepare("UPDATE players SET mmr = ? WHERE id = ?").run(200, user.id);
    player.mmr = 200;
  }

  // Verifica se já está na fila
  const existe = db.prepare("SELECT * FROM queue_all WHERE id = ?").get(user.id);
  if (existe) {
    return interaction.reply({
      content: "⚠️ Você já está na fila.",
      ephemeral: true,
    });
  }

  // Adiciona jogador
  db.prepare(
    "INSERT INTO queue_all (id, name, role, elo, mmr) VALUES (?, ?, ?, ?, ?)"
  ).run(user.id, user.username, player.role, player.elo, player.mmr);

  await interaction.reply({
    content: `✅ Você entrou na fila como **${player.role.toUpperCase()}** (${player.mmr} MMR).`,
    ephemeral: true,
  });

  await atualizarFila(interaction.client);
  await verificarPartida(interaction);
}

// ✅ Sair da fila
export async function sairDaFila(interaction) {
  const user = interaction.user;
  const existe = db.prepare("SELECT * FROM queue_all WHERE id = ?").get(user.id);

  if (!existe) {
    return interaction.reply({
      content: "⚠️ Você não está em nenhuma fila.",
      ephemeral: true,
    });
  }

  db.prepare("DELETE FROM queue_all WHERE id = ?").run(user.id);

  await interaction.reply({
    content: "🚪 Você saiu da fila com sucesso.",
    ephemeral: true,
  });

  await atualizarFila(interaction.client);
}

// ✅ Mostrar fila (comando /fila)
export async function mostrarFila(interaction) {
  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();

  if (!fila.length) {
    return interaction.reply({
      content: "📭 Nenhum jogador na fila no momento.",
      ephemeral: true,
    });
  }

  const textoFila = fila
    .map(
      (p, i) =>
        `${i + 1}. **${p.name}** — ${p.role.toUpperCase()} | ${p.elo} | ${p.mmr} MMR`
    )
    .join("\n");

  const msg = `🧩 **Jogadores na Fila (${fila.length})**\n${textoFila}\n\n_Atualizado automaticamente._`;

  // Atualiza mensagem fixa (visível para todos)
  const canalFila = interaction.guild.channels.cache.find(
    (c) => c.name === "fila-geral"
  );
  if (canalFila) {
    const mensagens = await canalFila.messages.fetch({ limit: 10 });
    const existente = mensagens.find((m) => m.author.id === interaction.client.user.id);

    if (existente) {
      filaMessage = existente;
      await existente.edit(msg);
    } else {
      filaMessage = await canalFila.send(msg);
    }
  }

  return interaction.reply({ content: msg, ephemeral: true });
}

// 🔁 Atualizar fila em tempo real
export async function atualizarFila(client) {
  const canalFila = client.channels.cache.find((c) => c.name === "fila-geral");
  if (!canalFila) return;

  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();

  const textoFila =
    fila.length === 0
      ? "📭 Nenhum jogador na fila no momento."
      : fila
          .map(
            (p, i) =>
              `${i + 1}. **${p.name}** — ${p.role.toUpperCase()} | ${p.elo} | ${p.mmr} MMR`
          )
          .join("\n");

  const msg = `🧩 **Fila Atual (${fila.length})**\n${textoFila}\n\n_Atualizado automaticamente._`;

  // Atualiza mensagem fixa se existir
  if (!filaMessage) {
    const mensagens = await canalFila.messages.fetch({ limit: 10 });
    const existente = mensagens.find((m) => m.author.id === client.user.id);

    if (existente) {
      filaMessage = existente;
      await existente.edit(msg);
    } else {
      filaMessage = await canalFila.send(msg);
    }
  } else {
    await filaMessage.edit(msg);
  }
}

// ⚔️ Verifica se há jogadores suficientes e cria partida automaticamente
async function verificarPartida(interaction) {
  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();
  const rolesNecessarias = ["top", "jungle", "mid", "adc", "sup"];
  const selecionados = [];

  for (const role of rolesNecessarias) {
    const jogadoresRole = fila.filter((p) => p.role.toLowerCase() === role).slice(0, 2);
    if (jogadoresRole.length < 2) return;
    selecionados.push(...jogadoresRole);
  }

  if (selecionados.length === 10) {
    await criarSala(interaction, selecionados);

    // Remove os jogadores da fila
    const del = db.prepare("DELETE FROM queue_all WHERE id = ?");
    for (const p of selecionados) del.run(p.id);

    await atualizarFila(interaction.client);
  }
}

// 🏆 Criação de salas automáticas e times balanceados
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

  // Monta e balanceia times
  const roles = ["top", "jungle", "mid", "adc", "sup"];
  const timeA = [];
  const timeB = [];

  for (const role of roles) {
    const jogadoresRole = jogadores
      .filter((j) => j.role.toLowerCase() === role)
      .sort((a, b) => b.mmr - a.mmr);

    if (jogadoresRole.length === 2) {
      const [high, low] = jogadoresRole;
      const totalA = timeA.reduce((a, j) => a + j.mmr, 0);
      const totalB = timeB.reduce((a, j) => a + j.mmr, 0);

      if (totalA <= totalB) {
        timeA.push(high);
        timeB.push(low);
      } else {
        timeA.push(low);
        timeB.push(high);
      }
    }
  }

  const totalA = timeA.reduce((a, j) => a + j.mmr, 0);
  const totalB = timeB.reduce((a, j) => a + j.mmr, 0);
  const diff = Math.abs(totalA - totalB);

  const formatarTime = (time) =>
    time
      .map((p) => `• **${p.name}** (${p.role.toUpperCase()} - ${p.elo}, ${p.mmr} MMR)`)
      .join("\n");

  const mensagem = `
🏆 **Nova Partida Criada!**

**🟥 Time A** — MMR Total: **${totalA}**
${formatarTime(timeA)}

**🟦 Time B** — MMR Total: **${totalB}**
${formatarTime(timeB)}

⚖️ Diferença de MMR: **${diff}**
`;

  await texto.send(mensagem);
  console.log("✅ Partida criada e balanceada com sucesso!");
}
