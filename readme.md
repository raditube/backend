# RadiTube backend
---

## Description
---

This repo will contain the improved RadiTube backend. Most of this is build around a Serverless architecture, but functions can be isolated pretty easily.

**Proposed architecture**



## API Wrappers

---

The ```api-wrapper``` folder contains different wrappers for video platforms. Right now we are only focussing on YouTube, but we hope to build support for other platforms as well. There is also a ```helpers``` folder with more general utilities functions.

### YouTube

---

This wrapper works around YouTube's internal website API. Right now it supports comments (both the main thread as well as the nested comments), video status, channel subscriptions, transcripts and uploads.