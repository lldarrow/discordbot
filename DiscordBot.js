/*********************************************************
Programmer: Luke Darrow
Date: 4/29/2017

Description: Javascript Discord bot. Plays sound files as
added to a sounds folder by the user. Keeps stats of sounds
played in a json file. Basically a newer, better, more up
to date version of a discord bot I made a few months back
(discord.js updates made it obsolete as it could only run
with an older version).

Requirements: Discord.js (v11), node.js (6.0 or newer)
please refer to the Discord.js documentation for a list
of requirements and installation instructions. YOU DO NEED
OPUSSCRIPT FOR THIS TO WORK. Follow discord's instructions
(on their website) on creating a bot and adding it to your
discord server.
*********************************************************/

var fs = require('fs');
var Discord = require('discord.js');

//create a new client called 'bot'
var bot = new Discord.Client();

//your discord bot token here
var token = "your token here";
//stats file location
var statsPath = "./stats.json";
//sound files location
var soundsPath = "./sounds/";

//list of commands
var commands = new Map();

//exit flag
var exit = 0;

var stats;

commands.set(new RegExp('!help', 'i'), ['function', displayCommands]);
commands.set(new RegExp('!random', 'i'), ['function', playRandomSound]);
commands.set(new RegExp('!popular', 'i'), ['function', popularStats]);
commands.set(new RegExp('!exit', 'i'), ['function', shutDownBot]);

var output;

//log in to server using token
bot.login(token, output);

//login error message handling
function output(error, token) {
	if(error) {
		console.log('ERROR: login error: ${error}');
		return;
	}
	else {
		console.log('Login Successful. DiscordBot running with Token: ${token}');
		console.log('Sound path: ' + soundsPath);
		console.log('Stats path: ' + statsPath);
		console.log('To shutdown use command !exit in the Discord server');
	}
}

//update stats on command
function incrementStats(command) {
	if(stats[command]) {
		stats[command]++;
	}
	else {
		stats[command] = 1;
	}
	fs.writeFile(statsPath, JSON.stringify(stats));
}

function loadStatsFile() {
    fs.readFile(statsPath, 'utf-8', function(error, data) {
        if(error) {
            if(error.code === 'ENOENT') {
                fs.writeFileSync(statsPath, JSON.stringify({}));
                stats = {};
            } else {
                console.log('Error: ', error);
            }
        } else {
            try {
                stats = JSON.parse(data);
            } catch(parsingError) {
                console.log('Error parsing JSON: ', parsingError);
            }
        }
    });
}

function fileToCommand(file) {
    return "!" + file.split('.')[0].split('-').join(' ');
}

function regExpToCommand(command) {
    return command.toString().split('/')[1];
}

function addSoundsTo(map, fromDirectoryPath) {
    var soundFiles = fs.readdir(fromDirectoryPath, function(err, files) {
        files.forEach(function(file) {
            if(file[0] !== '.') {
                var command = fileToCommand(file);
                var commandRegExp = new RegExp(command, 'i');
                map.set(commandRegExp, ['sound', file]);
				console.log(file + " added to sounds");
            }
        });
    });
}

function sendMessage(authorChannel, text) {
    bot.sendMessage(authorChannel, text);
}

function shutDownBot(message) {
    bot.destroy();
	console.log('Bot Shutting Down');
	exit = 1;
}

//plays sounds to author's voice channel
//todo: implement auto leave functionality, account for command spamming
function playSound(authorChannel, authorVoiceChannel, command, sound) {
	authorVoiceChannel.join().then(connection => {
		const dispatcher = connection.playFile(soundsPath + sound);
	})
	.catch(console.error);
	incrementStats(command);
}

//fires on ready
bot.on("ready", function () {
	console.log('Discord Bot logged in');
	addSoundsTo(commands, soundsPath);
	loadStatsFile();
	bot.user.setGame("7 Days to Dab");
});

function displayCommands(message) {
    var helpMessage = '';

    if(message.content.split(' ')[2]) {
        var helpFilter = new RegExp(message.content.split(' ')[2], 'i');
        commands.forEach(function(fileName, command){
            if(command.toString().match(helpFilter)) {
                helpMessage += regExpToCommand(command) + '\n';
            }
        });
    } else {
        commands.forEach(function(fileName, command){
            helpMessage += regExpToCommand(command) + '\n';
        });
    }
    message.channel.sendMessage(helpMessage);
}

function playRandomSound(message) {
    var keys = [...commands.keys()];
    var randomKey;
    var randomValue = ['', ''];
    while(randomValue[0] !== 'sound') {
		randomKey = keys[Math.round(keys.length * Math.random())];
		randomValue = commands.get(randomKey);
    }
    playSound(message.channel, message.member.voiceChannel, regExpToCommand(randomKey), randomValue[1]);
}

//sends stats on files played to discord
//todo: finish this XD. need to sort the stats and clean it update
//right now it just outputs the json contents
function popularStats(message) {
	message.channel.sendMessage(JSON.stringify(stats));
}

//fires on message in the discord server
bot.on('message', function(message) {
	//make sure it's not responding to its own messages
	if(message.author.username !== bot.user.username) {
        console.log("message recieved: " + message.content);
        commands.forEach(function (botReply, regexp) {
            if(message.content.match(regexp)) {
                switch(botReply[0]) {
                    case 'function':
                        botReply[1](message);
                        break;
                    case 'sound':
						if(message.member.voiceChannel)
							playSound(message.channel, message.member.voiceChannel, regExpToCommand(regexp), botReply[1]);
						else
							message.channel.sendMessage("Must be voice channel to play sound");
                        break;
                    case 'text':
                        message.channel.sendMessage(botReply[1]);
                        break;
                    default:
                        break;
                }
				if(exit)
					return;
            }
        });
    }
});