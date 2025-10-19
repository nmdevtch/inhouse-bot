// ranking.js
import db from "./database.js";
import { EmbedBuilder } from "discord.js";

/**
 * Exibe o ranking das Séries A, B e C (estilo Brasileirão)
 * @param {Object} interaction - interação do Discord
 */
export async function exibirRanking(interaction) {
  try {
    const players = db.prepare("SELECT * FROM players").all();

    if (!players.length) {
      await interaction.reply({
        content: "⚠️ Nenhum jogador registrado no banco de dados.",
        flags: 64, // Resposta privada
      });
      return;
    }

    // --- Monta dados simulados do ranking (sem SG e empates)
    const rankingData = players.map((p) => {
      let serie = "C";
      if (["Desafiante", "Monarca"].includes(p.elo)) serie = "A";
      else if (["Grão-Mestre", "Mestre"].includes(p.elo)) serie = "B";

      // Geração de dados simulados
      const vitorias = Math.floor(Math.random() * 15);
      const derrotas = Math.floor(Math.random() * 10);
      const pontos = vitorias * 3; // 3 pontos por vitória, nenhum por derrota

      return {
        id: p.id,
        name: p.name || "Jogador",
        role: p.role || "Indefinido",
        elo: p.elo || "Sem elo",
        serie,
        pontos,
        vitorias,
        derrotas,
      };
    });

    // --- Agrupa jogadores por série
    const series = {
      A: rankingData.filter((p) => p.serie === "A"),
      B: rankingData.filter((p) => p.serie === "B"),
      C: rankingData.filter((p) => p.serie === "C"),
    };

    // --- Ordena o ranking (prioriza pontos e depois vitórias)
    for (const serie of Object.keys(series)) {
      series[serie].sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        return b.vitorias - a.vitorias;
      });
    }

    // --- Função para calcular aproveitamento (%)
    const calcAproveitamento = (p) => {
      const jogos = p.vitorias + p.derrotas;
      if (jogos === 0) return "0.0";
      return ((p.pontos / (jogos * 3)) * 100).toFixed(1);
    };

    // --- Função para gerar texto do ranking
    const gerarTabela = (serie) => {
      if (series[serie].length === 0) return "Nenhum jogador nesta série ainda.";
      return series[serie]
        .map(
          (p, i) =>
            `**${i + 1}.** ${p.name} — 🏅 ${p.elo}\n> 🎯 Pts: **${p.pontos}** | ✅ V: **${p.vitorias}** | ❌ D: **${p.derrotas}** | 📊 ${calcAproveitamento(p)}%`
        )
        .join("\n");
    };

    // --- Embeds das séries
    const embedA = new EmbedBuilder()
      .setTitle("🏆 Série A — Desafiante / Monarca")
      .setColor("#FFD700")
      .setDescription(gerarTabela("A"))
      .setFooter({ text: "Inhouse Wild Rift • Série A" });

    const embedB = new EmbedBuilder()
      .setTitle("🥈 Série B — Grão-Mestre / Mestre")
      .setColor("#C0C0C0")
      .setDescription(gerarTabela("B"))
      .setFooter({ text: "Inhouse Wild Rift • Série B" });

    const embedC = new EmbedBuilder()
      .setTitle("🥉 Série C — Diamante / Ouro")
      .setColor("#CD7F32")
      .setDescription(gerarTabela("C"))
      .setFooter({ text: "Inhouse Wild Rift • Série C" });

    // --- Envia os rankings juntos
    await interaction.reply({
      embeds: [embedA, embedB, embedC],
    });

  } catch (err) {
    console.error("❌ Erro ao gerar ranking:", err);
    await interaction.reply({
      content: "❌ Ocorreu um erro ao gerar o ranking.",
      flags: 64,
    });
  }
}
