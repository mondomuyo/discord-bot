var axios = require("axios")
var cheerio = require("cheerio")
var fs = require("fs");

const {
    getVoiceConnection, 
    createAudioPlayer, 
    NoSubscriberBehavior, 
    createAudioResource
} = require('@discordjs/voice');


function scrape(url, guildId) {
    axios.get(url).then(resp => {
        var $ = cheerio.load(resp.data);
        const head = $('head').eq(0);
        const playInfoStr = head.find('script').eq(3).html().substring(20);
        const playInfo = JSON.parse(playInfoStr);
        const audioURL = playInfo["data"]["dash"]["audio"][0]["baseUrl"];
        axios.get(audioURL, {headers: {referer: url}, responseType: 'arraybuffer'}).then(resp => {
            fs.writeFile(`/tmp/audio-${guildId}.mp4`, resp.data, err => {
                if (err) {
                    return;
                }
                console.log("downloaded");
                const resource = createAudioResource(`/tmp/audio-${guildId}.mp4`);
                const connection = getVoiceConnection(guildId);
                const audioPlayer = createAudioPlayer({
                    behaviors: {
                        noSubscriber: NoSubscriberBehavior.Pause
                    }
                });
                audioPlayer.play(resource);
                connection.subscribe(audioPlayer);
            });
        });
    });
}

module.exports = {scrape};