~function(){
	var impls = arguments;
	var idIndex = [].pop.call(impls);
	var cached = {};
	var previous_require = this.require;
	function internal_require(i){
		if(typeof i=='number'){
			var module = cached[i];
			if(!module){
				var id = "./"+i;
				module = cached[i] = {exports:{},id:id};
				impls[i](module.exports,internal_require,module,id);
			}
			return  module.exports;
		}else{
			return require(i) ;
		}
	}
	
	function external_require(path){
		var id = typeof path == 'number'?path:idIndex.indexOf(path);
		if(id>=0){
			return internal_require(id);
		}else{
			return external_require;
		}
	}
	if(previous_require && previous_require.backup){
		previous_require.backup.push(external_require)
	}else{
		this.require = function(pc){
			if(pc instanceof Function){
				var list = arguments;
				var i = list.length;
				var o = {};
				while(--i){
					copy(require(list[i]),o);
				}
				pc(o);
				return o;
			}else{
				var list = require.backup;
				var i = list.length;
				while(i--){
					var exports = list[i](pc);
					if(exports != list[i]){
						return exports
					}
				}
				return previous_require?previous_require.apply(this,arguments):{}
			}
		}
		this.require.backup = [external_require];
	}
	
	function copy(src,dest){
		for(var n in src){
			dest[n] = src[n];
		}
	}
	copy(internal_require(0),this);
}(function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

var ResultContext=require(5).ResultContext;
var URI=require(6).URI;
var defaultBase = new URI("lite:///");

/**
 * 模板解析上下文对象实现
 */
function ParseContext(config,path){
	config = config || new ParseConfig();
    this.config = config;
	this.currentURI = defaultBase;
	this.configMap = config.getConfig(path);
    this.textType=0;
	this._path = path;
	this._attributeMap = [[],[],{}]
    this._result = new ResultContext();
	this._context = this;
	this._result._context = this;
	this._resources = [];
	initializeParser(this,config.getExtensionMap(path));
}
/**
 * 初始化上下文
 * @arguments 链顶插入的解析器列表（第一个元素为初始化后的链顶解析器，以后类推）
 */
function initializeParser(context,extensionMap){
	var extensionParser = new ExtensionParser();
	//console.dir(extensionMap)
	for(var ns in extensionMap){
		var exts = extensionMap[ns];
		for(var len = exts.length,i=0;i<len;i++){
			extensionParser.addExtension(ns,exts[i])
		}
	}
	context._nodeParsers = [parseTextLeaf,parseDefaultXMLNode,parseExtension];
	context._textParsers = [extensionParser];
	context._extensionParser = extensionParser;
    context._topChain = buildTopChain(context);
}
function parseExtension(node,context,chain){//extension
	return context._extensionParser.parse(node,context,chain);
}
function parseTextLeaf(text,context){
	if(typeof text == 'string'){
		return parseText(text,context,context._textParsers)
	}else{
		console.error("未知节点类型",typeof text,text)
		//chain.next(text);
	}
}
ParseContext.prototype = {
	parseText:function(source, textType) {
		switch(textType){
		case XA_TYPE :
	    case XT_TYPE :
	    case EL_TYPE :
	        break;
	    default:
			console.error("未知编码模式："+textType)
			throw new Error();
		}
		
		var mark = this.mark();
		var oldType = this.textType;
		this._context.textType = textType;
		parseTextLeaf(source,this);
		this._context.textType = oldType;
		var result = this.reset(mark);
		return result;
	},
    /**
     * 调用解析链顶解析器解析源码对象
     * @param 文本源代码内容或xml源代码文档对象。
     * @public
     * @abstract
     */
	parse:function(source) {
		var type = source.nodeType;
		if(type>0){//xml
			//console.info(len,source && source.xml)
			this._topChain.next(source);
		}else{//text
			
			if(source instanceof URI){
				var oldURI = this.currentURI;
    			this.setCurrentURI(source);
				//console.log(source+this.loadXML)
				source = this.loadXML(source);
				if(typeof source == 'string'){
					source=source.replace(/#.*[\r\n]*/,'');
				}
			}
			if(typeof source != 'string'){
				//NodeList
				var len = source.length;
				var nodeType = source.nodeType;
				
				if(nodeType === undefined && typeof source.item != 'undefined'){//NodeList
					if(len === 0){
						return;
					}
					for(var i = 0;i<len;i++){
						this._topChain.next(source.item(i));
					}
					return;
				}
			}
			this._topChain.next(source);
			if(oldURI) this.setCurrentURI(oldURI)
		}
		
		
	},
    createURI:function(path) {
    	//console.error(path,this.currentURI,this.config.root)
    	var base = this.config.root.toString();
    	if(!path){return path}
    	path = String(path);
    	if(path.indexOf(base) ==0){
    		path = path.substring(base.length-1);
    	}
    	var cu = this.currentURI;
    	if(cu){
    		//if(cu.scheme == 'data'){
    		//	return new URI(cu);
    		//}else{
    		//console.log(path,cu)
    		//console.log('???'+cu.resolve(path))
    		return cu.resolve(path);
    		//}
    	}else{
    		path= path.replace(/^[\\\/]/,'./');// /xxx=>./xxx
    		//console.warn(defaultBase+'',path,defaultBase.resolve(path)+'',defaultBase.authority)
    		
    		//console.log(path,defaultBase)
    		//console.log('###'+defaultBase.resolve(path))
    		return defaultBase.resolve(path);
    	}
    	
    	
    },
    loadText:function(uri){
    	//only for java
    	if(uri.scheme == 'lite'){
    		var path = uri.path+(uri.query||'');
    		path = path.replace(/^\//,'./')
    		uri = this.config.root.resolve(path);
    	}
    	var xhr = new XMLHttpRequest();
	    xhr.open("GET",uri,false)
	    xhr.send('');
	    ////text/xml,application/xml...
	    return xhr.responseText;
    },
    loadXML:function(path){
    	var t1 = +new Date();
    	if(path instanceof URI){
    	}else{
    		if(/^\s*</.test(path)){
    			doc = loadLiteXML(path,this.config.root)
    		}else{
    			path = new URI(path)
    		}
    	}
    	if(path instanceof URI){
    		var doc = loadLiteXML(path,this.config.root);
    		this._context._loadTime+=(new Date()-t1);
    	}
    	var root = doc && doc.documentElement;
    	if(root){
    		root.setAttribute('xmlns:xhtml',"http://www.w3.org/1999/xhtml")
    		root.setAttribute('xmlns:c',"http://www.xidea.org/lite/core")
    	}
    	return doc;
    },
    openStream:function(uri){
//    	//only for java
//    	if(uri.scheme == 'lite'){
//    		var path = uri.path+(uri.query||'');
//    		path = path.replace(/^\//,'./')
//    		uri = this.config.root.resolve(path);
//    	}
//    	return Packages.org.xidea.lite.impl.ParseUtil.openStream(uri)
		throw new Error("only for java");
    },
	setAttribute:function(key,value){
		_setByKey(this._context._attributeMap,key,value)
	},
	getAttribute:function(key){
		return _getByKey(this._context._attributeMap,key)
	},
	addNodeParser:function(np){
		this._nodeParsers.push(np);
	},
	addTextParser:function(tp){
		this._textParsers.push(tp);
	},
	addExtension:function(ns,pkg){
		this._extensionParser.addExtension(ns,pkg);
	},
	getConfig:function(key){
		return this.configMap[key];
	},
	getConfigMap:function(){
		return this.configMap;
	},
    setCurrentURI:function(uri){
    	this._context.addResource(uri=new URI(uri));
    	this._context.currentURI = uri;
    },
    addResource:function(uri){
    	for(var rs = this._resources, i=0;i<rs.length;i++){
    		if(rs[i]+'' == uri){
    			return ;
    		}
    	}
    	this._resources.push(uri);
    },
    getResources:function(){
    	return this._resources;
    },
    createNew:function(){
    	var nc = new ParseContext(this.config,this.currentURI);
    	nc.config = this.config;
    	nc.configMap = this.configMap;
    	nc._resources = this._resources;
    	return nc;
    },
    _loadTime :0
}
var rm = ResultContext.prototype;
for(var n in rm){
	if(rm[n] instanceof Function){
		ParseContext.prototype[n] = buildResultWrapper(n);
	}
}
function buildResultWrapper(n){
	return function(){
		var result = this._result;
		return result[n].apply(result,arguments)
	}
}
function _getByKey(map,key){
	if((map = map[2]) && typeof key == 'string'){
		return key in map ? map[key]:null;
	}
	var keys = map[0];
	var values = map[1];
	var i = keys.length;
	while(i--){
		if(key == keys[i]){
			return values[i];
		}
	}
}
function _setByKey(map,key,value){
	if(map[2] && typeof key == 'string'){
		map[2][key] = value;
	}else{
		var keys = map[0];
		var values = map[1];
		var i = keys.length;
		while(i--){
			if(key == keys[i]){
				values[i] = value;
				return;
			}
		}
		keys.push(key);
		values.push(value);
	}
}

var loadLiteXML=require(7).loadLiteXML;
var buildTopChain=require(8).buildTopChain;
var ExtensionParser=require(9).ExtensionParser;
var Extension=require(10).Extension;
var parseDefaultXMLNode=require(11).parseDefaultXMLNode;
var parseText=require(12).parseText;
var XA_TYPE=require(13).XA_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var XT_TYPE=require(13).XT_TYPE;

var ParseConfig=require(14).ParseConfig;

exports.ParseContext=ParseContext;

}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
var ELSE_TYPE=require(13).ELSE_TYPE;
var TranslateContext=require(15).TranslateContext;
var Expression=require(16).Expression;
var GLOBAL_DEF_MAP ={
	"parseInt":1, 	
	"parseFloat":1, 	
	"encodeURIComponent":1, 	
	"decodeURIComponent":1, 	
	"encodeURI":1, 	
	"decodeURI":1, 	
	"isFinite":1, 	
	"isNaN":1
};
var GLOBAL_VAR_MAP ={
	"JSON":1,
	"Math":1
}
copy(GLOBAL_DEF_MAP,GLOBAL_VAR_MAP);
/**
 * @param config {waitPromise:true,liteImpl:'liteImpl'}
 * JS原生代码翻译器实现
 */
function JSTranslator(config){
	this.config = config||{};
}
/**
 * <code>

function(__context__,__out__){
	//gen function __x__(){}
	//gen defs
	function def(p1,pe){
		return [p1,'+',p2].join('')
	}
	function def(arg1){
		var __out__ = [];
		if(arg1){
			__out__.push('[',arg1,']');
		}
		return __out__.join('');
	}
	function def2(){arg2}{
		return '['+arg2+']';
	}


	//gen output1
	//return function(){

		//gen model vars
		var $var1 = __context__.var1;
		var $var2 = __context__.var2;
		var $var3 = __context__.var3;

		__out__.push($var1.x,$var2.y);
		if($var3){
			__out__.push($var3)
		}
		__out__.push($var3)
		
		....
		return __out__.join('');
	//}()



	//gen output2
	//return function(){
		//gen model vars
		var $var1 = __context__.var1;
		var $var2 = __context__.var2;
		var $var3 = __context__.var3;
		
		var it = g();
		if($var1 instanceof Promise){$var1.then(function(v){$var1 = v});}
		if($var2 instanceof Promise){$var1.then(function(v){$var12= v});}
		function next(){
			var next = it.next();
			if(next instanceof Promise){next.then(next);}
		}
		next();

		function* g(){
			yield* __out__.wait(var1,var2);
			__out__.push(var1.x,var2.y);

			yield* __out__.wait(var3);
			if(var3){
				__out__.push(var3)
			}
			__out__.push(var3)

			//bigpiple 输出
			__out__.lazy(function* __lazy__id__(__out__){
				if(var1){
					__out__.push(var1)
				}
				__out__.push(var1)
			});
			__out__.push('<div id="__lazy__id__" style="display:block" class="lazy"></div>');
			
			....
			//return __out__.join('');//__out__.end();
		}

		
	}
}
 */
JSTranslator.prototype = {
	/**
	 * @param list
	 * @param config {waitPromise:false,liteImpl:'liteImpl'}
	 */
	translate:function(list,config){
		config = config||{};
		var params = config.params;
		var functionName = config.name;
		var ctx = new JSTranslateContext(list,functionName,params,config.defaults);
		var jsConfig = this.config || {};
		var liteImpl = jsConfig.liteImpl
		ctx.waitPromise = jsConfig.waitPromise && [];
		ctx.hasBuildIn = !!liteImpl;
		ctx.liteImpl = liteImpl && (typeof liteImpl == 'string'?liteImpl:'liteImpl');
		ctx.parse();
		var code = genSource(ctx);//ctx.header +  ctx.body;
		//console.log('###'+code+'@@@')
		
		try{
		    var fn = new Function('return '+code);
		    //if(params ==null|| params.length == 0) {
		    	var scope = ctx.scope;
		    	var refMap = scope.refMap;
		    	var varMap = scope.varMap;
		    	var externalRefs = Object.keys(refMap).filter(function(n){return !(n in varMap)})
		    	if(externalRefs == 0 && params){
		    		return 'function '+(functionName||'')+'(){return '+JSON.stringify(fn()()) + '}'
		    	}
		    //}
		    
		}catch(e){
			var error = console.error("invalid code:",e,'<code>'+code+'</code>');
			code = "return ("+JSON.stringify(error)+');';
		}
		return code.replace(/<\/script>/g,'<\\/script>').replace(/^\s*[\r\n]+/,'');
	}
}
function genSource(ctx){
	var header = ctx.header;
	var body = ctx.body;
	var functionName = ctx.name;
	var params = ctx.params
	var args = params?params.join(','):'__context__,__out__';
	var result = ['function ',functionName,"(",args,'){\n',header,'\n']
    if (ctx.waitPromise) {
    	result.push("\t__g__ = __g__();",
			"function __n__(){",
				"var n = __g__.next().value;",
				"if(n instanceof Promise){",
					"n.then(__n__);console.log('is promise',n)",
				//"}else{",
					//"console.log('is not promise',n)",
					//"__n__()",
				"}",
			"};__n__();\n");
		result.push('\tfunction* __g__(){\n',body,'\n\treturn __out__.join("");\n\t}\n}\n');
	}else{
		if(params){
			
			var m = body.match(/^\s*__out__\.push\((.*?)\);?\s*$/)
			if(m){
				var item = '\treturn ['+m[1]+']'
				try{
					new Function(item)
					if(item.indexOf(',')>0){
						result.push(item,'.join("");\n}')
					}else{
						result.push('\treturn ',m[1],';\n}');
					}
					
					return result.join('');
				}catch(e){}
				
			}
			result.push('\tvar __out__ = [];\n');
		}else{
			result.push('\tvar __out__ = __out__||[];\n');
		}
		result.push(body,'\n\treturn __out__.join("");\n}\n');
	}
	return result.join('');
}


/**
 * 增加默认参数值支持。defaults
 */
function genDecFunction(contents,functionName,params,defaults,modelVarsDec){
	var modelVarsDecAndParams = modelVarsDec.concat();
	//生成参数表
	var args = params?params.join(','):'__context__';
	if(params && defaults && defaults.length){
		//处理默认参数
		modelVarsDecAndParams.push('\tswitch(arguments.length){\n');
		var begin = params.length - defaults.length
		for(var i =0;i<params.length;i++){
			modelVarsDecAndParams.push('\t	case ',i,':\n');
			if(i>=begin){
				modelVarsDecAndParams.push('\t	',params[i],'=',JSON.stringify(defaults[i-begin]),';\n');
			}
		}
		modelVarsDecAndParams.push('\t}\n');
	}

	//优化内容（合并join 串）
	var source = contents.join('')
	var SP = /^\s*\__out__\.push\((?:(.*)\)\s*;?)\s*$/g;
	if(SP.test(source)){
		var c  =source.replace(SP,'$1');
		if(c.indexOf(',')>0){
			//安全方式吧.
			source = "\treturn ["+c+"].join('');";
		}else{
			source = "\treturn "+c+';';
		}
	}else{
		source = "\tvar __out__=[]\n"+source.replace(/^\s*\n|\s*\n\s*$/g,'')+"\n\treturn __out__.join('');\n";
	}
	return 'function '+functionName+"("+args+'){\n'+modelVarsDecAndParams.join('')+source.replace(/^[\r\n]+/,'')+'\n}\n'
}

function genModelDecVars(ctx,scope,params){
	var result = [];
	var map = {};
	var refMap = scope.externalRefMap;
	var callMap = scope.callMap;

	var varMap = scope.varMap;
	var paramMap = scope.paramMap;
	//console.log('genModelDecVars::::',params)
	copy(refMap,map);
	//copy(callMap,map);
	var vars = [];
	for(var n in map){
		if(n != '*' && !((n in GLOBAL_VAR_MAP)|| (n in varMap) || (n in paramMap))){
			if(params){//no __context__
				//result.push('\tvar ',n,'=',ctx.liteImpl,'["',n,'"];\n');
			}else{
				//result.push('\tvar ',n,'=("',n,'" in __context__? __context__:',ctx.liteImpl,')["',n,'"];\n');
				result.push('\tvar ',n,'=("',n,'" in __context__?__context__:this)["',n,'"];\n');
				vars.push(n);
			}
			
		}
	}
	if(!params && ctx.waitPromise){
		result.push(vars.join('\n').replace(/.+/mg,'\tif($& instanceof Promise){$&.then(function(v){$& = v});}'),'\n');
	}
	

	/**
	 	
		if($var1 instanceof Promise){$var1.then(function(v){$var1 = v});}
		if($var2 instanceof Promise){$var1.then(function(v){$var12= v});}
		
		
	 */
	return result;
}
/**
 * 构建内容头部
 */
function genBuildInSource(ctx){
	if(ctx.hasBuildIn){return ''}
	var buf = [''];
	var c = ctx.xmlEncoder + ctx.entityEncoder*2;
	if(c){
		if(c>3){
			ctx.optimizedEncoder = true;
			buf.push("	function __x__(source,e){return String(source).replace(e||/&(?!#\\d+;|#x[\\da-f]+;|[a-z]+;)|[<\"]/ig,function(c){return '&#'+c.charCodeAt()+';'});}\n");
		}else{
			buf.push(" 	function __r__(c){return '&#'+c.charCodeAt()+';'}\n");
		}
	}
	
	if(ctx.safeGetter){
		buf.push('	function __get__(o,p,a){try{return a?o[p].apply(o,a):o[p]}catch(e){return e}}\n')
	}
	//if(ctx.entityEncoder){buf.push( 'var __e__ = __x__;\n');}
	if(ctx.forStack.hit){
		//ie7,ie8
		buf.push("	if(!Object.keys)Object.keys=function(o){var r=[];for(var n in o){r.push(n)};return r;};\n")
	}
	
	var df = ctx.dateFormat;
	if(df.hit){
var dlstart = df.isFixLen?'__dl__(':''	
var dlend = df.isFixLen?',format.length)':''	
if(dlstart)	buf.push("	function __dl__(date,len){return len > 1? ('000'+date).slice(-len):date;}\n");
if(df.T)		buf.push("	function __tz__(offset){return offset?(offset>0?'-':offset*=-1,'+')+__dl__(offset/60,2)+':'+__dl__(offset%60,2):'Z'}\n");
if(df)			buf.push("	function __df__(pattern,date){\n");
if(df)			buf.push("		date = date?new Date(date):new Date();\n");
if(df)			buf.push("	        return pattern.replace(/",
												df.qute?"'[^']+'|\"[^\"]+\"|":'',
												"([YMDhms])\\1*",
												df['.']?"|\\.s":'',
												df.T?"|TZD$":'',
												"/g,function(format){\n");
if(df)			buf.push("	            switch(format.charAt()){\n");
if(df.Y)			buf.push("	            case 'Y' :return ",dlstart,"date.getFullYear()",dlend,";\n");
if(df.M)			buf.push("	            case 'M' :return ",dlstart,"date.getMonth()+1",dlend,";\n");
if(df.D)			buf.push("	            case 'D' :return ",dlstart,"date.getDate()",dlend,";\n");
if(df.h)			buf.push("	            case 'h' :return ",dlstart,"date.getHours()",dlend,";\n");
if(df.m)			buf.push("	            case 'm' :return ",dlstart,"date.getMinutes()",dlend,";\n");
if(df.s)			buf.push("	            case 's' :return ",dlstart,"date.getSeconds()",dlend,";\n");
if(df['.'])			buf.push("	            case '.':return '.'+",dlstart,"date.getMilliseconds(),3);\n");
if(df.T)			buf.push("	            case 'T':return __tz__(date.getTimezoneOffset());\n");
if(df.qute)			buf.push("	            case '\'':case '\"':return format.slice(1,-1);\n");
if(df)				buf.push("	            default :return format;\n");
if(df)			buf.push("	            }\n");
if(df)			buf.push("	        });\n");
if(df)			buf.push("	    }\n");
	}
	return buf.join('');
}


function createDateFormat(ctx,pattern,date){
	var df = ctx.dateFormat;
	var patternSample=pattern[1];
	var maxLen = 0;
	if(pattern[0] != -1){//非常量,JSEL:VALUE_CONSTANTS
		patternSample='YYMMDDhhmmss.sTZD';
	}
	patternSample.replace(/([YMDhms])\1*|\.s|TZD/g,function(c){
		len = c.length;
		c = c.charAt();
		if(c == '"' || c== '\''){
			df.qute = 1;
		}
		maxLen = Math.max(maxLen,df[c]=Math.max(df[c]||0,len));
	})
	//变量 ，JSEL:VALUE_VAR
	df.isEL = df.isEL || date[0] != -2;
	df.isFixLen = df.isFixLen || maxLen>1;
	df.hit ++;
	pattern = ctx.stringifyEL(pattern);
	date = ctx.stringifyEL(date)
	return {toString:function(){
		return '__df__('+pattern+','+date+')';
	}}
}

function JSTranslateContext(code,name,params,defaults){
    TranslateContext.call(this,code,name,params,defaults);
    this.forStack = [];
    this.defaults = defaults;
    
	this.xmlEncoder = 0;
	this.entityEncoder=0;
	this.dateFormat = {hit:0};
	this.safeGetter = {hit:0}
}
JSTranslateContext.prototype = new TranslateContext();


JSTranslateContext.prototype.parse=function(){
	var params = this.params;
	this.out = [];
    //add function
    var defs = this.scope.defs;
    var thiz = this;
    var defVars = []
    //生成函数定义
    for(var i=0;i<defs.length;i++){
        var def = this.scope.defMap[defs[i]];
        this.outputIndent=1;
        this.appendCode(def.code);
        var vars = genModelDecVars(this,def,def.params);
        var contents = thiz.reset();

        //添加一个函数
        defVars.push({
        	params:def.params,
        	defaults:def.defaults,
        	vars:vars,
        	name:def.name,
        	toString:function(){
        		var fn = genDecFunction(contents,this.name,def.params,def.defaults,[]);
        		return String(fn).replace(/^(.)/mg,'\t$1');
        	}});
    }
    try{
    	this.outputIndent=0;
    	this.outputIndent++;
        this.appendCode(this.scope.code);
        this.outputIndent--;
    }catch(e){
        //alert(["编译失败：",buf.join(""),this.scope.code])
        throw e;
    }
    
    //放在后面，这时 如下信息是正确的！
	// this.xmlEncoder = 0;
	//this.entityEncoder=0;
	//this.dateFormat = {hit:0};
	//this.forStack.hit = true
	var  headers = [];
    var headers = genModelDecVars(this,this.scope,this.params);
	var buildIn = genBuildInSource(this);
	if(buildIn){
		headers.unshift(buildIn);
	}
    this.header = headers.concat(defVars).join('');
    //vars.unshift(fs.join(''));
    this.body = this.reset().join('').replace(/^[\r\n]+/,'')////;optimizeFunction(this.reset(),this.name,this.params,this.defaults,vars.concat(defVars));
}

JSTranslateContext.prototype.appendStatic = function(item){
	appendOutput(this,JSON.stringify(item));
}
JSTranslateContext.prototype.appendEL=function(item){
	appendOutput(this,this.stringifyEL(item[1]))
}
JSTranslateContext.prototype.appendXT=function(item){
    appendOutput(this,createXMLEncoder(this,item[1]))
}
JSTranslateContext.prototype.appendXA=function(item){
    //[7,[[0,"value"]],"attribute"]
    var el = item[1];
    var value = this.stringifyEL(el);
    var attributeName = item.length>2 && item[2];
    if(attributeName){
    	var testId = this.allocateId(value);
    	if(testId != value){
    		el = new Expression(testId).token;
        	this.append("var ",testId,"=",value);
    	}
        this.append("if(",testId,"!=null){");
        this.pushBlock();
        appendOutput(this,"' "+attributeName+"=\"'",createXMLEncoder(this,el,true),"'\"'");
        this.popBlock();
        this.append("}");
        this.freeId(testId);
    }else{
    	appendOutput(this,createXMLEncoder(this,el,true))
    }
}
JSTranslateContext.prototype.appendVar=function(item){
    this.append("var ",item[2],"=",this.stringifyEL(item[1]),";");
},
JSTranslateContext.prototype.appendEncodePlugin=function(item){//&#233;&#0xDDS;
    appendOutput(this,createEntityEncoder(this,item[1]));
},
JSTranslateContext.prototype.appendDatePlugin=function(pattern,date){//&#233;&#0xDDS;
    appendOutput(this,createDateFormat(this,pattern[1],date[1]))
}
JSTranslateContext.prototype.processCapture = function(item){
    var childCode = item[1];
    if(childCode.length == 1 && childCode[0].constructor == String){
    	item[1] = JSON.stringify(childCode[0]);
    	this.appendVar(item);
    }else{
    	var varName = item[2];
    	var bufbak = this.allocateId();
    	this.append("var ",bufbak,"=__out__;__out__=[];");
    
    	this.appendCode(childCode);
    	this.append("var ",varName,"=__out__.join('');__out__=",bufbak,";");
    	this.freeId(bufbak);
    }
},
JSTranslateContext.prototype.processIf=function(code,i){
    var item = code[i];
    var childCode = item[1];
    var testEL = item[2];
    var test = this.stringifyEL(testEL);
    //var wel = genWaitEL(this,testEL);visited el before function call
    //this.append('if(',wel?'('+wel+')||('+test+')':test,'){');
    this.append('if(',test,'){');
    this.pushBlock();
    this.appendCode(childCode)
    this.popBlock();
    this.append("}");
    var nextElse = code[i+1];
    var notEnd = true;
    this.pushBlock(true);
    while(nextElse && nextElse[0] == ELSE_TYPE){
        i++;
        var childCode = nextElse[1];
        var testEL = nextElse[2];
        var test = this.stringifyEL(testEL);
        
        if(test){
        	var wel = genWaitEL(this,testEL);
            this.append('else if(',wel?'('+wel+')||('+test+')':test,'){');
        }else{
            notEnd = false;
            this.append("else{");
        }
        this.pushBlock();
        this.appendCode(childCode)
        this.popBlock();
        this.append("}");
        nextElse = code[i+1];
    }
    this.popBlock(true);
    return i;
}
JSTranslateContext.prototype.processFor=function(code,i){
	this.forStack.hit = true;
    var item = code[i];
    var indexId = this.allocateId();
    var lastIndexId = this.allocateId();
    var itemsId = this.allocateId();
    var itemsEL = this.stringifyEL(item[2]);
    var varNameId = item[3]; 
    //var statusNameId = item[4]; 
    var childCode = item[1];
    var forInfo = this.findForStatus(item)
    //初始化 items 开始
    this.append("var ",itemsId,'=',itemsEL,';');
    this.append("var ",indexId,"=0;")
    this.append("var ",lastIndexId," = (",
    	itemsId,'=',itemsId,' instanceof Array?',itemsId,':Object.keys(',itemsId,')'
    	,").length-1;");
    
    //初始化 for状态
    var forRef = forInfo.ref ;
    var forAttr = forInfo.index || forInfo.lastIndex;
    if(forRef){
   		var statusId = this.allocateId();
        this.forStack.unshift([statusId,indexId,lastIndexId]);
        this.append("var ",statusId," = {lastIndex:",lastIndexId,"};");
    }else if(forAttr){
        this.forStack.unshift(['for',indexId,lastIndexId]);
    }
    this.append("for(;",indexId,"<=",lastIndexId,";",indexId,"++){");
    this.pushBlock();
    if(forRef){
        this.append(statusId,".index=",indexId,";");
    }
    this.append("var ",varNameId,"=",itemsId,"[",indexId,"];");
    this.appendCode(childCode);
    this.popBlock();
    this.append("}");
    
    var nextElse = code[i+1];
    var notEnd = true;
    var elseIndex = 0;
    this.pushBlock(true);
    while(notEnd && nextElse && nextElse[0] == ELSE_TYPE){
        i++;
        elseIndex++;
        var childCode = nextElse[1];
        var testEL = nextElse[2];
        var test = this.stringifyEL(testEL);
        var ifstart = elseIndex >1 ?'else if' :'if';
        if(test){
        	var wel = genWaitEL(this,testEL);
            this.append(ifstart,
            	'(',wel?'('+wel+')|| !':'!'
            			,indexId,'&&(',test,')){');
        }else{
            notEnd = false;
            this.append(ifstart,"(!",indexId,"){");
        }
        this.pushBlock();
        this.appendCode(childCode)
        this.popBlock();
        this.append("}");
        nextElse = code[i+1];
    }
    this.popBlock(true);
    
	if(forRef){
		this.freeId(statusId);
		this.forStack.shift();
	}else if(forAttr){
		this.forStack.shift();
	}
    this.freeId(lastIndexId);
    this.freeId(itemsId);;
    this.freeId(indexId);
    return i;
}
JSTranslateContext.prototype.pushBlock = function(ignoreIndent){
	if(!ignoreIndent){
		this.outputIndent++
	}
	var waitPromise = this.waitPromise;
	if(waitPromise){
		var topStatus = waitPromise[waitPromise.length-1]
		waitPromise.push(topStatus?topStatus.concat():[])
	}
}
JSTranslateContext.prototype.popBlock = function(ignoreIndent){
	if(!ignoreIndent){
		this.outputIndent--;
	}
	if(this.waitPromise){
		this.waitPromise.pop()
	}
}

JSTranslateContext.prototype.appendModulePlugin = function(child,config){
	if(this.waitPromise){
		this.append('__out__.lazy(function* __lazy_module_',config.id,'__(__out__){');
		this.pushBlock();//TODO:lazy push, 最后执行的元素可以最后检测waitEL
		this.appendCode(child)
		this.popBlock();
		this.append('})');
	}else{
		this.appendCode(child)
	}
}
JSTranslateContext.prototype.stringifyEL= function (el){
	return el?new Expression(el).toString(this):null;
};

JSTranslateContext.prototype.visitEL= function (el,type){
	el = el && genWaitEL(this,el);
	el && this.append(el);
};

JSTranslateContext.prototype.getVarName = function(name){
	return name;
};
JSTranslateContext.prototype.getForName = function(){
	var f = this.forStack[0];
	return f && f[0];
};
JSTranslateContext.prototype.genGetCode = function(owner,property){

	//safe
	if(this.safeGetter){
		this.safeGetter.hit = true;
		return '__get__('+owner+','+property+')'
	}else{
		//fast
		if(/^"[a-zA-Z_\$][_\$\w]*"$/.test(property)){
			return owner+'.'+property.slice(1,-1);
		}else{
			return owner+'['+property+']';
		}
	}
};

JSTranslateContext.prototype.findForAttribute= function(forName,forAttribute){
	var stack = this.forStack;
	var index = forName == 'index'?1:(forName == 'lastIndex'?2:0);
	for(var i=0;index && i<stack.length;i++){
		var s = stack[i];
		if(s && s[0] == forName){
			return s[index];
		}
	}
}

function genWaitEL(ctx,el){
	if(ctx.waitPromise){
		var topWaitedVars = ctx.waitPromise[ctx.waitPromise.length-1];
		if(topWaitedVars){
		    var vars = Object.keys(new Expression(el).getVarMap());
		    var vars2 = [];
		    for(var i=0;i<vars.length;i++){
		    	var v = vars[i];
		    	if(v != 'for' && topWaitedVars.indexOf(v)<0){
		    		vars2.push(v)
		    		topWaitedVars.push(v)
				}
		
		    }
		    if (vars2.length) {
		    	return 'yield* __out__.wait('+vars2.join(',')+')'
		    };
			}
	}
    
}
function appendOutput(ctx){
	var outList = ctx.out;
	var lastOutGroup = ctx._lastOutGroup;//不能用闭包var代替
	var lastIndex = outList.length-1;
	var args = outList.splice.call(arguments,1);
	if(lastOutGroup &&  outList[lastIndex] === lastOutGroup){
		lastOutGroup.list.push.apply(lastOutGroup.list,args)
	}else{
		ctx.append(ctx._lastOutGroup = new OutputGroup(args));
	}
}

function OutputGroup(args){
	this.list = args;
}
OutputGroup.prototype.toString = function(){
	return '__out__.push(' + this.list.join(',')+');'
}

function createXMLEncoder(thiz,el,isAttr){
	thiz.xmlEncoder ++;
	el = thiz.stringifyEL(el);
	return {toString:function(){
		var e = (isAttr?'/[&<\\"]/g':'/[&<]/g');
		if(thiz.optimizedEncoder||thiz.hasBuildIn){
			return '__x__('+el+','+e+')';
		}else{
			return 'String('+el+').replace('+e+',__r__)'
		}
	}}
}
function createEntityEncoder(thiz,el){
	el = thiz.stringifyEL(el);
	thiz.entityEncoder ++;
	return {
		toString:function(){
		if(thiz.optimizedEncoder || thiz.hasBuildIn){
			return '__x__('+el+')';
		}else{
			return 'String('+el+').replace(/&(?!#\\d+;|#x[\\da-f]+;|[a-z]+;)|[<"]/ig,__r__)'
		}
	}}
}



function copy(source,target){
	for(var n in source){
		target[n] = source[n];
	}
}
exports.JSTranslator=JSTranslator;
exports.GLOBAL_DEF_MAP=GLOBAL_DEF_MAP;
exports.GLOBAL_VAR_MAP=GLOBAL_VAR_MAP;

}
,
function(exports,require){if(typeof require == 'function'){
var XA_TYPE=require(13).XA_TYPE;
var ELSE_TYPE=require(13).ELSE_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var XT_TYPE=require(13).XT_TYPE;

var TranslateContext=require(15).TranslateContext;
var getELType=require(17).getELType;
var TYPE_ANY=require(17).TYPE_ANY;
var TYPE_BOOLEAN=require(17).TYPE_BOOLEAN;
var TYPE_NULL=require(17).TYPE_NULL;
var TYPE_NUMBER=require(17).TYPE_NUMBER;

var GLOBAL_DEF_MAP=require(1).GLOBAL_DEF_MAP;
var GLOBAL_VAR_MAP=require(1).GLOBAL_VAR_MAP;
}/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

/**
 * 将Lite中间代码转化为直接的php代码
 * 
 * function index_xhtml_php($__engine,$__context){
 * 	$encodeURIComponent = 'lite_encodeURIComponent';	
 * 	$decodeURIComponent = 'lite_decodeURIComponent';	
 *  $key = null;
 *  $key2 = null;
 *  $test = 'index_xhtml_php__test';
 *  extract($__context);
 *  
 *   
 * }
 * function index_xhtml_php__test($__engine,$arg1,$arg2){
 *  	
 * }
 */

var FOR_STATUS_KEY = '$__for';
var VAR_LITE_TEMP="$__tmp";
var ENCODING_KEY = 'http://www.xidea.org/lite/features/encoding';
var CONTENT_TYPE_KEY = 'http://www.xidea.org/lite/features/content-type';
var I18N_KEY = 'http://www.xidea.org/lite/features/i18n';

//function checkEL(el){
//    new Function("return "+el)
//}

/**
 * JS原生代码翻译器实现
 */
function PHPTranslator(option,data){
	this.waitPromise = option.waitPromise;
    this.id = (option.path||option).replace(/[\/\-\$\.!%]/g,'_');
    this.featureMap = {}
    if(data){
    	this.resource=data[0]
    	this.code = data[1];
    	this.featureMap = data[2];
    }
}

PHPTranslator.prototype = {
	translate:function(list){
	    //var result =  JSON.stringify(context.toList())
		var context = new PHPTranslateContext(list||this.code,this.id);
		context.waitPromise = this.waitPromise;
		context.elPrefix = '';//:
							//'@';//*/
		
		context.encoding = this.featureMap && this.featureMap[ENCODING_KEY] ||"UTF-8";
	    context.htmlspecialcharsEncoding = context.encoding ;
	    var contentType = this.featureMap && this.featureMap[CONTENT_TYPE_KEY];
	    context.contentType = contentType;
	    context.i18n = this.featureMap[I18N_KEY]
	    context.resource = this.resource;
		context.parse();
		var code = context.toSource();
	    return '<?php'+code ;
		
	}
}
function PHPTranslateContext(code,id){
    TranslateContext.call(this,code,null);
    this.id = id;
}
function TCP(pt){
	for(var n in pt){
		this[n] = pt[n];
	}
}
TCP.prototype = TranslateContext.prototype;
function toArgList(params,defaults){
	if(params.length){
		if(defaults && defaults.length){
			params = params.concat();
			var i = params.length;
			var j = defaults.length;
			while(j--){
				params[--i] += '='+stringifyPHP(defaults[j]);
			}
		}
		return '$'+params.join(',$')
	}else{
		return '';
	}
}
function _stringifyPHPLineArgs(line){//.*[\r\n]*
	var endrn="'";
	line = line.replace(/['\\]|(\?>)|([\r\n]+$)|[\r\n]/gm,function(a,pend,lend){
		if(lend){
			endrn  = '';
			return "',"+JSON.stringify(a);
		}else if(pend){
			return "?','>";
		}else{//'\\
			if(a == '\\'){
				return '\\\\';
			}else if(a == "'"){
				return "\\'";
			}else{
				console.error("非法输出行!!"+JSON.stringify(line));
			}
			return a == '\\'?'\\\\': "\\'";
		}
	});
	line = "'"+line+endrn;
	if("''," == line.substring(0,3)){
		line = line.substring(3)
	}
	return line;
}

function _encodeEL(text,model,encoding){
	//TODO: check el type
	if(model == -1){
		var encode = "htmlspecialchars("+text+",ENT_COMPAT,"+encoding+",false)";
		//this.append(prefix,"strtr(",el,",array('<'=>'&lt;','\"'=>'&#34;'));");
	}else if(model == XA_TYPE){
		var encode = "htmlspecialchars("+text+",ENT_COMPAT,"+encoding+')';
	}else if(model == XT_TYPE){
		//ENT_COMPAT 
		var encode = "htmlspecialchars("+text+",ENT_NOQUOTES,"+encoding+')';
	}else{
		var encode = text;
	}
	return encode;
}

function _appendFunctionName(context,scope){
	for(var n in scope.refMap){
		if(!(n in scope.varMap || n in scope.paramMap)){
			if(n in GLOBAL_DEF_MAP){
				context.append('$',n,"='",n,"';");
			}else if(n in GLOBAL_VAR_MAP){
			}else{
				context.append('$',n,"=function_exists('lite__",n,"')?'",n,"':null;");
			}
		}
	}
}
PHPTranslateContext.prototype = new TCP({
	stringifyEL:function (el){
		return el?stringifyPHPEL(el,this):null;
	},
	parse:function(){
		this.depth = 0;
		this.out = [];
	    //add function
	    var defs = this.scope.defs;
	    
	    for(var i=0;i<defs.length;i++){
	        var def = this.scope.defMap[defs[i]];
	        var n = def.name;
	        this.append("if(!function_exists('lite__",n,"')){function lite__",
	        		n,"(",toArgList(def.params,def.defaults),'){')
	        this.depth++;
	        this.append("ob_start();");
	        _appendFunctionName(this,def);
	        this.appendCode(def.code);
    		this.append("$rtv= ob_get_contents();ob_end_clean();return $rtv;");
	        this.depth--;
	        this.append("}}");
	    }
	    try{
	        this.append("function lite_template",this.id,'($__context__){')
	        this.depth++;
			if(this.contentType){
				this.append("if(!headers_sent())header('ContentType:"+this.contentType+"');")
			}
			this.append("mb_internal_encoding('"+this.encoding+"');")
			_appendFunctionName(this,this.scope);
			
			this.append("extract($__context__,EXTR_OVERWRITE);");
			if(this.i18n && this.resource){
				var i18ncode = new Function("return "+this.i18n)();
				var resource = this.resource;
				var resourceMap = {};
				var resourceList = [];
				for(var i=0;i<resource.length;i++){
					resourceMap[i18nHash(resource[i],'_').slice(0,-1)] = resource[i]
				}
				console.warn(resource,resourceMap)
				for(var n in i18ncode){
					n = n.substring(0,n.indexOf('__')+2);
					if(n in resourceMap){
						resourceList.push(n.slice(0,-2));
						delete resourceMap[n];
					}
				}
				this.append("$I18N = "+stringifyPHP(resourceList).replace(/^array/,'lite_i18n')+";")
				this.append("$I18N = array_merge("+stringifyPHP(i18ncode)+",$I18N);")
			}
	        this.appendCode(this.scope.code);
	        if(this.__lazy_module_){
    			this.append('lite_lazy_block($__lazy_module_);');
    		}
	        this.depth--;
	        this.append("}");
	    }catch(e){
	        //alert(["编译失败：",buf.join(""),code])
	        console.error("PHP编译失败:"+this.id,e);
	        throw e;
	    }
	    //this.append("return _$out.join('');");
	},
	appendStatic:function(value){
		//return this.append("?>"+value+"<?php");
		var lines = value.match(/.+[\r\n]*|[\r\n]+/g);
		for(var i=0; i<lines.length; i++) {
			var line = lines[i];
			var start = i==0?'echo ':'\t,'
			var end = i == lines.length-1?';':'';
			line = _stringifyPHPLineArgs(line);
			this.append(start,line,end);
		}
	},
    _appendEL:function(el,model,text,prefix){
    	var encoding = "'"+this.htmlspecialcharsEncoding+"'";
    	prefix = prefix!=null? prefix : 'echo '
    	//@see http://notownme.javaeye.com/blog/335036
    	var text = text || this.stringifyEL(el);
    	var type = getELType(el);
    	//null,boolean
    	
		if(isSimplePHPEL(text)){//var encode = 
			var initText = text;
			var tmpId = text;
		}else{
			tmpId = VAR_LITE_TEMP;
			initText = '('+tmpId+'='+text+')';
		}
    	if(type != TYPE_ANY){
	    	if(type == TYPE_NULL){
	    		this.append(prefix,"'null';");
	    		return;
	    	}else if(type == TYPE_BOOLEAN){
	    		this.append(prefix,text,"?'true':'false';");
	    		return;
	    	}else if(type == TYPE_NUMBER){
	    		this.append(prefix,text,";");
	    		return;
	    	}
	    	//
			if((TYPE_NULL|TYPE_BOOLEAN)==type){//onlu null boolean
				this.append(prefix,initText,"?'true':(",tmpId,"===null?'null':'false');");
				return;
			}else if(!((TYPE_NULL|TYPE_BOOLEAN) & type)){//number,string,map,array...
	    		this.append(prefix,_encodeEL(text,model,encoding),";");
	    		return;
	    	}
			//v1=== null?'null':(v===true?'true':(v == false ?'false':txt))
			if(!(type & TYPE_NULL)){
				this.append(prefix,
	    			initText," === true?'true':",
	    				"(",tmpId,"===false?'false':",_encodeEL(tmpId,model,encoding),");");
	    		return ;
			}else if(!(type & TYPE_BOOLEAN)){
	    		this.append(prefix,
	    			initText,"===null?'null':",_encodeEL(tmpId,model,encoding),";");
	    		return ;
			}
    	}
//    	this.append(prefix,
//    		initText," ===null?'null':",
//    		"(",tmpId," === true?'true':",
//    			"(",tmpId,"===false?'false':",_encodeEL(tmpId,model,encoding),"));");
		this.append(prefix,'(',initText,'===null||',tmpId,'===false || ',tmpId,'===true)?json_encode(',tmpId,'):',_encodeEL(tmpId,model,encoding),';')
    },
    appendEL:function(item){
    	this._appendEL(item[1],EL_TYPE)
    },
    appendXT:function(item){
    	this._appendEL(item[1],XT_TYPE)
    },
    appendXA:function(item){
        //[7,[[0,"value"]],"attribute"]
        var el = item[1];
        var value = this.stringifyEL(el);
        var attributeName = item.length>2 && item[2];
        var testAutoId = this.allocateId(value);
        if(testAutoId != value){
            this.append(testAutoId,"=",value,';');
        }
        if(attributeName){
            this.append("if(",testAutoId,"!=null){");
            this.depth++;
            this.append("echo ' "+attributeName+"=\"';");
            this._appendEL(el,XA_TYPE,testAutoId)
            this.append("echo '\"';");
            this.depth--;
            this.append("}");
        }else{
        	this._appendEL(el,XA_TYPE,testAutoId);
        }
        this.freeId(testAutoId);
    },
    appendVar:function(item){
        this.append("$",item[2],"=",this.stringifyEL(item[1]),";");
    },
    processCapture:function(item){
        var childCode = item[1];
        var varName = item[2];
	    this.append("ob_start();");
	    this.appendCode(childCode);
	    this.append("$",varName,"= ob_get_contents();ob_end_clean();");
    },
    appendEncodePlugin:function(item){
    	this._appendEL(item[1],-1,this.stringifyEL(item[1]));
    },
    appendDatePlugin:function(pattern,date){//&#233;&#0xDDS;
    	//this.impl_counter.d++;
    	var pattern = this.stringifyEL(pattern[1]);
    	var date = this.stringifyEL(date[1]);
    	if(/^(?:'[^']+'|"[^"]+")$/.test(pattern)){
    		date = date + ',true';
    	}
        this.append('echo lite__2(',pattern,',',date,');')
    },
    appendModulePlugin:function(child,config){
		if(this.waitPromise){
			this.append("ob_start();");
			//this.append('__out__.lazy(function* __lazy_module_',config.id,'__(__out__){');
			this.outputIndent++;
			this.appendCode(child)
			this.outputIndent--;
			//this.append('})');
			if(this.__lazy_module_){
				this.append('array_push($__lazy_module_,'+config.id+');');
				this.append('array_push($__lazy_module_,ob_get_contents());');
			}else{
				this.append('$__lazy_module_=array('+config.id+',ob_get_contents());')
			}
			this.append('ob_end_clean();');
			this.__lazy_module_ = true;
		}else{
			this.appendCode(child)
		}
    },
    processIf:function(code,i){
        var item = code[i];
        var childCode = item[1];
        var testEL = item[2];
        var test = this.stringifyEL(testEL);
        this.append("if(",php2jsBoolean(testEL,test),"){");
        this.depth++;
        this.appendCode(childCode)
        this.depth--;
        this.append("}");
        var nextElse = code[i+1];
        var notEnd = true;
        while(nextElse && nextElse[0] == ELSE_TYPE){
            i++;
            var childCode = nextElse[1];
            var testEL = nextElse[2];
            var test = this.stringifyEL(testEL);
            if(test){
                this.append("else if(",php2jsBoolean(testEL,test),"){");
            }else{
                notEnd = false;
                this.append("else{");
            }
            this.depth++;
            this.appendCode(childCode)
            this.depth--;
            this.append("}");
            nextElse = code[i+1];
        }
        return i;
    },
    processFor:function(code,i){
        var item = code[i];
        var indexAutoId = this.allocateId();
        var keyAutoId = this.allocateId();
        var isKeyAutoId = this.allocateId();
        var itemsEL = this.stringifyEL(item[2]);
        var varName = '$'+item[3]; 
        //var statusNameId = item[4]; 
        var childCode = item[1];
        var forInfo = this.findForStatus(item)
        if(forInfo.depth){
            var preForAutoId = this.allocateId();
        }
        if(/^\$[\w_]+$/.test(itemsEL)){
        	var itemsAutoId = itemsEL;
        }else{
        	var itemsAutoId = this.allocateId();
        	this.append(itemsAutoId,'=',itemsEL,';');
        }
        //初始化 items 开始
	    this.append('if(',itemsAutoId,'<=PHP_INT_MAX){',itemsAutoId,'=',itemsAutoId,'>0?range(1,',itemsAutoId,'):array();}');
        //初始化 for状态
        var needForStatus = forInfo.ref || forInfo.index || forInfo.lastIndex;
        if(needForStatus){
            if(forInfo.depth){
                this.append(preForAutoId ,"=",FOR_STATUS_KEY,";");
            }
            this.append(FOR_STATUS_KEY," = array('lastIndex'=>count(",itemsAutoId,")-1);");
        }
        
        this.append(indexAutoId,"=-1;")
        this.append(isKeyAutoId,'=false;')
        this.append("foreach(",itemsAutoId," as ",keyAutoId,"=>",varName,"){");
        this.depth++;
	    this.append("if(++",indexAutoId," === 0){");
        this.depth++;
	    this.append(isKeyAutoId,"=",keyAutoId," !== 0;");
        this.depth--;
	    this.append("}");
	    this.append("if(",isKeyAutoId,"){",varName,'=',keyAutoId,";}");
        
        if(needForStatus){
            this.append(FOR_STATUS_KEY,"['index']=",indexAutoId,";");
        }
        this.appendCode(childCode);
        this.depth--;
        this.append("}");//end for
        
        
        if(needForStatus && forInfo.depth){
           this.append(FOR_STATUS_KEY,"=",preForAutoId,';');
        }
        this.freeId(isKeyAutoId);
        this.freeId(keyAutoId);
        this.freeId(itemsAutoId);
        if(forInfo.depth){
            this.freeId(preForAutoId);
        }
        var nextElse = code[i+1];
        var notEnd = true;
        var elseIndex = 0;
        while(notEnd && nextElse && nextElse[0] == ELSE_TYPE){
            i++;
            elseIndex++;
            var childCode = nextElse[1];
            var testEL = nextElse[2];
            var test = this.stringifyEL(testEL);
            var ifstart = elseIndex >1 ?'else if' :'if';
            if(test){
                this.append(ifstart,"(",indexAutoId,"<0&&",php2jsBoolean(testEL,test),"){");
            }else{
                notEnd = false;
                this.append(ifstart,"(",indexAutoId,"<0){");
            }
            this.depth++;
            this.appendCode(childCode)
            this.depth--;
            this.append("}");
            nextElse = code[i+1];
        }
        this.freeId(indexAutoId);
        return i;
    },
    toSource:function(){
    	return this.out.join('');
    }
});
if(typeof require == 'function'){
exports.PHPTranslator=PHPTranslator;
var php2jsBoolean=require(18).php2jsBoolean;
var isSimplePHPEL=require(18).isSimplePHPEL;
var stringifyPHP=require(18).stringifyPHP;
var stringifyPHPEL=require(18).stringifyPHPEL;
var i18nHash=require(19).i18nHash;
}
}
,
function(exports,require,module){function Template(code,config){
 	//console.log(code)
 	
	try{
    	this.impl = eval('['+code+'][0]');
    }catch(e){
    	//console.error(config.path,require('util').inspect(e,true)+'\n\n'+(e.message +e.stack));
    	this.impl = function(){throw e;};
    }
    this.config = config;
    this.contentType = config.contentType;
    this.encoding = config.encoding;
}
Template.prototype.render = function(context,response){
	try{
		this.impl.call(null,context,wrapResponse(response));
	}catch(e){
		console.warn(this.impl+'');
		var rtv = require(4).inspect(e,true)+'\n\n'+(e.message +e.stack);
		response.end(rtv);
		throw e;
	}
}
function wrapResponse(resp){
	
	var lazyList = [];
	var buf=[];
	var bufLen=0;
	return {
		push:function(){
			for(var len = arguments.length, i = 0;i<len;i++){
				//console.log(arguments[i])
				var txt = arguments[i];
				buf.push(txt)
				if((bufLen+=txt)>1024){
					resp.write(buf.join(''));
					buf = [];
					bufLen = 0;
				}
				//resp.write(arguments[i]);
			}
		},
		join:function(){
			resp.write(buf.join(''));
			buf = [];
			if(!doMutiLazyLoad(lazyList,resp)){
				resp.end();
			}
		},
		flush:function(){
			resp.write(buf.join(''));
			buf = [];
			bufLen = 0;
		},
		wait:modelWait,
		lazy:function(g){
			lazyList.push(g);
		}
	}
}
/*
//俺的编辑器，混淆器有问题
function* modelWait(){
	var i = arguments.length;
	while(i--){
		if (arguments[i] instanceof Promise) {
			yield arguments[i]
		}
	}
}*/
try{
	var modelWait = Function('return function* modelWait(){' +
			'var i = arguments.length;while(i--){if (arguments[i] instanceof Promise) {' +
			'this.flush();'+
			'yield arguments[i]}}}')()
}catch(e){
	console.error('es6 yield is not support!!');
	var modelWait = function(){
		return {done:true}
	}
}

function doMutiLazyLoad(lazyList,resp){
	var len = lazyList.length;
	var dec = len;
	var first = true;
	for(var i = 0;i<len;i++){
		startModule(lazyList[i],[]);
	}

	//console.log('lazy module:',len,lazyList)
	function startModule(g,r){
		var id = g.name;//__lazy_module_\d+__
		r.flush = function(){};
		r.wait = modelWait;
		g = g(r);
		function next(){
			var n = g.next();
			//console.log('do next:',n)
			if(n.done){
				//console.log('done');
				var rtv = r.join('');
				//console.log('#$%$###### item',rtv)
				//
				//resp.write('<script>(this.__module_loaded__||function(id,h){document.getElementById(id).innerHTML=h})("'+id+'",'+JSON.stringify(rtv)+')</script>')
				resp.write('<script>'+
				(first?'!this__module_loaded__&&(this.__module_loaded__=function(id,h){document.getElementById(id).innerHTML=h});':'')
				+'__lazy_module_loaded__("'+id+'",'+JSON.stringify(rtv)+')</script>')
				first = false;
				if(--dec == 0){
					//console.log('#$%$######end')
					resp.end();
				}
				return rtv;
			}else{
				 n.value.then(next);
				 //console.log('is promise',n.value)
			}
		}

		//console.log('lazy module:',id)
		next();
	}
	return len;
}
exports.wrapResponse = wrapResponse;
exports.Template = Template;
}
,
function(exports,require,module){console.log("read module err!!!util\nError: ENOENT: no such file or directory, open 'util'")
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
//add as default
/**
 * 模板解析上下文对象实现
 */
function ResultContext(){
	this.result = [];
}
function checkVar(v){
	var exp = /^(break|case|catch|const|continue|default|do|else|false|finally|for|function|if|in|instanceof|new|null|return|switch|this|throw|true|try|var|void|while|with)$|^[a-zA-Z_][\w_]*$/;
	var match = v.match(exp);
	if(v == null || !match || match[1]!=null){
		throw new Error("无效变量名：Lite有效变量名为(不包括括弧中的保留字)："+exp+"\n当前变量名为："+v);
	}
	return v;
}
ResultContext.prototype = {
    /**
     * 异常一定要抛出去，让parseText做回退处理
     */
    parseEL : function(el){
	    try{
	        new Function("return ("+el.replace(/\bfor\b/g,"f")+')');
	        return new Expression(el).token;
	    }catch(e){
	        console.info("表达式解析失败[fileName:"+this._context.currentURI+"]",el,e.message)
	        throw new Error();
	    }
    },
    /**
	 * 添加静态文本（不编码）
	 * @param <String>text
	 */
	append:function( text){
		for(var len = arguments.length,i=0;i<len;i++){
			this.result.push(String(arguments[i]));
		}
		//this.result.push.apply(this.result,arguments)
		
	},

	/**
	 * 添加模板指令
	 * 
	 * @param <Object[]> text
	 */
	appendAll:function(ins){
		for(var len = ins.length,i=0;i<len;i++){
			this.result.push(ins[i]);
		}
	},
	/**
	 * @param Object el
	 */
	appendEL:function( el){
		this.result.push([EL_TYPE, requireEL(this,el)]);
	},
	/**
	 * @param String name
	 * @param Object el
	 */
	appendXA:function(attributeName, el){
		this.result.push([XA_TYPE, requireEL(this,el), attributeName ]);
	},
	/**
	 * @param Object el
	 */
	appendXT:function(el){
		this.result.push([XT_TYPE, requireEL(this,el)]);
	},

	/**
	 * @param Object testEL
	 */
	appendIf:function(testEL){
		this.result.push([IF_TYPE, requireEL(this,testEL) ]);
	},

	/**
	 * @param testEL
	 */
	appendElse:function(testEL){
		clearPreviousText(this.result);
		this.result.push([ELSE_TYPE, testEL && requireEL(this,testEL) || null ]);
	},

	appendFor:function(varName, itemsEL, statusName){
		this.result.push([FOR_TYPE,requireEL(this,itemsEL), varName ]);
		if(statusName){
			this.appendVar(checkVar(statusName) , this.parseEL('for'));
		}
	},

	appendEnd:function(){
		this.result.push([])
	},

	appendVar:function(varName, valueEL){
		this.result.push([VAR_TYPE,requireEL(this,valueEL),checkVar(varName)]);
	},

	appendCapture:function(varName){
		this.result.push([CAPTURE_TYPE,checkVar(varName)]);
	},
	appendPlugin:function(clazz, config){
		if(typeof config == 'string'){
			config = JSON.parse(config);
		}
		config['class'] = clazz;
		this.result.push([PLUGIN_TYPE,config]);
	},
	allocateId:function(){
		if(this.inc){
			this.inc++;
		}else{
			this.inc = 1;
		}
		return 'gid_'+this.inc.toString(32);
	},
	mark:function(){
		return this.result.length;
	},
	reset:function(mark){
		return optimizeResult(this.result.splice(mark,this.result.length));
	},
	toList:function(){
		if(!this.optimized){
			var result = optimizeResult(this.result);
			var defMap = {};
	    	var pureCode = buildTreeResult(result,defMap);
	    	this.optimized = doOptimize(defMap,pureCode);
		}
    	return this.optimized;
	}
}
function requireEL(context,el){
	if(typeof el == 'string'){
		el =  context.parseEL(el);
	}
	return el;
}
/**
 * 移除结尾数据直到上一个end为止（不包括该end标记）
 * @public
 */
function clearPreviousText(result){
    var i = result.length;
    while(i--){
    	var item = result[i];
        if(typeof item == 'string'){//end
            result.pop();
        }else{
        	break;
        }
        
    }
}



if(typeof require == 'function'){
exports.ResultContext=ResultContext;
var Expression=require(16).Expression;
var PLUGIN_TYPE=require(13).PLUGIN_TYPE;
var buildTreeResult=require(22).buildTreeResult;
var optimizeResult=require(22).optimizeResult;
var doOptimize=require(22).doOptimize;
var VAR_TYPE=require(13).VAR_TYPE;
var XA_TYPE=require(13).XA_TYPE;
var ELSE_TYPE=require(13).ELSE_TYPE;
var PLUGIN_TYPE=require(13).PLUGIN_TYPE;
var CAPTURE_TYPE=require(13).CAPTURE_TYPE;
var IF_TYPE=require(13).IF_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var XT_TYPE=require(13).XT_TYPE;
var FOR_TYPE=require(13).FOR_TYPE;
}
}
,
function(exports,require){/*
 *          foo://example.com:8042/over/there?name=ferret#nose
 *          \_/   \______________/\_________/ \_________/ \__/
 *           |           |            |            |        |
 *        scheme     authority       path        query   fragment
 *           |   _____________________|__
 *          / \ /                        \
 *          urn:example:animal:ferret:nose
 */
var uriPattern = /^([a-zA-Z][\w\.]*)\:(?:(\/\/[^\/]*))?(\/?[^?#]*)(\?[^#]*)?(#[\s\S]*)?$/;
var absURIPattern = /^[a-zA-Z][\w\.]*\:/;
var uriChars = /\\|[\x22\x3c\x3e\x5c\x5e\x60\u1680\u180e\u202f\u205f\u3000]|[\x00-\x20]|[\x7b-\x7d]|[\x7f-\xa0]|[\u2000-\u200b]|[\u2028-\u2029]/g;
var allEncodes = /[\x2f\x60]|[\x00-\x29]|[\x2b-\x2c]|[\x3a-\x40]|[\x5b-\x5e]|[\x7b-\uffff]/g;
///[\x22\x25\x3c\x3e\x5c\x5e\x60\u1680\u180e\u202f\u205f\u3000]|[\x00-\x20]|[\x7b-\x7d]|[\x7f-\xa0]|[\u2000-\u200b]|[\u2028-\u2029]/g;


function encodeChar(i){
	return "%"+(0x100+i).toString(16).substring(1)
}
function decodeChar(c){
	var n = c.charCodeAt();
    if (n < 0x80){
        return encodeChar(n);
    }else if (n < 0x800){
    	return encodeChar(0xc0 | (n >>>  6))+encodeChar(0x80 | (n & 0x3f))
    }else{
    	return encodeChar( 0xe0 | ((n >>> 12) & 0x0f))+
    		encodeChar(0x80 | ((n >>>  6) & 0x3f))+
    		encodeChar(0x80 | (n & 0x3f))
    }
}
function uriDecode(source){
	//192,224,240
	for(var result = [], i=1;i<source.length;i+=3){
		var c = parseInt(source.substr(i,2),16);
		if(c>=240){//其实无效，js无法处理超出2字节的字符
			c = (c & 0x07)<<18;
			c += (parseInt(source.substr(i+=3,2),16) &0x3f)<<12;
			c += (parseInt(source.substr(i+=3,2),16) &0x3f)<<6;
			c += (parseInt(source.substr(i+=3,2),16) &0x3f);
		}else if(c>=224){
			c = (c & 0x0f)<<12;
			c += (parseInt(source.substr(i+=3,2),16) &0x3f)<<6;
			c += (parseInt(source.substr(i+=3,2),16) &0x3f);
		}else if(c>=192){
			c = (c & 0x1f)<<6;
			c += (parseInt(source.substr(i+=3,2),16) &0x3f);
		}
		result.push(String.fromCharCode(c))
	}
	return result.join('');
}
function uriReplace(c){
	if(c == '\\'){
		return '/';
	}else{
		return decodeChar(c);
	}
}
function URI(path){
	if(path instanceof URI){
		return path;
	}
	if(/^\s*[<]/i.test(path)){
		path = String(path).replace(uriChars,decodeChar)
		return new URI("data:text/xml,"+path);
    }else{
		path = String(path).replace(uriChars,uriReplace)
    }
    //normalize
	path = path.replace(/\/\.\/|\\\.\\|\\/g,'/');
	if(/^\/|^[a-z]\:\//i.test(path)){
		path = 'file://'+path;
	}
	while(path != (path = path.replace(/[^\/]+\/\.\.\//g,'')));
	var match = path.match(uriPattern);
	if(match){
		setupURI(this,match);
	}else{
		console.error("url must be absolute,"+path)
	}

}

function setupURI(uri,match){
	uri.value = match[0];
	uri.scheme = match[1];
	uri.authority = match[2];
	uri.path = match[3];
	uri.query = match[4];
	uri.fragment = match[5];
	
	 
	if('data' == uri.scheme){
		match = uri.value
		uri.source = decodeURIComponent(match.substring(match.indexOf(',')+1));
		
	}
}
URI.prototype = {
	resolve:function(path){
		path = String(path);
		if( /^\s*[#<]/.test(path) ||absURIPattern.test(path)){
			path = new URI(path.replace(/^\s+/,''));
			return path;
		}
		
		path = path.replace(uriChars,uriReplace)
		if(path.charAt() != '/'){
			var p = this.path;
			path = p.replace(/[^\/]*$/,path);
		}
		return new URI(this.scheme + ':'+(this.authority||'') + path);
	},
	toString:function(){
		return this.value;
	}
}

var btoa = this.btoa || function(bs){
	var b64 = [];
    var bi = 0;
    var len = bs.length;
    while (bi <len) {
        var b0 = bs.charCodeAt(bi++);
        var b1 = bs.charCodeAt(bi++);
        var b2 = bs.charCodeAt(bi++);
        var data = (b0 << 16) + (b1 << 8) + (b2||0);
        b64.push(
        	b64codes[(data >> 18) & 0x3F ],
        	b64codes[(data >> 12) & 0x3F],
        	b64codes[isNaN(b1) ? 64 : (data >> 6) & 0x3F],
        	b64codes[isNaN(b2) ? 64 : data & 0x3F]) ;
    }
    return b64.join('');

}
var b64codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
function utf8Replacer(c){
	var n = c.charCodeAt();
	if (n < 0x800){
        return String.fromCharCode(
            (0xc0 | (n >>>  6)),
            (0x80|(n & 0x3f)));
    }else{
        return String.fromCharCode(
            (0xe0 | ((n >>> 12) & 0x0f)),
            (0x80 | ((n >>>  6) & 0x3f)),
            (0x80 |  (n         & 0x3f)));
    }
}
function base64Encode(data){
	data = data && data.replace(/[\u0080-\uFFFF]/g,utf8Replacer)||''
	data = btoa(data) ;
	return encodeURIComponent(data);
}

if(typeof require == 'function'){
exports.URI=URI;
exports.base64Encode=base64Encode;
}
}
,
function(exports,require){function loadLiteXML(uri,root){
    try{
        if(uri instanceof URI){ 
            if(uri.source){
                return parseXMLByText(uri.source.replace(/^[\s\ufeff]*/,uri))
            }else if(uri.scheme == 'lite'){
                var path = uri.path+(uri.query||'')+(uri.fragment || '');
                path = root.resolve(path.replace(/^\//,'./'))+'';
            }else{
                var path = String(uri);
            }
        }else{
            var path = String(uri);
        }
        if(/^[\s\ufeff]*[<#]/.test(path)){
            return parseXMLByText(path.replace(/^[\s\ufeff]*/,''),root)
        }else{
            //console.log(path,/^(?:\w+\:\/\/|\w\:\\|\/).*$/.test(path))
            if(/^(?:\w+\:\/\/|\w\:\\|\/).*$/.test(path)){
                var pos = path.indexOf('#')+1;
                var xpath = pos && path.substr(pos);
                var path = pos?path.substr(0,pos-1):path;
                var source = loadTextByPath(path.replace(/^file\:\/\/?/,''));
                var doc = parseXMLByText(source,uri);
                if(xpath && doc.nodeType){
                    doc = selectByXPath(doc,xpath);
                }
                return doc;
            }else{
                //文本看待
                return parseXMLByText(path);
            }
        }
    }catch(e){
        console.error("文档解析失败:"+uri,e)
        throw e;
    }
}
function txt2xml(source){
    return "<out xmlns='http://www.xidea.org/lite/core'><![CDATA["+
            source.replace(/^\ufeff?#.*[\r\n]*/, "").replace(/]]>/, "]]]]><![CDATA[>")+
            "]]></out>";
}
function addInst(xml,s){
    var p = /^\s*<\?(\w+)\s+(.*)\?>/;
    var m;
    var first = xml.firstChild;
    while(m = s.match(p)){
        if(m[1] == 'xml'){
            var pi = xml.createProcessingInstruction(m[1], m[2]);
            xml.insertBefore(pi, first);
        }
        s = s.substring(m[0].length);
    }
    return xml;
}

/**
 * @private
 */
function parseXMLByText(text,path){
    if(!/^[\s\ufeff]*</.test(text)){
        text = txt2xml(text);
    }
    try{
        var doc = new DOMParser({locator:{systemId:path},
                    xmlns:{c:'http://www.xidea.org/lite/core',
                        h:'http://www.xidea.org/lite/html-ext'}
                }).parseFromString(text,"text/html")
        return addInst(doc,text);
    }catch(e){
        console.error("解析xml失败:",e,text);
    }
    
}

function loadTextByPath(path){
    var fs = require(21);
    var text = fs.readFileSync(path,'utf-8');
    return text;
}

function selectByXPath(currentNode,xpath){
    var nodes = xpathSelectNodes(currentNode,xpath);
    nodes.item = nodeListItem;
    return nodes;
}
function nodeListItem(i){
    return this[i];
}
function findXMLAttribute(el,key){
    if(el.nodeType == 2){
        return el.value;
    }
    try{
    //el
    var required = key.charAt() == '*';
    if(required){
        key = key.substr(1);
    }
    for(var i=1,len = arguments.length;i<len;i++){
        var an = arguments[i];
        if(an == '#text'){
            return el.textContent||el.text;
        }else{
            var v = el.getAttribute(an);//ie bug: no hasAttribute
            if(v || (typeof el.hasAttribute != 'undefined') && el.hasAttribute(an)){//ie bug
                if(i>1 && key.charAt(0) != '#'){
                    console.warn(el.tagName+" 标准属性名为："+key +'; 您采用的是：'+an);
                }
                return v;
            }
        }
    }
    if(required){
        console.error("标记："+el.tagName+"属性：'"+key +"' 为必要属性。");
    }
    }catch(e){
        console.error('findXMLAttribute error:',e)
    }
    return null;
}
function findXMLAttributeAsEL(el){
    el = findXMLAttribute.apply(null,arguments);
    if(el !== null){
        var el2 = el.replace(/^\s*\$\{([\s\S]*)\}\s*$/,"$1")
        if(el == el2){
        	if(el2){
            	console.warn("缺少表达式括弧,文本将直接按表达式返回",el);
        	}
        }else{
            el2 = el2.replace(/^\s+|\s+$/g,'');
            if(!el2){
                console.warn("表达式内容为空:",el);
            }
            el = el2;
        }
    }
    return el;
}
function getLiteTagInfo(node){
    return node.lineNumber + ','+ node.columnNumber+'@'+node.ownerDocument.documentURI;
}

if(typeof require == 'function'){
var URI=require(6).URI;
var DOMParser = require(23).DOMParser;
var xpathSelectNodes = require(20);

exports.loadLiteXML=loadLiteXML;
exports.selectByXPath=selectByXPath;
exports.findXMLAttribute=findXMLAttribute;
exports.findXMLAttributeAsEL=findXMLAttributeAsEL;
exports.getLiteTagInfo = getLiteTagInfo;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
/**
 * 解析链对象
 */
function buildTopChain(context){
	function TopChain(){
	}
	TopChain.prototype = context;
	var pt = TopChain.prototype = new TopChain();
	pt.index = context._nodeParsers.length;
	pt.subIndex = -1;
	pt.getSubChain = getSubChain;
	pt.next = doNext;
	pt.constructor = TopChain;
	return new TopChain();
}

function doNext(node){
	//console.info(typeof node,node&& node.tagName)
	if (this.subIndex > 0) {
		var next = this.getSubChain(this.subIndex - 1);
	} else {
		next = this.nextChain||buildNext(this,this.index-1);
	}
	doParse(node,next);
}
function doParse(node,chain){
	//try{
		var parser = chain._nodeParsers[chain.index];
		if(parser == null){
			console.error('解析栈异常',parser,chain.index,chain._nodeParsers);
		}
		parser(node,chain,chain);
	//}catch(e){
	//	console.error("解析器执行异常："+parser,e)
	//	throw e;
	//}
}
function getSubChain(subIndex){
	if (this.subChains == null) {
		this.subChains =[];
	}
	var i = this.subChains.length;
	for (;i <= subIndex; i++) {
		var subChain = new this.constructor();
		subChain.index = this.index
		//subChain.nodeType = this.nodeType;
		subChain.subIndex = i;
		subChain.subChains = this.subChains;
		this.subChains.push(subChain);
	}
	if (subChain == null) {
		subChain = this.subChains[subIndex];
	}
	return subChain;
}
function buildNext(thiz,index){
	if(index>=0){
		var n = new thiz.constructor();
		n.index = index
		return thiz.nextChain = n;
	}
	return null;
}

if(typeof require == 'function'){
exports.buildTopChain=buildTopChain;
}
}
,
function(exports,require){/**
 * @see extension.js
 */
var CORE_URI = "http://www.xidea.org/lite/core"
var HTML_EXT_URI = "http://www.xidea.org/lite/html-ext"
var HTML_URI = "http://www.w3.org/1999/xhtml"
var currentExtension;
var defaultNodeLocal={
	get:function(){
		return this.node
	},
	set:function(n){
		this.node = n;
	}
}
var nodeLocal = defaultNodeLocal;
function ExtensionParser(newNodeLocal){
	if(newNodeLocal){
		nodeLocal = newNodeLocal;
	}else{
		nodeLocal = defaultNodeLocal;
	}
	this.packageMap = {};
	this.addExtension(CORE_URI,Core);
	this.addExtension(HTML_URI,HTML)
	this.addExtension(HTML_EXT_URI,HTML_EXT)
	
}
function formatName(el){
	var tagName = el.localName|| el.nodeName ||''
	tagName = tagName.replace(/[\-]|^\w+\:/g,"");
	return tagName.toLowerCase();
}

function loadExtObject(source){
	try{
		var p = /\b(?:document|xmlns|(?:parse|before|seek)\w*)\b/g;
		var fn = new Function("console","var window = this;"+source+"\n return function(){return eval(arguments[0])}");
		var m,o;
		var objectMap = {};
	}catch(e){
		console.error("扩展源码语法错误:",e,source)
		throw e;
	}
	try{
		fn = fn(console);
	}catch(e){
		console.error("扩展脚本装载失败：",source,e);
	}
	while(m = p.exec(source)){
		try{
			o = fn(m[0]);
			if(o instanceof Function){
				objectMap[m[0]] = o;
			}
		}catch(e){
		}
	}
	return objectMap;
}


function getParser(map,key){
	var buf = [];
	for(var n in map){
		if(new RegExp('^'+n.replace(/\*/g,'.*')+'$').test(key)){
			buf.push.apply(buf,map[n]);
		}
	}
	return buf.length ? buf:null;
}

function copyParserMap(mapClazz,p,p2,key){
	var map = p[key];
	if(map){
		var result = mapClazz.newInstance();
		p2.put(key ,result);
		for(var n in map){
			result.put(n, map[n]);
		}
	}
}
/**
 * 
	public boolean parseElement(Element el, ParseContext context,
			ParseChain chain, String name);
	public boolean parseDocument(Document node, ParseContext context,ParseChain chain);
	public boolean parseNamespace(Attr node, ParseContext context, ParseChain chain);
	public boolean parseAttribute(Attr attr, ParseContext context, ParseChain chain);
	public boolean parseBefore(Attr attr, ParseContext context,
			ParseChain previousChain, String name);
 */
ExtensionParser.prototype = {
	mapJava:function(mapClazz){
		var result = mapClazz.newInstance();
		for(var n in this.packageMap){
			var p = this.packageMap[n];
			var p2 = mapClazz.newInstance();
			result.put(n,p2);
			if(p.namespaceParser){
				p2.put('namespaceParser', p.namespaceParser);
			}
			copyParserMap(mapClazz,p,p2,"beforeMap")
			
			copyParserMap(mapClazz,p,p2,"typeMap")
			copyParserMap(mapClazz,p,p2,"tagMap")
			copyParserMap(mapClazz,p,p2,"patternTagMap")
			copyParserMap(mapClazz,p,p2,"attributeMap")
			copyParserMap(mapClazz,p,p2,"patternAttributeMap")
			copyParserMap(mapClazz,p,p2,"seekMap")
		}
		return result
	},
	doParse:function (node,fns,chain,ns){
		var last = fns.length-1;
		if(last>0){
			var subIndex = chain.subIndex;
			if(subIndex <0){
				subIndex = last;
				chain = chain.getSubChain(last);
			}
//			console.info("##",subIndex,String(fns[subIndex]));
			fns[subIndex].call(chain,node,ns);
		}else{
			//if(node.name == 'onclick'){
			//	console.error(node.name,typeof fns[0],fns[0].call,fns[0])
			//}
			fns[0].call(chain,node,ns);
		}
		return true;
	},
	parseElement:function(el, context,chain){
//		context.setAttribute(CURRENT_NODE_KEY,el)
		var ns = el.namespaceURI;
		var attrs = el.attributes;
		var len = attrs.length;
		try{
//			var es = 0;
			for (var i =  len- 1; i >= 0; i--) {
				var attr = attrs.item(i);
				var ans = attr.namespaceURI;
				if(ans){
					var ext = this.packageMap[ans];
					var an = formatName(attr);
	//				es = 2
					if (ext && ext.beforeMap) {
						var fn = ext.beforeMap[an];
						if(fn && an in ext.beforeMap){
	//						es = 2.1
							//el.removeAttributeNode(attr);
							//attr.ownerElement = el;
							fn.call(chain,attr);
							//
	//						es =2.2
							return true;
						}
					}
				}
			}
//			es = 4;
		//}catch(e){
		//	console.error("元素扩展解析异常",e)
		//	throw e;
		}finally{
		}
		var ext = this.packageMap[ns||''];
		var n = formatName(el);
		if(ext && ext.tagMap){
			if(n in ext.tagMap){
				var fns = ext.tagMap[n];
				return this.doParse(el,fns,chain);
			}else if(fns = getParser(ext.patternTagMap,n)){
				return this.doParse(el,fns,chain);
			}
		}
	},
	parse:function(node,context,chain){
		//try{
//			var es = 0;
			var type = node.nodeType;
//			var es = 1;
			if(type === 1){
//				var es = 1.1;
				var old = nodeLocal.get();
//				var es = 1.2;
				try{
					nodeLocal.set(node);
					if(this.parseElement(node,context,chain)){
						return;
					}
				}finally{
					nodeLocal.set(old);
				}
//				var es = 1.3;
			}else if(type === 2){//attribute
				if(this.parseAttribute(node,context,chain)){
					return;
				}
			} else{
				if(type == 9 || type == 8){//NODE_DOCUMENT,NODE_COMMENT
					for(var ns in this.packageMap){
						//objectMap.namespaceURI = namespace
						var p = this.packageMap[ns];
						if(p && p.typeMap){
							var fns = p.typeMap[type];
							if(fns){
								return this.doParse(node,fns,chain,ns);
							}
						}
					}
				}
			}
//			var es = 10;
			chain.next(node)
		//}catch(e){
		//	console.error("扩展解析异常：",e);
		//}
	},
	parseAttribute:function(node,context,chain){
		if(this.parseNamespace(node,context,chain)){
			return true;
		}
		try{
//			var es = 3;
			var el = node.ownerElement || node.selectSingleNode("..");//ie bug
			//ie bug.no ownerElement
			var ns = node.namespaceURI || el && el.namespaceURI||'';
			var ext = this.packageMap[ns];
			var n = formatName(node);
			if(n == '__i' && ns == CORE_URI){
				return true;
			}
//			var es=4;
			if(ext && ext.attributeMap){
				if(n in ext.attributeMap){
					return this.doParse(node,ext.attributeMap[n],chain);
				}else{
					var fns = getParser(ext.patternAttributeMap,n);
					if(fns){
						return this.doParse(node,fns,chain);
					}
				}
			}
		}catch(e){
			console.error("属性扩展解析异常：",e)
		}
	},
	parseNamespace:function(attr,context,chain){
		try{
			var es = 0;
			if(/^xmlns(?:\:\w+)?/.test(attr.name)){
			
				var v = attr.value;
				var fp = this.packageMap[v||''];
				if(fp){
					if(fp.namespaceParser){
						fp.namespaceParser.call(chain,attr);
						return true;
					}
					
					var el = attr.ownerElement ||  attr.selectSingleNode("..");//ie bug
					var info = getLiteTagInfo(el);
					if(info && info.length ==0 || info.indexOf("|"+attr.name+"|")>0){
						return fp!=null;
					}else{
						return true;//自动补全的xmlns 不处理!
					}
				}
				//console.error(v,fp.namespaceParser);
			}
		}catch(e){
			console.error("名称空间解析异常：",es,e)
		}
		return false;
	},
	parseText:function(text,start,context){
		var text2 = text.substring(start+1);
		var match = text2.match(/^(?:(\w*)\:)?([\w!#]*)[\$\{]/);
		try{
//			var es = 0;
			if(match){
				var matchLength = match[0].length;
				var node = nodeLocal.get();
				var prefix = match[1];
				var fn = match[2]
				if(prefix == null){
					var ns = ""
				}else{
//					es = 1;
					if(node && node.lookupNamespaceURI){
						var ns = node.lookupNamespaceURI(prefix);
						if (ns == null) {
							var doc = node.ownerDocument;
							ns = doc && doc.documentElement.lookupNamespaceURI(prefix);
						}
					}
//					es =2
				}
				
				if(!ns && (prefix == 'c' || !prefix)){
					ns = CORE_URI
				}
				if(ns == null){
					console.warn("文本解析时,查找名称空间失败,请检查是否缺少XML名称空间申明：[code:$"+match[0]+",prefix:"+prefix+",document:"+context.currentURI+"]")
				}else{
					var fp = this.packageMap[ns];
					if(fp){
						//{开始的位置，el内容
						var text3 = text2.substring(matchLength-1);
						var seekMap = fp.seekMap;
						if(fn in seekMap){
							fn = seekMap[fn];
							var rtv = fn.call(context,text3);
							if(rtv>0 || rtv === 0){
								return start+matchLength+rtv+1
							}
						}else{
							console.warn("文本解析时,找不到相关的解析函数,请检查模板源码,是否手误：[function:"+fn+",document:"+(context && context.currentURI)+"]")
							//return -1;
						}
					}else{
						console.warn("文本解析时,名称空间未注册实现程序,请检查lite.xml是否缺少语言扩展定义：[code:$"+match[0]+",namespace:"+ns+",prefix:"+prefix+",document:"+context.currentURI+"]")
					}
				}
			}
		}catch(e){
			console.error("文本解析异常：",e)
		}
		//seek
		return -1;
	},
	/**
	 * 查找EL或者模板指令的开始位置
	 * @param text
	 * @param start 开始查询的位置
	 * @param otherStart 其他的指令解析器找到的指令开始位置（以后必须出现在更前面，否则无效）
	 * @return 返回EL起始位置($位置)
	 */
	findStart:function(text,start,otherStart){
		var begin = start;
		while(true){
			begin = text.indexOf('$',begin);
			if(begin<0 || otherStart <= begin){
				return -1;
			}
			var text2 = text.substring(begin+1);
			var match = text2.match(/^(?:\w*\:)?[\w#!]*[\$\{]/);
			if(match){
				return begin;
			}
			begin++;
		}
	},
	addExtension:function(namespace,packageName){
		if(typeof packageName == 'string'){
			if(/^[\w\.\/]+$/.test(packageName)){
				var objectMap = {};
				var packageObject = require(packageName);
				for(var n in packageObject){
					if(n.match(/^(?:document|xmlns|on|parse|before|seek).*/)){
						objectMap[n] = packageObject[n];
					}
				}
			}else{
				objectMap = loadExtObject(packageName)
			}
		}else{
			objectMap = packageName;
		}
		var ext = this.packageMap[namespace||''];
		if(ext == null){
			ext = this.packageMap[namespace||''] = new Extension();
		}
		ext.initialize(objectMap,namespace||'');
	},
	getPriority:function() {
		//${ =>2
		//$!{ =>3
		//$end$ =>5
		return 2;
	}
}

if(typeof require == 'function'){
exports.ExtensionParser=ExtensionParser;
var Extension=require(10).Extension;
var Core=require(25).Core;
var HTML=require(24).HTML;
var HTML_EXT=require(24).HTML_EXT;

var getLiteTagInfo=require(7).getLiteTagInfo;
}
}
,
function(exports,require){/**
 * Lite JS 扩展规范：
 * 一个js包中：
 *            函数 document 为通用文档解释器  
 *            所有 before<Attribute> 为当前名称空间属性解析器
 *            函数 xmlns 为当前名称空间属性解释器,未定义或者空函数时则该属性不输出
 *            所有 on<Attribute> 为当前名称空间元素普通属性（无名称空间的属性）的解释器
 *            所有 parse<TagName> 为当前名称空间元素（Element）解释器
 *            所有 seek<Function Name> 为当前名称空间前缀的文本函数解释器
 */
function Extension(){
	this.namespaceParser = null;
	this.beforeMap = null;
	this.typeMap = null;
	this.tagMap = null;
	this.patternTagMap = null;
	this.attributeMap = null;
	this.patternAttributeMap = null;
	this.seekMap = null;
}
function add(m,fn,o){
	if(fn in m){
		m[fn].push(o);
	}else{
		m[fn] = [o];
	}
}
function appendParser(ext,key,patternKey,fn,o){
	var m = ext[key];
	if(fn.indexOf('*')>=0){//is pattern parser 
		var pm = ext[patternKey];
		if(!pm){
			ext[patternKey] = pm = {};
		}
		add(pm,fn,o);//添加 patternParser
		//console.info(patternKey,fn,pm)
		if(m){//扫描已有 parser 添加 patternParser
			var p = new RegExp('^'+fn.replace(/\*/g,'.*')+'$');
			for(var n in m){
				if(p.test(n)){
					add(m,n,o);
				}
			}
		}
	}else{//普通parser
		if(!m){//创建时，自动扫描已有pattern Parser
			ext[key] = m = {};
			var pm = ext[patternKey];
			if(pm){
				for(var p in pm){
					if(new RegExp('^'+p.replace(/\*/g,'.*')+'$').test(fn)){
						add(m,fn,pm[p]);
					}
				}
			}
		}
		add(m,fn,o);
	}
}

Extension.prototype={
	initialize:function(objectMap){
		//console.dir(objectMap)
		for(var key in objectMap){
			var o = objectMap[key];
//			console.error("["+key+"]:"+o+"\n\n")
			if(o instanceof Function){
				var dest = null;
				var match = key.match(/^(parse|seek|before|xmlns)(.*)/);
				var prefix = match[1];
				var fn = formatName(match[2]);
				if(prefix == "parse"){//""?".."
					var c = fn.charAt(0);
					fn = fn.replace(/^[12]/,'');
					if(c == '2'){
						appendParser(this,"attributeMap","patternAttributeMap",fn,o);
					}else if(c <'0' || c > '9' || c == '1'){
						appendParser(this,"tagMap","patternTagMap",fn,o);
					}else{
						if(!this.typeMap){
							this.typeMap = {};
						}
						add(this.typeMap,fn,o);
					}
				}else if(prefix == "xmlns"){
					this.namespaceParser = o;
				}else if(prefix == "before"){
					dest = this.beforeMap ||(this.beforeMap={});
					dest[fn] = o;
				}else if(prefix == "seek"){//""?".."
					dest = this.seekMap ||(this.seekMap={});
					dest[fn] = o;
				}
			}
		}
	}
	
}

function formatName(tagName){
	tagName = tagName.replace(/[\-]/g,"");
	return tagName.toLowerCase();
}

if(typeof require == 'function'){
exports.Extension=Extension;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
//import {XA_TYPE,EL_TYPE,XT_TYPE} from './template-token';
//export var XML_SPACE_TRIM = "http://www.xidea.org/lite/attribute/h:trim-space" 
//export 
var XA_TYPE = require(13).XA_TYPE;
var EL_TYPE = require(13).EL_TYPE;
var XT_TYPE = require(13).XT_TYPE;
exports.parseDefaultXMLNode = parseDefaultXMLNode;
var XML_SPACE_TRIM =exports.XML_SPACE_TRIM = "http://www.xidea.org/lite/attribute/h:trim-space" 
function parseDefaultXMLNode(node,context,chain){
	//try{
	    switch(node.nodeType){
	        case 1: //NODE_ELEMENT 
	            processElement(node,context,chain)
	            break;
	        case 2: //NODE_ATTRIBUTE                             
	            processAttribute(node,context,chain)
	            break;
	        case 3: //NODE_TEXT                                        
	            processTextNode(node,context,chain)
	            break;
	        case 4: //NODE_CDATA_SECTION                     
	            processCDATA(node,context,chain)
	            break;
	        case 5: //NODE_ENTITY_REFERENCE                
	            processEntityReference(node,context,chain)
	            break;
	        case 6: //NODE_ENTITY            
	            processEntity(node,context,chain)
	            break;
	        case 7: //NODE_PROCESSING_INSTRUCTION    
	            processProcessingInstruction(node,context,chain)
	            break;
	        case 8: //NODE_COMMENT                                 
	            processComment(node,context,chain)
	            break;
	        case 9: //NODE_DOCUMENT                                
	        case 11://NODE_DOCUMENT_FRAGMENT             
	            processDocument(node,context,chain)
	            break;
	        case 10://NODE_DOCUMENT_TYPE                     
	            processDocumentType(node,context,chain)
	//        case 11://NODE_DOCUMENT_FRAGMENT             
	//            processDocumentFragment(node,context,chain)
	            break;
	        case 12://NODE_NOTATION 
	            processNotation(node,context,chain);
	            break;
	        default://文本节点
	        	chain.next(node);
	            //this.println("<!-- ERROR： UNKNOW nodeType:"+node.nodeType+"-->")
	    }
	//}catch(e){
	//	console.error('default xml node parse error:'+e);
	//}
}

var htmlLeaf = /^(?:meta|link|img|br|hr|input)$/i;
var htmlReserved = /^(?:script|style|pre|textarea)$/i
var scriptTag = /^script$/i
function processElement(node,context,chain){
    var attributes = node.attributes;
    var tagName = node.tagName;
    context.append('<'+tagName);
    for (var i=0; i<attributes.length; i++) {
        try{
            //htmlunit bug...
            var attr = attributes.item(i);
        }catch(e){
            var attr =attributes[i];
        }
        context.parse(attr)
    }
    if(htmlLeaf.test(tagName)){
        context.append('/>')
        return ;
    }
    context.append('>')
    var child = node.firstChild
    if(child){
    	///if(htmlReserved.test(tagName)){
    	//	context.setReservedSpace(true)
    	//}
        do{
            context.parse(child)
        }while(child = child.nextSibling)
    }
    context.append('</'+node.tagName+'>')
}

//parser attribute
function processAttribute(node,context,chain){
    var name = String(node.name);
    var value = String(node.value);
    var buf = context.parseText(value,XA_TYPE);
    var isStatic;
    var isDynamic;
    //hack context.parseText is void 
    var i =  buf.length;
    while(i--){
        //hack reuse value param
        var value = buf[i];
        if(value.constructor == String){
            if(value){
                isStatic = true;
            }else{
                buf.splice(i,1);
            }
        }else{
            isDynamic = true;
        }
    }
    if(isDynamic && !isStatic){
        //remove attribute;
        //context.append(" "+name+'=""');
        if(buf.length > 1){
            //TODO:....
            throw new Error("属性内只能有单一EL表达式！！");
        }else{//只考虑单一EL表达式的情况
            if(buf[0][0] == XA_TYPE){
            	//buf[0][1] 是一个表达式对象
	        	context.appendXA(name,buf[0][1]);
	        	return null;
            }
        }
    }
    context.append((/^on/.test(name)?'\n':' ')+name+'="');
    if(/^xmlns$/i.test(name)){
        if(buf[0] == 'http://www.xidea.org/lite/xhtml'){
            buf[0] = 'http://www.w3.org/1999/xhtml'
        }
    }
    context.appendAll(buf);
    context.append('"');
}
function processTextNode(node,context,chain){
    var data = String(node.data);
    //context.appendAll(context.parseText(data.replace(/^\s*([\r\n])\s*|\s*([\r\n])\s*$|^(\s)+|(\s)+$/g,"$1$2$3$4"),XT_TYPE))
    
	var space = context.getAttribute(XML_SPACE_TRIM);
    //不用回车js序列化后更短
    if(space == true){
    	data = data.replace(/^\s*|\s*$|(\s)\s+/g,"$1");
    }else if(space != false){
   		data = data.replace(/^\s*([\r\n])\s*|\s*([\r\n])\s*$|^(\s)+|(\s)+$/g,"$1$2$3$4");
    }
    context.appendAll(context.parseText(data,XT_TYPE))
}

function processCDATA(node,context,chain){
    context.append("<![CDATA[");
    context.appendAll(context.parseText(node.data,EL_TYPE));
    context.append("]]>");
}
function processEntityReference(){
    return null;//not support
}
function processEntity(){
    return null;//not support
}
function processProcessingInstruction(node,context,chain){
    context.append("<?"+node.nodeName+" "+node.data+"?>");
}
function processComment(){
    return null;//not support
}
function processDocument(node,context,chain){
    for(var n = node.firstChild;n!=null;n = n.nextSibling){
        context.parse(n);
    }
}
///**
// * @protected
// */
//function processDocumentFragment(node,context,chain){
//    var nl = node.childNodes;
//    for (var i=0; i<nl.length; i++) {
//        context.parse(nl.item(i));
//    }
//}
/**
 * @protected
 */
function processDocumentType(node,context,chain){
    if(node.xml){
        context.append(node.xml);
    }else{
    	var pubid = node.publicId;
    	var nodeName = node.nodeName;
		var sysid = node.systemId;
		if(sysid == '.'){sysid = null}
        if(pubid){
			if(pubid == "org.xidea.lite.OUTPUT_DTD"){
				if(sysid){
					context.append(decodeURIComponent(sysid));
				}
				return;
			}
            context.append('<!DOCTYPE ');
            context.append(nodeName);
            context.append(' PUBLIC "');
            context.append(pubid);
            if (sysid == null) {
            	context.append( '" "');
            	context.append(sysid);
            }
            context.append('">');
        }else if(sysid){
            context.append('<!DOCTYPE ');
            context.append(nodeName);
            context.append(' SYSTEM "');
            context.append(sysid);
            context.append('">');
        }else{
        	context.append("<!DOCTYPE ");
			context.append(nodeName);
			var sub = node.internalSubset;
            if(sub){
				context.append(" [");
				context.append(sub);
				context.append("]");
			}
			context.append(">");
        }
    }
}

/**
 */
function processNotation(node,context,chain){
    return null;//not support
}

//1 2



}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
/**
 * for extension text parser
 */
function parseText(text,context,textParsers){
	switch(context.textType){
    case XA_TYPE :
        var qute = '"';
    case XT_TYPE :
        var encode = true;  
    case EL_TYPE:
        break;
    default:
    	console.error("未知编码模式："+context.textType+text)
    	return;
    }
	var len = text.length;
	var start = 0;
	do {
		var nip = null;
		var p$ = len + 1;
		{
			var pri = 0;
			var ti = textParsers.length;
			while (ti--) {
				var ip = textParsers[ti];
				var p$2 = ip.findStart(text, start, p$);
				var pri2 = ip.priority || 1;
				if (p$2 >= start ){
					if(p$2 < p$ || p$2 == p$ && pri2>pri){
						p$ = p$2;
						nip = ip;
						pri = pri2;
					}
				}
				
			}
		}
		if (nip != null) {
			var escapeCount = countEescape(text, p$);
			appendText(context,
					text.substring(start, p$ - ((escapeCount + 1) >>1)),
					encode,	qute);
			if ((escapeCount & 1) == 1) {// escapsed
				start = nextPosition(context, text, p$);
			} else {
				start = p$;
				var mark = context.mark();
				try {
					start = nip.parseText(text, start, context);
				} catch (e) {
					console.warn("尝试表达式解析失败:[source:"+text+",fileName:"+context.currentURI+"]",e);
				}
				if (start <= p$) {
					context.reset(mark);
					start = nextPosition(context, text, p$);
				}

			}
		} else {
			break;
		}
	} while (start < len);
	if (start < len) {
		appendText(context,text.substring(start), encode, qute);
	}
}
/**
 * 添加静态文本（不编码）
 * @param <String>text
 * @param <boolean>encode
 * @param <char>escapeQute
 */
function appendText(context,text, encode,  escapeQute){
	if(encode){
		if(escapeQute == '"'){
			var replaceExp = /[<&"]/g;
		}else if(escapeQute == '\''){
			var replaceExp = /[<&']/g;
		}else{
			var replaceExp = /[<&]/g;
		}
		text = text.replace(replaceExp,xmlReplacer);
	}
	context.append(text);
}
function xmlReplacer(c){
    switch(c){
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&#39;';
        case '"':
          return '&#34;';
    }
}
function nextPosition(context, text, p$) {
	context.append(text.substring(p$, p$ + 1));
	return p$ + 1;
}

function countEescape(text, p$) {
	if (p$ > 0 && text.charAt(p$ - 1) == '\\') {
		var pre = p$ - 1;
		while (pre-- > 0 && text.charAt(pre) == '\\')
			;
		return p$ - pre - 1;
	}
	return 0;
}

if(typeof require == 'function'){
exports.parseText=parseText;
var XA_TYPE=require(13).XA_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var XT_TYPE=require(13).XT_TYPE;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
var EL_TYPE = 0;// [0,'el']
var IF_TYPE = 1;// [1,[...],'test']
var BREAK_TYPE = 2;// [2,depth]
var XA_TYPE = 3;// [3,'value','name']
var XT_TYPE = 4;// [4,'el']
var FOR_TYPE = 5;// [5,[...],'items','var']
var ELSE_TYPE = 6;// [6,[...],'test']//test opt?
var PLUGIN_TYPE =7;// [7,[...],'el','clazz']
var VAR_TYPE = 8;// [8,'value','name']
var CAPTURE_TYPE = 9;// [9,[...],'var']

var IF_KEY = "if";
var FOR_KEY = "for";
var PLUGIN_DEFINE = "org.xidea.lite.DefinePlugin";

if(typeof require == 'function'){
exports.PLUGIN_DEFINE=PLUGIN_DEFINE;
exports.VAR_TYPE=VAR_TYPE;
exports.XA_TYPE=XA_TYPE;
exports.ELSE_TYPE=ELSE_TYPE;
exports.PLUGIN_TYPE=PLUGIN_TYPE;
exports.CAPTURE_TYPE=CAPTURE_TYPE;
exports.IF_TYPE=IF_TYPE;
exports.EL_TYPE=EL_TYPE;
exports.BREAK_TYPE=BREAK_TYPE;
exports.XT_TYPE=XT_TYPE;
exports.FOR_TYPE=FOR_TYPE;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
//add as default
/**
 * 模板解析上下文对象实现
 * [
 * 	{
 * 		"includes":["/example\\/*.xhtml"],
 * 		"excludes":[],
 * 		"config":{
 *          "encoding":"utf-8",
 * 			"contentType":"text/html;charset=UTF-8"
 * 		},
 * 		"extensions":[
 * 			{
 * 				"namespace":"http://www.xidea.org/lite/core",
 * 				"package":"lite/parse/i18n"
 * 			}
 * 		]
 * 	}
 * ]
 */
function ParseConfig(root,dom){
	this.root = new URI(root && root.replace(/[\\\/]*$/,'/') || 'lite:///');
	var json = dom && parseConfig(dom);
	if(json){
		var result = [];
		var i = json.length
		while(i--){
			var item = {};
			copy(json[i],item);
			item.includes = new RegExp(item.includes||"^$");
			item.excludes = new RegExp(item.excludes||"^$");
			result[i] = item;
		}
		this._groups = result;
	}else{
		this._groups = defaultConfig;
	}
}
function copy(source,dest){
	for(var n in source){
		dest[n] = source[n];
	}
}
function findGroup(groups,path,require){
	for(var i=0,len = groups.length;i<len;i++){
		var g = groups[i];
		if(g.includes.test(path)){
			if(!g.excludes.test(path)){
				return g;
			}
		}
	}
	return require && groups[groups.length-1];
}
ParseConfig.prototype = {
//	getDecotatorPage:function(path){
//		var g = findGroup(this.config,path,null)
//		return g && g.config['layout'];
//	},
	getConfig:function(path){
		var result = {}
		var g = findGroup(this._groups,path,null);
		if(g){
			copy(g.config,result);
		}
		return result;
	},
	getExtensionMap:function(path){
		var g = findGroup(this._groups,path,null);
		if(g){
			return g.extensionMap;
		}
		return {};
		
	}
}

var defaultConfig = {
		"includes":/./,//"/example\\/*.xhtml"
		"excludes":/^$/,
		"config":{
			//必要属性（控制xml编译）
			"encoding":"utf-8",
			//必要属性（控制xml编译）
			"contentType":"text/html;charset=UTF-8"
		},
		"extensionMap":{
			////xhtml 编译不是自带的，需要自己定义
			//"http://www.w3.org/1999/xhtml":["org.xidea.lite.xhtml"],
			//core 自行编译
			//"http://firekylin.my.baidu.com/ns/2010":["org.xidea.lite.xhtml"],
			//"http://firekylin.my.baidu.com/ns/2010":["org.xidea.lite.xhtml"]
			
		}
	}

if(typeof require == 'function'){
exports.ParseConfig=ParseConfig;
var parseConfig = require(26).parseConfig;
var URI=require(6).URI;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */


var ID_PREFIX = "$_";
var XML_ENCODE_XA = 1;
var XML_ENCODE_XT = 2;
/**
 * @extends LiteContext
 */
function TranslateContext(code,name,params){
    /**
     * 函数名称 可以是null
     */
    this.name = name;
    /**
     * 当前域下的参数表[可以为null,null和空数组表示的意思不同]
     */
    this.params = params;
    /**
     * 当前scope的信息(包括变量,引用,函数调用信息,for状态,函数集...) 
     */
    this.scope = new OptimizeScope(code,params);
    this.allocateIdMap = {};
    this.outputIndent = 0;

}


TranslateContext.prototype = {
    findForStatus:function(code){
	    var fis = this.scope.fors;
	    var i = fis.length;
	    while(i--){
	        var fi = fis[i];
	        if(fi.code == code){
	            return fi;
	        }
	    }
        //return this.vs.getForStatus(forCode);
    },
    allocateId:function(id){
    	if(id && /^([\w\$_]+|[\d\.]+)$/.test(id)){
    		return id;
    	}
        var i = 0;
        while(true){
            if(!this.allocateIdMap[i]){
                this.allocateIdMap[i] = true;
                return ID_PREFIX+i.toString(36);
            }
            i++;
        }
    },
    freeId:function(id){
    	var len = ID_PREFIX.length;
        if(id.substring(0,len) == ID_PREFIX){
        	delete this.allocateIdMap[id.substring(len)];
        }
    },
    /**
     */
    appendCode:function(code){
    	for(var i=0;i<code.length;i++){
    		var item = code[i];
    		if(typeof item == 'string'){
    			this.appendStatic(item)
    		}else{
                var type = item && item[0];
    			switch(type){
                case EL_TYPE:
                    this.visitEL(item[1],type)
                    this.appendEL(item);
                    break;
                case XT_TYPE:
                    this.visitEL(item[1],type)
                    this.appendXT(item);
    			    break;
                case XA_TYPE:
                    this.visitEL(item[1],type)
                    this.appendXA(item);
                    break;
                case VAR_TYPE:
                    this.visitEL(item[1],type)
                    this.appendVar(item);
                    break;
                case CAPTURE_TYPE:
                    this.visitEL(null,type)
                    this.processCapture(item);
                    break;
    			case PLUGIN_TYPE://not support
                    this.visitEL(item[2],type)
    				this.processPlugin(item[1],item[2]);
    				break;
                case IF_TYPE:
                    this.visitEL(item[2],type)
                    i = this.processIf(code,i);
                    break;
                case FOR_TYPE:
                    this.visitEL(item[2],type)
                    i = this.processFor(code,i);
                    break;
                case ELSE_TYPE:
                    this.visitEL(item[2],type)
                	i = this.processElse(code,i);
    				break;
                default:
                    throw Error('无效指令：'+i+JSON.stringify(code))
                }
    		}
    	}
    },
    visitEL:function(){},
    //[PLUGIN_TYPE,child,config]
    processPlugin:function(child,config){
    	var pn = config['class'];
    	switch(pn.replace(/^org\.xidea\.lite\.(?:parse\.)?/,'')){
    	case 'EncodePlugin':
    		this.appendEncodePlugin(child[0]);
    		break;
    	case 'DatePlugin':
    		this.appendDatePlugin(child[0],child[1]);
    		break;
    	case 'NativePlugin':
    		this.appendNativePlugin(child,config);
    		break;
        case 'ModulePlugin':
            this.appendModulePlugin(child,config);
            break;
        case 'DefinePlugin':
            //全局自动处理
            break;
    	case 'ClientPlugin':
            //编译期消灭
    	default:
			console.error("程序bug(插件需要预处理):"+pn,config);
    	}
    },
    processElse:function(code,i){
    	throw Error('问题指令(无主else,else 指令必须紧跟if或者for)：'+code,i);
    },
    append:function(){
        var outputIndent = this.outputIndent;
        this.out.push("\n");
        while(outputIndent--){
            this.out.push("\t")
        }
        for(var i=0;i<arguments.length;i++){
            this.out.push(arguments[i]);
        }
    },
    reset:function(){
    	var out = this.out.concat();
    	this.out.length=0;
    	return out;
    }
}


if(typeof require == 'function'){
exports.TranslateContext=TranslateContext;
var OptimizeScope=require(27).OptimizeScope;
var VAR_TYPE=require(13).VAR_TYPE;
var XA_TYPE=require(13).XA_TYPE;
var ELSE_TYPE=require(13).ELSE_TYPE;
var PLUGIN_TYPE=require(13).PLUGIN_TYPE;
var CAPTURE_TYPE=require(13).CAPTURE_TYPE;
var IF_TYPE=require(13).IF_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var XT_TYPE=require(13).XT_TYPE;
var FOR_TYPE=require(13).FOR_TYPE;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
/**
 * 表达式对象，可以单步解释表达式中间代码
 */
function Expression(value){
	if(typeof value == 'string'){
		value = new ExpressionTokenizer(value).getResult();
	}else if(value instanceof Expression){
		return value;
	}
	this.token = value;
}
Expression.prototype.evaluate = function(context){
     return evaluate(context,this.token);
}
/**
 * {
 *    varName:["","a","a.b","a.*.b"]
 * }
 */
Expression.prototype.getVarMap = function(){
	init(this);
	return this.varMap;
	
}
/**
 * {
 *    methodName:["","a","a.b","*",'a.1.*.x','.a.1']
 * }
 */
Expression.prototype.getCallMap = function(){
	init(this);
	return this.callMap;
}
function init(thiz){
	if(thiz.callMap == null){
		thiz.callMap = {};
		thiz.varMap = {};
		walkEL(thiz.token,thiz);
	}
}
function walkEL(token,context){
	var op = token[0];
	if(op<=0){
		if(op == VALUE_VAR){
			_addKeyList(context.varMap,token[1],'');
		}
		return;
	}else{
		var arg1 = token[1];
		if(op == OP_INVOKE){
			if(arg1[0] == VALUE_VAR){
				_addKeyList(context.callMap,arg1[1],'');
			}else if(arg1[0] == OP_GET){//member
				var list = walkMembers(arg1,context,[]).reverse();
				var ps = list.slice(1).join('.');
				if(list[0] != ''){//!constants,what about constants, map,list?
					if(list[0] != '*' ){//vars
						_addKeyList(context.varMap,list[0],ps);
					}
					_addKeyList(context.callMap,list[0],ps);
				}
			}else{
				walkEL(arg1,context);
				_addKeyList(context.callMap,"*",'');
			}
		}else{
			if(op == OP_GET){
				var list = walkMembers(token,context,[]).reverse();
				var ps = list.slice(1).join('.');
				if(list[0] != ''){//!constants,what about constants, map,list?
					if(list[0] != '*' ){//vars
						_addKeyList(context.varMap,list[0],ps);
					}
				}
			}else{
				arg1 && walkEL(arg1,context);
			}
		}
		var pos = getTokenParamIndex(token[0]);
		if(pos>2){//invoke args... 
			walkEL(token[2],context);
		}
	}
}
function walkMembers(token,context,buf){//[get,owner,key]
	var owner = token[1];
	var key = token[2];
	if(key[0] == VALUE_CONSTANTS){
		buf.push(key[1]);
	}else{
		walkEL(key,context);
		buf.push('*');
	}
	
	if(owner[0] == VALUE_VAR){
		buf.push(owner[1]);//跳过 设置 varMap
	}else if(owner[0] == VALUE_CONSTANTS){
		buf.push('');
	}else if(owner[0] == OP_GET){
		walkMembers(owner,context,buf);
	}else{
		walkEL(owner,context);
		buf.push('*');
	}
	return buf;
}
function _addKeyList(map,key,value){
	var list = key in map? map[key]: (map[key] = []);
	if(list.indexOf(value) <0){
		list.push(value);
	}
	return list;
}
Expression.prototype.toString = function(context){
	return stringifyJSEL(this.token,context);
	//return JSON.stringify(this.token);
}
Expression.evaluate = evaluate;
/**
 * 表达式单步解析函数实现
 */
function evaluate(context,el){
     var result = _evaluate(el,context)
     return realValue(result);
}


function _evaluate(item,context){
    var type = item[0];
    switch(type){
    case VALUE_LIST:
        return [];
    case VALUE_MAP:
        return {};
    case VALUE_VAR:
        arg1 = item[1]
        return (arg1 in context?context:this)[arg1];
    case VALUE_CONSTANTS:
    	arg1 = item[1];
        return arg1&&arg1['class'] == 'RegExp'?window.eval(arg1.literal):arg1;
    ///* and or */
    case OP_AND:
        return realValue(_evaluate(item[1],context)) && (_evaluate(item[2],context));
    case OP_OR:
        return realValue(_evaluate(item[1],context)) || (_evaluate(item[2],context));
    case OP_QUESTION://// a?b:c -> a?:bc -- >a?b:c
        if(realValue(_evaluate(item[1],context))){
            return _evaluate(item[2],context);
        }else{
            return PropertyValue;//use as flag
        }
    case OP_QUESTION_SELECT:
    	arg1 = realValue(_evaluate(item[1],context));
        if(arg1 == PropertyValue){//use as flag
            return _evaluate(item[2],context);
        }else{
            return arg1;
        }
    }
    var arg1=_evaluate(item[1],context);
    if(getTokenParamIndex(type) ==3){
        var arg2=realValue(_evaluate(item[2],context));
    }
    if(type == OP_INVOKE){
    	if(typeof arg1 == 'function'){
            return arg1.apply(context,arg2);
    	}else if(arg1 instanceof PropertyValue){
    		var thiz = arg1[0];
    		var key = arg1[1];
    		var fn = thiz[key];
    		//bugfix replace(RegExp
    		if(fn == String.prototype.replace || fn == String.prototype.match){
    			arg2 = arg2.slice(0);
    			var exp = arg2[0];
    			if(exp && exp['class'] == 'RegExp'){
    				arg2[0] = window.eval(exp.source)
    			}
    			
    		}
            return fn.apply(thiz,arg2);
    	}else{
    		throw new Error("not a fn!!"+arg1)
    	}
    }
    arg1 = realValue(arg1);
    switch(type){
    //op
//    case OP_GET_STATIC_PROP:
//        arg2 =getTokenParam(item);
    case OP_GET:
        return new PropertyValue(arg1,arg2);
    case OP_NOT:
        return !arg1;
    case OP_POS:
        return +arg1;
    case OP_NEG:
        return -arg1;
        ///* +-*%/ */
    case OP_ADD:
        return arg1+arg2;
    case OP_SUB:
        return arg1-arg2;
    case OP_MUL:
        return arg1*arg2;
    case OP_DIV:
        return arg1/arg2;
    case OP_MOD:
        return arg1%arg2;
        ///* boolean */
    case OP_GT:
        return arg1 > arg2;
    case OP_GTEQ:
        return arg1 >= arg2;
    case OP_NE:
        return arg1 != arg2;
    case OP_NE_STRICT:
        return arg1 !== arg2;
    case OP_EQ:
        return arg1 == arg2;
    case OP_EQ_STRICT:
        return arg1 === arg2;
        
    case OP_LT:
        return arg1 < arg2;
    case OP_LTEQ:
        return arg1 <= arg2;
    case OP_IN:
        return arg1 in arg2;


    case OP_JOIN:
        arg1.push(arg2)
        return arg1;
    case OP_PUT:
        arg1[getTokenParam(item)]= arg2;
        return arg1;
    }
}

function PropertyValue(base,name){
    this[0] = base;
    this[1] = name;
}
function realValue(arg1){
    if(arg1 instanceof PropertyValue){
        return arg1[0][arg1[1]];
    }
    return arg1;
}


if(typeof require == 'function'){
exports.Expression=Expression;
var stringifyJSEL = require(28).stringifyJSEL
var ExpressionTokenizer=require(29).ExpressionTokenizer;
var getTokenParam=require(30).getTokenParam;
var getTokenParamIndex=require(30).getTokenParamIndex;
var OP_ADD=require(30).OP_ADD;
var OP_AND=require(30).OP_AND;
var OP_DIV=require(30).OP_DIV;
var OP_EQ=require(30).OP_EQ;
var OP_EQ_STRICT=require(30).OP_EQ_STRICT;
var OP_GET=require(30).OP_GET;
var OP_GT=require(30).OP_GT;
var OP_GTEQ=require(30).OP_GTEQ;
var OP_IN=require(30).OP_IN;
var OP_INVOKE=require(30).OP_INVOKE;
var OP_JOIN=require(30).OP_JOIN;
var OP_LT=require(30).OP_LT;
var OP_LTEQ=require(30).OP_LTEQ;
var OP_MOD=require(30).OP_MOD;
var OP_MUL=require(30).OP_MUL;
var OP_NE=require(30).OP_NE;
var OP_NEG=require(30).OP_NEG;
var OP_NE_STRICT=require(30).OP_NE_STRICT;
var OP_NOT=require(30).OP_NOT;
var OP_OR=require(30).OP_OR;
var OP_POS=require(30).OP_POS;
var OP_PUT=require(30).OP_PUT;
var OP_QUESTION=require(30).OP_QUESTION;
var OP_QUESTION_SELECT=require(30).OP_QUESTION_SELECT;
var OP_SUB=require(30).OP_SUB;
var VALUE_CONSTANTS=require(30).VALUE_CONSTANTS;
var VALUE_LIST=require(30).VALUE_LIST;
var VALUE_MAP=require(30).VALUE_MAP;
var VALUE_VAR=require(30).VALUE_VAR;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
var BIT_PRIORITY= 60;
var BIT_PRIORITY_SUB= 3840;
var BIT_ARGS= 192;
var POS_INC= 12;
var VALUE_CONSTANTS= -1;
var VALUE_VAR= -2;
var VALUE_LIST= -3;
var VALUE_MAP= -4;
var OP_GET= 96;
var OP_INVOKE= 97;
var OP_NOT= 28;
var OP_BIT_NOT= 29;
var OP_POS= 30;
var OP_NEG= 31;
var OP_MUL= 88;
var OP_DIV= 89;
var OP_MOD= 90;
var OP_ADD= 84;
var OP_SUB= 85;
var OP_LSH= 80;
var OP_RSH= 81;
var OP_URSH= 82;
var OP_LT= 332;
var OP_GT= 333;
var OP_LTEQ= 334;
var OP_GTEQ= 335;
var OP_IN= 4428;
var OP_EQ= 76;
var OP_NE= 77;
var OP_EQ_STRICT= 78;
var OP_NE_STRICT= 79;
var OP_BIT_AND= 1096;
var OP_BIT_XOR= 840;
var OP_BIT_OR= 584;
var OP_AND= 328;
var OP_OR= 72;
var OP_QUESTION= 68;
var OP_QUESTION_SELECT= 69;
var OP_JOIN= 64;
var OP_PUT= 65;






var TYPE_TOKEN_MAP = {}
var TOKEN_TYPE_MAP = {}
function addToken(type,token){
	TYPE_TOKEN_MAP[type] = token;
	TOKEN_TYPE_MAP[token] = type;
}

addToken(VALUE_CONSTANTS ,"value");
addToken(VALUE_VAR       ,"var");
addToken(VALUE_LIST      ,"[]");
addToken(VALUE_MAP       ,"{}");


//九：（最高级别的运算符号）
addToken(OP_GET      ,".");
addToken(OP_INVOKE   ,"()");

//八
addToken(OP_NOT     ,"!");
addToken(OP_BIT_NOT ,"~");
addToken(OP_POS     ,"+");
addToken(OP_NEG     ,"-");

//七：
addToken(OP_MUL ,"*");
addToken(OP_DIV ,"/");
addToken(OP_MOD ,"%");

//六：
//与正负符号共享了字面值
addToken(OP_ADD ,"+");
addToken(OP_SUB ,"-");

//五:移位
addToken(OP_LSH   ,"<<");
addToken(OP_RSH   ,">>");
addToken(OP_URSH   ,">>>");

//四:比较
addToken(OP_LT   ,"<");
addToken(OP_GT   ,">");
addToken(OP_LTEQ ,"<=");
addToken(OP_GTEQ ,">=");
addToken(OP_IN   ," in ");

//四:等不等比较
addToken(OP_EQ        ,"==");
addToken(OP_NE        ,"!=");
addToken(OP_EQ_STRICT ,"===");
addToken(OP_NE_STRICT ,"!==");

//三:按位与或
addToken(OP_BIT_AND ,"&");
addToken(OP_BIT_XOR ,"^");
addToken(OP_BIT_OR  ,"|");
//三:与或
addToken(OP_AND ,"&&");
addToken(OP_OR  ,"||");

//二：
//?;
addToken(OP_QUESTION        ,"?");
//:;
addToken(OP_QUESTION_SELECT ,":");

//一：
//与Map Join 共享字面量（map join 会忽略）
addToken(OP_JOIN   ,",");
//与三元运算符共享字面值
addToken(OP_PUT   ,":");



function findTokenType(token) {
	return TOKEN_TYPE_MAP[token];
}
function findTokenText(type) {
	return TYPE_TOKEN_MAP[type];
}

function hasTokenParam(type) {
	switch (type) {
	case VALUE_VAR:
	case VALUE_CONSTANTS:
//	case OP_GET_STATIC_PROP:
//	case OP_INVOKE_WITH_STATIC_PARAM:
//	case OP_INVOKE_WITH_ONE_PARAM:
	case OP_PUT:
		return true;
	default:
		return  false;
	}
}
function getTokenParam(el) {
	return el[getTokenParamIndex(el[0])]
}

function getTokenLength(type) {
	var size = getTokenParamIndex(type);
	return hasTokenParam(type)?size+1:size;

}
//function optimizeEL(el){
//	var type = el[0];
//	var end = getTokenParamIndex(type) ;
//	if (end > 1) {//2,3
//	
//		el[1] = optimizeEL(el[1]);
//		var co = canOptimize(el[1][0]);
//		if(end>2){
//			el[2] = optimizeEL(el[2]);
//			co = co &&  canOptimize(el[2][0]);
//		}
//		if(co){
//			var o = evaluate(el, []);
//			var type = typeof o;
//			switch(type){
//				case 'string':
//				case 'boolean':
//					break;
//				case 'number':
//					if(isFinite(o)){
//						break;
//					}
//				default:
//					if(o != null){//object undefined
//						return el;
//					}
//			}
//			return [VALUE_CONSTANTS,o]
//		}
//	}
//	return el;
//}
//
//function canOptimize(type) {
//	return type == VALUE_CONSTANTS;
//}
function getTokenParamIndex(type) {
	if(type<0){
		return 1;
	}
	var c = (type & BIT_ARGS) >> 6;
	return c + 2;
}

var offset = 0
var TYPE_NULL = 1<<offset++;
var TYPE_BOOLEAN = 1<<offset++;
var TYPE_NUMBER = 1<<offset++;
var TYPE_STRING = 1<<offset++;
var TYPE_ARRAY = 1<<offset++;
var TYPE_MAP = 1<<offset++;
var TYPE_ANY = (1<<offset++) -1;

//var TYPE_NULL = 1<<offset++;
//var TYPE_BOOLEAN = 1<<offset++;
//var TYPE_NUMBER = 1<<offset++;

//var TYPE_STRING = 1<<offset++;
//var TYPE_ARRAY = 1<<offset++;
//var TYPE_MAP = 1<<offset++;
/**
 * number return true
 * string return false;
 */
function isNTSFAN(type){
	var isN = (type & TYPE_NULL) ||(type & TYPE_BOOLEAN) ||(type & TYPE_NUMBER);
	var isS = (type & TYPE_STRING) ||(type & TYPE_ARRAY) ||(type & TYPE_MAP);
	if(!isS ){
		return true;
	}
	if(!isN ){
		return false;
	}
	return null;
}
function getAddType(arg1,arg2){
	var t1 = getELType(arg1);
	var t2 = getELType(arg2);
	var ns1 = isNTSFAN(t1);
	var ns2 = isNTSFAN(t2);
	//alert([ns1,ns2])
	
	if(ns1 === false || ns2 === false){
		return TYPE_STRING;
	}
	if(ns1 === true && ns2 === true){
		return TYPE_NUMBER;
	}
	return TYPE_NUMBER|TYPE_STRING;
}
function getELType(el){
	var op = el[0];
	var type;
	if(op>0){
		var arg1 = el[1];
		var arg2 = el[2];
		switch(op){
		case OP_JOIN:
			return TYPE_ARRAY;
		case OP_PUT:
			return TYPE_MAP;
		case OP_ADD:
			//if(isNumberAdder(arg1)&&isNumberAdder(arg2)){
			//	//return 'number';
			//}else{
			return getAddType(arg1,arg2)
			//}
		case OP_POS:
		case OP_NEG:
		case OP_MUL:
		case OP_DIV:
		case OP_MOD:
		case OP_SUB:
		case OP_BIT_AND:
		case OP_BIT_XOR:
		case OP_BIT_OR:
		case OP_BIT_NOT:
			return  TYPE_NUMBER;
		case OP_NOT:
		case OP_LT:
		case OP_GT:
		case OP_LTEQ:
		case OP_GTEQ:
		case OP_EQ:
		case OP_NE:
		case OP_EQ_STRICT:
		case OP_NE_STRICT:
			return  TYPE_BOOLEAN;
		case OP_AND:
		case OP_OR:
			return  getELType(arg1) | getELType(arg2);
		case OP_GET:
			if(arg2[0] == VALUE_CONSTANTS){
				if(arg1[0] == VALUE_VAR && arg1[1] == 'for'){
					if(arg2[1] == 'index' || arg2[1] == 'lastIndex'){
						return TYPE_NUMBER;
					}
				}else if( arg2[1] == 'length'){
					var t1 = getELType(arg1);
	//var TYPE_NULL = 1<<offset++;
	//var TYPE_BOOLEAN = 1<<offset++;
	//var TYPE_NUMBER = 1<<offset++;
	
	//var TYPE_STRING = 1<<offset++;
	//var TYPE_ARRAY = 1<<offset++;
	
	//var TYPE_MAP = 1<<offset++;
					if(t1 & TYPE_MAP){
						return TYPE_ANY;
					}else if((t1 & TYPE_ARRAY) || (t1 & TYPE_STRING)){
						if((t1 & TYPE_STRING) || (t1 & TYPE_BOOLEAN)||(t1 & TYPE_NUMBER)){
							return TYPE_NULL|TYPE_NUMBER;
						}else{
							return TYPE_NUMBER;
						}
					}else{//only TYPE_STRING TYPE_BOOLEAN TYPE_NUMBER
						return TYPE_NULL;
					}
				}
			}
			return TYPE_ANY;
		case OP_INVOKE:
			if(arg1[0] == VALUE_VAR){
				switch(arg1[1]){
					case "encodeURI":
					case "encodeURIComponent":
					case "decodeURI":
					case "decodeURIComponent":
						return TYPE_STRING;
					case "parseInt":
					case "parseInt":
						return TYPE_NUMBER;
					case "isFinite":
					case "isNaN":
						return TYPE_BOOLEAN;
				}
			}else if(arg1[0] == OP_GET){
				//console.warn(uneval(arg1));
				arg2 = arg1[2];
				arg1 = arg1[1];
				if(arg2[0] == VALUE_CONSTANTS){
					var method = arg2[1];
					if(arg1[0] == VALUE_VAR){
						var owner = arg1[1];
						if(owner == 'JSON'){
							if(method == 'stringify'){
								return TYPE_STRING;
							}
						}else if(owner == 'Math'){
							return TYPE_NUMBER;
						}
					}
				}
			}
			return TYPE_ANY;
		default:
			return TYPE_ANY;
		}
	}else{
		switch(op){
		case VALUE_CONSTANTS:
			var v= el[1];
			if(v == null){
				return TYPE_NULL;
			}
			switch(typeof v){
			case 'boolean':
				return TYPE_BOOLEAN;
			case 'number':
				return TYPE_NUMBER;
			case 'string':
				return TYPE_STRING;
			case 'object':
				if(v instanceof Array){
					return TYPE_ARRAY;
				}
				return TYPE_MAP;
			}
			return TYPE_ANY;
		case VALUE_VAR:
			return TYPE_ANY;
		case VALUE_LIST:
			return TYPE_ARRAY;
		case VALUE_MAP:
			return TYPE_MAP;
		default:
			return TYPE_ANY;
		}
	}
}

/**
 * 获取某个运算符号的优先级
 */
function addELQute(parentEl,childEL,value1,value2){
	var pp = getPriority(parentEl[0]);
	var cp = getPriority(childEL[0]);
	if(value1){
		if(cp<pp){
			value1 = '('+value1+')';
		}
		return value1;
	}else if(value2 && pp>=cp){
		value2 = '('+value2+')';
	}
	return value2;
}

if(typeof require == 'function'){
exports.getTokenParam=getTokenParam;
exports.hasTokenParam=hasTokenParam;
exports.getTokenParamIndex=getTokenParamIndex;
exports.getTokenLength=getTokenLength;
exports.findTokenType=findTokenType;
exports.findTokenText=findTokenText;
exports.getELType=getELType;
exports.addELQute=addELQute;
exports.BIT_ARGS=BIT_ARGS;
exports.BIT_PRIORITY=BIT_PRIORITY;
exports.BIT_PRIORITY_SUB=BIT_PRIORITY_SUB;
exports.OP_ADD=OP_ADD;
exports.OP_AND=OP_AND;
exports.OP_BIT_AND=OP_BIT_AND;
exports.OP_BIT_NOT=OP_BIT_NOT;
exports.OP_BIT_OR=OP_BIT_OR;
exports.OP_BIT_XOR=OP_BIT_XOR;
exports.OP_DIV=OP_DIV;
exports.OP_EQ=OP_EQ;
exports.OP_EQ_STRICT=OP_EQ_STRICT;
exports.OP_GET=OP_GET;
exports.OP_GT=OP_GT;
exports.OP_GTEQ=OP_GTEQ;
exports.OP_IN=OP_IN;
exports.OP_INVOKE=OP_INVOKE;
exports.OP_JOIN=OP_JOIN;
exports.OP_LSH=OP_LSH;
exports.OP_LT=OP_LT;
exports.OP_LTEQ=OP_LTEQ;
exports.OP_MOD=OP_MOD;
exports.OP_MUL=OP_MUL;
exports.OP_NE=OP_NE;
exports.OP_NEG=OP_NEG;
exports.OP_NE_STRICT=OP_NE_STRICT;
exports.OP_NOT=OP_NOT;
exports.OP_OR=OP_OR;
exports.OP_POS=OP_POS;
exports.OP_PUT=OP_PUT;
exports.OP_QUESTION=OP_QUESTION;
exports.OP_QUESTION_SELECT=OP_QUESTION_SELECT;
exports.OP_RSH=OP_RSH;
exports.OP_SUB=OP_SUB;
exports.OP_URSH=OP_URSH;
exports.TYPE_ANY=TYPE_ANY;
exports.TYPE_ARRAY=TYPE_ARRAY;
exports.TYPE_BOOLEAN=TYPE_BOOLEAN;
exports.TYPE_MAP=TYPE_MAP;
exports.TYPE_NULL=TYPE_NULL;
exports.TYPE_NUMBER=TYPE_NUMBER;
exports.TYPE_STRING=TYPE_STRING;
exports.TYPE_TOKEN_MAP=TYPE_TOKEN_MAP;
exports.VALUE_CONSTANTS=VALUE_CONSTANTS;
exports.VALUE_LIST=VALUE_LIST;
exports.VALUE_MAP=VALUE_MAP;
exports.VALUE_VAR=VALUE_VAR;
var evaluate=require(31).evaluate;
var getPriority=require(29).getPriority;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
var VAR_LITE_EL_TEMP = "$__el_tmp"
var FOR_STATUS_KEY = '$__for';
/**
 * 将Lite的表达式结构转化为php表达式
 */
function stringifyPHPEL(el,context){
	var type = el[0];
	if(type<=0){//value
		return stringifyValue(el,context)
	}else if(getTokenParamIndex(type) ==3){//两个操作数
		return stringifyInfix(el,context);
	}else{
		return stringifyPrefix(el,context);
	}
}
function stringifyValue(el,context){
		var param = el[1];
		switch(el[0]){
        case VALUE_CONSTANTS:
            return stringifyPHP(param);
        case VALUE_VAR:
        	if(param == 'for'){
        		return FOR_STATUS_KEY;
        	}else{
        		return '$'+param;
        	}
        case VALUE_LIST:
        case VALUE_MAP:
        	return "array()";
		}
}

function typesOnly(t1,t2){
	var i = arguments.length;
	var a = 0;
	while(--i>1){
		a |= arguments[i];
	}
	var t = t1 | t2;
	return (t & a) == t;
}
function stringifyADD(el,context){
	var t = getELType(el);
	var value1 = stringifyPHPEL(el[1],context);
	var value2 = stringifyPHPEL(el[2],context);
	if(t == TYPE_NUMBER){
		return value1+'+'+value2;//动态部分要考虑 array的问题,这里不需要考虑
	}else if(t == TYPE_STRING){
		if(/[\d]$/.test(value1)){
			value1+=' ';
		}
		if(/^[\d]/.test(value2)){
			value2=' '+value2;
		}
		//还需要处理 null,true,false 字面量的问题
		
		var t1 = getELType(el[1]);
		var t2 = getELType(el[2]);
		//console.error(t1,t2)
		if(typesOnly(t1,t2,TYPE_STRING,TYPE_NUMBER)){
			return value1+'.'+value2;
		}
	}
	//字符串加法不复合交换律
//	if(typesOnly(t1,t1,TYPE_NULL,TYPE_NUMBER,TYPE_BOOLEAN)){
//		return "lite_op__add_nx("+value1+','+value2+")"
//	}
//	if(typesOnly(t2,t2,TYPE_NULL,TYPE_NUMBER,TYPE_BOOLEAN)){
//		return "lite_op__add_nx("+value2+','+value1+")"
//	}
	return "lite_op__add("+value1+','+value2+")"
}

//var TYPE_NULL = 1<<offset++;

//var TYPE_BOOLEAN = 1<<offset++;
//var TYPE_NUMBER = 1<<offset++;

//var TYPE_STRING = 1<<offset++;
//var TYPE_ARRAY = 1<<offset++;
//var TYPE_MAP = 1<<offset++;
function stringifyEQ(el,context,opc){
	var t1 = getELType(el[1]);
	var t2 = getELType(el[2]);
	var value1 = stringifyPHPEL(el[1],context);
	var value2 = stringifyPHPEL(el[2],context);
	opc = opc || '==';
	if(t1 ==  TYPE_STRING ||  t2 == TYPE_STRING){//0 == 'ttt'=>false
        return "strcmp("+value1+","+value2+") "+opc+"0";
    }
    
    if(t1 === TYPE_NULL || t2 === TYPE_NULL){
    	return value1+opc+'='+value2;
    }
    if(typesOnly(t1,t2,TYPE_NUMBER,TYPE_BOOLEAN)
//    		||typesOnly(t1,t2,TYPE_BOOLEAN,TYPE_STRING)//'0' ==false;
//    		||typesOnly(t1,t2,TYPE_NUMBER,TYPE_STRING)//'0' == 0
//    		||typesOnly(t1,t2,TYPE_NUMBER,TYPE_BOOLEAN)//'0' ==false;"
    		||typesOnly(t1,t2,TYPE_ARRAY,TYPE_MAP,TYPE_STRING)//'' ==array() => false,忽略array.toString ==//php ;
    		||t1.toString(2).replace(/0/g,'').length==1 && t1 == t2){
        return value1+opc+value2;
    }
    return (opc=='!='?'!':'')+"lite_op__eq("+value1+','+value2+")"
}
var math = {
	"E":2.718281828459045,
	"PI":3.141592653589793,
	"LN2":0.6931471805599453,
	"LN10":2.302585092994046,
	"LOG2E":1.4426950408889634,
	"LOG10E":0.4342944819032518,
	"SQRT1_2":0.7071067811865476,
	"SQRT2":1.4142135623730951
}
function stringifyGET(el,context){
	var arg1 = el[1];
	var arg2 = el[2];
	var value1 = stringifyPHPEL(el[1],context);
	var value2 = stringifyPHPEL(el[2],context);
	if(arg2[0] == VALUE_CONSTANTS){
		var prop = arg2[1];
		if( prop != 'length'){
			//这里有可能要抛警告
			if(arg1[0] == VALUE_VAR){
				var owner = arg1[1];
				if(owner == 'Math' && !(owner in context.scope.defMap && owner in context.scope.varMap && owner in context.scope.paramMap)){
					if(typeof math[prop] == 'number'){
						return '('+math[prop]+')';
					}
				}
			}
			if(!/^[^(][\s\S]*\)$/.test(value1) && !/^(true|false|null|[\d\.]+)$/.test(value1)){//php bug method(args)[index]非法
				return value1+'['+value2+']';
			}
			
		}
	}
	return "lite_op__get("+value1+','+value2+")"
}
/**
 * return [owner,prop,args]
 */
function parseInvoke(el){
	var method = el[1];
	if(method[0] == OP_GET){//member_call
		var ownerEL = method[1];
		var propEL = method[2];
		if(ownerEL[0] == VALUE_VAR){
			var varName = ownerEL[1];
		}
		if(propEL[0] == VALUE_CONSTANTS){
			var prop = propEL[1];
		}
		return [varName||ownerEL,prop||propEL,el[2]];
	}else{//function_call
		if(method[0] == VALUE_VAR){
			var varName = method[1];
		}
		return [varName||method,null,el[2]]
	}
}
function stringifyPHPEL2ID(el,context,id){
	if(typeof el != 'string'){
		return stringifyPHPEL(el,context)
	}else if(id){
		return '$'+el;
	}
	return "'"+el+"'";
}
function stringifyINVOKE(el,context){
	var info = parseInvoke(el);
	var owner = info[0];
	var prop = info[1];
	var args = stringifyPHPEL(info[2],context);
	if(prop){//member_call
		if(typeof prop == 'string'){
//			random=>rand(0, PHP_INT_MAX
//			sin,sqrt,tan,cos,acos,asin,atan,atan2 
//			max,min,,floor,round,abs,ceil,exp,log,pow,
			if(owner === 'Math'){
				var mp = /^(?:sin|sqrt|tan|cos|acos|asin|atan|atan2|max|min||floor|round|abs|ceil|exp|log|pow)$/;
				if(prop == 'random'){
					return '(rand(0, 0xFFFF)/0xFFFF)';
				}else if(mp.test(prop)){
					return args.replace('array',prop);
				}else{
					console.warn("Math 不支持方法:"+prop+";Math 支持的方法有:random|"+mp.source.replace(/[^\w\|]/g,''))
				}
			}else if(owner === 'JSON'){
				if(prop == "parse"){
					return args.replace('array','json_decode').slice(0,-1)+',true)';
				}else if(prop =='stringify'){
					return args.replace('array','json_encode');
				}else{
					console.warn("JSON 不支持方法:"+prop+";JSON 只支持:stringify和parse方法")
				}
			}else if(prop == 'reverse' && args == 'array()' && owner[0] == OP_INVOKE){
				var info2 = parseInvoke(owner);
				//console.error(info2);
				if(info2[1] == 'concat'){
					owner = info2[0];
					owner = stringifyPHPEL2ID(owner,context,true)
					args = stringifyPHPEL(info2[2],context);
					return "lite_op__invoke("+owner+",'concat_reverse',"+args+")"
				}
			}
		}
		owner = stringifyPHPEL2ID(owner,context,true)
		prop = stringifyPHPEL2ID(prop,context)
		return "lite_op__invoke("+owner+","+prop+","+args+")"
		//value1 = value1.replace(/.*?,([\s\S]+)\)/,'array($1)');
	}else if(typeof owner == 'string'){
		if((owner in GLOBAL_DEF_MAP || owner in context.scope.defMap)
			&& !(owner in context.scope.varMap || owner in context.scope.paramMap)){
			//静态编译方式
			return args.replace('array',"lite__"+owner)
		}else{
			//动态调用方式
			//console.error("!!!!!!!!!!!!",context.scope.varMap);
			if(owner in context.scope.varMap || owner in context.scope.paramMap){
				var fn = '$'+owner;
			}else{
				var fn = "isset($"+owner+")?$"+owner+":'"+owner+"'";
			}
			return 'lite_op__invoke('+fn+',null,'+args+')';
		}
	}else{
		//console.error("??????????",typeof owner,owner,context.scope.varMap);
		owner = stringifyPHPEL2ID(owner,context,true)
		//console.error(owner);
		return 'lite_op__invoke('+owner+',null,'+args+')';
		//throw new Error("Invalid Invoke EL");
	}
}
/**
 * 翻译中缀运算符
 */
function stringifyInfix(el,context){
	var type = el[0];
	if(type == OP_ADD){
		return stringifyADD(el,context)
	}else if(type == OP_EQ){
		return stringifyEQ(el,context,'==')
	}else if(type == OP_NE){
		return stringifyEQ(el,context,'!=');
	}else if(type == OP_GET){
		return stringifyGET(el,context);
	}else if(type == OP_INVOKE){
		return stringifyINVOKE(el,context);
	}
	var opc = findTokenText(el[0]);
	var value1 = stringifyPHPEL(el[1],context);
	var value2 = stringifyPHPEL(el[2],context);
	switch(type){
	case OP_JOIN:
		if("array()"==value1){
			return "array("+value2+")"
		}else{
			return value1.slice(0,-1)+','+value2+")"
		}
	case OP_PUT:
		value2 = stringifyPHP(getTokenParam(el))+"=>"+value2+")";
		if("array()"==value1){
			return "array("+value2
		}else{
			return value1.slice(0,-1)+','+value2
		}
    case OP_QUESTION:
    	//1?2:3 => [QUESTION_SELECT,
    	// 					[QUESTION,[CONSTANTS,1],[CONSTANTS,2]],
    	// 					[CONSTANTS,3]
    	// 			]
    	//throw new Error("表达式异常：QUESTION 指令翻译中应该被QUESTION_SELECT跳过");
    	return null;//前面有一个尝试，此处应返回null，而不是抛出异常。
    case OP_QUESTION_SELECT:
    /**
 ${a?b:c}
 ${a?b1?b2:b3:c}
 ${222+2|a?b1?b2:b3:c}
     */
     	var arg1 = el[1];
    	var test = stringifyPHPEL(arg1[1],context);
    	var value1 = stringifyPHPEL(arg1[2],context);
    	//return '('+LITE_INVOKE+OP_NOT+','+test+')?'+value2+":"+value1+')';
    	return '('+php2jsBoolean(arg1[1],test)+'?'+value1+':'+value2+')'
    case OP_AND://&&
    	if(isSimplePHPEL(value1)){
    		return '('+php2jsBoolean(el[1],value1)+'?'+value2+':'+value1+')'
    	}
    	return '(('+php2jsBoolean(el[1],value1,VAR_LITE_EL_TEMP)+')?'+value2+':'+VAR_LITE_EL_TEMP+')'
    case OP_OR://||
    	if(isSimplePHPEL(value1)){
    		return '('+php2jsBoolean(el[1],value1)+'?'+value1+':'+value2+')'
    	}
    	return '(('+php2jsBoolean(el[1],value1,VAR_LITE_EL_TEMP)+')?'+VAR_LITE_EL_TEMP+':'+value2 +')'
	}
	value1 = addELQute(el,el[1],value1)
	value2 = addELQute(el,el[2],null,value2)
	return value1 + opc + value2;
}


function stringifyPHP(value) {
    switch (typeof value) {
        case 'string':
	    	return '\'' + value.replace(/[\\']/g,"\\$&")+ '\'';
        case 'number':
            if(isNaN(value)){
                value = 'null';
            }
            return ''+value;
        case 'undefined':
        	return 'null';
        case 'object':
            if (!value) {
                return 'null';
            }
            var buf = [];
            if (value instanceof Array) {
                var i = value.length;
                while (i--) {
                    buf[i] = stringifyPHP(value[i]) || 'null';
                }
                return 'array(' + buf.join(',') + ')';
            }else if(value instanceof RegExp){
            	return "array('class'=>'RegExp','source'=>'"+value.replace(/[\\']/g,"\\$&")+"')";
            }
            for (var k in value) {
                var v = stringifyPHP(value[k]);
                if (v) {
                    buf.push(stringifyPHP(k) + '=>' + v);
                }
            }
            return 'array(' + buf.join(',') + ')';
        default://boolean
            return String(value);
    }
}

/**
 * 翻译前缀运算符
 */
function stringifyPrefix(el,context){
	var type = el[0];
	var el1 = el[1];
	var value2 = stringifyPHPEL(el1,context);
	var param = getTokenParam(el,context);
	if(type == OP_NOT){//!
		//return value1+'['+value2+']';
		var rtv = php2jsBoolean(el1,value2);
		if(!isSimplePHPEL(rtv)){
			rtv = '('+rtv+')';
		}
		return '!'+rtv;
	}
	value2 = addELQute(el,el[1],null,value2)
    var opc = findTokenText(type);
	return opc+value2;
}

/**
 * 如果不是变量或者常量，则必须设置零时变量
 */
function php2jsBoolean(el,value,keepValue,context){
	if(!value){
		value = stringifyPHPEL(el,context);
	}
	var op = el[0];
	if(op<=0){
		switch(op){
		case VALUE_CONSTANTS:
			
			if(keepValue){
				if(el[1]){
					return '(('+keepValue+'='+value+')||true)';
				}else{
					return '(('+keepValue+'='+value+')&&false)';
				}
//			}else if(booleanVar){//keepValue 和 booleanVar 只选一个
//				if(el[1]){
//					return '('+booleanVar+'=true)';
//				}else{
//					return '('+booleanVar+'=false)';
//				}
			}else{
				return !!el[1]+'';
			}
			
		case VALUE_VAR:
			break;
		case VALUE_LIST:
		case VALUE_MAP:
		default:
			if(keepValue){
				return '(('+keepValue+'='+value+')||true)'
			}else{
				return 'true';
			}
		}
	}
//var TYPE_NULL = 1<<offset++;
//var TYPE_BOOLEAN = 1<<offset++;
//var TYPE_NUMBER = 1<<offset++;

//var TYPE_STRING = 1<<offset++;
//var TYPE_ARRAY = 1<<offset++;
//var TYPE_MAP = 1<<offset++;
//var TYPE_ANY = (1<<offset++) -1;
	var type = getELType(el);
	
	if(!((type & TYPE_STRING)||(type & TYPE_ARRAY)||(type & TYPE_MAP))){
		if(!keepValue){//持续优化
			return value;
		}else{
			return '('+keepValue +'='+value+')';
		}
	}
	if(isSimplePHPEL(value) && !keepValue){
		var rtv = value;
		keepValue = value;
	}else{
		keepValue = keepValue || VAR_LITE_EL_TEMP;
		var rtv = "("+keepValue +"="+ value+")"
	}
	if((type & TYPE_ARRAY)||(type & TYPE_MAP)){
		rtv+=' || 0 < '+keepValue;
	}
	if((type & TYPE_STRING)){
		rtv+=" || '0' ==="+keepValue;
	}
	return '('+rtv+')'
}
function isSimplePHPEL(value){
	return value.match(/^([\w_\$]+|[\d\.]+)$/)
}
/**
 * 获取某个运算符号的优先级
 */
function getELPriority(el) {
	return getPriority(el[0]);
}
if(typeof require == 'function'){
exports.stringifyPHPEL=stringifyPHPEL;
exports.stringifyPHP=stringifyPHP;
exports.php2jsBoolean=php2jsBoolean;
exports.isSimplePHPEL=isSimplePHPEL;
var getTokenParam=require(17).getTokenParam;
var getTokenParamIndex=require(17).getTokenParamIndex;
var findTokenText=require(17).findTokenText;
var getELType=require(17).getELType;
var addELQute=require(17).addELQute;
var OP_ADD=require(17).OP_ADD;
var OP_AND=require(17).OP_AND;
var OP_EQ=require(17).OP_EQ;
var OP_GET=require(17).OP_GET;
var OP_IN=require(17).OP_IN;
var OP_INVOKE=require(17).OP_INVOKE;
var OP_JOIN=require(17).OP_JOIN;
var OP_NE=require(17).OP_NE;
var OP_NOT=require(17).OP_NOT;
var OP_OR=require(17).OP_OR;
var OP_PUT=require(17).OP_PUT;
var OP_QUESTION=require(17).OP_QUESTION;
var OP_QUESTION_SELECT=require(17).OP_QUESTION_SELECT;
var TYPE_ANY=require(17).TYPE_ANY;
var TYPE_ARRAY=require(17).TYPE_ARRAY;
var TYPE_BOOLEAN=require(17).TYPE_BOOLEAN;
var TYPE_MAP=require(17).TYPE_MAP;
var TYPE_NULL=require(17).TYPE_NULL;
var TYPE_NUMBER=require(17).TYPE_NUMBER;
var TYPE_STRING=require(17).TYPE_STRING;
var VALUE_CONSTANTS=require(17).VALUE_CONSTANTS;
var VALUE_LIST=require(17).VALUE_LIST;
var VALUE_MAP=require(17).VALUE_MAP;
var VALUE_VAR=require(17).VALUE_VAR;
var getPriority=require(32).getPriority;
var GLOBAL_DEF_MAP=require(1).GLOBAL_DEF_MAP;
}
}
,
function(exports,require){
var findXMLAttribute=require(7).findXMLAttribute;

function processI18N(node){
	if (node.nodeType == 2) {
		var el = node.ownerElement;
		el.removeAttribute(node.name);
		this.next(el);
	}else if (node.nodeType == 1){
		this.parse(node.childNodes);
	}
}
function processI18N2(node){
	var i18nKey = findXMLAttribute(node,'i18n');
	var uri = this.currentURI;
	var path = uri.scheme == 'lite'? uri.path: String(uri);
	if(node.nodeType == 1){
		var begin = this.mark();
		_parseChild(this,node);
		var content = this.reset(begin);
		
		i18nKey = i18nHash(path,i18nKey,node.textContent);
		//
		this.parse("${I18N."+i18nKey+"}");
	}else{
		var el = node.ownerElement;
		var node2 = el.cloneNode(true)||el;
		var begin = this.mark();
		this.parse(el.textContent);
		var content = this.reset(begin);

		i18nKey = i18nHash(path,i18nKey,el.textContent);
		node2.textContent = "${I18N."+i18nKey+"}";
		node2.removeAttribute(node.name);
		node2.setAttribute('data-i18n-key',i18nKey)
		this.next(node2);
	}
	addI18NData(this,i18nKey,content);
}
function seekI18N(text){
	
}


//TODO:?>>
function parsePHP(node){
	var value = node.textContent || node.text;
	this.appendPlugin(PLUGIN_NATIVE,'{"type":"php"}');
	parseChildRemoveAttr(this,node);
	this.appendEnd();
}
function parseJS(node){
	var value = node.textContent || node.text;
	this.appendPlugin(PLUGIN_NATIVE,'{"type":"js"}');
	parseChildRemoveAttr(this,node);
	this.appendEnd();
}



function addI18NData(context,i18nKey,content){
	if(typeof content != 'string' && content.length == 1){
		content = content[0];
	}
	var i18nSource = context.getAttribute("#i18n-source");
	var i18nObject = context.getAttribute("#i18n-object");
	if(!i18nObject){
		i18nObject = {};
		context.setAttribute("#i18n-object",i18nObject);
	}
	if(i18nKey in i18nObject){
		i18nObject[i18nKey] = content;
		i18nSource = JSON.stringify(i18nObject)
	}else{
		if(i18nSource){
			i18nSource = i18nSource.slice(0,-1)+',';
		}else{
			i18nSource = '{';
		}
		i18nSource = i18nSource + '"'+i18nKey+'":' +JSON.stringify(content)+'}';
	}
	
	context.setAttribute("#i18n-data",i18nSource);
}


function i18nHash(path,i18nKey,text){
	path = path.replace(/[^\w]|_/g,function(c){
		return '_'+numberToString(100+c.charCodeAt(),62).slice(-2)
	});
	if(!i18nKey){
		i18nKey = 0;
		text = text.replace(/[^\s]/,function(c){
			i18nKey = i18nKey + (i18nKey & 2) + c.charCodeAt();
		})
		i18nKey = numberToString(i18nKey,62)
	}
	return path +'__'+ i18nKey;
}
var b64codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
function numberToString(value,radix){
	var buf = [];
	while(value>0){
		var m = value%radix;
		buf.push(b64codes[m]);
		value = (value-m)/radix;
	}
	return buf.reverse().join('')
}



exports.setup = function(Core){
	Core.beforeI18n =processI18N;
	Core.parseI18n =processI18N;
}
exports.i18nHash = i18nHash;
}
,
function(exports,require,module){console.log("read module err!!!xpath.js\n")
}
,
function(exports,require,module){console.log("read module err!!!fs\nError: ENOENT: no such file or directory, open 'fs'")
}
,
function(exports,require){/**
 * 	
	public OptimizePlugin getPlugin(List<Object> object);
	public OptimizeScope parseScope(List<Object> children, List<String> params);
	public Map<String, Set<String>> getDefCallMap();
	public void optimizeCallClosure(Map<String, Set<String>> callMap,
			Set<String> optimizedCall);
			* 
 * @see org.xidea.lite.OptimizeContext#optimize();
 */
function doOptimize(defMap,templateList){
	var pluginObjectList = [];
	var optimizeContext = [templateList,defMap,pluginObjectList];
	optimizePluginWalk(templateList, function(parentNode, index) {
		var cmd = parentNode[index];
		var config = cmd[2];
		var className = config["class"];
		try {
			var children =cmd[1];
			var plugin = new PLUGIN_TYPE_MAP[className](config, children, optimizeContext);
			pluginObjectList.push([plugin,cmd]);
			//TODO:..
			//pluginMap.put(cmd, plugin);
		} catch (e) {
			console.warn("ParsePlugin initialize failed:" + config, e);
		}
		return index;
	});
	if(pluginObjectList.length){
		for (var i=0,l=pluginObjectList.length;i<l;i++) {
			pluginObjectList[i][0].before();
		}
		// sort walk
		optimizePluginWalk(templateList, function( parentNode, index) {
			var cmd =  parentNode[index];
			for (var i=0,l=pluginObjectList.length;i<l;i++) {
				if(pluginObjectList[i][1] == cmd){
					var p = pluginObjectList[i][0];
					break;
				}
			}
			if (p != null) {
				p.optimize();
			}
			return index;
		},null);
		optimizePluginWalk(templateList, function(  parentNode, index) {
			var cmd = parentNode[index];
			var config = cmd[2];
			var className = config["class"];
			if(className in PLUGIN_TYPE_MAP){
				var children = cmd[1];
				var args = [index,1].concat(children);
				parentNode.splice.apply(parentNode,args);
				index--;
				index += children.length;
			}
			return index;
		});
	}
	var result = [];
	for(var n in defMap){
		result.push(defMap[n]);
	}
	return result.concat(templateList);
}
/**
 * callMap = {"fn":{"fn1":1,"fn2":2...}}
 * closure = {"fn1":1,"fn2":2}
 */
function optimizeCallClosure(callMap,
			closure) {
	for(var n in closure){
		if(!(n in callMap)){
			delete closure[n]
		}
	}
	var waitMap = closure;
	while (true) {
		var newClosure = {};
		for (var fn in waitMap) {
			var called = callMap[fn];
			for (var fn2 in called) {
				if ((fn2 in callMap)
						&& !(fn2 in closure) && !(fn2 in newClosure)) {
					newClosure[fn2]=1;
				}
			}
		}
		var hit  = false;
		for(var fn in newClosure){
			hit = true;
			closure[fn] = 1;
		}
		if (hit) {
			waitMap = newClosure;
		} else {
			return;
		}
	}
}

var inc = 1;
function ClientPlugin(config, children, optimizeContext){
	this.name = config.name;
	this.params = config.params;
	this.defaults = config.defaults;
	this.children = children;
	this.context = optimizeContext;
	this.inc = inc++;
}
ClientPlugin.prototype = {
	before:function(){
	},
	optimize:function(){
//		console.info("optimize!!!",this.optimizedCall == null,this.inc);
		if(this.optimizedCall == null){
			optimizeAllClient.apply(this,this.context);
		}
		var defMap = this.context[1]
		var result = [];
		for(var n in this.optimizedCall){
			if(defMap[n]){
				result.push(defMap[n]);
			}else{
				console.error("Defined function not found:"+n)
			}
		}
		//if(!this.first){
		//	jst.liteImpl = jst.liteImpl || 'liteImpl';
		//}
		//var result = jst.translate(result.concat(this.children));
		
		var jst = new JSTranslator();
		var result = jst.translate(result.concat(this.children),{name:this.name,params:this.params,defaults:this.defaults});
		this.children.length = 0;
		this.children.push(result);
	}
}
function getDefScope(data){
	var scope = data[-1];
	if(!scope){
		scope = new OptimizeScope(data[1],data[2].params);
		data[-1] = scope;
	}
	return scope;
}
function copy(source,target){
	for(var n in source){
		target[n] = source[n];
	}
}
function remove(source,target){
	for(var n in source){
		delete target[n];
	}
}
function getDefCall(data){
	var scope = getDefScope(data);
	var callMap = {}
	copy(scope.callMap,callMap);
//	if(scope.callMap['*']){
//		copy(scope.externalRefMap,callMap);
//		delete callMap['*'];
//	}
	copy(scope.externalRefMap,callMap);
	remove(scope.varMap,callMap);
	remove(scope.paramMap,callMap);
	delete callMap['*'];
	return callMap
	
}
function optimizeAllClient(templateList,defMap,pluginObjectList){
	var positionList = [];
	var cmdList = [];
	var namedClientCallMap = {};
	var pluginList = [];
	var dataList = [];
	optimizePluginWalk(templateList, function( parentNode, index, post32) {
		var cmd =  parentNode[index];
		for(var i = pluginObjectList.length;i--;){
			var po = pluginObjectList[i];
			if(po[1] == cmd && po[0] instanceof ClientPlugin){
				var p = pluginObjectList[i][0];
				positionList.push(post32);//.replace(/\u0009./g,''));
				pluginList.push(p);
				cmdList.push(cmd);
				if(p.name){
					namedClientCallMap[p.name] = getDefCall(pluginObjectList[i][1]);
				}
				break;
			}
		}
		return index;
	},[]);
	var callMap = {};
	for(var n in namedClientCallMap){
		callMap[n] = namedClientCallMap[n];
	}
	for(var n in defMap){
		if(!(n in callMap)){
			callMap[n] = getDefCall(defMap[n]);
		}
	}
	for (var i = 0, end = positionList.length; i < end; i++) {
		var plugin = pluginList[i];
		var position = positionList[i];
		var optimizedCall = getDefCall(cmdList[i]);
		optimizeCallClosure(callMap, optimizedCall);
		for(var n in optimizedCall){
			if(n in namedClientCallMap){
				delete optimizedCall[n];
			}
		}
		var isFirst = true;
		for (var j = 0; j < i; j++) {
			if (position.indexOf(positionList[j]) ==0) {
				var removeMap = pluginList[j].optimizedCall;
				isFirst = false;
				for(var n in removeMap){
					delete optimizedCall[n];
				}
			}
		}
		plugin.first = isFirst;
		plugin.optimizedCall = optimizedCall;
	}
}
function ResourcePlugin(config, children, optimizeContext){
	this.id = config.id;
	this.context = optimizeContext;
	this.children = children;
	
}
ResourcePlugin.prototype = {
	before:function(){
		var remove = [];
		var id = this.id;
		optimizePluginWalk(this.context[0],function(parentNode, index, position) {
			var cmd = parentNode[index];
			var config = cmd[2];
			if (id == config.targetId) {
				remove.push(parentNode,index)
			}
			return index;
		});
		while(remove.length){
			var index = remove.pop();
			var parentNode = remove.pop();
			var cmds = parentNode.splice(index,1);
			this.children.push(cmds[0]);
		}
	},
	optimize:function(){
		
	}
}
var PLUGIN_TYPE_MAP = {
	//"org.xidea.lite.DefinePlugin":true,
	"org.xidea.lite.parse.ClientPlugin":ClientPlugin,
	"org.xidea.lite.parse.ResourcePlugin":ResourcePlugin
}
/**
 * @see org.xidea.lite.OptimizeContext#walk(OptimizeWalker parseWalker);
 */
function optimizePluginWalk(source,callback,position){
	for (var i = 0; i < source.length; i++) {
		var item = source[i];
		if (item instanceof Array) {
			var cmd = item;
			var type = cmd[0];
			switch (type) {
			case PLUGIN_TYPE:
				var config = cmd[2];
				var className =  config["class"];
				if (PLUGIN_TYPE_MAP[className]) {//这里不会碰到def
					var j = callback(source, i, position && String.fromCharCode.apply(null,position));
					if (j == -1) {
						return true;
					} else {
						i = j;
					}
				}
			case CAPTURE_TYPE:
			case IF_TYPE:
			case ELSE_TYPE:
			case FOR_TYPE:
				try{
					if (position) {
						position.push(type,i+32);
					}
					if(optimizePluginWalk(cmd[1], callback, position)){
						return true;
					}
				}finally{
					if (position) {
						position.pop();position.pop();
					}
				}

			}
		}
	}
	return false;
}
/**
 * 想当前栈顶添加数据
 * 解析和编译过程中使用
 * @public
 */
function optimizeResult(source){
    var result = [];
    var previousText;
    for(var i=0,j=0;i<source.length;i++){
    	var item = source[i];
		if ('string' == typeof item) {
			if(previousText==null){
				previousText = item;
			}else{
				previousText += item;
			}
		}else{
			if(previousText){
				result[j++] = previousText;
			}
			previousText = null;
			result[j++] = item;
		}
    }
    if(previousText){
    	result[j] = previousText;
    }
    return result;
}


/**
 * 将中间代码树形化,并将函数定义分离提出
 */
function buildTreeResult(result,defMap){
	var stack = [];//new ArrayList<ArrayList<Object>>();
	var current = [];// new ArrayList<Object>();
	stack.push(current);
	try{
		for (var i = 0;i<result.length;i++) {
		    var item = result[i];
			if ('string' == typeof item) {
				current.push(item);
			} else {
				if (item.length == 0) {//end
					var children = stack.pop();
					current = stack[stack.length-1];//向上一级列表
					var parentNode = current.pop();//最后一个是当前结束的标签
					parentNode[1]=children;
					if(parentNode[0] == PLUGIN_TYPE){
						var config = parentNode[2];
						if(config['class']== 'org.xidea.lite.DefinePlugin'){
							var name_ = config.name;
							if(name_ in defMap){
								if(JSON.stringify(parentNode) != JSON.stringify(defMap[name_])){
									console.warn("def "+name_+" is found before");
								}
							}
							defMap[name_]=parentNode;
						}else{
							current.push(parentNode);
						}
					}else{
						current.push(parentNode);
					}
					
				} else {
					var type = item[0];
					var cmd2 =[];
					cmd2.push(item[0]);
					current.push(cmd2);
					switch (type) {
					case CAPTURE_TYPE:
					case IF_TYPE:
					case ELSE_TYPE:
					case PLUGIN_TYPE:
					case FOR_TYPE:
						cmd2.push(null);
						stack.push(current = []);
					}
					for (var j = 1; j < item.length; j++) {
						cmd2.push(item[j]);
					}
	
				}
			}
		}
	}catch(e){
		console.error("中间代码异常：",result);
	}
	return current;
	//return defs.concat(current);
}

if(typeof require == 'function'){
//exports.extractStaticPrefix=extractStaticPrefix;
exports.doOptimize=doOptimize;
exports.optimizeResult=optimizeResult;
exports.buildTreeResult=buildTreeResult;
exports.PLUGIN_TYPE_MAP=PLUGIN_TYPE_MAP;
var OptimizeScope=require(27).OptimizeScope;
var PLUGIN_DEFINE=require(13).PLUGIN_DEFINE;
var PLUGIN_TYPE=require(13).PLUGIN_TYPE;
var CAPTURE_TYPE=require(13).CAPTURE_TYPE;
var VAR_TYPE=require(13).VAR_TYPE;

var JSTranslator=require(1).JSTranslator;

var PLUGIN_DEFINE=require(13).PLUGIN_DEFINE;
var VAR_TYPE=require(13).VAR_TYPE;
var ELSE_TYPE=require(13).ELSE_TYPE;
var PLUGIN_TYPE=require(13).PLUGIN_TYPE;
var CAPTURE_TYPE=require(13).CAPTURE_TYPE;
var IF_TYPE=require(13).IF_TYPE;
var FOR_TYPE=require(13).FOR_TYPE;
}
}
,
function(exports,require){function DOMParser(options){
	this.options = options ||{locator:{}};
	
}
DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var entityMap = {'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"}
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}
	
	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(/\/x?html?$/.test(mimeType)){
		entityMap.nbsp = '\xa0';
		entityMap.copy = '\xa9';
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	defaultNSMap.xml = defaultNSMap.xml || 'http://www.w3.org/XML/1998/namespace';
	if(source){
		sax.parse(source,defaultNSMap,entityMap);
	}else{
		sax.errorHandler.error("invalid doc source");
	}
	return domBuilder.doc;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler 
 * 
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */ 
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;
	    
		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},
	
	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},
	
	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		console.error('[xmldom fatalError]\t'+error,_locator(this.locator));
	    throw error;
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

//if(typeof require == 'function'){
	var XMLReader = require(34).XMLReader;
	var DOMImplementation = exports.DOMImplementation = require(35).DOMImplementation;
	exports.XMLSerializer = require(35).XMLSerializer ;
	exports.DOMParser = DOMParser;
//}

}
,
function(exports,require){if(typeof require == 'function'){
var Core=require(25).Core;
}/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
 
 
/**
 * false:preserved
 * true:trim all 
 * null:default trim muti-space to only one,(and trim first,last space)?
 * none: 
 */
var AUTO_FORM_PREFIX = "http://www.xidea.org/lite/attribute/h:autofrom" 
var AUTO_FORM_SELETED = "http://www.xidea.org/lite/attribute/h:autofrom#selected" 
var HTML = {
	xmlns : function(){},
	/**
	 * <!--[if IE]><p>11</p><![endif]-->
	 * 
	 * <!--[if IE 8]><!-->
	 *   <p>aa</p>
	 * <!--<![endif]-->
	 */
	parse8:function(comm){//comment
		var text = comm.textContent || comm.data;
		var match = text.match(/^\[if\s[^\]]+\]>|<!\[endif\]$/ig);
		if(match){
			if(match.length == 1){
				this.append('<!--'+text+'-->')
			}else{
				var len1 = match[0].length;
				var len2 = match[1].length
				var content = text.substring(len1,text.length - len2);
				try{
					if(/^\s*</.test(content)){
						content = this.loadXML(content);
					}
					//xml = this.xml.documentElement;
				}catch(e){
				}
				this.append('<!--'+match[0]);
				this.parse(content);
				this.append(match[1]+'-->');
			}
		}
		
	},
	parseInput:function(el){
		var autoform = this.getAttribute(AUTO_FORM_PREFIX);
		if(autoform!=null){
			var name_ = el.getAttribute('name');
			//console.warn(uneval(autoform),name_);
			if(name_){
				var type = el.getAttribute('type');
				if(!/^(?:reset|button|submit)$/i.test(type)){
					if(/^(?:checkbox|radio)$/i.test(type)){
						if(!el.hasAttribute('checked')){
							buildCheck2select(this,el,name_,'checked',/checkbox/i.test(type));
							return ;
						}
					}else if(!el.hasAttribute('value')){
						el.setAttribute('value', "${"+name_+"}");
					}
				}
			}
		}
		this.next(el);
	},
	parseTextArea:function(el){
		var autoform = this.getAttribute(AUTO_FORM_PREFIX);
		var hasValue = el.hasAttribute('value');//value added for textarea
		if(hasValue){
			el.textContent = el.getAttribute('value');
		}else if(autoform!=null && !el.hasChildNodes()){
			var name_ = el.getAttribute('name');
			el.textContent = "${"+ name_ + "}";
		}
		this.next(el);
	},
	parseSelect:function(el){
		var multiple = el.hasAttribute('multiple');
		this.setAttribute(AUTO_FORM_SELETED,[el.getAttribute('name'),multiple]);//不清理也无妨
		this.next(el);
	},
	parseOption:function(el){
		var autoform = this.getAttribute(AUTO_FORM_PREFIX);
		if(autoform!=null){
			var name_multiple = this.getAttribute(AUTO_FORM_SELETED);
			if(name_multiple){
				buildCheck2select(this,el,name_multiple[0],'selected',name_multiple[1]);
				return;
			}
		}
		this.next(el);
	}
}
var HTML_EXT = {
	xmlns : function(){},
	beforeAutoform:function(node){
		var oldAutoform = this.getAttribute(AUTO_FORM_PREFIX);
		try{
			var prefix = findXMLAttribute(node,'*value');
			//console.info("#####",prefix);
			if(prefix == 'true'){
				prefix = '';
			}
			this.setAttribute(AUTO_FORM_PREFIX,prefix);
    		parseChildRemoveAttr(this,node);
    	}finally{
			this.setAttribute(AUTO_FORM_PREFIX,oldAutoform);
		}
	},
	/**
	 * safe
	 * any
	 * none
	 */
	beforeTrim:function(node){
		var oldSpace = this.getAttribute(XML_SPACE_TRIM);
		try{
			var value = findXMLAttribute(node,'*value');
			this.setAttribute(XML_SPACE_TRIM,value == 'true'?true:value == 'false'?false:null);
    		
//			console.error(this.getClass(),XML_SPACE_TRIM,this.getAttribute(XML_SPACE_TRIM));
    		parseChildRemoveAttr(this,node);
    	}finally{
			this.setAttribute(XML_SPACE_TRIM,oldSpace);
		}
	}
}
var moveList = ['parseclient','parse2client','seekclient'];
function buildMoved(tag){
	if(tag){
		var fn = Core[tag];
		HTML_EXT[tag]= fn;
		Core[tag] = function(){
			console.info("标签:"+tag+ " 已经从core到：html-ext上了！")
			fn.apply(this,arguments);
		}
		return true;
	}
}

//while(buildMoved(moveList.pop()));

HTML_EXT.parseAutoform = HTML_EXT.beforeAutoform;
HTML_EXT.parseTrim = HTML_EXT.beforeTrim;
function toelv(value){
	if(value){
		var elv = value.replace(/^\$\{([\s\S]+)\}$/,'$1');
		try{
			if(elv != value){
				new Function("return "+elv);
			}
		}catch(e){
			elv = value;
		}
		if(elv == value){
			elv = JSON.stringify(value);
		}
	}
	return elv;
}
function buildCheck2select(context,el,name_,checkName,multiple){
	var value = el.getAttribute('value');
	if(!value && checkName == 'selected'){
		value = el.textContent;
	}
	var elv = toelv(value);
	
	if(!elv){
		context.next(el);
		return;
	}
	var forId = context.allocateId();
	var flag = context.allocateId();
	if(multiple){
		context.appendVar(flag,'true');
		context.appendFor(forId,"[].concat("+name_+')',null);
			context.appendIf(flag +'&&'+ forId+'+""===""+'+elv);
				el.setAttribute(checkName,checkName);
				context.appendVar(flag,'false');
				context.next(el)
			context.appendEnd();
		context.appendEnd();
		context.appendIf(flag);
			el.removeAttribute(checkName);
			context.next(el)
		context.appendEnd();
	}else{
		context.appendIf(name_+'+""===""+'+elv);
		el.setAttribute(checkName,checkName);
		context.next(el);
		context.appendEnd();
		context.appendElse(null);
		el.removeAttribute(checkName);
		context.next(el);
		context.appendEnd();
	}
	
}

/* html parse */
function preservedParse(node){
	var oldSpace = this.getAttribute(XML_SPACE_TRIM);
	this.setAttribute(XML_SPACE_TRIM,false);
	try{
		this.next(node);
	}finally{
		this.setAttribute(XML_SPACE_TRIM,oldSpace);
	}
}
function processJS(value){
	var value2 = value.replace(/^\s*\$\{([\s\S]+)\}\s*$/,'return $1');
	if(value2 != value){
		try{
			new Function(value2);//属性中直接插入的脚本（没有语句，不可能是json变量）
			//console.error(value2)
			return value;
		}catch(e){
		}
	}
	value = compressJS(value);
	return autoEncode(value,/^\s*JSON\s*\.*/,replaceJSON);
}
function replaceJSON(v){
	return "JSON.stringify("+v+")";
}
function replaceURI(v){
	return "encodeURI("+v+")";
}
function forceURIParse(attr){
	var value = attr.value;
	attr.value = autoEncode(value,/^\s*encodeURI*/,replaceURI,encodeURI);
	this.next(attr);
}

function parseHtmlScript(el){
	var oldSpace = this.getAttribute(XML_SPACE_TRIM);
	this.setAttribute(XML_SPACE_TRIM,false);
	try{
		if(!el.hasAttribute('src')){
			var child;
			var buf = [];
			while(child = el.firstChild){
				if(child.nodeType==3 || child.nodeType == 4){//text/cdata
					buf.push(child.data);
				}else{
					console.warn('script 中不能用嵌入html标签，建议将脚本放在 <![CDATA[...]]>中。');
				}
				el.removeChild(child);
			}
			buf = processJS(buf.join(''));
			var doc = el.ownerDocument;
			if(buf.search(/[<&]/)>=0){
				el.appendChild(doc.createTextNode('/*'));
				el.appendChild(doc.createCDATASection('*/'+buf+'//'));
			}else{
				el.appendChild(doc.createTextNode(buf));
			}
		}
		this.next(el);
	}finally{
		this.setAttribute(XML_SPACE_TRIM,oldSpace);
	}
}


function parseHtmlEventAttr(attr){
	attr.value = processJS(attr.value);
	this.next(attr);
}

/* 处理 script中的模板变量(JSON.stringify)*/
HTML.parseScript = parseHtmlScript;

/* 处理 html 事件中的模板变量(JSON.stringify) (ELEMENT_NODE == 2)*/
HTML["parse2on*"] = parseHtmlEventAttr;

/* 处理html 资源地址属性中的模板变量（encodeURI） */
//if(tagName=='link'){
//}else if(/^a/i.test(tagName)){
HTML.parse2href=forceURIParse;
//	if(/^form$/i.test(tagName)){
HTML.parse2action=forceURIParse;
//if(/^(?:script|img|button)$/i.test(tagName)){
//}else if(/^(?:a|frame|iframe)$/i.test(tagName)){
HTML.parse2src=forceURIParse;

/* 处理保留空白的html节点 */

HTML.parsePre = preservedParse;
HTML.parseTextArea = preservedParse;

function autoEncode(value,pattern,replacer,replacer2){
	var p = -1;
	var result = [];
	while(true){
		p = value.indexOf("${",++p);
		if(p>=0){
			if(!(countEescape(value,p) % 2)){
				var p2 = findELEnd(value,p+1);
				if(p2>0){
					var el = value.substring(p+2,p2);
					if(!pattern.test(el)){
						el = replacer(el);
					}
					var prefix = value.substring(0,p);
					if(replacer2){
						prefix = replacer2(prefix);
					}
					result.push(prefix,'${',el,'}');
					value = value.substring(p2+1)
					p=-1;
				}else{
					p++;
				}
			}
		}else{
			break;
		}
	}
	if(replacer2){
		value = replacer2(value);
	}
	if(result.length){
		result.push(value);
		return result.join('');
	}else{
		return value;
	}
}
function countEescape(text, p$) {
	if (p$ > 0 && text.charAt(p$ - 1) == '\\') {
		var pre = p$ - 1;
		while (pre-- > 0 && text.charAt(pre) == '\\')
			;
		return p$ - pre - 1;
	}
	return 0;
}
//autoEncode("${a}",/^encodeURI*/,function(a){return 'encodeURI('+a+')'})
if(typeof require == 'function'){
exports.HTML=HTML;
exports.HTML_EXT=HTML_EXT;
var XML_SPACE_TRIM=require(11).XML_SPACE_TRIM;
var findELEnd=require(36).findELEnd;
var parseChildRemoveAttr=require(25).parseChildRemoveAttr;
var compressJS=require(37).compressJS;
var findXMLAttribute=require(7).findXMLAttribute;
var URI=require(6).URI;
}
}
,
function(exports,require,module){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
var CORE_URI = "http://www.xidea.org/lite/core"
var PLUGIN_NATIVE = "org.xidea.lite.NativePlugin"
var PLUGIN_MODULE = "org.xidea.lite.ModulePlugin"
var Core = {
	xmlns : function(){},
	seek:function(text){
		var end = findELEnd(text,0);
		if(end>0){
			try{
				var els = text.substring(1,end);
				var el = this.parseEL(els);
	            switch(this.textType){
	            case XT_TYPE:
	            	this.appendXT(el);
	            	break;
	            case XA_TYPE:
	            	this.appendXA(null,el);
	            	break;
	            default:
	            	this.appendEL(el);
	            }
	            return end;
			}catch(e){
				console.error("表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+els+"]",e)
				return -1;
			}
		}else{
			console.warn("表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",text:"+text+"]")
			return -1;
		}
	},
	"seek!":function(text){
		var end = findELEnd(text,0);
		if(end>0){
			try{
				var el = text.substring(1,end);
	            this.appendEL(el);
	            return end;
			}catch(e){
				console.error("表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]",e)
				return -1;
			}
		}else{
			console.warn("表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]")
			return -1;
		}
	},
	/**
	 * TODO:...
	 * ${a,b=>x*b}
	 * ${list.sort({a=>a.length-b.length})}
	 *
	"seek:":function(text){
		var sp = text.indexOf(':');
		var end = sp>0 && findELEnd(text,sp);
		if(end){
			var args = text.substring(1,sp);
			var el = text.substring(sp+1,end);
	    	var config = _parseDefName('('+ns+')');
	    	this.appendPlugin(PLUGIN_DEFINE,JSON.stringify(config));
	        this.appendEL(el);
	        return end;
		}else{
			console.warn("Lambda 表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]")
			return -1;
		}
	},*/
	"seek#":function(text){
		var end = findELEnd(text,0);
		if(end>0){
			try{
				var el = text.substring(1,end);
	            this.appendPlugin("org.xidea.lite.EncodePlugin","{}");
	            this.appendEL(el);
	            this.appendEnd()
	            return end;
			}catch(e){
				console.error("表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]",e)
				return -1;
			}
		}else{
			console.warn("表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]")
			return -1;
		}
		
	},
	seekxa:function(text){
		var end = findELEnd(text,0);
		if(end>0){
			try{
				var el = text.substring(1,end);
				if(/^\s*([\w\-]+|"[^"]+"|'[^']+')\s*\:/.test(el)){
					var map = findLiteParamMap(el);
					for(var n in map){
						this.appendXA(n,map[n]);
					}
				}else{
					this.appendXA(null,el)
				}
		    	return end;
			}catch(e){
				console.error("XML属性表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]",e)
				return -1;
			}
		}else{
			console.warn("XML属性表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]")
			return -1;
		}
	},
	seekxt:function(text){
		var end = findELEnd(text,0);
		if(end>0){
			try{
				var el = text.substring(1,end);
				this.appendXT(el)
	            return end;
			}catch(e){
				console.error("XML文本表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]",e)
				return -1;
			}
		}else{
			console.warn("XML文本表达式解析异常，请检查是否手误：[fileName:"+this.currentURI+",el:"+el+"]")
			return -1;
		}
	},
	seekEnd : function(text){
		this.appendEnd();
		return 0;
	},
	parseExtension:function(node){
		var ns = findXMLAttribute(node,'*namespace','ns');
		var file = findXMLAttribute(node,'file');
		var pkg = findXMLAttribute(node,'package');
		
		if(pkg){
			source = pkg;
		}else if(file){
			var source = this.loadText(this.createURI(file))+'\n';
		}else{
			var source = findXMLAttribute(node,'#text')+'\n';
		}
		this.addExtension(ns,source);
	},
	parse9 : function(doc,ns){
		var isProcessed = this.getAttribute(DOCUMENT_LAYOUT_PROCESSED);
		if(!isProcessed){
			 this.setAttribute(DOCUMENT_LAYOUT_PROCESSED,true);
			 var root = doc.documentElement;
			 var ln = root.localName || root.nodeName.replace(/^w+\:/,'');
			 if((ln == 'extends' || ln == 'extend') &&  root.namespaceURI == ns){
			 	processExtends.call(this,root);
			 	return ;
			 }else{
			 	try{
			 		var attr = root.getAttributeNodeNS(ns,"extends") || root.getAttributeNodeNS(ns,"extend");
			 	}catch(e){
			 		var attrs = root.attributes;
			 		var i = attrs.length-1;
			 		while(i-->0){
			 			var a = attrs.item(i);
			 			if(a.namespaceURI == ns && /^(?:w+\:)?extends?$/.test(a.nodeName)){
			 				attr = a;
			 				break;
			 			}
			 		}
			 	}
			 	if(attr != null){
			 		processExtends.call(this,attr);
			 		return ;
			 	}
			 	var layout = this.configMap.layout;
			 	//console.log('layout:',layout,' of ',uri)
			 	if(layout){
			 		this.setAttribute('$page',doc);
			 		var uri = this.createURI(layout);
					//this.currentURI = uri;
			 		//doc = this.loadXML(uri);
			 		this.parse(uri);
			 		return ;
			 	}
			 }
		}
		this.next(doc);
//		console.error('aaa',ns);
	//},
	//"parse*" : function(node){
	//	console.error("未支持标签："+node.tagName)
	},
	parseComment:function(){}
}
var DOCUMENT_LAYOUT_PROCESSED = "http://www.xidea.org/lite/core/c:layout-processed";
var CHOOSE_KEY = "http://www.xidea.org/lite/core/c:choose@value";
var FOR_PATTERN = /\s*([\$\w_]+)\s*(?:,\s*([\w\$_]+))?\s*(?:\:|in)([\s\S]*)/;


/**
 * node,attribute
 */
function processIf(node){
	var test = findXMLAttributeAsEL(node,'*test','value');
    this.appendIf(test);
    parseChildRemoveAttr(this,node);
    this.appendEnd();
}

function seekIf(text){
	var end = findELEnd(text,0);
	if(end>0){
		this.appendIf(text.substring(1,end));
		return end;
	}
}

function processElse(node){
    var test = findXMLAttributeAsEL(node,'test','value');
    this.appendElse(test || null);
    parseChildRemoveAttr(this,node);
    this.appendEnd();
}
function seekElse(text){
	if(text.charAt() == '$'){
		this.appendEnd();
		this.appendElse(null);
		return 0;
	}else{
		var end = findELEnd(text);
		if(end>0){
			this.appendEnd();
			this.appendElse(text.substring(1,end)||null);
			return end;
		}
	}
}
function processElif(node){
    var test = findXMLAttributeAsEL(node,'*test','value');
    this.appendElse(test || null);
    parseChildRemoveAttr(this,node);
    this.appendEnd();
}
function seekElif(text){
	var end = findELEnd(text);
	if(end>0){
		this.appendEnd();
		this.appendElse(text.substring(1,end)||null);
		return end;
	}
}



function processChoose(node){
	var value = findXMLAttributeAsEL(node,"value","test");
	var oldStatus = this.getAttribute(CHOOSE_KEY);
	this.setAttribute(CHOOSE_KEY,{value:value,first:true});
	parseChildRemoveAttr(this,node,true);
	this.setAttribute(CHOOSE_KEY,oldStatus);
}
//function seekChoose(text){
//	if(text.charAt() != '$'){
//		var end = findELEnd(text,-1);
//		if(end<=0){
//			console.error('表达式异常')
//			return -1;
//		}else{
//			var value = text.substring(1,end);
//		}
//	}else{
//		end = 1;
//	}
//	var oldStatus = this.getAttribute(processChoose);
//	this.setAttribute(processChoose,{value:value,first:true});
//	parseChildRemoveAttr(this,node);
//	value && this.setAttribute(processChoose,oldStatus);
//	return end;
//}
function processWhen(node){
	var stat = this.getAttribute(CHOOSE_KEY);
	var value = findXMLAttributeAsEL(node,"*test","if","value");
	if(stat.value){
		value = '('+stat.value + ')==('+value+')';
	}
	if(stat.first){
		stat.first = false;
		this.appendIf(value);
	}else{
		this.appendElse(value);
	}
	parseChildRemoveAttr(this,node);
	this.appendEnd();
}

function processOtherwise(node){
	this.appendElse(null);
	parseChildRemoveAttr(this,node);
	this.appendEnd();
}

function processFor(node){
	if(node.nodeType == 1){
    	var value = findXMLAttributeAsEL(node,'*list','values','items','value');
    	var var_ = findXMLAttribute(node,'*var','name','id','item');
    	var status_ = findXMLAttribute(node,'status');
	}else{//attr
		var value = findXMLAttribute(node);
		var match = value.replace(/^\$\{(.+)\}$/,'$1').match(FOR_PATTERN);
		//console.log('for:::',match,value)
		if(!match){
			throw console.error("非法 for 循环信息",value);
		}
		var var_ = match[1];
		var status_ =match[2];
		var value =match[3];
	}
    startFor(this,var_,value,status_ || null);
    parseChildRemoveAttr(this,node);
    this.appendEnd();
}
function seekFor(text){
	var end = findELEnd(text);
	if(end>0){
		var value = text.substring(1,end);
		var match = value.match(FOR_PATTERN);
		if(!match){
			throw console.error("非法 for 循环信息",value);
		}
		var var_ = match[1];
		var status_ =match[2];
		var value =match[3];
		startFor(this,var_,value,status_ || null);
    	return end;
	}
}
function splitList(list){
	try{
		new Function("return "+list.replace(/\.\./g,'.%%.'));//for x4e
		return [list];
	}catch(e){
		var dd= 0
		while(true){
			dd = list.indexOf('..',dd+1);
			if(dd>0){
				try{
					var begin = list.substring(0,dd);
					var end = list.substring(dd+2);
					new Function("return "+begin+'-'+end);//for x4e
					var begin2 = begin.replace(/^\s*\[/,'');
					if(begin2 != begin){
						try{
							new Function("return "+begin);
							begin2 = begin;
						}catch(e){
						}
					}
					if(begin2 != begin){
						end = end.replace(/\]\s*$/,'');
						console.debug("[start,last] 语法 不是通用表达式，只能在for循环中使用。",list);
						return [begin2,end];
					}else{
						console.warn("range for 表达式(非通用表达式)推荐模式为：[start,last]，您提供的表达式为"+list);
						return [begin,end];
					}
				}catch(e){
				}
				//value = list.substring(0,dd)+'-'+list.substring(dd+2)
			}else{
				return [];
			}
		}
	}
}
function startFor(context,key,list,status_){
	var be = splitList(list);
	if(be.length==2){
		var begin = be[0];//list.substring(0,dd);
		var end = be[1];//list.substring(dd+2);
		list = "Math.abs("+begin+'-'+end+")+1";
		context.appendFor(key,list,status_||null);
		context.appendVar(key,key+'+'+begin+"-1");
	}else if(be.length ==1){
		context.appendFor(key,list,status_);
	}else{
		console.error("for表达式无效："+list);
	}
}


function processVar(node){
    var name_ = findXMLAttribute(node,'*name','id');
	if(node.nodeType == 1){
		var value = findXMLAttribute(node,'value');
	    if(value){
	    	var code = this.parseText(value,0);
	    	if(code.length == 1){
	    		code = code[0];
	    		if(code instanceof Array){
	    			this.appendVar(name_,code[1]);
	    		}else{
	    			console.warn("标签:"+node.tagName+"的value属性"+value+"建议设置为表达式，您的输入没有表达式，系统自动按静态文本处理");
	    			this.appendVar(name_,JSON.stringify(code));
	    		}
	    	}else{
	    		this.appendCapture(name_);
		        this.appendAll(code)
		        this.appendEnd();
	    	}
	    }else{
	        this.appendCapture(name_);
	        parseChildRemoveAttr(this,node);
	        this.appendEnd();
	    }
	}else{
		var map = findLiteParamMap(name_);
		if(map){
			for(var n in map){
				this.appendVar(n,map[n]);
			}
			parseChildRemoveAttr(this,node);
		}else{
	        this.appendCapture(name_);
	        parseChildRemoveAttr(this,node);
	        this.appendEnd();
		}
	}
}
function seekVar(text){
	var end = findELEnd(text);
	if(end>0){
		var value = text.substring(1,end);
		if(/^\s*(?:\w+|['"][^"]+['"])\s*$/.test(value)){
	        this.appendCapture(value.replace(/['"]/g,''));
		}else{
			var map = findLiteParamMap(value);
			for(var n in map){
				this.appendVar(n,map[n]);
			}
		}
    	return end;
	}
}


function parseOut(node){
    var value = findXMLAttribute(node,"value","#text");
    value = this.parseText(value,EL_TYPE);
    this.appendAll(value);
}
function seekOut(text){
	var end = findELEnd(text);
	if(end>0){
		var value = text.substring(1,end);
		this.appendEL(value);
    	return end;
	}
}

function _parseDefName(name){
	var n = name;
	var i = n.indexOf('(');
	var defaults = [];
	var params = [];
	if(i>0){
		var args = n.substring(i+1);
		args = args.replace(/^\s+|\)\s*$/g,'')
		n = toid(n.substring(0,i));
		i = 0;
		while(args){
			i = args.indexOf(',',i);
			if(i>0){
				var arg = args.substring(0,i);
				try{
					new Function(arg);
					args = args.substring(i+1).replace(/^\s+|\s+$/g,'');
					i=0;
				}catch(e){
					i++;
					continue;
				}
			}else{
				arg = args;
				args = null;
				try{
					new Function(arg);
				}catch(e){
					console.error("函数定义中参数表语法错误:"+arg+name,e);
					throw e;
				}
			}
			var p = arg.indexOf('=',i);
			if(p>0){
				params.push(toid(arg.substring(0,p)));
				defaults.push(JSON.parse(arg.substring(p+1)));
			}else{
				if(defaults.length){
					var msg = "函数定义中参数表语法错误:默认参数值能出现在参数表最后:"+name;
					console.error(msg);
					throw new Error(msg);
				}
				params.push(toid(arg));
			}
			
			
		}
		
		return {"name":n,"params":params,"defaults":defaults};
	}else{
		return {"name":n}
	}
}
function toid(n){
	n = n.replace(/^\s+|\s+$/g,'');
	try{
		new Function("return "+n);
	}catch(e){
		console.error("无效id:"+n,e);
		throw e;
	}
	return n;
}
function processDef(node){
    var ns = findXMLAttribute(node,'*name');
    var config = _parseDefName(ns);
    this.appendPlugin(PLUGIN_DEFINE,JSON.stringify(config));
    parseChildRemoveAttr(this,node);
    this.appendEnd();
}
function seekDef(text){
    var end = findELEnd(text);
	if(end>0){
		var ns = text.substring(1,end);
	    var config = _parseDefName(ns);
	    this.appendPlugin(PLUGIN_DEFINE,JSON.stringify(config));
    	return end;
	}
}

function seekClient(text){
	var end = findELEnd(text);
	if(end>0){
		var ns = text.substring(1,end);
	    var config = _parseDefName(ns);
	    this.appendPlugin("org.xidea.lite.parse.ClientPlugin",JSON.stringify(config));
    	return end;
	}
}

function processClient(node){
	var name_ = findXMLAttribute(node,'*name','id');
	var config = _parseDefName(name_);
	this.append("<script>//<![CDATA[\n");
	this.appendPlugin("org.xidea.lite.parse.ClientPlugin",JSON.stringify(config));
	parseChildRemoveAttr(this,node);
	this.appendEnd();
	this.append("//]]></script>")
}
/**
 * <c:date-format pattern="" >
 */
function dateFormat(node){
	var value =  findXMLAttributeAsEL(node,'value','date','time','#text').replace(/^\s+|\s+$/g,'') || 'null';
	var pattern = findXMLAttribute(node,'pattern');
	if(pattern){
		var pattern2 = pattern.replace(/^\s*\$\{([\s\S]+)\}\s*$/,'$1')
		if(pattern2 == pattern){
			pattern2 = JSON.stringify(pattern);
		}
	}else{
		pattern2 = '"YYYY-MM-DD"';
	}
	this.appendPlugin("org.xidea.lite.DatePlugin","{}");
	this.appendEL(pattern2);
	this.appendEL(value);
	this.appendEnd();
}
Core.parseDateFormat = dateFormat
Core.parseDate = dateFormat
Core.parseTime = dateFormat
function beforeInclude(attr){
	var match = attr.value.match(/^([^#]*)(?:#(.*))?$/);
	var path = match[1];
	var xpath = match[2];
	if(path){
		var path2 = path.replace(/^[\$#]([\w\$_]+)$/,'$$$1');
		if(path2.charAt() == '$') {
			doc = this.getAttribute(path2);
		}else{
			var uri = this.createURI(path);
			var doc = this.loadXML(uri)
			//this.setCurrentURI(uri);
		}
	}else{
		var doc = attr.ownerDocument;
	}
	if(doc==null){
		this.append("<strong style='color:red'>没找到包含节点："+this.currentURI+ attr.value+"</strong>");
	}else{
		var attrs = selectByXPath(doc, xpath);
		var element = attr.ownerElement || attr.selectSingleNode('..');
		//element.removeAttributeNode(attr)
		for(var i = attrs.length;i--;){
			var a = attrs.item(i);
			mergeAttribute(element,a);
		}
		this.process(element);
	}
	//this.setCurrentURI(oldURI);
}
function mergeAttribute(element,node){
	if(node.nodeType == 2){
		var attr = element.getAttributeNS(node.namespaceURI,node.name);
		element.setAttributeNS(node.namespaceURI,node.name,attr+node.value);
	}else if(node.nodeType == 1){
		var attributes = node.attributes;
		for (var i = 0; i < attributes.length; i++) {
			mergeAttribute(element,attributes.item(i));
		}
	}
}
function setNodeURI(context,node){
	if(!node.nodeType){
		if(node.length){
			node = node.item(0);
		}
	}
	var doc = node.nodeType == 9?node:node.ownerDocument;
	if(doc){
		
		var uri = doc.documentURI
		if(/^lite:\//.test(uri)){
			context.setCurrentURI(context.createURI(uri));
		}else if(uri){
			var info = getLiteTagInfo(doc.documentElement);
			//console.log(info)
			var i = info && info.indexOf('|@');
			if(i>0){
				uri = info.substring(i+2);
			}
			context.setCurrentURI(context.createURI(uri));
			//console.error(uri,info)
		}
	}
}
function parseInclude(node){
    var path = findXMLAttribute(node,'path');
    var xpath = findXMLAttribute(node,'xpath');
    var selector = findXMLAttribute(node,'selector');
    var parentURI = this.currentURI;
	try{
	    if(path!=null){
	    	if(path.charAt() == '#'){
	    		console.warn("装饰器命名节点改用${pageName}模式了:(,您实用的模式还是:"+path);
	    		path = '$'+path.substring(1);
	    	}
	    	if(path.charAt() == '$'){
	    		doc = this.getAttribute(path);
	    		setNodeURI(this,node);
	    	}else{
		        var uri = this.createURI(path);
		        var doc = this.loadXML(uri);
	    		this.setCurrentURI(uri);
	    	}
	    }else{
	    	var doc = this.loadXML(this.currentURI);
	    	var doc = node.ownerDocument
	    }
		if(doc==null){
			this.append("<strong style='color:red'>没找到包含节点："+this.currentURI+ node.value+"</strong>");
		}else{
		    if(selector != null){
		    	try{
		    		//var  nwmatcher = require('nwmatcher');
		    		var nwmatcher = require(33);
		    		var nw = nwmatcher({document:doc});
		    		nw.configure( { USE_QSAPI: false, VERBOSITY: true } );
		    		
		    	}catch(e){
		    		console.warn("module nwmatcher is required  for css selector!\n  npm install nwmatcher",e);
		    		var nwmatcher = require(38);
		    		var nw = nwmatcher({document:doc});
		    		nw.configure( { USE_QSAPI: false, VERBOSITY: true } );
		    	}
		    	//console.log(nwmatcher+'')
		    	if(nwmatcher){
		    		
		    		var list = nw.select(selector,doc);
		    		if(list && list.length){
		    			for(var i=0;i<list.length;i++){
		    				this.parse(list[i])
		    			}
		    		}else{
		    			console.warn("empty selection:"+selector)
		    		}
		    		return;
		    	}
		    }else if(xpath!=null){
		    	var d = doc;
		        doc = selectByXPath(doc,xpath);
		        //alert([url,xpath,new XMLSerializer().serializeToString(d),doc.length])
		    }
		        
		    this.parse(doc)
		    
		}
    }finally{
        this.setCurrentURI(parentURI);
    }
}

function processExtends(node){
	var oldConfig = this.getAttribute("#extends");
	var el = node.nodeType == 1?node:node.ownerElement|| node.selectSingleNode('..');
	var root = el == el.ownerDocument.documentElement;
	var extendsConfig = {blockMap:{},parse:false,root:root};
	if(oldConfig){
		if(oldConfig.parse){//解析进行时
			if(root){//模板继承
				if(extendsConfig.root){
					//this.reset(0);
				}
				extendsConfig = oldConfig;
				extendsConfig.parse = false;
			}else{
				extendsConfig.root = false;
			}
		}else{//查找进行时
			return;
		}
	}
	
	this.setAttribute("#extends" ,extendsConfig);
	var parentURI = findXMLAttribute(node,"*path","value","parent");
	//childNodes
	var uri = this.createURI(parentURI);
	var parentNode = this.loadXML(uri);
	if(!root){//元素继承
		parentNode = parentNode.documentElement;
	}
	var i = this.mark();
	parseChildRemoveAttr(this,node);
	this.reset(i);
    var parentURI = this.currentURI;
	try{
		this.setCurrentURI(uri);
		extendsConfig.parse=true;
		this.parse(parentNode);
	}finally{
        this.setCurrentURI(parentURI);
	}
	this.setAttribute("#extends" ,oldConfig);
}

function processBlock(node){
	var extendsConfig = this.getAttribute("#extends");
	var value = findXMLAttribute(node,"name","id");
	//console.log(node.nodeType,node.tagName,'%%%%',node.ownerElement)

	if(extendsConfig){//
		var blockMap = extendsConfig.blockMap;
		var cached = value && (value in blockMap) && blockMap[value];
		if(extendsConfig.parse){
			if(cached){
				var parentURI = this.currentURI;
				try{
					//set current uri
					setNodeURI(this,cached);
					extendsConfig.parse=true;
					//this.parse(cached);
					_parseBlock(this,cached);
				}finally{
	        		this.setCurrentURI(parentURI);
				}
			}else{
				//this.parse(childNodes);
				_parseBlock(this,node);
			}
		}else{
			if(!cached){
				blockMap[value] = node;
			}
		}
	}else{
		_parseBlock(this,node);

	}
}
function _parseBlock(ctx,node){
	//function parseModule(node){
	var bid = puid(ctx);
	var config={};
	var attrs = node.attributes ;
	var tagName =  'div';
	var pluginName = node.nodeName; 
	if(!attrs){
		attrs = node.ownerElement.attributes;
		tagName = node.ownerElement.nodeName;
	}

	//console.log(tagName,node.nodeName)
	for(var i=0,len = attrs.length;i<len;i++){
		var a = attrs.item(i);
		var n = a.name;
		if(!n.match(/\:|^id$/i)){
			config[n] = a.value;
		}
	}
	if(pluginName.match(/lazy/i)){
		ctx.append('<',tagName,' id="__lazy_module_',bid,'__"');
		for(var n in config){
			ctx.append(' ',n,'="',config[n],'"');
		}
		ctx.append('>')
		config.id=bid
		ctx.appendPlugin(PLUGIN_MODULE,JSON.stringify(config));
		parseChildRemoveAttr(ctx,node);
		ctx.appendEnd();
		ctx.append('</',tagName,'>')
	}else{
		parseChildRemoveAttr(ctx,node);
	}
}





function parseChildRemoveAttr(context,node,ignoreSpace){
	if(node.nodeType == 1){//child
		var child = node.firstChild;
		if(ignoreSpace){
			while(child){
				if(child.nodeType != 3 || String(child.data).replace(/\s+/g,'')){
					context.parse(child)
				}
				child = child.nextSibling;
			}
		}else{
			while(child){
				context.parse(child)
				child = child.nextSibling;
			}
		}
	}else if(node.nodeType == 2){//attr
		//console.log('do child remove:'+node)
		//throw new Error();
		var el = node.ownerElement||node.selectSingleNode('..');
		//console.log(node.nodeName,node.namespaceURI);
		el.removeAttributeNode(node);
		context.parse(el);//||node.selectSingleNode('parent::*'));
	}else {//other
		context.parse(node)
	}
}

function puid(ctx){
	var oldId = ctx.__increaceID||0;;
	return ctx.__increaceID = ++oldId
}
function _parseChild(context,node){
	node = node.firstChild;
	while(node){
		context.parse(node)
		node = node.nextSibling;
	}
}




function addParser(map,n){
	for(var p in map){
		Core[p+n] = map[p];
	}
}
function addAll(pb,seeker){
	var i = arguments.length;
	while(--i>1){
		var map = {parse:pb,before:pb};
		if(seeker){
			map.seek = seeker;
		}
		addParser(map,arguments[i])
	}
}

addAll(processIf,seekIf,'if')
addAll(processElse,seekElse,'else');
addAll(processElif,seekElif,"elseif","elif");
addAll(processFor,seekFor,"for","foreach");
addAll(processVar,seekVar,"var","set");
addAll(parseOut,seekOut,"out");
addAll(processDef,seekDef,"def",'macro');
addAll(processClient,seekClient,"client");
//addAll(processI18N,seekI18N,'i18n')

//没有seeker
addAll(processChoose,null,"choose");
addAll(processWhen,null,"when");
addAll(processOtherwise,null,"otherwise");
addAll(processExtends,null,"extends","extend");
addAll(processBlock,null,"module","lazy-module","lazy-block","block","group");

//属性与标签语法差异太大,不能用统一函数处理.
addParser({parse:parseInclude,before:beforeInclude},"include");


require(19).setup(Core)

if(typeof require == 'function'){
exports.Core=Core;
exports.parseChildRemoveAttr=parseChildRemoveAttr;
var findELEnd=require(36).findELEnd;
var findLiteParamMap=require(36).findLiteParamMap;
var getLiteTagInfo=require(7).getLiteTagInfo;
var selectByXPath=require(7).selectByXPath;
var findXMLAttribute=require(7).findXMLAttribute;
var findXMLAttributeAsEL=require(7).findXMLAttributeAsEL;
var URI=require(6).URI;
var PLUGIN_DEFINE=require(13).PLUGIN_DEFINE;
var XA_TYPE=require(13).XA_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var XT_TYPE=require(13).XT_TYPE;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
/**
 * 模板解析上下文对象实现
 * <lite>
 *    <extension namespace="http://www.w3.org/1999/xhtml"
 *               package="org.xidea.lite.xhtml"/>
 * 	  <include>**.xhtml</include>
 *    <group layout="/layout.xhtml">
 *       <config name="javascriptCompressor"
 *               package="org.jside.jsi.tools.JSACompressor"/>
 *       <include>/example/*.xhtml</include>
 *    </group>
 * </lite>
 * ==>
 * [
 * 	{
 * 		"includes":"^[\\\\/]example[\\\\/][^\\\\/]*\.xhtml$",
 * 		"excludes":"",
 * 		"config":{
 * 			"layout":"/layout.xhtml",
 * 			"encoding":"utf-8",
 * 			"contentType":"text/html;charset=UTF-8",
 * 			"javascriptCompressor":"org.jside.jsi.tools.JSACompressor"
 * 		},
 * 		"extensionMap":[
 * 			{
 * 				"namespace":"http://www.w3.org/1999/xhtml",
 * 				"package":"org.xidea.lite.xhtml"
 * 			}
 * 		]
 * 	},
 * 	{
 * 		"includes":"^.*\.xhtml$",
 * 		"excludes":"",
 * 		"config":{
 * 			"encoding":"utf-8",
 * 			"contentType":"text/html;charset=UTF-8"
 * 		},
 * 		"extensionMap":{
 * 			"http://www.w3.org/1999/xhtml":["org.xidea.lite.xhtml"]
 * 		]
 * 	}
 * ]
 */

function parseConfig(doc){
	if(typeof doc == 'string'){doc = loadLiteXML(doc)}
	var lites = doc.getElementsByTagName("lite");
	var len = lites.length;
	//console.log(new (require('xmldom').XMLSerializer)().serializeToString(doc))
	if(len >= 1){
		var root = new LiteGroup(lites.item(0))
		if(len>1){
			console.error("配置文件只允许一个lite节点","您的文档中包含"+len+"个节点，后续节点将作为第一个节点子节点解析。");
			for(var i=1;i<len;i++){
				root.children.push(new LiteGroup(lites[i],this));
			}
		}
		var json = root.toJSON();
		return json;
		
	}
	return null
}
function LiteGroup(node,parentConfig){
	this.parentConfig = parentConfig || null
	this.config = {}
	this.encoding= findXMLAttribute(node,'encoding','charset');
	this.type = findXMLAttribute(node,'type',"mime-type",'mimeType');
	this.contentType = findXMLAttribute(node,'contentType','contextType');
	this.layout = findXMLAttribute(node,'layout');
	this.extensionMap = {};
	this.children = [];
	this.includes = [];
	this.excludes = [];
	var child = node.firstChild;
	while(child){
		if(child.nodeType == 1){
			switch(child.nodeName){
			case 'feature':
			case 'attribute':
			case 'config':
				this.config[findXMLAttribute(child,'name','key','uri','url')] = 
						findXMLAttribute(child,'value','#text')
				break;
			case 'extension':
				var ns = findXMLAttribute(child,'namespace','name','key','uri','url');
				var p = findXMLAttribute(child,'package','impl','value','#text');
				var ps = this.extensionMap[ns];
				if(ps && ps instanceof Array){
					appendAfter(ps,p);
				}else{
					this.extensionMap[ns] = [p];
				}
				break;
			case 'include':
				this.includes.push(findXMLAttribute(child,'value','#text','pattern'));
				break;
			case 'exclude':
				this.excludes.push(findXMLAttribute(child,'value','#text','pattern'));
				break;
			case 'group':
				this.children.push(new LiteGroup(child,this))
				break;
			default:
				console.warn("unknow nodeName:"+child.nodeName);
			}
		}
		child = child.nextSibling;
	}
}
LiteGroup.prototype.toJSON = function(){
	var result = [];
	var len = this.children.length;
	var json = {}
	this.initialize();
	for(var i=0;i<len;i++){
		result.push.apply(result,this.children[i].toJSON());
	}
	json.includes = this.includes;
	json.excludes = this.excludes;
	json.config = this.config;
	json.extensionMap = this.extensionMap;
	result.push(json);
	return result;
}

LiteGroup.prototype.initialize = function(){
	this.initialize = Function.prototype;
	var parentConfig = this.parentConfig
	if(parentConfig){
		var config = {};
		copy(parentConfig.config,config);
		copy(this.config,config);
		this.config=config;
		this.extensionMap = margeExtensionMap(parentConfig.extensionMap,this.extensionMap);
	}
	this.includes = compilePatterns(this.includes)
	this.excludes = compilePatterns(this.excludes)
	mergeContentType(this,parentConfig);
	this.config["encoding"] = this.encoding;
	this.config["contentType"] = this.contentType;
	if(this.layout != null){
		if(!this.layout || this.layout.charAt() == '/'){
			this.config["layout"] = this.layout;
		}else{
			console.error("layout 必须为绝对地址('/'开始),你的设置为："+this.layout);
		}
		
	}
}
function mergeContentType(thiz,parentConfig){
	var type=thiz.type;
	var encoding = thiz.encoding;
	var contentType = thiz.contentType;//不从parent继承
	/*========= init 3 vars==========*/
	if(contentType!=null){
		console.info("contentType 用于同时指定 type 和charset 属性，如此需求更推荐您采用type和encoding代替")
		var p = contentType.indexOf('charset=');
		if(p>0){
			var charset = contentType.substring(p+8);
			if(encoding){
				if(charset.toUpperCase() != encoding.toUpperCase()){
					console.info('encoding 与 contentType 不一致'+encoding+','+contentType
						+"; ");
				}
			}else{
				encoding = charset;
			}
		}
		var contentType0 = contentType.replace(/\s*;.*$/,'');
		if(type){
			if(type.toUpperCase() != contentType0.toUpperCase()){
				console.error('type 与 contentType 不一致'+type+','+contentType0
					+';type 设置将被忽略');
			}
		}
		type = contentType0
	}
	/*========== init from parent ==============*/
	if(encoding == null){
		encoding = parentConfig && parentConfig.encoding || 'UTF-8';
	}
	if(type == null){
		type = parentConfig && parentConfig.type;
	}
	if(contentType == null){//不继承
		if(type){
			contentType = type+";charset="+encoding;
		}
	}else{
		var p = contentType.indexOf('charset=');
		if(p<0){
			contentType +=";charset="+encoding;
		}
	}
	thiz.type = type;
	thiz.encoding = encoding;
	thiz.contentType = contentType;
}
function copy(source,dest){
	for(var n in source){
		dest[n] = source[n];
	}
}
function margeExtensionMap(parentExtMap,thisExtMap){
	var result = {};
	for(var n in thisExtMap){
		result[n] = [].concat(thisExtMap[n]);
	}
	for(var n in parentExtMap){
		var list = [].concat(parentExtMap[n]);
		var thisExt = result[n] ;
		if(thisExt){
			var i = thisExt.length;
			while(i--){
				appendAfter(list,thisExt[i]);
			}
		}
		result[n] = list;
	}
	return result;
}
function appendAfter(ps,p){
	var i = ps.length;
	while(i--){
		if(ps[i] == p){
			ps.splice(i,1)
		}
	}
	ps.push(p);
}
function compilePatterns(ps){
	var i = ps.length;
	while(i--){
		ps[i] = buildURIMatcher(ps[i]);
	}
	return ps.join('|')||null;
}

function buildURIMatcher(pattern){
	var matcher = /\*+|[^\*\\\/]+?|[\\\/]/g;
	var buf = ["^"];
	var m
	matcher.lastIndex = 0;
	while (m = matcher.exec(pattern)) {
		var item = m[0];
		var len = item.length;
		var c = item.charAt(0);
		if (c == '*') {
			if (len > 1) {
				buf.push(".*");
			} else {
				buf.push("[^\\\\/]*");
			}
		} else if(len == 1 && c == '/' || c == '\\') {
			buf.push("[\\\\/]");
		}else{
			buf.push(item.replace(/[^\w]/g,quteReqExp));
		}
	}
	buf.push("$");
	return buf.join('');
}
function quteReqExp(x){
	switch(x){
	case '.':
		return '\\.';
	case '\\':
		return '\\\\';
	default:
		return '\\x'+(0x100 + x.charCodeAt()).toString(16).substring(1);
	}
}

if(typeof require == 'function'){
exports.parseConfig=parseConfig;
var loadLiteXML = require(7).loadLiteXML;
var findXMLAttribute=require(7).findXMLAttribute;
}
}
,
function(exports,require){if(typeof require == 'function'){
var Expression=require(16).Expression;

}/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

function OptimizeScope(code,params){

	this.code = code;
	/**
	 * @see org.xidea.lite.parse.OptimizeScope#getParams()
	 */
	this.params =  params?params.concat():[];
	/**
	 * @see org.xidea.lite.parse.OptimizeScope#getVars()
	 */
	this.vars = [];
	/**
	 * @see org.xidea.lite.parse.OptimizeScope#getCalls()
	 */
	this.calls = [];
	/**
	 * @see org.xidea.lite.parse.OptimizeScope#getRefs()
	 */
	this.refs = [];
	/**
	 * @see org.xidea.lite.parse.OptimizeScope#getExternalRefs()
	 */
	this.externalRefs = [];
	/**
	 * 所有for信息数组,按深度优先出现顺序放置[_forStack 描述的是当前for深度]
	 */
	this.fors = [];
	/**
	 * 所有函数定义数组
	 */
	this.defs = [];
	this.defMap = {};
	this.paramMap = listMap(this.params,{});
	this.varMap = {}
	this._forStack = [];
	vistLite(this,this.code = code);
    delete this._forStack;
	this.callMap =listMap(this.calls, {});
	this.refMap =listMap(this.refs, {});
	this.externalRefMap =listMap(this.externalRefs, {});
}
function listMap(list,map){
	var i = list.length;
	while(i--){
		var n = list[i];
		if(n in map){
			map[n]+=1;
		}else{
			map[n] = 1;
		}
	}
	return map;
}
function ForStatus(code){
    this.code = code;
    this.index;
    this.lastIndex;
    this.ref;
    this.depth
    //this.beforeStatus
}
function vistDef(context,item){
	var config = item[2];
	var params = config.params;
	var defaults = config.defaults;
	//def can not change!!. use cache
	var def = item[-1]||new OptimizeScope(item[1],params);
	def.name = config.name;
	def.defaults = config.defaults;
	context.fors = context.fors.concat(def.fors)
	context.defs.push(def.name);
	context.defMap[def.name] = def;
	def.defs = context.defs;
	def.defMap = context.defMap;
}
function vistLite(context,code){
	if(code == null){
		return null;
	}
    for(var i=0;i<code.length;i++){
        var item = code[i];
        if(item instanceof Array){
        	var type = item[0];
        	//el
        	switch (type) {
			case VAR_TYPE:
			case EL_TYPE:
			case XA_TYPE:
			case XT_TYPE:
				walkEL(context, item[1]);
				break;
			case IF_TYPE:
			case ELSE_TYPE:
			case FOR_TYPE:
				walkEL(context, item[2]);
				break;
			// case Template.PLUGIN_TYPE:
			// case Template.BREAK_TYPE:
			// case Template.CAPTURE_TYPE:
			// break;
			}
			//child
			switch (type) {
			case PLUGIN_TYPE:
				var className = item[2]['class'];
				if(className == 'org.xidea.lite.DefinePlugin'){
					vistDef(context,item);
				}else if(className == 'org.xidea.lite.parse.ClientPlugin'){
					//doFindClient(item);
				}else if(className == 'org.xidea.lite.EncodePlugin' 
					||className =='org.xidea.lite.DatePlugin'
					||className =='org.xidea.lite.ModulePlugin'){
					vistLite(context,item[1]);
				}else{
					console.info('unknow plugin',item[2])
				}
				break;
			case CAPTURE_TYPE:
			case IF_TYPE:
			case ELSE_TYPE:
				vistLite(context,item[1]);
				break;
			case FOR_TYPE:
			    enterFor(context,item);
			    addVar(context,item[3]);
				vistLite(context,item[1]);
				exitFor(context);
				break;
//			case XA_TYPE:
//			case XT_TYPE:
//			case EL_TYPE:
//			case VAR_TYPE:
			}
			//var
			switch(type){
			case CAPTURE_TYPE:
			case VAR_TYPE:
				addVar(context,item[2]);
				addVar(context,item[2]);
			}
        }
    }
}

function enterFor(context,forCode){
    var fs = new ForStatus(forCode);
    fs.depth = context._forStack.length;
    context.fors.push(fs)
    context._forStack.push(fs)
}
function exitFor(context){
    context._forStack.pop()
}
function addVar(context,n){
	context.vars.push(n);
	var map = context.varMap;
	if(n in map){
		map[n]+=1;
	}else{
		map[n] = 1;
	}
}


/* ============================= */
function walkEL(thiz,el){
	if(el == null){
		return;
	}
	var varMap = new Expression(el).getVarMap();
	//console.log(new Expression(el))
	for(var varName in varMap){
		var list = varMap[varName];
		var len = list.length;
		if(varName == 'for'){
		
			//
			for(var i =0;i<len;i++){
				var p = list[i];
				if(p == ''){
					setForStatus(thiz,'*');
				}else if(p == 'index' || p == 'lastIndex'){
					setForStatus(thiz,p);
				}else{
					console.error('for 不能有index，lastIndex 之外的其他属性');
					setForStatus(thiz,'*');
				}
			}
			
		}else{
			if(!(varName in thiz.varMap || varName in thiz.paramMap)){
				thiz.externalRefs.push(varName);
			}
			thiz.refs.push(varName);
		}
	}
	var callMap = new Expression(el).getCallMap();
	for(var callName in callMap){
		var list = callMap[callName];
		var len = list.length;
		for(var i =0;i<len;i++){
		if(varName in thiz.varMap 
			//@see javadoc OptimizeUtil#walkEL
			|| varName in thiz.paramMap
			){
			thiz.calls.push('*');
		}else if(varName){// ignore ''//constants
			thiz.calls.push(varName);
		}
		}
	}
}
function setForStatus(thiz,attrName){
	var fs = thiz._forStack[thiz._forStack.length-1];
	if(fs){
		if(attrName == 'index'){fs.index =true;}
		else if(attrName == 'lastIndex'){fs.lastIndex =true;}
		else if(attrName == '*'){fs.ref = true;}
		else{throw new Error("for不支持属性:"+attrName);}
	}else{
		throw new Error("for 变量不能在循环外使用:for."+attrName);
	}
}
///**
// * 遍历Lite的表达式结构，收集表达式信息
// */
//function ELStatus(tokens){
//	this.tree = tokens;
//	this.refs = [];
//	this.re
//	this.callMap = {};
//	/**
//	 * for  状态设置
//	 */
//	this.forIndex = false;
//	this.forLastIndex = false;
//	this.tree && walkEL(this,this.tree)
//}


if(typeof require == 'function'){
exports.OptimizeScope=OptimizeScope;
var VAR_TYPE=require(13).VAR_TYPE;
var XA_TYPE=require(13).XA_TYPE;
var ELSE_TYPE=require(13).ELSE_TYPE;
var PLUGIN_TYPE=require(13).PLUGIN_TYPE;
var CAPTURE_TYPE=require(13).CAPTURE_TYPE;
var IF_TYPE=require(13).IF_TYPE;
var EL_TYPE=require(13).EL_TYPE;
var BREAK_TYPE=require(13).BREAK_TYPE;
var XT_TYPE=require(13).XT_TYPE;
var FOR_TYPE=require(13).FOR_TYPE;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

//var ID_PATTERN = /^[a-zA-Z_\$][_\$\w]*$/;
var ID_PATTERN_QUTE = /^"[a-zA-Z_\$][_\$\w]*"$/;
var NUMBER_CALL = /^(\d+)(\.\w+)$/;//10.0.toString(2), 10.toString(2)
var PRESERVED = /^(break|case|catch|continue|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|throw|try|typeof|var|void|while|with|class|const|debugger|enum|export|extends|import|super)$/
var defaultContext = {
	getForName:String,
	findForAttribute:function(varName,propertyName){},
	genGetCode:function(owner,property){
		if(ID_PATTERN_QUTE.test(property)){
			return owner+'.'+property.slice(1,-1);
		}else{
			return owner+'['+property+']';
		}
	}
}
/**
 * 将某一个token转化为表达式
 */
function stringifyJSEL(el,context){
	var type = el[0];
	if(type<=0){//value
		return stringifyValue(el,context)
	}else if(getTokenParamIndex(type) ==3){//两个操作数
		return stringifyInfix(el,context);
	}else{
		return stringifyPrefix(el,context);
	}
	
}
/**
 * 翻译常量字面量
 */
function stringifyValue(el,context){
	var param = el[1];
	switch(el[0]){
    case VALUE_CONSTANTS:
        return (param && param['class']=='RegExp' && param.literal) || JSON.stringify(param);
    case VALUE_VAR:
    	//console.log(PRESERVED.test(param),param)
    	if(param == 'for'){
    		var f = context.getForName();
    		if(f){
    			return f;
    		}
    	//}else if(PRESERVED.test(param)){
    	//	return param+'__';
    	}else{
    		
    	}
    	return context.getVarName(param) ;
    case VALUE_LIST:
    	return "[]";
    case VALUE_MAP:
    	return "{}";
	}
}

function stringifyGetter(context,el){
	var el1 = el[1];
	var el2 = el[2];
	var value1 = stringifyJSEL(el1,context);
	var value2 = stringifyJSEL(el2,context);
	if(el2[0] == VALUE_CONSTANTS){
		var p = getTokenParam(el[2])
		if(typeof p == 'string'){
			if(p == 'index' || p == 'lastIndex'){
				var forAttr = context.findForAttribute(value1,p);
				if(forAttr){
					return forAttr;
				}
			}
		}
	}
	//safe check
	//return __get__(value1,value2)
	//default impl(without safy check)
	value1 = addELQute(el,el1,value1)
	return context.genGetCode(value1,value2);
}
function stringifyPropertyCall(context,propertyEL,callArguments){
	var value1 = stringifyGetter(context,propertyEL);
	var value2 = stringifyJSEL(callArguments,context);
	if(value1.match(/\)$/)){
		//safe property call
		return value1.slice(0,-1)+','+value2+')'
	}else{
		value1 = value1.replace(NUMBER_CALL,'($1)$2')//void 10.toString(2) error!!
		return value1+"("+value2.slice(1,-1)+')';
	}
}
/**
 * 翻译中缀运算符
 */
function stringifyInfix(el,context){
	var type = el[0];
	var el1 = el[1];
	var el2 = el[2];
	if(type == OP_GET){
		return stringifyGetter(context,el);
	}else if(type == OP_INVOKE && el1[0] == OP_GET){
		return stringifyPropertyCall(context,el1,el2);
	}
	var opc = findTokenText(el[0]);
	var value1 = stringifyJSEL(el1,context);
	var value2 = stringifyJSEL(el2,context);
	//value1 = addELQute(el,el[1],value1);
	switch(type){
	case OP_INVOKE:
		value2 = value2.slice(1,-1);
		value1 = value1.replace(NUMBER_CALL,'($1)$2')
		return value1+"("+value2+')';
	//case OP_GET:
		
	case OP_JOIN:
		if("[]"==value1){
			return "["+value2+"]"
		}else{
			return value1.slice(0,-1)+','+value2+"]"
		}
	case OP_PUT:
		value2 = JSON.stringify(getTokenParam(el))+":"+value2+"}";
		if("{}"==value1){
			return "{"+value2
		}else{
			return value1.slice(0,-1)+','+value2
		}
    case OP_QUESTION:
    	//1?2:3 => [QUESTION_SELECT,
    	// 					[QUESTION,[CONSTANTS,1],[CONSTANTS,2]],
    	// 					[CONSTANTS,3]
    	// 			]
    	//throw new Error("表达式异常：QUESTION 指令翻译中应该被QUESTION_SELECT跳过");
    	return null;//前面有一个尝试，此处应返回null，而不是抛出异常。
    case OP_QUESTION_SELECT:
    /**
 ${a?b:c}
 ${a?b1?b2:b3:c}
 ${222+2|a?b1?b2:b3:c}
     */
     	//?:已经是最低优先级了,无需qute,而且javascript 递归?: 也无需优先级控制
    	var test = stringifyJSEL(el1[1],context);
    	var value1 = stringifyJSEL(el1[2],context);
    	return test+'?'+value1+":"+value2;
	}
	value1 = addELQute(el,el1,value1)
	value2 = addELQute(el,el2,null,value2)
	return value1 + opc + value2;
}
/**
 * 翻译前缀运算符
 */
function stringifyPrefix(el,context){
	var type = el[0];
	var el1 = el[1];
	var value = stringifyJSEL(el1,context);
	var param = getTokenParam(el);
	value = addELQute(el,el1,null,value)
    var opc = findTokenText(type);
	return opc+value;
}

if(typeof require == 'function'){
exports.stringifyJSEL=stringifyJSEL;
var getTokenParam=require(30).getTokenParam;
var getTokenParamIndex=require(30).getTokenParamIndex;
var findTokenText=require(30).findTokenText;
var addELQute=require(30).addELQute;
var OP_GET=require(30).OP_GET;
var OP_IN=require(30).OP_IN;
var OP_INVOKE=require(30).OP_INVOKE;
var OP_JOIN=require(30).OP_JOIN;
var OP_PUT=require(30).OP_PUT;
var OP_QUESTION=require(30).OP_QUESTION;
var OP_QUESTION_SELECT=require(30).OP_QUESTION_SELECT;
var VALUE_CONSTANTS=require(30).VALUE_CONSTANTS;
var VALUE_LIST=require(30).VALUE_LIST;
var VALUE_MAP=require(30).VALUE_MAP;
var VALUE_VAR=require(30).VALUE_VAR;
}
}
,
function(exports,require){if(typeof require == 'function'){
var JSONTokenizer=require(39).JSONTokenizer;
}/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

//编译期间标记，compile time object
var BRACKET_BEGIN = 0xFFFE;//([{;
var BRACKET_END = 0xFFFF;//)]};

var STATUS_BEGIN = -100;
var STATUS_EXPRESSION = -101;
var STATUS_OPERATOR = -102;
var fns = {
	getResult :function() {
		return this.expression;
		//return optimizeEL(this.expression);//.slice(0).reverse();// reversed
	},

	parseEL :function() {
		this.skipSpace(0);
		while (this.start < this.end) {
			var c = this.value.charAt(this.start);
			if (c == '"' || c == '\'') {
				var text = this.findString();
				this.addKeyOrObject(text, false);
			} else if (c >= '0' && c <= '9') {
				var number = this.findNumber();
				this.addKeyOrObject(number, false);
			} else if (/[\w$_]/.test(c)) {
				var id = this.findId();
				switch(id){
				    case 'true':
				        this.addToken([VALUE_CONSTANTS,true]);
				        break;
				    case 'false':
				        this.addToken([VALUE_CONSTANTS,false]);
				        break;
				    case 'null':
				        this.addToken([VALUE_CONSTANTS,null]);
				        break;
//				    case 'in':
//				        this.addToken([OP_IN,null]);
//				        break;
				    default:
    				    this.skipSpace(0);
    					if (this.previousType == OP_GET) {
    						this.addToken([VALUE_CONSTANTS,
    								id]);
    					} else {
    						this.addKeyOrObject(id, true);
    					}
				}
			} else {
				var op = this.findOperator();
				// if (this.value.startsWith(op, this.start))
				this.parseOperator(op);
				if (op == null) {
					this.parseError("未知操作符:");
				}
			}
			this.skipSpace(0);
		}
	},
	parseError:function(msg){
	    msg = msg+"\n@"+ this.start + "\n"
				+ this.value.substring(this.start)+"\n----\n"+this.value
		console.error(msg);
		throw new Error(msg);
	},
	findOperator :function() {// optimize json ,:[{}]
		var c = this.value.charAt(this.start);
		var end = this.start+1;
		var next = this.value.charAt(end);
		switch (c) {
		case ',':// optimize for json
		case ':':// 3op,map key
		case '[':// list
		case ']':
		case '{':// map
		case '}':
		case '(':// quote
		case ')':
		case '.':// prop
		case '?':// 3op
		case '~':
		case '^':
			break;
		case '+':// 5op
		case '-':
		case '*':
		case '/':
		case '%':
			if(next == '=' ){
				this.parseError("不支持赋值操作:");
			}else if(next == c){
				this.parseError("不支持自增自减操作:");
			}
			break;
		case '=':// ==
			if(next == '='){
				end++;
				if(this.value.charAt(end) == '='){
					end++;
				}
			}else{
				this.parseError("不支持赋值操作:");
			}
			break;
		case '!':// !,!=
			if(next == '='){
				end++;
				if(this.value.charAt(end) == '='){
					end++;
				}
			}
			break;
		case '>':// >,>=
		case '<':// <,<=
			if (next == '=') {
				end++;
			}else if(next == c){
				if(this.value.charAt(end) == c){
					end++;
				}
			}
			break;
		case '&':// && / &
		case '|':// || /|
			if( (c == next)){
				end++;
			}
			break;
		default:
			return null;
		}
		return this.value.substring(this.start, this.start = end);
	},

	/**
	 * 碰見:和,的時候，就需要檢查是否事map的間隔符號了
	 * 
	 * @return
	 */
	isMapMethod :function() {
		var i = this.tokens.length - 1;
		var depth = 0;
		for (; i >= 0; i--) {
			var token = this.tokens[i];
			var type = token[0];
			if (depth == 0) {
				if (type == OP_PUT
						|| type == VALUE_MAP) {// (
					// <#newMap>
					// <#push>
					return true;
				} else if (type == OP_JOIN) {// (
					// <#newList>
					// <#param_join>
					return false;
				}
			}
			if (type == BRACKET_BEGIN) {
				depth--;
			} else if (type == BRACKET_END) {
				depth++;
			}
		}
		return false;
	},

	parseOperator :function(op) {
		if (op.length == 1) {
			switch (op.charAt(0)) {
			case '(':
				if (this.status == STATUS_EXPRESSION) {
					this.addToken([OP_INVOKE]);
					if (this.skipSpace(')')) {
						this.addToken([VALUE_CONSTANTS,
								[]]);
						this.start++;
					} else {
						this.addList();
					}

				} else {
					this.addToken([BRACKET_BEGIN]);
				}
				break;
			case '[':
				if (this.status == STATUS_EXPRESSION) {// getProperty
					this.addToken([OP_GET]);
					this.addToken([BRACKET_BEGIN]);
				}else {// list
					this.addList();
				}
				break;
			case '{':
				this.addMap();
				break;
			case '}':
			case ']':
			case ')':
				this.addToken([BRACKET_END]);
				break;
			case '+'://
				this.addToken([
						this.status == STATUS_EXPRESSION ? OP_ADD : OP_POS]);
				break;
			case '-':
				this.addToken([
						this.status == STATUS_EXPRESSION ? OP_SUB
								: OP_NEG]);
				break;
			case ':':
				this.addToken([OP_QUESTION_SELECT]);// map : is skipped
				break;
			case ',':// :(object_setter is skiped,',' should
				// be skip)
				if (this.isMapMethod()) {
					
					this.status = STATUS_OPERATOR;
				}else{
					this.addToken([OP_JOIN]);

				}
				break;
			case '/':
				var next = this.value.charAt(this.start);
				if (next == '/') {
					var end1 = this.value.indexOf('\n', this.start);
					var end2 = this.value.indexOf('\r', this.start);
					var cend = Math.min(end1, end2);
					if (cend < 0) {
						cend = Math.max(end1, end2);
					}
					if (cend > 0) {
						this.start = cend;
					} else {
						this.start = this.end;
					}
					break;
				} else if (next == '*') {
					var cend = this.value.indexOf("*/", this.start);
					if (cend > 0) {
						this.start = cend + 2;
					} else {
						throw new Error("未結束注釋:" + this.value
								+ "@" + this.start);
					}
					break;
				}else if(this.status != STATUS_EXPRESSION){
					var end = findRegExp(this.value,this.start);
					if(end>0){
						this.addToken([VALUE_CONSTANTS,
							toValue(
								this.value.substring(this.start-1,end))]);
						this.start = end;
						break;
					}else{
						throw new Error("异常正则:"+this.value+'@'+this.start)
					}
				//}else{
				//	this.addToken([findTokenType(op)]);// /
				}
			default:
				this.addToken([findTokenType(op)]);
			}
		} else {
			this.addToken([findTokenType(op)]);
		}
	},

	addToken :function(token) {
		var type= token[0];
		if(type == VALUE_VAR){
			if("in" == token[1]){
				token[0] = type = OP_IN;
			}
		}
		
		switch (type) {
		case BRACKET_BEGIN:
			this.status = STATUS_BEGIN;
			break;
		case VALUE_CONSTANTS:
		case VALUE_VAR:
		case BRACKET_END:
			this.status = STATUS_EXPRESSION;
			break;
		default:
			this.status = STATUS_OPERATOR;
			break;
		}
		// previousType2 = this.previousType;
		this.previousType = type;
		this.tokens.push(token);
	},

	addKeyOrObject :function(object, isVar) {
		if (this.skipSpace(':') && this.isMapMethod()) {// object key
			this.addToken([OP_PUT, object]);
			this.start++;// skip :
		} else if (isVar) {
			this.addToken([VALUE_VAR, object]);
		} else {
			this.addToken([VALUE_CONSTANTS, object]);
		}
	},

	addList :function() {
		this.addToken([BRACKET_BEGIN]);
		this.addToken([VALUE_LIST]);
		if (!this.skipSpace(']')) {
			this.addToken([OP_JOIN]);
		}
	},

	addMap :function() {
		this.addToken([BRACKET_BEGIN]);
		this.addToken([VALUE_MAP]);
	}
};
var pt = new JSONTokenizer('');
for(var n in fns){
    pt[n] = fns[n]
}
function toValue(s){
    var v= this.eval(s);
    if(v instanceof RegExp){
    	v = {
            "class":"RegExp",
    		'literal':s+''
    	}
    }
    return v;
}
function findRegExp(text,start){
	var depth=0,c;
	while(c = text.charAt(start++)){
	    if(c=='['){
	    	depth = 1;
	    }else if(c==']'){
	    	depth = 0;
	    }else if (c == '\\') {
	        start++;
	    }else if(depth == 0 && c == '/'){
	    	while(c = text.charAt(start++)){
	    		switch(c){
	    			case 'g':
	    			case 'i':
	    			case 'm':
	    			break;
	    			default:
	    			return start-1;
	    		}
	    	}
	    	
	    }
	}
}
/**
 * 表达式解析器，将JS表达式文本解析成JSON中间代码
 */
function ExpressionTokenizer(value){
    this.value = value.replace(/^\s+|\s+$/g,'');
	this.start = 0;
	this.end = this.value.length;
    this.status = STATUS_BEGIN;
	this.previousType = STATUS_BEGIN;
	this.tokens = [];
	this.parseEL();
	prepareSelect(this.tokens)
	this.expression = buildTree(trimToken(right(this.tokens)));
}

function prepareSelect(tokens) {
	var p1 = tokens.length;
	while (p1--) {
		var type1 = tokens[p1][0];
		if (type1 == OP_QUESTION) { // (a?b
			var pos = getSelectRange(tokens,p1, -1, -1);
			tokens.splice(pos+1,0, [BRACKET_BEGIN]);
			p1++;
		} else if (type1 == OP_QUESTION_SELECT) {
			var end = tokens.length;
			var pos = getSelectRange(tokens,p1, 1, end);
			tokens.splice(pos,0, [BRACKET_END]);
		}
	}
}
function getSelectRange(tokens,p2, inc, end) {
	var dep = 0;
	while ((p2 += inc) != end) {
		var type2 = tokens[p2][0];
		if (type2 > 0) {// op
			if (type2 == BRACKET_BEGIN) {
				dep += inc;
			} else if (type2 == BRACKET_END) {
				dep -= inc;
			} else if (dep == 0 && getPriority(type2) <= getPriority(OP_QUESTION)) {
				return p2;
			}
			if (dep < 0) {
				return p2;
			}
		}
	}
	return inc > 0 ? end : -1;
}
function buildTree(tokens){
	var stack = [];
    for(var i=0;i<tokens.length;i++){
        var item = tokens[i]
        var type = item[0];
        switch(type){
            case VALUE_CONSTANTS:
            case VALUE_VAR:
            case VALUE_LIST:
            case VALUE_MAP:
                stack.push(item);
                break;
            default://OP
                if(getTokenParamIndex(type) ==3){//两个操作数
                    var arg2 = stack.pop();
                    var arg1 = stack.pop();
                    var el = [type,arg1,arg2]
                }else{//一个操作树
                	var arg1 = stack.pop();
                	var el = [type,arg1]
                }
                if(hasTokenParam(type)){
					el[getTokenParamIndex(type)] = item[1];
                }
                stack.push(el)
        }
    }
    return stack[0];
}
ExpressionTokenizer.prototype = pt;



// 将中序表达式转换为右序表达式
function right(tokens) {
	var rightStack = [[]];
	var buffer = [];

	for (var i = 0;i<tokens.length;i++) {
		var item = tokens[i];
		if (item[0] > 0) {
			if (buffer.length == 0) {
				buffer.push(item);
			} else if (item[0] == BRACKET_BEGIN) {// ("(")
				buffer.push(item);
			} else if (item[0] == BRACKET_END) {// .equals(")"))
				while (true) {
					var operator = buffer.pop();
					if (operator[0] == BRACKET_BEGIN) {
						break;
					}
					addRightToken(rightStack, operator);
				}
			} else {
				while (buffer.length!=0
						&& rightEnd(item[0], buffer[buffer.length-1][0])) {
					var operator = buffer.pop();
					// if (operator[0] !=
					// BRACKET_BEGIN){
					addRightToken(rightStack, operator);
				}
				buffer.push(item);
			}
		} else {
			addRightToken(rightStack, item);
		}
	}
	while (buffer.length !=0) {
		var operator = buffer.pop();
		addRightToken(rightStack, operator);
	}
	return rightStack[rightStack.length-1];
}
function trimToken(tokens){
	for(var i=0;i<tokens.length;i++){
		var token = tokens[i];
		token.length = getTokenLength(token[0]);
	}
	return tokens;
}

function addRightToken(rightStack,
		token) {
	var list = rightStack[rightStack.length-1];
//	if (token[0] == OP_GET) {
//	    var last = list.length-1;
//	    if(last>=0){
//	        var previous = list[last];
//	        if(previous[0] == VALUE_CONSTANTS){
//	            list.length--;
//	            token = [OP_GET_STATIC_PROP,previous[1]]; 
//	        }
//	    }
//	}
	list.push(token);
}

function getPriority(type) {
	switch (type) {
	case BRACKET_BEGIN:
	case BRACKET_END:
		return Math.MIN_VALUE;
	default:
		return (type & BIT_PRIORITY)<<4 | (type & BIT_PRIORITY_SUB)>>8;
	}
}
/**
 */
function rightEnd(currentType, priviousType) {
	var priviousPriority = getPriority(priviousType);
	var currentPriority = getPriority(currentType);
	return currentPriority <= priviousPriority;
}
if(typeof require == 'function'){
exports.getPriority=getPriority;
exports.ExpressionTokenizer=ExpressionTokenizer;
var hasTokenParam=require(30).hasTokenParam;
var getTokenParam=require(30).getTokenParam;
var hasTokenParam=require(30).hasTokenParam;
var getTokenParamIndex=require(30).getTokenParamIndex;
var getTokenLength=require(30).getTokenLength;
var findTokenType=require(30).findTokenType;
var BIT_PRIORITY=require(30).BIT_PRIORITY;
var BIT_PRIORITY_SUB=require(30).BIT_PRIORITY_SUB;
var OP_ADD=require(30).OP_ADD;
var OP_GET=require(30).OP_GET;
var OP_IN=require(30).OP_IN;
var OP_INVOKE=require(30).OP_INVOKE;
var OP_JOIN=require(30).OP_JOIN;
var OP_NE=require(30).OP_NE;
var OP_NEG=require(30).OP_NEG;
var OP_POS=require(30).OP_POS;
var OP_PUT=require(30).OP_PUT;
var OP_QUESTION=require(30).OP_QUESTION;
var OP_QUESTION_SELECT=require(30).OP_QUESTION_SELECT;
var OP_SUB=require(30).OP_SUB;
var VALUE_CONSTANTS=require(30).VALUE_CONSTANTS;
var VALUE_LIST=require(30).VALUE_LIST;
var VALUE_MAP=require(30).VALUE_MAP;
var VALUE_VAR=require(30).VALUE_VAR;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
var BIT_PRIORITY= 60;
var BIT_PRIORITY_SUB= 3840;
var BIT_ARGS= 192;
var POS_INC= 12;
var VALUE_CONSTANTS= -1;
var VALUE_VAR= -2;
var VALUE_LIST= -3;
var VALUE_MAP= -4;
var OP_GET= 96;
var OP_INVOKE= 97;
var OP_NOT= 28;
var OP_BIT_NOT= 29;
var OP_POS= 30;
var OP_NEG= 31;
var OP_MUL= 88;
var OP_DIV= 89;
var OP_MOD= 90;
var OP_ADD= 84;
var OP_SUB= 85;
var OP_LSH= 80;
var OP_RSH= 81;
var OP_URSH= 82;
var OP_LT= 332;
var OP_GT= 333;
var OP_LTEQ= 334;
var OP_GTEQ= 335;
var OP_IN= 4428;
var OP_EQ= 76;
var OP_NE= 77;
var OP_EQ_STRICT= 78;
var OP_NE_STRICT= 79;
var OP_BIT_AND= 1096;
var OP_BIT_XOR= 840;
var OP_BIT_OR= 584;
var OP_AND= 328;
var OP_OR= 72;
var OP_QUESTION= 68;
var OP_QUESTION_SELECT= 69;
var OP_JOIN= 64;
var OP_PUT= 65;






var TYPE_TOKEN_MAP = {}
var TOKEN_TYPE_MAP = {}
function addToken(type,token){
	TYPE_TOKEN_MAP[type] = token;
	TOKEN_TYPE_MAP[token] = type;
}

addToken(VALUE_CONSTANTS ,"value");
addToken(VALUE_VAR       ,"var");
addToken(VALUE_LIST      ,"[]");
addToken(VALUE_MAP       ,"{}");


//九：（最高级别的运算符号）
addToken(OP_GET      ,".");
addToken(OP_INVOKE   ,"()");

//八
addToken(OP_NOT     ,"!");
addToken(OP_BIT_NOT ,"~");
addToken(OP_POS     ,"+");
addToken(OP_NEG     ,"-");

//七：
addToken(OP_MUL ,"*");
addToken(OP_DIV ,"/");
addToken(OP_MOD ,"%");

//六：
//与正负符号共享了字面值
addToken(OP_ADD ,"+");
addToken(OP_SUB ,"-");

//五:移位
addToken(OP_LSH   ,"<<");
addToken(OP_RSH   ,">>");
addToken(OP_URSH   ,">>>");

//四:比较
addToken(OP_LT   ,"<");
addToken(OP_GT   ,">");
addToken(OP_LTEQ ,"<=");
addToken(OP_GTEQ ,">=");
addToken(OP_IN   ," in ");

//四:等不等比较
addToken(OP_EQ        ,"==");
addToken(OP_NE        ,"!=");
addToken(OP_EQ_STRICT ,"===");
addToken(OP_NE_STRICT ,"!==");

//三:按位与或
addToken(OP_BIT_AND ,"&");
addToken(OP_BIT_XOR ,"^");
addToken(OP_BIT_OR  ,"|");
//三:与或
addToken(OP_AND ,"&&");
addToken(OP_OR  ,"||");

//二：
//?;
addToken(OP_QUESTION        ,"?");
//:;
addToken(OP_QUESTION_SELECT ,":");

//一：
//与Map Join 共享字面量（map join 会忽略）
addToken(OP_JOIN   ,",");
//与三元运算符共享字面值
addToken(OP_PUT   ,":");



function findTokenType(token) {
	return TOKEN_TYPE_MAP[token];
}
function findTokenText(type) {
	return TYPE_TOKEN_MAP[type];
}

function hasTokenParam(type) {
	switch (type) {
	case VALUE_VAR:
	case VALUE_CONSTANTS:
//	case OP_GET_STATIC_PROP:
//	case OP_INVOKE_WITH_STATIC_PARAM:
//	case OP_INVOKE_WITH_ONE_PARAM:
	case OP_PUT:
		return true;
	default:
		return  false;
	}
}
function getTokenParam(el) {
	return el[getTokenParamIndex(el[0])]
}

function getTokenLength(type) {
	var size = getTokenParamIndex(type);
	return hasTokenParam(type)?size+1:size;

}
//function optimizeEL(el){
//	var type = el[0];
//	var end = getTokenParamIndex(type) ;
//	if (end > 1) {//2,3
//	
//		el[1] = optimizeEL(el[1]);
//		var co = canOptimize(el[1][0]);
//		if(end>2){
//			el[2] = optimizeEL(el[2]);
//			co = co &&  canOptimize(el[2][0]);
//		}
//		if(co){
//			var o = evaluate(el, []);
//			var type = typeof o;
//			switch(type){
//				case 'string':
//				case 'boolean':
//					break;
//				case 'number':
//					if(isFinite(o)){
//						break;
//					}
//				default:
//					if(o != null){//object undefined
//						return el;
//					}
//			}
//			return [VALUE_CONSTANTS,o]
//		}
//	}
//	return el;
//}
//
//function canOptimize(type) {
//	return type == VALUE_CONSTANTS;
//}
function getTokenParamIndex(type) {
	if(type<0){
		return 1;
	}
	var c = (type & BIT_ARGS) >> 6;
	return c + 2;
}

var offset = 0
var TYPE_NULL = 1<<offset++;
var TYPE_BOOLEAN = 1<<offset++;
var TYPE_NUMBER = 1<<offset++;
var TYPE_STRING = 1<<offset++;
var TYPE_ARRAY = 1<<offset++;
var TYPE_MAP = 1<<offset++;
var TYPE_ANY = (1<<offset++) -1;

//var TYPE_NULL = 1<<offset++;
//var TYPE_BOOLEAN = 1<<offset++;
//var TYPE_NUMBER = 1<<offset++;

//var TYPE_STRING = 1<<offset++;
//var TYPE_ARRAY = 1<<offset++;
//var TYPE_MAP = 1<<offset++;
/**
 * number return true
 * string return false;
 */
function isNTSFAN(type){
	var isN = (type & TYPE_NULL) ||(type & TYPE_BOOLEAN) ||(type & TYPE_NUMBER);
	var isS = (type & TYPE_STRING) ||(type & TYPE_ARRAY) ||(type & TYPE_MAP);
	if(!isS ){
		return true;
	}
	if(!isN ){
		return false;
	}
	return null;
}
function getAddType(arg1,arg2){
	var t1 = getELType(arg1);
	var t2 = getELType(arg2);
	var ns1 = isNTSFAN(t1);
	var ns2 = isNTSFAN(t2);
	//alert([ns1,ns2])
	
	if(ns1 === false || ns2 === false){
		return TYPE_STRING;
	}
	if(ns1 === true && ns2 === true){
		return TYPE_NUMBER;
	}
	return TYPE_NUMBER|TYPE_STRING;
}
function getELType(el){
	var op = el[0];
	var type;
	if(op>0){
		var arg1 = el[1];
		var arg2 = el[2];
		switch(op){
		case OP_JOIN:
			return TYPE_ARRAY;
		case OP_PUT:
			return TYPE_MAP;
		case OP_ADD:
			//if(isNumberAdder(arg1)&&isNumberAdder(arg2)){
			//	//return 'number';
			//}else{
			return getAddType(arg1,arg2)
			//}
		case OP_POS:
		case OP_NEG:
		case OP_MUL:
		case OP_DIV:
		case OP_MOD:
		case OP_SUB:
		case OP_BIT_AND:
		case OP_BIT_XOR:
		case OP_BIT_OR:
		case OP_BIT_NOT:
			return  TYPE_NUMBER;
		case OP_NOT:
		case OP_LT:
		case OP_GT:
		case OP_LTEQ:
		case OP_GTEQ:
		case OP_EQ:
		case OP_NE:
		case OP_EQ_STRICT:
		case OP_NE_STRICT:
			return  TYPE_BOOLEAN;
		case OP_AND:
		case OP_OR:
			return  getELType(arg1) | getELType(arg2);
		case OP_GET:
			if(arg2[0] == VALUE_CONSTANTS){
				if(arg1[0] == VALUE_VAR && arg1[1] == 'for'){
					if(arg2[1] == 'index' || arg2[1] == 'lastIndex'){
						return TYPE_NUMBER;
					}
				}else if( arg2[1] == 'length'){
					var t1 = getELType(arg1);
	//var TYPE_NULL = 1<<offset++;
	//var TYPE_BOOLEAN = 1<<offset++;
	//var TYPE_NUMBER = 1<<offset++;
	
	//var TYPE_STRING = 1<<offset++;
	//var TYPE_ARRAY = 1<<offset++;
	
	//var TYPE_MAP = 1<<offset++;
					if(t1 & TYPE_MAP){
						return TYPE_ANY;
					}else if((t1 & TYPE_ARRAY) || (t1 & TYPE_STRING)){
						if((t1 & TYPE_STRING) || (t1 & TYPE_BOOLEAN)||(t1 & TYPE_NUMBER)){
							return TYPE_NULL|TYPE_NUMBER;
						}else{
							return TYPE_NUMBER;
						}
					}else{//only TYPE_STRING TYPE_BOOLEAN TYPE_NUMBER
						return TYPE_NULL;
					}
				}
			}
			return TYPE_ANY;
		case OP_INVOKE:
			if(arg1[0] == VALUE_VAR){
				switch(arg1[1]){
					case "encodeURI":
					case "encodeURIComponent":
					case "decodeURI":
					case "decodeURIComponent":
						return TYPE_STRING;
					case "parseInt":
					case "parseInt":
						return TYPE_NUMBER;
					case "isFinite":
					case "isNaN":
						return TYPE_BOOLEAN;
				}
			}else if(arg1[0] == OP_GET){
				//console.warn(uneval(arg1));
				arg2 = arg1[2];
				arg1 = arg1[1];
				if(arg2[0] == VALUE_CONSTANTS){
					var method = arg2[1];
					if(arg1[0] == VALUE_VAR){
						var owner = arg1[1];
						if(owner == 'JSON'){
							if(method == 'stringify'){
								return TYPE_STRING;
							}
						}else if(owner == 'Math'){
							return TYPE_NUMBER;
						}
					}
				}
			}
			return TYPE_ANY;
		default:
			return TYPE_ANY;
		}
	}else{
		switch(op){
		case VALUE_CONSTANTS:
			var v= el[1];
			if(v == null){
				return TYPE_NULL;
			}
			switch(typeof v){
			case 'boolean':
				return TYPE_BOOLEAN;
			case 'number':
				return TYPE_NUMBER;
			case 'string':
				return TYPE_STRING;
			case 'object':
				if(v instanceof Array){
					return TYPE_ARRAY;
				}
				return TYPE_MAP;
			}
			return TYPE_ANY;
		case VALUE_VAR:
			return TYPE_ANY;
		case VALUE_LIST:
			return TYPE_ARRAY;
		case VALUE_MAP:
			return TYPE_MAP;
		default:
			return TYPE_ANY;
		}
	}
}

/**
 * 获取某个运算符号的优先级
 */
function addELQute(parentEl,childEL,value1,value2){
	var pp = getPriority(parentEl[0]);
	var cp = getPriority(childEL[0]);
	if(value1){
		if(cp<pp){
			value1 = '('+value1+')';
		}
		return value1;
	}else if(value2 && pp>=cp){
		value2 = '('+value2+')';
	}
	return value2;
}

if(typeof require == 'function'){
exports.getTokenParam=getTokenParam;
exports.hasTokenParam=hasTokenParam;
exports.getTokenParamIndex=getTokenParamIndex;
exports.getTokenLength=getTokenLength;
exports.findTokenType=findTokenType;
exports.findTokenText=findTokenText;
exports.getELType=getELType;
exports.addELQute=addELQute;
exports.BIT_ARGS=BIT_ARGS;
exports.BIT_PRIORITY=BIT_PRIORITY;
exports.BIT_PRIORITY_SUB=BIT_PRIORITY_SUB;
exports.OP_ADD=OP_ADD;
exports.OP_AND=OP_AND;
exports.OP_BIT_AND=OP_BIT_AND;
exports.OP_BIT_NOT=OP_BIT_NOT;
exports.OP_BIT_OR=OP_BIT_OR;
exports.OP_BIT_XOR=OP_BIT_XOR;
exports.OP_DIV=OP_DIV;
exports.OP_EQ=OP_EQ;
exports.OP_EQ_STRICT=OP_EQ_STRICT;
exports.OP_GET=OP_GET;
exports.OP_GT=OP_GT;
exports.OP_GTEQ=OP_GTEQ;
exports.OP_IN=OP_IN;
exports.OP_INVOKE=OP_INVOKE;
exports.OP_JOIN=OP_JOIN;
exports.OP_LSH=OP_LSH;
exports.OP_LT=OP_LT;
exports.OP_LTEQ=OP_LTEQ;
exports.OP_MOD=OP_MOD;
exports.OP_MUL=OP_MUL;
exports.OP_NE=OP_NE;
exports.OP_NEG=OP_NEG;
exports.OP_NE_STRICT=OP_NE_STRICT;
exports.OP_NOT=OP_NOT;
exports.OP_OR=OP_OR;
exports.OP_POS=OP_POS;
exports.OP_PUT=OP_PUT;
exports.OP_QUESTION=OP_QUESTION;
exports.OP_QUESTION_SELECT=OP_QUESTION_SELECT;
exports.OP_RSH=OP_RSH;
exports.OP_SUB=OP_SUB;
exports.OP_URSH=OP_URSH;
exports.TYPE_ANY=TYPE_ANY;
exports.TYPE_ARRAY=TYPE_ARRAY;
exports.TYPE_BOOLEAN=TYPE_BOOLEAN;
exports.TYPE_MAP=TYPE_MAP;
exports.TYPE_NULL=TYPE_NULL;
exports.TYPE_NUMBER=TYPE_NUMBER;
exports.TYPE_STRING=TYPE_STRING;
exports.TYPE_TOKEN_MAP=TYPE_TOKEN_MAP;
exports.VALUE_CONSTANTS=VALUE_CONSTANTS;
exports.VALUE_LIST=VALUE_LIST;
exports.VALUE_MAP=VALUE_MAP;
exports.VALUE_VAR=VALUE_VAR;
var evaluate=require(31).evaluate;
var getPriority=require(29).getPriority;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
/**
 * 表达式对象，可以单步解释表达式中间代码
 */
function Expression(value){
	if(typeof value == 'string'){
		value = new ExpressionTokenizer(value).getResult();
	}else if(value instanceof Expression){
		return value;
	}
	this.token = value;
}
Expression.prototype.evaluate = function(context){
     return evaluate(context,this.token);
}
/**
 * {
 *    varName:["","a","a.b","a.*.b"]
 * }
 */
Expression.prototype.getVarMap = function(){
	init(this);
	return this.varMap;
	
}
/**
 * {
 *    methodName:["","a","a.b","*",'a.1.*.x','.a.1']
 * }
 */
Expression.prototype.getCallMap = function(){
	init(this);
	return this.callMap;
}
function init(thiz){
	if(thiz.callMap == null){
		thiz.callMap = {};
		thiz.varMap = {};
		walkEL(thiz.token,thiz);
	}
}
function walkEL(token,context){
	var op = token[0];
	if(op<=0){
		if(op == VALUE_VAR){
			_addKeyList(context.varMap,token[1],'');
		}
		return;
	}else{
		var arg1 = token[1];
		if(op == OP_INVOKE){
			if(arg1[0] == VALUE_VAR){
				_addKeyList(context.callMap,arg1[1],'');
			}else if(arg1[0] == OP_GET){//member
				var list = walkMembers(arg1,context,[]).reverse();
				var ps = list.slice(1).join('.');
				if(list[0] != ''){//!constants,what about constants, map,list?
					if(list[0] != '*' ){//vars
						_addKeyList(context.varMap,list[0],ps);
					}
					_addKeyList(context.callMap,list[0],ps);
				}
			}else{
				walkEL(arg1,context);
				_addKeyList(context.callMap,"*",'');
			}
		}else{
			if(op == OP_GET){
				var list = walkMembers(token,context,[]).reverse();
				var ps = list.slice(1).join('.');
				if(list[0] != ''){//!constants,what about constants, map,list?
					if(list[0] != '*' ){//vars
						_addKeyList(context.varMap,list[0],ps);
					}
				}
			}else{
				arg1 && walkEL(arg1,context);
			}
		}
		var pos = getTokenParamIndex(token[0]);
		if(pos>2){//invoke args... 
			walkEL(token[2],context);
		}
	}
}
function walkMembers(token,context,buf){//[get,owner,key]
	var owner = token[1];
	var key = token[2];
	if(key[0] == VALUE_CONSTANTS){
		buf.push(key[1]);
	}else{
		walkEL(key,context);
		buf.push('*');
	}
	
	if(owner[0] == VALUE_VAR){
		buf.push(owner[1]);//跳过 设置 varMap
	}else if(owner[0] == VALUE_CONSTANTS){
		buf.push('');
	}else if(owner[0] == OP_GET){
		walkMembers(owner,context,buf);
	}else{
		walkEL(owner,context);
		buf.push('*');
	}
	return buf;
}
function _addKeyList(map,key,value){
	var list = key in map? map[key]: (map[key] = []);
	if(list.indexOf(value) <0){
		list.push(value);
	}
	return list;
}
Expression.prototype.toString = function(context){
	return stringifyJSEL(this.token,context);
	//return JSON.stringify(this.token);
}
Expression.evaluate = evaluate;
/**
 * 表达式单步解析函数实现
 */
function evaluate(context,el){
     var result = _evaluate(el,context)
     return realValue(result);
}


function _evaluate(item,context){
    var type = item[0];
    switch(type){
    case VALUE_LIST:
        return [];
    case VALUE_MAP:
        return {};
    case VALUE_VAR:
        arg1 = item[1]
        return (arg1 in context?context:this)[arg1];
    case VALUE_CONSTANTS:
    	arg1 = item[1];
        return arg1&&arg1['class'] == 'RegExp'?window.eval(arg1.literal):arg1;
    ///* and or */
    case OP_AND:
        return realValue(_evaluate(item[1],context)) && (_evaluate(item[2],context));
    case OP_OR:
        return realValue(_evaluate(item[1],context)) || (_evaluate(item[2],context));
    case OP_QUESTION://// a?b:c -> a?:bc -- >a?b:c
        if(realValue(_evaluate(item[1],context))){
            return _evaluate(item[2],context);
        }else{
            return PropertyValue;//use as flag
        }
    case OP_QUESTION_SELECT:
    	arg1 = realValue(_evaluate(item[1],context));
        if(arg1 == PropertyValue){//use as flag
            return _evaluate(item[2],context);
        }else{
            return arg1;
        }
    }
    var arg1=_evaluate(item[1],context);
    if(getTokenParamIndex(type) ==3){
        var arg2=realValue(_evaluate(item[2],context));
    }
    if(type == OP_INVOKE){
    	if(typeof arg1 == 'function'){
            return arg1.apply(context,arg2);
    	}else if(arg1 instanceof PropertyValue){
    		var thiz = arg1[0];
    		var key = arg1[1];
    		var fn = thiz[key];
    		//bugfix replace(RegExp
    		if(fn == String.prototype.replace || fn == String.prototype.match){
    			arg2 = arg2.slice(0);
    			var exp = arg2[0];
    			if(exp && exp['class'] == 'RegExp'){
    				arg2[0] = window.eval(exp.source)
    			}
    			
    		}
            return fn.apply(thiz,arg2);
    	}else{
    		throw new Error("not a fn!!"+arg1)
    	}
    }
    arg1 = realValue(arg1);
    switch(type){
    //op
//    case OP_GET_STATIC_PROP:
//        arg2 =getTokenParam(item);
    case OP_GET:
        return new PropertyValue(arg1,arg2);
    case OP_NOT:
        return !arg1;
    case OP_POS:
        return +arg1;
    case OP_NEG:
        return -arg1;
        ///* +-*%/ */
    case OP_ADD:
        return arg1+arg2;
    case OP_SUB:
        return arg1-arg2;
    case OP_MUL:
        return arg1*arg2;
    case OP_DIV:
        return arg1/arg2;
    case OP_MOD:
        return arg1%arg2;
        ///* boolean */
    case OP_GT:
        return arg1 > arg2;
    case OP_GTEQ:
        return arg1 >= arg2;
    case OP_NE:
        return arg1 != arg2;
    case OP_NE_STRICT:
        return arg1 !== arg2;
    case OP_EQ:
        return arg1 == arg2;
    case OP_EQ_STRICT:
        return arg1 === arg2;
        
    case OP_LT:
        return arg1 < arg2;
    case OP_LTEQ:
        return arg1 <= arg2;
    case OP_IN:
        return arg1 in arg2;


    case OP_JOIN:
        arg1.push(arg2)
        return arg1;
    case OP_PUT:
        arg1[getTokenParam(item)]= arg2;
        return arg1;
    }
}

function PropertyValue(base,name){
    this[0] = base;
    this[1] = name;
}
function realValue(arg1){
    if(arg1 instanceof PropertyValue){
        return arg1[0][arg1[1]];
    }
    return arg1;
}


if(typeof require == 'function'){
exports.Expression=Expression;
var stringifyJSEL = require(28).stringifyJSEL
var ExpressionTokenizer=require(29).ExpressionTokenizer;
var getTokenParam=require(30).getTokenParam;
var getTokenParamIndex=require(30).getTokenParamIndex;
var OP_ADD=require(30).OP_ADD;
var OP_AND=require(30).OP_AND;
var OP_DIV=require(30).OP_DIV;
var OP_EQ=require(30).OP_EQ;
var OP_EQ_STRICT=require(30).OP_EQ_STRICT;
var OP_GET=require(30).OP_GET;
var OP_GT=require(30).OP_GT;
var OP_GTEQ=require(30).OP_GTEQ;
var OP_IN=require(30).OP_IN;
var OP_INVOKE=require(30).OP_INVOKE;
var OP_JOIN=require(30).OP_JOIN;
var OP_LT=require(30).OP_LT;
var OP_LTEQ=require(30).OP_LTEQ;
var OP_MOD=require(30).OP_MOD;
var OP_MUL=require(30).OP_MUL;
var OP_NE=require(30).OP_NE;
var OP_NEG=require(30).OP_NEG;
var OP_NE_STRICT=require(30).OP_NE_STRICT;
var OP_NOT=require(30).OP_NOT;
var OP_OR=require(30).OP_OR;
var OP_POS=require(30).OP_POS;
var OP_PUT=require(30).OP_PUT;
var OP_QUESTION=require(30).OP_QUESTION;
var OP_QUESTION_SELECT=require(30).OP_QUESTION_SELECT;
var OP_SUB=require(30).OP_SUB;
var VALUE_CONSTANTS=require(30).VALUE_CONSTANTS;
var VALUE_LIST=require(30).VALUE_LIST;
var VALUE_MAP=require(30).VALUE_MAP;
var VALUE_VAR=require(30).VALUE_VAR;
}
}
,
function(exports,require){if(typeof require == 'function'){
var JSONTokenizer=require(39).JSONTokenizer;
}/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

//编译期间标记，compile time object
var BRACKET_BEGIN = 0xFFFE;//([{;
var BRACKET_END = 0xFFFF;//)]};

var STATUS_BEGIN = -100;
var STATUS_EXPRESSION = -101;
var STATUS_OPERATOR = -102;
var fns = {
	getResult :function() {
		return this.expression;
		//return optimizeEL(this.expression);//.slice(0).reverse();// reversed
	},

	parseEL :function() {
		this.skipSpace(0);
		while (this.start < this.end) {
			var c = this.value.charAt(this.start);
			if (c == '"' || c == '\'') {
				var text = this.findString();
				this.addKeyOrObject(text, false);
			} else if (c >= '0' && c <= '9') {
				var number = this.findNumber();
				this.addKeyOrObject(number, false);
			} else if (/[\w$_]/.test(c)) {
				var id = this.findId();
				switch(id){
				    case 'true':
				        this.addToken([VALUE_CONSTANTS,true]);
				        break;
				    case 'false':
				        this.addToken([VALUE_CONSTANTS,false]);
				        break;
				    case 'null':
				        this.addToken([VALUE_CONSTANTS,null]);
				        break;
//				    case 'in':
//				        this.addToken([OP_IN,null]);
//				        break;
				    default:
    				    this.skipSpace(0);
    					if (this.previousType == OP_GET) {
    						this.addToken([VALUE_CONSTANTS,
    								id]);
    					} else {
    						this.addKeyOrObject(id, true);
    					}
				}
			} else {
				var op = this.findOperator();
				// if (this.value.startsWith(op, this.start))
				this.parseOperator(op);
				if (op == null) {
					this.parseError("未知操作符:");
				}
			}
			this.skipSpace(0);
		}
	},
	parseError:function(msg){
	    msg = msg+"\n@"+ this.start + "\n"
				+ this.value.substring(this.start)+"\n----\n"+this.value
		console.error(msg);
		throw new Error(msg);
	},
	findOperator :function() {// optimize json ,:[{}]
		var c = this.value.charAt(this.start);
		var end = this.start+1;
		var next = this.value.charAt(end);
		switch (c) {
		case ',':// optimize for json
		case ':':// 3op,map key
		case '[':// list
		case ']':
		case '{':// map
		case '}':
		case '(':// quote
		case ')':
		case '.':// prop
		case '?':// 3op
		case '~':
		case '^':
			break;
		case '+':// 5op
		case '-':
		case '*':
		case '/':
		case '%':
			if(next == '=' ){
				this.parseError("不支持赋值操作:");
			}else if(next == c){
				this.parseError("不支持自增自减操作:");
			}
			break;
		case '=':// ==
			if(next == '='){
				end++;
				if(this.value.charAt(end) == '='){
					end++;
				}
			}else{
				this.parseError("不支持赋值操作:");
			}
			break;
		case '!':// !,!=
			if(next == '='){
				end++;
				if(this.value.charAt(end) == '='){
					end++;
				}
			}
			break;
		case '>':// >,>=
		case '<':// <,<=
			if (next == '=') {
				end++;
			}else if(next == c){
				if(this.value.charAt(end) == c){
					end++;
				}
			}
			break;
		case '&':// && / &
		case '|':// || /|
			if( (c == next)){
				end++;
			}
			break;
		default:
			return null;
		}
		return this.value.substring(this.start, this.start = end);
	},

	/**
	 * 碰見:和,的時候，就需要檢查是否事map的間隔符號了
	 * 
	 * @return
	 */
	isMapMethod :function() {
		var i = this.tokens.length - 1;
		var depth = 0;
		for (; i >= 0; i--) {
			var token = this.tokens[i];
			var type = token[0];
			if (depth == 0) {
				if (type == OP_PUT
						|| type == VALUE_MAP) {// (
					// <#newMap>
					// <#push>
					return true;
				} else if (type == OP_JOIN) {// (
					// <#newList>
					// <#param_join>
					return false;
				}
			}
			if (type == BRACKET_BEGIN) {
				depth--;
			} else if (type == BRACKET_END) {
				depth++;
			}
		}
		return false;
	},

	parseOperator :function(op) {
		if (op.length == 1) {
			switch (op.charAt(0)) {
			case '(':
				if (this.status == STATUS_EXPRESSION) {
					this.addToken([OP_INVOKE]);
					if (this.skipSpace(')')) {
						this.addToken([VALUE_CONSTANTS,
								[]]);
						this.start++;
					} else {
						this.addList();
					}

				} else {
					this.addToken([BRACKET_BEGIN]);
				}
				break;
			case '[':
				if (this.status == STATUS_EXPRESSION) {// getProperty
					this.addToken([OP_GET]);
					this.addToken([BRACKET_BEGIN]);
				}else {// list
					this.addList();
				}
				break;
			case '{':
				this.addMap();
				break;
			case '}':
			case ']':
			case ')':
				this.addToken([BRACKET_END]);
				break;
			case '+'://
				this.addToken([
						this.status == STATUS_EXPRESSION ? OP_ADD : OP_POS]);
				break;
			case '-':
				this.addToken([
						this.status == STATUS_EXPRESSION ? OP_SUB
								: OP_NEG]);
				break;
			case ':':
				this.addToken([OP_QUESTION_SELECT]);// map : is skipped
				break;
			case ',':// :(object_setter is skiped,',' should
				// be skip)
				if (this.isMapMethod()) {
					
					this.status = STATUS_OPERATOR;
				}else{
					this.addToken([OP_JOIN]);

				}
				break;
			case '/':
				var next = this.value.charAt(this.start);
				if (next == '/') {
					var end1 = this.value.indexOf('\n', this.start);
					var end2 = this.value.indexOf('\r', this.start);
					var cend = Math.min(end1, end2);
					if (cend < 0) {
						cend = Math.max(end1, end2);
					}
					if (cend > 0) {
						this.start = cend;
					} else {
						this.start = this.end;
					}
					break;
				} else if (next == '*') {
					var cend = this.value.indexOf("*/", this.start);
					if (cend > 0) {
						this.start = cend + 2;
					} else {
						throw new Error("未結束注釋:" + this.value
								+ "@" + this.start);
					}
					break;
				}else if(this.status != STATUS_EXPRESSION){
					var end = findRegExp(this.value,this.start);
					if(end>0){
						this.addToken([VALUE_CONSTANTS,
							toValue(
								this.value.substring(this.start-1,end))]);
						this.start = end;
						break;
					}else{
						throw new Error("异常正则:"+this.value+'@'+this.start)
					}
				//}else{
				//	this.addToken([findTokenType(op)]);// /
				}
			default:
				this.addToken([findTokenType(op)]);
			}
		} else {
			this.addToken([findTokenType(op)]);
		}
	},

	addToken :function(token) {
		var type= token[0];
		if(type == VALUE_VAR){
			if("in" == token[1]){
				token[0] = type = OP_IN;
			}
		}
		
		switch (type) {
		case BRACKET_BEGIN:
			this.status = STATUS_BEGIN;
			break;
		case VALUE_CONSTANTS:
		case VALUE_VAR:
		case BRACKET_END:
			this.status = STATUS_EXPRESSION;
			break;
		default:
			this.status = STATUS_OPERATOR;
			break;
		}
		// previousType2 = this.previousType;
		this.previousType = type;
		this.tokens.push(token);
	},

	addKeyOrObject :function(object, isVar) {
		if (this.skipSpace(':') && this.isMapMethod()) {// object key
			this.addToken([OP_PUT, object]);
			this.start++;// skip :
		} else if (isVar) {
			this.addToken([VALUE_VAR, object]);
		} else {
			this.addToken([VALUE_CONSTANTS, object]);
		}
	},

	addList :function() {
		this.addToken([BRACKET_BEGIN]);
		this.addToken([VALUE_LIST]);
		if (!this.skipSpace(']')) {
			this.addToken([OP_JOIN]);
		}
	},

	addMap :function() {
		this.addToken([BRACKET_BEGIN]);
		this.addToken([VALUE_MAP]);
	}
};
var pt = new JSONTokenizer('');
for(var n in fns){
    pt[n] = fns[n]
}
function toValue(s){
    var v= this.eval(s);
    if(v instanceof RegExp){
    	v = {
            "class":"RegExp",
    		'literal':s+''
    	}
    }
    return v;
}
function findRegExp(text,start){
	var depth=0,c;
	while(c = text.charAt(start++)){
	    if(c=='['){
	    	depth = 1;
	    }else if(c==']'){
	    	depth = 0;
	    }else if (c == '\\') {
	        start++;
	    }else if(depth == 0 && c == '/'){
	    	while(c = text.charAt(start++)){
	    		switch(c){
	    			case 'g':
	    			case 'i':
	    			case 'm':
	    			break;
	    			default:
	    			return start-1;
	    		}
	    	}
	    	
	    }
	}
}
/**
 * 表达式解析器，将JS表达式文本解析成JSON中间代码
 */
function ExpressionTokenizer(value){
    this.value = value.replace(/^\s+|\s+$/g,'');
	this.start = 0;
	this.end = this.value.length;
    this.status = STATUS_BEGIN;
	this.previousType = STATUS_BEGIN;
	this.tokens = [];
	this.parseEL();
	prepareSelect(this.tokens)
	this.expression = buildTree(trimToken(right(this.tokens)));
}

function prepareSelect(tokens) {
	var p1 = tokens.length;
	while (p1--) {
		var type1 = tokens[p1][0];
		if (type1 == OP_QUESTION) { // (a?b
			var pos = getSelectRange(tokens,p1, -1, -1);
			tokens.splice(pos+1,0, [BRACKET_BEGIN]);
			p1++;
		} else if (type1 == OP_QUESTION_SELECT) {
			var end = tokens.length;
			var pos = getSelectRange(tokens,p1, 1, end);
			tokens.splice(pos,0, [BRACKET_END]);
		}
	}
}
function getSelectRange(tokens,p2, inc, end) {
	var dep = 0;
	while ((p2 += inc) != end) {
		var type2 = tokens[p2][0];
		if (type2 > 0) {// op
			if (type2 == BRACKET_BEGIN) {
				dep += inc;
			} else if (type2 == BRACKET_END) {
				dep -= inc;
			} else if (dep == 0 && getPriority(type2) <= getPriority(OP_QUESTION)) {
				return p2;
			}
			if (dep < 0) {
				return p2;
			}
		}
	}
	return inc > 0 ? end : -1;
}
function buildTree(tokens){
	var stack = [];
    for(var i=0;i<tokens.length;i++){
        var item = tokens[i]
        var type = item[0];
        switch(type){
            case VALUE_CONSTANTS:
            case VALUE_VAR:
            case VALUE_LIST:
            case VALUE_MAP:
                stack.push(item);
                break;
            default://OP
                if(getTokenParamIndex(type) ==3){//两个操作数
                    var arg2 = stack.pop();
                    var arg1 = stack.pop();
                    var el = [type,arg1,arg2]
                }else{//一个操作树
                	var arg1 = stack.pop();
                	var el = [type,arg1]
                }
                if(hasTokenParam(type)){
					el[getTokenParamIndex(type)] = item[1];
                }
                stack.push(el)
        }
    }
    return stack[0];
}
ExpressionTokenizer.prototype = pt;



// 将中序表达式转换为右序表达式
function right(tokens) {
	var rightStack = [[]];
	var buffer = [];

	for (var i = 0;i<tokens.length;i++) {
		var item = tokens[i];
		if (item[0] > 0) {
			if (buffer.length == 0) {
				buffer.push(item);
			} else if (item[0] == BRACKET_BEGIN) {// ("(")
				buffer.push(item);
			} else if (item[0] == BRACKET_END) {// .equals(")"))
				while (true) {
					var operator = buffer.pop();
					if (operator[0] == BRACKET_BEGIN) {
						break;
					}
					addRightToken(rightStack, operator);
				}
			} else {
				while (buffer.length!=0
						&& rightEnd(item[0], buffer[buffer.length-1][0])) {
					var operator = buffer.pop();
					// if (operator[0] !=
					// BRACKET_BEGIN){
					addRightToken(rightStack, operator);
				}
				buffer.push(item);
			}
		} else {
			addRightToken(rightStack, item);
		}
	}
	while (buffer.length !=0) {
		var operator = buffer.pop();
		addRightToken(rightStack, operator);
	}
	return rightStack[rightStack.length-1];
}
function trimToken(tokens){
	for(var i=0;i<tokens.length;i++){
		var token = tokens[i];
		token.length = getTokenLength(token[0]);
	}
	return tokens;
}

function addRightToken(rightStack,
		token) {
	var list = rightStack[rightStack.length-1];
//	if (token[0] == OP_GET) {
//	    var last = list.length-1;
//	    if(last>=0){
//	        var previous = list[last];
//	        if(previous[0] == VALUE_CONSTANTS){
//	            list.length--;
//	            token = [OP_GET_STATIC_PROP,previous[1]]; 
//	        }
//	    }
//	}
	list.push(token);
}

function getPriority(type) {
	switch (type) {
	case BRACKET_BEGIN:
	case BRACKET_END:
		return Math.MIN_VALUE;
	default:
		return (type & BIT_PRIORITY)<<4 | (type & BIT_PRIORITY_SUB)>>8;
	}
}
/**
 */
function rightEnd(currentType, priviousType) {
	var priviousPriority = getPriority(priviousType);
	var currentPriority = getPriority(currentType);
	return currentPriority <= priviousPriority;
}
if(typeof require == 'function'){
exports.getPriority=getPriority;
exports.ExpressionTokenizer=ExpressionTokenizer;
var hasTokenParam=require(30).hasTokenParam;
var getTokenParam=require(30).getTokenParam;
var hasTokenParam=require(30).hasTokenParam;
var getTokenParamIndex=require(30).getTokenParamIndex;
var getTokenLength=require(30).getTokenLength;
var findTokenType=require(30).findTokenType;
var BIT_PRIORITY=require(30).BIT_PRIORITY;
var BIT_PRIORITY_SUB=require(30).BIT_PRIORITY_SUB;
var OP_ADD=require(30).OP_ADD;
var OP_GET=require(30).OP_GET;
var OP_IN=require(30).OP_IN;
var OP_INVOKE=require(30).OP_INVOKE;
var OP_JOIN=require(30).OP_JOIN;
var OP_NE=require(30).OP_NE;
var OP_NEG=require(30).OP_NEG;
var OP_POS=require(30).OP_POS;
var OP_PUT=require(30).OP_PUT;
var OP_QUESTION=require(30).OP_QUESTION;
var OP_QUESTION_SELECT=require(30).OP_QUESTION_SELECT;
var OP_SUB=require(30).OP_SUB;
var VALUE_CONSTANTS=require(30).VALUE_CONSTANTS;
var VALUE_LIST=require(30).VALUE_LIST;
var VALUE_MAP=require(30).VALUE_MAP;
var VALUE_VAR=require(30).VALUE_VAR;
}
}
,
function(exports,require,module){console.log("read module err!!!nwmatcher/src/nwmatcher\nError: ENOENT: no such file or directory, open '/Users/jinjinyun/node_modules/nwmatcher/src/nwmatcher'")
}
,
function(exports,require){//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

function XMLReader(){
	
}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart+2,end);
				var config = parseStack.pop();
				if(end<0){
					
	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		//console.error('#@@@@@@'+tagName)
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				//console.error(parseStack.length,parseStack)
				//console.error(config);
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase()
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName );
					}
		        }else{
		        	parseStack.push(config)
		        }
				
				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;
				
				
				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					//}catch(e){console.error('@@@@@'+e)}
					domBuilder.locator = locator2
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
				}
				
				
				
				if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
				}else{
					end++;
				}
			}
		}catch(e){
			errorHandler.error('element parse error: '+e)
			//errorHandler.error('element parse error: '+e);
			end = -1;
			//throw e;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName');
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="')
					attrName = source.slice(start,p)
				}
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					el.add(attrName,value,start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				el.add(attrName,value,start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="');
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')")
			}
			break;
		case ''://end document
			//throw new Error('unexpected end of input')
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value.replace(/&#?\w+;/g,entityReplacer),start)
				}else{
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					}
					el.add(value,value,start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value,start)
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !attrName.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!')
					}
					el.add(attrName,attrName,start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={})
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/'
			domBuilder.startPrefixMapping(nsPrefix, value) 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || '']
				
				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix) 
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>')
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName)
		}
		closeMap[tagName] =pos
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n]}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA() 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = len>3 && /^public$/i.test(matchs[2][0]) && matchs[3][0]
			var sysid = len>4 && matchs[4][0];
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name,pubid && pubid.replace(/^(['"])(.*?)\1$/,'$2'),
					sysid && sysid.replace(/^(['"])(.*?)\1$/,'$2'));
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

/**
 * @param source
 */
function ElementAttributes(source){
	
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	add:function(qName,value,offset){
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}




function _set_proto_(thiz,parent){
	thiz.__proto__ = parent;
	return thiz;
}
if(!(_set_proto_({},_set_proto_.prototype) instanceof _set_proto_)){
	_set_proto_ = function(thiz,parent){
		function p(){};
		p.prototype = parent;
		p = new p();
		for(parent in thiz){
			p[parent] = thiz[parent];
		}
		return p;
	}
}

function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

exports.XMLReader = XMLReader;


}
,
function(exports,require){/*
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 */

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(Object.create){
		var ppt = Object.create(Super.prototype)
		pt.__proto__ = ppt;
	}
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class)
		}
		pt.constructor = Class
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml' ;
// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);


function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
};

DOMImplementation.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else{
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else{
		parentNode.firstChild = next
	}
	if(next){
		next.previousSibling = previous;
	}else{
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else{
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else{
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else{
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
}
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9?this.documentElement:this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			]
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}
function needNamespaceDefine(node,isHTML, visibleNamespaces) {
	var prefix = node.prefix,uri = node.namespaceURI;
	if (!prefix && !uri){
		return false;
	}
	if (prefix === "xml" && uri === "http://www.w3.org/XML/1998/namespace" 
		|| uri == 'http://www.w3.org/2000/xmlns/'){
		return false;
	}
	
	var i = visibleNamespaces.length 
	//console.log('@@@@',node.tagName,prefix,uri,visibleNamespaces)
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		//console.log(node.nodeType,node.tagName,ns.prefix,prefix)
		if (ns.prefix == prefix){
			return ns.namespace != uri;
		}
	}
	//console.log(isHTML,uri,prefix=='')
	//if(isHTML && prefix ==null && uri == 'http://www.w3.org/1999/xhtml'){
	//	return false;
	//}
	//node.flag = '11111'
	//console.error(3,true,node.flag,node.prefix,node.namespaceURI)
	return true;
}
function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}
	switch(node.nodeType){
	case ELEMENT_NODE:
		if (!visibleNamespaces) visibleNamespaces = [];
		var startVisibleNamespaces = visibleNamespaces.length;
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML =  (htmlns === node.namespaceURI) ||isHTML 
		buf.push('<',nodeName);
		
		
		
		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}
		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				buf.push(attr.prefix ? ' xmlns:' + attr.prefix : " xmlns", "='" , attr.namespaceURI , "'");
				visibleNamespaces.push({ prefix: attr.prefix, namespace: attr.namespaceURI });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}
		// add namespace for current node		
		if (needNamespaceDefine(node,isHTML, visibleNamespaces)) {
			buf.push(node.prefix ? ' xmlns:' + node.prefix : " xmlns", "='" , node.namespaceURI , "'");
			visibleNamespaces.push({ prefix: node.prefix, namespace: node.namespaceURI });
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return buf.push(' ',node.name,'="',node.value.replace(/[<&"]/g,_xmlEncoder),'"');
	case TEXT_NODE:
		return buf.push(node.data.replace(/[<&]/g,_xmlEncoder));
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC "',pubid);
			if (sysid && sysid!='.') {
				buf.push( '" "',sysid);
			}
			buf.push('">');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM "',sysid,'">');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		})
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	exports.DOMImplementation = DOMImplementation;
	exports.XMLSerializer = XMLSerializer;
//}

}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

/**
 * 
 * @param text
 * @param elQuteBegin
 *            {的位置
 * @return }的位置
 */
function findELEnd(text, elQuteBegin) {
	elQuteBegin = elQuteBegin||0;
	var length = text.length;
	var next = elQuteBegin + 1;
	if (next >= length) {
		return -1;
	}
	var stringChar = 0;
	var depth = 0;
	do {
		var c = text.charAt(next);
		switch (c) {
		case '\\':
			next++;
			break;
		case '\'':
		case '"':
			if (stringChar == c) {
				stringChar = 0;
			} else if (stringChar == 0) {
				stringChar = c;
			}
			break;
		case '{':
		case '[':
		case '(':
			if (stringChar == 0) {
				depth++;
			}
			break;
		case '}':
		case ']':
		case ')':
			if (stringChar == 0) {
				depth--;
				if (depth < 0) {
					return next;
				}
			}
			break;
		case '/':// 如果是正则，需要跳过正则
			if (stringChar == 0) {
				var regExp = isRegExp(text, elQuteBegin, next);
				if (regExp) {
					var end = findRegExpEnd(text, next);
					if(end >0){
						next = end;
					}else{
						console.error("无效状态");
					}
				}
			}
		}
	} while (++next < length);
	return -1;
}

function isRegExp(text, elQuteBegin,
		regExpStart) {
	for (var i = regExpStart-1; i > elQuteBegin; i--) {
		var pc = text.charAt(i);
		if (!/\s/.test(pc)) {
			if (/[\w\$]/.test(pc)) {
				return false;// 有效id后，不可能是正则
			} else {
				switch (pc) {
				case ']':// 伪有效id后，不可能是正则
				case ')':
				case '}':
					return false;
					// case '{'
					// case '[':
					// case '(':
					// 伪开头，不可能是除号，是正则
					// isRegExp = true;
					// break;
					// +-*/ 非后缀运算符后，一定是正则，非运算符
				default:
					return true;
				}
			}
		}
	}
	// 开头出现时，是正则
	return true;
}
function findRegExpEnd( text, regExpStart) {
	var length = text.length;
	var depth = 0;
	for (regExpStart++; regExpStart < length; regExpStart++) {
		var rc = text.charAt(regExpStart);
		if (rc == '[') {
			depth = 1;
		} else if (rc == ']') {
			depth = 0;
		} else if (rc == '\\') {
			regExpStart++;
		} else if (depth == 0 && rc == '/') {
			while (regExpStart < length) {
				rc = text.charAt(regExpStart++);
				switch (rc) {
				case 'g':
				case 'i':
				case 'm':
					break;
				default:
					return regExpStart - 1;
				}
			}

		}
	}
	return -1;
}

function findLiteParamMap(value){
	var result = {};
	while(value){
		var match = value.match(/^\s*([\w\$\_]+|'[^']*'|"[^"]*")\s*(?:[\:=]\s*([\s\S]+))\s*$/);
		if(!match){
			throw console.error("非法参数信息",value);
			return null;
		}
		value =match[2];
		var key = match[1].replace(/^['"]|['"]$/g,'');
		var p = findStatementEnd(value);
		var statment = value.substring(0,p);
		
		result[key] = statment;
		value = value.substring(p+1);
	}
	return result;
}
/**
 * @private
 */
function findStatementEnd(text){
	var end = 0;
	do{
		var end1 = text.indexOf(',',end + 1);
		var end2 = text.indexOf(';',end + 1);
		if(end2>0 && end1>0){
			end = Math.min(end1 , end2);
		}else{
			end = Math.max(end1,end2);
		}
		if(end<=0){
			break;
		}
		var code = text.substring(0,end);
		try{
			new Function(code);
			return end;
		}catch(e){
			end = end+1
		}
	}while(end>=0)
	return text.length;
}
if(typeof require == 'function'){
exports.findLiteParamMap=findLiteParamMap;
exports.findELEnd=findELEnd;
}
}
,
function(exports,require){function compressJS(source){
	if(source.search(/^(?:\s|\/[*\/])/m)<0){
		return source;
	}
	var ps = partitionJavaScript(source);
	var result = [];
	for(var i =0;i<ps.length;i++){
		var item = ps[i];
		switch(item.charAt()){
		case '\'':
		case '\"':
			result.push(item);//string
			break;
		case '/':
			//skip comment && reserve condition comment and regexp
			var stat = item.match(/^\/(?:(\*\s*@)|\/|\*)/);
			if(!stat || stat[1]){
				result.push(item);//regexp or condition comment
			}
			break;
			
		default:
			//result.push(item.replace(/^[ \t]+/gm,''));//被切开的语法块，前置换行，可能上上一个语法的结束语法，不能删除
			result.push(item.replace(/^[\t ]+|([\r\n])\s+/g,'$1'));
		}
	}
	return result.join('');
}
try{
	var parseLite = require(40).parseLite;
}catch(e){}
/**
 * 如何token
 * 如何补全; 能不补全就不补全
 */
function partitionJavaScript(source){
	var regexp = /'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|\/\/.*|\/\*([^*]+|\*[^\/])*\*\/|[\/<]/;
	var m,result = [],concatable=false;//not comment string regexp
	regexp.lastIndex = 0;
	while(m = regexp.exec(source)){
		if(m){
			var index = m.index;
			var m = m[0];
			var xml = m == '<'
			if(m == '/' || xml){
				var subsource = (xml ?findXML:findExp)(result,source.substring(index));
				if(subsource){
					m = subsource;
					if(xml){
						ex = 'new XML("'+subsource.replace(/["\r\n]/g,jsReplace)+'")'
					}
					concatable = false;
					//TODO: 内置 lite xml
					var pre = result[result.length-1];
					var tail = source.substring(m.length+index);
					var preReg =  /\bparseLite\s*\(\s*$/;
					var tailReg = /^\s*\)/;
					if(xml && parseLite &&pre.test(preReg) && tailReg.test(tail) ){
						result.pop();
						subsource = parseLite(subsource);
						source = tail.replace(tailReg,'');
						continue;
					}else{
						result.push(source.substring(0,index),subsource);
					}
				}else{
					if(concatable){
						result[result.length-1]+=source.substring(0,index+1)
					}else{
						result.push(source.substring(0,index+1))
					}
					concatable = true;
				}
			}else{
				result.push(source.substring(0,index),m);
				concatable  = false;
			}
			source = source.substring(m.length+index);
		}else{
			break;
		}
	}
	result.push(source);
	return result;
}
/**
 * 
运算符 ‘/’ 优先考虑
var i=0;		
if(i)alert(1)//...
/alert(2)/i
=> var i=0;if(i){alert(1)/alert(2)/i}
忽略 CDATA/textarea

 */
function findXML(result,source){
	var tag = source.match(/^<([a-zA-Z_][\w_\-\.]*(?:\:[\w_\-\.]+)?)(?:\s*[\/>]|\s+[\w_])/);
	if(tag){
		tag = tag[1];
		tag = tag.replace(/\.\-/g,'\\$&');
		var reg = new RegExp('<(/)?'+tag,'g');
		var depth = 0;
		reg.lastIndex = 0;
		while(tag = reg.exec(source)){
			if(tag[1]){
				if(--depth == 0){
					return source.substring(0,tag.index+tag[0].length+1)
				}else if(depth<0){
					return null;
				}
			}else{
				depth++;
			}
		}
	}else{
		return null;
	}
}
function jsReplace(c){
	switch(c){
		case '\r':
			return '\\r';
		case '\n':
			return '\\n';
		case '"':
			return '\\"';
		
	}
}
/**
 * 
 * ''/b/ // a
 * /xxx\///2; /**\/ //b=2; 
 *
 */
function findExp(result,source){
	var i = result.length;
	while(i--){
		var line = result[i];
		if(!/^\/[\/*]|^\s+$/.test(line)){//ignore common or space
			line = line.replace(/\s+$/,'');
			if(/^['"]|^\/.+\/$/.test(line)){
				break;
			}
			if(/^(?:\b(?:new|instanceof|typeof)|[^\w_$\]})])$/.test(line)){
				//a /b 1.1/b (1+2)/b a++ /2
				break;
			}else{
				// if(this.status != STATUS_EXPRESSION)
				// is op / start
				return findExpSource(source);
			}
		}
	}
}

function findExpSource(text){
	var depth=0,c,start = 1;
	while(c = text.charAt(start++)){
		if(c =='\n' || c == '\r'){
			return;
		}
	    if(c=='['){
	    	depth = 1;
	    }else if(c==']'){
	    	depth = 0;
	    }else if (c == '\\') {
	        start++;
	    }else if(depth == 0 && c == '/'){
	    	while(c = text.charAt(start++)){
	    		switch(c){
	    			case 'g':
	    			case 'i':
	    			case 'm':
	    			break;
	    			default:
	    			//console.error(text.substring(0,start-1)+'@',text)
	    			return text.substring(0,start-1);
	    		}
	    	}
	    	
	    }
	}
}
if(typeof require == 'function'){
exports.partitionJavaScript=partitionJavaScript;
exports.compressJS=compressJS;
}
}
,
function(exports,require,module){/*
 * Copyright (C) 2007-2015 Diego Perini
 * All rights reserved.
 *
 * nwmatcher.js - A fast CSS selector engine and matcher
 *
 * Author: Diego Perini <diego.perini at gmail com>
 * Version: 1.3.6
 * Created: 20070722
 * Release: 20150710
 *
 * License:
 *  http://javascript.nwbox.com/NWMatcher/MIT-LICENSE
 * Download:
 *  http://javascript.nwbox.com/NWMatcher/nwmatcher.js
 */

(function(global, factory) {

  if (typeof module == 'object' && typeof exports == 'object') {
    // in a Node.js environment, the nwmatcher functions will operate on
    // the passed "browserGlobal" and will be returned in an object
    module.exports = function (browserGlobal) {
      // passed global does not contain
      // references to native objects
      browserGlobal.console = console;
      browserGlobal.parseInt = parseInt;
      browserGlobal.Function = Function;
      browserGlobal.Boolean = Boolean;
      browserGlobal.Number = Number;
      browserGlobal.RegExp = RegExp;
      browserGlobal.String = String;
      browserGlobal.Object = Object;
      browserGlobal.Array = Array;
      browserGlobal.Error = Error;
      browserGlobal.Date = Date;
      browserGlobal.Math = Math;
      var exports = browserGlobal.Object();
      factory(browserGlobal, exports);
      return exports;
    };
    module.factory = factory;
  } else {
    // in a browser environment, the nwmatcher functions will operate on
    // the "global" loading them and be attached to "global.NW.Dom"
    factory(global,
      (global.NW || (global.NW = global.Object())) &&
      (global.NW.Dom || (global.NW.Dom = global.Object())));
    global.NW.Dom.factory = factory;
  }

})(this, function(global, exports) {

  var version = 'nwmatcher-1.3.6',

  Dom = exports,

  // processing context & root element
  doc = global.document,
  root = doc.documentElement,

  // save utility methods references
  slice = global.Array.prototype.slice,
  string = global.Object.prototype.toString,

  // persist previous parsed data
  isSingleMatch,
  isSingleSelect,

  lastSlice,
  lastContext,
  lastPosition,

  lastMatcher,
  lastSelector,

  lastPartsMatch,
  lastPartsSelect,

  // accepted prefix identifiers
  // (id, class & pseudo-class)
  prefixes = '[#.:]?',

  // accepted attribute operators
  operators = '([~*^$|!]?={1})',

  // accepted whitespace characters
  whitespace = '[\\x20\\t\\n\\r\\f]*',

  // 4 combinators F E, F>E, F+E, F~E
  combinators = '[\\x20]|[>+~][^>+~]',

  // an+b format params for pseudo-classes
  pseudoparms = '(?:[-+]?\\d*n)?[-+]?\\d*',

  // CSS quoted string values
  quotedvalue = '"[^"\\\\]*(?:\\\\.[^"\\\\]*)*"' + "|'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'",

  // skip round brackets groups
  skipround = '\\([^()]+\\)|\\(.*\\)',
  // skip curly brackets groups
  skipcurly = '\\{[^{}]+\\}|\\{.*\\}',
  // skip square brackets groups
  skipsquare = '\\[[^[\\]]*\\]|\\[.*\\]',

  // skip [ ], ( ), { } brackets groups
  skipgroup = '\\[.*\\]|\\(.*\\)|\\{.*\\}',

  // http://www.w3.org/TR/css3-syntax/#characters
  // unicode/ISO 10646 characters 161 and higher
  // NOTE: Safari 2.0.x crashes with escaped (\\)
  // Unicode ranges in regular expressions so we
  // use a negated character range class instead
  encoding = '(?:[-\\w]|[^\\x00-\\xa0]|\\\\.)',

  // CSS identifier syntax
  identifier = '(?:-?[_a-zA-Z]{1}[-\\w]*|[^\\x00-\\xa0]+|\\\\.+)+',

  // build attribute string
  attrcheck = '(' + quotedvalue + '|' + identifier + ')',
  attributes = whitespace + '(' + encoding + '*:?' + encoding + '+)' +
    whitespace + '(?:' + operators + whitespace + attrcheck + ')?' + whitespace,
  attrmatcher = attributes.replace(attrcheck, '([\\x22\\x27]*)((?:\\\\?.)*?)\\3'),

  // build pseudoclass string
  pseudoclass = '((?:' +
    // an+b parameters or quoted string
    pseudoparms + '|' + quotedvalue + '|' +
    // id, class, pseudo-class selector
    prefixes + '|' + encoding + '+|' +
    // nested HTML attribute selector
    '\\[' + attributes + '\\]|' +
    // nested pseudo-class selector
    '\\(.+\\)|' + whitespace + '|' +
    // nested pseudos/separators
    ',)+)',

  // placeholder for extensions
  extensions = '.+',

  // CSS3: syntax scanner and
  // one pass validation only
  // using regular expression
  standardValidator =
    // discard start
    '(?=[\\x20\\t\\n\\r\\f]*[^>+~(){}<>])' +
    // open match group
    '(' +
    //universal selector
    '\\*' +
    // id/class/tag/pseudo-class identifier
    '|(?:' + prefixes + identifier + ')' +
    // combinator selector
    '|' + combinators +
    // HTML attribute selector
    '|\\[' + attributes + '\\]' +
    // pseudo-classes parameters
    '|\\(' + pseudoclass + '\\)' +
    // dom properties selector (extension)
    '|\\{' + extensions + '\\}' +
    // selector group separator (comma)
    '|(?:,|' + whitespace + ')' +
    // close match group
    ')+',

  // validator for complex selectors in ':not()' pseudo-classes
  extendedValidator = standardValidator.replace(pseudoclass, '.*'),

  // validator for standard selectors as default
  reValidator = new global.RegExp(standardValidator, 'g'),

  // whitespace is any combination of these 5 character [\x20\t\n\r\f]
  // http://www.w3.org/TR/css3-selectors/#selector-syntax
  reTrimSpaces = new global.RegExp('^' +
    whitespace + '|' + whitespace + '$', 'g'),

  // only allow simple selectors nested in ':not()' pseudo-classes
  reSimpleNot = new global.RegExp('^(' +
    '(?!:not)' +
    '(' + prefixes +
    '|' + identifier +
    '|\\([^()]*\\))+' +
    '|\\[' + attributes + '\\]' +
    ')$'),

  // split comma groups, exclude commas from
  // quotes '' "" and from brackets () [] {}
  reSplitGroup = new global.RegExp('(' +
    '[^,\\\\()[\\]]+' +
    '|' + skipsquare +
    '|' + skipround +
    '|' + skipcurly +
    '|\\\\.' +
    ')+', 'g'),

  // split last, right most, selector group token
  reSplitToken = new global.RegExp('(' +
    '\\[' + attributes + '\\]|' +
    '\\(' + pseudoclass + '\\)|' +
    '\\\\.|[^\\x20\\t\\r\\n\\f>+~])+', 'g'),

  // for in excess whitespace removal
  reWhiteSpace = /[\x20\t\n\r\f]+/g,

  reOptimizeSelector = new global.RegExp(identifier + '|^$'),

  /*----------------------------- FEATURE TESTING ----------------------------*/

  // detect native methods
  isNative = (function() {
    var re = / \w+\(/,
    isnative = String(Object.prototype.toString).replace(re, ' (');
    return function(method) {
      return method && typeof method != 'string' &&
        isnative == String(method).replace(re, ' (');
    };
  })(),

  // NATIVE_XXXXX true if method exist and is callable
  // detect if DOM methods are native in browsers
  NATIVE_FOCUS = isNative(doc.hasFocus),
  NATIVE_QSAPI = isNative(doc.querySelector),
  NATIVE_GEBID = isNative(doc.getElementById),
  NATIVE_GEBTN = isNative(root.getElementsByTagName),
  NATIVE_GEBCN = isNative(root.getElementsByClassName),

  // detect native getAttribute/hasAttribute methods,
  // frameworks extend these to elements, but it seems
  // this does not work for XML namespaced attributes,
  // used to check both getAttribute/hasAttribute in IE
  NATIVE_GET_ATTRIBUTE = isNative(root.getAttribute),
  NATIVE_HAS_ATTRIBUTE = isNative(root.hasAttribute),

  // check if slice() can convert nodelist to array
  // see http://yura.thinkweb2.com/cft/
  NATIVE_SLICE_PROTO =
    (function() {
      var isBuggy = false;
      try {
        isBuggy = !!slice.call(doc.childNodes, 0)[0];
      } catch(e) { }
      return isBuggy;
    })(),

  // supports the new traversal API
  NATIVE_TRAVERSAL_API =
    'nextElementSibling' in root && 'previousElementSibling' in root,

  // BUGGY_XXXXX true if method is feature tested and has known bugs
  // detect buggy gEBID
  BUGGY_GEBID = NATIVE_GEBID ?
    (function() {
      var isBuggy = true, x = 'x' + global.String(+new global.Date),
        a = doc.createElementNS ? 'a' : '<a name="' + x + '">';
      (a = doc.createElement(a)).name = x;
      root.insertBefore(a, root.firstChild);
      isBuggy = !!doc.getElementById(x);
      root.removeChild(a);
      return isBuggy;
    })() :
    true,

  // detect IE gEBTN comment nodes bug
  BUGGY_GEBTN = NATIVE_GEBTN ?
    (function() {
      var div = doc.createElement('div');
      div.appendChild(doc.createComment(''));
      return !!div.getElementsByTagName('*')[0];
    })() :
    true,

  // detect Opera gEBCN second class and/or UTF8 bugs as well as Safari 3.2
  // caching class name results and not detecting when changed,
  // tests are based on the jQuery selector test suite
  BUGGY_GEBCN = NATIVE_GEBCN ?
    (function() {
      var isBuggy, div = doc.createElement('div'), test = '\u53f0\u5317';

      // Opera tests
      div.appendChild(doc.createElement('span')).
        setAttribute('class', test + 'abc ' + test);
      div.appendChild(doc.createElement('span')).
        setAttribute('class', 'x');

      isBuggy = !div.getElementsByClassName(test)[0];

      // Safari test
      div.lastChild.className = test;
      return isBuggy || div.getElementsByClassName(test).length != 2;
    })() :
    true,

  // detect IE bug with dynamic attributes
  BUGGY_GET_ATTRIBUTE = NATIVE_GET_ATTRIBUTE ?
    (function() {
      var input = doc.createElement('input');
      input.setAttribute('value', 5);
      return input.defaultValue != 5;
    })() :
    true,

  // detect IE bug with non-standard boolean attributes
  BUGGY_HAS_ATTRIBUTE = NATIVE_HAS_ATTRIBUTE ?
    (function() {
      var option = doc.createElement('option');
      option.setAttribute('selected', 'selected');
      return !option.hasAttribute('selected');
    })() :
    true,

  // detect Safari bug with selected option elements
  BUGGY_SELECTED =
    (function() {
      var select = doc.createElement('select');
      select.appendChild(doc.createElement('option'));
      return !select.firstChild.selected;
    })(),

  // initialized with the loading context
  // and reset for each different context
  BUGGY_QUIRKS_GEBCN,
  BUGGY_QUIRKS_QSAPI,

  QUIRKS_MODE,
  XML_DOCUMENT,

  // detect Opera browser
  OPERA = /opera/i.test(string.call(global.opera)),

  // skip simple selector optimizations for Opera >= 11
  OPERA_QSAPI = OPERA && global.parseFloat(global.opera.version()) >= 11,

  // check Selector API implementations
  RE_BUGGY_QSAPI = NATIVE_QSAPI ?
    (function() {
      var pattern = new global.Array(), context, element,

      expect = function(selector, element, n) {
        var result = false;
        context.appendChild(element);
        try { result = context.querySelectorAll(selector).length == n; } catch(e) { }
        while (context.firstChild) { context.removeChild(context.firstChild); }
        return result;
      };

      // certain bugs can only be detected in standard documents
      // to avoid writing a live loading document create a fake one
      if (doc.implementation && doc.implementation.createDocument) {
        // use a shadow document body as context
        context = doc.implementation.createDocument('', '', null).
          appendChild(doc.createElement('html')).
          appendChild(doc.createElement('head')).parentNode.
          appendChild(doc.createElement('body'));
      } else {
        // use an unattached div node as context
        context = doc.createElement('div');
      }

      // fix for Safari 8.x and other engines that
      // fail querying filtered sibling combinators
      element = doc.createElement('div');
      element.innerHTML = '<p id="a"></p><br>';
      expect('p#a+*', element, 0) &&
        pattern.push('\\w+#\\w+.*[+~]');

      // ^= $= *= operators bugs with empty values (Opera 10 / IE8)
      element = doc.createElement('p');
      element.setAttribute('class', '');
      expect('[class^=""]', element, 1) &&
        pattern.push('[*^$]=[\\x20\\t\\n\\r\\f]*(?:""|' + "'')");

      // :checked bug with option elements (Firefox 3.6.x)
      // it wrongly includes 'selected' options elements
      // HTML5 rules says selected options also match
      element = doc.createElement('option');
      element.setAttribute('selected', 'selected');
      expect(':checked', element, 0) &&
        pattern.push(':checked');

      // :enabled :disabled bugs with hidden fields (Firefox 3.5)
      // http://www.w3.org/TR/html5/links.html#selector-enabled
      // http://www.w3.org/TR/css3-selectors/#enableddisabled
      // not supported by IE8 Query Selector
      element = doc.createElement('input');
      element.setAttribute('type', 'hidden');
      expect(':enabled', element, 0) &&
        pattern.push(':enabled', ':disabled');

      // :link bugs with hyperlinks matching (Firefox/Safari)
      element = doc.createElement('link');
      element.setAttribute('href', 'x');
      expect(':link', element, 1) ||
        pattern.push(':link');

      // avoid attribute selectors for IE QSA
      if (BUGGY_HAS_ATTRIBUTE) {
        // IE fails in reading:
        // - original values for input/textarea
        // - original boolean values for controls
        pattern.push('\\[[\\x20\\t\\n\\r\\f]*(?:checked|disabled|ismap|multiple|readonly|selected|value)');
      }

      return pattern.length ?
        new global.RegExp(pattern.join('|')) :
        { 'test': function() { return false; } };

    })() :
    true,

  // matches class selectors
  RE_CLASS = new global.RegExp('(?:\\[[\\x20\\t\\n\\r\\f]*class\\b|\\.' + identifier + ')'),

  // matches simple id, tag & class selectors
  RE_SIMPLE_SELECTOR = new global.RegExp(
    BUGGY_GEBTN && BUGGY_GEBCN || OPERA ?
      '^#?-?[_a-zA-Z]{1}' + encoding + '*$' : BUGGY_GEBTN ?
      '^[.#]?-?[_a-zA-Z]{1}' + encoding + '*$' : BUGGY_GEBCN ?
      '^(?:\\*|#-?[_a-zA-Z]{1}' + encoding + '*)$' :
      '^(?:\\*|[.#]?-?[_a-zA-Z]{1}' + encoding + '*)$'),

  /*----------------------------- LOOKUP OBJECTS -----------------------------*/

  LINK_NODES = new global.Object({ 'a': 1, 'A': 1, 'area': 1, 'AREA': 1, 'link': 1, 'LINK': 1 }),

  // boolean attributes should return attribute name instead of true/false
  ATTR_BOOLEAN = new global.Object({
    'checked': 1, 'disabled': 1, 'ismap': 1,
    'multiple': 1, 'readonly': 1, 'selected': 1
  }),

  // dynamic attributes that needs to be checked against original HTML value
  ATTR_DEFAULT = new global.Object({
    'value': 'defaultValue',
    'checked': 'defaultChecked',
    'selected': 'defaultSelected'
  }),

  // attributes referencing URI data values need special treatment in IE
  ATTR_URIDATA = new global.Object({
    'action': 2, 'cite': 2, 'codebase': 2, 'data': 2, 'href': 2,
    'longdesc': 2, 'lowsrc': 2, 'src': 2, 'usemap': 2
  }),

  // HTML 5 draft specifications
  // http://www.whatwg.org/specs/web-apps/current-work/#selectors
  HTML_TABLE = new global.Object({
    // class attribute must be treated case-insensitive in HTML quirks mode
    // initialized by default to Standard Mode (case-sensitive),
    // set dynamically by the attribute resolver
    'class': 0,
    'accept': 1, 'accept-charset': 1, 'align': 1, 'alink': 1, 'axis': 1,
    'bgcolor': 1, 'charset': 1, 'checked': 1, 'clear': 1, 'codetype': 1, 'color': 1,
    'compact': 1, 'declare': 1, 'defer': 1, 'dir': 1, 'direction': 1, 'disabled': 1,
    'enctype': 1, 'face': 1, 'frame': 1, 'hreflang': 1, 'http-equiv': 1, 'lang': 1,
    'language': 1, 'link': 1, 'media': 1, 'method': 1, 'multiple': 1, 'nohref': 1,
    'noresize': 1, 'noshade': 1, 'nowrap': 1, 'readonly': 1, 'rel': 1, 'rev': 1,
    'rules': 1, 'scope': 1, 'scrolling': 1, 'selected': 1, 'shape': 1, 'target': 1,
    'text': 1, 'type': 1, 'valign': 1, 'valuetype': 1, 'vlink': 1
  }),

  // the following attributes must be treated case-insensitive in XHTML mode
  // Niels Leenheer http://rakaz.nl/item/css_selector_bugs_case_sensitivity
  XHTML_TABLE = new global.Object({
    'accept': 1, 'accept-charset': 1, 'alink': 1, 'axis': 1,
    'bgcolor': 1, 'charset': 1, 'codetype': 1, 'color': 1,
    'enctype': 1, 'face': 1, 'hreflang': 1, 'http-equiv': 1,
    'lang': 1, 'language': 1, 'link': 1, 'media': 1, 'rel': 1,
    'rev': 1, 'target': 1, 'text': 1, 'type': 1, 'vlink': 1
  }),

  /*-------------------------- REGULAR EXPRESSIONS ---------------------------*/

  // placeholder to add functionalities
  Selectors = new global.Object({
    // as a simple example this will check
    // for chars not in standard ascii table
    //
    // 'mySpecialSelector': {
    //  'Expression': /\u0080-\uffff/,
    //  'Callback': mySelectorCallback
    // }
    //
    // 'mySelectorCallback' will be invoked
    // only after passing all other standard
    // checks and only if none of them worked
  }),

  // attribute operators
  Operators = new global.Object({
     '=': "n=='%m'",
    '^=': "n.indexOf('%m')==0",
    '*=': "n.indexOf('%m')>-1",
    '|=': "(n+'-').indexOf('%m-')==0",
    '~=': "(' '+n+' ').indexOf(' %m ')>-1",
    '$=': "n.substr(n.length-'%m'.length)=='%m'"
  }),

  // optimization expressions
  Optimize = new global.Object({
    ID: new global.RegExp('^\\*?#(' + encoding + '+)|' + skipgroup),
    TAG: new global.RegExp('^(' + encoding + '+)|' + skipgroup),
    CLASS: new global.RegExp('^\\*?\\.(' + encoding + '+$)|' + skipgroup)
  }),

  // precompiled Regular Expressions
  Patterns = new global.Object({
    // structural pseudo-classes and child selectors
    spseudos: /^\:(root|empty|(?:first|last|only)(?:-child|-of-type)|nth(?:-last)?(?:-child|-of-type)\(\s*(even|odd|(?:[-+]{0,1}\d*n\s*)?[-+]{0,1}\s*\d*)\s*\))?(.*)/i,
    // uistates + dynamic + negation pseudo-classes
    dpseudos: /^\:(link|visited|target|active|focus|hover|checked|disabled|enabled|selected|lang\(([-\w]{2,})\)|not\(([^()]*|.*)\))?(.*)/i,
    // element attribute matcher
    attribute: new global.RegExp('^\\[' + attrmatcher + '\\](.*)'),
    // E > F
    children: /^[\x20\t\n\r\f]*\>[\x20\t\n\r\f]*(.*)/,
    // E + F
    adjacent: /^[\x20\t\n\r\f]*\+[\x20\t\n\r\f]*(.*)/,
    // E ~ F
    relative: /^[\x20\t\n\r\f]*\~[\x20\t\n\r\f]*(.*)/,
    // E F
    ancestor: /^[\x20\t\n\r\f]+(.*)/,
    // all
    universal: /^\*(.*)/,
    // id
    id: new global.RegExp('^#(' + encoding + '+)(.*)'),
    // tag
    tagName: new global.RegExp('^(' + encoding + '+)(.*)'),
    // class
    className: new global.RegExp('^\\.(' + encoding + '+)(.*)')
  }),

  /*------------------------------ UTIL METHODS ------------------------------*/

  // concat elements to data
  concatList =
    function(data, elements) {
      var i = -1, element;
      if (!data.length && global.Array.slice)
        return global.Array.slice(elements);
      while ((element = elements[++i]))
        data[data.length] = element;
      return data;
    },

  // concat elements to data and callback
  concatCall =
    function(data, elements, callback) {
      var i = -1, element;
      while ((element = elements[++i])) {
        if (false === callback(data[data.length] = element)) { break; }
      }
      return data;
    },

  // change context specific variables
  switchContext =
    function(from, force) {
      var div, oldDoc = doc;
      // save passed context
      lastContext = from;
      // set new context document
      doc = from.ownerDocument || from;
      if (force || oldDoc !== doc) {
        // set document root
        root = doc.documentElement;
        // set host environment flags
        XML_DOCUMENT = doc.createElement('DiV').nodeName == 'DiV';

        // In quirks mode css class names are case insensitive.
        // In standards mode they are case sensitive. See docs:
        // https://developer.mozilla.org/en/Mozilla_Quirks_Mode_Behavior
        // http://www.whatwg.org/specs/web-apps/current-work/#selectors
        QUIRKS_MODE = !XML_DOCUMENT &&
          typeof doc.compatMode == 'string' ?
          doc.compatMode.indexOf('CSS') < 0 :
          (function() {
            var style = doc.createElement('div').style;
            return style && (style.width = 1) && style.width == '1px';
          })();

        div = doc.createElement('div');
        div.appendChild(doc.createElement('p')).setAttribute('class', 'xXx');
        div.appendChild(doc.createElement('p')).setAttribute('class', 'xxx');

        // GEBCN buggy in quirks mode, match count is:
        // Firefox 3.0+ [xxx = 1, xXx = 1]
        // Opera 10.63+ [xxx = 0, xXx = 2]
        BUGGY_QUIRKS_GEBCN =
          !XML_DOCUMENT && NATIVE_GEBCN && QUIRKS_MODE &&
          (div.getElementsByClassName('xxx').length != 2 ||
          div.getElementsByClassName('xXx').length != 2);

        // QSAPI buggy in quirks mode, match count is:
        // At least Chrome 4+, Firefox 3.5+, Opera 10.x+, Safari 4+ [xxx = 1, xXx = 2]
        // Safari 3.2 QSA doesn't work with mixedcase in quirksmode [xxx = 1, xXx = 0]
        // https://bugs.webkit.org/show_bug.cgi?id=19047
        // must test the attribute selector '[class~=xxx]'
        // before '.xXx' or the bug may not present itself
        BUGGY_QUIRKS_QSAPI =
          !XML_DOCUMENT && NATIVE_QSAPI && QUIRKS_MODE &&
          (div.querySelectorAll('[class~=xxx]').length != 2 ||
          div.querySelectorAll('.xXx').length != 2);

        Config.CACHING && Dom.setCache(true, doc);
      }
    },

  // convert a CSS string or identifier containing escape sequence to a
  // javascript string with javascript escape sequences
  convertEscapes =
    function(str) {
      return str.replace(/\\([0-9a-fA-F]{1,6}\x20?|.)|([\x22\x27])/g, function(substring, p1, p2) {
        var codePoint, highHex, highSurrogate, lowHex, lowSurrogate;

        if (p2) {
          // unescaped " or '
          return '\\' + p2;
        }

        if (/^[0-9a-fA-F]/.test(p1)) {
          // \1f23
          codePoint = parseInt(p1, 16);

          if (codePoint < 0 || codePoint > 0x10ffff) {
            // the replacement character
            return '\\ufffd';
          }

          // javascript strings are in UTF-16
          if (codePoint <= 0xffff) {
            // Basic
            lowHex = '000' + codePoint.toString(16);
            return '\\u' + lowHex.substr(lowHex.length - 4);
          }

          // Supplementary
          codePoint -= 0x10000;
          highSurrogate = (codePoint >> 10) + 0xd800;
          lowSurrogate = (codePoint % 0x400) + 0xdc00;
          highHex = '000' + highSurrogate.toString(16);
          lowHex = '000' + lowSurrogate.toString(16);

          return '\\u' + highHex.substr(highHex.length - 4) +
            '\\u' + lowHex.substr(lowHex.length - 4);
        }

        if (/^[\\\x22\x27]/.test(p1)) {
          // \' \"
          return substring;
        }

        // \g \h \. \# etc
        return p1;
      });
    },

  /*------------------------------ DOM METHODS -------------------------------*/

  // element by id (raw)
  // @return reference or null
  byIdRaw =
    function(id, elements) {
      var i = -1, element = null;
      while ((element = elements[++i])) {
        if (element.getAttribute('id') == id) {
          break;
        }
      }
      return element;
    },

  // element by id
  // @return reference or null
  _byId = !BUGGY_GEBID ?
    function(id, from) {
      id = id.replace(/\\([^\\]{1})/g, '$1');
      return from.getElementById && from.getElementById(id) ||
        byIdRaw(id, from.getElementsByTagName('*'));
    } :
    function(id, from) {
      var element = null;
      id = id.replace(/\\([^\\]{1})/g, '$1');
      if (XML_DOCUMENT || from.nodeType != 9) {
        return byIdRaw(id, from.getElementsByTagName('*'));
      }
      if ((element = from.getElementById(id)) &&
        element.name == id && from.getElementsByName) {
        return byIdRaw(id, from.getElementsByName(id));
      }
      return element;
    },

  // publicly exposed byId
  // @return reference or null
  byId =
    function(id, from) {
      from || (from = doc);
      if (lastContext !== from) { switchContext(from); }
      return _byId(id, from);
    },

  // elements by tag (raw)
  // @return array
  byTagRaw =
    function(tag, from) {
      var any = tag == '*', element = from, elements = new global.Array(), next = element.firstChild;
      any || (tag = tag.toUpperCase());
      while ((element = next)) {
        if (element.tagName > '@' && (any || element.tagName.toUpperCase() == tag)) {
          elements[elements.length] = element;
        }
        if ((next = element.firstChild || element.nextSibling)) continue;
        while (!next && (element = element.parentNode) && element !== from) {
          next = element.nextSibling;
        }
      }
      return elements;
    },

  // elements by tag
  // @return array
  _byTag = !BUGGY_GEBTN && NATIVE_SLICE_PROTO ?
    function(tag, from) {
      return XML_DOCUMENT || from.nodeType == 11 ? byTagRaw(tag, from) :
        slice.call(from.getElementsByTagName(tag), 0);
    } :
    function(tag, from) {
      var i = -1, j = i, data = new global.Array(),
        element, elements = from.getElementsByTagName(tag);
      if (tag == '*') {
        while ((element = elements[++i])) {
          if (element.nodeName > '@')
            data[++j] = element;
        }
      } else {
        while ((element = elements[++i])) {
          data[i] = element;
        }
      }
      return data;
    },

  // publicly exposed byTag
  // @return array
  byTag =
    function(tag, from) {
      from || (from = doc);
      if (lastContext !== from) { switchContext(from); }
      return _byTag(tag, from);
    },

  // publicly exposed byName
  // @return array
  byName =
    function(name, from) {
      return select('[name="' + name.replace(/\\([^\\]{1})/g, '$1') + '"]', from);
    },

  // elements by class (raw)
  // @return array
  byClassRaw =
    function(name, from) {
      var i = -1, j = i, data = new global.Array(), element, elements = _byTag('*', from), n;
      name = ' ' + (QUIRKS_MODE ? name.toLowerCase() : name).replace(/\\([^\\]{1})/g, '$1') + ' ';
      while ((element = elements[++i])) {
        n = XML_DOCUMENT ? element.getAttribute('class') : element.className;
        if (n && n.length && (' ' + (QUIRKS_MODE ? n.toLowerCase() : n).
          replace(reWhiteSpace, ' ') + ' ').indexOf(name) > -1) {
          data[++j] = element;
        }
      }
      return data;
    },

  // elements by class
  // @return array
  _byClass =
    function(name, from) {
      return (BUGGY_GEBCN || BUGGY_QUIRKS_GEBCN || XML_DOCUMENT || !from.getElementsByClassName) ?
        byClassRaw(name, from) : slice.call(from.getElementsByClassName(name.replace(/\\([^\\]{1})/g, '$1')), 0);
    },

  // publicly exposed byClass
  // @return array
  byClass =
    function(name, from) {
      from || (from = doc);
      if (lastContext !== from) { switchContext(from); }
      return _byClass(name, from);
    },

  // check element is descendant of container
  // @return boolean
  contains = 'compareDocumentPosition' in root ?
    function(container, element) {
      return (container.compareDocumentPosition(element) & 16) == 16;
    } : 'contains' in root ?
    function(container, element) {
      return container !== element && container.contains(element);
    } :
    function(container, element) {
      while ((element = element.parentNode)) {
        if (element === container) return true;
      }
      return false;
    },

  // attribute value
  // @return string
  getAttribute = !BUGGY_GET_ATTRIBUTE ?
    function(node, attribute) {
      return node.getAttribute(attribute);
    } :
    function(node, attribute) {
      attribute = attribute.toLowerCase();
      if (typeof node[attribute] == 'object') {
        return node.attributes[attribute] &&
          node.attributes[attribute].value;
      }
      return (
        // 'type' can only be read by using native getAttribute
        attribute == 'type' ? node.getAttribute(attribute) :
        // specific URI data attributes (parameter 2 to fix IE bug)
        ATTR_URIDATA[attribute] ? node.getAttribute(attribute, 2) :
        // boolean attributes should return name instead of true/false
        ATTR_BOOLEAN[attribute] ? node.getAttribute(attribute) ? attribute : 'false' :
          (node = node.getAttributeNode(attribute)) && node.value);
    },

  // attribute presence
  // @return boolean
  hasAttribute = !BUGGY_HAS_ATTRIBUTE ?
    function(node, attribute) {
      return XML_DOCUMENT ?
        !!node.getAttribute(attribute) :
        node.hasAttribute(attribute);
    } :
    function(node, attribute) {
      // read the node attribute object
      var obj = node.getAttributeNode(attribute = attribute.toLowerCase());
      return ATTR_DEFAULT[attribute] && attribute != 'value' ?
        node[ATTR_DEFAULT[attribute]] : obj && obj.specified;
    },

  // check node emptyness
  // @return boolean
  isEmpty =
    function(node) {
      node = node.firstChild;
      while (node) {
        if (node.nodeType == 3 || node.nodeName > '@') return false;
        node = node.nextSibling;
      }
      return true;
    },

  // check if element matches the :link pseudo
  // @return boolean
  isLink =
    function(element) {
      return hasAttribute(element,'href') && LINK_NODES[element.nodeName];
    },

  // child position by nodeType
  // @return number
  nthElement =
    function(element, last) {
      var count = 1, succ = last ? 'nextSibling' : 'previousSibling';
      while ((element = element[succ])) {
        if (element.nodeName > '@') ++count;
      }
      return count;
    },

  // child position by nodeName
  // @return number
  nthOfType =
    function(element, last) {
      var count = 1, succ = last ? 'nextSibling' : 'previousSibling', type = element.nodeName;
      while ((element = element[succ])) {
        if (element.nodeName == type) ++count;
      }
      return count;
    },

  /*------------------------------- DEBUGGING --------------------------------*/

  // get/set (string/object) working modes
  configure =
    function(option) {
      if (typeof option == 'string') { return Config[option] || Config; }
      if (typeof option != 'object') { return false; }
      for (var i in option) {
        Config[i] = !!option[i];
        if (i == 'SIMPLENOT') {
          matchContexts = new global.Object();
          matchResolvers = new global.Object();
          selectContexts = new global.Object();
          selectResolvers = new global.Object();
          if (!Config[i]) { Config['USE_QSAPI'] = false; }
        } else if (i == 'USE_QSAPI') {
          Config[i] = !!option[i] && NATIVE_QSAPI;
        }
      }
      reValidator = new global.RegExp(Config.SIMPLENOT ?
        standardValidator : extendedValidator, 'g');
      return true;
    },

  // control user notifications
  emit =
    function(message) {
      if (Config.VERBOSITY) { throw new global.Error(message); }
      if (global.console && global.console.log) {
        global.console.log(message);
      }
    },

  Config = new global.Object({

    // used to enable/disable caching of result sets
    CACHING: false,

    // by default do not add missing left/right context
    // to selector string shortcuts like "+div" or "ul>"
    // callable Dom.shortcuts method has to be available
    SHORTCUTS: false,

    // by default disable complex selectors nested in
    // ':not()' pseudo-classes, as for specifications
    SIMPLENOT: true,

    // strict QSA match all non-unique IDs (false)
    // speed & libs compat match unique ID (true)
    UNIQUE_ID: true,

    // HTML5 handling for the ":checked" pseudo-class
    USE_HTML5: true,

    // controls enabling the Query Selector API branch
    USE_QSAPI: NATIVE_QSAPI,

    // controls the engine error/warning notifications
    VERBOSITY: true

  }),

  /*---------------------------- COMPILER METHODS ----------------------------*/

  // code string reused to build compiled functions
  ACCEPT_NODE = 'r[r.length]=c[k];if(f&&false===f(c[k]))break main;else continue main;',

  // compile a comma separated group of selector
  // @mode boolean true for select, false for match
  // return a compiled function
  compile =
    function(selector, source, mode) {

      var parts = typeof selector == 'string' ? selector.match(reSplitGroup) : selector;

      // ensures that source is a string
      typeof source == 'string' || (source = '');

      if (parts.length == 1) {
        source += compileSelector(parts[0], mode ? ACCEPT_NODE : 'f&&f(k);return true;', mode);
      } else {
        // for each selector in the group
        var i = -1, seen = new global.Object(), token;
        while ((token = parts[++i])) {
          token = token.replace(reTrimSpaces, '');
          // avoid repeating the same token
          // in comma separated group (p, p)
          if (!seen[token] && (seen[token] = true)) {
            source += compileSelector(token, mode ? ACCEPT_NODE : 'f&&f(k);return true;', mode);
          }
        }
      }

      if (mode) {
        // for select method
        return new global.Function('c,s,r,d,h,g,f,v',
          'var N,n,x=0,k=-1,e;main:while((e=c[++k])){' + source + '}return r;');
      } else {
        // for match method
        return new global.Function('e,s,r,d,h,g,f,v',
          'var N,n,x=0,k=e;' + source + 'return false;');
      }
    },

  // allows to cache already visited nodes
  FILTER =
    'var z=v[@]||(v[@]=[]),l=z.length-1;' +
    'while(l>=0&&z[l]!==e)--l;' +
    'if(l!==-1){break;}' +
    'z[z.length]=e;',

  // compile a CSS3 string selector into ad-hoc javascript matching function
  // @return string (to be compiled)
  compileSelector =
    function(selector, source, mode) {

      var a, b, n, k = 0, expr, match, result, status, test, type;

      while (selector) {

        k++;

        // *** Universal selector
        // * match all (empty block, do not remove)
        if ((match = selector.match(Patterns.universal))) {
          // do nothing, handled in the compiler where
          // BUGGY_GEBTN return comment nodes (ex: IE)
          expr = '';
        }

        // *** ID selector
        // #Foo Id case sensitive
        else if ((match = selector.match(Patterns.id))) {
          // document can contain conflicting elements (id/name)
          // prototype selector unit need this method to recover bad HTML forms
          source = 'if(' + (XML_DOCUMENT ?
            's.getAttribute(e,"id")' :
            '(e.submit?s.getAttribute(e,"id"):e.id)') +
            '=="' + match[1] + '"' +
            '){' + source + '}';
        }

        // *** Type selector
        // Foo Tag (case insensitive)
        else if ((match = selector.match(Patterns.tagName))) {
          // both tagName and nodeName properties may be upper/lower case
          // depending on their creation NAMESPACE in createElementNS()
          source = 'if(e.nodeName' + (XML_DOCUMENT ?
            '=="' + match[1] + '"' : '.toUpperCase()' +
            '=="' + match[1].toUpperCase() + '"') +
            '){' + source + '}';
        }

        // *** Class selector
        // .Foo Class (case sensitive)
        else if ((match = selector.match(Patterns.className))) {
          // W3C CSS3 specs: element whose "class" attribute has been assigned a
          // list of whitespace-separated values, see section 6.4 Class selectors
          // and notes at the bottom; explicitly non-normative in this specification.
          source = 'if((n=' + (XML_DOCUMENT ?
            's.getAttribute(e,"class")' : 'e.className') +
            ')&&n.length&&(" "+' + (QUIRKS_MODE ? 'n.toLowerCase()' : 'n') +
            '.replace(' + reWhiteSpace + '," ")+" ").indexOf(" ' +
            (QUIRKS_MODE ? match[1].toLowerCase() : match[1]) + ' ")>-1' +
            '){' + source + '}';
        }

        // *** Attribute selector
        // [attr] [attr=value] [attr="value"] [attr='value'] and !=, *=, ~=, |=, ^=, $=
        // case sensitivity is treated differently depending on the document type (see map)
        else if ((match = selector.match(Patterns.attribute))) {

          // xml namespaced attribute ?
          expr = match[1].split(':');
          expr = expr.length == 2 ? expr[1] : expr[0] + '';

          if (match[2] && !Operators[match[2]]) {
            emit('Unsupported operator in attribute selectors "' + selector + '"');
            return '';
          }

          test = 'false';

          // replace Operators parameter if needed
          if (match[2] && match[4] && (test = Operators[match[2]])) {
            match[4] = convertEscapes(match[4]);
            // case treatment depends on document
            HTML_TABLE['class'] = QUIRKS_MODE ? 1 : 0;
            type = (XML_DOCUMENT ? XHTML_TABLE : HTML_TABLE)[expr.toLowerCase()];
            test = test.replace(/\%m/g, type ? match[4].toLowerCase() : match[4]);
          } else if (match[2] == '!=' || match[2] == '=') {
            test = 'n' + match[2] + '=""';
          }

          source = 'if(n=s.hasAttribute(e,"' + match[1] + '")){' +
            (match[2] ? 'n=s.getAttribute(e,"' + match[1] + '")' : '') +
            (type && match[2] ? '.toLowerCase();' : ';') +
            'if(' + (match[2] ? test : 'n') + '){' + source + '}}';

        }

        // *** Adjacent sibling combinator
        // E + F (F adiacent sibling of E)
        else if ((match = selector.match(Patterns.adjacent))) {
          source = (mode ? '' : FILTER.replace(/@/g, k)) + source;
          source = NATIVE_TRAVERSAL_API ?
            'var N' + k + '=e;while(e&&(e=e.previousElementSibling)){' + source + 'break;}e=N' + k + ';' :
            'var N' + k + '=e;while(e&&(e=e.previousSibling)){if(e.nodeName>"@"){' + source + 'break;}}e=N' + k + ';';
        }

        // *** General sibling combinator
        // E ~ F (F relative sibling of E)
        else if ((match = selector.match(Patterns.relative))) {
          source = (mode ? '' : FILTER.replace(/@/g, k)) + source;
          source = NATIVE_TRAVERSAL_API ?
            ('var N' + k + '=e;e=e.parentNode.firstElementChild;' +
            'while(e&&e!==N' + k + '){' + source + 'e=e.nextElementSibling;}e=N' + k + ';') :
            ('var N' + k + '=e;e=e.parentNode.firstChild;' +
            'while(e&&e!==N' + k + '){if(e.nodeName>"@"){' + source + '}e=e.nextSibling;}e=N' + k + ';');
        }

        // *** Child combinator
        // E > F (F children of E)
        else if ((match = selector.match(Patterns.children))) {
          source = (mode ? '' : FILTER.replace(/@/g, k)) + source;
          source = 'var N' + k + '=e;while(e&&e!==h&&e!==g&&(e=e.parentNode)){' + source + 'break;}e=N' + k + ';';
        }

        // *** Descendant combinator
        // E F (E ancestor of F)
        else if ((match = selector.match(Patterns.ancestor))) {
          source = (mode ? '' : FILTER.replace(/@/g, k)) + source;
          source = 'var N' + k + '=e;while(e&&e!==h&&e!==g&&(e=e.parentNode)){' + source + '}e=N' + k + ';';
        }

        // *** Structural pseudo-classes
        // :root, :empty,
        // :first-child, :last-child, :only-child,
        // :first-of-type, :last-of-type, :only-of-type,
        // :nth-child(), :nth-last-child(), :nth-of-type(), :nth-last-of-type()
        else if ((match = selector.match(Patterns.spseudos)) && match[1]) {

          switch (match[1]) {
            case 'root':
              // element root of the document
              if (match[3]) {
                source = 'if(e===h||s.contains(h,e)){' + source + '}';
              } else {
                source = 'if(e===h){' + source + '}';
              }
              break;

            case 'empty':
              // element that has no children
              source = 'if(s.isEmpty(e)){' + source + '}';
              break;

            default:
              if (match[1] && match[2]) {
                if (match[2] == 'n') {
                  source = 'if(e!==h){' + source + '}';
                  break;
                } else if (match[2] == 'even') {
                  a = 2;
                  b = 0;
                } else if (match[2] == 'odd') {
                  a = 2;
                  b = 1;
                } else {
                  // assumes correct "an+b" format, "b" before "a" to keep "n" values
                  b = ((n = match[2].match(/(-?\d+)$/)) ? global.parseInt(n[1], 10) : 0);
                  a = ((n = match[2].match(/(-?\d*)n/i)) ? global.parseInt(n[1], 10) : 0);
                  if (n && n[1] == '-') a = -1;
                }

                // build test expression out of structural pseudo (an+b) parameters
                // see here: http://www.w3.org/TR/css3-selectors/#nth-child-pseudo
                test = a > 1 ?
                  (/last/i.test(match[1])) ? '(n-(' + b + '))%' + a + '==0' :
                  'n>=' + b + '&&(n-(' + b + '))%' + a + '==0' : a < -1 ?
                  (/last/i.test(match[1])) ? '(n-(' + b + '))%' + a + '==0' :
                  'n<=' + b + '&&(n-(' + b + '))%' + a + '==0' : a === 0 ?
                  'n==' + b : a == -1 ? 'n<=' + b : 'n>=' + b;

                // 4 cases: 1 (nth) x 4 (child, of-type, last-child, last-of-type)
                source =
                  'if(e!==h){' +
                    'n=s[' + (/-of-type/i.test(match[1]) ? '"nthOfType"' : '"nthElement"') + ']' +
                      '(e,' + (/last/i.test(match[1]) ? 'true' : 'false') + ');' +
                    'if(' + test + '){' + source + '}' +
                  '}';

              } else {
                // 6 cases: 3 (first, last, only) x 1 (child) x 2 (-of-type)
                a = /first/i.test(match[1]) ? 'previous' : 'next';
                n = /only/i.test(match[1]) ? 'previous' : 'next';
                b = /first|last/i.test(match[1]);

                type = /-of-type/i.test(match[1]) ? '&&n.nodeName!=e.nodeName' : '&&n.nodeName<"@"';

                source = 'if(e!==h){' +
                  ( 'n=e;while((n=n.' + a + 'Sibling)' + type + ');if(!n){' + (b ? source :
                    'n=e;while((n=n.' + n + 'Sibling)' + type + ');if(!n){' + source + '}') + '}' ) + '}';
              }
              break;
          }

        }

        // *** negation, user action and target pseudo-classes
        // *** UI element states and dynamic pseudo-classes
        // CSS3 :not, :checked, :enabled, :disabled, :target
        // CSS3 :active, :hover, :focus
        // CSS3 :link, :visited
        else if ((match = selector.match(Patterns.dpseudos)) && match[1]) {

          switch (match[1].match(/^\w+/)[0]) {
            // CSS3 negation pseudo-class
            case 'not':
              // compile nested selectors, DO NOT pass the callback parameter
              // SIMPLENOT allow disabling complex selectors nested
              // in ':not()' pseudo-classes, breaks some test units
              expr = match[3].replace(reTrimSpaces, '');

              if (Config.SIMPLENOT && !reSimpleNot.test(expr)) {
                // see above, log error but continue execution
                emit('Negation pseudo-class only accepts simple selectors "' + selector + '"');
                return '';
              } else {
                if ('compatMode' in doc) {
                  source = 'if(!' + compile(expr, '', false) + '(e,s,r,d,h,g)){' + source + '}';
                } else {
                  source = 'if(!s.match(e, "' + expr.replace(/\x22/g, '\\"') + '",g)){' + source +'}';
                }
              }
              break;

            // CSS3 UI element states
            case 'checked':
              // for radio buttons checkboxes (HTML4) and options (HTML5)
              source = 'if((typeof e.form!=="undefined"&&(/^(?:radio|checkbox)$/i).test(e.type)&&e.checked)' +
                (Config.USE_HTML5 ? '||(/^option$/i.test(e.nodeName)&&(e.selected||e.checked))' : '') +
                '){' + source + '}';
              break;
            case 'disabled':
              // does not consider hidden input fields
              source = 'if(((typeof e.form!=="undefined"' +
                (Config.USE_HTML5 ? '' : '&&!(/^hidden$/i).test(e.type)') +
                ')||s.isLink(e))&&e.disabled===true){' + source + '}';
              break;
            case 'enabled':
              // does not consider hidden input fields
              source = 'if(((typeof e.form!=="undefined"' +
                (Config.USE_HTML5 ? '' : '&&!(/^hidden$/i).test(e.type)') +
                ')||s.isLink(e))&&e.disabled===false){' + source + '}';
              break;

            // CSS3 lang pseudo-class
            case 'lang':
              test = '';
              if (match[2]) test = match[2].substr(0, 2) + '-';
              source = 'do{(n=e.lang||"").toLowerCase();' +
                'if((n==""&&h.lang=="' + match[2].toLowerCase() + '")||' +
                '(n&&(n=="' + match[2].toLowerCase() +
                '"||n.substr(0,3)=="' + test.toLowerCase() + '")))' +
                '{' + source + 'break;}}while((e=e.parentNode)&&e!==g);';
              break;

            // CSS3 target pseudo-class
            case 'target':
              source = 'if(e.id==d.location.hash.slice(1)){' + source + '}';
              break;

            // CSS3 dynamic pseudo-classes
            case 'link':
              source = 'if(s.isLink(e)&&!e.visited){' + source + '}';
              break;
            case 'visited':
              source = 'if(s.isLink(e)&&e.visited){' + source + '}';
              break;

            // CSS3 user action pseudo-classes IE & FF3 have native support
            // these capabilities may be emulated by some event managers
            case 'active':
              if (XML_DOCUMENT) break;
              source = 'if(e===d.activeElement){' + source + '}';
              break;
            case 'hover':
              if (XML_DOCUMENT) break;
              source = 'if(e===d.hoverElement){' + source + '}';
              break;
            case 'focus':
              if (XML_DOCUMENT) break;
              source = NATIVE_FOCUS ?
                'if(e===d.activeElement&&d.hasFocus()&&(e.type||e.href||typeof e.tabIndex=="number")){' + source + '}' :
                'if(e===d.activeElement&&(e.type||e.href)){' + source + '}';
              break;

            // CSS2 selected pseudo-classes, not part of current CSS3 drafts
            // the 'selected' property is only available for option elements
            case 'selected':
              // fix Safari selectedIndex property bug
              expr = BUGGY_SELECTED ? '||(n=e.parentNode)&&n.options[n.selectedIndex]===e' : '';
              source = 'if(/^option$/i.test(e.nodeName)&&(e.selected||e.checked' + expr + ')){' + source + '}';
              break;

            default:
              break;
          }

        }

        else {

          // this is where external extensions are
          // invoked if expressions match selectors
          expr = false;
          status = false;
          for (expr in Selectors) {
            if ((match = selector.match(Selectors[expr].Expression)) && match[1]) {
              result = Selectors[expr].Callback(match, source);
              source = result.source;
              status = result.status;
              if (status) { break; }
            }
          }

          // if an extension fails to parse the selector
          // it must return a false boolean in "status"
          if (!status) {
            // log error but continue execution, don't throw real exceptions
            // because blocking following processes maybe is not a good idea
            emit('Unknown pseudo-class selector "' + selector + '"');
            return '';
          }

          if (!expr) {
            // see above, log error but continue execution
            emit('Unknown token in selector "' + selector + '"');
            return '';
          }

        }

        // error if no matches found by the pattern scan
        if (!match) {
          emit('Invalid syntax in selector "' + selector + '"');
          return '';
        }

        // ensure "match" is not null or empty since
        // we do not throw real DOMExceptions above
        selector = match && match[match.length - 1];
      }

      return source;
    },

  /*----------------------------- QUERY METHODS ------------------------------*/

  // match element with selector
  // @return boolean
  match =
    function(element, selector, from, callback) {

      var parts;

      if (!(element && element.nodeType == 1)) {
        emit('Invalid element argument');
        return false;
      } else if (typeof selector != 'string') {
        emit('Invalid selector argument');
        return false;
      } else if (from && from.nodeType == 1 && !contains(from, element)) {
        return false;
      } else if (lastContext !== from) {
        // reset context data when it changes
        // and ensure context is set to a default
        switchContext(from || (from = element.ownerDocument));
      }

      selector = selector.replace(reTrimSpaces, '');

      Config.SHORTCUTS && (selector = Dom.shortcuts(selector, element, from));

      if (lastMatcher != selector) {
        // process valid selector strings
        if ((parts = selector.match(reValidator)) && parts[0] == selector) {
          isSingleMatch = (parts = selector.match(reSplitGroup)).length < 2;
          // save passed selector
          lastMatcher = selector;
          lastPartsMatch = parts;
        } else {
          emit('The string "' + selector + '", is not a valid CSS selector');
          return false;
        }
      } else parts = lastPartsMatch;

      // compile matcher resolvers if necessary
      if (!matchResolvers[selector] || matchContexts[selector] !== from) {
        matchResolvers[selector] = compile(isSingleMatch ? [selector] : parts, '', false);
        matchContexts[selector] = from;
      }

      return matchResolvers[selector](element, Snapshot, [ ], doc, root, from, callback, new global.Object());
    },

  // select only the first element
  // matching selector (document ordered)
  first =
    function(selector, from) {
      return select(selector, from, function() { return false; })[0] || null;
    },

  // select elements matching selector
  // using new Query Selector API
  // or cross-browser client API
  // @return array
  select =
    function(selector, from, callback) {

      var i, changed, element, elements, parts, token, original = selector;

      if (arguments.length === 0) {
        emit('Not enough arguments');
        return [ ];
      } else if (typeof selector != 'string') {
        return [ ];
      } else if (from && !(/1|9|11/).test(from.nodeType)) {
        emit('Invalid or illegal context element');
        return [ ];
      } else if (lastContext !== from) {
        // reset context data when it changes
        // and ensure context is set to a default
        switchContext(from || (from = doc));
      }

      if (Config.CACHING && (elements = Dom.loadResults(original, from, doc, root))) {
        return callback ? concatCall([ ], elements, callback) : elements;
      }

      if (!OPERA_QSAPI && RE_SIMPLE_SELECTOR.test(selector)) {
        switch (selector.charAt(0)) {
          case '#':
            if (Config.UNIQUE_ID) {
              elements = (element = _byId(selector.slice(1), from)) ? [ element ] : [ ];
            }
            break;
          case '.':
            elements = _byClass(selector.slice(1), from);
            break;
          default:
            elements = _byTag(selector, from);
            break;
        }
      }

      else if (!XML_DOCUMENT && Config.USE_QSAPI &&
        !(BUGGY_QUIRKS_QSAPI && RE_CLASS.test(selector)) &&
        !RE_BUGGY_QSAPI.test(selector)) {
        try {
          elements = from.querySelectorAll(selector);
        } catch(e) { }
      }

      if (elements) {
        elements = callback ? concatCall([ ], elements, callback) :
          NATIVE_SLICE_PROTO ? slice.call(elements) : concatList([ ], elements);
        Config.CACHING && Dom.saveResults(original, from, doc, elements);
        return elements;
      }

      selector = selector.replace(reTrimSpaces, '');

      Config.SHORTCUTS && (selector = Dom.shortcuts(selector, from));

      if ((changed = lastSelector != selector)) {
        // process valid selector strings
        if ((parts = selector.match(reValidator)) && parts[0] == selector) {
          isSingleSelect = (parts = selector.match(reSplitGroup)).length < 2;
          // save passed selector
          lastSelector = selector;
          lastPartsSelect = parts;
        } else {
          emit('The string "' + selector + '", is not a valid CSS selector');
          return [ ];
        }
      } else parts = lastPartsSelect;

      // commas separators are treated sequentially to maintain order
      if (from.nodeType == 11) {

        elements = byTagRaw('*', from);

      } else if (!XML_DOCUMENT && isSingleSelect) {

        if (changed) {
          // get right most selector token
          parts = selector.match(reSplitToken);
          token = parts[parts.length - 1];

          // only last slice before :not rules
          lastSlice = token.split(':not')[0];

          // position where token was found
          lastPosition = selector.length - token.length;
        }

        // ID optimization RTL, to reduce number of elements to visit
        if (Config.UNIQUE_ID && (parts = lastSlice.match(Optimize.ID)) && (token = parts[1])) {
          if ((element = _byId(token, from))) {
            if (match(element, selector)) {
              callback && callback(element);
              elements = new global.Array(element);
            } else elements = new global.Array();
          }
        }

        // ID optimization LTR, to reduce selection context searches
        else if (Config.UNIQUE_ID && (parts = selector.match(Optimize.ID)) && (token = parts[1])) {
          if ((element = _byId(token, doc))) {
            if ('#' + token == selector) {
              callback && callback(element);
              elements = new global.Array(element);
            } else if (/[>+~]/.test(selector)) {
              from = element.parentNode;
            } else {
              from = element;
            }
          } else elements = new global.Array();
        }

        if (elements) {
          Config.CACHING && Dom.saveResults(original, from, doc, elements);
          return elements;
        }

        if (!NATIVE_GEBCN && (parts = lastSlice.match(Optimize.TAG)) && (token = parts[1])) {
          if ((elements = _byTag(token, from)).length === 0) { return [ ]; }
          selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace(token, '*');
        }

        else if ((parts = lastSlice.match(Optimize.CLASS)) && (token = parts[1])) {
          if ((elements = _byClass(token, from)).length === 0) { return [ ]; }
          if (reOptimizeSelector.test(selector.charAt(selector.indexOf(token) - 1))) {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '');
          } else {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '*');
          }
        }

        else if ((parts = selector.match(Optimize.CLASS)) && (token = parts[1])) {
          if ((elements = _byClass(token, from)).length === 0) { return [ ]; }
          for (i = 0, els = new global.Array(); elements.length > i; ++i) {
            els = concatList(els, elements[i].getElementsByTagName('*'));
          }
          elements = els;
          if (reOptimizeSelector.test(selector.charAt(selector.indexOf(token) - 1))) {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '');
          } else {
            selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace('.' + token, '*');
          }
        }

        else if (NATIVE_GEBCN && (parts = lastSlice.match(Optimize.TAG)) && (token = parts[1])) {
          if ((elements = _byTag(token, from)).length === 0) { return [ ]; }
          selector = selector.slice(0, lastPosition) + selector.slice(lastPosition).replace(token, '*');
        }

      }

      if (!elements) {
        elements = /^(?:applet|object)$/i.test(from.nodeName) ? from.childNodes : _byTag('*', from);
      }
      // end of prefiltering pass

      // compile selector resolver if necessary
      if (!selectResolvers[selector] || selectContexts[selector] !== from) {
        selectResolvers[selector] = compile(isSingleSelect ? [selector] : parts, '', true);
        selectContexts[selector] = from;
      }

      elements = selectResolvers[selector](elements, Snapshot, [ ], doc, root, from, callback, new global.Object());

      Config.CACHING && Dom.saveResults(original, from, doc, elements);

      return elements;
    },

  /*-------------------------------- STORAGE ---------------------------------*/

  // empty function handler
  FN = function(x) { return x; },

  // compiled match functions returning booleans
  matchContexts = new global.Object(),
  matchResolvers = new global.Object(),

  // compiled select functions returning collections
  selectContexts = new global.Object(),
  selectResolvers = new global.Object(),

  // used to pass methods to compiled functions
  Snapshot = new global.Object({

    // element indexing methods
    nthElement: nthElement,
    nthOfType: nthOfType,

    // element inspection methods
    getAttribute: getAttribute,
    hasAttribute: hasAttribute,

    // element selection methods
    byClass: _byClass,
    byName: byName,
    byTag: _byTag,
    byId: _byId,

    // helper/check methods
    contains: contains,
    isEmpty: isEmpty,
    isLink: isLink,

    // selection/matching
    select: select,
    match: match
  }),

  Tokens = new global.Object({
    prefixes: prefixes,
    encoding: encoding,
    operators: operators,
    whitespace: whitespace,
    identifier: identifier,
    attributes: attributes,
    combinators: combinators,
    pseudoclass: pseudoclass,
    pseudoparms: pseudoparms,
    quotedvalue: quotedvalue
  });

  /*------------------------------- PUBLIC API -------------------------------*/

  // code referenced by extensions
  Dom.ACCEPT_NODE = ACCEPT_NODE;

  // retrieve element by id attr
  Dom.byId = byId;

  // retrieve elements by tag name
  Dom.byTag = byTag;

  // retrieve elements by name attr
  Dom.byName = byName;

  // retrieve elements by class name
  Dom.byClass = byClass;

  // read the value of the attribute
  // as was in the original HTML code
  Dom.getAttribute = getAttribute;

  // check for the attribute presence
  // as was in the original HTML code
  Dom.hasAttribute = hasAttribute;

  // element match selector, return boolean true/false
  Dom.match = match;

  // first element match only, return element or null
  Dom.first = first;

  // elements matching selector, starting from element
  Dom.select = select;

  // compile selector into ad-hoc javascript resolver
  Dom.compile = compile;

  // check that two elements are ancestor/descendant
  Dom.contains = contains;

  // handle selector engine configuration settings
  Dom.configure = configure;

  // initialize caching for each document
  Dom.setCache = FN;

  // load previously collected result set
  Dom.loadResults = FN;

  // save previously collected result set
  Dom.saveResults = FN;

  // handle missing context in selector strings
  Dom.shortcuts = FN;

  // log resolvers errors/warnings
  Dom.emit = emit;

  // options enabing specific engine functionality
  Dom.Config = Config;

  // pass methods references to compiled resolvers
  Dom.Snapshot = Snapshot;

  // operators descriptor
  // for attribute operators extensions
  Dom.Operators = Operators;

  // selectors descriptor
  // for pseudo-class selectors extensions
  Dom.Selectors = Selectors;

  // export string patterns
  Dom.Tokens = Tokens;

  // export version string
  Dom.Version = version;

  // add or overwrite user defined operators
  Dom.registerOperator =
    function(symbol, resolver) {
      Operators[symbol] || (Operators[symbol] = resolver);
    };

  // add selector patterns for user defined callbacks
  Dom.registerSelector =
    function(name, rexp, func) {
      Selectors[name] || (Selectors[name] = new global.Object({
        Expression: rexp,
        Callback: func
      }));
    };

  /*---------------------------------- INIT ----------------------------------*/

  // init context specific variables
  switchContext(doc, true);

});
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */
/**
 * JSON解码器器的纯JS实现
 */
function JSONTokenizer(value){
    this.value = value.replace(/^\s+|\s+$/g,'');
	this.start = 0;
	this.end = this.value.length;
}
JSONTokenizer.prototype = {
	parse : function() {
		this.skipComment();
		var c = this.value.charAt(this.start);
		if (c == '"') {
			return this.findString();
		} else if (c == '-' || c >= '0' && c <= '9') {
			return this.findNumber();
		} else if (c == '[') {
			return this.findList();
		} else if (c == '{') {
			return this.findMap();
		} else {
			var key = this.findId();
			if ("true".equals(key)) {
				return Boolean.TRUE;
			} else if ("false".equals(key)) {
				return Boolean.FALSE;
			} else if ("null".equals(key)) {
				return null;
			} else {
				throw new Error("语法错误:" + this.value + "@"
						+ this.start);
			}
		}
	},
	findMap : function() {
		this.start++;
		this.skipComment();
		var result = {};
		while (true) {
			// result.push(parse());
			var key =  this.parse();
			this.skipComment();
			var c = this.value.charAt(this.start++);
			if (c != ':') {
				throw new Error("错误对象语法:" + this.value + "@"
						+ this.start);
			}
			var valueObject = this.parse();
			this.skipComment();
			c = this.value.charAt(this.start++);
			if (c == '}') {
				result[key]= valueObject;
				return result;
			} else if (c != ',') {
				throw new Error("错误对象语法:" + this.value + "@"
						+ this.start);
			} else {
				result.put(key, valueObject);

			}
		}
	},

	findList:function() {
		var result = [];
		// this.start--;
		this.start++;
		this.skipComment();
		if (this.value.charAt(this.start) == ']') {
			this.start++;
			return result;
		} else {
			result.push(this.parse());
		}
		while (true) {
			this.skipComment();
			var c = this.value.charAt(this.start++);
			if (c == ']') {
				return result;
			} else if (c == ',') {
				this.skipComment();
				result.push(this.parse());
			} else {
				throw new Error("错误数组语法:" + this.value + "@"
						+ this.start);
			}
		}
	},

	findNumber:function() {
		var i = this.start;// skip -;
		var isFloatingPoint = false;

		var c = this.value.charAt(i++);
		if (c == '-') {
			c = this.value.charAt(i++);
		}
		if (c == '0') {
			if (i < this.end) {
				return this.parseZero();
			} else {
				this.start = i;
				return 0;
			}
		}
		var ivalue = c - '0';
		while (i < this.end) {
			c = this.value.charAt(i++);
			if (c >= '0' && c <= '9') {
				ivalue = (ivalue * 10) + (c - '0');
			} else {
				break;
			}
		}
		if (c == '.') {
			c = this.value.charAt(i++);
			while (c >= '0' && c <= '9') {
				isFloatingPoint = true;
				if (i < this.end) {
					c = this.value.charAt(i++);
				} else {
					break;
				}
			}
			if (!isFloatingPoint) {
				// c = '.';
				// i--;
				this.start = i - 2;
				return ivalue;
			}
		}
		if (c == 'E' || c == 'e') {
			isFloatingPoint = true;
			c = this.value.charAt(i++);
			if (c == '+' || c == '-') {
				c = this.value.charAt(i++);
			}
			while (c >= '0' && c <= '9') {
				if (i < this.end) {
					c = this.value.charAt(i++);
				} else {
					break;
				}
			}
		} else {
			c = this.value.charAt(i - 1);
			if (c < '0' || c > '9') {
				i--;
			}
		}

		if (isFloatingPoint) {
			return this.value.substring(this.start, this.start = i)*1;
		} else {
			this.start = i;
			return ivalue;
		}
	},
	parseZero: function(){
		var value = this.value.substr(this.start);
		value = value.replace(/([+-]?0(?:x[0-9a-f]+|\.?[0-9]*))[\s\S]*/i,'$1');
		this.start += value.length;
		//print(value+'/'+parseInt(value))
		if(value.indexOf('.')<0){
			return parseInt(value);
		}
		return parseFloat(value);
	},
	findId:function() {
		var p = this.start;
		if (/[\w\$_]/.test(this.value.charAt(p++))) {
			while (p < this.end) {
				if (!/[\w\$_]/.test(this.value.charAt(p))) {
					break;
				}
				p++;
			}
			return (this.value.substring(this.start, this.start = p));
		}
		throw new Error("无效id");

	},

	/**
	 * {@link Decompiler#printSourceString
	 */
	findString:function() {
		var quoteChar = this.value.charAt(this.start++);
		var buf = [];
		while (this.start < this.end) {
			var c = this.value.charAt(this.start++);
			switch (c) {
			case '\\':
				var c2 = this.value.charAt(this.start++);
				switch (c2) {
				case 'b':
					buf.push('\b');
					break;
				case 'f':
					buf.push('\f');
					break;
				case 'n':
					buf.push('\n');
					break;
				case 'r':
					buf.push('\r');
					break;
				case 't':
					buf.push('\t');
					break;
				case 'v':
					buf.push(0xb);
					break; // Java lacks \v.
				case ' ':
					buf.push(' ');
					break;
				case '\\':
				case '\/':
					buf.push(c2);
					break;
				case '\'':
					buf.push('\'');
					break;
				case '\"':
					buf.push('"');
					break;
				case 'u':
					var c = this.value.substring(
							this.start, this.start + 4);
					c = parseInt(c, 16);
					
					buf.push(String.fromCharCode(c));
					this.start += 4;
					break;
				case 'x':
					var c = this.value.substring(this.start, this.start + 2);
					c = parseInt(c, 16);
					buf.push(String.fromCharCode(c));
					this.start += 2;
					break;
				default:
					buf.push(c);
					buf.push(c2);
				}
				break;
			case '"':
			case '\'':
				if (c == quoteChar) {
					return (buf.join(''));
				}
			default:
				buf.push(c);

			}
		}
		throw new Error("未结束字符串:" + this.value
				+ "@" + this.start);
	},

	skipComment:function() {
		while (true) {
			while (this.start < this.end) {
			    var c = this.value.charAt(this.start);
				if (c == ' ' || c =='\t') {
				      this.start++;
				}else{
				    break;
				}
				
			}
			if (this.start < this.end && this.value.charAt(this.start) == '/') {
				this.start++;
				var next = this.value.charAt(this.start++);
				if (next == '/') {
					var end1 = this.value.indexOf('\n', this.start);
					var end2 = this.value.indexOf('\r', this.start);
					var cend = Math.min(end1, end2);
					if (cend < 0) {
						cend = Math.max(end1, end2);
					}
					if (cend > 0) {
						this.start = cend;
					} else {
						this.start = this.end;
					}
				} else if (next == '*') {
					var cend = this.value.indexOf("*/", this.start);
					if (cend > 0) {
						this.start = cend + 2;
					} else {
						throw new Error("未結束注釋:" + this.value
								+ "@" + this.start);
					}
				}
			} else {
				break;
			}
		}
	},

	skipSpace:function(nextChar) {
		while (this.start < this.end) {
			var c = this.value.charAt(this.start);
			if (c == ' ' || c =='\t' || c == '\r' || c == '\n') {
			      this.start++;
			}else{
			    break;
			}
		}
		if (nextChar > '\x00' && this.start < this.end) {
			var next = this.value.charAt(this.start);
			if (nextChar == next) {
				return true;
			}
		}
		return false;
	}
}

//function parseNumber(text, radix) {
//	return parseInt(text, radix);
//}


if(typeof require == 'function'){
exports.JSONTokenizer=JSONTokenizer;
}
}
,
function(exports,require){/*
 * List Template
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/lite/
 * @author jindw
 * @version $Id: template.js,v 1.4 2008/02/28 14:39:06 jindw Exp $
 */

/**
 * @param data template source（xml source|| dom）
 * @param config {params:params,liteImpl:'liteImpl'}
 * @public
 */
function parseLite(data,config){
	var path = data && data.documentURI;
	var root = config&&config.root || path && data.root;
	var parseContext = new ParseContext(root && new ParseConfig(root));
	path && parseContext.setCurrentURI(path)
	data = parseContext.loadXML(data);
	parseContext.parse(data);
	try{
		if(config instanceof Array){
			config = {params:config} 
		}
		var translator = new JSTranslator();
		//translator.liteImpl = "lite_impl"
		var code = translator.translate(parseContext.toList(),config);
		//console.log(code)
		data =  new Function('return '+code).apply();
		data.toString=function(){//_$1 encodeXML
			return code;
		}
		return data;
	}catch(e){
		console.error("translate error",e,code)
		throw e;
	}
}


if(typeof require == 'function'){
exports.parseLite=parseLite;
exports.LiteEngine=require(41).LiteEngine;
var ParseConfig=require(14).ParseConfig;
var JSTranslator=require(1).JSTranslator;
var ParseContext=require(0).ParseContext;
}
}
,
function(exports,require,module,__filename){var __dirname= __filename.replace(/[^\/]+$/,"");var Template = require(3).Template

function LiteEngine(root,config){
	root = require(42).resolve(root || './')
	root = root.replace(/[\\\/]*$/,'/');
	this.root = root;
	this.templateMap = {};
	this.renderTask = {};
	var thiz = this;
	/**
	 * 
	 * configurator: modulename#configuratorMethod(compiler)
	 */
	var configurator = config&&config.configurator;
	try{
		//throw new Error();
		var configRoot = require(44).configRoot
		this.compiler = require(43).fork(__dirname + '/process.js',[configRoot,root,'-configurator',configurator||'']);
		this.compiler.on('message', function(result){
			thiz.onChange(result.path,result.code,result.config)
		}); 
		
	}catch(e){
		if(this.compiler == null){
			var thiz = this;
			var setupCompiler = require(44).setupCompiler;
			var compiler = setupCompiler(root,function(result){
					var action = result.action;
					if(action == 'remove' || action == 'add' || action=='error'){
						thiz.onChange(result.path,result.code,result.config)
					}
				},configurator);
			this.compiler = {
				send:compiler
			}
			
		}
	}
}
LiteEngine.prototype.requestCompile = function(path){
	this.compiler.send(path);
}
LiteEngine.prototype.onChange = function(path,code,config) {
	if(code){
		var tpl = new Template(code,config);
		if(config.error == null){//发生错误的页面每次都需要重建？？
			this.templateMap[path] = tpl; 
		}
		var task = this.renderTask[path];
		if(task){
			delete this.renderTask[path];
			for(var i=0;i<task.length;i++){
				var args = task[i];
				args[0] = tpl;
				doRender.apply(null,args)
			}
		}
	}else{//clear cache
		delete this.templateMap[path];
		console.info('clear template cache:' ,path);
	}
}
LiteEngine.prototype.render=function(path,model,req,response){
    var cookie = String(req.headers.cookie);
    var debug = cookie.replace(/(?:^|&[\s\S]*;\s*)LITE_DEBUG=(\w+)[\s\S]*$/,'$1');
    debug = debug == cookie?false:debug;
	if(debug=='model'){
    	response.end(JSON.stringify(model));
    }else if(debug=='source'){
    	require(21).readFile(require(42).resolve(this.root ,path.replace(/^[\\\/]/,'')), "binary", function(err, file) {    
        	if(err) {
            	response.writeHead(404, {"Content-Type": "text/plain"});   
            	response.end(err + "\n");    
        	}else{
        		response.writeHead(200, {"Content-Type": 'text/plain;charset=utf8'}); 
         		response.end(file, "binary"); 
        	}    
    	});
   	}else{
		var tpl = this.templateMap[path];
		if(tpl){
			doRender(tpl,model,response);
		}else{
			(this.renderTask[path] || (this.renderTask[path] =[])).push([path,model,response]);
			this.requestCompile(path);
		}
	}
}
function doRender(tpl,model,response){
    response.writeHead(200, {"Content-Type": tpl.contentType});   
	try{
		tpl.render(model,response);
	}catch(e){
		var rtv = '<pre>'+require(4).inspect(e,true)+'\n\n'+(e.message +e.stack);
		response.end(rtv);
		throw e;
	}
}

exports.LiteEngine = LiteEngine;

}
,
function(exports,require,module){console.log("read module err!!!path\nError: ENOENT: no such file or directory, open 'path'")
}
,
function(exports,require,module){console.log("read module err!!!child_process\nError: ENOENT: no such file or directory, open 'child_process'")
}
,
function(exports,require){var  configRoot = '-lite-engine-child-process-root';
exports.configRoot = configRoot
//node path -root root -filter path#name
var argv = process.argv;
var isChild = argv[2]==configRoot;//child-process-compiler
if(isChild){
	//{path:tplPath,action:'remove'}
	var root = argv[3].replace(/\/?$/,'/');
	if(argv[4] == '-configurator' && argv[5]){
		var configurator = argv[5];
	}
	//console.log('ischild:',root);
	var compile = setupCompiler(root,function(cmd){
		//console.log('compile:',cmd)
		process.send(cmd)
	},configurator);
	process.on('message', function(path){
		compile(path);
	});
}

function setupCompiler(root,callback,configurator){
	/**
	 * template -> {resource1:true,resource2:true}
	 */
	var templateMap = {
	}
	/**
	 * 允许脏数据，发现脏数据要通过templateMap重新确定
	 * resource -> {template1:true,template2:true}
	 */
	var resourceMap = {}
	
	var LiteCompiler = require(45).LiteCompiler;
	
	/*
	 * template compiler
	 */
	var templateCompiler= new LiteCompiler(root);
	if(configurator){
		console.log('filter:',configurator)
		try{
			if('string' == typeof configurator ){
				var args = configurators.split('#');
				var path = args[0];
				var name = args[1];
				var configurator = require(path)[name];
				templateCompiler.waitPromise = true
				templateCompiler = configurator(templateCompiler)
			}
		}catch(e){
			console.error('filter init error:'+e);
		}
	}
	function addTemplateWatch(path,resources){
		var template = templateMap[path]={};
		for(var i = 0;i<resources.length;i++){
			var res = resources[i];
		 	template[res]=true;
		 	var resource= resourceMap[res];
		 	if(resource == null){
				//console.info('resource file:' ,res);
				resource = resourceMap[res] = {};
		 		addResourceWatch(res);
		 	}
		 	resource[path] = true;
		}
	}
	function addResourceWatch(resourcePath){
		require(21).watch(require(42).join(root,resourcePath), function (event, filename) {
			//console.log('event is: ' + event,filename);
			for(var tplPath in resourceMap[resourcePath]){
				var tpl = templateMap[tplPath];
				if(tpl && tpl[resourcePath]){
					delete templateMap[tplPath];
					//console.debug('remove tpl evet:' ,tplPath);
					callback({path:tplPath,action:'remove'})
					//process.send({path:tplPath,action:'remove'})
					
				}
			}
		});
	}
	//process.on('message', function(path) {
	return (function(path){
		try{
			var result = templateCompiler.compile(path);
		    //console.log('child got message:', m.root);
		    var res = result.resources;
			//console.info('resource config:' ,res);
		    addTemplateWatch(path,res);
		    callback({path:path,action:'add',code:result.code,config:result.config})
		    //process.send({path:path,action:'add',code:result.code,config:result.config,prefix:result[3]})
	    }catch(e){
	    	throw e;
	    	callback({path:path,action:'error',
	    		code:"function(){return '<pre>'+"+JSON.stringify(require(4).inspect(e,true)+
					'\n\n'+(e.message +e.stack))+"}",
	    		config:{contentType:'text/html',encoding:'utf-8',error:e}
	    	})
	    }
	});
}
exports.setupCompiler = setupCompiler;
}
,
function(exports,require){var ParseConfig = require(14).ParseConfig;
var ParseContext = require(0).ParseContext;
var JSTranslator = require(1).JSTranslator;
var loadLiteXML = require(7).loadLiteXML;
function LiteCompiler(root,config){
	var path = require(42);
	var root =String(path.resolve(root || './')).replace(/\\/g,'/');
	var config = config || path.resolve(root,'lite.xml');
	if(require(21).existsSync(config)){
		var dom = loadLiteXML(config);
		//console.log(dom+'')
		this.config = new ParseConfig(root,dom);
	}else{
		var config = path.resolve(root,'WEB-INF/lite.xml');
		if(require(21).existsSync(config)){
			var dom = loadLiteXML(config);
			//console.log(dom+'')
			this.config = new ParseConfig(root,dom);
		}else{
			this.config = new ParseConfig(root,null);
		}
	}
	console.info("LiteCompiler root:",root);
	
}
LiteCompiler.prototype.createParseContext = function(path){
	return new ParseContext(this.config,path);
}
LiteCompiler.prototype.compile=function(path){
	var context = this.createParseContext(path);
	var uri = context.createURI(path);
	context.parse(uri);
	//console.log("&&&",path)
	//console.log(context.getConfigMap(path))
	
	var litecode = context.toList();
	if(litecode.length){
		var translator = new JSTranslator({
			//liteImpl:liteImpl,
			waitPromise:true
		});//'.','/','-','!','%'
		//translator.liteImpl = 'liteImpl';//avoid inline jslib 
		var functionName = path.replace(/[^\w\_]/g,'_')
		var jscode = translator.translate(litecode,{name:functionName});//,params:null,defaults:null
	}else{//纯静态内容
		var jscode = "function(){}";
	}
	
	var res = context.getResources();
	var config = context.getConfigMap();
	var i = res.length;
	while(i--){
		res[i] = res[i].path
	}
	return {resources:res,code:jscode,config:config};
}
exports.LiteCompiler = LiteCompiler;


},[])
//jsi export ./compiler.js -f compressed -o .c.js
//require('jsi/lib/exports').exportScript(from,['./compiler.js']

//var parseLite = require('../../index.js').parseLite
var editorMap = editorMap || {};
var ParseContext = require(0).ParseContext;
var JSTranslator = require(1).JSTranslator;
var PHPTranslator = require(2).PHPTranslator;
var wrapResponse = require(3).wrapResponse


var resultEditor = CodeMirror(placeMirror, {
	value: '',
	readOnly:true,
	lineNumbers: true,
	mode: {name:"javascript"}
});
/*
function nodeTest(){
	this.xmlSourceMap = {};
	this.templateEditor = {getValue:function(){
		return "<xml c:if='${test1 && test2 && test3.xxx}'>123{dddd}</xml>"
	}}
	this.showResult = this.updateResultRunner = console.log
	compileToPHP();
}
nodeTest();
*/
function buildContext(){
	var context = new ParseContext();
	var cached = {};
	for(var path in editorMap){
		cached[path] = editorMap[path].getValue();
	}
	cached["/source.xhtml"] = templateEditor.getValue();
	var baseXMLLoader = context.loadXML;
	context.loadXML = function(uri){
		if(uri.path){
			if(uri.path in cached){
				uri = cached[uri.path];
			}else{
				console.warn("未知文件路径",uri.path)
			}
		}
		return baseXMLLoader.call(context,uri);
	}
	context.parse(context.createURI('/source.xhtml'));
	return context;
}
function compileToJS(){
	try{
		var context = buildContext();
		var litecode = context.toList();
		var translator = new JSTranslator();//'.','/','-','!','%'
		var jscode = translator.translate(litecode);
	}finally{
		showResult(jscode);
		updateResultRunner('JavaScript',litecode,jscode);
	}
}
function compileToNodeJS(){
	try{
		var context = buildContext();
		var litecode = context.toList();
		var translator = new JSTranslator({waitPromise:true});
		var jscode = translator.translate(litecode);
	}finally{
		var nodecode = jscode;
		showResult(nodecode);
		updateResultRunner('NodeJS',litecode,nodecode);
	}
}
function compileToPHP(){
	try{
		var context = buildContext();
		var litecode = context.toList();
		var pt = new PHPTranslator({
			waitPromise:true,
			path:"/test.xhtml".replace(/[\/\-\$\.!%]/g,'_')
		});//'.','/','-','!','%'
		var phpcode = pt.translate(litecode);
	}finally{
		showResult(phpcode);
		updateResultRunner('PHP',litecode,phpcode);
	}
}
function compileToLite(){
	try{
		var context = buildContext();
		var litecode = context.toList();
		var litecode = JSON.stringify(litecode);
	}finally{
		showResult(litecode);
		updateResultRunner('Java',litecode,null);
	}
}


