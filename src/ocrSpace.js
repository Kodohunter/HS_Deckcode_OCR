const ocrSpaceApi = require('ocr-space-api');
const config = require('./config');
 
let options =  { 
  apikey: config.ocrSpaceApiKey,
  language: 'eng',
  imageFormat: 'image/png', // Image Type (Only png ou gif is acceptable at the moment i wrote this)
  isOverlayRequired: true,
  isTable: true
};

function runOcrSpaceRecognition(fileUrl){
  return new Promise(resolve => {
    ocrSpaceApi.parseImageFromLocalFile(fileUrl, options)
    .then(function (parsedResult) {
      console.log('parsedText: \n', parsedResult.parsedText);
      console.log('ocrParsedResult: \n', parsedResult.ocrParsedResult);
      resolve(parsedResult);
    }).catch(function (err) {
      console.log('ERROR:', err);
    });
  });
} 
module.exports.runOcrRecognition = runOcrSpaceRecognition;
