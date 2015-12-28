var server = require( './tcp-server' );
var config = require( '../config' );
var check = require( '../helper/helper' ).check;

var matchMessage = function( realMessage, expectedMessage ) {
	if( server.allMessages.length === 0 ) {
		return 'Server did not recieve any messages';
	}
	else if( expectedMessage.indexOf( '<UID>' ) === -1 ) {
		return check( 'last received message', expectedMessage, convertChars( realMessage ) );
	} else {
		expectedMessage = expectedMessage.replace( /\|/g, '\\|' );
		expectedMessage = expectedMessage.replace( '+', '\\+' );
		expectedMessage = expectedMessage.replace( '<UID>', '.*' );
		if( (new RegExp( expectedMessage ) ).test( convertChars( realMessage ) ) ) {
			return;
		} else {
			return convertChars( realMessage ) + ' did not match ' + expectedMessage;
		}
	}
}

var convertChars = function( input ) {
	return input
		.replace( new RegExp( String.fromCharCode( 31 ), 'g' ), '|' )
		.replace( new RegExp( String.fromCharCode( 30 ), 'g' ), '+' );
};

module.exports = function() {
	this.Given( /the test server is ready/, function (callback) {
		server.whenReady( callback );
	});

	this.Given( /^the server resets its message count$/, function (callback) {
		server.lastMessage = null;
		server.allMessages = [];
		callback();
	});

	this.When( /^the server sends the message (.*)$/, function( message, callback ){
		message = message.replace( /\|/g, String.fromCharCode( 31 ) );
		message = message.replace( /\+/g, String.fromCharCode( 30 ) );
		server.send( message );
		setTimeout( callback, config.tcpMessageWaitTime );
	});

	this.When(/^the connection to the server is lost$/, function (callback) {
		server.stop( callback );
	});

	this.When(/^the connection to the server is reestablished$/, function ( callback ) {
		function hasAClient() {
			setTimeout( function() {
				if( server.connectionCount > 0 ) {
					callback();
				} else {
					hasAClient();		
				}
			}, 100 );
		}
		server.whenReady( hasAClient, 100 );
	});

	this.Then( /^no message was send to the server$/, function( callback ){
		check( 'last received message', null, convertChars( server.lastMessage ), callback );
	});

	this.Then( /^the server has (\d*) active connections$/, function( connectionCount, callback ){
		check( 'active connections', Number( connectionCount ), server.connectionCount, callback );
	});

	this.Then( /^the last message the server recieved is (.*)$/, function( message, callback ){
		callback( matchMessage( server.lastMessage, message ) );
	});

	this.Then( /^the server received the message (.*)$/, function( message, callback ) {
		var matchFound = false;
		for( var i=0; i<server.allMessages.length && !matchFound; i++) {
			matchFound = !!matchMessage( server.allMessages[ i ], message );
		}
		callback( !matchFound && ( 'No match for message ' + message + ' found') );
	} );

	this.Then( /^the server has received (\d*) messages$/, function( numberOfMessages, callback ) {
		check( 'number of received messages', Number( numberOfMessages ), server.allMessages.length, callback );
	});

};