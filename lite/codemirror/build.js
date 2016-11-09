var uglifyjs = require('uglifyjs');
var fs = require('fs');
var path = require('path');
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
console.log(source)
fs.writeFileSync(__dirname+'/o.js',source);
//console.log(uglifyjs.minify());
//list.map()

