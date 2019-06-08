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

module.exports.replyTheDeckcode = replyTheDeckcode;

let testFile = './decklists/kuva6.png'
//ocr.ocrProcessing(testFile);



async function main(){
    let cardsJSON = await ocr.getCollectibleCardsJSON();
    let tesseractResults = await ocr.runTesseractRecognition(testFile);
    ocr.finalize(cardsJSON, tesseractResults);
}

main();