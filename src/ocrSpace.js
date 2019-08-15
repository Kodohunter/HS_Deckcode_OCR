const ocrSpaceApi = require('ocr-space-api');
let config = require('config');
 
var options =  { 
    apikey: config.ocrSpaceApiKey,
    language: 'por', // Português
    imageFormat: 'image/png', // Image Type (Only png ou gif is acceptable at the moment i wrote this)
    isOverlayRequired: true
  };
 
// Image file to upload
const imageFilePath = "imageFile.jpg";
 
// Run and wait the result
ocrSpaceApi.parseImageFromLocalFile(imageFilePath, options)
  .then(function (parsedResult) {
    console.log('parsedText: \n', parsedResult.parsedText);
    console.log('ocrParsedResult: \n', parsedResult.ocrParsedResult);
  }).catch(function (err) {
    console.log('ERROR:', err);
  });