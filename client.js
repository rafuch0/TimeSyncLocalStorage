var socket = io.connect("http://timesync.example.com:8083");
var db = null;

var dbName = "TimeSyncLocalStorage";
var dbComment = dbName;
var dbVersion = "0.1";

socket.on('data', recieveResults);

socket.on('connect', function()
{
	document.getElementById("connectionStatus").innerHTML = 'Connected';
});

socket.on('disconnect', function()
{
	document.getElementById("connectionStatus").innerHTML = 'Disconnected';
});

function initPage()
{
	if(hasLocalStorage())
	{
		db = openDatabase(dbName, dbVersion, dbComment, 1);

		checkLastVisit();
	}
	else
	{
		alert('Browser Lacks HTML5 LocalStorage');
	}
}

function getData(field, callback)
{
	db.transaction(function(tx)
	{
		tx.executeSql("SELECT time FROM TimeSync WHERE timeEntry = ?", [field], function(tx, result)
		{
			callback(parseInt(result.rows.item(0).time));
		}, onDBError);
	});
}

function checkLastVisit()
{
	var lastTime = null;
//	lastTime = localStorage.getItem('timeOffset');

//	dropTable();
	createTable();

	var lastData = {};

	getData('clientTime', function(response)
	{
		lastData.clientTime = response;

		getData('serverTime', function(response)
		{
			lastData.serverTime = response;

			getData('offsetTime', function(response)
			{
				lastData.offsetTime = response;

				alert("lastClientTime = "+lastData.clientTime+"\nlastServerTime = "+lastData.serverTime+"\nlastOffsetTime = "+lastData.offsetTime);
			});
		});
	});
}

function hasLocalStorage()
{
	try
	{
		return 'localStorage' in window && window['localStorage'] !== null;
	}
	catch(e)
	{
		return false;
	}
}

function onDBError(tx, error)
{
	alert('Error: '+error.message);
}

function dropTable()
{
	db.transaction(function(tx)
	{
		tx.executeSql('DROP TABLE TimeSync', [], function(tx)
		{
			alert('Table Dropped!');
		}, onDBError);
	});
}

function updateEntry(timeEntry, time)
{
	db.transaction(function(tx)
	{
		tx.executeSql("UPDATE TimeSync SET time = ? WHERE timeEntry = ?", [time, timeEntry], function(tx, result)
		{
//			alert(timeEntry+' updated with time '+time);
		}, onDBError);
	});
}

function createTable()
{
	db.transaction(function(tx)
	{
		tx.executeSql('CREATE TABLE TimeSync (timeEntry TEXT, time TEXT)', [], function(tx)
		{
			alert('Table Created!');
		}, null);

		tx.executeSql('INSERT INTO TimeSync (timeEntry, time) VALUES (?, ?)', ['clientTime', '0'], function(tx, result)
		{
			//alert('Inserted clientTime');
		}, onDBError);

		tx.executeSql('INSERT INTO TimeSync (timeEntry, time) VALUES (?, ?)', ['serverTime', '0'], function(tx, result)
		{
			//alert('Inserted serverTime');
		}, onDBError);

		tx.executeSql('INSERT INTO TimeSync (timeEntry, time) VALUES (?, ?)', ['offsetTime', '0'], function(tx, result)
		{
			//alert('Inserted offsetTime');
		}, onDBError);
	});
}

function recieveResults(data)
{
	var response = '';

	if(data.type === 'timeSync')
	{
		var serverTime = data.data;

		var dateUtil = new Date();
		var clientTime = Number(parseInt(dateUtil.getTime()/1000));
		var timeOffset = clientTime - serverTime;

		document.getElementById('serverTime').innerHTML = serverTime+' server time';
		document.getElementById('clientTime').innerHTML = clientTime+' client time';
		document.getElementById('offsetTime').innerHTML = timeOffset+' time offset';

		if(db)
		{
			localStorage.setItem('timeOffset', clientTime - serverTime);
			updateEntry('serverTime', serverTime);
			updateEntry('clientTime', clientTime);
			updateEntry('offsetTime', timeOffset);
		}
	}
}
