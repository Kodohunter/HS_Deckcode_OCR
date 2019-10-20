const ocr = require("./src/ocrSpace");
const cardListManagement = require("./src/cardListManagement");
const config = require("./src/config");
const Twit = require('twit');
const deckstring = require("./src/deckstring");
const deckBuilder = require("./src/deckBuilder");

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
let testFile = './decklists/kuva5.png';
main(testFile);

// making function async allows for awaits, something the program will stop and wait for
// The wait will be broken by the resolve in the function's promise
async function main(filePath){
    let listOfAllCards = await cardListManagement.getCollectibleCardsJSON();
    let ocrResult = await ocr.runOcrRecognition(filePath);

    let deckstringCompatibleDeckobject = deckBuilder.deckBuilder(listOfAllCards, ocrResult);

    let readyDeckcode = deckstring.convertIntoDeckstring(deckstringCompatibleDeckobject);
    console.log(readyDeckcode)
    //replyTheDeckcode(readyDeckcode);
    console.log("Done");
}

