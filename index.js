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

        main(file);
    })

}
*/
// reply the deckcode to the requester in twitter
function replyTheDeckcode(deckcode){
    let replyText = "Deckcode: "+deckcode;
    console.log(replyText);
    /*
    twitter.post('statuses/update', { status: replyText, in_reply_to_status_id: replyID}, function(err, data, response) {
        console.log("success")
    });
    */
}

// for ocr testing, we'll just directly test lists instead of testing via twitter posts
let testFile = './decklists/kuva6.png';
main(testFile);

// making function async allows for awaits, something the program will stop and wait for
// The wait will be broken by the resolve in the function's promise
async function main(filePath){
    let cardsJSON = await ocr.getCollectibleCardsJSON();
    let tesseractResults = await ocr.runTesseractRecognition(filePath);
    let readyDeckcode = ocr.cleanOcrResults(cardsJSON, tesseractResults);
    replyTheDeckcode(readyDeckcode);
}

