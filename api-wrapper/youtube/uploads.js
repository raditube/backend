// Retrieve all videos uploaded by a specific user
// Add limiting option
const helpers = require('../helpers/functions.js');
const axios = require("axios");

let contextObj = {
  client: {
    hl: "en",
    gl: "US",
    remoteHost: "1528.222.225.39",
    deviceMake: "Apple",
    deviceModel: "",
    visitorData: "CgtFb255Q1Jkd3dfRSiE4YuCBg%3D%3D", // needs to be spoofed
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36,gzip(gfe)", // spoofed
    clientName: "WEB",
    clientVersion: "2.20210304.08.01",
    osName: "Macintosh",
    osVersion: "10_15_6",
    originalUrl: "https://www.youtube.com/user/ForumDemocratie/channels",
    platform: "DESKTOP",
    clientFormFactor: "UNKNOWN_FORM_FACTOR",
    browserName: "Chrome",
    browserVersion: "88.0.4324.192",
    screenWidthPoints: 1654,
    screenHeightPoints: 948,
    screenPixelDensity: 2,
    screenDensityFloat: 2,
    utcOffsetMinutes: -300,
    userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
    connectionType: "CONN_CELLULAR_4G",
    mainAppWebInfo: {
      graftUrl: "https://www.youtube.com/c/UCZBvFB_qFW9vKVbHyFg0I_Q/channels"
    },
    timeZone: "America/New_York"
  },
  user: {
    lockedSafetyMode: false
  },
  request: {
    useSsl: true,
    internalExperimentFlags: [],
    consistencyTokenJars: []
  },
  clickTracking: {
    clickTrackingParams: "CAAQhGciEwjTrOLU1prvAhXX8sEKHaubC_0="
  },
  adSignalsInfo: {
    params: [{
      key: "dt",
      value: "1614999685268"
    }, {
      key: "flash",
      value: "0"
    }, {
      key: "frm",
      value: "0"
    }, {
      key: "u_tz",
      value: "-300"
    }, {
      key: "u_his",
      value: "2"
    }, {
      key: "u_java",
      value: "false"
    }, {
      key: "u_h",
      value: "1050"
    }, {
      key: "u_w",
      value: "1680"
    }, {
      key: "u_ah",
      value: "1027"
    }, {
      key: "u_aw",
      value: "1680"
    }, {
      key: "u_cd",
      value: "30"
    }, {
      key: "u_nplug",
      value: "3"
    }, {
      key: "u_nmime",
      value: "4"
    }, {
      key: "bc",
      value: "31"
    }, {
      key: "bih",
      value: "948"
    }, {
      key: "biw",
      value: "1654"
    }, {
      key: "brdim",
      value: "22,23,22,23,1680,23,1654,1027,1654,948"
    }, {
      key: "vis",
      value: "1"
    }, {
      key: "wgl",
      value: "true"
    }, {
      key: "ca_type",
      value: "image"
    }],
    consentBumpParams: {
      consentHostnameOverride: "https://www.youtube.com",
      urlOverride: ""
    }
  },
  clientScreenNonce: "MC45NzA1OTQ1MDQ4NzMzODg4"
}

module.exports = {
  reformatVideoMeta: (vid) => {
    return {
      video_id: vid.videoId,
      thumbnails: vid.thumbnail,
      title: vid.title.runs[0].text,
      published_at: vid.publishedTimeText.simpleText,
      view_count: vid.hasOwnProperty('viewCountText') ? vid.viewCountText.simpleText : 0
    };
  },
  nextVidCall: async (channelObj, contParams, apiKey) => {
    const key = contParams.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
    let contToken;

    try {
      const response = await axios.post(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
        context: contextObj,
        continuation: key
      })

      let vids = response.data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems;

      vids.forEach((video) => {
        if (video.hasOwnProperty("gridVideoRenderer")) {
          let vid = video.gridVideoRenderer;
          channelObj.videos.push(
            module.exports.reformatVideoMeta(vid)
          );
        } else {
          contToken = video;
        }
      })

      if (contToken) {
        await module.exports.nextVidCall(channelObj, contToken, apiKey);
      }

    } catch (err) {
      console.log(err)
    }

  },
  getUploads: async (event) => {
    const channel_id = event.pathParameters.channel_id;
    const initial_call = event.pathParameters.initial_call;
    let contToken;
    let channelObj = {
      meta: {}, videos: []
    }

    try {
      const response = await axios.get(`https://www.youtube.com/channel/${channel_id}/videos`);

      let formattedRes = helpers.parseResponse(response.data);
      let innerKey = helpers.parseInnerkey(response.data);
      let stub = formattedRes.contents.twoColumnBrowseResultsRenderer.tabs[1];
      let vids = stub.tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].gridRenderer.items;

      if (formattedRes.hasOwnProperty("metadata")) {
        let meta = formattedRes.metadata.channelMetadataRenderer;

        channelObj.meta = {
          title: meta.title,
          description: meta.hasOwnProperty("description") ? meta.description : "",
          channel_id: meta.externalId,
          thumb: meta.hasOwnProperty("avatar") ? meta.avatar.thumbnails[0] : "",
          facebook_id: meta.hasOwnProperty("facebookProfileId") ? meta.facebookProfileId : "",
          vanity_url: meta.hasOwnProperty("vanityChannelUrl") ? meta.vanityChannelUrl : "",
          keywords: meta.hasOwnProperty("keywords") ? meta.keywords : ""
        }
      }

      vids.forEach((video) => {
        if (video.hasOwnProperty("gridVideoRenderer")) {
          let vid = video.gridVideoRenderer;
          channelObj.videos.push(
            module.exports.reformatVideoMeta(vid)
          );
        } else {
          contToken = video;
        }
      })

      if (contToken && initial_call != "true") {
        await module.exports.nextVidCall(channelObj, contToken, innerKey);
        // console.log(channelObj);
        return channelObj;
      } else {
        return helpers.returnResponse(200, channelObj)
      }

    } catch (err) {
      console.log(err);
    }

  }
}

// module.exports.getUploads({
//   pathParameters: {
//     // channel_id: 'UCBJycsmduvYEL83R_U4JriQ',
// 		channel_id: 'UC9H9K7oSpte0uWBofdW4UiA',
// 		initial_call: "false"
//   },
//   headers: {
//     token: 'debug'
//   }
// })
// .then((res)=> {
//   console.log(res);
// })