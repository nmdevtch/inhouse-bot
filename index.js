import { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

client.once('ready', () => {
    console.log(`✅ Bot logado como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return;

    if (interaction.isChatInputCommand() && interaction.commandName === 'registrar') {
        const eloMenu = new StringSelectMenuBuilder()
            .setCustomId('selecionar_elo')
            .setPlaceholder('Selecione seu elo')
            .addOptions([
                { label: 'Ouro', value: 'ouro', emoji: '🟡' },
                { label: 'Platina', value: 'platina', emoji: '🟢' },
                { label: 'Esmeralda', value: 'esmeralda', emoji: '💚' },
                { label: 'Diamante', value: 'diamante', emoji: '💎' },
                { label: 'Mestre', value: 'mestre', emoji: '🟣' },
                { label: 'Grão Mestre', value: 'grao_mestre', emoji: '🔴' },
                { label: 'Desafiante', value: 'desafiante', emoji: '🟠' },
                { label: 'Monarca', value: 'monarca', emoji: '👑' }
            ]);

        const rotaMenu = new StringSelectMenuBuilder()
            .setCustomId('selecionar_rota')
            .setPlaceholder('Selecione sua rota principal (1 apenas)')
            .addOptions([
                { label: 'Topo / Superior', value: 'topo', emoji: '🔵' },
                { label: 'Jungler / Caçador', value: 'jungler', emoji: '🔴' },
                { label: 'Mid / Meio', value: 'mid', emoji: '⚫' },
                { label: 'ADC / Atirador', value: 'adc', emoji: '🔹' },
                { label: 'Sup / Suporte', value: 'sup', emoji: '🟣' }
            ]);

        const row1 = new ActionRowBuilder().addComponents(eloMenu);
        const row2 = new ActionRowBuilder().addComponents(rotaMenu);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Registro de Inhouse 🎮')
            .setDescription('Selecione seu **Elo** e **Rota Principal** abaixo.')
            .setThumbnail('https://i.imgur.com/lbRcM8B.png');

        await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
    }

    if (interaction.isStringSelectMenu()) {
        const valor = interaction.values[0];
        if (interaction.customId === 'selecionar_elo') {
            await interaction.reply({ content: `✅ Seu elo foi definido como **${valor.replace('_', ' ')}**!`, ephemeral: true });
        }
        if (interaction.customId === 'selecionar_rota') {
            await interaction.reply({ content: `✅ Sua rota principal é **${valor.replace('_', ' ')}**!`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
