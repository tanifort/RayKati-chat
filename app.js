/* @author Ramond Belmo Tanifor Tamah, Katerina Irini Geniou 
   @version 2.0*/

//------------------------------------------------------------------------------
// node.js Chat application intigrated on the Bluemix Cloud
//-----------------------------------------------------------------------------

/* import required frameworks and libraries */
var express = require ('express'),
	app = express(),
	server = require ('http').createServer(app),
	io = require('socket.io').listen(server),
	Cloudant = require('cloudant'),
	crypt = require('bcryptjs'),
	middleware = require("middleware"),
	url = require("url"),
	cfenv = require('cfenv'),
	tls = require('tls');

/* Some variables we used */
var services;
var cloudant;
var database;
var middelware = module.exports;
var http = "http:";
var https = "https:";

/* this object is required to iterate through the database so that we can use it for the find() function */
var LookupUsername ={
	"selector":{
		"_id":""
	}
};

/* function-call to bind to our Cloudant NoSQL Database */
init();

/* this function uses express to enable us to get the X-Forwarded-*headerfields
from which we can specify if our incoming URL is http or https
feature needed to redirect http to https */
app.enable('trust proxy');

/* This function allows us to know whether the request was via http or https */
app.use (function (req, res, next) {
	if (req.secure) {
	// request was via https, so do no special handling
	next();
        } else {
                // request was via http, so redirect to https
                res.redirect('https://' + req.headers.host + req.url);
            }
        });

/* a list of objects which will contain the user object and key values (username) */
users = {}; 
/* allows node.js to read static files like javascript and css */
app.use('/public', express.static(__dirname + '/public'));

//app.use(middleware.transportSecurity());

/* on get request from a client an index.html file is sent as respond */
app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

/* get the app environment from Cloud Foundry */
var appEnv = cfenv.getAppEnv();

/* start server on the specified port and binding host */
server.listen(appEnv.port, '0.0.0.0', function() {

/* print a message when the server starts listening and on which port to access */
  console.log("server starting on " + appEnv.url);
});
//---------------------------

/*the server listens on the port 3000 */
//server.listen(appEnv.port);
//console.log(appEnv.url);

/* this method defines functions when a connection is established */
io.sockets.on('connection', function(socket){
	//-------------Sign Up-------------------------------//
	/* function is called when a user wants to sign up for the chatroom to verify the validity of typed in username and password, 
	the password is secured using a hash function
	afterwards the password and the username are insertet in the Cloudant NoSQL database and the chatroom is notified of the incoming user*/
		socket.on('new user', function(data, callback){
		crypt.genSalt(10,function(err,salt){
			crypt.hash(data.password,salt,function(err,hash){
				data.password = hash;
				database.insert({_id:data.name.toLowerCase(), password: data.password}, function (error, body){
					if (error){
						callback(false);
						console.log("ERROR could not store the value");
					}
					else{
					if (data.name in users) {//check if username is already in the array
						callback(false);
						}else { //if its not in the array add it in the array
							callback(true);
							socket.username = data.name;
							users[socket.username] = socket;
							updateUsernames();
							io.sockets.emit('logInUserNotify', { 
								zeit : new Date(), usern : socket.username
							});
						}
					}
				});
			});
		});
	});
	//----------------------Login------------------------//
	/* This function is called for registered users who want to reenter the chatroom 
	the credentials of the user are validated against the supposed stored credentials of the user in the Cloudant NoSQL database 
	in the case of a succesfull identification the user is given access to the chatroom */

    socket.on('login', function(data, callback){
    	if(data.password!=undefined){
    		if(data.name in users){
    			socket.emit('AlreadyLoggedInChat');
    			console.log("user --->" + data.name + "is already logged in the Chat");
    		}else{
    			LookupUsername.selector._id=data.name.toLowerCase();
    			database.find(LookupUsername,function(error, result){
    				//-------------------------------------------
                     if(result.docs[0]===undefined){

                     console.log("THE REUtLIT IS UNDEFINED");
                     }else{
                     	console.log("RESULT IS DEFINED");
                     	console.log("PLEASE result.docs[0]====>" + result.docs[0]);

                     }

             //-------------------------------------------
    				
    				if(error){
    					console.log("An Unknown Error Occured ... Please try Again");
    				}else if(result.docs[0]!=undefined){

    					crypt.compare(data.password, result.docs[0].password,function(err,res){
    						//console.log("password from client: "+ data.password);
    							//console.log("password from database: "+ result.docs[0].password);
    						if(!(err)){
    							if(res==true){
    								callback(true);
    								socket.username = data.name;
	                        		users[socket.username] = socket;
	                        		if(socket.username!= undefined){
	                        			console.log("socket username is defined");
	                        			updateUsernames();
	                        			io.sockets.emit('logInUserNotify', {
										zeit : new Date(), usern : socket.username
										});
	                        		}else{
	                        			console.log("username is undefined on the socket!");
	                        		}
    							}else{
    								callback(false);
    							}

    						}else{
    							console.log("error");
    							callback(false);
    						}
    					});

    				}else{
    					callback(false);
    				}
    			});
    		}
    	}else{
    		console.log("ERROR: Your password is undefined");
    	}	
	});

	/* updates the user list in case of changes */
	function updateUsernames(){
		io.sockets.emit('nicknames', Object.keys(users));

	}

	/* this function is called when a message is sent to define the kind of message sent
	it could be a private message starting with an '@', public message 
	or a request of the list of users present in the chatroom with "/list" */
	socket.on('send message', function(data, callback){
		var msg = data.trim();
		if(msg.substr(0,1) === '@') {
			msg = msg.substr(1);
			var ind = msg.indexOf(' ');
			if (ind !== -1){ //check if there is something tiped in
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('private', {zeit: new Date(), msg: msg,  usern: socket.username
					});
				} 
				else {
					callback('Error Enter valid user!');
				}
			} 
			else {
				callback('Error! Please enter a message');
			}
		}
		else if(msg.substr(0,5) === '/list'){
			callback(Object.keys(users));
		}
		else {
			io.sockets.emit('new message', {
				zeit: new Date(), msg: msg,  usern: socket.username
				}); //sends out message to all users and yourself
		}
	});

	/* method called when a user disconnects from the socket 
	the user is removed from the user list and the chatroom gets notified */
	socket.on('disconnect', function(data){
		if (!socket.username) 
			return;
		delete users[socket.username]; //gets rid of elements in array
		updateUsernames();//update userlist on client side
		io.sockets.emit('logOutUserNotify', {
			zeit : new Date(), usern : socket.username
		});
	});
}); 

/* in this function we first try to specify the environment we are running our system on (Bluemix or localy)
on bluemix the enviromental variable is used to get the existing services on bluemix 
from there we can access our Cloudant NoSQL Database
 */
function init() {
    if (process.env.VCAP_SERVICES) {
        services = JSON.parse(process.env.VCAP_SERVICES);
        var cloudantService = services['cloudantNoSQLDB'];
        for (var service in cloudantService) {
        	if (cloudantService[service].name === 'chatService') {
                cloudant = Cloudant(cloudantService[service].credentials.url);
            }
        }
    }
    else {
    	var cloudant = Cloudant({
    		"username": "5aac9789-faef-4904-996d-bd21ba38fb35-bluemix",
    		"password": "c38bd67cdf07bb719f9977cf5a226c5537ee287d4d1f0859825e3370a5d77d67",
    		"host": "5aac9789-faef-4904-996d-bd21ba38fb35-bluemix.cloudant.com",
    		"port": 443,
    		"url": "https://5aac9789-faef-4904-996d-bd21ba38fb35-bluemix:c38bd67cdf07bb719f9977cf5a226c5537ee287d4d1f0859825e3370a5d77d67@5aac9789-faef-4904-996d-bd21ba38fb35-bluemix.cloudant.com"
    	});
    }
    database = cloudant.db.use('chatdatabase');
    if (database === undefined) {
    	console.log("ERROR: The database is not defined!");
    }
}