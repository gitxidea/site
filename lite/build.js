require('lite/test/run')
console.log('start....')
var path = require('path');
var uglifyjs = require('uglifyjs');
var fs = require('fs');

console.log('step:1')
/*
var codemirror = path.join(__dirname,'codemirror')
var list = fs.readdirSync(codemirror);
var filename = __filename.replace(/.*[\/\\]/,'');
console.log('step:2')
var source = list.map(function(f){
	var path = codemirror+'/'+f;
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
console.log('step:3')
fs.writeFileSync(codemirror+'/o.js',source);
//console.log(uglifyjs.minify());
//list.map()
//*/




var liteDir = path.dirname(require.resolve('lite'));
var guideDir = path.join(liteDir,'./doc/guide/')
var dest = __dirname;
var base = "http://localhost:2012/doc/guide/";
var http = require('http')
var list = fs.readdirSync(guideDir);


var exec = require('child_process').execSync
var msg1 = exec('jsi export ./compiler.js -f compressed -o c.js',{cwd:guideDir});
var msg2 = exec('jsi export ./web-compiler.js -o .wc.js',{cwd:path.join(liteDir,'php')})
console.log(msg1+'',msg2+'')

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

	var _hmt = _hmt || [];
	var hm = document.createElement("script");
	hm.src = "https://hm.baidu.com/hm.js?823940207798086de3e5c2d659cdbc3e";
	var s = document.getElementsByTagName("script")[0]; 
	s.parentNode.insertBefore(hm, s);
}+')();'

//console.log('@!!!!')
var DOMParser = require('xmldom').DOMParser;
var index = 0;
//console.log(list.length,list)
list.map(function(n){
	if(/\.(js|css)$/.test(n) || !/^layout/.test(n) && /.xhtml$/.test(n)){
		var url = base+n
		http.get(url, function(res){
			var statusCode = res.statusCode;
			var contentType = res.headers['content-type'];

			var error;
			if (statusCode !== 200) {
				error = new Error('Request Failed.\n' +
				'Status Code: ${statusCode}');
			} 
			if (error) {
				console.log(error.message);
				// consume response data to free up memory
				res.resume();
				return;
			}

			res.setEncoding('utf8');
			var rawData = '';
			res.on('data', function(chunk) {return rawData += chunk});
			res.on('end', function(){
				if (url.match(/\.xhtml$/)) {
					var dom = new DOMParser().parseFromString(rawData);
					var xpath = require('xpath.js');
					var head = dom.getElementsByTagName('head')[0];
					var metas = dom.getElementsByTagName('meta');
					var place = metas.length && metas[metas.length-1].nextSibling;
					var domFragment = dom.createDocumentFragment();
					var script = dom.createElement('script');
					script.appendChild(dom.createTextNode(insertCode));
					domFragment.appendChild(script);
					
					var  testMonitor= false;
					if(testMonitor){
						script = dom.createElement('script');
						script.setAttribute('src','http://localhost:8081/monitor.js')
						//script.appendChild(dom.createTextNode(insertCode));
						domFragment.appendChild(script);
					}
					
					//console.log(head+'')
					if(place && place.parentNode == head){
						//console.log('test insert before')
						head.insertBefore(domFragment,place);
					}else if(head){
						//console.log('test append child')
						head.appendChild(domFragment)
					}else{
						//console.log(head+'')
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
				console.log('update:'+dest+'/'+n.replace(/\.xhtml$/,'.html'))
				console.log(index++)
			})

		})
	}else{
		console.log('ignore file:'+n)
		index++;
	}
})

//setInterval(function(){console.log(index)},1000)
var http = require('http'),
    url = require('url'),
    fs = require('fs');
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

http.createServer(function(req, res) {
	var uri = url.parse(req.url).pathname;
	var filename = path.join(__dirname,'../', uri);
	fs.stat(filename,function(err,stat){
		if(stat.isFile()){
			var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
			res.writeHead(200, mimeType);
			var fileStream = fs.createReadStream(filename);
			fileStream.pipe(res);
		}else if(req.url.match(/\/$/)){
			fs.readdir(filename,function(err,dirs){
				res.end(dirs.join('\n').replace(/.+/g,"<a href='$&'>$&</a><hr>"))
			})
		}else{
			res.writeHead(302, {Location:req.url+'/'});
			res.end('')
		}
	})
}).listen(8081);
