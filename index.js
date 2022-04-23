// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const scraper = require("./scraper.js")
var logger = require('winston');
const {
    joinVoiceChannel
} = require('@discordjs/voice');

// Create a new client instance
const client = new Client({ intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES
]});


// When the client is ready, run this code (only once)
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
        message.channel.send("invalid command");
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
    const url = message.content.substring(1).split(' ')[1];
    //const url = "https://www.bilibili.com/video/BV14341157Fq"
    scraper.scrape(url, message.guildId);
    joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guildId,
        adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
    });
    message.channel.send("test");
    
})

// Login to Discord with your client's token
client.login(token);