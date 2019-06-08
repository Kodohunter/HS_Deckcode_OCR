let ocr = require("./src/ocr");
let config = require("./src/config");
let Twit = require('twit');

var twitter = new Twit(config.twitterConfig);

// this is only for testing purposes, something smart will replace it eventually
let replyID = '';

/*
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

    // listen for a request: the hashtag 'deckstringthis'
    var stream = twitter.stream('statuses/filter', {track: '#deckstringthis'});
    stream.on('tweet', function (tweet) {

        replyID = tweet.id_str;
        let file = tweet.entities.media[0].media_url;

        ocr.ocrProcessing(file);
    })

}
*/

function replyTheDeckcode(deckcode){
    let replyText = "Deckcode: "+deckcode;
    console.log(replyText);
    /*
    twitter.post('statuses/update', { status: replyText, in_reply_to_status_id: replyID}, function(err, data, response) {
        console.log("success")
    });
    */
}

// I'd want this to be run when ready, but currently it's invocated by ocr.js
// The asynchronity is really though to solve, but there must be a way to make the program make sense logically
// Probably a class that walks with the process is a start
module.exports.replyTheDeckcode = replyTheDeckcode;

let testFile = './decklists/NewSet/mage.png'
//ocr.ocrProcessing(testFile);