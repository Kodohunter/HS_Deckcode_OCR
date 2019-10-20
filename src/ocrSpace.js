const ocrSpaceApi = require('ocr-space-api');
const config = require('./config');
 
let options =  { 
  apikey: config.ocrSpaceApiKey,
  language: 'eng',
  imageFormat: 'image/png', // Image Type (Only png ou gif is acceptable at the moment i wrote this)
  isOverlayRequired: true,
  isTable: true,
  scale: true
};

function runOcrSpaceRecognition(fileUrl){
  return new Promise(resolve => {
    ocrSpaceApi.parseImageFromLocalFile(fileUrl, options)
    .then(function (parsedResult) {
      let formattedResult = formatOcrResultsIntoArray(parsedResult.ocrParsedResult.ParsedResults[0].ParsedText);
      resolve(formattedResult);
    }).catch(function (err) {
      console.log('ERROR:', err);
    });
  });
} 
module.exports.runOcrRecognition = runOcrSpaceRecognition;

function formatOcrResultsIntoArray(parsedResult){
  parsedResult = parsedResult.replace('\r', '');
  parsedResult = parsedResult.split('\n');
  let formattedOcrResults = [];

  for(let i = 0; i < parsedResult.length; i++){
    formattedOcrResults[i] = parsedResult[i].split('\t')
  }
  return formattedOcrResults;
}