const axios = require('axios');
const _ = require('lodash');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const helpers = require('../helpers/functions.js');
const { contextObjSpoofer } = require('../helpers/contextObj.js');

// const fs = require('fs');

let baseSettings = {
  "content-type": "application/json",
  'x-youtube-client-name': 1,
  'x-youtube-client-version': contextObjSpoofer().client.clientVersion
}

module.exports = {
  parseCookie: (str) => { return String(str).split('Cookie="').pop().split('; ')[0] },
  formatCookie: (cookieJar) => {
    let ytCookies = cookieJar.store.idx['youtube.com']['/']; 
    return `${module.exports.parseCookie(ytCookies['YSC'])}; ${module.exports.parseCookie(ytCookies['VISITOR_INFO1_LIVE'])}; ${module.exports.parseCookie(ytCookies['GPS'])};`
  },
  parseCont: (data) => {
    let obj = {};
    const divString = 'ytInitialData = ';
    const result = data.indexOf(divString);
    const result1 = result + divString.length;
    const result2 = data.indexOf(';</script><script nonce="', result1 + 1);
    const value = data.slice(result1, result2);
    const ytInitialData = JSON.parse(value);
    const videoPrimaryInfos = ytInitialData.contents.twoColumnWatchNextResults.results.results.contents;

    videoPrimaryInfos.forEach((info) => {
      let firstKey = info[Object.keys(info)[0]];

      _.pickBy(firstKey, function(v, k) {
        if (k === 'contents') {
          if (firstKey.contents[0].hasOwnProperty("continuationItemRenderer")) {
            let cont = firstKey.contents[0].continuationItemRenderer;

            obj = {
              continuation: cont.continuationEndpoint.continuationCommand.token,
              clickTrackingParams: cont.continuationEndpoint.clickTrackingParams
            }
          }
        }
      });
    })
      
    return obj;
  },
  initialObj: (vidId) => { return { vid_id: vidId, amount_of_comments: 0, total_comments: 0, comments: [], next: false } },
  pullReplies: async (innerApiKey, continuation, cookies, obj, contextObj) => {
    const baseHeader = { ...baseSettings, 'cookie': cookies };
    let continueFunc, cont;

    try {
      const result = await axios({
        method: 'post',
        url: `https://www.youtube.com/youtubei/v1/next?key=${innerApiKey}`,
        data: {
          context: contextObj,
          continuation: continuation
        },
        headers: baseHeader,
      });

      result.data.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems.forEach((reply) => {
        let commentsObj = {}
        let cStub = reply.hasOwnProperty('commentRenderer') ? reply.commentRenderer : reply.continuationItemRenderer;

        if (reply.hasOwnProperty('commentRenderer')) {
          obj.comments.push({
            comment_id: cStub.commentId,
            author: cStub.authorText.simpleText,
            author_id: cStub.authorEndpoint.browseEndpoint.browseId,
            thumb: cStub.authorThumbnail.thumbnails[2].url,
            comment: cStub.contentText.runs.length === 2 ? `${cStub.contentText.runs[0].text} ${cStub.contentText.runs[1].text}` : cStub.contentText.runs[0].text,
            reply_to_author: cStub.contentText.runs.length === 2 ? helpers.cleanAuthorName(cStub.contentText.runs[0].text) : false,
            timestamp: cStub.publishedTimeText.runs[0].text,
            votes: cStub.hasOwnProperty("voteCount") ? cStub.voteCount.simpleText : 0,
          })
        }

        if (reply.hasOwnProperty("continuationItemRenderer")) {
          continueFunc = true;

          cont = {
            continuation: cStub.button.buttonRenderer.command.continuationCommand.token,
            clickTrackingParams: cStub.button.buttonRenderer.command.clickTrackingParams
          }
        }
      })
      
      obj.amount_of_comments = obj.comments.length;
      
      if (continueFunc) {
        await module.exports.pullReplies(innerApiKey, cont.continuation, cookies, obj, contextObj);
      }

    } catch (error) {
      console.log(error);
      return error
    }
  },
  pullCommentService: async (innerApiKey, continuation, cookies, obj, limit, sort, initialCall, contextObj) => {
    const baseHeader = { ...baseSettings, 'cookie': cookies };
    let breakFunc, nextToken = false;
    
    try {
      const result = await axios({
        method: 'post',
        url: `https://www.youtube.com/youtubei/v1/next?key=${innerApiKey}`,
        data: {
          context: contextObj,
          continuation: continuation
        },
        headers: baseHeader,
      });

      const endpoint = result.data.onResponseReceivedEndpoints;
      let itemSectionContinuation = endpoint.length === 2 ? endpoint[1].reloadContinuationItemsCommand.continuationItems : endpoint[0].appendContinuationItemsAction.continuationItems;

      itemSectionContinuation.forEach((comment) => {
        let cStub = comment.hasOwnProperty('commentThreadRenderer') ? comment.commentThreadRenderer.comment.commentRenderer : comment.continuationItemRenderer;
        
        if (comment.hasOwnProperty('commentThreadRenderer')) {
          // Checks if there are replies
          let rStub = comment.commentThreadRenderer.hasOwnProperty('replies') ? comment.commentThreadRenderer.replies.commentRepliesRenderer.contents[0].continuationItemRenderer.continuationEndpoint : false;

          obj.comments.push({
            comment_id: cStub.commentId,
            author: cStub.authorText.simpleText,
            author_id: cStub.authorEndpoint.browseEndpoint.browseId,
            thumb: cStub.authorThumbnail.thumbnails[2].url,
            comment: cStub.contentText.runs[0].text,
            timestamp: cStub.publishedTimeText.runs[0].text,
            votes: cStub.hasOwnProperty("voteCount") ? cStub.voteCount.simpleText : 0,
            comment_pinned: cStub.hasOwnProperty("pinnedCommentBadge") ? true : false,
            author_verified: cStub.hasOwnProperty("authorCommentBadge") ? true : false,
            amount_replies: cStub.hasOwnProperty("replyCount") ? cStub.replyCount : 0,
            replies: rStub ? { cont: rStub.continuationCommand.token, clickTracking: rStub.clickTrackingParams } : false
          })
        }

        obj.amount_of_comments = obj.comments.length;

        if (obj.amount_of_comments <= limit) {
          breakFunc = true;

          if (comment.hasOwnProperty('continuationItemRenderer')) {
            obj.next = {
              continuation: cStub.continuationEndpoint.continuationCommand.token,
              clickTrackingParams: cStub.continuationEndpoint.clickTrackingParams
            } 
            nextToken = true;
          } 
        }
      })

      if (endpoint.length === 2) {
        obj.total_comments = helpers.removeComma(endpoint[0].reloadContinuationItemsCommand.continuationItems[0].commentsHeaderRenderer.countText.runs[0].text);

        // if (endpoint[0].reloadContinuationItemsCommand.continuationItems[0].commentsHeaderRenderer.hasOwnProperty("sortMenu") && sort === 'newest' && initialCall) {
        //   let sortFilter = itemSectionContinuation.header.commentsHeaderRenderer.sortMenu.sortFilterSubMenuRenderer;

        //   obj.next.continuation = sortFilter.subMenuItems[1].continuation.reloadContinuationData.continuation,
        //   obj.next.clickTrackingParams = sortFilter.subMenuItems[1].continuation.reloadContinuationData.clickTrackingParams;
        
        //   obj.comments = [];
        //   nextToken = true;
        // }
      }

      if (nextToken && breakFunc) {
        await module.exports.pullCommentService(innerApiKey, obj.next.continuation, cookies, obj, limit, sort, false, contextObj);
      }

    } catch (error) {  
      console.log(error);
      return error
    }
  },
  initialNestedThread: async (event) => {
    let authKey = false;
    if (event.headers.hasOwnProperty('token')) { authKey = event.headers.token; } 
    if (!helpers.authorizer(authKey)) { return 'auth' } ;

    const vidId = event.pathParameters.id;
    const continuation = JSON.parse(event.body).continuation;
    const clickTracking = JSON.parse(event.body).clickTracking;
    const contextObj = contextObjSpoofer(clickTracking, false, `https://www.youtube.com/watch?v=${vidId}`, false)
    
    try {
      axiosCookieJarSupport(axios);
      const cookieJar = new tough.CookieJar();

      const response = await axios.get(`https://www.youtube.com/watch?v=${vidId}`, {
        jar: cookieJar,
        withCredentials: true, 
      })

      const cookies = module.exports.formatCookie(cookieJar);
      const innerApiKey = helpers.parseInnerkey(response.data);

      let obj = module.exports.initialObj(vidId);

      await module.exports.pullReplies(innerApiKey, continuation, cookies, obj, contextObj);
      return helpers.returnResponse(200, {response: obj})

    } catch (error) {  
      console.log(error);
      return helpers.returnResponse(500, {response: error})
    }
    
  },
  initialMainThread: async (event) => {
    let authKey = false;
    if (event.headers.hasOwnProperty('token')) { authKey = event.headers.token; } 
    if (!helpers.authorizer(authKey)) { return 'auth' } 

    const vidId = event.pathParameters.id;
    const sort = event.pathParameters.sort;
    const limit = event.pathParameters.hasOwnProperty('limit') ? event.pathParameters.limit : 500;

    try {
      axiosCookieJarSupport(axios);
      const cookieJar = new tough.CookieJar();

      const response = await axios.get(`https://www.youtube.com/watch?v=${vidId}`, {
        jar: cookieJar,
        withCredentials: true, 
      })

      const cont = module.exports.parseCont(response.data);
      const contextObj = contextObjSpoofer(cont.clickTrackingParams, false, `https://www.youtube.com/watch?v=${vidId}`, false)
      const innerApiKey = helpers.parseInnerkey(response.data);
      const cookies = module.exports.formatCookie(cookieJar);
      let obj = module.exports.initialObj(vidId);

      if (cont) {
        await module.exports.pullCommentService(innerApiKey, cont.continuation, cookies, obj, limit, sort, true, contextObj);
        return helpers.returnResponse(200, {response: obj})

      } else {
        return module.exports.initialMainThread({
          pathParameters: {
            id: vidId,
            sort: sort,
            limit: limit
          },
          headers: {
            token: 'debug'
          }
        })
      }
    } catch (error) {
      console.log(error)
      if (error.status === 429) {
        return helpers.returnResponse(429, {video_id: vidId, text: 'too many requests', response: error})
      } 
      return helpers.returnResponse(500, {video_id: vidId, response: error})

    }
  }
}

// module.exports.initialMainThread({
//   pathParameters: {
//     id: 'k79hE9YmCw',
//     sort: 'best',
//     limit: 200
//   },
//   headers: {
//     token: 'debug'
//   }
// }).then((res)=> {
//   console.log(res);

  // fs.writeFile("./comment.json", JSON.stringify(res, 0, 2), (err) => {
  //   if (err)
  //     console.log(err);
  //   else {
  //     console.log("File written successfully\n");
  //     console.log("The written has the following contents:");
  //   }
  // });
// })