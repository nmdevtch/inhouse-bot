// =====================
// 🔸 IMPORTS
// =====================
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} from "discord.js";
import dotenv from "dotenv";
import express from "express";
import db from "./database.js";
import { exec } from "child_process";

dotenv.config();

// =====================
// 🔄 DEPLOY AUTOMÁTICO
// =====================
console.log("🔄 Atualizando comandos Slash...");
exec("npm run deploy", (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Erro ao executar deploy: ${error.message}`);
    return;
  }
  if (stderr) console.error(`⚠️ Aviso: ${stderr}`);
  console.log(stdout);
});

// =====================
// 🔸 KEEP-ALIVE SERVER
// =====================
const app = express();
const PORT = process.env.PORT || 4000;
app.get("/", (req, res) =>
  res.send("✅ Bot de registro Inhouse está ativo e rodando!")
);
app.listen(PORT, () =>
  console.log(`🌐 Keep-alive ativo na porta ${PORT}!`)
);

// =====================
// 🔸 DISCORD CLIENT
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot iniciado com sucesso como ${client.user.tag}`);
  client.user.setActivity("Registrando jogadores ⚔️", { type: 0 });
});

// =====================
// 🔸 MAPA DE CARGOS
// =====================
const ROLES = {
  topo: "1427195793168666634",
  jungle: "1427195874454540339",
  mid: "1427195943463419904",
  adc: "1427196010769158179",
  sup: "1427196093950591097",
  ouro: "1427116853196488875",
  platina: "1427116930719813642",
  esmeralda: "1427117033958674432",
  diamante: "1427117094549458944",
  mestre: "1427117203853148170",
  grao_mestre: "1428538683036012794",
  desafiante: "1428538843392381071",
  monarca: "1428538981976379464",
  wildrift: "1426957458617663589",
};

// =====================
// 🔸 FILAS
// =====================
const filas = {
  serie_a: [],
  serie_b: [],
  serie_c: [],
};

// =====================
// 🔸 EVENTOS DE INTERAÇÃO
// =====================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ========= /registrar =========
    if (interaction.isChatInputCommand() && interaction.commandName === "registrar") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const eloMenu = new StringSelectMenuBuilder()
        .setCustomId("menu_elo")
        .setPlaceholder("Selecione seu elo")
        .addOptions([
          { label: "Ouro", value: "ouro", emoji: "🟡" },
          { label: "Platina", value: "platina", emoji: "🟢" },
          { label: "Esmeralda", value: "esmeralda", emoji: "💚" },
          { label: "Diamante", value: "diamante", emoji: "💎" },
          { label: "Mestre", value: "mestre", emoji: "🟣" },
          { label: "Grão Mestre", value: "grao_mestre", emoji: "🔴" },
          { label: "Desafiante", value: "desafiante", emoji: "🟠" },
          { label: "Monarca", value: "monarca", emoji: "👑" },
        ]);

      const rotaMenu = new StringSelectMenuBuilder()
        .setCustomId("menu_rota")
        .setPlaceholder("Selecione sua rota principal")
        .addOptions([
          { label: "Topo / Superior", value: "topo", emoji: "🔵" },
          { label: "Jungle / Caçador", value: "jungle", emoji: "🟢" },
          { label: "Mid / Meio", value: "mid", emoji: "⚫" },
          { label: "ADC / Atirador", value: "adc", emoji: "🔹" },
          { label: "SUP / Suporte", value: "sup", emoji: "🟣" },
        ]);

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎮 Registro de Inhouse")
        .setDescription("Selecione seu **Elo** e **Rota Principal** abaixo para receber seus cargos!");

      await interaction.editReply({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(eloMenu),
          new ActionRowBuilder().addComponents(rotaMenu),
        ],
      });
      return;
    }

    // ========= MENU DE SELEÇÃO =========
    if (interaction.isStringSelectMenu()) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const guild = interaction.guild;
      const membro = await guild.members.fetch(interaction.user.id);
      const valor = interaction.values[0];
      const tipo = interaction.customId === "menu_elo" ? "elo" : "rota";

      const visitanteRole = guild.roles.cache.find((r) =>
        r.name.toLowerCase().includes("visitante")
      );
      if (visitanteRole && membro.roles.cache.has(visitanteRole.id)) {
        await membro.roles.remove(visitanteRole);
      }

      const roleId = ROLES[valor];
      if (roleId && !membro.roles.cache.has(roleId)) {
        await membro.roles.add(roleId);
      }

      const jogadorRole = guild.roles.cache.get(ROLES["wildrift"]);
      if (jogadorRole && !membro.roles.cache.has(jogadorRole.id)) {
        await membro.roles.add(jogadorRole);
      }

      db.prepare(`
        INSERT INTO registros (user_id, username, ${tipo})
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET ${tipo} = excluded.${tipo};
      `).run(membro.id, membro.user.username, valor);

      await interaction.editReply({
        content: `✅ ${tipo === "elo" ? "Elo" : "Rota principal"} registrado como **${valor.replace("_", " ")}**!`,
      });
      return;
    }

    // ========= /meusdados =========
    if (interaction.isChatInputCommand() && interaction.commandName === "meusdados") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const row = db.prepare("SELECT * FROM registros WHERE user_id = ?").get(interaction.user.id);
      if (!row) {
        await interaction.editReply({ content: "❌ Você ainda não possui registros!" });
      } else {
        await interaction.editReply({
          content: `📊 **Seus dados:**\n- Elo: **${row.elo || "Não definido"}**\n- Rota: **${row.rota || "Não definida"}**`,
        });
      }
      return;
    }

    // ========= /queue =========
    if (interaction.isChatInputCommand() && interaction.commandName === "queue") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const jogador = db.prepare("SELECT * FROM registros WHERE user_id = ?").get(interaction.user.id);

      if (!jogador || !jogador.elo || !jogador.rota) {
        await interaction.editReply({
          content: "❌ Você precisa se registrar primeiro com `/registrar`!",
        });
        return;
      }

      let serie;
      switch (jogador.elo) {
        case "monarca":
        case "desafiante":
          serie = "serie_a";
          break;
        case "grao_mestre":
        case "mestre":
          serie = "serie_b";
          break;
        case "diamante":
        case "esmeralda":
        case "platina":
        case "ouro":
          serie = "serie_c";
          break;
        default:
          await interaction.editReply({
            content: "⚠️ Seu elo não se enquadra em nenhuma série válida.",
          });
          return;
      }

      if (filas[serie].includes(interaction.user.id)) {
        await interaction.editReply({
          content: `⚠️ Você já está na fila da **${serie.replace("_", " ").toUpperCase()}**.`,
        });
        return;
      }

      filas[serie].push(interaction.user.id);
      await interaction.editReply({
        content: `✅ Você entrou na **fila da ${serie.replace("_", " ").toUpperCase()}** como **${jogador.rota.toUpperCase()}**.`,
      });

      if (filas[serie].length >= 10) {
        const jogadores = filas[serie].splice(0, 10);
        const categoria = await interaction.guild.channels.create({
          name: `Partida ${serie.toUpperCase()}`,
          type: ChannelType.GuildCategory,
        });

        const canalVoz = await interaction.guild.channels.create({
          name: "🔊 Sala de Voz Inhouse",
          type: ChannelType.GuildVoice,
          parent: categoria.id,
        });

        const canalTexto = await interaction.guild.channels.create({
          name: "💬 sala-texto-inhouse",
          type: ChannelType.GuildText,
          parent: categoria.id,
        });

        const time1 = jogadores.slice(0, 5);
        const time2 = jogadores.slice(5, 10);

        await canalTexto.send(
          `🎮 **Times encontrados para ${serie.toUpperCase()}!**\n🟥 **Time 1:** ${time1
            .map((id) => `<@${id}>`)
            .join(", ")}\n🟦 **Time 2:** ${time2.map((id) => `<@${id}>`).join(", ")}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Erro na interação:", error);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({
        content: "❌ Ocorreu um erro ao executar o comando!",
      });
    } else if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Ocorreu um erro ao executar o comando!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// =====================
// 🔸 CAPTURA GLOBAL DE ERROS
// =====================
process.on("unhandledRejection", (err) => console.error("⚠️ Rejeição não tratada:", err));
process.on("uncaughtException", (err) => console.error("⚠️ Exceção não tratada:", err));

// =====================
// 🔸 LOGIN
// =====================
client.login(process.env.TOKEN).catch((err) =>
  console.error("❌ Falha ao conectar o bot:", err)
);
