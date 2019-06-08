const Tesseract = require('tesseract.js')
const stringSimilarity = require('string-similarity');
const deckstring = require("./deckstring");
const request = require("request");
import { encode, decode, FormatType } from "deckstrings";

// I probably should just make a class for these
let ocrGlobals = {
    fileUrl: '',
    cardData: [],
    tesseractResult: ''
}

function ocrInsertPoint(fileUrl){
    ocrGlobals.fileUrl = fileUrl;
    getCollectibleCardsJSON();
}

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


function cleanOcrResults(cardData, tesseractResult){

    //let cardData = ocrGlobals.cardData;
    let deck = [];  
    var cardsObject = {
        cardNames: [],
        cardId: [],
        cardMana: [],
        cardClass: []
    }
    


    // Split the output into potential cards, seperated by newlines
    var fullText = tesseractResult['text'];
    var output = fullText.split('\n');
    var deckClass;

    for (var i = 0; i < output.length; i++){

        // Clean the output for better comparing results
        var card = output[i].replace(/[^a-zA-Z0-9* ]/g, '');

        // Skip all the mistake rows
        var trueLength = card.replace(/ /g, '').length;

        // if the length of the row is too short, chances are it's a misreading and not an actual row
        // 5 is just a guess, might require re-evaluation
        if(trueLength > 5){ 

            // empty the potential cards pool for each round
            cardsObject = {
                cardNames: [],
                cardId: [],
                cardMana: [],
                cardClass: []
            }

            

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

            
            // select only the cards that have the correct mana as potential candidates
            // this heavily relies on mana reading to be correct, but it seems rather reliable
            // faulty reads usually make manaCost NaN, so just pass everything then
            for(let i = 0; i < cardData.length; i++){
                
                // this is causing empty cardsObjects, which break the stringSimiliarity, so commented until fixed
                //if(cardData[i].cost == manaCost || manaCost == NaN){
                    cardsObject.cardNames = [...cardsObject.cardNames, cardData[i].name.toLowerCase()];
                    cardsObject.cardId = [...cardsObject.cardId, cardData[i].dbfId];
                    cardsObject.cardMana = [...cardsObject.cardMana, cardData[i].cost];
                    cardsObject.cardClass = [...cardsObject.cardClass, cardData[i].cardClass];
                //}
            }

            // find the best match from the hearthstone JSON collection
            
            if(card){
                let cleanedCard = stringSimilarity.findBestMatch(card.toLowerCase(), cardsObject.cardNames);
            

                if(cardsObject.cardClass[cleanedCard.bestMatchIndex] !== "NEUTRAL")
                    deckClass = cardsObject.cardClass[cleanedCard.bestMatchIndex];

                //console.log("Original: " + card + " Best match: " + cardsObject.cardNames[cleanedCard.bestMatchIndex] + " ID: " + cardsObject.cardId[cleanedCard.bestMatchIndex] + " Index: " + cleanedCard.bestMatchIndex + " Class: " + cardsObject.cardClass[cleanedCard.bestMatchIndex] + " Mana: " + manaCost + " Count: " + cardCount );

                // Add the card to the deck
                deck = [...deck, {
                    cardName: cardsObject.cardNames[cleanedCard.bestMatchIndex],
                    originalReading: card,
                    cardClass: cardsObject.cardClass[cleanedCard.bestMatchIndex],
                    id: cardsObject.cardId[cleanedCard.bestMatchIndex],
                    count: cardCount,
                    manaCost: manaCost
                }]
            }
        }
    } // end of for-loop: tesseract output





    // Here starts the round 2 of fixing the results


    var counts = {};
    var compare = 0;

    // find the class with highest frequency, which is the most likely class for the deck
    // 'neutral' is not applicable as a class
    for (i = 0; i < deck.length; i++){
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

    function adjustDeck(adjustType, cardIndex = 0){
        // empty the potential cards pool for each round
        cardsObject = {
            cardNames: [],
            cardId: [],
            cardMana: [],
            cardClass: []
        }
        var proceed = false;

        // find new set of potential cards now filtered with both the manacost and the deck's class
        if(adjustType == "Class"){
            for(let j = 0; j < cardData.length; j++){
                if(cardData[j].cost == deck[i].manaCost && (cardData[j].cardClass == deckClass || cardData[j].cardClass == "NEUTRAL")){
                    cardsObject.cardNames = [...cardsObject.cardNames, cardData[j].name.toLowerCase()];
                    cardsObject.cardId = [...cardsObject.cardId, cardData[j].dbfId];
                    cardsObject.cardMana = [...cardsObject.cardMana, cardData[j].cost];
                    cardsObject.cardClass = [...cardsObject.cardClass, cardData[j].cardClass];
                }
            }
            proceed = true;
        } else if (adjustType == "Mana"){
            for(let j = 0; j < cardData.length; j++){
                // first card
                if (i == 0){
                    if (deck[i].manaCost > deck[1].manaCost){
                        if(cardData[j].cost <= deck[i+1].manaCost && (cardData[j].cardClass == deckClass || cardData[j].cardClass == "NEUTRAL")){
                            cardsObject.cardNames = [...cardsObject.cardNames, cardData[j].name.toLowerCase()];
                            cardsObject.cardId = [...cardsObject.cardId, cardData[j].dbfId];
                            cardsObject.cardMana = [...cardsObject.cardMana, cardData[j].cost];
                            cardsObject.cardClass = [...cardsObject.cardClass, cardData[j].cardClass];
                            proceed = true;
                        }
                    }
                // last card
                } else if (i == deck.length - 1){
                    if (deck[i].manaCost < deck[i-1].manaCost){
                        if(cardData[j].cost >= deck[i-1].manaCost && (cardData[j].cardClass == deckClass || cardData[j].cardClass == "NEUTRAL")){
                            cardsObject.cardNames = [...cardsObject.cardNames, cardData[j].name.toLowerCase()];
                            cardsObject.cardId = [...cardsObject.cardId, cardData[j].dbfId];
                            cardsObject.cardMana = [...cardsObject.cardMana, cardData[j].cost];
                            cardsObject.cardClass = [...cardsObject.cardClass, cardData[j].cardClass];
                            proceed = true;
                        }
                    }
                // middle cards
                } else {
                    if (deck[i].manaCost < deck[i-1].manaCost || deck[i].manaCost > deck[i+1].manaCost){
                        if(cardData[j].cost >= deck[i-1].manaCost && cardData[j].cost <= deck[i+1].manaCost && (cardData[j].cardClass == deckClass || cardData[j].cardClass == "NEUTRAL")){
                            cardsObject.cardNames = [...cardsObject.cardNames, cardData[j].name.toLowerCase()];
                            cardsObject.cardId = [...cardsObject.cardId, cardData[j].dbfId];
                            cardsObject.cardMana = [...cardsObject.cardMana, cardData[j].cost];
                            cardsObject.cardClass = [...cardsObject.cardClass, cardData[j].cardClass];
                            proceed = true;
                        }
                    }
                }
                
            }
        }

        if (proceed){
            // find the best match from the new set of potential options
            let cleanedCard = stringSimilarity.findBestMatch(deck[i].originalReading.toLowerCase(), cardsObject.cardNames);
        
            // set the new best match's values to object
            // no need to edit count or original reading, since they stay the same
            deck[i].cardName = cardsObject.cardNames[cleanedCard.bestMatchIndex];
            deck[i].cardClass = cardsObject.cardClass[cleanedCard.bestMatchIndex];
            deck[i].id = cardsObject.cardId[cleanedCard.bestMatchIndex];
            deck[i].mana = cardsObject.cardId[cleanedCard.bestMatchIndex];
        }
        
    }

    // fix all the minority classes to represent the deck's class
    for (i = 0; i < deck.length; i++){
        if(deck[i].cardClass !== deckClass && deck[i].cardClass !== "NEUTRAL"){
            adjustDeck("Class");
        }
    }

    // this is a very flawed first edition of mana check
    // it assumes there are never two mistakes in a row
    for (i = 0; i < deck.length; i++){
        adjustDeck("Mana");
    }

    //let heroID = getHeroId(deckClass);
    let deckObject = {
        cards: [],
        heroes: [getHeroId(deckClass)],
        format: FormatType.FT_WILD
    };

    // Create a deckstring from the deck
    for (i = 0; i < deck.length; i++){
        
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



module.exports.ocrProcessing = ocrInsertPoint;