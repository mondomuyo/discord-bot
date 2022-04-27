var fs = require('fs');
const axios = require("axios");
const cheerio = require("cheerio");
const logger = require('winston');
const url = require('url');

const {
    getVoiceConnection, 
    createAudioPlayer, 
    NoSubscriberBehavior, 
    createAudioResource,
    AudioPlayerStatus,
} = require('@discordjs/voice');


let MusicQueueGlobal = {};

function getMusicQueue() {
    return MusicQueueGlobal;
}

function scrapeBilibili(music, guildID) {
    if(music.source !== "bilibili") {
        return;
    }
    const url = "https://www.bilibili.com/video/" + music.BV
    axios.get(url).then(resp =>{
        var $ = cheerio.load(resp.data);
        const head = $('head').eq(0);
        music.title = head.find('title').eq(0).html();
        if(music.status !== "downloading") {
            return;
        }
        const playInfoStr = head.find('script').eq(3).html().substring(20);
        const playInfo = JSON.parse(playInfoStr);
        const audioURL = playInfo["data"]["dash"]["audio"][0]["baseUrl"];
        axios.get(audioURL, {headers: {referer: url}, responseType: 'arraybuffer'}).then(resp => {
            fs.writeFile(`/tmp/bilibili-${music.BV}.mp4`, resp.data, err => {
                if (err) {
                    logger.error("failed to write to audio file!");
                    logger.error(JSON.stringify(err));
                }
                music.status = "cached";
                refreshQueue(guildID);
            });
        }).catch(err => {
            logger.error("failed to download to audio file!");
            music.status = "download failed";
            logger.error(JSON.stringify(err));
        });
    }).catch(err =>{
        logger.error("failed to download html!");
        logger.error(JSON.stringify(err));
    })
}

function refreshQueue(guildID) {
    if(MusicQueueGlobal[guildID].length === 0) {
        return;
    }
    let queueFront = MusicQueueGlobal[guildID][0];
    if(queueFront.status === "cached") {
        const resource = createAudioResource(`/tmp/bilibili-${queueFront.BV}.mp4`);
        const connection = getVoiceConnection(guildID);
        const audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });
        audioPlayer.play(resource);
        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            queueFront.status = "stopped";
            refreshQueue(guildID);
        })
        connection.subscribe(audioPlayer);
        queueFront.status = "playing";
        return;
    } else if(queueFront.status === "stopped") {
        MusicQueueGlobal[guildID].shift();
        refreshQueue(guildID);
        return;
    } else if(queueFront.status === "download failed") {
        MusicQueueGlobal[guildID].shift();
        refreshQueue(guildID);
        return;
    }
}

function addMusic(guildID, urlStr) {
    newMusic = {}
    musicURL = new URL(urlStr);
    switch(musicURL.hostname) {
        case "www.bilibili.com":
            newMusic.source = "bilibili";
            paths = musicURL.pathname.split('/');
            if(paths.length != 3 || paths[1] != "video") {
                return "bad url";
            }
            newMusic.BV = paths[2];
            if(fs.existsSync(`/tmp/bilibili-${newMusic.BV}.mp4`)) {
                newMusic.status = "cached";
            } else {
                newMusic.status = "downloading";
            }
            scrapeBilibili(newMusic, guildID);
            break;
        default:
            return "music source not supported";
    }
    if(typeof(MusicQueueGlobal[guildID]) === "undefined") {
        MusicQueueGlobal[guildID] = [];
    }
    MusicQueueGlobal[guildID].push(newMusic);
    refreshQueue(guildID);
    return "music added successfully"
}

function skipMusic(guildID) {
    if(MusicQueueGlobal[guildID].length === 0) {
        return;
    }
    let queueFront = MusicQueueGlobal[guildID][0];
    queueFront.status = "stopped";
    refreshQueue(guildID);
}

module.exports = {
    getMusicQueue,
    refreshQueue,
    addMusic,
    skipMusic,
}