var fs = require('fs');
var files = fs.readdirSync(__dirname).filter(function(n){return n.match(/\.html/)});
var contents = files.map(function(n){
	return fs.readFileSync(__dirname+'/'+n).toString();
});
//console.log(files)/
//console.log(contents)
var xss = require('xss');
var DOMParser = require('xmldom').DOMParser;
var t1 = Date.now();
contents.map(function(html){
	return xss(html)
})
var t2 = Date.now();
contents.map(function(html){
	return new DOMParser().parseFromString(html).toString();
})
var t3 = Date.now();
console.log(t2-t1,t3-t2)

console.log(xss('222 "22'))
//var html = xss('<script>alert("xss");</script>');