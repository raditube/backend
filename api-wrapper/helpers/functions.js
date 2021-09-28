const dayjs = require('dayjs')

module.exports = {
  authorizer: (key) => {
    let keys = ["debug"];
    return keys.includes(key);
  },
  returnResponse: (code, body) => {
    return {
      statusCode: code,
      headers:  { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "http://localhost:8080",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify(body, null, 2),
    }
  },
  cleanAuthorName: (str) => {
    let removeAtChar = str.replace('@','');
    if (removeAtChar.charAt(0) === ' ') {
      return removeAtChar.slice(1);
    } else {
      return removeAtChar;
    }
  },
  parseInnerkey: (html) => {
    return html.split('"INNERTUBE_API_KEY":"').pop().split('","INNERTUBE_API_VERSION"')[0];
  },
  parseResponse: (html) => {
    let textObj = html.split('ytInitialData = ').pop().split(';</script>')[0];
    let obj = JSON.parse(textObj);

    if (typeof obj === 'object' && obj !== null) { return obj } 
  },
  parseDate: (string) => {
    let dateString = string.toLowerCase();
    let now = dayjs();
    let parts = dateString.split(' ');

    if (dateString.includes("streamed")) {
      return now.subtract(parts[1], parts[2]).$d;
    }
    
    return now.subtract(parts[0], parts[1]).$d;
  },
  removeComma: (str) => {
    return parseFloat(str.replace(/,/g, ''));
  },
  fullNumber: (str) => {
    if (str.includes('K')) {
      return parseFloat(str.slice(0, -1)) * 1000;
    } else if (str.includes('M')) {
      return parseFloat(str.slice(0, -1)) * 1000000;
    } else {
      return parseFloat(str);
    }
  },
  countWords: (str) => {
    return str.trim().split(/\s+/).length;
  },
  randomInt: (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); 
  }
}