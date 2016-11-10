
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
				if (url.match(/\.xhtml$/)) {
					var dom = new DOMParser().parseFromString(rawData);
					var xpath = require('xpath.js');
					var head = dom.getElementsByTagName('head')[0];
					var metas = dom.getElementsByTagName('meta');
					var place = metas.length && metas[metas.length-1].nextSibling;
					var script = dom.createElement('script');
					script.appendChild(dom.createTextNode(insertCode));
					
					if(place && place.parentNode == head){
						head.insertBefore(place,script);
					}else{
						head.appendChild(script)
					}

	    			var nodes = xpath(dom.documentElement,'//a');
	    			for(var i=0;i<nodes.length;i++){
	    				var node = nodes[i];
	    				var href = node.getAttribute('href');
	    				if (href.match(/\.xhtml$/)) {
	    					node.setAttribute('href',href.replace(/\.xhtml$/,'.html'))
	    				};
	    			}
					rawData = dom.toString(true).replace(/^<!DOCTYPE html><html>/,'<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml">');
				}
				fs.writeFileSync(dest+'/'+n.replace(/\.xhtml$/,'.html'),rawData);
			})

		})
	}
})

var insertCode = '('+function(){
      	var _vds = _vds || [];
      	window._vds = _vds;
        _vds.push(['setAccountId', 'b1c2a262a2f852ea']);_vds.push(['setCS','v','1'])
        var vds = document.createElement('script');
        vds.type='text/javascript';
        vds.async = true;
        vds.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'dn-growing.qbox.me/vds.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(vds, s);
      }+')();'

	var DOMParser = require('xmldom').DOMParser;
	var dom = new DOMParser().parseFromString('<!DOCTYPE html><html></html>');
	console.log(dom.toString())
