// alexa-cookbook sample code

// There are three sections, Text Strings, Skill Code, and Helper Function(s).
// You can copy and paste the entire file contents as the code for a new Lambda function,
//  or copy & paste section #3, the helper function, to the bottom of your existing Lambda code.


// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function

//var myRequest = 'batman';

// 2. Skill Code =======================================================================================================


var Alexa = require('alexa-sdk');

var comicvine_apikey = '<<ENTER YOUR API KEY HERE>>';

// TODO Change the callback function to pass the images back from the API call.
var imageObj = {
  smallImageUrl: 'https://imgs.xkcd.com/comics/standards.png',
  largeImageUrl: 'https://imgs.xkcd.com/comics/standards.png'
};

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);

    // alexa.appId = 'amzn1.echo-sdk-ams.app.1234';
    // alexa.dynamoDBTableName = 'YourTableName'; // creates new table for session.attributes

    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('MyIntent');
    },
    'Unhandled': function () {
        this.emit(':ask', 'Sorry I did not get that.', 'Who do you want to know about?');
    },
    'MyIntent': function () {
        // Hero slot for the name of the comic book character in question.
        var heroSlot = this.event.request.intent.slots.Hero;
        var heroName;
        if (heroSlot && heroSlot.value) {
          heroName = heroSlot.value.toLowerCase();
        }

        httpsGet(heroName,  (myResult) => {
          console.log("sent     : " + heroName);
          console.log("received : " + myResult);

          // SSML has trouble with ampersands.  Replacing them with the word "and".
          myResult = myResult.replace("&", "and");

          // Set the Title and Content for the card in the Alexa App.
          var cardTitle = heroName;
          var cardContent = myResult;

          // Send the response to Alexa
          this.emit(':tellWithCard', myResult, cardTitle, cardContent, imageObj);
        });
    }
};


//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================


var https = require('https');
// https is a default part of Node.JS.  Read the developer doc:  https://nodejs.org/api/https.html
// try other APIs such as the current bitcoin price : https://btc-e.com/api/2/btc_usd/ticker  returns ticker.last

function httpsGet(hero, callback) {

    // GET is a web service request that is fully defined by a URL string
    // Try GET in your browser:
    // https://cp6gckjt97.execute-api.us-east-1.amazonaws.com/prod/stateresource?usstate=New%20Jersey

    // Update these options with the details of the web service you would like to call
    var options = {
        host: 'comicvine.gamespot.com',
        port: 443,
        path: '/api/search/?api_key=' + comicvine_apikey + '&field_list=count_of_issue_appearances,deck,image&resources=character&format=json&query=' + encodeURIComponent(hero),
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
        },

        // if x509 certs are required:
        // key: fs.readFileSync('certs/my-key.pem'),
        // cert: fs.readFileSync('certs/my-cert.pem')
    };

    var req = https.request(options, res => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            // We have now received the raw return data in the returnData variable.
            // We can see it in the log output via:
            // console.log(JSON.stringify(returnData))
            // We may need to parse through it to extract the needed data

            var results = JSON.parse(returnData).results;

            var pop = 'Oops.  Something went wrong.';

            // Check if got any results from the API.
            if (results.length > 0) {

              // Sort search results by count of appearances.  Assume that the highest count is the most accurate result.
              // TODO: Change this to loop through the array and get the highest count instead of sorting.
              results.sort(function(a, b) {
                return parseInt(b.count_of_issue_appearances) - parseInt(a.count_of_issue_appearances);
              });

              // Get the deck value of this character.  This is a short description of the character.
              // TODO: Validate that deck is not null.
              pop = results[0].deck;

              imageObj.smallImageUrl = results[0].image.super_url;
              imageObj.largeImageUrl = results[0].image.super_url;

            } else {
              pop = 'I did not find the Hero or Villain you were looking for.';
            }

            callback(pop);  // this will execute whatever function the caller defined, with one argument
        });
    });
    req.end();
}

