/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//-----------------------------------------------------------------------------


/* import required frameworks and libraries */
var express = require ('express'),
	app = express(),
	server = require ('http').createServer(app),
	io = require('socket.io').listen(server);

/* a list of objects which will contain the user object and key values (username) */
	users = {}; 
	/* allows node.js to read static files like javascript and css */
app.use('/public', express.static(__dirname + '/public'));

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');



/* on get request from a client an index.html file is sent as respond */
app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


// start server on the specified port and binding host
//---------------------------------------------------------
server.listen(appEnv.port, '0.0.0.0', function() {

  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
//---------------------------


/*the server listens on the port 3000 */
//server.listen(appEnv.port);
//console.log(appEnv.url);

/* this method defines functions when a connection is established */
io.sockets.on('connection', function(socket){
	/* function is called to verify the validity of a username, insert the user into the list and notify the chatroom */
	socket.on('new user', function(data, callback){
	 if (data in users) {//check if username is already in the array
			callback(false);
		} else { //if its not in the array add it in the array
			callback(true);
			socket.username = data;
			users[socket.username] = socket;
			updateUsernames();
			io.sockets.emit('logInUserNotify', {
				zeit : new Date(), usern : socket.username
			});
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
				} else{
					callback('Error Enter valid user!');
				}
			} else{
				callback('Error! Please enter a message');

			}
		}else if(msg.substr(0,5) === '/list'){
			callback(Object.keys(users));
		}else{
		io.sockets.emit('new message', {
			zeit: new Date(), msg: msg,  usern: socket.username
		}); //sends out message to all users and yourself
	}
});

	/* method called when a user disconnects from the socket 
	the user is removed from the user list and the chatroom gets notified */
	socket.on('disconnect', function(data){
		if (!socket.username) return;
		delete users[socket.username]; //gets rid of elements in array
		updateUsernames();//update userlist on client side
		io.sockets.emit('logOutUserNotify', {
			zeit : new Date(), usern : socket.username
		});
	});
}); 