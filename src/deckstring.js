
import { encode, decode, FormatType } from "deckstrings";

function convertIntoDeckstring(deckObject){
    let deckstring = encode(deckObject);
    console.log(deckstring);
}

module.exports.convertIntoDeckstring = convertIntoDeckstring;