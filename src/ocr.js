const Tesseract = require('tesseract.js')
const https = require('https');
const stringSimilarity = require('string-similarity');
//const encode = require('deckstrings');

// I probably should just make a class for these
var ocrGlobals = {
    fileUrl: '',
    cardData: [],
    tesseractResult: ''
}

function ocrInsertPoint(fileUrl){
    ocrGlobals.fileUrl = fileUrl;
    getCollectibleCardsJSON();
}

// Get a JSON object of all hearthstone cards in existense
// TODO: find out how to always get the latest version instead of a hardcoded version number
function getCollectibleCardsJSON(){
    https.get('https://api.hearthstonejson.com/v1/31022/enUS/cards.collectible.json', (resp) => {

        let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            cardData = JSON.parse(data);
            ocrGlobals.cardData = cardData;
            runTesseractRecognition();
        });

    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

function runTesseractRecognition(){
    Tesseract.recognize(ocrGlobals.fileUrl)
    .then(function(result){
        ocrGlobals.tesseractResult = result;
        finalize();
    })
}


function finalize(){

    let cardData = ocrGlobals.cardData;
    let deck = [];  
    var cardsObject = {
        cardNames: [],
        cardId: [],
        cardMana: [],
        cardClass: []
    }
    


    // Split the output into potential cards, seperated by newlines
    var fullText = ocrGlobals.tesseractResult['text'];
    var output = fullText.split('\n');
    var deckClass;

    for (var i = 0; i < output.length; i++){

        // Clean the output for better comparing results
        var card = output[i].replace(/[^a-zA-Z0-9* ]/g, '');

        // Skip all the mistake rows
        var trueLength = card.replace(/ /g, '').length;
        if(trueLength > 5){ // 5 is just a guess, might require re-evaluation

            // empty the potential cards pool for each round
            cardsObject = {
                cardNames: [],
                cardId: [],
                cardMana: [],
                cardClass: []
            }

            manacostPosEnd = card.indexOf(" ");
            cardNamePosEnd = card.lastIndexOf(" ");

            //console.log("'"+card+"'");
            //console.log("ManaPosEnd: " + manacostPosEnd + " cardNamePosEnd: "+cardNamePosEnd);

            manaCost = card.slice(0, manacostPosEnd);
            cardCount = card.slice(cardNamePosEnd + 1);
            card = card.slice(manacostPosEnd + 1, cardNamePosEnd);

            switch (true){
                case cardCount.includes("*"): // legendary
                    cardCount = 1;
                    break;
                case cardCount.includes("2") || cardCount.includes("z"):
                    cardCount = 2;
                    break;
                default:
                    card = card + cardCount;
                    cardCount = 1;
                    break;
            }


            // common mistakes fixes
            manaCost = manaCost.replace(/o/g, "0");
            manaCost = manaCost.replace(/z/g, "2");
            manaCost = parseInt(manaCost);
            card = card.replace(/1/g, "l");
            
            // select only the cards that have the correct mana as potential candidates
            // this heavily relies on mana reading to be correct, but it seems rather reliable
            for(let i = 0; i < cardData.length; i++){
                if(cardData[i].cost == manaCost){
                    cardsObject.cardNames = [...cardsObject.cardNames, cardData[i].name.toLowerCase()];
                    cardsObject.cardId = [...cardsObject.cardId, cardData[i].id];
                    cardsObject.cardMana = [...cardsObject.cardMana, cardData[i].cost];
                    cardsObject.cardClass = [...cardsObject.cardClass, cardData[i].cardClass];
                }
            }

            // find the best match from the hearthstone JSON collection
            cleanedCard = stringSimilarity.findBestMatch(card.toLowerCase(), cardsObject.cardNames);
            
            

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
    } // end of for-loop: tesseract output





    // Here starts the round 2 of fixing the results


    var counts = {};
    var compare = 0;

    // find the class with highest frequency, which is the most likely class for the deck
    // naturally 'neutral' is not applicable as a class
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
                    cardsObject.cardId = [...cardsObject.cardId, cardData[j].id];
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
                            cardsObject.cardId = [...cardsObject.cardId, cardData[j].id];
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
                            cardsObject.cardId = [...cardsObject.cardId, cardData[j].id];
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
                            cardsObject.cardId = [...cardsObject.cardId, cardData[j].id];
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
            cleanedCard = stringSimilarity.findBestMatch(deck[i].originalReading.toLowerCase(), cardsObject.cardNames);
        
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
    
    // Create a deckstring from the deck
    for (i = 0; i < deck.length; i++){
        console.log("Original: "+deck[i].originalReading
            +" Card: "+deck[i].cardName
            +" Amount: "+deck[i].count
            +" Class: "+deck[i].cardClass
            +" Mana: "+deck[i].manaCost);

    }

}

module.exports.ocrProcessing = ocrInsertPoint;