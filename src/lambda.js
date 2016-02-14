/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

var http = require('http'); //Used to make an http call to the marvel api
var crypto = require('crypto');  //Marvel requires you send them a hash of the api key and timestamp

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "") {
             context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("getHeroIntent" === intentName) {
        getHero(intent, session, callback);  
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the Marvel API Alexa app;" +
        "Ask me about your favorite marvel character";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Hmmm, Ask me about your favorite marvel character";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHero(intent, session, callback) {
  var cardTitle = intent.name;
  var repromptText = "";
  var sessionAttributes = {};
  var shouldEndSession = true;
  var speechOutput = "";
  
  var hero;
  
  console.log("HERO >>>");
  console.log(intent.slots.Hero.value);
  console.log("<<< HERO");
  
  if(intent.slots.Hero.value){
    hero = intent.slots.Hero.value;      
  } else {
    // TODO: If no hero in the slot, then reask user
    speechOutput = "I don't know who you are asking about"
  }
  
  getHeroFromMarvel(hero, function(heroes){
      
    if(heroes.data.count > 0) {
        //speechOutput = "I have found " + heroes.data.count + " hero by that name;";
        //TODO: I know this is kind of ghetto, but I just assume first character returned was the one asked for.
        var hero = heroes.data.results[0];
        if(hero.description === '') {
            speechOutput = speechOutput + "Marvel doesn't seem to have a description for ";
            speechOutput = speechOutput + hero.name + ", but lists that ";
            speechOutput = speechOutput + hero.name + " was in the following comics; ";
            speechOutput = speechOutput + hero.comics.items[0].name + "; ";
            speechOutput = speechOutput + hero.comics.items[1].name + ", and, ";
            speechOutput = speechOutput + hero.comics.items[2].name;
        } else {
            speechOutput = hero.name + ";";
            speechOutput = speechOutput + hero.description;
        }

    } else {
        speechOutput = "Marvel could not find the character you asked about.";
    }
    
    callback(sessionAttributes,
      buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  });

}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}


// Don't use demo key in production. Get a key from https://api.nasa.gov/index.html#apply-for-an-api-key
function getHeroFromMarvel(hero, callback) {
    var PRIV_KEY = "<marvel private key>";
    var API_KEY = "<marvel api key>";
    var ts = new Date().getTime();
    var hash = crypto.createHash('md5').update(ts + PRIV_KEY + API_KEY).digest('hex');
    var pathurl = '/v1/public/characters?name=' + encodeURIComponent(hero);
    pathurl += "&ts="+ts+"&hash="+hash;
    console.log(pathurl);
  return http.get({
    host: 'gateway.marvel.com',
    path: pathurl
  }, function(response) {
    // Continuously update stream with data
    var body = '';
    response.on('data', function(d) {
      body += d;
    });
    response.on('end', function() {
        console.log(body);
      callback(JSON.parse(body));
    });
  });
}
