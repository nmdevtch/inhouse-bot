import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
    new SlashCommandBuilder()
        .setName('registrar')
        .setDescription('Registrar seu elo e rota principal para a inhouse!')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('⏳ Registrando comandos...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
})();
