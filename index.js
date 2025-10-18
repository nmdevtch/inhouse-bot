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
  EmbedBuilder
} from "discord.js";
import dotenv from "dotenv";
import express from "express";
import db from "./database.js"; // 🔹 Banco de dados interno SQLite
dotenv.config();

// =====================
// 🔸 KEEP-ALIVE (Render)
// =====================
const app = express();
app.get("/", (req, res) => res.send("✅ Bot de registro Inhouse está ativo!"));
app.listen(4000, () => console.log("🌐 Keep-alive ativo na porta 4000!"));

// =====================
// 🔸 CLIENT DISCORD
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// =====================
// 🔸 COMANDO /registrar
// =====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "registrar") {
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
        { label: "Jungler / Caçador", value: "jungle", emoji: "🔴" },
        { label: "Mid / Meio", value: "mid", emoji: "⚫" },
        { label: "ADC / Atirador", value: "adc", emoji: "🔹" },
        { label: "SUP / Suporte", value: "sup", emoji: "🟣" },
      ]);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎮 Registro de Inhouse")
      .setDescription("Selecione seu **Elo** e **Rota Principal** abaixo para receber seus cargos!")
      .setThumbnail("https://i.imgur.com/lbRcM8B.png");

    await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(eloMenu),
        new ActionRowBuilder().addComponents(rotaMenu),
      ],
      ephemeral: true,
    });
  }
});

// =====================
// 🔸 INTERAÇÃO DE MENUS
// =====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const membro = interaction.member;
  const guild = interaction.guild;

  const roles = {
    "topo": "1427195793168666634",
    "jungle": "1427195874454540339",
    "mid": "1427195943463419904",
    "adc": "1427196010769158179",
    "sup": "1427196093950591097",
    "ouro": "1427116853196488875",
    "platina": "1427116930719813642",
    "esmeralda": "1427117033958674432",
    "diamante": "1427117094549458944",
    "mestre": "1427117203853148170",
    "grao_mestre": "1428538683036012794",
    "desafiante": "1428538843392381071",
    "monarca": "1428538981976379464"
  };

  // 🔹 Remove o cargo "Visitante"
  const visitanteRole = guild.roles.cache.find(r =>
    r.name.toLowerCase().includes("visitante")
  );
  if (visitanteRole && membro.roles.cache.has(visitanteRole.id)) {
    await membro.roles.remove(visitanteRole);
  }

  // 🔹 Adiciona cargo selecionado
  const valor = interaction.values[0];
  const roleId = roles[valor];
  if (roleId) {
    const role = guild.roles.cache.get(roleId);
    if (role) await membro.roles.add(role);
  }

  const tipo = interaction.customId === "menu_elo" ? "elo" : "rota";

  // 🔹 Salva no banco de dados
  const insert = db.prepare(`
    INSERT INTO registros (user_id, username, ${tipo})
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET ${tipo} = excluded.${tipo};
  `);
  insert.run(membro.id, membro.user.username, valor);

  await interaction.reply({
    content: `✅ ${tipo === "elo" ? "Elo" : "Rota principal"} registrado como **${valor.replace("_", " ")}**!`,
    ephemeral: true,
  });
});

// =====================
// 🔸 COMANDO /meusdados
// =====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "meusdados") {
    const row = db.prepare("SELECT * FROM registros WHERE user_id = ?").get(interaction.user.id);
    if (!row) {
      await interaction.reply({ content: "❌ Você ainda não possui registros!", ephemeral: true });
    } else {
      await interaction.reply({
        content: `📊 **Seus dados:**\n- Elo: **${row.elo || "Não definido"}**\n- Rota: **${row.rota || "Não definida"}**`,
        ephemeral: true,
      });
    }
  }
});

// =====================
// 🔸 LOGIN
// =====================
client.login(process.env.TOKEN);
