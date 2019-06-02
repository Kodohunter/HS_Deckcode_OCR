
import { encode, decode, FormatType } from "deckstrings";

function convertIntoDeckstring(deckObject){
    return encode(deckObject);
}

module.exports.convertIntoDeckstring = convertIntoDeckstring;