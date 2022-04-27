const { Client, Intents } = require('discord.js');
// you should specify your own token in config.json:
// {
// 	"token": <your token>
// }
const { token } = require('./config.json');
const MusicQueue = require("./music-queue.js")
const logger = require('winston');
const {
    joinVoiceChannel
} = require('@discordjs/voice');

const client = new Client({ intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES
]});


client.once('ready', () => {
	console.log('Ready!');
});

client.on('messageCreate', async message => {
    if(message.author.bot) {
        return;
    }
    if(message.content.substring(0, 1) != "~") {
        return;
    }
    if(message.content.substring(1).split(' ')[0] != "play") {
        if(message.content.substring(1).split(' ')[0] === "list") {
            for(let music of MusicQueue.getMusicQueue()[message.guildId]) {
                message.channel.send(`${music.title}-${music.status}`);
            }
            return;
        }
        if(message.content.substring(1).split(' ')[0] === "skip") {
            MusicQueue.skipMusic(message.guildId);
            return;
        }
        if(message.content.substring(1).split(' ')[0] === "help") {
            message.channel.send("~play <url>: play bilibili music");
            message.channel.send("~list: list all musics");
            message.channel.send("~skip: skip current music");
            message.channel.send("~help: show help");
            return;
        }
        message.channel.send("invalid command, try ~help");
        return;
    }
    if(message.content.substring(1).split(' ').length == 1) {
        message.channel.send("need url");
        return;
    }
    if(!message.member.voice.channel) {
        message.channel.send("you are not in a voice channel");
        return;
    }
    joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guildId,
        adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
    });
    const url = message.content.substring(1).split(' ')[1];
    const responseMessage = MusicQueue.addMusic(message.guildId, url);
    message.channel.send(responseMessage);
})

client.login(token);