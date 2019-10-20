// Central hubfile for building the deck

const stringSimilarity = require('string-similarity');
const cardListManagement = require("./cardListManagement");
import { encode, decode, FormatType } from "deckstrings";

// main function for the deckbuilding process
// I don't like the name
function deckBuilder(listOfAllCards, ocrResult){

    let deckObject = cleanOcrResults(listOfAllCards, ocrResult);
    return deckObject;
}
module.exports.deckBuilder = deckBuilder;

// What does this function do? pilko pienemmäks. Main file atm.
function cleanOcrResults(listOfAllCards, ocrResult){

    // returns deck.cards & deck.class
    let deck = createDeck(ocrResult, listOfAllCards);

    // initialize deck
    let deckstringCompatibleDeckobject = {
        cards: [],
        heroes: [getHeroId(deck.class)],
        format: FormatType.FT_WILD
    };

    // add the cards to the deck
    for (let i = 0; i < deck.cards.length; i++){
        /*
        console.log("Original: "+deck.cards[i].originalReading
            +"\t\t Card: "+deck.cards[i].cardName
            +"\t\t Amount: "+deck.cards[i].count
            +"\t\t Class: "+deck.cards[i].cardClass
            +"\t\t Mana: "+deck.cards[i].manaCost);
        */

        deckstringCompatibleDeckobject.cards[i] = [deck.cards[i].id, deck.cards[i].count];
    }

    return deckstringCompatibleDeckobject;
}

function createDeck(ocrResults, listOfAllCards){

    // TODO: fix this function to fit the new ocrResult format
    // In the future, make all ocr processing functions to output in a format this supports

    /*
        ocrResults format:
        [
            [mana, cardName, count],
            [mana, cardName, count],
            etc.
        ]
    */

    let deck = [];
    //console.log(ocrResults[0]);
    for (let i = 0; i < ocrResults.length; i++){

        console.log(ocrResults[i]);
        if(ocrResults[i].length >= 3){

        
            let manaCost = ocrResults[i][0];
            let cardName = ocrResults[i][1].replace(/[^a-zA-Z0-9 ]/g, '');
            cardName = cardName.trim();
            let cardCount = ocrResults[i][2];


            // check cardcount
            switch (true){
                case cardCount.includes("*"): // legendary
                    cardCount = 1;
                    break;
                case cardCount.includes("2") || cardCount.toLowerCase().includes("z"):
                    cardCount = 2;
                    break;
                default:
                    cardName = cardName + cardCount;
                    cardCount = 1;
                    break;
            }


            // common mistakes fixes
            // TODO 15.10.2019: reconsider the need after changing ocr processor to a better one
            manaCost = manaCost.replace(/oO/g, "0");
            manaCost = manaCost.replace(/zZ/g, "2");
            manaCost = parseInt(manaCost);
            cardName = cardName.replace(/1/g, "l");

            // TODO: create error handling for missing cardName or cardCount

            // this assumes that manacost is read correctly. Lately the name has been more correct than the mana though
            let filteredListOfCards = cardListManagement.filterCardsList(listOfAllCards, manaCost);

            // find the best match from the hearthstone JSON collection
            if(cardName){
                //console.log(typeof(cardName));
                //console.log(typeof(filteredListOfCards));
                let cleanedCard = stringSimilarity.findBestMatch(cardName.toLowerCase(), filteredListOfCards.cardNames);
            
                // Add the cardName to the deck
                deck = [...deck, {
                    cardName: filteredListOfCards.cardNames[cleanedCard.bestMatchIndex],
                    originalReading: cardName,
                    cardClass: filteredListOfCards.cardClass[cleanedCard.bestMatchIndex],
                    id: filteredListOfCards.cardId[cleanedCard.bestMatchIndex],
                    count: cardCount,
                    manaCost: manaCost
                }]
            }
        }
    }

    let deckClass = getDeckClass(deck);
    
    let returnDeck = {
        cards: deck,
        class: deckClass
    }

    return returnDeck;
}

// find the class with highest frequency, which is the most likely class for the deck
// 'neutral' is not applicable as a class
function getDeckClass(deck){
    let counts = {};
    let highestCount = 0;
    let deckClass;
    
    for (let i = 0; i < deck.length; i++){
        let cardClass = deck[i].cardClass;
        
        if(cardClass != "NEUTRAL"){

            if(counts[cardClass] === undefined){
                counts[cardClass] = 1;
            } else {
                counts[cardClass] = counts[cardClass] + 1;
            }

            // Does the highest count change?
            if(counts[cardClass] > highestCount){
                    highestCount = counts[cardClass];
                    deckClass = cardClass;
            }
        }
    }

    return deckClass;
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
    let proceed = false;

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