"use strict";
var fs = require('fs');
var https = require('https');
var imageDiff = require('image-diff')

var set = 'icc';
var langOne = 'zh_CN';
var langTwo = 'en_US'

var cardSet = JSON.parse( fs.readFileSync('data/'+set+'.json', "utf8") );

var download = function(url,nextUrl,name) {
  return new Promise(function(resolve,reject) {
    var fn = /^https.*\/([a-f0-9]{64}.*)/.exec(url);
    if ( !fn ) {
      reject(Error("Invalid url.",url));
    }
    var path = 'download/'+set+'/'+fn[1];
    var file = fs.createWriteStream(path);
    var request = https.get(fn[0], function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(function(){
          resolve({
            path: path,
            nextUrl: nextUrl,
            fn: fn[1],
            name: name
          });
        });
      });
    }).on('error', function(err) {
      fs.unlink(path);
      reject(Error("Error downloading file."));
    });
  });
};

for (var i=0;i<cardSet.allCards.length;i++ ) {
  var card = cardSet.allCards[i];
  if ( card.localizedImage[langOne] === card.localizedImage[langTwo] ) {
    break;
  }
  download(card.localizedImage[langOne], card.localizedImage[langTwo], card.cardNameSlug || card.id).then(function(res) {
    download(res.nextUrl,'',res.name).then(function(resTwo) {
      var diffPath = 'result/'+set+'/'+res.name+'.png';
      imageDiff({
        actualImage: res.path,
        expectedImage: resTwo.path,
        diffImage: diffPath
      }, function (err, imagesAreSame) {
        if (err) {
          console.log(err);
        }
        if ( !imagesAreSame ) {
          console.log( diffPath, res.path, resTwo.path );
        }
      });
    }, function(error) {
      console.error(error);
    });
  }, function(error) {
    console.error(error);
  });
}