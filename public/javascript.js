
		jQuery(function($){
			/*declaration of the needed variables from the html web page*/
			var socket = io.connect();
			var $usernameForm = $('#setUsername');
			var $usernameError = $('#usernameError');
			var $usernameBox = $('#username');
			var $users = $('#users');
			var $messageForm = $('#send-message');
			var $messageBox = $('#message');
			var $chat = $('#chat');
			
			/*This function which takes as parameter the event e is triggered 
			when the user submits the login form with a username*/
			$usernameForm.submit(function(e){
				e.preventDefault();
				if ($('#username').val() ==""){
						alert("This username is invalid! Please enter another one.");
					} else {
						/*this function is called when the new user event is triggered
						the parameter usernameBox.val() provide the inputs of the user 
						and the callback function gets the boolean value if the name is valid or not from the server
						  */
						socket.emit('new user', $usernameBox.val(), function(data){
						if (data == true){ //if the username is valid check
							$('#usernameWrap').hide();
							$('#contentWrap').show();
						} else {
							alert("That username is already taken! Please try it again!");
						}
					});
						$usernameBox.val('');
					}
					return false;
				});

			/* This function is called when the user submits his message in the messageForm */
			$messageForm.submit(function(e){ //attaching an event handler to the form
				e.preventDefault(); //not to refresh the page again
				/* This function with @param send message @param messageBox.val() and the callback function
				with @param data emits the typed message to the server and the received data which is then displayed */
				socket.emit('send message', $messageBox.val(), function(data){
					$chat.append('<span class="userlist">' + data + "</span><br/>"); //display the message
				});
				$messageBox.val('');
			});

			/*Chatroom is notified when a user joins the chatroom*/  
			socket.on('logInUserNotify', function(data) {
				$chat.append('<i>' +  data.usern + ' joined the chatroom.</i>' + "<br/>");
			});

			/*Chatroom is notified when a user leaves the chatroom*/
			socket.on('logOutUserNotify', function(data) {
				$chat.append('<i>' + data.usern + ' left the chatroom.</i>' + "<br/>");
			});

			/* This function displays the sent message of a user with timestamp and his username to the chatroom */
			socket.on('new message', function(data){ 
				var zeit = new Date(data.zeit);
				$chat.append('<span class="msg">[' + zeit.getFullYear()+ '/'+ (zeit.getMonth() + 1) + '/' + zeit.getDate() + ' '
					+ (zeit.getHours() <10 ? '0' + zeit.getHours() : zeit.getHours()) 
					+ ':' + 
					(zeit.getMinutes()<10 ? '0' + zeit.getMinutes(): zeit. getMinutes()) 
					+ ':' + 
					(zeit.getSeconds()<10 ? '0' + zeit.getSeconds(): zeit. getSeconds()) 
					+'] <b>' + data.usern + ': </b>' + data.msg + "</span><br/>"); //display the message
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
			});
		});