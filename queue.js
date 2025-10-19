import { ChannelType, PermissionFlagsBits } from "discord.js";
import db from "./database.js";

let filaMessage = null; // Mensagem fixa para atualizações ao vivo

// 🧩 Função principal: entrar na fila
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

  // Verifica se já está na fila
  const exists = db.prepare("SELECT * FROM queue_all WHERE id = ?").get(user.id);
  if (exists) {
    return interaction.reply({
      content: "⚠️ Você já está na fila.",
      ephemeral: true,
    });
  }

  // Adiciona à fila
  db.prepare("INSERT INTO queue_all (id, name, role, elo, mmr) VALUES (?, ?, ?, ?, ?)").run(
    user.id,
    user.username,
    player.role,
    player.elo,
    player.mmr
  );

  await interaction.reply({
    content: `✅ Você entrou na fila geral como **${player.role.toUpperCase()}** (${player.mmr} MMR).`,
    ephemeral: true,
  });

  await atualizarFila(interaction.client);
  await verificarPartida(interaction);
}

// 🧩 Sair da fila
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
  await interaction.reply({
    content: "🚪 Você saiu da fila com sucesso.",
    ephemeral: true,
  });

  await atualizarFila(interaction.client);
}

// 🧩 Comando /fila — mostra e mantém atualizada
export async function mostrarFila(interaction) {
  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();

  if (fila.length === 0) {
    return interaction.reply({
      content: "📭 Nenhum jogador na fila no momento.",
      ephemeral: true,
    });
  }

  const textoFila = fila
    .map((p, i) => `${i + 1}. **${p.name}** — ${p.role.toUpperCase()} | ${p.elo} | ${p.mmr} MMR`)
    .join("\n");

  const msg = `🧩 **Jogadores na fila (${fila.length})**\n${textoFila}`;

  // Se já existe uma mensagem fixa da fila, atualiza ela
  if (filaMessage && filaMessage.editable) {
    await filaMessage.edit(msg);
  }

  const resposta = await interaction.reply({ content: msg, ephemeral: true });
  return resposta;
}

// 🔁 Atualiza automaticamente a fila em tempo real
export async function atualizarFila(client) {
  const canalFila = client.channels.cache.find(c => c.name === "fila-geral");
  if (!canalFila) return; // se o canal não existir, não faz nada

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

  // Se ainda não existe mensagem fixa, cria uma
  if (!filaMessage) {
    const mensagens = await canalFila.messages.fetch({ limit: 10 });
    const existente = mensagens.find(m => m.author.id === client.user.id);

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

// 🧩 Verifica se há jogadores suficientes e cria partida
async function verificarPartida(interaction) {
  const fila = db.prepare("SELECT * FROM queue_all ORDER BY mmr DESC").all();
  const rolesNecessarias = ["top", "jungle", "mid", "adc", "sup"];
  const selecionados = [];

  for (const role of rolesNecessarias) {
    const jogadoresRole = fila.filter(p => p.role.toLowerCase() === role).slice(0, 2);
    if (jogadoresRole.length < 2) return; // ainda não há 2 dessa função
    selecionados.push(...jogadoresRole);
  }

  if (selecionados.length === 10) {
    await criarSala(interaction, selecionados);

    // Remove os jogadores que entraram na partida
    const delStmt = db.prepare("DELETE FROM queue_all WHERE id = ?");
    for (const p of selecionados) delStmt.run(p.id);

    await atualizarFila(interaction.client);
  }
}

// ⚔️ Criação automática de salas
async function criarSala(interaction, jogadores) {
  const guild = interaction.guild;

  // Cria categoria
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

  // Cria canais
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

  // Monta times balanceados
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
    time.map(p => `• **${p.name}** (${p.role.toUpperCase()} - ${p.elo}, ${p.mmr} MMR)`).join("\n");

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
