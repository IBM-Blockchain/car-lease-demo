/*eslint-env node */

var request = require('request');
var reload = require('require-reload')(require),
    configFile = reload(__dirname+'/../../../../../../configurations/configuration.js');
var tracing = require(__dirname+'/../../../../../../tools/traces/trace.js');
var map_ID = require(__dirname+'/../../../../../../tools/map_ID/map_ID.js');
var hfc = require('hfc');

var user_id;
var attrList = ["name", "affiliation"];

var update = function(req, res)
{

	if(typeof req.cookies.user != "undefined")
	{
		req.session.user = req.cookies.user;
		req.session.identity = map_ID.user_to_id(req.cookies.user);
	}

	user_id = req.session.identity

  configFile = reload(__dirname+'/../../../../../../configurations/configuration.js');

  var v5cID = req.params.v5cID;

	tracing.create('ENTER', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', req.body);

	var newValue = req.body.value;
	var function_name = req.body.function_name;

	tracing.create('INFO', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', 'Formatting request');
	res.write('{"message":"Formatting request"}&&');

  var chain = hfc.getChain(configFile.config.chain_name);

  chain.getUser(user_id, function(err, user) {
    if (err) {
      res.status(400)
			var error = {}
			error.message = 'Unable to update reg';
			error.v5cID = v5cID;
			error.error = true;
			tracing.create('ERROR', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', error)
			res.end(JSON.stringify(error))
    }
    else {
      // TODO: get function from function_name
      var invokeRequest = {
        chaincodeID: configFile.config.vehicle_name,
        fcn: "update_registration", //function_name.toString(),
        args: [newValue, v5cID],
        attrs: attrList
      }

      var invokeTx = user.invoke(invokeRequest);

      invokeTx.on('submitted', function(results) {
        console.log('Request to update reg submitted succesfully');
      });

      invokeTx.on('complete', function(results) {
        var j = request.jar();
  			var str = "user="+req.session.user;
  			var cookie = request.cookie(str);
  			var url = configFile.config.app_url +'/blockchain/assets/vehicles/'+v5cID+'/reg';
  			j.setCookie(cookie, url);
  			var options = {
  				url: url,
  				method: 'GET',
  				jar: j
  			}

  			tracing.create('INFO', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', 'Achieving Consensus');
  			res.write('{"message":"Achieving Consensus"}&&');
  			var counter = 0;
  			var interval = setInterval(function(){
  				if(counter < 15){
  					request(options, function (error, response, body) {

  						if (!error && response.statusCode == 200)
  						{

  							var result = {};
  							result.message = 'Reg updated'
  							tracing.create('EXIT', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', result);
  							res.end(JSON.stringify(result))
  							clearInterval(interval);
  						}
  					})
  					counter++;
  				}
  				else
  				{
  					res.status(400)
  					var error = {}
  					error.error  = true;
  					error.message = 'Unable to confirm reg update. Request timed out.';
  					tracing.create('ERROR', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', error)
  					res.end(JSON.stringify(error))
  					clearInterval(interval);
  				}
  			}, 4000);
      });

      invokeTx.on('error', function(error) {
        res.status(400)
        var error = {}
        error.error  = true;
        error.message = 'Unable to confirm reg update.';
        tracing.create('ERROR', 'PUT blockchain/assets/vehicles/vehicle/'+v5cID+'/reg', error)
        res.end(JSON.stringify(error))
      });
    }
  });
}
exports.update = update;
