/* @author Ramond Belmo Tanifor Tamah, Katerina Irini Geniou 
   @version 3.0*/

//------------------------------------------------------------------------------
// node.js Chat application intigrated on the Bluemix Cloud
//-----------------------------------------------------------------------------

/* import required frameworks and libraries */
/* Note Belmo---------------Additional bugs fixing----> render msgs so no HTML msg is read but sent als object.*/
var express = require ('express'),
	app = express(),
	server = require ('http').createServer(app),
	io = require('socket.io').listen(server, {transports: ['websocket']}),
	Cloudant = require('cloudant'),
	crypt = require('bcryptjs'),
	middleware = require("middleware"),
	url = require("url"),
	cfenv = require('cfenv'),
	tls = require('tls'),
	redis = require('socket.io-redis');
	//session = require('express-session'),
	//cookieParser = require('cookie-parser'),
	//edisStore = require('connect-redis')(session);
	
	//sessionStore = require('sessionstore');
//	sessionSockets = require('socket.io-session');


/* Some variables we used */
var services;
var cloudant;
var database;
var online;
var http = "http:";
var https = "https:";
var resultList=[];




/* this object is required to iterate through the database so that we can use it for the find() function */
var LookupUsername ={
	"selector":{
		"_id":""
	}
};
var lookupSid={
	"selector":{
		"Sid":""
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
//app.use(session({store: sessionStore, key: 'jsessionid', secret: 'your secret here'}));

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
/* The Connection to the Redis database using its credentials provided in bluemix  ,this enables our server instances to communicate with each other */
io.adapter(redis({host: 'pub-redis-17789.dal-05.1.sl.garantiadata.com', port: 17789, password: 'x9imwLEOIXcaMYuj'}));




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
				database.insert({_id:data.name.toLowerCase(), password: data.password, Sid: socket.id}, function (error, body){
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
                        online.insert({_id:data.name.toLocaleLowerCase(),Sid:socket.id},function(error,b){
                            if(error){
                                console.log("THIS USER COULD NOOT BE INSERTED IN THE ONLINE DATABASE ... Please take care of this if not he/she would not appear in the User List");
                            }else{
                                console.log("THE USER WAS SUCCESSFULLY INSERTED IN THE ONLINE DATABASE ");

                            }
                        });
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
        console.log("LOGIN----------- THis User ---------------------------------------->" +data.name);

    	if(data.password!=undefined){
    		if(data.name in users){
    			socket.emit('AlreadyLoggedInChat');
    			console.log("user --->" + data.name + "is already logged in the Chat");
    		}else{
    			LookupUsername.selector._id=data.name.toLowerCase();
    			database.find(LookupUsername,function(error, result){
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

                                        online.insert({_id:data.name.toLocaleLowerCase(),Sid:socket.id},function(error,b){
                                            if(error){
                                                console.log("THIS USER COULD NOOT BE INSERTED IN THE ONLINE DATABASE ... Please take care of this if not he/she would not appear in the User List");
                                            }else{
                                                console.log("THE USER "+data.name+ " SCHOULD NOW HAVE A Sid");
                                                console.log("THE USER WAS SUCCESSFULLY INSERTED IN THE ONLINE DATABASE ");

                                            }
                                        });
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
    //-----------------------------------------------

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
				//----------------------------------------------------------------
                console.log("THE NAME OF THE PERSON TO RECIEVE PROCCESSED FROM THE SENDER MESSAGE " + name+ " SENT BY :------>" +socket.username);

                online.list({
                    'include_docs': true
                },function(err,body){
                    if(err){
                        console.log("ERRROR WHEN DELETING THE USER FROM THE ONLINE DATABASE");
                    }else{
                        var rows = body.rows;
                        var items = [];
                        var rec_found = false;
                        console.log(" this is the list of online Users + SIDs"+ rows);
                        console.log("THE NAME OF THE RECEIVER IS---------------------->"+name);
                        rows.forEach(function (row) {
                            if (row.doc._id===name ) {
                                if(row.doc.Sid!=undefined){
                                    var MySocketId=row.doc.Sid;
                                    console.log("THIS IS THE USERS SID " +MySocketId );
                                    console.log("THE NAME OF THE RECIEVER FOUND IN THE ONLINE DATABASE ---> " +row.doc._id );

                                    rec_found = true;

                                    io.to(MySocketId).emit('private', {zeit: new Date(), msg: msg,  usern: socket.username
                                    });

                                    console.log("THE USER ("+row.doc_id+ ") IS ONLINE and should have recieved the private msg by now  --------------------------------------------");
								}else{
                                	console.log("THE USER IN ONLINE BUT DOES NOT HAVE Sid = undefined");
								}

                            }else{console.log("THE USER ("+row.doc_id+ ") IS NOT ONLINE --------------------------------------------");}

                        });

                    }


                });



			} 
			else {
				callback('Error! Please enter a message');
			}
		}
		else if(msg.substr(0,5) === '/list'){

		    //------------------------------------------------

            online.list({
                'include_docs': true
            },function(err,body){
                if(err){
                    console.log("ERRROR WHEN DELETING THE USER FROM THE ONLINE DATABASE");
                }else{
                    var rows = body.rows;
                    var items = [];
                    var rec_found = false;
                    console.log(rows);
                    rows.forEach(function (row) {
                        if (row && row.doc !=undefined) {
                            console.log("Row_ID ----------------------------------"+row._id);
                            console.log("socekt.username--------------------"+ socket.username);
                            rec_found = true;
                            items.push(row.doc._id);
                        }
                        console.log("row._id wrong object");
                    });
                    if(items.length===0){
                        console.log("NO ENTRY FOUND IN THE DATAVASE");
                    }else{

                        callback(items);




                    }
                }


            });


		}
		else {
			io.sockets.emit('new message', {
				zeit: new Date(), msg: msg,  usern: socket.username
				}); //sends out message to alls users and yourself
		}
	});

	/* method called when a user disconnects from the socket 
	the user is removed from the user list and the chatroom gets notified */
	socket.on('disconnect', function(data){
	    //------------------------------------------------------------------
        /* During the disconnect Event the Username previously stored in a the online database is updated , every user that leaftz the chat is removed f´rom the database as well.*/
        online.list({
            'include_docs': true
        },function(err,body){
            if(err){
                console.log("ERRROR WHEN DELETING THE USER FROM THE ONLINE DATABASE");
            }else{
                var rows = body.rows;
                var items = [];
                var rec_found = false;
                console.log(rows);
                rows.forEach(function (row) {
                    if (row.doc._id ===socket.username) {
                        console.log("Row_ID ----------------------------------"+row._id);
                        console.log("socekt.username--------------------"+ socket.username);
                        rec_found = true;
                        items.push(row.doc._rev);
                    }
                    console.log("row._id wrong object");
                });
                if(items.length===0){
                    console.log("NO ENTRY FOUND IN THE DATAVASE");
                }else{

                   // var docId = items[0]._id;
                     console.log("item at the [0]"+items[0]);
                   // var docRev = items[0]._rev;
                    online.destroy(socket.username, items[0],  function(err) {
                        if (!err) {
                            console.log("Successfully deleted doc with fkId: ");

                        } else {
                            console.log("THe Entry could not be deleted");
                        }
                    });

                }
            }


        });




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
    online= cloudant.db.use('online');
    database = cloudant.db.use('chatdatabase');
    if ((database === undefined)||(online===undefined) ) {
    	console.log("ERROR: The database is not defined!");
    }
}