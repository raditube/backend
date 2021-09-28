const randomUseragent = require('random-useragent');
const helpers = require('./functions.js')

module.exports = {
  contextObjSpoofer: (cTracking, visitorData, url, grafturl) => {
    const UA = randomUseragent.getRandomData();
    let conArray = ["CONN_CELLULAR_4G", "CONN_CELLULAR_2G", "CONN_CELLULAR_3G"]

    let obj = { 
      client: {
        hl: "en",
        gl: "US",
        remoteHost: `${helpers.randomInt(100,108)}.${helpers.randomInt(33,37)}.${helpers.randomInt(126,133)}.${helpers.randomInt(9,168)}`,
        deviceMake: UA.deviceVendor,
        deviceModel: "",
        visitorData: visitorData ? visitorData : "CgtFb255Q1Jkd3dfRSiE4YuCBg%3D%3D", // needs to be spoofed
        userAgent: UA.userAgent,
        clientName: "WEB",
        clientVersion: "2.20210304.08.01",
        osName: UA.osName,
        osVersion: UA.osVersion,
        originalUrl: "https://www.youtube.com/user/ForumDemocratie/channels",
        platform: "DESKTOP",
        clientFormFactor: "UNKNOWN_FORM_FACTOR",
        browserName: UA.browserName,
        browserVersion: UA.browserVersion,
        screenWidthPoints: helpers.randomInt(1000, 1900),
        screenHeightPoints: helpers.randomInt(400,1000),
        screenPixelDensity: 2,
        screenDensityFloat: 2,
        utcOffsetMinutes: -300,
        userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
        connectionType: conArray[conArray.length * Math.random() | 0],
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
            value: `"${Date.now()}-100"`
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
    clientScreenNonce: "MC45NzA1OTQ1MDQ4NzMzODg4"}

    return obj
  }
}
