const axios = require ('axios');
const _ = require('lodash');

const helpers = require('../helpers/functions.js');
const { contextObjSpoofer } = require('../helpers/contextObj.js');

module.exports = {
  parseSubscriptions: (item) => {
    return {
      channel_id: item.channelId,
      thumb: item.thumbnail.thumbnails[2].url,
      subscribers: item.hasOwnProperty("subscriberCountText") ? helpers.fullNumber(item.subscriberCountText.simpleText.split(" ")[0]) : 0,
      title: item.hasOwnProperty("title") ? item.title.simpleText : ""
    }
  },
  nextPage: async (key, apiKey, obj, contextObj) => {
    try {
      const response = await axios.post(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
        context: contextObj,
        continuation: key
      }) 

      let items = response.data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;
      let nextPageToken;

      items.forEach((channel) => {
        if (channel.hasOwnProperty("gridChannelRenderer")) {
          let item = channel.gridChannelRenderer;
          obj.subscriptions.channels.push(module.exports.parseSubscriptions(item))
        } else if (channel.hasOwnProperty("continuationItemRenderer")) { // NEXT PAGE?
          nextPageToken = channel.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        } 
      })
        
      if (nextPageToken) {
        await module.exports.nextPage(nextPageToken, apiKey, obj, contextObj);
      }

    } catch(error) {
      console.log(error);
    }
  },
  initialChannelRequest: async (event) => {
    let authKey = false;
    if (event.headers.hasOwnProperty('token')) {authKey = event.headers.token; } 
    const channelId = event.pathParameters.id;

    if (helpers.authorizer(authKey)) { 
    try {
      const response = await axios.get(`https://www.youtube.com/channel/${channelId}/channels`)
      const formattedResponse = helpers.parseResponse(response.data);

      let obj = {
        channelId: channelId,
        browseId: formattedResponse.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.endpoint.browseEndpoint.browseId,
        params: formattedResponse.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.endpoint.browseEndpoint.params,
        innerApiKey: helpers.parseInnerkey(response.data),
        subscriptions: {}
      }

      const tabs = formattedResponse.contents.twoColumnBrowseResultsRenderer.tabs;
      let channels = _.filter(tabs, ['tabRenderer.title', 'Channels']);
      
      if (channels !== []) {
        let responseKeys = channels[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0];

        if (responseKeys.hasOwnProperty("messageRenderer")) {
          obj.subscriptions = false;
        } else if (responseKeys.hasOwnProperty("gridRenderer")) {

          obj.subscriptions = {
            channels: [],
            nextToken: false
          }
    
          responseKeys.gridRenderer.items.forEach((channel) => {
            if (channel.hasOwnProperty("gridChannelRenderer")) {
              let item = channel.gridChannelRenderer;
              obj.subscriptions.channels.push(module.exports.parseSubscriptions(item))
            } else {
              obj.subscriptions.nextToken = channel.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
            }
          })
        }
      }

      if (obj.subscriptions.nextToken !== false) {
        const contextObj = contextObjSpoofer('CAAQhGciEwjTrOLU1prvAhXX8sEKHaubC_0=')
        await module.exports.nextPage(obj.subscriptions.nextToken, obj.innerApiKey, obj, contextObj)
        return helpers.returnResponse(200, {channel_id: obj.channelId, response: obj})
      } else {
        return helpers.returnResponse(200, {channel_id: channelId, response: obj})
      }
    } catch(error) {
      return helpers.returnResponse(500, {channel_id: channelId, response: error})
    }
  }

  }
}

// module.exports.initialChannelRequest({
//   pathParameters: {
//     id: 'UCnUetlp8edhcQ0ZsxrIJ1PQ'
//   },
//   headers: {
//     token: 'debug'
//   }
// }).then((res)=> {
//   console.log(res)
// })

// module.exports.initialChannelRequest('UCdRRV1CFtDzA9qZdKPA-7zA'); // oopen
// module.exports.initialChannelRequest('UChDTL2EmhDoIDPjiUAGWdlQ'); // closed
