const Tesseract = require('tesseract.js')

function runTesseractRecognition(fileUrl){
    return new Promise(resolve => {
        Tesseract.recognize(fileUrl)
        .then(function(result){
            resolve(result);
        })
    });
}
module.exports.runOcrRecognition = runTesseractRecognition;

