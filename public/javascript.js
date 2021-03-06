/* @author Ramond Belmo Tanifor Tamah, Katerina Irini Geniou 
   @version 2.0*/
		
		jQuery(function($){
			/*declaration of the needed variables from the html web page*/
			var socket = io({transports: ['websocket']});
			socket = io.connect();
			var $usernameForm = $('#setUsername');
			var $usernameError = $('#usernameError');
			var $usernameBox = $('#username');
			var $users = $('#users');
			var $messageForm = $('#send-message');
			var $messageBox = $('#message');
			var $chat = $('#chat');
			var $password = $('#password');
			var $password2 = $('#password2');
			var $LoginForm = $('#LoginForm');
			var $LoginLinkButton = $('#LoginLinkButton');
			var $SignupForm = $('#SignupForm');
			var $SignupLinkButton = $('#SignupLinkButton');
			var $LoginLink = $('#LoginLink');
			var $LoginNameForm = $('#signUpForm');
			var $loginusername= $('#loginusername');
			var $loginpassword = $('#loginpassword');
			var $LoginWrap = $('#LoginWrap'); 
			var $loginQuestion = $('#loginQuestion');

			/* this function is used to place the focus in the div on the latest messages*/
			function focus () {
				var focusBottom = $chat;
				var height = focusBottom[0].scrollHeight;
				focusBottom.scrollTop(height);
			}
			/* this function is called to switch from the signup page to the login */
			$LoginForm.submit(function(e){
				e.preventDefault();
				$('#usernameWrap').hide();
				$('#LoginWrap').show();
				//$('#LoginLinkButton').prop('disabled', true);
				$('#LoginLinkButton').hide();
				$('#SignupLinkButton').show();
				$('#loginQuestion').hide();
			});
			/* this function is called to switch from the login page to the sign up */
			$SignupForm.submit(function(e){
				e.preventDefault();
				$('#SignupLinkButton').hide();
				$('#LoginWrap').hide();
				$('#usernameWrap').show();
				$('#LoginLink').show();
				$('#LoginLinkButton').show();
				$('#LoginForm').show();
				$('#loginQuestion').show();


			});
			
			/*This function which takes as parameter the event e is triggered 
			when the user submits the sign up form with a username and a password when registering to our service*/
			//-----------------SignUp------------------------------------------------
			$usernameForm.submit(function(e){
				e.preventDefault();
				console.log("Hier-------------------------------------------");
				if ($('#username').val() ==""){
						alert("This username is invalid! Please enter another one.");
					}else if ($('#password').val() ==""){
						alert("This password is invalid! Please enter another one.");
					} 
					else {
						if($password.val()===$password2.val()){
							/*this function is called when the new user event is triggered
						the parameter usernameBox.val() provide the inputs of the user 
						and the callback function gets the boolean value if the name is valid or not from the server
						  */
						socket.emit('new user', {name: $usernameBox.val(), password: $password.val()}, function(data){
						if (data == true){ //if the username is valid check
							$('#usernameWrap').hide();
							$('#contentWrap').show();
							$('#loginQuestion').hide();
					
						} else {
							alert("That username is already taken! Please try it again!");
						}
					});
						}
						else{
							alert("Mismatched password");
						}
						
						$usernameBox.val('');
						$password.val('');
					}
					return false;
				});

			//---------------------------------------login-------------------------------
			/*This function which takes as parameter the event e is triggered 
			when the user submits the login form with a username and a password during login to our service*/

             $LoginNameForm.submit(function(e){
				    e.preventDefault();
				
				if ($('#loginusername').val() ==""){
						alert("This the login name is invalid! Please enter another one.");
					}else if ($('#loginpassword').val() ==""){
						alert("This login password is invalid! Please enter another one.");
					} 
					else {
			
							/*this function is called when the new user event is triggered
						the parameter loginusername.val() and loginpassword.val() provide the inputs of the user 
						and the callback function gets the boolean value if the credentials or user inputs are valid or not from the server
						  */
						socket.emit('login', {name: $loginusername.val(), password: $loginpassword.val()}, function(data){
						if (data == true){ //if the username is valid check
							$('#usernameWrap').hide();
							$('#contentWrap').show();
							$LoginWrap.hide();
							$('#SignupLinkButton').hide();
					
						} else {
							alert("The user is yet not registered!");
						}
					});
						
						$usernameBox.val('');
						$password.val('');
					}
					return false;
				});

             /* this function is called when a user tries to login while already in the chat */
             socket.on('AlreadyLoggedInChat',function(data){
             	alert("User is Already Logged in the Chat!");

             });


			/* This function is called when the user submits his message in the messageForm */
			$messageForm.submit(function(e){ //attaching an event handler to the form
				e.preventDefault(); //not to refresh the page again
				/* This function with @param send message @param messageBox.val() and the callback function
				with @param data emits the typed message to the server and the received data which is then displayed */
				socket.emit('send message', $messageBox.val(), function(data){
					console.log("Size of the LIST " +data.length);
					$chat.append('<span class="userlist"><font color="#3399ff"> <b><i>connected users: ' + data + "</i></b></font></span><br/>"); //display the message
					focus();
				});
				$messageBox.val('');
			});

			/*Chatroom is notified when a user joins the chatroom*/  
			socket.on('logInUserNotify', function(data) {
				$chat.append('<i>' +  data.usern.toLowerCase() + ' joined the chatroom.</i>' + "<br/>");
			});

			/*Chatroom is notified when a user leaves the chatroom*/
			socket.on('logOutUserNotify', function(data) {
				$chat.append('<i>' + data.usern.toLowerCase() + ' left the chatroom.</i>' + "<br/>");
			});

			/* This function displays the sent message of a user with timestamp and his username to the chatroom */
			socket.on('new message', function(data){ 
				var zeit = new Date(data.zeit);

				$chat.append('<span style="height:100%;" class="msg"> <i> <font size="2" color="DarkGray">' + zeit.getFullYear()+ '-'+ (zeit.getMonth() + 1) + '-' + zeit.getDate() + ' '
					+ (zeit.getHours() <10 ? '0' + zeit.getHours() : zeit.getHours()) 
					+ ':' + 
					(zeit.getMinutes()<10 ? '0' + zeit.getMinutes(): zeit. getMinutes()) 
					+ ':' + 
					(zeit.getSeconds()<10 ? '0' + zeit.getSeconds(): zeit. getSeconds()) 
					+'</font></i> <b>' + data.usern + ': </b><font>' + data.msg + "</font></span><br/>"); //display the message
				focus();
			});

			/* This function displays the private sent message of a user with timestamp and his username
			to a choosed user */
			socket.on('private', function(data){
				var zeit = new Date(data.zeit);
				$chat.append('<span class="private">[' + zeit.getFullYear()+ '/'+ (zeit.getMonth() + 1) + '/' + zeit.getDate() + ' '
					+ (zeit.getHours() <10 ? '0' + zeit.getHours() : zeit.getHours()) 
					+ ':' + 
					(zeit.getMinutes()<10 ? '0' + zeit.getMinutes(): zeit. getMinutes()) 
					+ ':' + 
					(zeit.getSeconds()<10 ? '0' + zeit.getSeconds(): zeit. getSeconds()) 
					+'] <b>' + data.usern + ': </b>' + 'private message: '+ data.msg + "</span><br/>"); //display the message
				focus();
			});
		});