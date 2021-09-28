const axios = require('axios');
const helpers = require('../helpers/functions.js');

module.exports = {
  parsePlayerResponse: (html) => {
    let textObj = html.split('ytInitialPlayerResponse = ').pop().split(';</script><div id="player"')[0];
    let obj = JSON.parse(textObj);

    if (typeof obj === 'object' && obj !== null) { return obj } 
  },
  checkVideo: async (event) => {
    // let authKey = false;
    // if (event.headers.hasOwnProperty('token')) {authKey = event.headers.token; } 
    // if (!helpers.authorizer(authKey)) { return 'auth' } 

    const vidId = event.pathParameters.id;
    let obj = {}

    try {
      const response = await axios.get(`https://www.youtube.com/watch?v=${vidId}`)
      let formattedResponse = module.exports.parsePlayerResponse(response.data);
      
      if (formattedResponse.playabilityStatus.status === 'ERROR') {
        obj = {
          playabilityStatus: formattedResponse.playabilityStatus
        }
      } else if (formattedResponse.playabilityStatus.status === 'LOGIN_REQUIRED') {
        let videoDetails = formattedResponse.videoDetails;

        obj = {
          playabilityStatus: 'login_required',
          video_id: videoDetails.videoId,
          title: videoDetails.title,
          description: videoDetails.shortDescription,
          channel_id: videoDetails.channelId,
          author_name: videoDetails.author,
          thumbnails: videoDetails.thumbnail.thumbnails,
          length: parseInt(videoDetails.lengthSeconds),
          publish_date: formattedResponse.microformat.playerMicroformatRenderer.publishDate,
          category: formattedResponse.microformat.playerMicroformatRenderer.category,
          avg_rating: videoDetails.hasOwnProperty('averageRating') ? formattedResponse.videoDetails.averageRating : null,
          view_count: parseInt(videoDetails.viewCount)
        }
      } else if (formattedResponse.playabilityStatus.status === 'OK') {
        let videoDetails = formattedResponse.videoDetails;

        obj = {
          video_id: videoDetails.videoId,
          title: videoDetails.title,
          description: videoDetails.shortDescription,
          channel_id: videoDetails.channelId,
          author_name: videoDetails.author,
          keywords: videoDetails.hasOwnProperty('keywords') ? videoDetails.keywords : [''],
          length: parseInt(videoDetails.lengthSeconds),
          avg_rating: videoDetails.hasOwnProperty('averageRating') ? formattedResponse.videoDetails.averageRating : null,
          view_count: parseInt(videoDetails.viewCount),
          is_private: videoDetails.isPrivate,
          is_livestream: videoDetails.isLiveContent,
          media_files: {
            video: formattedResponse.streamingData.formats[0].url, // find vid
            audio: "" // find audio streamingData.adaptiveFormats
          },
          subtitles: formattedResponse.hasOwnProperty('captions') ? formattedResponse.captions.playerCaptionsTracklistRenderer.captionTracks : false,
          thumbnails: videoDetails.thumbnail.thumbnails,
          storyboards: formattedResponse.hasOwnProperty('storyboards') ? formattedResponse.storyboards.playerStoryboardSpecRenderer.spec : false,
          cards: formattedResponse.hasOwnProperty('cards') ? formattedResponse.cards : false,
          family_safe: formattedResponse.microformat.playerMicroformatRenderer.isFamilySafe,
          unlisted: formattedResponse.microformat.playerMicroformatRenderer.isUnlisted,
          publish_date: formattedResponse.microformat.playerMicroformatRenderer.publishDate,
          category: formattedResponse.microformat.playerMicroformatRenderer.category
        }
      }

      return helpers.returnResponse(200, {response: obj});
    } catch (error) {
      return helpers.returnResponse(500, {response: error});
    }

  }
}

// module.exports.checkVideo({
//   pathParameters: {
//     // id: '18PFui4Fi8E',
//     id: 'KVvQ3IC5uKM'
//     // id: '64Xr3QhCDeQ'

//   },
//   headers: {
//     token: 'debug'
//   }
// })
// .then((res)=> {
//   console.log(res);
// })