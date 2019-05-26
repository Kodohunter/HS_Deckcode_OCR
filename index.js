let ocr = require("./src/ocr");
let config = require("./src/config");

/*

let Twit = require('twit');

var twitter = new Twit(config.twitterConfig);

twitter.get('account/verify_credentials', {
    include_entities: false,
    skip_status: true,
    include_email: false
}, onAuthenticated)

function onAuthenticated(err, res) {
    if(err) {
        throw err;
    }

    console.log("Authentication succesful");

    var stream = twitter.stream('statuses/filter', {track: '#deckstringthis'});

    stream.on('tweet', function (tweet) {

        console.log("Received tweet");
        let file = tweet.entities.media[0].media_url;
        ocr.ocrProcessing(file);
    })
}
*/

const file = './decklists/kuva6.png';
ocr.ocrProcessing(file);