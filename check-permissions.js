import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const ROLE_NAMES = [
  "Visitante",
  "Ouro",
  "Platina",
  "Esmeralda",
  "Diamante",
  "Mestre",
  "Grão Mestre",
  "Desafiante",
  "Monarca",
  "Topo / Superior",
  "Jungler / Caçador",
  "Mid / Meio",
  "Adc / Atirador",
  "Sup / Suporte",
];

client.once("clientReady", async () => {
  console.log(`✅ Logado como ${client.user.tag}\n`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.log("❌ O bot não está em nenhum servidor.");
    client.destroy();
    return;
  }

  console.log(`🔍 Verificando permissões no servidor: ${guild.name}\n`);

  const botMember = await guild.members.fetch(client.user.id);
  const botHighest = botMember.roles.highest;
  const hasManage = botMember.permissions.has("ManageRoles");

  console.log(`🧩 Cargo mais alto do bot: ${botHighest.name}`);
  console.log(`🛡️  Permissão 'Gerenciar Cargos': ${hasManage ? "✅ SIM" : "❌ NÃO"}\n`);

  for (const roleName of ROLE_NAMES) {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      console.log(`⚠️  Cargo '${roleName}' não encontrado.`);
      continue;
    }

    let status = "";
    if (!hasManage) status = "❌ Sem permissão.";
    else if (role.position >= botHighest.position) status = "⚠️ Acima do cargo do bot.";
    else status = "✅ Pode gerenciar.";

    console.log(`- ${role.name}: ${status}`);
  }

  console.log("\n✅ Verificação concluída!");
  client.destroy();
});

client.login(process.env.TOKEN);
