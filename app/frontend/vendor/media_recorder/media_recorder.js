window.originalMediaRecorder = window.MediaRecorder;
if(!window.MediaRecorder) {
  polyfillMediaRecorder();
}
// ... or how about let's just use: https://github.com/streamproc/MediaStreamRecorder
function polyfillMediaRecorder() {
  // http://www.w3.org/TR/mediastream-recording/
  function MediaRecorder(stream, options) {
    this.stream = stream;
    if(!stream) { throw("stream required"); }
    if(stream.getAudioTracks().length == 0) { throw("only audio recording currently supported"); }
    // console.log(stream.getVideoTracks());

    this.state = "inactive";
    this.imageWidth = 640;
    this.imageHeight = 480;
    this.mimeType = "audio/wav";
    this.onrecording = null;
    this.onstop = null;
    this.ondataavailable = null;
    this.onpause = null;
    this.onresume = null;
    this.onmutetrack = null;
    this.onunmutetrack = null;
    this.onphoto = null;
    this.onerror = null;
    this.onwarning = null;

    var recorderRTC = RecordRTC(stream, {
      type: 'audio'
    });

    var rec = this;
    var blobList = null;
    var lastBlob = null;
    var timeslice = null;
    var MAX_TIMESLICE = 30000, MIN_TIMESLICE = 1000;

    var timesliceCallback = function() {
      if(rec.state == 'recording') {
        rec.requestData();
        setTimeout(timesliceCallback, timeslice);
      }
    };

    var makeBlob = function() {
      lastBlob = new Blob(blobList, {type: rec.mimeType});
      return lastBlob;
    };
    var handleContent = function() {
      if(rec.state != 'recording') { return; }
      // for each track, check if it's muted and if so fill with empty, otherwise use the input
    };

    // NOT part of the spec
    this.getLastBlob = function() {
      return lastBlob;
    };

    this.start = function(ts) {
      if(rec.state != 'inactive') { throw("invalid state"); }
      timeslice = Math.max(Math.min(ts || 0, MAX_TIMESLICE), MIN_TIMESLICE);
      setTimeout(timesliceCallback, timeslice);
      recorderRTC.startRecording();
      blobList = [];
      rec.state = 'recording';
      rec.trigger('recording');
      // startBlob();
    };
    this.stop = function() {
      if(rec.state == 'inactive') { throw("invalid state"); }
      recorderRTC.stopRecording(function() {
        var blob = recorderRTC.getBlob();
        blobList.push(blob);
        clearTimeout(timesliceCallback);
        rec.state = 'inactive';
        rec.trigger('dataavailable', makeBlob());
        blobList = [];
        rec.trigger('stop');
      });
    };
    this.pause = function() {
      if(rec.state == 'inactive') { throw("invalid state"); }
      recorderRTC.stopRecording(function() {
        blobList.push(recorderRTC.getBlob());
        clearTimeout(timesliceCallback);
        rec.state = 'paused';
        rec.trigger('pause');
      });
    };
    this.resume = function() {
      if(rec.state == 'inactive') { throw("invalid state"); }
      setTimeout(timesliceCallback, timeslice);
      recorderRTC.startRecording();
      rec.state = 'recording';
      rec.trigger('resume');
    };
    this.muteTrack = function(trackID) {
      throw('not implemented');
      if(rec.state != 'recording') { throw("invalid state"); }
      // if can't find track then raise("can't find that track");
      // replace the current track with black squares or no audio while populating the final product
      rec.trigger('mutetrack');
    };
    this.unmuteTrack = function(trackID) {
      throw('not implemented');
      if(rec.state != 'recording') { throw("invalid state"); }
      // if can't find track then raise("can't find that track");
      // start using the track again to populate the final product
      rec.trigger('unmutetrack');
    };
    this.takePhoto = function(trackID) {
      throw('not implemented');
      // if can't find video track then raise("can't find that track");
      // generate a custom blob for the photo
      rec.trigger('photo', photoBlob);
    };
    this.requestData = function() {
      if(rec.state != 'recording') { throw("invalid state"); }
      recorderRTC.stopRecording(function() {
        blobList.push(recorderRTC.getBlob());
        rec.trigger('dataavailable', makeBlob());
        recorderRTC.startRecording();
        blobList = [];
      });
    };
    this.getOptions = function() {
      throw("not yet supported");
      return {
        MimeType: ['image/png'],
        imageHeight: [640, 640],
        imageWidth: [480, 480]
      }
    };
    this.setOptions = function(optionValues) {
      if(rec.state != 'inactive') { throw("invalid state"); }
      throw("not yet supported");
      rec.mimeType = optionValues.MimeType || optionsValues.mimeType;
      rec.imageWidth = optionValues.imageWidth;
      rec.imageHeight = optionValues.imageHeight;
      // set options as specified
    };

    var listeners = {};
    this.bind = function(event, callback) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(callback);
    };
    this.addEventListener = this.bind;
    this.unbind = function(event, callback) {
      if(listeners[event]) {
        var newList = [];
        for(var idx = 0; idx < listeners[event].length; idx++) {
          if(listeners[event][idx] != callback) {
            newList.push(listeners[event][idx]);
          }
        }
        listeners[event] = newList;
      }
    };
    this.removeEventListener = this.unbind;
    this.trigger = function(event, blob) {
      var eventObject = {
        data: blob
      };
      if(listeners['on' + event]) {
        listeners['on' + event](eventObject);
      }
      if(listeners[event]) {
        for(var idx = 0; idx < listeners[event].length; idx++) {
          listeners[event][idx](eventObject);
        }
      }
    }
  }

  window.MediaRecorder = MediaRecorder;
}

