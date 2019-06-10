const Tesseract = require('tesseract.js')
const stringSimilarity = require('string-similarity');
const deckstring = require("./deckstring");
const request = require("request");
import { encode, decode, FormatType } from "deckstrings";


// Get a JSON object of all collectible hearthstone cards in existense
function getCollectibleCardsJSON(){
    return new Promise(resolve => {
        request('https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json', function (error, response, body) {
            resolve(JSON.parse(body));
        });
    });
}
module.exports.getCollectibleCardsJSON = getCollectibleCardsJSON;

function runTesseractRecognition(fileUrl){
    return new Promise(resolve => {
        Tesseract.recognize(fileUrl)
        .then(function(result){
            resolve(result);
        })
    });
}
module.exports.runTesseractRecognition = runTesseractRecognition;

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

function createDeck(deckReadingResults, listOfAllCards){
    let deck = [];
    let deckClass;
    for (var i = 0; i < deckReadingResults.length; i++){

        // Clean the deckReadingResults for better comparing results
        var card = deckReadingResults[i].replace(/[^a-zA-Z0-9* ]/g, '');

        // Skip all the mistake rows
        var trueLength = card.replace(/ /g, '').length;

        // if the length of the row is too short, chances are it's a misreading and not an actual row
        // 5 is just a guess, might require re-evaluation
        if(trueLength > 5){ 

            // Find out the manacost, cardname and count from the line
            card = card.trim();
            let manacostPosEnd = card.indexOf(" ");
            let cardNamePosEnd = card.lastIndexOf(" ");

            let manaCost = card.slice(0, manacostPosEnd);
            let cardCount = card.slice(cardNamePosEnd + 1);
            card = card.slice(manacostPosEnd + 1, cardNamePosEnd);

            switch (true){
                case cardCount.includes("*"): // legendary
                    cardCount = 1;
                    break;
                case cardCount.includes("2") || cardCount.toLowerCase().includes("z"):
                    cardCount = 2;
                    break;
                default:
                    card = card + cardCount;
                    cardCount = 1;
                    break;
            }


            // common mistakes fixes
            manaCost = manaCost.replace(/oO/g, "0");
            manaCost = manaCost.replace(/zZ/g, "2");
            manaCost = parseInt(manaCost);
            card = card.replace(/1/g, "l");

            
            let filteredListOfCards = filterCardsList(listOfAllCards, manaCost);

            // find the best match from the hearthstone JSON collection
            
            if(card){
                let cleanedCard = stringSimilarity.findBestMatch(card.toLowerCase(), filteredListOfCards.cardNames);
            

                if(filteredListOfCards.cardClass[cleanedCard.bestMatchIndex] !== "NEUTRAL")
                    deckClass = filteredListOfCards.cardClass[cleanedCard.bestMatchIndex];

                //console.log("Original: " + card + " Best match: " + filteredListOfCards.cardNames[cleanedCard.bestMatchIndex] + " ID: " + filteredListOfCards.cardId[cleanedCard.bestMatchIndex] + " Index: " + cleanedCard.bestMatchIndex + " Class: " + filteredListOfCards.cardClass[cleanedCard.bestMatchIndex] + " Mana: " + manaCost + " Count: " + cardCount );

                // Add the card to the deck
                deck = [...deck, {
                    cardName: filteredListOfCards.cardNames[cleanedCard.bestMatchIndex],
                    originalReading: card,
                    cardClass: filteredListOfCards.cardClass[cleanedCard.bestMatchIndex],
                    id: filteredListOfCards.cardId[cleanedCard.bestMatchIndex],
                    count: cardCount,
                    manaCost: manaCost
                }]
            }
        }
    }
    return [deck, deckClass];
}


function cleanOcrResults(listOfAllCards, tesseractResult){


    // Split the deckReadingResultsArray into potential cards, seperated by newlines
    var fullText = tesseractResult['text'];
    var deckReadingResultsArray = fullText.split('\n');
    
    // Only made like this, because the function returns 2 values
    // Need to take a look if there's a cleaner option avaiable
    let deckTemp = createDeck(deckReadingResultsArray, listOfAllCards);
    let deck = deckTemp[0];
    let deckClass = deckTemp[1];

    var counts = {};
    var compare = 0;

    // find the class with highest frequency, which is the most likely class for the deck
    // 'neutral' is not applicable as a class
    for (let i = 0; i < deck.length; i++){
        var cardClass = deck[i].cardClass;
        
        if(cardClass != "NEUTRAL"){
            if(counts[cardClass] === undefined){
                counts[cardClass] = 1;
            }else{
                counts[cardClass] = counts[cardClass] + 1;
            }
            if(counts[cardClass] > compare){
                    compare = counts[cardClass];
                    deckClass = cardClass;
            }
        }
    }


    for (let i = 0; i < deck.length; i++){
        if(deck[i].cardClass !== deckClass && deck[i].cardClass !== "NEUTRAL"){
            adjustDeck(deck, "Class", i, listOfAllCards);
        }
    }

    for (let i = 0; i < deck.length; i++){
        adjustDeck(deck, "Mana", i, listOfAllCards);
    }

    //let heroID = getHeroId(deckClass);
    let deckObject = {
        cards: [],
        heroes: [getHeroId(deckClass)],
        format: FormatType.FT_WILD
    };

    // Create a deckstring from the deck
    for (let i = 0; i < deck.length; i++){
        
        console.log("Original: "+deck[i].originalReading
            +"\t\t Card: "+deck[i].cardName
            +"\t\t Amount: "+deck[i].count
            +"\t\t Class: "+deck[i].cardClass
            +"\t\t Mana: "+deck[i].manaCost);
        

        deckObject.cards[i] = [deck[i].id, deck[i].count];
        
    }

    let readyDeckcode = deckstring.convertIntoDeckstring(deckObject);
    return readyDeckcode;
}
module.exports.cleanOcrResults = cleanOcrResults;

// fix cards that differ from the majority in manaflow or classtype
// TODO: take a look at the manacheck, doesn't work with 2 mistakes in a row
// 4 function parameters are apparently a lot, maybe reconsider the whole function's structure?
function adjustDeck(deck, adjustType, cardIndex, listOfAllCards){
    // empty the potential cards pool
    let filteredListOfCards = {
        cardNames: [],
        cardId: [],
        cardMana: [],
        cardClass: []
    }
    var proceed = false;

    // find new set of potential cards now filtered with both the manacost and the deck's class
    if(adjustType == "Class"){
        for(let j = 0; j < listOfAllCards.length; j++){
            if(listOfAllCards[j].cost == deck[cardIndex].manaCost && (listOfAllCards[j].cardClass == deckClass || listOfAllCards[j].cardClass == "NEUTRAL")){
                filteredListOfCards.cardNames = [...filteredListOfCards.cardNames, listOfAllCards[j].name.toLowerCase()];
                filteredListOfCards.cardId = [...filteredListOfCards.cardId, listOfAllCards[j].dbfId];
                filteredListOfCards.cardMana = [...filteredListOfCards.cardMana, listOfAllCards[j].cost];
                filteredListOfCards.cardClass = [...filteredListOfCards.cardClass, listOfAllCards[j].cardClass];
            }
        }
        proceed = true;
    } else if (adjustType == "Mana"){
        for(let j = 0; j < listOfAllCards.length; j++){
            // first card
            if (cardIndex == 0){
                if (deck[cardIndex].manaCost > deck[1].manaCost){
                    if(listOfAllCards[j].cost <= deck[cardIndex+1].manaCost && (listOfAllCards[j].cardClass == deckClass || listOfAllCards[j].cardClass == "NEUTRAL")){
                        filteredListOfCards.cardNames = [...filteredListOfCards.cardNames, listOfAllCards[j].name.toLowerCase()];
                        filteredListOfCards.cardId = [...filteredListOfCards.cardId, listOfAllCards[j].dbfId];
                        filteredListOfCards.cardMana = [...filteredListOfCards.cardMana, listOfAllCards[j].cost];
                        filteredListOfCards.cardClass = [...filteredListOfCards.cardClass, listOfAllCards[j].cardClass];
                        proceed = true;
                    }
                }
            // last card
            } else if (cardIndex == deck.length - 1){
                if (deck[cardIndex].manaCost < deck[cardIndex-1].manaCost){
                    if(listOfAllCards[j].cost >= deck[cardIndex-1].manaCost && (listOfAllCards[j].cardClass == deckClass || listOfAllCards[j].cardClass == "NEUTRAL")){
                        filteredListOfCards.cardNames = [...filteredListOfCards.cardNames, listOfAllCards[j].name.toLowerCase()];
                        filteredListOfCards.cardId = [...filteredListOfCards.cardId, listOfAllCards[j].dbfId];
                        filteredListOfCards.cardMana = [...filteredListOfCards.cardMana, listOfAllCards[j].cost];
                        filteredListOfCards.cardClass = [...filteredListOfCards.cardClass, listOfAllCards[j].cardClass];
                        proceed = true;
                    }
                }
            // middle cards
            } else {
                if (deck[cardIndex].manaCost < deck[cardIndex-1].manaCost || deck[cardIndex].manaCost > deck[cardIndex+1].manaCost){
                    if(listOfAllCards[j].cost >= deck[cardIndex-1].manaCost && listOfAllCards[j].cost <= deck[cardIndex+1].manaCost && (listOfAllCards[j].cardClass == deckClass || listOfAllCards[j].cardClass == "NEUTRAL")){
                        filteredListOfCards.cardNames = [...filteredListOfCards.cardNames, listOfAllCards[j].name.toLowerCase()];
                        filteredListOfCards.cardId = [...filteredListOfCards.cardId, listOfAllCards[j].dbfId];
                        filteredListOfCards.cardMana = [...filteredListOfCards.cardMana, listOfAllCards[j].cost];
                        filteredListOfCards.cardClass = [...filteredListOfCards.cardClass, listOfAllCards[j].cardClass];
                        proceed = true;
                    }
                }
            }
            
        }
    }

    if (proceed){
        // find the best match from the new set of potential options
        let cleanedCard = stringSimilarity.findBestMatch(deck[cardIndex].originalReading.toLowerCase(), filteredListOfCards.cardNames);
    
        // set the new best match's values to object
        // no need to edit count or original reading, since they stay the same
        deck[cardIndex].cardName = filteredListOfCards.cardNames[cleanedCard.bestMatchIndex];
        deck[cardIndex].cardClass = filteredListOfCards.cardClass[cleanedCard.bestMatchIndex];
        deck[cardIndex].id = filteredListOfCards.cardId[cleanedCard.bestMatchIndex];
        deck[cardIndex].mana = filteredListOfCards.cardId[cleanedCard.bestMatchIndex];
    }
    return deck;
    
}

// retrieves the dbfId's for the default heroes of the classes
function getHeroId(classname){
    switch(classname){
        case "DRUID": 
            return 274;
        case "HUNTER": 
            return 31;
        case "MAGE": 
            return 637;
        case "PALADIN": 
            return 671;
        case "PRIEST": 
            return 813;
        case "ROGUE": 
            return 930;
        case "SHAMAN": 
            return 1066;
        case "WARLOCK": 
            return 893;
        case "WARRIOR": 
            return 7;
        default:
            // For now we'll just assume hunter
            // Should build some sort of safety net here in the future
            return 31;
    }
}

