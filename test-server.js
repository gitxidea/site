var http  = require('http');
var fs = require('fs');
http.createServer(function (request, response) {
	var match = request.url.match(/([^;?]*)([?;].*)?/);
	var url = match[1];
	fs.readFile(__dirname+url, "binary", function(err, file) {
		if(err){
			response.writeHead(200, {"Content-Type": "text/html;charset=utf-8",
			"Location": "/lite/index.html"});   
			response.end('Location:<a href="/lite/index.html">/lite/index.html</a>')
		}else{
			response.writeHead(200, {"Content-Type": "text/"+url.replace(/.*\./,'')+";charset=utf-8"});   
			response.end(file,'binary')
		}
	});
}).listen(8082);