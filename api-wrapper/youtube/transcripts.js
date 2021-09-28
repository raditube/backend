const helpers = require('../helpers/functions.js');
const axios = require('axios');
const _ = require('lodash');
const he = require('he');
const striptags = require('striptags');

module.exports = {
  getSubtitles: async (event) => {
    let authKey = false;
    let captionTracks = JSON.parse(event.body).res;
    let lang = JSON.parse(event.body).lang;

    if (event.headers.hasOwnProperty('token')) {authKey = event.headers.token; } 

    if (helpers.authorizer(authKey)) { 
      try {
        const subtitle =
        _.find(captionTracks, {
          vssId: `.${lang}`,
        }) ||
        _.find(captionTracks, {
          vssId: `a.${lang}`,
        }) ||
        _.find(captionTracks, ({ vssId }) => vssId && vssId.match(`.${lang}`));

        const { data: transcript} = await axios.get(subtitle.baseUrl);

        let lines = [];

        transcript.replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
        .replace('</transcript>', '')
        .split('</text>')
        .filter(line => line && line.trim())
        .map(line => {
          const startRegex = /start="([\d.]+)"/;
          const durRegex = /dur="([\d.]+)"/;
    
          const [, start] = startRegex.exec(line);
          let [, dur] = "1" 

          if (line.includes('dur')) { 
            [, dur] = durRegex.exec(line) 
          } 

          const htmlText = line
            .replace(/<text.+>/, '')
            .replace(/&amp;/gi, '&')
            .replace(/<\/?[^>]+(>|$)/g, '');
    
          const decodedText = he.decode(htmlText);
          const text = striptags(decodedText);

          lines.push({start, dur, text});
        });

        return lines;
      } catch (error) {
        console.log(error);
        return error
      }
    }

  },
  parseResponse: (html) => { // Refactor
    let textObj = html.split('ytInitialPlayerResponse = ').pop().split(';</script><div id="player"')[0];
    let obj = JSON.parse(textObj);

    if (typeof obj === 'object' && obj !== null) { return obj } 
  },
  getSubtitlesDirectly: async (event) => {
    let authKey = false;
    if (event.headers.hasOwnProperty('token')) {authKey = event.headers.token; } 
    const vidId = event.pathParameters.id;

    const response = await axios.get(`https://www.youtube.com/watch?v=${vidId}`)
    let formattedResponse = module.exports.parseResponse(response.data);

    if (helpers.authorizer(authKey)) { 
      let res = {};

      try {
        if (formattedResponse.playabilityStatus.status === 'ERROR') {
          return helpers.returnResponse(500, {response: 'Video has been removed'})
          // return error
        } else if (formattedResponse.playabilityStatus.status === 'OK') {
          if (formattedResponse.hasOwnProperty('captions')) {
            console.log('has captions')
            await module.exports.getSubtitles({
              body: JSON.stringify({
                res: formattedResponse.captions.playerCaptionsTracklistRenderer.captionTracks,
                lang: event.pathParameters.lang
              }),
              headers: {
                token: 'debug'
              }
            }).then((lines) => {
              res = lines
            })
            
          } else if (formattedResponse.videoDetails.isLiveContent) {
            res = "live content"
          }
          
        }
        // return helpers.returnResponse(200, { lines: lines })
        
        return helpers.returnResponse(200, {response: res})
      } catch (error) {
        return helpers.returnResponse(500, {response: error});
      }

    }

  }
}

// module.exports.getSubtitlesDirectly({
//   pathParameters: {
//     id: 'zv8ZPFOxJEc',
//     lang: 'en'
//     // id: '64Xr3QhCDeQ'

//   },
//   headers: {
//     token: 'debug'
//   }
// })
// .then((res)=> {
//   console.log(res);
// })