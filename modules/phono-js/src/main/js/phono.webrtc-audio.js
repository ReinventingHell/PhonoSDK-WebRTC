function WebRTCAudio(phono, config, callback) {
    
    console.log("Initialize WebRTC");
    
    this.config = config;
    var plugin = this;
    
    var containerId = this.config.containerId;
    
    // Create audio continer if user did not specify one
    if(!containerId) {
	this.config.containerId = containerId = this.createContainer();
    }

    WebRTCAudio.remoteAudio = document.getElementById(containerId);

    try { 
        navigator.webkitGetUserMedia("audio", 
                                     function(stream) {
                                         WebRTCAudio.localStream = stream;
                                         console.log("We have a stream");
                                         callback(plugin);
                                     },
                                     function(error) {
                                         console.log("Failed to get access to local media. Error code was " + error.code);
                                         alert("Failed to get access to local media. Error code was " + error.code + ".");   
                                     });
        console.log("Requested access to local media.");
    } catch (e) {
        console.log("getUserMedia error.");    
    }
}

WebRTCAudio.exists = function() {
    return (typeof webkitPeerConnection == "function");
}

WebRTCAudio.localStream = null;
WebRTCAudio.offer = null;
WebRTCAudio.answer = null;
WebRTCAudio.pc = null
WebRTCAudio.stun = "STUN stun.l.google.com:19302";
WebRTCAudio.count = 0;
WebRTCAudio.remoteAudio = null;

// WebRTCAudio Functions
//
// =============================================================================================

// Creates a new Player and will optionally begin playing
WebRTCAudio.prototype.play = function(url, autoPlay) {
};

// Creates a new audio Share and will optionally begin playing
WebRTCAudio.prototype.share = function(url, autoPlay, codec) {
    var share;
    var localStream;  

    return {
        // Readonly
        url: function() {
            return null;
        },
        codec: function() {
            return null;
        },
        // Control
        start: function() {
            // Start
            // Pass the ROAP OK back to the stack?
        },
        stop: function() {
            // Stop
        },
        digit: function(value, duration, audible) {
        },
        // Properties
        gain: function(value) {
            return null;
        },
        mute: function(value) {
            return null;
        },
        suppress: function(value) {
            return null;
        },
        energy: function(){        
            return {
               mic: 0.0,
               spk: 0.0
            }
        }
    }
};   

// Do we have WebRTC permission? 
WebRTCAudio.prototype.permission = function() {
    return true;
};

// Returns an object containg JINGLE transport information
WebRTCAudio.prototype.transport = function() {
    
    return {
        name: "http://phono.com/webrtc/transport",
        description: "http://phono.com/webrtc/description",
        buildTransport: function(direction, j, callback) {
            if (direction == "answer") {
                // We are the result of an inbound call, so provide answer
                WebRTCAudio.pc = new webkitPeerConnection(WebRTCAudio.stun,
                                                          function(message) {
                                                              var roap = jQuery.parseJSON(message.substring(4,message.length));
                                                              if (roap['messageType'] == "ANSWER") {
                                                                  console.log("Received ANSWER from PeerConnection: " + message);
                                                                  WebRTCAudio.answer = message;
                                                                  j.c('transport',{xmlns:"http://phono.com/webrtc/transport"})
                                                                      .c('roap',Base64.encode(WebRTCAudio.answer));
                                                                  callback();
                                                              }
                                                          }
                                                         );
                
                WebRTCAudio.pc.onaddstream = function(event) {
                    console.log("Remote stream added.");
                    var url = webkitURL.createObjectURL(event.stream);
                    WebRTCAudio.remoteAudio.src = url;
                };
                
                console.log("Created new PeerConnection, passing it :" + WebRTCAudio.offer);
                WebRTCAudio.pc.processSignalingMessage(WebRTCAudio.offer);
                WebRTCAudio.pc.addStream(WebRTCAudio.localStream);
            } else {
                // We are creating an outbound call
                WebRTCAudio.pc = new webkitPeerConnection(WebRTCAudio.stun,
                                                          function(message) {
                                                              var roap = jQuery.parseJSON(message.substring(4,message.length));
                                                              if (roap['messageType'] == "OFFER") {
                                                                  j.c('transport',{xmlns:"http://phono.com/webrtc/transport"})
                                                                      .c('roap',Base64.encode(message));  
                                                                  console.log("Received OFFER from PeerConnection: " + message);
                                                                  WebRTCAudio.offer = message;
                                                                  callback();
                                                              }
                                                          }
                                                         );
                WebRTCAudio.pc.onaddstream = function(event) {
                    console.log("Remote stream added.");
                    var url = webkitURL.createObjectURL(event.stream);
                    WebRTCAudio.remoteAudio.src = url;
                };
                WebRTCAudio.pc.addStream(WebRTCAudio.localStream);
                console.log("Created PeerConnection for new OUTBOUND CALL");
            }
        },
        processTransport: function(t) {
            var roap;
            var message;
            t.find('roap').each(function () {
                var encoded = this.textContent;
                message = Base64.decode(encoded);
                console.log("message = " + message);
                roap = jQuery.parseJSON(message.substring(4,message.length));
            });
            if (roap['messageType'] == "OFFER") {
                // We are receiving an inbound call
                // Store the offer so we can use it to create an answer
                //  when the user decides to do so
                WebRTCAudio.offer = message;
            } else if (roap['messageType'] == "ANSWER") {

                // We are having an outbound call answered (must already have a PeerConnection)
                WebRTCAudio.pc.processSignalingMessage(message);
            }
            return true;
        }
    }
};

// Returns an array of codecs supported by this plugin
// Hack until we get capabilities support
WebRTCAudio.prototype.codecs = function() {
    var result = new Array();
    result.push({
        id: 1,
        name: "webrtc",
        rate: 16000,
        p: 20
    });
    return result;
};

WebRTCAudio.prototype.audioInDevices = function(){
    var result = new Array();
    return result;
}

// Creates a DIV to hold the audio element if not specified by the user
WebRTCAudio.prototype.createContainer = function() {
    var webRTC = $("<video>")
      	.attr("id","_phono-audio-webrtc" + (WebRTCAudio.count++))
      	.appendTo("body");

    var containerId = $(webRTC).attr("id");       
    return containerId;
};      