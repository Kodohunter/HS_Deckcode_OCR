const request = require("request");

// Get a JSON object of all collectible hearthstone cards in existense
function getCollectibleCardsJSON(){
    return new Promise(resolve => {
        request('https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json', function (error, response, body) {
            resolve(JSON.parse(body));
        });
    });
}
module.exports.getCollectibleCardsJSON = getCollectibleCardsJSON;

// select only the cards that have the correct mana as potential candidates
// this heavily relies on mana reading to be correct, but it seems rather reliable
// faulty reads usually make manaCost NaN, so just pass everything then
function filterCardsList(listOfAllCards, manaCost){
    let filteredListOfCards = {
        cardNames: [],
        cardId: [],
        cardMana: [],
        cardClass: []
    }
    for(let i = 0; i < listOfAllCards.length; i++){
        // this is causing empty cardsObjects, which break the stringSimiliarity, so commented until fixed
        //if(listOfAllCards[i].cost == manaCost || manaCost == NaN){
            filteredListOfCards.cardNames = [...filteredListOfCards.cardNames, listOfAllCards[i].name.toLowerCase()];
            filteredListOfCards.cardId = [...filteredListOfCards.cardId, listOfAllCards[i].dbfId];
            filteredListOfCards.cardMana = [...filteredListOfCards.cardMana, listOfAllCards[i].cost];
            filteredListOfCards.cardClass = [...filteredListOfCards.cardClass, listOfAllCards[i].cardClass];
        //}
    }
    return filteredListOfCards;
}
module.exports.filterCardsList = filterCardsList;

