
var uglifyjs = require('uglifyjs');
var fs = require('fs');
var path = require('path');


/*
//var root = path.resolve(,'/');
var list = fs.readdirSync(__dirname);
var filename = __filename.replace(/.*[\/\\]/,'');
var source = list.map(function(f){
	var path = __dirname+'/'+f;
	
	if(/\.css/.test(f)){
		var s = '<style>'+fs.readFileSync(path)+'</style>';
		return 'document.write('+JSON.stringify(s)+');'
	}else if(/\.js/.test(f) && filename!=f && filename !='o.js'){
		return uglifyjs.minify(path).code;
	}
	return '';
	//console.log(s)

}).join('\n');
//console.log(source)
fs.writeFileSync(__dirname+'/o.js',source);
//console.log(uglifyjs.minify());
//list.map()
*/

var from = '/Users/jinjinyun/Documents/workspace/node_modules/lite/doc/guide/'
var dest = path.join(__dirname,'../');
var base = "http://localhost:2012/doc/guide/";
var http = require('http')

var list = fs.readdirSync(from);
list.map(function(n){
	if(/\.(js|css)$/.test(n) || !/^layout/.test(n) && /.xhtml$/.test(n)){
		var url = base+n
		


		http.get(url, (res) => {
			var statusCode = res.statusCode;
			var contentType = res.headers['content-type'];

			var error;
			if (statusCode !== 200) {
				error = new Error(`Request Failed.\n` +
				`Status Code: ${statusCode}`);
			} 
			if (error) {
				console.log(error.message);
				// consume response data to free up memory
				res.resume();
				return;
			}

			res.setEncoding('utf8');
			var rawData = '';
			res.on('data', (chunk) => rawData += chunk);
			res.on('end', () => {
				fs.writeFileSync(dest+'/'+n,rawData.replace(/^<!DOCTYPE html><html>/,'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml">'));
			})
		})
	}
	var DOMParser = require('xmldom').DOMParser;
	var dom = new DOMParser().parseFromString('<!DOCTYPE html><html></html>');
	console.log(dom.toString())
	
})

