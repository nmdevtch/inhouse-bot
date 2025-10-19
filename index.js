// ranking.js
import db from "./database.js";
import { EmbedBuilder } from "discord.js";

/**
 * Exibe o ranking global baseado em MMR e desempenho
 * @param {Object} interaction - interação do Discord
 */
export async function exibirRanking(interaction) {
  try {
    const players = db.prepare("SELECT * FROM players").all();

    if (!players.length) {
      await interaction.reply({
        content: "⚠️ Nenhum jogador registrado no banco de dados.",
        flags: 64, // resposta privada
      });
      return;
    }

    // --- Gera dados simulados de ranking
    const rankingData = players.map((p) => {
      const vitorias = Math.floor(Math.random() * 15);
      const derrotas = Math.floor(Math.random() * 10);
      const pontos = vitorias * 3;
      const mmr = p.mmr || 200; // padrão fixo atual

      return {
        id: p.id,
        name: p.name || "Jogador",
        role: p.role || "Indefinido",
        elo: p.elo || "Sem elo",
        mmr,
        pontos,
        vitorias,
        derrotas,
      };
    });

    // --- Ordena o ranking por MMR > Pontos > Vitórias
    rankingData.sort((a, b) => {
      if (b.mmr !== a.mmr) return b.mmr - a.mmr;
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      return b.vitorias - a.vitorias;
    });

    // --- Calcula aproveitamento (%)
    const calcAproveitamento = (p) => {
      const jogos = p.vitorias + p.derrotas;
      if (jogos === 0) return "0.0";
      return ((p.vitorias / jogos) * 100).toFixed(1);
    };

    // --- Monta o texto do ranking
    const rankingTexto = rankingData
      .map(
        (p, i) =>
          `**${i + 1}.** ${p.name} — 🏅 ${p.elo}\n> 🎯 MMR: **${p.mmr}** | 🏆 Pts: **${p.pontos}** | ✅ V: **${p.vitorias}** | ❌ D: **${p.derrotas}** | 📊 ${calcAproveitamento(p)}%`
      )
      .join("\n");

    // --- Cria o embed do ranking global
    const embed = new EmbedBuilder()
      .setTitle("🏆 Ranking Global — Inhouse Wild Rift")
      .setColor("#00AEEF")
      .setDescription(rankingTexto)
      .setFooter({ text: "Sistema de MMR Unificado • Todos contra todos" });

    // --- Envia o ranking
    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Erro ao gerar ranking:", err);
    await interaction.reply({
      content: "❌ Ocorreu um erro ao gerar o ranking.",
      flags: 64,
    });
  }
}
