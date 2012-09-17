/*
 * JavaScript Integration Framework
 * License LGPL(您可以在任何地方免费使用,但请不要吝啬您对框架本身的改进)
 * http://www.xidea.org/project/jsi/
 * 
 * This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General 
 * Public License as published by the Free Software Foundation; either version 2.1 of the License, or (at your option) 
 * any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more 
 * details.
 *
 * @author jindw
 * @version $Id: boot.js,v 1.3 2008/02/25 05:21:27 jindw Exp $
 */

/*
 * JSI2.5 起，为了避免scriptBase 探测。节省代码量，我们使用写死的方法。
 * 如果您的网页上使用了如base之类的标签，那么，为了摸平浏览器的差异，你可能需要再这里明确指定scriptBase的准确路径。
 */
/**
 * JSI对象
 * @public
 */
var $JSI= {
    /**
     * 脚本根路径，调试模式下，系统根据启动脚本文件名自动探测，但是真实部署时，需要用户自己手动指定包路径。
     * @public
     * @id $JSI.scriptBase
     * @typeof string
     * @static
     */
     //scriptBase : "http://localhost:8080/script2/"
};
if("org.xidea.jsi.boot:$log"){
    /**
     * 全局日志
     * <p>JSI 可选功能,你也可以使用JSA将代码中的日志处理信息清除。<p>
     * <p>自JSI2.1之后，只有全局日志，没有装在单元日志了。<p>
     * @typeof object
     * @public
     */
    var $log;//将在$import 闭包中初始化
}




/**
 * 导入指定元素（脚本、函数、类、变量）至指定目标,默认方式为同步导入，默认目标为全局对象（Global == window(html)）。
 * <pre class="code"><code>  //Example:
 *   $import("com.yourcompany.ClassA")//即时装载--通过指定对象
 *   $import("com/yourcompany/class-a.js")//即时装载--通过指定文件
 *   $import("example.ClassA",MyNamespace)//指定装载目标
 *   $import("example.ClassA",function(ClassA){alert("callback:"+ClassA)})//异步装载
 *   $import("example/class-a.js",true)//延迟装载(可获得良好特性,需要编译支持或者服务端支持)
 * </code></pre>
 * <h3>实现步骤：</h3>
 * <ul>
 *   <li>若元素未装载或依赖未装载，且为异步装载模式，先缓存需要的脚本资源</li>
 *   <li>若元素未装载或依赖未装载，且为同步非阻塞装载模式，打印预装载脚本（当前script标签的其他脚本<b>可能</b>继续运行，浏览器不同表现略有不同）;
 *    并且等待预装载脚本执行之后继续以下步骤</li>
 *   <li>若元素未装载或依赖未装载，装载之</li>
 *   <li>将该元素声明为指定目标的属性(默认目标为全局对象，这时相当于声明了全局变量)</li>
 * </ul>
 * <h3>全局对象的特殊性说明:</h3>
 * <ul>
 *   <p>全局对象的属性同时也是全局变量，可以在任何地方直接使用，<br/>
 *    也就是说：<br/>
 *    $import函数调用时，默认（未指定target）导入成全局对象属性，等价于声明了一个全局变量。</p>
 * </ul>
 * <p>
 *   <i><b>该方法为最终用户设计（页面上的脚本）,不推荐类库开发者（托管脚本）使用该函数,除非确实需要（如需要动态导入时）。类库开发者可在包中定义脚本依赖完成类似功能。</b></i>
 * </p>
 * @public
 * @param <string> path (package:Object|package.Object|package:*|package.*| scriptPath)
 * @param <Object|boolean|Function>targetocol  可选参数，指定导入容器。
 *                    当该参数未指定时，target为全局变量容器,这种情况等价于直接声明的全局变量。
 *                    当未指定第三个参数时，且target为函数或者boolean值时,target作为col参数处理，而target本身等价为未指定。
 *                    当该参数为有效对象时(instanceof Object && not instanceof Function)，导入的元素将赋值成其属性；
 * @param <Function|boolean> col callbackOrLazyLoad 可选参数,默认为null。
 *                    如果其值为函数，表示异步导入模式；
 *                    如果其值为真，表示延迟同步导入模式，否则为即时同步导入（默认如此）。
 * @return <Package|object|void> 用于即时导入时返回导入的对象
 *                    <ul>
 *                      <li>导入单个对象时:返回导入对象;</li>
 *                      <li>导入文件或者多个对象(*)时:返回导入目标;</li>
 *                      <li>导入包时:返回包对象;</li>
 *                    </ul>
 *                    <p>一般可忽略返回值.因为默认情况下,导入为全局变量;无需再显示申明了.</p>
 */
var $import = function(freeEval,cachedScripts){
    /*
     * 加载指定文本，找不到文件(404)返回null,调试时采用
     * @friend
     * @param url 文件url
     * @return <string> 结果文本
     */
    function loadTextByURL(url){
        if("org.xidea.jsi.boot:avoidBlock"){
            var req = new XMLHttpRequest();
            req.open("GET",url,false);
            //for ie file 404 will throw exception 
            //document.title = url;
            req.send('');
            if(req.status >= 200 && req.status < 300 || req.status == 304 || !req.status){
                //return  req.responseText;
                return req.responseText;
            }else{
                //debug("load faild:",url,"status:",req.status);
            }
        }else{
            //debug(url);
            //trace(url);
            //return ''; //throw new Error("uncached url:"+url)
        }
    }
    if(this.document){
        if(":debug"){
    	    /**
    		 * 方便调试的支持
    		 */
            //compute scriptBase
            var rootMatcher = /(^\w+:((\/\/\/\w\:)|(\/\/[^\/]*))?)/;
            //var rootMatcher = /^\w+:(?:(?:\/\/\/\w\:)|(?:\/\/[^\/]*))?/;
            var homeFormater = /(^\w+:\/\/[^\/#\?]*$)/;
            //var homeFormater = /^\w+:\/\/[^\/#\?]*$/;
            var urlTrimer = /[#\?].*$/;
            var dirTrimer = /[^\/\\]*([#\?].*)?$/;
            var forwardTrimer = /[^\/]+\/\.\.\//;
            var base = document.location.href.
                    replace(homeFormater,"$1/").
                    replace(dirTrimer,"");
            var baseTags = document.getElementsByTagName("base");
            var scripts = document.getElementsByTagName("script");
            /*
             * 计算绝对地址
             * @public
             * @param <string>url 原url
             * @return <string> 绝对URL
             * @static
             */
            function computeURL(url){
                var purl = url.replace(urlTrimer,'').replace(/\\/g,'/');
                var surl = url.substr(purl.length);
                //prompt(rootMatcher.test(purl),[purl , surl])
                if(rootMatcher.test(purl)){
                    return purl + surl;
                }else if(purl.charAt(0) == '/'){
                    return rootMatcher.exec(base)[0]+purl + surl;
                }
                purl = base + purl;
                while(purl.length >(purl = purl.replace(forwardTrimer,'')).length){
                    //alert(purl)
                }
                return purl + surl;
            }
            //处理HTML BASE 标记
            if(baseTags){
                for(var i=baseTags.length-1;i>=0;i--){
                    var href = baseTags[i].href;
                    if(href){
                        base = computeURL(href.replace(homeFormater,"$1/").replace(dirTrimer,""));
                        break;
                    }
                }
            }
    
            //IE7 XHR 强制ActiveX支持
            if(this.ActiveXObject && this.XMLHttpRequest && location.protocol=="file:"){
                this.XMLHttpRequest = null;
            }
            var script = scripts[scripts.length-1];
    	    if(script){
    	        //mozilla bug
    	        while(script.nextSibling && script.nextSibling.nodeName.toUpperCase() == 'SCRIPT'){
    	            script = script.nextSibling;
    	        }
    	        scriptBase = (script.getAttribute('src')||"/scripts/boot.js").replace(/[^\/\\]+$/,'');
    	        $JSI.scriptBase = computeURL(scriptBase);
            }
    
        }
    }else{
    	if("org.xidea.jsi.boot:server"){
    	    $JSI.scriptBase= "classpath:///";
    	    loadTextByURL=function(url){
    	        /*
    		     	url = url.replace(/^\w+:(\/)+(?:\?.*=)/,'$1');
    				var buf = new java.io.StringWriter();
    				var ins = buf.getClass().getResourceAsStream(url);
    				var ins = new java.io.InputStreamReader(ins,"utf-8");
    				var c;
    				while((c=ins.read())>=0){
    					buf.append(c);
    				}
    		     */
    		     url = url.replace(/^\w+:(\/)+(?:\?.*=)?/,'');
        		 return Packages.org.xidea.jsi.impl.ClasspathRoot.loadText(url)+'';
    	    }
    	}
    }
    
    if("org.xidea.jsi.boot:$log"){
        $log = function (){
            var i = 0;
            var temp = [];
            if(this == $log){
                var bindLevel = arguments[i++];
                temp.push(arguments[i++],":\n\n");
            }
            while(i<arguments.length){
                var msg = arguments[i++]
                if(msg instanceof Object){
                    temp.push(msg,"{");
                    for(var n in msg){
                        temp.push(n,":",msg[n],";");
                    }
                    temp.push("}\n");
                }else{
                    temp.push(msg,"\n");
                }
            }
            if(bindLevel >= 0){
                temp.push("\n\n继续弹出 ",temp[0]," 日志?");
                if(!confirm(temp.join(''))){
                    consoleLevel = bindLevel+1;
                }
            }else{
                alert(temp.join(''));
            }
        }
        /**
         * 设置日志级别
         * 默认级别为debug
         * @protected
         */
        $log.setLevel = function(level){
            if(logLevelNameMap[level]){
                consoleLevel = level;
            }else{
                var i = logLevelNameMap.length;
                level = level.toLowerCase();
                while(i--){
                    if(logLevelNameMap[i] == level){
                        consoleLevel = i;
                        return;
                    }
                }
                $log("unknow logLevel:"+level);
            }
        };
        /*
         * @param bindLevel 绑定函数的输出级别，只有该级别大于等于输出级别时，才可输出日志
         */
        function buildLevelLog(bindLevel,bindName){
        	var window = this;
            return function(){
                if(bindLevel>=consoleLevel){
                    var msg = [bindLevel,bindName];
                    msg.push.apply(msg,arguments);
                    $log.apply($log,msg);
                }
                if(":debug"){
                    if((typeof window && window.console == 'object') && (typeof console.log == 'function')){
                        var msg = [bindLevel,bindName];
                        msg.push.apply(msg,arguments);
                        console.log(msg.join(';'))
                        
                    }
                }
            }
        }
        var logLevelNameMap = "trace,debug,info,warn,error,fatal".split(',');
        var consoleLevel = 1;
        /* 
         * 允许输出的级别最小 
         * @hack 先当作一个零时变量用了
         */
        var logLevelIndex = logLevelNameMap.length;
        //日志初始化 推迟到后面，方便var 压缩
    }
    var packageMap = {};
    var scriptBase = $JSI.scriptBase;
    if("org.xidea.jsi.boot:col"){
        var lazyTaskList = [];
        var lazyScript ="<script src='data:text/javascript,$import()'></script>";
        //
        /*
         * 缓存清单计算
         * data[0] = true 全部需要装载了
         * data[object] = true 对象需要装载了
         * 
         * data[1] = true 标识单元尚未装载并且没有缓存（统计缓存清单的数据源）
         */
        function appendCacheFiles(cacheFileMap,packageObject,file,object){
            packageObject.initialize && packageObject.initialize();
            var path = packageObject.name.replace(/\.|$/g,'/') + file;
            //data[0] 装载状态
            //data[1] 脚本是否无需再缓存
            var data = cacheFileMap[path];
            var loader = packageObject.loaderMap[file];
            
            //开始设置状态
            if(data){//无需再与装载系统同步，此时data[1]一定已经设置了正确的值
                if(data[0]){//已经装载了，也就是已经统计了，不必重复
                    return;
                }else{
                    if(object){
                        if(data[object]){//已经装载了，也就是已经统计了，不必重复
                            return;
                        }else{
                            data[object] = 1;//这次会装载了，下次就不必再重复了
                        }
                    }else{
                        //完全装载了
                        data[0] = 1;
                    }
                }
            }else{//未装载，先用实际装载的信息填充之
                cacheFileMap[path] = data = {}
                //更新该装载节点状态
                data[object||0] = 1;
                //表示缓存数据是否空缺
                 data[1] = !loader && getCachedScript(packageObject.name,file) == null ;
            }
            
            
            //以下是统计依赖
            if(loader){//事实上单元已经装载
                //dependenceMap 再下一个分支中声明了，怪异的js：（
                if(deps = loader.dependenceMap){
                    //deps[0]是绝对不可能存在的！！
                    if(object){
                        var deps = deps[object];
                        var i = deps && deps.length;
                        while(i--){
                            var dep = deps[i];
                            appendCacheFiles(cacheFileMap,dep[0],dep[1],dep[2])
                        }
                    }
                    for(object in deps){
                        var deps2 = deps[object];
                        var i = deps2.length;
                        while(i--){
                            var dep = deps2[i];
                            appendCacheFiles(cacheFileMap,dep[0],dep[1],dep[2])
                        }
                    }
                }else{
                    //没有依赖，标识为全部装载完成
                    data[0] = 1;
                    //同时完成该节点
                    //return;
                }
            }else{
                var deps = packageObject.dependenceMap[file];
                var i = deps && deps.length;
                while(i--){
                    var dep = deps[i];
                    var key = dep[3];
                    if(!object || !key || object == key){
                        appendCacheFiles(cacheFileMap,dep[0],dep[1],dep[2]);
                    }
                }
            }
        }
    }
    //这段代码放在后面，仅仅是为了区区4个字节的压缩。
    if("org.xidea.jsi.boot:$log"){
        while(logLevelIndex--){
            var logName = logLevelNameMap[logLevelIndex];
            $log[logName] = buildLevelLog(logLevelIndex,logName);
        };

    }
    /*
     * 获取脚本缓存。
     * @private
     * @param <string>packageName 包名
     * @param <string>fileName 文件名
     */
    function getCachedScript(pkg,fileName){
        return (pkg = cachedScripts[pkg]) && pkg[fileName];
    };
    /**
     * 缓存脚本。
     * @public
     * @param <string>packageName 包名
     * @param <string>key 文件相对路径
     * @param <string|Function>value 缓存函数或文本
     */
    $JSI.preload = function(pkg,file2dataMap,value){
        if(cachedScripts[pkg]){ //比较少见
            pkg = cachedScripts[pkg];
            if(value == null){//null避免空串影响
                for(var n in file2dataMap){
                    pkg[n] = file2dataMap[n];
                }
            }else{
                pkg[file2dataMap] = value;
            }
        }else {
            if(value == null){//null避免空串影响
                cachedScripts[pkg] = file2dataMap;
            }else{
              (cachedScripts[pkg] = {})[file2dataMap] = value;
            }
        }
    };
    //模拟XMLHttpRequest对象
    if(this.ActiveXObject ){
        if("org.xidea.jsi.boot:col"){
            if(":debug"){
                lazyScript =lazyScript.replace(/'.*'/,scriptBase+"?path=lazy-trigger.js");
            }else{
                lazyScript =lazyScript.replace(/'.*'/,scriptBase+"lazy-trigger.js");
            }
        }
        if(!this.XMLHttpRequest ){
            var xmlHttpRequstActiveIds = [
                //"Msxml2.XMLHTTP.6.0,"  //都IE7了，罢了罢了
                //"Msxml2.XMLHTTP.5.0,"  //office 的
                //"Msxml2.XMLHTTP.4.0,"
                //"MSXML2.XMLHTTP.3.0,"  //应该等价于MSXML2.XMLHTTP
                "MSXML2.XMLHTTP",
                "Microsoft.XMLHTTP"//IE5的，最早的XHR实现
                ];
            /**
             * 统一的 XMLHttpRequest 构造器（对于ie，做一个有返回值的构造器（这时new操作返回该返回值），返回他支持的AxtiveX控件）
             * 关于 XMLHttpRequest对象的详细信息请参考
             * <ul>
             *   <li><a href="http://www.w3.org/TR/XMLHttpRequest/">W3C XMLHttpRequest</a></li>
             *   <li><a href="http://www.ikown.com/manual/xmlhttp/index.htm">中文参考</a></li>
             *   <li><a href="http://msdn2.microsoft.com/en-us/library/ms762757(VS.85).aspx">MSXML</a></li>
             * </ul>
             * @id XMLHttpRequest 
             * @constructor
             */
            this.XMLHttpRequest = function(){
                while(true){
                    try{
                         return new ActiveXObject(xmlHttpRequstActiveIds[0]);
                    }catch (e){
                        if(!xmlHttpRequstActiveIds.shift()){
                            throw e;//not suport
                        }
                    }
                }
            };
        }
    }
    /**
     * 包信息数据结构类<b> &#160;(JSI 内部对象，普通用户不可见)</b>.
     * <p>在包目录下，有个包定义脚本（__package__.js）；
     * 在包的构造中执行这段脚本，执行中，this指向当前包对象</p>
     * <p>其中,两个常用方法,<a href="#Package.prototype.addScript">addScript</a>,<a href="#Package.prototype.addDependence">addDependence</a></p>
     * <p>该对象不应该在任何的方修改.</p>
     * @public
     * @constructor
     * @implicit
     * @param <string>name 包名（必须为真实存在的包）
     * @param <string>pscript 定义脚本
     */
    function Package(name,pscript){
        /*
         * 注册包
         */
        /**
         * 包名 
         * @private
         * @readonly
         * @typeof string
         * @id Package.this.name
         */
        packageMap[this.name = name] = this;

        /**
         * 包脚本路径目录 2
         * @private
         * @readonly
         * @typeof string
         */
        this.scriptBase = scriptBase+(name.replace(/\./g,'/'))+ '/';
        /**
         * 包脚本依赖  
         * 起初作为一个数组对象临时存储 依赖信息。
         * <code>
         * {[thisPath1,targetPath1,afterLoad],...}</code>
         * initialize成员方法调用后。
         * 将变成一个依赖表、且计算完全部包内匹配
         * <code>
         * [targetPackage, targetFileName, targetObjectName,thisObjectName, afterLoad, names]
         * </code>
         * 该值初始化后为Object实例,且一定不为空.
         * @private
         * @readonly
         * @typeof object
         */
        this.dependenceMap = [];
        /**
         * 脚本装载器表{scriptPath:ScriptLoader}
         * @private
         * @readonly
         * @typeof object
         */
        this.loaderMap = {};
        /**
         * 脚本->对象表{scriptPath:objectName}
         * object名为类名或包名 如<code>YAHOO</code>
         * @private
         * @typeof object
         * @readonly
         */
        this.scriptObjectMap = {};
        /**
         * 对象->脚本表{objectName:scriptPath}
         * object名为全名 如<code>YAHOO.ui.Color</code>
         * @private
         * @readonly
         * @typeof object
         */
        this.objectScriptMap = {};
        /**
         * 存储顶级对象的表.
         * 比如yahoo ui 的objectMap = {YAHOO:?}
         * prototype 的objectMap = {$:?,$A:? ....}
         * @private
         * @readonly
         * @typeof object
         * @owner Package.this
         */
        this.objectMap = {};
        
        try{
            if(pscript instanceof Function){
                pscript.call(this);
            }else{
                freeEval.call(this,pscript);
            }
        }catch(e){
            if(":debug"){
                //packageMap[name] = null;
                if("org.xidea.jsi.boot:$log"){
                    $log.error("Package Syntax Error:["+name+"]\n\nException:"+e);
                }
            }
            throw e;
        }

    }


    Package.prototype = {

        /**
         * 初始化 包依赖信息.
         * @private
         * @typeof function
         * @param
         */
        initialize : function(){
            //hack for null
            this.initialize = 0;
            //cache attributes
            var thisObjectScriptMap = this.objectScriptMap;
            var thisScriptObjectMap = this.scriptObjectMap;
            var list = this.dependenceMap;
            var map = {};
            var i = list.length;
            while(i--){
                var dep = list[i];
                var thisPath = dep[0];
                var targetPath = dep[1];
                var afterLoad = dep[2];
                if(":debug"){
                    if(!targetPath){
                        if("org.xidea.jsi.boot:$log"){
                            $log.error("依赖异常",dep.join('\n'),list.join('\n'));
                        }
                    }
                }
    
                //循环内无赋值变量声明应特别小心。函数变量
                var targetPackage = this;
                //hack for null
                var thisObjectName = 0;
                //hack for null
                var targetObjectName = 0;
                //hack for distinctPackage = false
                var distinctPackage = 0;
                var allSource = "*" == thisPath;
                var allTarget = targetPath.indexOf("*")+1;
                
                if (allSource || allTarget) {
                    var targetFileMap;
                    if (allSource) {
                        var thisFileMap = thisScriptObjectMap;
                    } else {
                        var thisFileName = thisObjectScriptMap[thisPath];
                        if (thisFileName) {
                            thisObjectName = thisPath;
                        } else {
                            thisFileName = thisPath;
                        }
                        (thisFileMap = {})[ thisFileName ]= 0;
                    }
                    if (allTarget) {
                        if (allTarget>1) {
                            targetPackage = realPackage(findPackageByPath(targetPath));
                            distinctPackage = 1;
                        }
                        targetFileMap = targetPackage.scriptObjectMap;
                    } else {
                        var targetFileName = thisObjectScriptMap[targetPath];
                        if(targetFileName){
                            targetObjectName = targetPath;
                        }else if(thisScriptObjectMap[targetPath]){
                            targetFileName = targetPath;
                            //targetObjectName = null;
                        }else{
                            distinctPackage = 1;
                            if(":debug"){
                                if(!targetPath){
                                    throw new Error("targetPath 不能为空")
                                }
                            }
                            targetPackage = findPackageByPath(targetPath);
                            if(":debug"){
                                if(!targetPackage){
                                    $log.error("targetPath:"+targetPath+" 不是有效对象路径",this.name);
                                }
                            }
                            targetPath = targetPath.substring(targetPackage.name.length + 1);
                            targetPackage = realPackage(targetPackage);
                            //targetObjectName = null;
                            var targetFileName = targetPackage.objectScriptMap[targetPath];
                            if (targetFileName) {
                                targetObjectName = targetPath;
                            } else {
                                targetFileName = targetPath;
                            }
                        }
                        (targetFileMap = {})[ targetFileName ]= 0;
                    }
                    for (var targetFileName in targetFileMap) {
                        var dep = [targetPackage, targetFileName, targetObjectName,thisObjectName,afterLoad,
                                      targetObjectName ? [targetObjectName.replace(/\..*$/,'')]
                                                       :targetPackage.scriptObjectMap[targetFileName]]
                        for (var thisFileName in thisFileMap) {
                            if (distinctPackage || thisFileName != targetFileName) {
                                (map[thisFileName] || (map[thisFileName] = [])).push(dep);
                            }
                        }
                    }
                } else {
                    var thisFileName = thisObjectScriptMap[thisPath];
                    var targetFileName = thisObjectScriptMap[targetPath];
                    if (thisFileName) {//is object
                        thisObjectName = thisPath;
                    } else {
                        thisFileName = thisPath;
                    }
                    if(targetFileName){
                        targetObjectName = targetPath;
                    }else if(thisScriptObjectMap[targetPath]){
                        targetFileName = targetPath;
                    }else{
                        if(":debug"){
                            if(!targetPath){
                                throw new Error("targetPath 不能为空")
                            }
                        }
                        targetPackage = findPackageByPath(targetPath);
                        if(":debug"){
                            if(!targetPackage){
                                $log.error("targetPath:"+targetPath+" 不是有效对象路径",this.name);
                            }
                        }
                        targetPath = targetPath.substr(targetPackage.name.length + 1);
                        targetPackage = realPackage(targetPackage);
                        var targetFileName = targetPackage.objectScriptMap[targetPath];
                        if (targetFileName) {
                            targetObjectName = targetPath;
                        } else {
                            targetFileName = targetPath;
                        }
                    }
                    (map[thisFileName] || (map[thisFileName] = [])).push(
                        [targetPackage, targetFileName, targetObjectName,thisObjectName,afterLoad,
                                  targetObjectName ? [targetObjectName.replace(/\..*$/,'')]
                                                   :targetPackage.scriptObjectMap[targetFileName]]
                    );
                }
    
            }
            this.dependenceMap = map;
        },

        /**
         * 添加脚本及其声明的对象（函数、方法名）。
         * 需要指定脚本位置（必须在当前包目录中），元素名(可用数组，同时指定多个)。
         * <i>该成员函数只在包定义文件（__package__.js）中调用 </i>
         * @public
         * @typeof function
         * @param <string>scriptPath 指定脚本路径
         * @param <string|Array>objectNames [opt] 字符串或其数组
         * @param <string|Array>beforeLoadDependences [opt] 装在前依赖
         * @param <string|Array>afterLoadDependences [opt] 装在后依赖
         */
        addScript :  function(scriptPath, objectNames, beforeLoadDependences, afterLoadDependences){
            var objects = this.scriptObjectMap[scriptPath];
            if(objects){
                var previousObject = objects[objects.length-1];
            }else{
                objects = (this.scriptObjectMap[scriptPath] = []);
            }
            if(":debug"){
                if(objectNames == '*'){
                    $log.trace("部署后不应出现的配置，需要压缩处理掉相关问题！！！");
                    objectNames = doObjectImport(
                        realPackage(
                        	findPackage("org.xidea.jsidoc.util",true)
                        ),"findGlobals")(getCachedScript(this.name,scriptPath)||loadTextByURL(scriptBase+"?path="+this.name.replace(/\.|$/g,'/')+scriptPath));
                    
                }
            }
            if(objectNames){
                if(objectNames instanceof Array){
                    for(var i = 0,len = objectNames.length;i<len;i++){
                        var object = objectNames[i];
                        this.objectScriptMap[object] = scriptPath;
                        object = object.replace(/\..*$/,'');
                        if(previousObject != object){
                            objects.push(previousObject = object);
                        }
                    }
                }else{
                    this.objectScriptMap[objectNames] = scriptPath;
                    objectNames = objectNames.replace(/\..*$/,'');
                    if(previousObject != objectNames){
                        objects.push(objectNames);
                    }
                }
            }
            beforeLoadDependences && this.addDependence(scriptPath, beforeLoadDependences);
            afterLoadDependences && this.addDependence(scriptPath, afterLoadDependences,1);
        },
        /**
         * 添加脚本依赖。
         * 需要指定当前脚本文件或者脚本元素位置（必须在当前包目录中）、
         * 被依赖的脚本文件或者脚本元素位置(当前包中的脚本，或者通过抽象路径指定其他包中的脚本)、
         * 是否需要执行前导入(装载期依赖)。
         * <i>该成员函数只在包定义文件（__package__.js）中调用 </i>
         * @public
         * @typeof function
         * @param thisPath 本包中当前脚本文件或者脚本元素，使用*可表示当前该包中已添加全部脚本文件（将逐一添加同样的依赖）。
         * @param targetPath 依赖的脚本文件抽象路径（可不包括最后的版本包）或者脚本元素抽象路径
         * @param afterLoad 可选参数(默认为false) 是否可以执行后导入(运行期依赖)
         */
        addDependence : function(thisPath,targetPath,afterLoad){
            if(targetPath instanceof Array){
                var i = targetPath.length;
                while(i--){
                    this.addDependence(thisPath,targetPath[i],afterLoad);
                }
            }else{
                //TODO:可编译优化,进优化的脚本可以直接删除此运行时优化
                if("org.xidea.jsi.boot:dependenceOptimize"){
                    if(!afterLoad ){
                        thisPath = this.objectScriptMap[thisPath] || thisPath;
                    }
                    /* 还是没有想好怎么搞相对路径
                    if(targetPath.charAt(0) == '.'){
                        if(/\w\//.test(targetPath)){
                            
                        }
                        targetPath = this.name + targetPath;
                        while(targetPath!=(targetPath = targetPath.replace(/\w+\.\.\//,'')));
                    }
                    */
                }
                this.dependenceMap.push([thisPath,targetPath,afterLoad]);
            }
            
        },
    
        /**
         * 设置具体实现包名,用于版本管理,不常用。
         * 比如，我们可以给prototype库一个统一的包，
         * 但是我们的内容都放在具体的实现版本里，
         * 我们可以通过该设置（setImplementation(".v1_5");）来指定默认的具体实现版本。
         * <i>该成员函数只在包定义文件（__package__.js）中调用 </i>
         * @public
         * @typeof function
         * @param <String> packagePath 指定实现包名，全路径(ID(.ID)*)或相对路径（"." 开始的为本包下的相对路径）
         */
        setImplementation : function(packagePath){
            if(packagePath.charAt(0) == '.'){
                packagePath = this.name + packagePath;
                while(packagePath != (packagePath = packagePath.replace(/\w+\.\.\//,'')));
            }
            this.implementation = packagePath;
        }
        //,constructor : Package
    };
//奇怪的问题
//    if("org.xidea.jsi.boot:exportPackage"){
//        Package.prototype.constructor = Package; 
//    }


//    if("org.xidea.jsi.boot:exportPackage"){
//        $JSI.Package = Package; 
//    }


    
    /*
     * 创建一个新的类加载器，加载指定脚本
     * @private
     * @typeof function
     * @param packageObject 指定的脚本文件名
     * @param scriptPath 指定的脚本文件名
     * @param object 需要装载的对象 * 代表全部元素
     */
     function loadScript(packageObject,fileName,object){
        var loader = packageObject.loaderMap[fileName];
        if(!loader){
            //trace("load script path:",packageObject.scriptBase ,fileName);
            if(packageObject.scriptObjectMap[fileName]){
                //不敢确认是否需要延迟到这里再行初始化操作
                if(packageObject.initialize){
                    packageObject.initialize();
                }
                loader = new ScriptLoader(packageObject,fileName);
            }else{
                //TODO: try parent
                if(":debug"){
                    throw new Error('Script:['+fileName+'] Not Found')
                }
            }
        }
        if(loader.initialize){
            //trace("object loader initialize:",packageObject.scriptBase ,fileName);
            loader.initialize(object);
        }
    }
    /*
     * Dependence 的第二种设计
     * Dependence = [0            , 1             , 2               , 3            ,4         ,5    ]
     * Dependence = [targetPackage, targetFileName, targetObjectName,thisObjectName, afterLoad,names]
     * afterLoad,thisObject 有点冗余
     */
    function loadDependence(data,vars){
        loadScript(data[0],data[1],data[2]);
        var objectMap = data[0].objectMap;
        var names = data[5];
        var i = names.length;
        while(i--){
            var name = names[i];
            vars.push(name);//对于转载后依赖，我们使用重复设置了一次
            vars[name] = objectMap[name];
        }
    }
    /*
     * 获取指定实现包(不存在则加载之)
     * @intenal
     * @param <string>name 包名
     */
    function realPackage(packageObject){
        if(":debug"){
            if(!packageObject){
                alert('包对象不能为空:'+arguments.callee)
            }
        }
        while(packageObject && packageObject.implementation){
            packageObject = findPackage(packageObject.implementation,true);
        }
        return packageObject;
    }
    
    /*
     * 获取指定包,抽象包也行(不存在则加载之)
     * TODO:可编译优化 cacheAllPackage,不必探测空包
     * @intenal
     * @param <string>name 包名
     * @param <boolean>exact 准确名，不需可上溯探测父包
     */
    function findPackage(name,exact){
        do{
            if(packageMap[name]){
                return packageMap[name];
            }
            
            if(packageMap[name] === undefined){
                if(":debug"){
                    var pscript = getCachedScript(name,'') ||
                        loadTextByURL(scriptBase+"?path="+name.replace(/\.|$/g,'/')+ '__package__.js');
                }else{
                    var pscript = getCachedScript(name,'') ||
                        cachedScripts[name] === undefined && loadTextByURL(scriptBase+name.replace(/\.|$/g,'/')+ '__package__.js');
                }
                if(pscript){
                    return packageMap[name] || new Package(name,pscript);
                }
                //注册空包，避免重复探测
                //hack for null
                packageMap[name] = 0;
            }
            if(exact){
                break;
            }
        }while(name = name.replace(/\.?[^\.]+$/,''));
    }
    /*
     * 获取指定对象路径的对应包
     */
    function findPackageByPath(path){
        var p = path.lastIndexOf('/');
        if(p>0){
            return findPackage(path.substr(0,p).replace(/\//g,'.'),true);
        }else if((p = path.indexOf(':'))>0){
            return findPackage(path.substr(0,p),true);
        }else{
            return findPackage(path.replace(/\.?[^\.]+$/,''));
        }
    }


    /**
     * 脚本装载器<b> &#160;(JSI 内部对象，普通用户不可见)</b>.
     * 该对象的属性可以在JSI托管脚本内调用,但是,如果你使用了这些属性,你的脚本就无法脱离JSI环境(导出).
     * <pre><code>eg:
     *   var scriptBase = this.scriptBase;//获取当前脚本所在的目录
     * </code></pre>
     * @constructor
     * @protected
     * @implicit
     * @param <Package> packageObject 包对象
     * @param <string> fileName 脚本名 
     */
    function ScriptLoader(packageObject,fileName){
        /**
         * 脚本名，可在托管脚本顶层上下文（非函数内）访问，<code>this&#46;name</code>
         * @friend
         * @typeof string 
         */
        this.name = fileName;

        //DEBUG:ScriptLoader[this.name] = (ScriptLoader[this.name]||0)+1;
        /**
         * 脚本目录，可在托管脚本顶层上下文（非函数内）访问，<code>this&#46;scriptBase</code>
         * @friend
         * @typeof string 
         */
        this.scriptBase = packageObject.scriptBase;
        /**
         * 脚本的装在后依赖集合
         * 脚本依赖键为0
         * 对象依赖的键为对象名称
         * 其与initialize共存亡
         * @private
         * @id ScriptLoader.this.dependenceMap
         * @typeof object 
         */
        //this.dependenceMap = null;
        
        var loader = prepareScriptLoad(packageObject,this)
        if(loader){
            return loader;
        }
        doScriptLoad(packageObject,this);
    };
    /*
     * 前期准备，初始化装载单元的依赖表，包括依赖变量申明，装载前依赖的装载注入
     * @private
     */
    function prepareScriptLoad(packageObject,loader){
        var name = loader.name;
        var deps = packageObject.dependenceMap[name];
        var varText = 'this.hook=function(n){return eval(n)}';
        var vars = [];
        var i = deps && deps.length;
        while(i--){
            var dep = deps[i];
            var key =  dep[3] || 0;
            if(dep[4]){//记录依赖，以待装载
                vars.push.apply(vars,dep[5]);
                if(map){
                    if(map[key]){
                        map[key].push(dep);
                    }else{
                        map[key] = [dep]
                    }
                }else{
                    //函数内只有一次赋值（申明后置，也就你JavaScript够狠！！ ）
                    var map = loader.dependenceMap = {};
                    loader.initialize = ScriptLoader_initialize;
                    map[key] = [dep]
                }
            }else{//直接装载（只是装载到缓存对象，没有进入装载单元），无需记录
                //这里貌似有死循环的危险
                loadDependence(dep,vars);
                if(dep = packageObject.loaderMap[name]){
                    return dep;
                }
            }
        }
        if(vars.length){
            loader.varMap = vars;
            varText += ';var '+vars.join(',').replace(/([^,]+)/g,'$1 = this.varMap.$1');
        }
        loader.varText = varText;
    }
    

    /*
     * 装载脚本
     * 这里没有依赖装载，装载前依赖装载在prepareScriptLoad中完成，装载后依赖在ScriptLoader.initialize中完成。
     * @private 
     */
    function doScriptLoad(packageObject,loader){
        var loaderName = loader.name;
        var packageName = packageObject.name;
        var cachedScript = getCachedScript(packageName,loaderName);
        packageObject.loaderMap[loaderName] = loader;
        try{
            //ScriptLoader[loaderName] += 0x2000
            
            if(cachedScript instanceof Function){
                //$JSI.preload(pkgName,loaderName,'')
                cachedScripts[packageName][loaderName]='';//clear cache
                return cachedScript.call(loader);
            }else{
                if(":debug"){
                    
//            	    if(loaderName == 'show-detail.js'){
//            	        $log.error(loaderName,loader)
//                  }
                    //不要清除文本缓存
                    return freeEval.call(loader,'eval(this.varText);'+(cachedScript || loadTextByURL(scriptBase+"?path="+packageObject.name.replace(/\.|$/g,'/')+loaderName)));
//            	    if(loaderName == 'show-detail.js'){
//            	        $log.error(loaderName,loader)
//                  }
                }else{
                     //不要清除文本缓存
                    return freeEval.call(loader,'eval(this.varText);'+(cachedScript || loadTextByURL(packageObject.scriptBase+loaderName)));
                }
            }
            //ScriptLoader[loaderName] += 0x10000
            
        }catch(e){
            if(":debug"){
                if("org.xidea.jsi.boot:$log"){
                    $log.error("Load Error:\n"+loader.scriptBase + loaderName+"\n\nException:"+e);
                }
            }
            throw e;
        }finally{
            delete loader.varMap ;
            delete loader.varText ;
            var names = packageObject.scriptObjectMap[loaderName];
            var index = names.length;
            var objectMap = packageObject.objectMap;
            //此处优化不知有无作用
            if(index == 1){
                objectMap[names = names[0]] = loader.hook(names);
            }else{
                var values = loader.hook('['+names.join(',')+']');
                while(index--){
                    objectMap[names[index]] = values[index];
                }
            }
        }
    }
    /*
     * 初始化制定对象，未指定代表全部对象，即当前转载单元的全部对象
     * @private
     */
    function ScriptLoader_initialize(object){
        //也一定不存在。D存I存，D亡I亡
        var dependenceMap = this.dependenceMap;
        var vars = [];
        var loaderName = this.name;
        var dependenceList = dependenceMap[0];
        if(dependenceList){
            //一定要用delete，彻底清除
            delete dependenceMap[0];
            var i = dependenceList.length;
            while(i--){
                //alert("ScriptLoader#initialize:"+loaderName+"/"+dep.getNames())
                loadDependence(dependenceList[i],vars);
            }
        }
        //这里进行了展开优化，有点冗余
        if(object){//装载对象
            if(dependenceList = dependenceMap[object]){
                //一定要用delete，彻底清除
                delete dependenceMap[object];
                var i = dependenceList.length;
                while(i--){
                    loadDependence(dependenceList[i],vars);
                }
            }
            //谨慎，这里的i上面已经声明，不过，他们只有两种可能，undefined和0 
            for(var i in dependenceMap){
                  break;
            }
            if(!i){
                //initialize 不能delete
                this.dependenceMap = this.initialize = 0;
            }
        }else{//装载脚本
            for(var object in dependenceMap){
                var dependenceList = dependenceMap[object];
                delete dependenceMap[object];
                var i = dependenceList.length;
                while(i--){
                    loadDependence(dependenceList[i],vars);
                }
            }
            //initialize 不能delete
            this.dependenceMap = this.initialize = 0;
        }
        if(vars.length){
            this.varMap = vars;
            vars = vars.join(',');
            try{
            	this.hook(vars.replace(/([^,]+)/g,'$1 = this.varMap.$1'));
            }catch(e){
            	$log.debug("奇怪的状态",
            	    this.varMap,this,
            	    this.constructor,
            	    this.hook == null,
            	   "status"+ScriptLoader[loaderName].toString(16)
            	)
            	throw e;
            }
            delete this.varMap;
        }
    }
    function doObjectImport(packageObject,objectName,target){
        //do load
        loadScript(packageObject,packageObject.objectScriptMap[objectName],objectName,true);
        var pos2obj = objectName.indexOf('.');
        if(pos2obj>0){
            objectName = objectName.substr(0,pos2obj)
        }
        //p 为对象,节省个变量
        pos2obj = packageObject.objectMap[objectName];
        //null不可hack
        return target!=null?target[objectName]=pos2obj:pos2obj;
    }
    function doScriptImport(packageObject,fileName,target){
        loadScript(packageObject,fileName);
        var objectNames = packageObject.scriptObjectMap[fileName];
        //null不可hack
        if(target != null){
            for(var i = 0; i<objectNames.length;i++){
                target[objectNames[i]]=packageObject.objectMap[objectNames[i]];
            }
        }
    }
    if("org.xidea.jsi.boot:col"){
    	var lazyScriptParentNode;//defined later
        var lazyCacheFileMap = {};
        function appendCacheScript(path,callback){
            //callback = wrapCallback(callback,pkg,file);
            var script = document.createElement("script");
            lazyScriptParentNode.appendChild(script);
            function onload(){//complete
                if(callback && (this.readyState==null || /complete|loaded/.test(this.readyState))){
                    callback();
                    callback = null;
                }
            }
            script.onload = onload;
            script.onreadystatechange = onload;
            if(":debug"){
                script.src=scriptBase +"?path="+ path.replace(/\.js$/,'__preload__.js');
            }else{
                script.src=scriptBase + path.replace(/\.js$/,'__preload__.js');
            }
            script = null;
        }
       
        function doAsynLoad(path,target,col,requiredCache){
            (function asynLoad(){
                if(requiredCache.length){
                    while(getCachedScript.apply(0,requiredCache[0])!=null){
                        if(requiredCache.length > 1){
                            requiredCache[0] = requiredCache.pop()
                        }else{
                            col($import(path,target));
                            return;
                        }
                    }
                    setTimeout(asynLoad,15);
                }else{
                    col($import(path,target));
                }
            })()
        }
        function lazyImport(path,target,col){
        	lazyScriptParentNode = lazyScriptParentNode || document.body||document.documentElement;
            var pkg = findPackageByPath(path);
            var fileName = path.substr(pkg.name.length+1)
            var list = [];
            var cacheFileMap = [];
            pkg = realPackage(pkg);
            
            if(":debug"){
                var t1 = new Date();
            }
            if(fileName == '*'){
                for(var fileName in pkg.scriptObjectMap){
                    appendCacheFiles(cacheFileMap,pkg,fileName);
                }
            }else {
                if(path.indexOf('/')+1){
                    appendCacheFiles(cacheFileMap,pkg,fileName);;
                }else{
                    appendCacheFiles(cacheFileMap,pkg,pkg.objectScriptMap[fileName],fileName);;
                }
            }
            if(":debug"){
                var t2 = new Date();
            }
            if(col instanceof Function){
                for(var filePath in cacheFileMap){//path --> filePath
                    if(cacheFileMap[filePath][1]){
                        list.push(filePath);
                    }
                }
                cacheFileMap = [];
                function next(){
                    if(filePath = list.pop()){
                        var pkg = filePath.replace(/\/[^\/]+$/,'').replace(/\//g,'.');
                        var file = filePath.substr(pkg.length+1);
                        if(getCachedScript(pkg,file)==null){//谨防 ''
                            appendCacheScript(filePath,next);
                            cacheFileMap.push([pkg,file]);
                        }else{
                            next();
                        }
                    }else{//complete..
                        if(":debug"){
                            var t3 = new Date();
                        }
                        doAsynLoad(path,target,col,cacheFileMap)
                        if(":debug"){
                            $log.trace("异步装载("+path+")：前期依赖计算时间、缓存时间、装载时间 分别为："
                                    ,t2-t1,t3-t2,new Date()-t3);
                        }
                    }
                }
                next();
            }else{
            	if(lazyScriptParentNode.tagName < 'a'){
	                for(var filePath in cacheFileMap){//path --> filePath
	                    if(cacheFileMap[filePath][1] && !lazyCacheFileMap[filePath]){
	                        lazyCacheFileMap[filePath] = true;//已经再装载队列中了
	                        list.push(filePath);
	                    }
	                }
	                if(":debug"){
	                    if(location.protocol == 'file:'){
	                        //alert(scriptBase+list[0].replace(/.js$/gm,"__preload__.js"))
	                        try{
	                        	//WHY???
	                            //loadTextByURL(scriptBase+list[0].replace(/.js$/gm,"__preload__.js"))
	                            document.write(list.join("\n").
	                                replace(/.js$/gm,"__preload__.js").
	                                replace(/.+/g,"<script src='"+scriptBase+"?path=$&' onerror='return alert'></script>"));
	                        }catch(e){
	                        }
	                    }else{
	                        document.write(list.join("\n").
	                                replace(/\.js$/gm,'__preload__.js').
	                                replace(/.+/g,"<script src='"+scriptBase+"?path=$&'></script>"));
	                    }
	                }else{
	                    document.write(list.join("\n").
	                                replace(/.js$/gm,"__preload__.js").
	                                replace(/.+/g,"<script src='"+scriptBase+"$&'></script>"))
	                }
	                lazyTaskList.push(function(){
	                        while(filePath = list.pop()){
	                            delete lazyCacheFileMap[filePath];//无需再记录了
	                        }
	                        if(":debug"){
	                            var t3 = new Date();
	                        }
	                        $import(path,target)
	                        if(":debug"){
	                            $log.trace("延迟装载("+path+")：前期依赖计算时间、缓存时间、装载时间 分别为："
	                                    ,t2-t1,t3-t2,new Date()-t3);
	                        }
	                    });
	                document.write(lazyScript);
	            }else{
	            	$import(path,target);
	            }
            }
        }
    }
    /*
     * 即JSI 的$import函数
     */
    return function(path,target,col){
        if(/\:$/.test(path)){
            return realPackage(findPackageByPath(path));
        }
        switch(arguments.length){
        case 0:
            col = lazyTaskList.shift();
            if(":debug"){
                if(!(col instanceof Function)){
                    if("org.xidea.jsi.boot:$log"){
                        $log.error("延迟导入错误，非法内部状态！！ ");
                    }
                }
            }
            //hack return void;
            return col && col();
        case 1:
            target = this;
            break;
        case 2:
            switch(typeof target){
            case 'boolean':
            case 'function':
                col = target;
                target = this;
            }
        }
        if("org.xidea.jsi.boot:col"){
            if(col){
                return lazyImport(path,target,col); 
            }
        }
        var pkg2obj = findPackageByPath(path);
        var objectName = path.substr(pkg2obj.name.length+1);
        if(path.indexOf('/')+1){//path.indexOf('/') == -1
            doScriptImport(realPackage(pkg2obj),objectName,pkg2obj = target);
        }else{
            pkg2obj = realPackage(pkg2obj);
            if(objectName){
                if(objectName == '*'){
                    for(var fileName in pkg2obj.scriptObjectMap){
                        doScriptImport(pkg2obj,fileName,target);
                    }
                    //reuse pkg2obj variable
                    pkg2obj =  target;
                }else{
                    //reuse pkg2obj variable
                    pkg2obj =  doObjectImport(pkg2obj,objectName,target);
                }
            }
        }
        return pkg2obj;
    }
}(function(){return eval(arguments[0]);},{});
$JSI.preload("org.xidea.jsidoc.export",'',function(){this.setImplementation("org.xidea.jsidoc")});
$JSI.preload("org.xidea.jsidoc",'',function(){
this.addScript("jsidoc.js",["JSIDoc",'DependenceInfo','Exporter','ExportUI'],['org.xidea.jsidoc.util.*']);
});
$JSI.preload("org.xidea.jsidoc",'jsidoc.js',function(){eval(this.varText);
		/*
 * Compressed by JSA(www.xidea.org)
 */
function E($){var A=window.location.search,E=false;if(A&&A.length>2){var C=/([^\?=&]*)=([^=&]*)/g,_;while(_=C.exec(A)){var B=decodeURIComponent(_[1]),D=decodeURIComponent(_[2]);if(D)if(B=="group"){D=JSON.decode(D);for(B in D){$.push(B);$[B]=D[B];E=true}}else if(B=B.replace(/^group\.(.+)|.+/,"$1")){$.push(B);$[B]=D.split(",");E=true}}}return E}function P(C){var B,$=parent;while($&&$!=top){B=$.location.hash;if(B){var _=JSON.decode(B.substring(1)),A="未命名分组";C.push(A);groupPackages=C[A]=[];for(var D in _){if(D)groupPackages.push(D);L(D,_[D])}return true}$=$.parent}}function I(){var $=document.getElementById("content").contentWindow;if(N)clearInterval(N);N=setInterval(function(){var _=decodeURIComponent(Q.hash.substr(1)),A=$.location;if(_&&_!=A.href)A.replace(_)},100)}var JSIDoc={prepare:function(){var _=[];P(_)||E(_);I();if(_.length==0){var $="托管脚本示例";_.push($);_[$]=["example","example.alias","example.internal","example.dependence"]}JSIDoc.addPackageMap(_);setTimeout(function(){document.getElementById("menu").setAttribute("src","html/controller.html?@menu")},100)},addPackageMap:function(H,E){this.rootInfo=C.requireRoot();this.packageInfoGroupMap=this.packageInfoGroupMap||[];this.packageInfoMap=this.packageInfoMap||{};for(var D=0;D<H.length;D++){var B=H[D],G=H[B],G=A(G,E),I=this.packageInfoGroupMap[B];if(!I){this.packageInfoGroupMap[B]=I=[];this.packageInfoGroupMap.push(B)}$:for(var $=0;$<G.length;$++){var F=C.require(G[$]),_=I.length;while(_--)if(I[_]==F)continue $;I.push(F);this.packageInfoMap[F.name]=F}}},collapsePackage:function(_){var $=document.getElementById(K).contentWindow.document;B.loadPackage($,_)},render:function(C){var D=C.location.href;D=D.replace(/^([^#\?]+[#\?])([^#]+)(#.*)?$/g,"$2");if(D=="@menu")C.write(this.genMenu());else{var $="#"+encodeURIComponent(C.location.href);Q.hash=$;if(D=="@export")C.write(this.genExport(C));else{var _=D.lastIndexOf("/");if(_>=0){var E=D.substr(0,_).replace(/\//g,"."),B=D.substr(_+1);C.write(this.genSource(E,B))}else{var A=D.split(":");if(A[1])C.write(this.genObject(A[0],A[1]));else this.genPackage(A[0],C)}}}},genMenu:function(){var _=$("menu.xhtml"),A=_.render({JSIDoc:JSIDoc,rootInfo:JSIDoc.rootInfo,packageInfoGroupMap:JSIDoc.packageInfoGroupMap});return A},genExport:function(_){var B=$("export.xhtml"),C=[];for(var A in this.packageInfoMap)C.push(A);var D=B.render({packageNodes:ExportUI.prepare(_,C)});return D},genPackage:function(B,G){var E=$("package.xhtml"),D=C.require(B),F=D.getInitializers();F.push(function(){var F=D.getObjectInfos(),A=[],C=[],_=[];for(var H=0;H<F.length;H++){var B=F[H];switch(B.type){case"constructor":A.push(B);break;case"function":C.push(B);break;default:_.push(B)}}var $=E.render({constructors:A,functions:C,objects:_,files:D.fileInfos,packageInfo:D});G.open();G.write($);G.close()});var A=0;function _(){if(A<F.length){F[A++]();_()}}_()},genObject:function(_,B){var D=C.require(_),E=D.getObjectInfoMap()[B];switch(E.type){case"constructor":var A=$("constructor.xhtml");break;case"function":A=$("function.xhtml");break;case"object":A=$("object.xhtml");break;default:A=$("native.xhtml")}return A.render({objectInfo:E})},genSource:function(A,B){var G=_.require(B,A),H=G.source.toString(),D=G.docEntries,E=[];if(D!=null&&D[0]!=null)for(var J=0;J<D.length;J++){var I=D[J].getId();if(I&&I.length>0)E.push({name:I,position:D[J].end})}G.anchors=E;var C=G.parse(),F=$("source.xhtml");F.beforeOutput=function(){};return F.render({JSIDoc:JSIDoc,lines:C})},getSource:function($){$=$.replace(/^\//,"");var A=F[$];if(A&&A.constructor==String)return A;else{var _=loadTextByURL($JSI.scriptBase+"?path="+$);if(_!=null){L($.replace(/\/[^\/]+$/,"").replace(/\//g,"."),$.replace(/.*\//,""),_);return _}else if(A)return A.toString()}},exportToJSI:function(B){for(var A in F){var C=A.split("/"),$=C.pop(),_=C.join(".");B.preload(_,$=="__package__.js"?"":$,F[A])}}},M={},G=this.scriptBase,R=(G+"html/").substr($JSI.scriptBase.length),J=$JSI.preload,F={},K="menu",O="content",H=window,Q=H.location,N;while(H!=H.top){try{H.parent.document.forms.length}catch(D){break}H=H.parent}function L(B,A,_){J.apply($JSI,arguments);var $=B.replace(/\.|(.)$/g,"$1/");if(_==null)for(var C in A)F[$+(C||"__package__.js")]=A[C];else F[$+(A||"__package__.js")]=_}$JSI.preload=L
function $($){return T[$]}function S(_){if(_ instanceof Function)this.data=_;else{var $=$import("org.xidea.lite:Template",{});$=new $(_);return $}}S.prototype.render=function($){return this.data($)};var U=this.scriptBase,T={"package.xhtml":new S(function(){function H($){return $ in _?_[$]:this[$]}var _=arguments[0],C=[],$=H("line"),G=H("objects"),E=H("functions"),A=H("object"),I=H("file"),K=H("packageInfo"),B=H("constructors"),M=H("files");function F(A,$){if($){var _=[];for($ in A)_.push({key:$,value:A[$]});return _}$=typeof A;return $=="number"?new Array(A):$=="string"?A.split(""):A instanceof Array?A:F(A,1)}H=function($){return"&#"+$.charCodeAt()+";"};C.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <link rel="stylesheet" type="text/css" href="../styles/package.css"/> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <title>Package Information:');C.push(String(K.name).replace(/[<>&]/g,H));C.push("</title> </head> <body> <h2> ↓");C.push(String(K.name).replace(/[<>&]/g,H));C.push(' <span class="item-package"></span> </h2> <div class="package-source"> <table width="100%" cellpadding="0" class="xidea--syntax-source" border="0" cellspacing="0"> <thead> <tr> <th colspan="2"></th> </tr> </thead> <tbody> ');var J=K.getSourceEntry().parse().toArray(),L=0;J=F(J);_={lastIndex:J.length-1};for(;L<J.length;L++){_.index=L;$=J[L];C.push(" <tr");var D=_.index%2?"xidea-syntax-row1":"xidea-syntax-row0";if(D!=null)C.push(' class="',String(D).replace(/<>&"/g,H),'"');C.push('> <td class="xidea-syntax-vrule0"> <input');D=_.index+1;if(D!=null)C.push(' value="',String(D).replace(/<>&"/g,H),'"');C.push(' type="button"></input> </td> <td nowrap="true"> <pre> ');C.push($);C.push(" </pre> </td> </tr> ")}C.push(' </tbody> </table> </div> <table width="98%" cellpadding="0" class="content" cellspacing="0"> ');if(B.length){C.push(" <tr> <th>Constructor Name</th> <th>File Path</th> <th>Constructor Description</th> </tr> ");J=B,L=0;J=F(J);for(;L<J.length;L++){A=J[L];C.push(' <tr> <td> <a class="item-');C.push(String(A.type).replace(/[<>&"]/g,H));C.push('" href="?');C.push(String(A.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(A.name).replace(/[<>&]/g,H));C.push(' </a> </td> <td> <a class="item-file" href="?');C.push(String(A.fileInfo.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(A.fileInfo.name).replace(/[<>&]/g,H));C.push(" </a> </td> <td> ");C.push(A.docEntry.description);C.push(" </td> </tr> ")}C.push(' <tr class="space"> <td colspan="3"></td> </tr> ')}C.push(" ");if(E.length){C.push(" <tr> <th>Function Name</th> <th>File Path</th> <th>Function Description</th> </tr> ");J=E,L=0;J=F(J);for(;L<J.length;L++){A=J[L];C.push(' <tr> <td> <a class="item-');C.push(String(A.type).replace(/[<>&"]/g,H));C.push('" href="?');C.push(String(A.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(A.name).replace(/[<>&]/g,H));C.push(' </a> </td> <td> <a class="item-file" href="?');C.push(String(A.fileInfo.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(A.fileInfo.name).replace(/[<>&]/g,H));C.push(" </a> </td> <td> ");C.push(A.docEntry.description);C.push(" </td> </tr> ")}C.push(' <tr class="space"> <td colspan="3"></td> </tr> ')}C.push(" ");if(G.length){C.push(" <tr> <th>Object Name</th> <th>File Path</th> <th>Object Description</th> </tr> ");J=G,L=0;J=F(J);for(;L<J.length;L++){A=J[L];C.push(' <tr> <td> <a class="item-');C.push(String(A.type).replace(/[<>&"]/g,H));C.push('" href="?');C.push(String(A.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(A.name).replace(/[<>&]/g,H));C.push(' </a> </td> <td> <a class="item-file" href="?');C.push(String(A.fileInfo.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(A.fileInfo.name).replace(/[<>&]/g,H));C.push(" </a> </td> <td> ");C.push(A.docEntry.description);C.push(" </td> </tr> ")}C.push(' <tr class="space"> <td colspan="3"></td> </tr> ')}C.push(' </table> <table width="98%" cellpadding="0" class="content" cellspacing="0"> <tr> <th>File List</th> <th>File Infomation</th> </tr> ');J=M,L=0;J=F(J);for(;L<J.length;L++){I=J[L];C.push(' <tr> <td> <a class="item-file" href="?');C.push(String(I.getPath()).replace(/[<>&"]/g,H));C.push('"> ');C.push(String(I.name).replace(/[<>&]/g,H));C.push(" </a> </td> <td> ");C.push(I.getDescription());C.push(" </td> </tr> ")}C.push(' <tr class="space"> <td colspan="2"></td> </tr> </table> </body> </html>');return C.join("")}),"constructor.xhtml":new S(function(){function H($){return $ in A?A[$]:this[$]}var A=arguments[0],D=[],M=H("c"),$=H("memberInfo"),C=H("param"),B=H("constructorInfo"),I=H("memberInfos"),G=H("memberName"),J=H("objectInfo");function _(B,$){if($){var A=[];for($ in B)A.push({key:$,value:B[$]});return A}$=typeof B;return $=="number"?new Array(B):$=="string"?B.split(""):B instanceof Array?B:_(B,1)}H=function($){return"&#"+$.charCodeAt()+";"};D.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <link rel="stylesheet" type="text/css" href="../styles/object.css"/> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <title>Constructor Information:');D.push(String(J.name).replace(/[<>&]/g,H));D.push("</title> </head> <body> ");if(J.packageInfo.name){D.push(' <h2> <a href="?');D.push(String(J.packageInfo.getPath()).replace(/[<>&"]/g,H));D.push('"> ');D.push(String(J.packageInfo.name).replace(/[<>&]/g,H));D.push(" </a> </h2> ")}D.push(' <div> <a class="item-constructor">Object</a> </div> ');var K=J.getInheritList(),L=0;K=_(K);A={lastIndex:K.length-1};for(;L<K.length;L++){A.index=L;M=K[L];D.push(' <div style="margin-left:');D.push(String((1+A.index)*34).replace(/[<>&"]/g,H));D.push('px;" class="inheritor"> ');if(A.index==A.end){D.push(' <a class="item-constructor">');D.push(String(M.name).replace(/[<>&]/g,H));D.push("</a> ")}else{D.push(' <a class="item-constructor" href="?');D.push(String(M.getPath()).replace(/[<>&"]/g,H));D.push('"> ');D.push(String(M.name).replace(/[<>&]/g,H));D.push(" </a> ")}D.push(" </div> ")}D.push(' <h2>类(构造器)信息</h2> <table width="100%" cellpadding="0" class="content" border="0" cellspacing="0"> <thead> <tr> <th> <span class="item-constructor"> ');D.push(String(J.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String(J.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String(J.name).replace(/[<>&"]/g,H));D.push('"> ');D.push(String(J.name).replace(/[<>&]/g,H));D.push(" </a> ");D.push(J.getParams());D.push(" </span> </th> </tr> </thead> <tr> <td> <ul> ");D.push(J.getDescription());D.push(" </ul> </td> </tr> ");if(J.getParams().length){D.push(" <tr> <td> <h2>参数</h2> <ul> ");K=J.getParams().data,L=0;K=_(K);for(;L<K.length;L++){C=K[L];D.push(" <h3>");D.push(String(C.name).replace(/[<>&]/g,H));D.push("</h3> <p> ");D.push(C.description||"");D.push(" </p> ")}D.push(" </ul> </td> </tr> ")}D.push(" </table> ");I=J.getStaticInfos();D.push(" ");if(I.length>0){D.push(' <table width="100%" cellpadding="0" class="content" cellspacing="0"> <thead> <tr> <th colspan="3">类属性摘要</th> </tr> </thead> ');K=I,L=0;K=_(K);for(;L<K.length;L++){G=K[L];D.push(" ");$=I[G];D.push(' <tr class="access-');D.push(String($.getAccess()).replace(/[<>&"]/g,H));D.push('"> <td><span title="');D.push(String($.getAccess()).replace(/[<>&"]/g,H));D.push(" static ");D.push(String($.type).replace(/[<>&"]/g,H));D.push('" class="item-');D.push(String($.type).replace(/[<>&"]/g,H));D.push('"> ');if($.getPlace()==J){D.push(' <a href="#');D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a> ")}else{D.push(' <a href="#');D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a> ")}D.push(" </span></td> <td>");D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(" </td> <td>");D.push(String($.getShortDescription()).replace(/[<>&]/g,H));D.push(' </td> </tr> <tr> <td colspan="3"> </td> </tr> ')}D.push(" </table> <br/> <br/> ")}D.push(" ");I=J.getInstanceInfos();D.push(" ");if(I.length>0){D.push(' <table width="100%" cellpadding="0" class="content" cellspacing="0"> <thead> <tr> <th colspan="3">实例属性摘要</th> </tr> </thead> ');K=I,L=0;K=_(K);for(;L<K.length;L++){G=K[L];D.push(" ");$=I[G];D.push(' <tr class="access-');D.push(String($.getAccess()).replace(/[<>&"]/g,H));D.push('"> <td><span title="');D.push(String($.getAccess()).replace(/[<>&"]/g,H));D.push(" static ");D.push(String($.type).replace(/[<>&"]/g,H));D.push('" class="item-');D.push(String($.type).replace(/[<>&"]/g,H));D.push('"> ');if($.getPlace()==J){D.push(' <a href="#');D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a> ")}else{D.push(' <a href="#');D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a> ")}D.push(" </span></td> <td>");D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(" </td> <td>");D.push(String($.getShortDescription()).replace(/[<>&]/g,H));D.push(' </td> </tr> <tr> <td colspan="3"> </td> </tr> ')}D.push(" </table> <br/> <br/> ")}D.push(" ");I=J.getDeclaredStaticInfos();D.push(" ");if(I.length>0){D.push(" <h2>类属性详细信息</h2> ");K=I,L=0;K=_(K);for(;L<K.length;L++){G=K[L];D.push(" ");$=I[G];D.push(" <a");var E=$.name;if(E!=null)D.push(' name="',String(E).replace(/<>&"/g,H),'"');D.push("></a> ");if($.type=="function"){D.push(' <span class="item-function"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(" ");D.push($.getReturnInfo());D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a>");D.push($.getParams());D.push("</span> <ul> ");D.push($.getDescription());D.push(" </ul> ");if($.getParams().length){D.push(" <h2>参数</h2> <ul> ");var F=$.getParams().data,E=0;F=_(F);for(;E<F.length;E++){C=F[E];D.push(" <h3>");D.push(String(C.name).replace(/[<>&]/g,H));D.push("</h3> <p>");D.push(C.description||"");D.push("</p> ")}D.push(" </ul> ")}D.push(" ");if($.getReturnInfo().isValid()){D.push(" <h2>返回</h2> <ul> <p>");D.push($.getReturnInfo().description||"");D.push("</p> </ul> ")}D.push(" ")}else if($.type=="constructor"){D.push(' <span class="item-constructor"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a>");D.push(String($.getParams()).replace(/[<>&]/g,H));D.push("</span> <ul> ");D.push($.getDescription());D.push(' </ul> <ul> <p>参考：<a class="item-constructor" href="?');D.push(String($.getPath()).replace(/[<>&"]/g,H));D.push('">');D.push(String($.name).replace(/[<>&]/g,H));D.push("</a></p> </ul> ")}else if($.type=="object"){D.push(' <span class="item-object"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a></span> <ul> ");D.push($.getDescription());D.push(" </ul> ");B=$.getConstructorInfo();D.push(" ");if(B){D.push(' <ul> <p>构造器：<a class="item-constructor" href="?constructorInfo.getPath()">');D.push(String(B.name).replace(/[<>&]/g,H));D.push("</a></p> </ul> ")}D.push(" ")}else{D.push(' <span class="item-');D.push(String($.type).replace(/[<>&"]/g,H));D.push('"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a></span> <ul> ");D.push($.getDescription());D.push(" </ul> ")}D.push(" <hr/> ")}D.push(" <br/> ")}D.push(" ");I=J.getDeclaredInstanceInfos();D.push(" ");if(I.length>0){D.push(" <h2>实例属性详细信息</h2> ");K=I,L=0;K=_(K);for(;L<K.length;L++){G=K[L];D.push(" ");$=I[G];D.push(" <a");E=$.name;if(E!=null)D.push(' name="',String(E).replace(/<>&"/g,H),'"');D.push("></a> ");if($.type=="function"){D.push(' <span class="item-function"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(" ");D.push($.getReturnInfo());D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a>");D.push($.getParams());D.push("</span> <ul> ");D.push($.getDescription());D.push(" </ul> ");if($.getParams().length){D.push(" <h2>参数</h2> <ul> ");F=$.getParams().data,E=0;F=_(F);for(;E<F.length;E++){C=F[E];D.push(" <h3>");D.push(String(C.name).replace(/[<>&]/g,H));D.push("</h3> <p>");D.push(C.description||"");D.push("</p> ")}D.push(" </ul> ")}D.push(" ");if($.getReturnInfo().isValid()){D.push(" <h2>返回</h2> <ul> <p>");D.push($.getReturnInfo().description||"");D.push("</p> </ul> ")}D.push(" ")}else if($.type=="constructor"){D.push(' <span class="item-constructor"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a>");D.push(String($.getParams()).replace(/[<>&]/g,H));D.push("</span> <ul> ");D.push($.getDescription());D.push(' </ul> <ul> <p>参考：<a class="item-constructor" href="?');D.push(String($.getPath()).replace(/[<>&"]/g,H));D.push('">');D.push(String($.name).replace(/[<>&]/g,H));D.push("</a></p> </ul> ")}else if($.type=="object"){D.push(' <span class="item-object"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a></span> <ul> ");D.push($.getDescription());D.push(" </ul> ");B=$.getConstructorInfo();D.push(" ");if(B){D.push(' <ul> <p>构造器：<a class="item-constructor" href="?constructorInfo.getPath()">');D.push(String(B.name).replace(/[<>&]/g,H));D.push("</a></p> </ul> ")}D.push(" ")}else{D.push(' <span class="item-');D.push(String($.type).replace(/[<>&"]/g,H));D.push('"> static ');D.push(String($.getAccess()).replace(/[<>&]/g,H));D.push(' <a href="?');D.push(String($.fileInfo.getPath()).replace(/[<>&"]/g,H));D.push("#");D.push(String($.name).replace(/[<>&"]/g,H));D.push('">');D.push(String(G).replace(/[<>&]/g,H));D.push("</a></span> <ul> ");D.push($.getDescription());D.push(" </ul> ")}D.push(" <hr/> ")}D.push(" <br/> ")}D.push(" </body> </html>");return D.join("")}),"export.xhtml":new S(function(){function G($){return $ in I?I[$]:this[$]}var I=arguments[0],L=[],D=G("packageNodes"),F=G("objectName"),H=G("packageNode"),C=G("objectNode"),E=G("packageName");function B(A,$){if($){var _=[];for($ in A)_.push({key:$,value:A[$]});return _}$=typeof A;return $=="number"?new Array(A):$=="string"?A.split(""):A instanceof Array?A:B(A,1)}G=function($){return"&#"+$.charCodeAt()+";"};L.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <link rel="stylesheet" type="text/css" href="../styles/export.css"/> <script> // <![CDATA[\n    parent.$import("org.xidea.jsidoc.export.ExportUI",this);\n//]]> <\/script> </head> <body style="filter: expression(document.execCommand(&#39;BackgroundImageCache&#39;, false, true))"> <div id="header">脚本导出----脱离JSI环境</div> <div id="body"> <div id="treeContainer"> ');var J=D,K=0;J=B(J);for(;K<J.length;K++){E=J[K];L.push(" ");H=D[E];L.push(' <table cellpadding="0" class="closed" border="0" cellspacing="0"> <thead> <tr> <td class="handlebox"> <button onclick="collapse(this)" class="openhandle"> + </button> <button onclick="collapse(this)" class="closehandle"> - </button> </td> <td');var _=H.htmlId;if(_!=null)L.push(' id="',String(_).replace(/<>&"/g,G),'"');L.push(' onclick="ExportUI.clickPackage(&#39;');L.push(String(H.id).replace(/[<>&"]/g,G));L.push('&#39;)" class="checkbox0"> </td> <td colspan="2" style="cursor:pointer" onclick="ExportUI.clickPackage(&#39;');L.push(String(H.id).replace(/[<>&"]/g,G));L.push('&#39;)" class="item-package"> ');L.push(String(E).replace(/[<>&]/g,G));L.push(' </td> <td class="flagbox"> </td> </tr> </thead> <tbody> ');var A=H.children,_=0;A=B(A);for(;_<A.length;_++){F=A[_];L.push(" ");C=H.children[F];L.push(" <tr> <td> </td> <td> </td> <td");var $=C.htmlId;if($!=null)L.push(' id="',String($).replace(/<>&"/g,G),'"');L.push(' onclick="ExportUI.clickScript(&#39;');L.push(String(C.id).replace(/[<>&"]/g,G));L.push('&#39;)" class="checkbox0"> </td> <td style="cursor:pointer" onclick="ExportUI.clickScript(&#39;');L.push(String(C.id).replace(/[<>&"]/g,G));L.push('&#39;)" class="item-unknow"> ');L.push(String(F).replace(/[<>&]/g,G));L.push(' </td> <td class="flagbox"> </td> </tr> ')}L.push(" </tbody> </table> ")}L.push(' </div> <div id="output"> <fieldset> <legend>相关文件地址</legend> <div id="fileOutput"></div> </fieldset> <fieldset> <legend>导出变量集</legend> <div id="objectOutput"></div> </fieldset> <fieldset> <legend>导出操作</legend> <form ation="/servlet/JSA" onsubmit="return false"> <div> <div> <label> <input id="level3" name="level" value="3" onclick="ExportUI.checkLevel(this)" type="radio" checked="true"></input> 隔离全部冲突 </label> <label> <input id="level2" name="level" value="2" onclick="ExportUI.checkLevel(this)" type="radio"></input> 隔离内部冲突 </label> <label> <input id="level1" name="level" value="1" onclick="ExportUI.checkLevel(this)" type="radio"></input> 直接合并 </label> <br/> <label> <input id="level0" title="导出JSI分析报告" name="level" value="0" onclick="ExportUI.checkLevel(this)" type="radio"></input> 导出分析报告 </label> <label> <input id="level-1" title="导出后需要使用JSA处理成单个压缩文件,实现隔离冲突" name="level" value="-1" onclick="ExportUI.checkLevel(this)" type="radio"></input> 导出为XML </label> <label> <input id="level-2" title="导出JSIDoc文档" name="level" value="-2" onclick="ExportUI.checkLevel(this)" type="radio"></input> 导出文档 </label> </div> <div> <span id="mixTemplateContainer"> <label for="mixTemplate"> 编入模板: </label> <input id="mixTemplate" name="mixTemplate" type="checkbox" checked="true"></input> </span> <span id="prefixContainer"> <label for="prefix">内部变量前缀:</label> <input id="prefix" title="当选择隔离冲突时，需要指定混淆后内部变量前缀，以避免二次冲突" name="prefix" value="_$" type="text" size="4"></input> </span> <span id="jsidocURLContainer"> <br/> <label for="jsidocURL">服务地址:</label> <input id="jsidocURL" title="指定您架设的文档服务器" name="jsidocURL" value="http://www.xidea.org/project/jsidoc/" type="text" size="40"></input> </span> <button id="exportButton" onclick="ExportUI.doExport(this.form);return false;" disabled="true"> 导出&gt;&gt; </button> </div> <ul> <li style="display:none"> 将导出的数据保存于hta或者html中,查看时需要连接到网络,才能正确解析,您也可以指定一个本地的文档服务器. </li> <li style="display:none"> 导出为xml格式的结果， <b>无法直接正确执行</b> ,他只是一个多文件打包的合并方式,需要经过JSA的处理. </li> <li style="display:none">输出脚本分析报告，可供代码复查时参考</li> <li style="display:none">脱离JSI后,直接合并可能有命名冲突的危险.不推荐.</li> <li style="display:none"> 隔离内部冲突是指混淆掉文件内部的未公开全局变量,这需要服务端支持, <b> 如果你现在的导出环境不支持java,可以导出成xml,再交由JSA处理 </b> </li> <li style="display:inline"> 隔离全部冲突有和JSI等价的隔离级别,这需要服务端支持, <b> 如果你现在的导出环境不支持java,可以导出成xml,再交由JSA处理 </b> </li> </ul> </div> </form> </fieldset> </div> </div> <style>#footer *{ float:left; }</style> <div id="footer"> <table> <tr> <th>图例:</th> <td>初始状态:</td> <td title="初始状态,文件未装载" class="checkbox0"> </td> <td> </td> <td>文件已装载(被动):</td> <td title="文件已经装载,但缺乏相关依赖" class="checkbox1"> </td> <td> </td> <td>依赖已装载(被动):</td> <td title="文件及依赖文件已经装载" class="checkbox3"> </td> <td> </td> <td>依赖已注入(被动):</td> <td title="文件及依赖文件已经装载并且注入了相关依赖 (脱离JSI后装载与注入没有区别)" class="checkbox3"> </td> <td> </td> <th>主动导出:</th> <td title="导出的元素" class="checkbox4"> </td> </tr> </table> <script> // <![CDATA[\nfunction collapse(el){\n    while(el && el.tagName!="TABLE"){\n        el = el.parentNode;\n    }\n    if(el.className.indexOf("open")>-1){\n        el.className = el.className.replace(/\\bopen\\b/,\'closed\');\n    }else{\n        el.className = el.className.replace(/\\bclosed\\b/,\'open\');\n    }\n}\nExportUI.initialize();\n//]]> <\/script> </div> </body> </html>');return L.join("")}),"function.xhtml":new S(function(){function G($){return $ in _?_[$]:this[$]}var _=arguments[0],D=[],E=G("memberInfo"),L=G("param"),A=G("constructorInfo"),B=G("memberInfos"),K=G("memberName"),H=G("objectInfo");function $(B,_){if(_){var A=[];for(_ in B)A.push({key:_,value:B[_]});return A}_=typeof B;return _=="number"?new Array(B):_=="string"?B.split(""):B instanceof Array?B:$(B,1)}G=function($){return"&#"+$.charCodeAt()+";"};D.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <link rel="stylesheet" type="text/css" href="../styles/default.css"/> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <title>Object Information:');D.push(String(H.name).replace(/[<>&]/g,G));D.push("</title> </head> <body> ");if(H.fileInfo.packageInfo.name){D.push(' <h2><a href="?');D.push(String(H.packageInfo.getPath()).replace(/[<>&"]/g,G));D.push('">');D.push(String(H.fileInfo.packageInfo.name).replace(/[<>&]/g,G));D.push("</a></h2> ")}D.push(' <table width="100%" cellpadding="0" class="content" cellspacing="0"> <thead> <tr> <th>函数信息</th> </tr> </thead> </table> <br/> <br/> <table width="100%" cellpadding="0" class="content" border="0" cellspacing="0"> <tr> <th><span class="item-function"> ');D.push(String(H.getAccess()).replace(/[<>&]/g,G));D.push(" ");D.push(H.getReturnInfo());D.push(' <a href="?');D.push(String(H.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(H.name).replace(/[<>&"]/g,G));D.push('"> ');D.push(String(H.name).replace(/[<>&]/g,G));D.push("</a> ");D.push(H.getParams());D.push("</span></th> </tr> <tr> <td> <ul> ");D.push(H.getDescription());D.push(" </ul> </td> </tr> ");if(H.getParams().length){D.push(" <tr> <td> <h2>参数</h2> <ul> ");var I=H.getParams().data,J=0;I=$(I);for(;J<I.length;J++){L=I[J];D.push(" <h3>");D.push(String(L.name).replace(/[<>&]/g,G));D.push("</h3> <p>");D.push(L.description);D.push("</p> ")}D.push(" </ul> </td> </tr> ")}D.push(" ");if(H.getReturnInfo().isValid()){D.push(" <tr> <td> <h2>返回 ");D.push(H.getReturnInfo());D.push("</h2> <ul> <p>");D.push(H.getReturnInfo().description);D.push("</p> </ul> </td> </tr> ")}D.push(" </table>  ");B=H.getStaticInfos();D.push(" ");if(B.length>0){D.push(' <table width="100%" cellpadding="0" class="content" cellspacing="0"> <thead> <tr> <th colspan="3">函数静态属性摘要</th> </tr> </thead> ');I=B,J=0;I=$(I);for(;J<I.length;J++){K=I[J];D.push(" ");E=B[K];D.push(' <tr class="access-');D.push(String(E.getAccess()).replace(/[<>&"]/g,G));D.push('"> <td><span title="');D.push(String(E.getAccess()).replace(/[<>&"]/g,G));D.push(" static ");D.push(String(E.type).replace(/[<>&"]/g,G));D.push('" class="item-');D.push(String(E.type).replace(/[<>&"]/g,G));D.push('"> ');if(E.getPlace()==H){D.push(' <a href="#');D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a> ")}else{D.push(' <a href="#');D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a> ")}D.push(" </span></td> <td>");D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(" </td> <td>");D.push(String(E.getShortDescription()).replace(/[<>&]/g,G));D.push(' </td> </tr> <tr> <td colspan="3"> </td> </tr> ')}D.push(" </table> <br/> <br/> ")}D.push(" ");B=H.getDeclaredStaticInfos();D.push(" ");if(B.length>0){D.push(" <h2>函数静态属性详细信息</h2> ");I=B,J=0;I=$(I);for(;J<I.length;J++){K=I[J];D.push(" ");E=B[K];D.push(" <a");var C=E.name;if(C!=null)D.push(' name="',String(C).replace(/<>&"/g,G),'"');D.push("></a> ");if(E.type=="function"){D.push(' <span class="item-function"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(" ");D.push(E.getReturnInfo());D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a>");D.push(E.getParams());D.push("</span> <ul> ");D.push(E.getDescription());D.push(" </ul> ");if(E.getParams().length){D.push(" <h2>参数</h2> <ul> ");var F=E.getParams().data,C=0;F=$(F);for(;C<F.length;C++){L=F[C];D.push(" <h3>");D.push(String(L.name).replace(/[<>&]/g,G));D.push("</h3> <p>");D.push(L.description||"");D.push("</p> ")}D.push(" </ul> ")}D.push(" ");if(E.getReturnInfo().isValid()){D.push(" <h2>返回</h2> <ul> <p>");D.push(E.getReturnInfo().description||"");D.push("</p> </ul> ")}D.push(" ")}else if(E.type=="constructor"){D.push(' <span class="item-constructor"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a>");D.push(String(E.getParams()).replace(/[<>&]/g,G));D.push("</span> <ul> ");D.push(E.getDescription());D.push(' </ul> <ul> <p>参考：<a class="item-constructor" href="?');D.push(String(E.getPath()).replace(/[<>&"]/g,G));D.push('">');D.push(String(E.name).replace(/[<>&]/g,G));D.push("</a></p> </ul> ")}else if(E.type=="object"){D.push(' <span class="item-object"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a></span> <ul> ");D.push(E.getDescription());D.push(" </ul> ");A=E.getConstructorInfo();D.push(" ");if(A){D.push(' <ul> <p>构造器：<a class="item-constructor" href="?constructorInfo.getPath()">');D.push(String(A.name).replace(/[<>&]/g,G));D.push("</a></p> </ul> ")}D.push(" ")}else{D.push(' <span class="item-');D.push(String(E.type).replace(/[<>&"]/g,G));D.push('"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a></span> <ul> ");D.push(E.getDescription());D.push(" </ul> ")}D.push(" <hr/> ")}D.push(" <br/> ")}D.push(" </body> </html>");return D.join("")}),"menu.xhtml":new S(function(){function I($){return $ in _?_[$]:this[$]}var _=arguments[0],J=[],B=I("packageInfo"),D=I("packageInfoGroupMap"),H=I("key");function $(B,_){if(_){var A=[];for(_ in B)A.push({key:_,value:B[_]});return A}_=typeof B;return _=="number"?new Array(B):_=="string"?B.split(""):B instanceof Array?B:$(B,1)}I=function($){return"&#"+$.charCodeAt()+";"};J.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <base target="content"></base> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <title>JSI Doc Menu</title> <link rel="stylesheet" type="text/css" href="../styles/menu.css"/> <script>//<![CDATA[\nwindow.onload = window.onresize = function(){\n    var content = document.getElementById("content");\n    content.style.width = document.body.clientWidth-10+\'px\';\n    content.style.height = document.body.clientHeight-35+\'px\';\n}\nfunction collapse(li){\n  while(li && li.tagName!="LI"){\n    li = li.parentNode;\n  }\n  if(li.className.indexOf("open")>-1){\n    li.className = li.className.replace(/\\bopen\\b/,\'closed\');\n  }else{\n    li.className = li.className.replace(/\\bclosed\\b/,\'open\');\n  }\n}\nfunction openMenu(li){\n    li.className = li.className.replace(/\\s*\\bopen\\b|$/,\' open\')\n}\nfunction closeMenu(li){\n    li.className = li.className.replace(/\\s*\\bopen\\b/,\'\')\n}\n\n\nfunction addPackage(form){\n    var groupName = form.groupName.value;\n    var packageName = form.packageName.value;\n    var findDependence = form.findDependence.checked;\n    var data = [groupName];\n    data[groupName] = packageName.match(/[\\w\\.]+/g);\n    parent.JSIDoc.addPackageMap(data,findDependence);\n    this.location.replace(this.location.href);\n}\n//]]> <\/script> </head> <body style="margin: 0px;padding: 0px;"> <div id="toolbar"> <li onmouseout="closeMenu(this)" class="menu-box" onmouseover="openMenu(this)"> <a title="更多" target="_self" onclick="return false" href="#null">&gt;&gt;</a> <ul class="menu-block"> <li class="menu-item"><a title="跳转至文档首页" href="../welcome.html">文档首页</a></li> <li class="menu-item"><a title="跳转至网站首页" target="_top" href="/">网站首页</a></li> <li class="menu-item"><a title="JSI开源项目首页" target="_top" href="http://www.xidea.org/project/jsi">JSI首页&gt;&gt;</a></li> </ul> </li> <li onmouseout="closeMenu(this)" class="menu-box" onmouseover="openMenu(this)"> <a onclick="return false" href="#null">工具</a> <ul style="right:-10px" class="menu-block"> <li class="menu-item"><a title="导出成普通脚本，脱离JSI框架" href="?@export">导出</a> </li> <li class="menu-item"><a title="自动装载测试" href="../../test/loader/">装载测试</a></li> <li class="menu-item"><a title="定制类库" onclick="alert(&#39;尚未实现&#39;);return false" href="/">定制类库</a></li> </ul> </li> <li onmouseout="closeMenu(this)" class="menu-box" onmouseover="openMenu(this)"> <a title="JSI内核脚本" onclick="return false" href="#null">内核参考</a> <ul style="width:170px;right:-40px" class="menu-block root-pane"> <li class="menu-item"><a>内部对象参考</a></li> <li class="menu-item"><a class="item-constructor" href="?:Package">Package</a></li> <li class="menu-item"><a class="item-constructor" href="?:ScriptLoader">ScriptLoader</a></li> <li class="menu-item"><a>可用对象参考</a></li> <li class="menu-item"><a class="item-object" href="?:$JSI">$JSI</a></li> <li class="menu-item"><a class="item-function" href="?:$import">$import</a></li> <li class="menu-item"><a class="item-constructor" href="?:XMLHttpRequest">XMLHttpRequest</a></li> </ul> </li> <li onmouseout="closeMenu(this)" class="menu-box" onmouseover="openMenu(this)"> <a title="JSI内核脚本" onclick="return false" href="#null"><img src="../styles/big-plus.gif" border="0"/></a> <ul style="font-size:12px;padding:8px;width:180px;height:150px;left:-60px;border:1px solid #000;background:#FFF" class="menu-block"> <form style="position:fixed;"> <div>分组：</div> <div><input style="width:160px" name="groupName" value="其他类库"></input></div> <div>包名：</div> <div><textarea style="width:160px" name="packageName"></textarea></div> <div><button onclick="addPackage(this.form);return false">添加类库</button> <input name="findDependence" type="checkbox"></input> 附加依赖</div> </form> </ul> </li> </div> <div id="content"> ');var A=D,G=0;A=$(A);for(;G<A.length;G++){H=A[G];J.push(" <h4>");J.push(String(H).replace(/[<>&]/g,I));J.push('</h4> <ul class="package-pane"> ');var F=D[H],E=0;F=$(F);for(;E<F.length;E++){B=F[E];J.push(" ");if(B.implementation){J.push(' <li class="closed"> <table width="100%" cellpadding="0" border="0" cellspacing="0"> <tr> <td style="width:14px;"> <button onclick="collapse(this)" class="openhandle">+</button> <button onclick="collapse(this)" class="closehandle">-</button> </td> <td><a class="item-package-ref" href="?');J.push(String(B.implementation).replace(/[<>&"]/g,I));J.push(':">');J.push(String(B.name).replace(/[<>&]/g,I));J.push(' </a></td> </tr> <tr> <td colspan="2"> <ul> <div>指向: ');J.push(String(B.implementation).replace(/[<>&]/g,I));J.push("</div> </ul> </td> </tr> </table> </li> ")}else{J.push(" <li");var C=B.getDescription();if(C!=null)J.push(' title="',String(C).replace(/<>&"/g,I),'"');J.push(' onclick="parent.JSIDoc.collapsePackage(&#39;');J.push(String(B.name).replace(/[<>&"]/g,I));J.push('&#39;)" class="closed"> <table width="100%" cellpadding="0" border="0" cellspacing="0"> <tr> <td style="width:14px;"> <button onclick="collapse(this)" class="openhandle">+</button> <button onclick="collapse(this)" class="closehandle">-</button> </td> <td><a class="item-package" href="?');J.push(String(B.name).replace(/[<>&"]/g,I));J.push(':">');J.push(String(B.name).replace(/[<>&]/g,I));J.push(' </a></td> </tr> <tr> <td colspan="2"> <ul id="package_');J.push(String(B.name).replace(/[<>&"]/g,I));J.push('" title="loading"> <div class="loading">Loading....</div> </ul> </td> </tr> </table> </li> ')}J.push(" ")}J.push(" </ul> ")}J.push(" </div> </body> </html>");return J.join("")}),"native.xhtml":new S(function(){function _(_){return _ in $?$[_]:this[_]}var $=arguments[0],B=[],A=_("objectInfo");_=function($){return"&#"+$.charCodeAt()+";"};B.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <link rel="stylesheet" type="text/css" href="../styles/default.css"/> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <title>Native Type Information:');B.push(String(A.name).replace(/[<>&]/g,_));B.push("</title> </head> <body> ");if(A.packageInfo.name){B.push(' <h2><a href="?');B.push(String(A.packageInfo.getPath()).replace(/[<>&"]/g,_));B.push('">');B.push(String(A.packageInfo.name).replace(/[<>&]/g,_));B.push("</a></h2> ")}B.push(' <h2>原始类型信息</h2> <table width="100%" cellpadding="0" class="content" border="0" cellspacing="0"> <thead> <tr> <th><span class="item-');B.push(String(A.type).replace(/[<>&"]/g,_));B.push('"> ');B.push(String(A.getAccess()).replace(/[<>&]/g,_));B.push('<a href="?');B.push(String(A.fileInfo.getPath()).replace(/[<>&"]/g,_));B.push("#");B.push(String(A.name).replace(/[<>&"]/g,_));B.push('">');B.push(String(A.name).replace(/[<>&]/g,_));B.push("</a></span></th> </tr> </thead> <tr> <td> <h3> ");B.push(String(A.type).replace(/[<>&]/g,_));B.push(" ");if(A.type=="string"){B.push(" ");B.push(String(A.object==null?null:'"'+A.object+'"').replace(/[<>&]/g,_));B.push(" ")}else{B.push(" ");B.push(String(A.object).replace(/[<>&]/g,_));B.push(" ")}B.push(" </h3> <ul> ");B.push(A.getDescription());B.push(" </ul> </td> </tr> </table> </body> </html>");return B.join("")}),"object.xhtml":new S(function(){function G($){return $ in _?_[$]:this[$]}var _=arguments[0],D=[],E=G("memberInfo"),L=G("param"),A=G("constructorInfo"),B=G("memberInfos"),K=G("memberName"),H=G("objectInfo");function $(B,_){if(_){var A=[];for(_ in B)A.push({key:_,value:B[_]});return A}_=typeof B;return _=="number"?new Array(B):_=="string"?B.split(""):B instanceof Array?B:$(B,1)}G=function($){return"&#"+$.charCodeAt()+";"};D.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <link rel="stylesheet" type="text/css" href="../styles/object.css"/> <meta content="text/html;utf-8" http-equiv="Content-Type"/> <title>Object Information:');D.push(String(H.name).replace(/[<>&]/g,G));D.push("</title> </head> <body> ");if(H.fileInfo.packageInfo.name){D.push(' <h2><a href="?');D.push(String(H.packageInfo.getPath()).replace(/[<>&"]/g,G));D.push('">');D.push(String(H.fileInfo.packageInfo.name).replace(/[<>&]/g,G));D.push("</a></h2> ")}D.push(' <h2>对象信息</h2> <table width="100%" cellpadding="0" class="content" border="0" cellspacing="0"> <thead> <tr> <th><span class="item-object"> ');D.push(String(H.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(H.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(H.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(H.name).replace(/[<>&]/g,G));D.push("</a></span> ");A=H.getConstructorInfo();D.push(" ");if(A){D.push(' (<a class="item-constructor" href="?constructorInfo.getPath()">');D.push(String(A.name).replace(/[<>&]/g,G));D.push("</a>) ")}D.push("</th> </tr> </thead> <tr> <td> <ul> ");D.push(H.getDescription());D.push(" </ul> </td> </tr> </table> ");B=H.getStaticInfos();D.push(" ");if(B.length>0){D.push(' <table width="100%" cellpadding="0" class="content" cellspacing="0"> <thead> <tr> <th colspan="3">类属性摘要</th> </tr> </thead> ');var I=B,J=0;I=$(I);for(;J<I.length;J++){K=I[J];D.push(" ");E=B[K];D.push(' <tr class="access-');D.push(String(E.getAccess()).replace(/[<>&"]/g,G));D.push('"> <td><span title="');D.push(String(E.getAccess()).replace(/[<>&"]/g,G));D.push(" static ");D.push(String(E.type).replace(/[<>&"]/g,G));D.push('" class="item-');D.push(String(E.type).replace(/[<>&"]/g,G));D.push('"> ');if(E.getPlace()==H){D.push(' <a href="#');D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a> ")}else{D.push(' <a href="#');D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a> ")}D.push(" </span></td> <td>");D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(" </td> <td>");D.push(String(E.getShortDescription()).replace(/[<>&]/g,G));D.push(' </td> </tr> <tr> <td colspan="3"> </td> </tr> ')}D.push(" </table> <br/> <br/> ")}D.push(" ");B=H.getDeclaredStaticInfos();D.push(" ");if(B.length>0){D.push(" <h2>对象属性详细信息</h2> ");I=B,J=0;I=$(I);for(;J<I.length;J++){K=I[J];D.push(" ");E=B[K];D.push(" <a");var C=E.name;if(C!=null)D.push(' name="',String(C).replace(/<>&"/g,G),'"');D.push("></a> ");if(E.type=="function"){D.push(' <span class="item-function"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(" ");D.push(E.getReturnInfo());D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a>");D.push(E.getParams());D.push("</span> <ul> ");D.push(E.getDescription());D.push(" </ul> ");if(E.getParams().length){D.push(" <h2>参数</h2> <ul> ");var F=E.getParams().data,C=0;F=$(F);for(;C<F.length;C++){L=F[C];D.push(" <h3>");D.push(String(L.name).replace(/[<>&]/g,G));D.push("</h3> <p>");D.push(L.description||"");D.push("</p> ")}D.push(" </ul> ")}D.push(" ");if(E.getReturnInfo().isValid()){D.push(" <h2>返回</h2> <ul> <p>");D.push(E.getReturnInfo().description||"");D.push("</p> </ul> ")}D.push(" ")}else if(E.type=="constructor"){D.push(' <span class="item-constructor"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a>");D.push(String(E.getParams()).replace(/[<>&]/g,G));D.push("</span> <ul> ");D.push(E.getDescription());D.push(' </ul> <ul> <p>参考：<a class="item-constructor" href="?');D.push(String(E.getPath()).replace(/[<>&"]/g,G));D.push('">');D.push(String(E.name).replace(/[<>&]/g,G));D.push("</a></p> </ul> ")}else if(E.type=="object"){D.push(' <span class="item-object"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a></span> <ul> ");D.push(E.getDescription());D.push(" </ul> ");A=E.getConstructorInfo();D.push(" ");if(A){D.push(' <ul> <p>构造器：<a class="item-constructor" href="?constructorInfo.getPath()">');D.push(String(A.name).replace(/[<>&]/g,G));D.push("</a></p> </ul> ")}D.push(" ")}else{D.push(' <span class="item-');D.push(String(E.type).replace(/[<>&"]/g,G));D.push('"> static ');D.push(String(E.getAccess()).replace(/[<>&]/g,G));D.push(' <a href="?');D.push(String(E.fileInfo.getPath()).replace(/[<>&"]/g,G));D.push("#");D.push(String(E.name).replace(/[<>&"]/g,G));D.push('">');D.push(String(K).replace(/[<>&]/g,G));D.push("</a></span> <ul> ");D.push(E.getDescription());D.push(" </ul> ")}D.push(" <hr/> ")}D.push(" <br/> ")}D.push(" </body> </html>");return D.join("")}),"source.xhtml":new S(function(){function B($){return $ in A?A[$]:this[$]}var A=arguments[0],E=[],_=B("lines"),$=B("line");function D(A,$){if($){var _=[];for($ in A)_.push({key:$,value:A[$]});return _}$=typeof A;return $=="number"?new Array(A):$=="string"?A.split(""):A instanceof Array?A:D(A,1)}B=function($){return"&#"+$.charCodeAt()+";"};E.push('<html xmlns="http://www.xidea.org/ns/xhtml"> <head> <link rel="stylesheet" type="text/css" href="../styles/source.css"/> <title>JSIntegeration Doc Menu</title> </head> <body style="margin: 0px;padding: 0px;"> <table width="100%" cellpadding="0" class="xidea--syntax-source" border="0" cellspacing="0"> <thead> <tr> <td style="width:18px;"></td> <td colspan="2" class="xidea-syntax-content-top"><a href="#">view plain</a>| <a href="#">print</a> | ?</td> </tr> </thead> <tbody> ');var C=_.lines,F=0;C=D(C);A={lastIndex:C.length-1};for(;F<C.length;F++){A.index=F;$=C[F];E.push(" ");$=_.next();E.push(' <tr class="xidea-syntax-open ');E.push(String(A.index%2?"xidea-syntax-row1":"xidea-syntax-row0").replace(/[<>&"]/g,B));E.push('"');var G=_.depth;if(G!=null)E.push(' depth="',String(G).replace(/<>&"/g,B),'"');E.push('> <td class="xidea-syntax-vrule0"><input');G=A.index+1;if(G!=null)E.push(' value="',String(G).replace(/<>&"/g,B),'"');E.push(' type="button"></input></td> ');if(_.nextDepth>_.depth){E.push(' <td onmouseout="hiddenBound(this,');E.push(String(_.lineIndex).replace(/[<>&"]/g,B));E.push(')" onclick="collapse(this)" class="xidea-syntax-vrule1" onmouseover="showBound(this,');E.push(String(_.lineIndex).replace(/[<>&"]/g,B));E.push(')"> <input value="-" class="xidea-syntax-closehandle" type="button"></input> <input value="+" class="xidea-syntax-openhandle" type="button"></input></td> ')}else{E.push(' <td ondblclick="collapse(this,');E.push(String(_.depthStart).replace(/[<>&"]/g,B));E.push(')" onmouseout="hiddenBound(this,');E.push(String(_.depthStart).replace(/[<>&"]/g,B));E.push(')" class="xidea-syntax-vrule1" onmouseover="showBound(this,');E.push(String(_.depthStart).replace(/[<>&"]/g,B));E.push(')"> </td> ')}E.push(' <td nowrap="true"> <pre>');E.push(_.anchor+$);E.push(" ");if((_.nextDepth>_.depth))E.push(' <b class="xidea-syntax-more">...</b> ');E.push(" </pre></td> </tr> ")}E.push(' </tbody> <tfoot> <tr> <td></td> <td colspan="2" class="xidea-syntax-content-bottom"> </td> </tr> </tfoot> </table> <script>//<![CDATA[\n  var collapseCssReg = /\\bxidea-syntax-open\\b|\\bxidea-syntax-closed\\b/;\n  function collapse(td,start){\n    var tr = td.parentNode;\n    if(start>0){\n      tr = tr.parentNode.rows[start-1]\n    }\n    var cn = tr.className.replace(collapseCssReg,\'\');\n    if(tr.getAttribute(\'closed\')){\n      tr.className = cn+" xidea-syntax-open";\n      doOpen(tr);\n    }else{\n      tr.className = cn+" xidea-syntax-closed"\n      doClose(tr);\n    }\n    \n  }\n  function doClose(ele){\n    var d = ele.getAttribute("depth");\n    ele.setAttribute(\'closed\',"true");\n    while(ele = ele.nextSibling){\n      if(ele.nodeType == 1){\n        if(ele.getAttribute("depth")>d){\n          ele.style.display=\'none\';\n        }else{\n          break;\n        }\n      }\n    }\n  }\n  function doOpen(ele){\n    var d = ele.getAttribute("depth");\n    ele.removeAttribute(\'closed\');\n    var pre = ele;\n    var nc = -1;\n    while(ele = ele.nextSibling){\n      if(ele.nodeType == 1){\n        var nd = ele.getAttribute("depth");\n        if(nc>0){\n          if(nd > nc){\n            continue;\n          }else{\n            ele.style.display=\'\';\n            nc =-1;\n          }\n        }else if(nd>d){\n          ele.style.display=\'\';\n          if(ele.getAttribute(\'closed\')){\n            nc = nd;\n          }\n        }else{\n          break;\n        }\n        pre = ele;\n      }\n    }\n  }\n  var boundReg = /\\bxidea-syntax-bound\\b/;\n  function showBound(td,index){\n    if(index<1){return;}\n    var rows = td.parentNode.parentNode.rows;\n    var ele = rows[index-1];\n    ele.className = ele.className.replace(boundReg,\' \') + " xidea-syntax-bound";\n    var d = ele.getAttribute("depth");\n    while(ele = rows[index++]){\n      ele.className = ele.className.replace(boundReg,\' \') + " xidea-syntax-bound";\n      if(ele.getAttribute("depth")>d){\n      }else{\n        break;\n      }\n    }\n  }\n  function hiddenBound(td,index){\n    if(index<1){return;}\n    var rows = td.parentNode.parentNode.rows;\n    var ele = rows[index-1];\n    ele.className = ele.className.replace(boundReg,\' \');\n    var d = ele.getAttribute("depth");\n    while(ele = rows[index++]){\n      ele.className = ele.className.replace(boundReg,\' \');\n      if(ele.getAttribute("depth")>d){\n      }else{\n        break;\n      }\n    }\n  }\n  //]]><\/script> </body> </html>');return E.join("")}),"export-doc":new S(function(){function C($){return $ in B?B[$]:this[$]}var B=arguments[0],A=[],D=C("documentURL"),_=C("data"),$=C("encodeURIComponent");C=function($){return"&#"+$.charCodeAt()+";"};A.push('<html xmlns:hta="urn:htmlapplication" xmlns="http://www.xidea.org/ns/xhtml"> <meta content="1.0" http-equiv="X-JSIDoc-Version"/> <hta:application id="jdidoc" windowstate="maximize"></hta:application> <frameset rows="100%"> <frame src="');A.push(String(D).replace(/[<>&"]/g,C));A.push("?version=2.5#");A.push(String($(_)).replace(/[<>&"]/g,C));A.push('"></frame> </frameset> </html>');return A.join("")})}
var B={loadPackage:function(E,D){var G=E.getElementById("package_"+D);if(G.getAttribute("title")=="loading"){G.setAttribute("title","loaded");var A=G.firstChild,F=JSIDoc.packageInfoMap[D],$=F.getInitializers(),B=0;$.push(function(){var _=F.getObjectInfos();for(var B=0;B<_.length;B++)$.push(V(E,A,_[B]));$.push(function(){while(A.nextSibling)G.removeChild(A.nextSibling);G.removeChild(A)})});function _(){if(B<$.length)$[B++]();else clearInterval(C)}var C=setInterval(_,20)}}};function V(A,$,_){return function(){var B=A.createElement("li"),C=A.createElement("a");$.parentNode.insertBefore(B,$);B.setAttribute("title","file:"+_.fileInfo.name);C.className="item-"+_.type;C.setAttribute("class",C.className);C.setAttribute("href","?"+_.getPath());C.appendChild(A.createTextNode(_.name));B.appendChild(C)}}
function X($){if($.exec)return $;else{if($ instanceof Array)$=$.join("|");return new RegExp($,"m")}}function d(_,$){if(!(_ instanceof RegExp))_=new RegExp(_,"gm");return function(A){return A.replace(_,$)}}var Y=function(B,$){if(B){this.partitionerMap={};for(var C in B)this.partitionerMap[C]=X(B[C])}if($){this.rendererMap={};for(C in $){var A=$[C];if(A instanceof Function)this.rendererMap[C]=A;else{if(A instanceof Array)A="(\\b"+A.join("\\b|\\b")+"\\b)";var _=new RegExp(A,"g");this.rendererMap[C]=d(_,"<b class='keyword- keyword-$1-'>$1</b>")}}}};Y.prototype={parse:function(){if(!this.lines){this.depths=[];this.anchors=[];this.lines=[];var A=/\r\n|\n|\r/g,$=0,_;while(_=A.exec(this.source)){this.lines.push({begin:$,end:_.index});$=_.index+_[0].length}if($<this.source.length)this.lines.push({begin:$,end:this.source.length});this.partitions=b(this)}return new c(this)},defaultType:"code",guessType:function($){for(var _ in this.partitionerMap)if(this.partitionerMap[_].test($))return _;return this.defaultType},computeDepth:function(A,B){switch(A.type){case"code":var C=new RegExp("{|}","g"),_,$=A.value;while(_=C.exec($))if(_[0]=="{")this.depths.push([A.begin+_.index,B++,B]);else this.depths.push([A.begin+_.index,B--,B]);break;case"muti-comment":case"document":this.depths.push([A.begin,B++,B]);this.depths.push([A.end-1,B--,B]);break}return B}};function W(A,B,_,$){this.value=A;this.type=B;this.begin=_;this.end=$}function c($){this.parser=$;this.source=$.source;this.partitions=$.partitions;this.lines=$.lines;this.depths=$.depths;this.anchors=$.anchors;this.depth=0;this.nextDepth=0;this.depthStack=[-1];this.depthStart=-1;this.partitionIndex=0;this.lineIndex=0;this.depthIndex=0;this.anchorsIndex=0}c.prototype={hasNext:function(){return(this.partitions[this.partitionIndex]&&this.lines[this.lineIndex])},toString:function(){return this.toArray().join("\n")},toArray:function(){var _=[];while(true){var $=this.next();if($!=null)_.push($);else return _}},next:function(){var B=this.partitions[this.partitionIndex],D=this.lines[this.lineIndex];if(!B||!D)return null;try{var A=this.depths[this.depthIndex];if(A!=null)if(A[0]<D.end){this.depth=Math.min(A[1],A[2]);while(A=this.depths[++this.depthIndex])if(A[0]<D.end)this.depth=Math.min(this.depth,A[1],A[2]);else break;if(A)this.nextDepth=A[1];else{this.nextDepth=0;this.depth=0;this.depthStack.length=0;this.depthStart=-2}}else this.nextDepth=this.depth=A[1];var $=this.depth-this.depthStack.length+1;if($>0)while($-->0){this.depthStack.push(this.lineIndex);this.depthStart=this.lineIndex}else if($<0){this.depthStack.length=this.depth+1;this.depthStart=this.depthStack[this.depth]}var C=this.anchors[this.anchorsIndex];this.anchor="";if(C&&C.position<D.end)do{this.anchor+='<a name="'+C.name+'" ></a>';C=this.anchors[++this.anchorsIndex]}while(C&&C.position<D.end)if(B.end>=D.end)return this.render(D.begin,D.end,B.type);else{var _=[],$=D.begin;while(B.end<D.end){_.push(this.render($,$=B.end,B.type));B=this.partitions[++this.partitionIndex]}_.push(this.render($,D.end,B.type));return _.join("")}}finally{this.lineIndex++}},render:function(B,A,C){if(A>B){var _=this.source.substring(B,A);_=a(_);var $=this.parser.rendererMap[C];if($)_=$.call(this.parser,_);return"<span class='type-"+C+"-'>"+_+"</span>"}else return""}};function b(G){var H=[],D=[],K,I=G.source,L=[],$=0,F=0;for(var C in G.partitionerMap)H.push(G.partitionerMap[C].source);H=new RegExp(H.join("|"),"gm");while(K=H.exec(I)){var J=K[0],E=G.guessType(J);D.push(new W(J,E,K.index,K.index+J.length))}for(var _=0;_<D.length;_++){var B=D[_];if(B.begin>$){var A=new W(G.source.substring($,B.begin),G.defaultType,$,B.begin);F=G.computeDepth(A,F);L.push(A)}F=G.computeDepth(B,F);L.push(B);$=B.end}if($<G.source.length){B=new W(G.source.substr($),G.defaultType,$,G.source.length);F=G.computeDepth(B,F);L.push(B)}return L}function a($){if($)return $.replace(/[\r\n]/g,"").replace(/&/g,"&amp;").replace(/>/g,"&gt;").replace(/</g,"&lt;");return $}function Z($){this.source=$}Z.prototype=new Y({document:"/\\*\\*(?:[^\\*]|\\*[^/])*\\*/","muti-comment":"/\\*(?:[^\\*]|\\*[^/])*\\*/",comment:"//.*$",regexp:"/(?:\\\\.|(?:\\[\\\\.|[^\\n\\r]\\])|[^/\\n\\r])+/[gim]*",string:['"(?:\\\\(?:.|\\r|\\n|\\r\\n)|[^"\\n\\r])*"',"'(?:\\\\(?:.|\\r|\\n|\\r\\n)|[^'\\n\\r])*'"],preprocessor:"^\\s*#.*"},{code:["abstract","boolean","break","byte","case","catch","char","class","const","continue","debugger","default","delete","do","double","else","enum","export","extends","false","final","finally","float","for","function","goto","if","implements","im3port","in","instanceof","int","interface","long","native","new","null","package","private","protected","prototype","public","return","short","static","super","switch","synchronized","this","throw","throws","transient","true","try","typeof","var","void","volatile","while","with"],document:d(/@([\w-_\.\d]+)/g,"<b class='tag- tag-$1-'>@$1</b>")});Z.prototype.guessType=function(_){var A="";switch(_.charAt(0)){case"/":var $=_.charAt(1);if($=="/")A="comment";else if($=="*"){if(_.charAt(2)=="*"&&_.charAt(3)!="/")A="document";else A="muti-comment"}else A="regexp";break;case"'":case'"':A="string";break;case" ":case"#":A="preprocessor";break}return A}
function _(_){var D=new Date().getTime();this.source=_;this.parse();this.docEntries=[];this.docIds=[];this.docMap={};this.filedocs=[];for(var $=0;$<this.partitions.length;$++){var B=this.partitions[$];if(B.type=="document")this.docEntries.push(new e(this,B.begin,B.end))}for($=0;$<this.docEntries.length;$++){var C=this.docEntries[$];if(C.isFiledoc())this.filedocs.push(C);else{var A=C.getId();this.docMap[A]=C;this.docIds.push(A)}}this.timeSpent=new Date().getTime()-D}var f={};_.require=function(B,$){if($)B=$.replace(/\.|$/g,"/")+B;var C=f[B];if(!C){var A=JSIDoc.getSource(B);C=f[B]=new _(A||"/* empty */")}return C};_.prototype=new Z();_.prototype.getDescription=function(A){if(!("_description"in this)){var $=[];for(var _=0;_<this.filedocs.length;_++)$.push(this.filedocs[_].description||"");this._description=$.join("\r\n");if($.length==0&&this.partitions.length){var B=this.partitions[0];if(B.type=="comment")this._description=B.value.replace(/^\s*\/\//,"");else if(B.type=="muti-comment")this._description=B.value.replace(/(?:^\s*\/\*)|(?:\*\/\s*$)/g,"").replace(/^\s*\*\s?/gm,"")}}return this._description};_.prototype.getDocEntry=function($){return this.docMap[$]};_.prototype.getTopDocEntries=function(_){var A=[];for(var $=0;$<this.docEntries.length;$++)if(this.docEntries[$].isTop())A.push(this.docEntries[$]);return A}
var h={"public":{},"protected":{},"private":{},internal:{},friend:{}},i={"abstract":{},"final":{},"static":{},fileoverview:{alias:["filedoc"]},deprecated:{},constructor:{alias:["class"]}},j={author:{},access:{},version:{},arguments:{alias:["args"]},"instanceof":{},"typeof":{},"return":{},returnType:{alias:["type"]},name:{},owner:{alias:["member"]},extend:{alias:["extends"]}},g={"throw":{alias:["exception"]},param:{alias:["argument"]},see:{}}
function e(_,$,A){this.sourceEntry=_;this.source=_.source;this.begin=$;this.end=A;this.tagAttributes={constructor:null};this.sourceAttributes={constructor:null};_0(this);k(this)}var l=/^\s*function\s+[\w\$_]+\s*\([\w\$,\s]*\)/,n=/^\s*function\s*\([\w\$,\s]*\)/,z=/^\s*var\s+[\w\$]+\s*=/,y=/^\s*[\w\$\.]+\s*=/,x=/^\s*[\w\$]+\s*:/,s=/^[\s\S]*?([\w\.\$_]+)\s*[=,]\s*$/,p=/^[\s\S]*?function\s+([\w\$_]+)\s*\([\w\$_,\s]*\)\s*$/,q=[h,i,j,g],u={constructor:null};for(var v=0;v<q.length;v++)for(var o in q[v]){var w=q[v][o];if(w.alias)for(var t=0;t<w.alias.length;t++)u[w.alias[t]]=o}function A0(C){var $=C.begin,D=C.sourceEntry.depths,_=$0(D,$);if(_){var B=C.source.substr(0,_),A=B.replace(s,"$1");if(A!=B)return A}}function r(C){var $=C.begin,D=C.sourceEntry.depths,_=$0(D,$);if(_){var B=C.source.substr(0,_),A=B.replace(p,"$1");if(A!=B)return A+".this";A=B.replace(s,"$1");if(A!=B)return A.replace(/\.[a-z_\$][\w\$_]*$/,"")}}function $0(A,B){var _=A.length;while(_--&&A[_][0]>B);var C=A[_];if(C){var $=Math.max(C[1],C[2])-1;while(_){if($==C[2]&&C[1]<$)return C[0];C=A[--_]}}}function _0($){var D=$.source.substr($.end),E,A,_;if(l.test(D)){var C=D.indexOf("function"),B=D.indexOf("("),F=D.indexOf(")");E=D.substring(C+"function".length,B).replace(/\s*/g,"");A="function"}else{if(z.test(D)){C=D.indexOf("=");E=D.substring(D.indexOf("var")+3,C).replace(/\s*/g,"")}else if(y.test(D)){C=D.indexOf("=");E=D.substring(0,C).replace(/\s*/g,"")}else if(x.test(D)){C=D.indexOf(":");$.isProperty=true;E=D.substring(0,C).replace(/\s*/g,"")}D=D.substr(C+1);if(n.test(D))A="function";else if(/^\s*(\[|\{|(new\s+))/.test(D))A="object"}if(E&&E.length!=(E=E.replace(/^this\./,"")).length)$.isThis=true;$.sourceAttributes.name=E;$.sourceAttributes["typeof"]=A}function k(C){var E=C.source.substring(C.begin,C.end),_=/^\s*\*\s*(?:@([\w\d\-_]+))?\s*((?:(?:{@)|[^@])*)$/gm,D=null;while(D=_.exec(E)){var $=D[0],A=D[1],B=D[2];if(B)B=B.replace(/(?:\s*\*\/\s*$)|(?:^\s*\*\s?)/gm,"");if(A)switch(A){case"public":case"private":case"protected":case"internal":case"friend":case"intenal":m(C,"access",A);break;default:m(C,A,B)}else C.description=B}}function m($,B,A){if(u[B])B=u[B];var _=$.tagAttributes[B];if(_==null)_=$.tagAttributes[B]=[];_.push(A)}e.prototype.getAttribute=function(_){var $=this.tagAttributes[_];if($)return $[$.length-1];else return null};e.prototype.getExtend=function(){var $=this.getAttribute("extend");if($)return $.replace(/^\s*([\w\.]+)[\s\S]*$/,"$1")};e.prototype.isConstructor=function(){return this.tagAttributes.constructor!=null};e.prototype.getInstanceof=function(){return this.getAttribute("instanceof")};e.prototype.getTypeof=function(){return this.getAttribute("typeof")};e.prototype.getAccess=function(){return this.getAttribute("access")};e.prototype.getParams=function(){return this.tagAttributes.param};e.prototype.getDescription=function(){return this.description||""};e.prototype.getArguments=function(){return this.getAttribute("arguments")};e.prototype.getReturn=function(){return this.getAttribute("return")};e.prototype.getReturnType=function(){return this.getAttribute("returnType")};e.prototype.getStatic=function(){return this.tagAttributes["static"]&&true};e.prototype.getName=function(){var $=this.getAttribute("name");if($)return $;return this.sourceAttributes.name};e.prototype.isFileoverview=function(){return this.getAttribute("fileoverview")&&true};e.prototype.getId=function(){if(this.id)return this.id;if(this.tagAttributes.id)return this.id=this.tagAttributes.id[0].replace(/\s+/g,"");var $=this.getName();if(!$)return null;var _=this.getOwner();if(_){this.id=_+"."+$;return this.id}return this.id=$};e.prototype.getOwner=function(){if("owner"in this)return this.owner;var $=this.getAttribute("owner");if($)return this.owner=$.replace(/([\w\d\.\$\_]*)[\s\S]*$/,"$1");else{if(this.isThis)return this.owner=r(this);if(this.isProperty)return this.owner=A0(this);return this.owner=null}};e.prototype.isTop=function(){if(this.isConstructor())return true;else{var $=this.getId();return this.getOwner()==null&&$!=null&&$.indexOf(".")<0}};e.prototype.isFiledoc=function(){return this.isFileoverview()||this.getId()==null};e.EMPTY=new(function(){for(o in e.prototype)this[o]=e.prototype[o];this.tagAttributes={constructor:null};this.sourceAttributes={constructor:null}})()
function C($,A){D0[$]=this;this.name=$;this.packageObject=A;if(this.packageObject.name!=$){this.implementation=this.packageObject.name;return}this.fileInfos=[];for(var B in this.packageObject.scriptObjectMap){var _=new C0(this,B);this.fileInfos.push(_);this.fileInfos[B]=_}this.fileInfos.sort()}var D0={};C.require=function(_){if(_){if(D0[_])return D0[_];else{var $=$import(_+":");if($)return new C(_,$);else return null}}else return this.rootInfo};C.requireRoot=function($){if(this.rootInfo)return this.rootInfo;else return this.rootInfo=new B0($||["boot.js"])};C.prototype.getObjectInfo=function($){return this.getObjectInfoMap()[$]};C.prototype.getObjectInfoMap=function(){if(!this._objectInfoMap){var A={};for(var _=0;_<this.fileInfos.length;_++){var $=this.fileInfos[_].getObjectInfoMap();for(var B in $)A[B]=$[B]}this._objectInfoMap=A}return this._objectInfoMap};C.prototype.getObjectInfos=function(){if(!this._objectInfos){var $=[],B=this.getObjectInfoMap();for(var A in B)$.push(A);$.sort();for(var _=0;_<$.length;_++)$[_]=B[$[_]];this._objectInfos=$}return this._objectInfos};C.prototype.getInitializers=function(){function _($){return function(){$.getObjectInfoMap()}}var A=[];for(var $=0;$<this.fileInfos.length;$++)A.push(_(this.fileInfos[$]));return A};C.prototype.getPath=function(){return this.name+":"};C.prototype.getDescription=function(){return this.getSourceEntry().getDescription()};C.prototype.getSourceEntry=function(){if(!this._sourceParser)this._sourceParser=_.require("__package__.js",this.packageObject.name);return this._sourceParser}
function C0($,A){this.packageInfo=$;this._depInf=new DependenceInfo($.packageObject.name.replace(/\.|$/g,"/")+A);this.packageObject=$.packageObject;this.name=A;this.dependences=this.packageObject.dependenceMap[A]||[];this.objects=[];var _=this.packageObject.objectScriptMap;for(var B in _)if(_[B]==A)this.objects.push(B)}C0.prototype.getDescription=function(){return this.getSourceEntry().getDescription()};C0.prototype.getPath=function(){return this.packageInfo.name.replace(/\.|$/g,"/")+this.name};C0.prototype.getSourceEntry=function(){if(!this._sourceEntry)this._sourceEntry=_.require(this.name,this.packageObject.name);return this._sourceEntry};C0.prototype.getDocEntry=function($){return this.getSourceEntry().getDocEntry($)};C0.prototype.getObject=function($){return this.getObjectMap()[$]};var F0={};C0.prototype.getObjectMap=function(){if(!this._objectMap){try{var A={};try{var $=this.packageObject.name.replace(/\.|$/g,"/")+this.name,B=document.write;document.write=G0;!F0[$]&&$import($,null);document.write=B}catch(C){}for(var _=0;_<this.objects.length;_++)A[this.objects[_]]=H0(this.objects[_],this.packageObject.objectMap);this._objectMap=this._objectMap||A}catch(C){}}return this._objectMap};function G0(){}C0.prototype.getObjectInfo=function($){return this.getObjectInfoMap()[$]};C0.prototype.getObjectInfoMap=function(){if(!this._objectInfoMap){try{var A={};for(var $=0;$<this.objects.length;$++)A[this.objects[$]]=E0.create(this,this.objects[$]);this._objectInfoMap=this._objectInfoMap||A}catch(_){}}return this._objectInfoMap};C0.prototype.getAvailableObjectInfo=function($){var _=this.getAvailableObjectFileInfoMap()[$];if(_)return _.getObjectInfo($)};C0.prototype.getAvailableObjectFileInfoMap=function(D){if(!this._availableOFMap){var A={},G=this._depInf.getBeforeInfos();G=G.concat(this._depInf.getAfterInfos());for(var I=0;I<G.length;I++){var F=G[I],H=F.objectNames,E=F.packageObject.name,$=C.require(E),B=$.fileInfos[F.fileName];for(var _=0;_<H.length;_++)A[H[_]]=B}H=this.objects;for(I=0;I<H.length;I++)A[H[I]]=this;this._availableOFMap=this._availableOFMap||A}return this._availableOFMap};C0.prototype.getAvailableObjectMap=function(A){if(!this._availableMap){var $=this.getAvailableObjectFileInfoMap(),_={};for(var B in $)_[B]=$[B].getObject(B);this._availableMap=this._availableMap||_}return this._availableMap};function H0(_,A){_=_.split(".");for(var $=0;A!=null&&$<_.length;$++)A=A[_[$]];return A}
function N0($,A){function _(){}_.prototype=$.prototype;var B=new _();B.constructor=A;return B}function X0(A,_){var $=[],G=A.fileInfo.getAvailableObjectMap();for(var F in G){var H=G[F];if(H instanceof Function&&_ instanceof H){var B=0;for(var E in H.prototype)B++;if($.length){if(B>$[0])$=[B,F];else if(B==$[0])$.push(F)}else $=[B,F]}}if($.length)if($.length==2)return A.fileInfo.getAvailableObjectInfo($[1]);else{$[0]=$.pop();while((F=$.pop())&&(E=$.pop())){var D=G[F],C=G[E];if(D.prototype instanceof C)$.push(D);else $.push(C)}return A.fileInfo.getAvailableObjectInfo(F)}}var I0="private,internal,protected,friend,public";function R0($){if($.scrollIntoView)$.scrollIntoView(false)}function A(J,$){var H={},N={};for(var M=0;M<J.length;M++){try{var G=$import(J[M]+":");N[J[M]]=true}catch(C){J.splice(M,1)}}var O=[].concat(J);do{var L=[];for(M=0;M<O.length;M++){try{G=$import(O[M]+":")}catch(C){O.splice(M,1);continue}H[O[M]]=G;if(G.name!=O[M]){if(!N[G.name]){N[G.name]=G;L.push(G.name)}}else if($){try{if(G.initialize)G.initialize();var _=G.dependenceMap;for(var I in _){var A=_[I];for(var K=0;K<A.length;K++){var B=A[K],G=B[0],E=G.name;if(!N[E]){N[E]=G;L.push(E)}}}}catch(C){}}}O=L}while(O.length>0)var D=[];for(var F in H)D.push(F);return W0(J,D)}function W0(L,F){var G=L.concat([]).sort(function(_,$){return _.length-$.length}),H={},M={},B=F.length,_=[],N={},E=[];$:while(B--){var K=F[B],A=G.length;while(A--){var I=G[A];if(K.indexOf(I)==0){if(H[I]==M[I])H[I]=[];H[I].push(K);continue $}}_.push(K);N[K]=K.replace(/(^|\.)[^.]+$/,"")}var D=_.length;while(D){D=0;for(B=0;B<_.length;B++){var K=_[B],J=N[K];if(J){N[K]=J.replace(/(^|\.)[^.]+$/,"");for(A=0;A<L.length;A++){var C=L[A];if(C.indexOf(J)==0){var $=H[C];$.push(K);_.splice(B,1);break}}D++}}}for(B=0;B<L.length;B++){$=H[L[B]];E.push.apply(E,$.sort())}E.push.apply(E,_.sort());return E}var L0=/(^\w+:((\/\/\/\w\:)|(\/\/[^\/]*))?)/,K0=/(^\w+:\/\/[^\/#\?]*$)/,U0=/[#\?].*$/,O0=/[^\/\\]*([#\?].*)?$/,T0=/[^\/]+\/\.\.\//,S0=document.location.href.replace(K0,"$1/").replace(O0,""),P0=document.getElementsByTagName("base"),Q0=document.getElementsByTagName("script");function J0($){var A=$.replace(U0,"").replace(/\\/g,"/"),_=$.substr(A.length);if(L0.test(A))return A+_;else if(A.charAt(0)=="/")return L0.exec(S0)[0]+A+_;A=S0+A;while(A.length>(A=A.replace(T0,"")).length);return A+_}if(P0)for(var M0=P0.length-1;M0>=0;M0--){var V0=P0[M0].href;if(V0){S0=J0(V0.replace(K0,"$1/").replace(O0,""));break}}
function E0(A,B,$,_){this.name=B;this.object=$;this.fileInfo=A;this.packageInfo=A.packageInfo;this.docEntry=_;this.type=b0($,_)}E0.create=function($,C,D,A){D=D||$.getObject(C);A=A||$.getDocEntry(C);if(D==null){if(A){var E=A.getInstanceof(),B=A.getTypeof();if(B=="function"||(B==null&&E=="Function")||A.getReturn()||A.getParams())if(A.isConstructor())return new a0($,C,D,A);else return new Y0($,C,D,A);if(E||B=="object")return new E0($,C,D,A);else if(B)return new c0($,C,D,A);else return new d0($,C,D,A)}else return new d0($,C,D,e.EMPTY)}else if(D instanceof Function||D==Function.prototype){for(var _ in D.prototype)return new a0($,C,D,A||e.EMPTY);if(A&&A.isConstructor())return new a0($,C,D,A);return new Y0($,C,D,A||e.EMPTY)}else if(D instanceof Object){if(A&&A.isConstructor())return new a0($,C,D,A||e.EMPTY);return new E0($,C,D,A||e.EMPTY)}else return new c0($,C,D,A||e.EMPTY)};E0.prototype.docEntry=e.EMPTY;E0.prototype.getDescription=function(){return this.docEntry.getDescription()};E0.prototype.getPath=function(){return this.packageInfo.name+":"+this.name};E0.prototype.getLink=function(){return this.docEntry.tagAttributes.link};E0.prototype.getSee=function(){return this.docEntry.tagAttributes.see};E0.prototype.getShortDescription=function(){if(!("_shortDescription"in this)){var $=this.getDescription();if($)this._shortDescription=$.replace(/^([^\.\n\r。]*)[\s\S]*$/,"$1.");else this._shortDescription=""}return this._shortDescription};E0.prototype.getConstructorInfo=function(){if(!("_constructorInfo"in this)){var $=this.docEntry.getInstanceof();if($)this._constructorInfo=this.fileInfo.getAvailableObjectInfo($.replace(/^\s*|\s*$/g,""));if(!this._constructorInfo)if(this.object==null||this.object==window||this.object.constructor==Object)this._constructorInfo=null;else this._constructorInfo=X0(this,this.object)}return this._constructorInfo};E0.prototype.getDeclaredStaticInfos=function(){if(!this._declaredStaticInfos){var $=this.getStaticInfos(),A=[];for(var B=0;B<$.length;B++){var _=$[B],C=$[_];if(C.getPlace()==this){A.push(_);A[_]=C}}this._declaredStaticInfos=A}return this._declaredStaticInfos};E0.prototype.getStaticInfo=function($){return this.getStaticInfos()[$]};E0.prototype.getStaticInfos=function(){if(!this._staticInfos)this._staticInfos=Z0.createMembers(this,true);return this._staticInfos};E0.prototype.toString=function(){return this.type+this.name};E0.prototype.getAccess=function(){if(this.docEntry)return this.docEntry.getAccess()||"";return""};function d0(A,B,$,_){this.fileInfo=A;this.packageInfo=A.packageInfo;this.name=B;this.object=$;this.docEntry=_||e.EMPTY;this.type=b0($,_)}d0.prototype=N0(E0,d0);d0.prototype.getConstructorInfo=function(){return null};function c0(A,B,$,_){this.fileInfo=A;this.packageInfo=A.packageInfo;this.name=B;this.object=$;this.docEntry=_||e.EMPTY;this.type=b0($,_)}c0.prototype=N0(E0,c0);c0.prototype.getConstructorInfo=function(){return null};function b0(_,$){if(_!=null){if(_ instanceof RegExp)return"object";else return(typeof _)}else if(_===null)return $.getTypeof()||"null";else return $.getTypeof()||"undefined"}
function Y0(A,B,$,_){this.fileInfo=A;this.packageInfo=A.packageInfo;this.name=B;this.object=$;this.docEntry=_}Y0.prototype=N0(E0,Y0);Y0.prototype.getStaticInfos=function(){if(!this._staticInfos){this._staticInfos=Z0.createMembers(this,true);for(var $=0;$<this._staticInfos.length;$++)if(this._staticInfos[$]=="prototype"){this._staticInfos.splice($,1);delete this._staticInfos["prototype"]}}return this._staticInfos};Y0.prototype.getConstructorInfo=function(){var $;return function(){if(!$){$={};for(var _ in a0.prototype)$[_]=a0.prototype[_];$.object=Function;$.docEntry=e.EMPTY}return $}}();Y0.prototype.getParams=function(){if(this._params)return this._params;var _=this.docEntry.getParams();if(!_)if(this.object instanceof Function){try{_=/\(([^\(\)]*)\)/.exec(this.object.toString())[1].split(/\s*,\s*/)}catch($){_=[]}}else _=[];return this._params=new f0(_,this.fileInfo.getAvailableObjectFileInfoMap())};Y0.prototype.getArguments=function(){return this.docEntry.getArguments()};Y0.prototype.getReturnInfo=function(){if(!this._returnInfo){var $=this.docEntry.getReturn();$=new e0($,this.fileInfo.getAvailableObjectFileInfoMap());this._returnInfo=$}return this._returnInfo};Y0.prototype.type="function";function a0(A,B,$,_){this.fileInfo=A;this.packageInfo=A.packageInfo;this.name=B;this.object=$;this.docEntry=_}a0.prototype=N0(Y0,a0);a0.prototype.type="constructor";a0.prototype.getSuperInfo=function(){if(!("_superInfo"in this)){var A=this.docEntry.getExtend();if(A)this._superInfo=this.fileInfo.getAvailableObjectInfo(A);if(!this._superInfo&&this.object instanceof Function){var B=this.object.prototype,_=false;for(var $ in B)if($=="constructor")_=true;if(_||(B instanceof Object&&B.constructor!=this.object))this._superInfo=X0(this,this.object.prototype);else this._superInfo=null}}return this._superInfo};a0.prototype.getDeclaredInstanceInfos=function(){if(!this._declaredInstanceInfos){var A=this.getInstanceInfos(),_=[];for(var B=0;B<A.length;B++){var C=A[B],$=A[C];if($.getPlace()==this){_.push(C);_[C]=$}}this._declaredInstanceInfos=_}return this._declaredInstanceInfos};a0.prototype.getInheritList=function(){if(!this._inheritList){var _=[],$=this;do{_.push($)}while($=$.getSuperInfo())this._inheritList=_.reverse()}return this._inheritList};a0.prototype.getStaticInfos=function(){if(!this._staticInfos){var A=Z0.createMembers(this,true);for(var $=0;$<A.length;$++){var _=A[$];if(_=="prototype"){A.splice($,1);delete A[_];$--}}this._staticInfos=A}return this._staticInfos};a0.prototype.getInstanceInfo=function($){var _=this.getInstanceInfos()[$];return _==Array.prototype[$]?null:_};a0.prototype.getInstanceInfos=function(){if(!this._instanceInfos)this._instanceInfos=Z0.createMembers(this,false);return this._instanceInfos}
function f0($,A){A=A||{};var B=this.data=[];for(var _=0;_<$.length;_++)if($[_])B.push(new e0($[_],A));this.length=B.length}f0.prototype.toString=function(){return"("+this.data.join(" , ")+")"};function e0(D,B){var E=/^\s*([\w\$]+)?\s*(\{|<)/.exec(D);if(E){var A=E[0].length;if(E[0][A-1]=="{")var _=g0(D,A,"{","}");else _=g0(D,A,"<",">");if(_){var $=D.substring(A,_);if(E[1]){var C=E[1],F=D.substr(_+1);return}else D=D.substr(_+1)}}if(!C){E=/^\s*([\w\$]+)(?:\s+|$)([\s\S]*)?$/.exec(D);if(E)C=E[1],F=E[2];else F=D}if(C==="null")C="";this.type=$=$||"";this.name=C=C||"";this.description=F||"";this.html=l0(B,$)+C}e0.prototype.isValid=function(){return this.name||this.type};e0.prototype.toString=function(){return this.html};var h0={"int":"Number","double":"Number","float":"Number","byte":"Number","char":"String"},m0="http://www.xidea.org/project/jsidoc/js1.5/%1.html",j0={},i0=["Object","Function","RegExp","Array","String","Date","Number","Boolean"],k0=i0.pop();do{h0[k0.toLowerCase()]=k0;j0[k0]=m0.replace("%1",k0.toLowerCase())}while(k0=i0.pop())function l0(F,E){var D=E.split(/[| ]+/),_=[],A=D.length;while(A--){E=D[A];var C=F[E];if(!C)var B=h0[E]||E,$=j0[B];else $="?"+C.getObjectInfo(E).getPath();if($){if(C)_.push("<a href='",$,"'>",E,"</a>");else _.push("<a target='_native' onclick=\"open('about:blank','_native','scrollbars=1,toolbar=1,menubar=0,resizable=1,channelmode=1,width:600,height:600')\" href='",$,"'>",E,"</a>")}else if(E)_.push(E);if(A)_.push("|")}if(_.length){_.unshift("&lt;");_.push("&gt;")}return _.join("")}function g0(C,B,A,$){var _=0;while(++B<C.length)switch(C.charAt(B)){case A:_++;break;case $:if(_==0)return B;else if(_<0)return null;_--}return null}
function Z0(H,E,A,D,G){var F=H.name+(G?"#":"#prototype.")+A;this.id=H.packageInfo.name+":"+F;F=F.replace("#",".");var B=H.object;if(B)if(G)var _=B[A];else if(B.prototype)_=B.prototype[A];if(!(D instanceof e))D=e.EMPTY;var C=E0.create(H.fileInfo,F,_,D);for(var $ in C)this[$]=C[$];this.docEntry=D;this.ownerInfo=H;this.memberName=A;this.ownerInherits=E;this.isStatic=this["static"]=G}Z0.prototype=N0(E0,Z0);Z0.createMembers=function(_,B){var G=[];if(!_.object)return G;var F=_.object||{},I=_.fileInfo,K=I.sourceEntryList||I.getSourceEntry(),D={},J={};if(B)p0(K,_.name+".",D,J);else{var E=_.getInheritList();F=F.prototype||{};p0(K,_.name+".this.",D,J);p0(K,_.name+".prototype.",D,J)}for(var H in F){var $=D[H]||o0(J,H),A=new Z0(_,E,H,$,B);if(B){if(H=="constructor")continue}else A.memberType="prototype";try{if(!/^\d+$/.test(H)){G[H]=A;G.push(H)}}catch(C){}}for(H in D)if(!(H in F)){A=new Z0(_,E,H,D[H],B);if(!B)A.memberType="instance";try{if(!/^\d+$/.test(H)){G[H]=A;G.push(H)}}catch(C){}}G.sort(function($,C){try{var B=G[$].getAccess(),A=G[C].getAccess()}catch(_){}return(I0.indexOf(A)-I0.indexOf(B))||($>C?1:-1)});return G};Z0.prototype.getPlace=function(){if(!this.place){var $=this.ownerInherits&&this.ownerInherits.length;for(var A=0;A<$;A++){var _=this.ownerInherits[A],B=this.memberName;if((B in _.object.prototype)||_.getInstanceInfo(B)){this.place=_;break}}if(!this.place)this.place=this.ownerInfo}return this.place};function o0(B,$){for(name in B){var C=B[name],A=C.pattern,_=A.exec($);if(_)return new n0(C,$,_)}}function n0(C,A,B){for(var $ in C)this[$]=C[$];this.name=A;this.id=this.id.replace(/[^\.]+$/,A);var _=this.description||"";_=_.replace(/\$(\d)/,function(_,$){return B[$]});this.description=_}n0.prototype=e.prototype;function p0(F,E,$,A){if(F instanceof Array){var _=F.length;while(_--)p0(F[_],E,$,A)}else{var B=F.docIds;for(_=0;_<B.length;_++){var D=B[_];if(D.indexOf(E)==0){var C=D.substr(E.length);if(C.indexOf(".")<0)if(C.indexOf("*")>=0)(A[C]=F.getDocEntry(D)).pattern=new RegExp(C.replace(/\*/g,"(.*)"));else $[C]=F.getDocEntry(D)}}}}
var s0={};function DependenceInfo(A){if(s0[A])return s0[A];else s0[A]=this;var B=t0(A),F=B[0],_=B[1],D=B[2],C=this.packageObject=$import(F+":");if(C.initialize)C.initialize();this.path=A;this.filePath=F.replace(/\.|$/g,"/")+_;this.fileName=_;this.objectName=D;this.subInfos=[];if(D)this.objectNames=[D];else{this.objectNames=[];var $=this.packageObject.objectScriptMap;for(var E in $)if($[E]==_)this.objectNames.push(E)}}DependenceInfo.prototype={getBeforeVars:function(){},getAfterVars:function(){},getBeforeInfos:function(){return r0(this,0)},getAfterInfos:function(){return r0(this,1)},implicit:function($){if(this.packageObject==$.packageObject&&this.fileName==$.fileName)if(this.objectName==null||this.objectName==$.objectName)return true;else return q0($)}};function t0(A){var B=A.lastIndexOf("/");if(B>0)var _=A.substr(0,B).replace(/\//g,"."),$=A.substr(B+1);else{B=A.lastIndexOf(":");if(B==-1)B=A.lastIndexOf(".");var _=A.substr(0,B),C=A.substr(B+1),$=$import(_+":").objectScriptMap[C]}return[_,$,C]}function q0(C){if(C.subInfos[1])return!C.subInfos[1].length;var $=C.packageObject.dependenceMap[C.fileName],B=$&&$.length;while(B--){var A=$[B];if(A[4]){var _=A[3];if(!_||!C.objectName||C.objectName==_)return false}}return true}function r0(F,G){if(!F.subInfos[G]){var _=F.packageObject.dependenceMap[F.fileName],E=[],H=_&&_.length;$:while(H--){var A=_[H];if(!G==!A[4]){var C=A[3];if(!G||!C||!F.objectName||F.objectName==C){if(A[2])var D=A[0].name+":"+A[2];else D=A[0].name.replace(/\.|$/g,"/")+A[1];var $=new DependenceInfo(D),B=E.length;while(B--)if(E[B].implicit($))continue $;E.push($)}}}F.subInfos[G]=E}return F.subInfos[G]}
var w0=this.scriptBase.substr($JSI.scriptBase.length).replace(/\//g,".").replace(/\.$/,":"),u0=$import(w0),y0={$JSI:{},Package:function(){},$import:function(){},ScriptLoader:this.constructor,XMLHttpRequest:function(){}},v0=function(){};y0.XMLHttpRequest.prototype={readyState:0,responseText:"",responseXML:"",status:"",statusText:"",onreadystatechange:v0,abort:v0,getAllResponseHeaders:v0,getResponseHeader:v0,open:v0,send:v0,setRequestHeader:v0};for(var z0 in u0)if(!u0.hasOwnProperty(z0))y0.Package.prototype[z0]=u0[z0];function B0(_){var B=_||$1(),D=[];this.fileInfos=[];for(var $=0;$<B.length;$++){try{var C=new x0(this,B[$],D);this.fileInfos.push(C);this.fileInfos[B[$]]=C}catch(A){}}this.fileInfos.sort();this.name="";this.dependences=[]}B0.prototype=N0(C,B0);function $1(){var A=document.getElementsByTagName("script"),_=[],C={};for(var B=0;B<A.length;B++){var $=A[B];if($.src){_.push($.src);C[$.src]=true}}for(B=0;B<A.length;B++){$=A[B];while($=$.nextSibling)if($.nodeType==1)if($.tagName=="SCRIPT"){if($.src)if(C[$.src]||/__preload__\.js$/.test($.src))continue;else{_.push($.src);C[$.src]=true}}else break}for(B=0;B<_.length;B++)_[B]=J0(_[B]).replace($JSI.scriptBase,"");return _}B0.prototype.getDocEntry=function(A){for(var $=this.fileInfos.length-1;$>=0;$--){var _=this.fileInfos[$]._sourceEntry.getDocEntry(A);if(_)return _}};function x0($,E,F){var D=this._sourceEntry=_.require(E),B=D.getTopDocEntries();this.name=E;this.packageInfo=$;this.objects=[];this.dependences=[];this._depInf={};this.sourceEntryList=F;F.push(D);for(var A=0;A<B.length;A++){var C=B[A].getId();this.objects.push(C)}}x0.prototype=N0(C0,x0);x0.prototype.getObjectInfoMap=function(){if(this._objectInfoMap)return this._objectInfoMap;try{this._objectInfoMap={};for(var _=0;_<this.objects.length;_++)this._objectInfoMap[this.objects[_]]=E0.create(this,this.objects[_]);return this._objectInfoMap}catch($){}};x0.prototype.getAvailableObjectFileInfoMap=function(){var $=this.packageInfo;if(!$._availableOFMap){$._availableOFMap={};var A=$.fileInfos;for(var B=0;B<A.length;B++){var C=A[B].objects;for(var _=0;_<C.length;_++)$._availableOFMap[C[_]]=A[B]}}return $._availableOFMap};x0.prototype.getObjectMap=function(){if(this._objectMap)return this._objectMap;try{this._objectMap={};for(var _=0;_<this.objects.length;_++)this._objectMap[this.objects[_]]=y0[this.objects[_]]||window[this.objects[_]]}catch($){}return this._objectMap};x0.prototype.getDocEntry=function($){return this.packageInfo.getDocEntry($)};x0.prototype.getObject=function($){return this.getObjectMap()[$]}
var _1=[],S1={},X1={},O1="treeContainer",U1="fileOutput",R1="objectOutput",N1="exportButton",A1="prefixContainer",J1="jsidocURLContainer",Q1="mixTemplateContainer";

var E1=parent.exportService||$JSI.scriptBase+"export.action";
var I1=0,V1,ExportUI={prepare:function(C,B){V1=C;var D=A(B,true);_1=[];for(var $=0;$<D.length;$++){var _=D[$],E=$import(_+":");if(E.name==D[$]){_1.push(_);_1[_]=new M1(E)}}return _1},initialize:function(){},clickScript:function($){var _=X1[$];if(_)delete X1[$];else X1[$]=true;T1()},clickPackage:function($){var C=S1[$],A=W1(C),_=C.children,B=_.length;if(A<B)while(B--)X1[_[_[B]].id]=true;else while(B--)delete X1[_[_[B]].id];T1()},checkLevel:function(A){var E=A.value,D=V1.getElementById(A1),_=V1.getElementById(J1),C=V1.getElementById(Q1);D.style.display=(E>1)?"inline":"none";_.style.display=(E==-2)?"inline":"none";C.style.display=(E>1)?"inline":"none";var B=A.form.getElementsByTagName("li");for(var $=0;$<B.length;$++)B[$].style.display=($-2==E)?"block":"none"},doExport:function(E){C1("数据装在中.....");var C=E.level,H=C.length||6,F=E.mixTemplate.checked;while(H--){var G=C[H];if(G.checked){C=G.value;break}}var B=new Exporter();for(var _ in X1){if(F)B.addFeatrue("mixTemplate");B.addImport(_)}switch(C*1){case-2:C1(B.getDocumentContent(E.jsidocURL.value),true);break;case-1:C1(B.getXMLContent(),true);break;case 1:C1(B.getTextContent(),true);break;case 0:case 2:case 3:var $=E.prefix.value,A=B.getXMLContent(),D={content:A,exports:B.getImports().join(","),level:C,internalPrefix:$,lineSeparator:"\r\n"};if(location.protocol=="file:")G1(D,"http://litecompiler.appspot.com");else G1(D,E1);break;default:C1(B.getXMLContent(),true);break}}},P1;function C1(A,$){if(P1){try{P1.close()}catch(B){}finally{P1=null}}P1=P1||window.open("about:blank","source","modal=yes,left=200,top=100,width=600px,height=600px");var _=P1.document;_.open();_.write("<html><title>==请将文本筐中的内容拷贝到目标文件(js,xml,html,hta)==</title><style>*{width:100%;height:100%;padding:0px;margin:0px;}</style><body><textarea readonly='true' wrap='off'>");_.write(A.replace(/[<>&]/g,xmlReplacer));_.write("</textarea></body></html>");_.close()}function G1(B,$){if(P1){try{P1.close()}catch(_){}finally{P1=null}}P1=P1||window.open("about:blank","source","modal=yes,left=200,top=100,width=600px,height=600px");var A=document.createElement("form");document.body.appendChild(A);A.method="POST";A.target="source";A.action=$;for(var C in B){var D=document.createElement("input");D.name=C;D.value=B[C];A.appendChild(D)}A.submit();document.body.removeChild(A)}function D1($){var B=V1.forms[0].level;for(var A=0;A<B.length;A++){var _=B[A];if(_.disabled&&_.value==$){_.disabled=false;if(_.getAttribute("checked")){_.checked=true;_.click()}}}}function T1(){var J=_1.length,H=H1();while(J--){var $=_1[_1[J]],_=$.children,N=0,A=_.length,C=2;while(A--){var K=_[_[A]],I=X1[K.id];if(I)var F=4;else{F=0;if(H[K.filePath]){var G=new DependenceInfo(K.id),F=2,E=G.getAfterInfos(),B=E.length;while(B--){var L=E[B];if(!H[L.filePath]){F=1;break}}C=Math.min(C,F)}else C=1}F1(K,F);N+=F}if(N==0)F1($,0);else F1($,N==_.length*4?4:C)}var M=V1.getElementById(N1);M.disabled=true;for(var D in X1){M.disabled=false;break}}function F1($,_){V1.getElementById($.htmlId).className="checkbox"+_}function H1(){var E=V1.getElementById(U1),$=V1.getElementById(R1),A=[],F=new Exporter();for(var D in X1){F.addImport(D);var C=D.split(":")[1];if(C)A.push("<div title='",D,"'>",C,"</div>")}var G=F.getResult(),_={};for(var B=0;B<G.length;B++)_[G[B]]=true;E.innerHTML=G.join("<br />");$.innerHTML=A.join("");return _}function W1(A){var B=A.children,_=B.length,$=0;while(_--)if(X1[B[B[_]].id])$++;return $}function L1(E){var D=[];for(var $ in E.scriptObjectMap){var _=E.scriptObjectMap[$];if(_==null||_.length==0){var C=new K1(E,$);D.push($);D[$]=C}}for(var A in E.objectScriptMap){var B=new B1(E,A);D.push(A);D[A]=B}D.sort();return D}function M1($){this.shortName=$.name;this.id=$.name+":";this.children=L1($);S1[this.id]=this;this.htmlId="__$ID"+I1++}function K1($,_){this.shortName=_;this.packageName=$.name;this.filePath=this.id=$.name.replace(/\.|$/g,"/")+_;S1[this.id]=this;this.htmlId="__$ID"+I1++}function B1($,_){this.shortName=_;this.packageName=$.name;this.filePath=$.name.replace(/\.|$/g,"/")+$.objectScriptMap[_];this.id=$.name+":"+_;S1[this.id]=this;this.htmlId="__$ID"+I1++}
function Exporter(){this.imports=[];this.externPackage=[];this.result=[];this.cachedInfos=[];this.featrueMap={}}Exporter.prototype={addImport:function(A){if(/.\*$/.test(A)){var C=A.substr(0,A.length-2).replace(/\//g,"."),_=$import(C+":"),B=_.name.replace(/\./g,"/")+"/";for(var $ in _.scriptObjectMap)this.addImport(B+$)}else if(/.:$/.test(A))this.externPackage.push(A.substring(0,A.length-1));else{this.imports.push(A);Z1(new DependenceInfo(A),this.result,this.cachedInfos)}},getResult:function(){return this.result},addFeatrue:function($){this.featrueMap[$]=true},buildSourceFilter:function(){var $=[];function _(B,_){var A=$.length;while(A--)B=$[A](B,_);return B}if(this.featrueMap.mixTemplate)$.push(d1);$.reverse();return _},getTextContent:function(){var E=[],A={},C={},_=this.buildSourceFilter();for(var H=0;H<this.result.length;H++){var $=this.result[H],G=findGlobals(E[H]=this.getSource($,_)),B=G.length;while(B--){var F=G[B];if(A[F]){if(!C[F])C[F]=[$];else C[F].push($)}else A[F]=$}}for(F in C){var D=["直接合并可能引起脚本冲突，客户端检测到可能的脚本冲突如下：\n"];for(F in C)D.push(F,":",A[F],",",C[F],"\n");confirm(D.join(""));break}return E.join("\n")},getImports:function(){return this.imports},getXMLContent:function(){var E={},$=[],_=this.buildSourceFilter(),D=['<?xml version="1.0" encoding="UTF-8"?>\n','<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">\n',"<properties>\n"];for(var B=0;B<this.result.length;B++){var F=this.result[B],C=F.replace(/\/[^\/\/]+$/,"").replace(/\//g,".");if(!E[C]){E[C]=true;$.push(C)}var G=this.getSource(F,_);c1(D,F,G)}for(B=0;B<this.externPackage.length;B++){C=this.externPackage[B];if(!E[C]){E[C]=true;$.push(C)}}"".replace(/\./g,"/");$=A($,true);for(B=0;B<$.length;B++){F=$[B].replace(/\./g,"/")+"/__package__.js",G=this.getSource(F,_);c1(D,F,G)}D.push("</properties>\n");return D.join("")},getDocumentContent:function(I){var H={},D=[],J=this.buildSourceFilter();for(var K=0;K<this.result.length;K++){var C=this.result[K],G=C.replace(/\/[^\/\/]+$/,"").replace(/\//g,".");if(!H[G]){H[G]={};D.push(G)}}D=A(D,true);for(K=0;K<D.length;K++){var G=D[K],B=G.replace(/\.|$/g,"/"),E=$import(G+":");H[G]={"":this.getSource(B+"__package__.js")};for(var _ in E.scriptObjectMap){var F=this.getSource(B+_,J);H[G][_]=F}}return $("export-doc").render({documentURL:I,data:JSON.encode(H)})},getSource:function(B,$){if(parent.JSIDoc&&parent.JSIDoc.getSource)var A=parent.JSIDoc;else if(window.JSIDoc&&window.JSIDoc.getSource)A=window.JSIDoc;if(A&&A.getSource)var _=A.getSource(B);else _=loadTextByURL($JSI.scriptBase+"?path="+B);if(_==null);if($)_=$(_,B);return _}};var a1={"--":"\\u002d-","<":"\\u003c","&":"\\u0026",">":"\\u003e"},b1=/new\s+Template\s*\(((?:[\w\.\+\s]+|'.*?'|".*?")+)\)/g;function d1(A,_){if(b1.test(A)){$import(_,{});var B=$import(_.replace(/\/[^\/]+$/,":").replace(/\//g,".")),$=B.loaderMap[_.replace(/.*\//,"")];A=A.replace(b1,function(A,C){try{if(C&&(typeof $.hook(C)=="string")){var B=$.hook(A);if(B&&(B=B.compileData)){if(B instanceof Function)B=B.toString();else B=JSON.encode(B);return"new Template"+"("+B+")"}}}catch(_){}return A})}return A}function Y1($){return a1[$]}function c1(_,$,A){_.push("<entry key='",$,"'>");_.push(/[<>&]/.test(A)&&A.indexOf("]]>")<0?"<![CDATA["+A+"]]>":A.replace(/[<>&]/g,xmlReplacer));_.push("</entry>\n")}function Z1($,G,E){var B=$.getBeforeInfos(),A=B.length;$:while(A--){var C=B[A],_=E.length;while(_--){if(E[_].implicit($))return;if(E[_].implicit(C))continue $}Z1(C,G,E)}E.push($);var F=$.filePath,A=G.length;while(A--)if(F==G[A]){A++;break}if(A<=0)G.push(F);var D=$.getAfterInfos(),A=D.length;$:while(A--){C=D[A],_=E.length;while(_--)if(E[_].implicit(C))continue $;Z1(C,G,E)}}
});
$JSI.preload("org.xidea.jsidoc.util",'',function(){

		this.addScript('util.js',['xmlReplacer','loadTextByURL','JSON','$log','Request','findGlobals','findGlobalsAsList'])
});
$JSI.preload("org.xidea.jsidoc.util",'util.js',function(){eval(this.varText);
		/*
 * Compressed by JSA(www.xidea.org)
 */
function Request(B,C,A,_){this.xhr=new XMLHttpRequest();this.onComplete=A;this.onStep=_;this.options=C=new $(B,C);this.headers={Accept:"'text/javascript, text/html, application/xml, text/xml, */*'","Content-Type":C.contentType};var D=this;this.onreadystatechange=function(){var _=D.xhr.readyState;D.onStep&&D.onStep(_);if(_==4){var $=D.isSuccess();D.onComplete&&D.onComplete($);if($)D.onSuccess&&D.onSuccess();else D.onFailure&&D.onFailure();D.free=true;D.xhr.onreadystatechange=Function.prototype}};this.free=true}Request.prototype={send:function(A,C){this.free=false;var _=this.headers,B=this.options;C=C||B.sync;if(/post/i.test(B.method))if(this.xhr.overrideMimeType)_.Connection="close";this.xhr.open(B.method,B.url,!C);this.xhr.onreadystatechange=this.onreadystatechange;for(var $ in _)this.xhr.setRequestHeader($,_[$]);this.xhr.send(A);return this},isSuccess:function(){var $=this.getStatus();return $?$>=200&&$<300:null},getStatus:function(){var $=this.xhr;return $.readyState==4&&(($.responseText||$.responseXML)&&$.status)},putHeader:function(_,$){this.headers[_]=$;return this},getHeader:function($){if(this.xhr.readyState>=3)return this.xhr.getResponseHeader($)},evalResult:function(){if(this.xhr.readyState==4)return window.eval("("+this.xhr.responseText+")")},getResult:function(){if(/\/xml/.test(this.getHeader("Content-Type"))){if(this.xhr.readyState==4)return this.xhr.responseXML}else if(this.xhr.readyState>=3)return this.xhr.responseText},getXML:function(){if(this.xhr.readyState==4)return this.xhr.responseXML},getText:function(){if(this.xhr.readyState>=3)return this.xhr.responseText}};function $(A,$){this.url=A;if($.constructor==String)this.method=$;else for(var _ in $)this[_]=$[_]}$.prototype={method:"post",contentType:"application/x-www-form-urlencoded",encoding:"UTF-8"}
var A=new RegExp(["/\\*(?:[^\\*]|\\*[^/])*\\*/","//.*$",'"(?:\\\\(?:.|\\r|\\n|\\r\\n)|[^"\\n\\r])*"',"'(?:\\\\(?:.|\\r|\\n|\\r\\n)|[^'\\n\\r])*'","/.*/"].join("|"),"m");function _(B){var $="",_=B,E;$:while(E=A.exec(_)){var D=E.index+E[0].length,E=E.index;if(_.charAt(E)=="/"){switch(_.charAt(E+1)){case"/":case"*":$+=_.substr(0,E);_=_.substr(D);continue $}try{new Function($+_.replace(A,"/\\$&"));D=E;while((D=_.indexOf("/",D)+1)>E){try{var C=_.substring(E,D);if(/.*/.test(C))new Function(C);$+=_.substr(0,E)+"/./";_=_.substr(D);continue $}catch(F){}}throw new Error("怎么可能？？^_^")}catch(F){$+=_.substr(0,E+1);_=_.substr(E+1);continue $}}else{$+=_.substr(0,E)+'""';_=_.substr(D);continue $}}return $+_}function findGlobals(B){if(B instanceof Function)B=(""+B).replace(/^\s*function[^\}]*?\{|\}\s*$/g,"");B=_(B.replace(/^\s*#.*/,""));var A={},E=/\b(function\b[^\(]*)[^{]+\{|\{|\}|\[|\]/mg,C=/\b(var|function|,)\b\s*([\w\$]+)\s*/mg,K=[],L=0,H=0,$=0,J;while(J=E.exec(B))switch(J[0]){case"[":if(!L){if(!H)K.push(B.substring($,J.index),"[]");H++}break;case"]":if(!L){H--;if(!H)$=J.index+1}break;case"{":if(!H&&L)L++;break;case"}":if(!H&&L){L--;if(L==0)$=J.index+1}break;default:if(!H){if(!L)K.push(B.substring($,J.index),J[1],"}");L++}break}K.push(B.substr($));B=K.join("");B=B.replace(/([\w\$\]])\s*\([\w\$\d,]*\)/m,"$1()");$=0;while(J=C.exec(B))switch(J[1]){case"var":$=J.index;case"function":A[J[2]]=1;default:var G=B.charAt(J.index+J[0].length);if(G!=":"){var I=B.indexOf(";",$);if(I>0&&I<J.index)continue;try{I=B.substring($,J.index);I=I.replace(/[\r\n]/g," ");new Function(I+",a;")}catch(D){continue}A[J[2]]=1}}var F=[];for(J in A)F.push(J);return F}function findGlobalsAsList(B){var A=findGlobals(B),$=new java.util.ArrayList();for(var _=0;_<A.length;_++)$.add(A[_]);return $}
function xmlReplacer($){switch($){case"<":return"&lt;";case">":return"&gt;";case"&":return"&amp;";case"'":return"&#39;";case'"':return"&#34;"}}function loadTextByURL($){var A=new XMLHttpRequest();A.open("GET",$,false);try{A.send(null);if(A.status>=200&&A.status<300||A.status==304||!A.status)return A.responseText}catch(_){}finally{A.abort()}}
var JSON={decode:function($){return window.eval("("+$+")")},encode:B},D=/["\\\x00-\x1f\x7f-\x9f]/g,C={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"};function E(_){var $=C[_];if($)return $;$=_.charCodeAt().toString(16);return"\\u00"+($.length>1?$:"0"+$)}function B(F){switch(typeof F){case"string":D.lastIndex=0;return'"'+(D.test(F)?F.replace(D,E):F)+'"';case"function":return F.toString();case"object":if(!F)return"null";var A=[];if(F instanceof Array){var C=F.length;while(C--)A[C]=B(F[C])||"null";return"["+A.join(",")+"]"}for(var $ in F){var _=B(F[$]);if(_)A.push(B($)+":"+_)}return"{"+A.join(",")+"}";case"number":if(!isFinite(F))F="null";default:return String(F)}}
});
		
$import("org.xidea.jsidoc:JSIDoc");$JSI.preload(
'',{
'boot.js':'/*\r\n * JavaScript Integration Framework\r\n * License LGPL(\u60a8\u53ef\u4ee5\u5728\u4efb\u4f55\u5730\u65b9\u514d\u8d39\u4f7f\u7528,\u4f46\u8bf7\u4e0d\u8981\u541d\u556c\u60a8\u5bf9\u6846\u67b6\u672c\u8eab\u7684\u6539\u8fdb)\r\n * http://www.xidea.org/project/jsi/\r\n * \r\n * This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General \r\n * Public License as published by the Free Software Foundation; either version 2.1 of the License, or (at your option) \r\n * any later version.\r\n *\r\n * This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied \r\n * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more \r\n * details.\r\n *\r\n * @author jindw\r\n * @version $Id: boot.js,v 1.3 2008/02/25 05:21:27 jindw Exp $\r\n */\r\n\r\n/*\r\n * JSI2.5 \u8d77\uff0c\u4e3a\u4e86\u907f\u514dscriptBase \u63a2\u6d4b\u3002\u8282\u7701\u4ee3\u7801\u91cf\uff0c\u6211\u4eec\u4f7f\u7528\u5199\u6b7b\u7684\u65b9\u6cd5\u3002\r\n * \u5982\u679c\u60a8\u7684\u7f51\u9875\u4e0a\u4f7f\u7528\u4e86\u5982base\u4e4b\u7c7b\u7684\u6807\u7b7e\uff0c\u90a3\u4e48\uff0c\u4e3a\u4e86\u6478\u5e73\u6d4f\u89c8\u5668\u7684\u5dee\u5f02\uff0c\u4f60\u53ef\u80fd\u9700\u8981\u518d\u8fd9\u91cc\u660e\u786e\u6307\u5b9ascriptBase\u7684\u51c6\u786e\u8def\u5f84\u3002\r\n */\r\n/**\r\n * JSI\u5bf9\u8c61\r\n * @public\r\n */\r\nvar $JSI= {\r\n    /**\r\n     * \u811a\u672c\u6839\u8def\u5f84\uff0c\u8c03\u8bd5\u6a21\u5f0f\u4e0b\uff0c\u7cfb\u7edf\u6839\u636e\u542f\u52a8\u811a\u672c\u6587\u4ef6\u540d\u81ea\u52a8\u63a2\u6d4b\uff0c\u4f46\u662f\u771f\u5b9e\u90e8\u7f72\u65f6\uff0c\u9700\u8981\u7528\u6237\u81ea\u5df1\u624b\u52a8\u6307\u5b9a\u5305\u8def\u5f84\u3002\r\n     * @public\r\n     * @id $JSI.scriptBase\r\n     * @typeof string\r\n     * @static\r\n     */\r\n     //scriptBase : "http://localhost:8080/script2/"\r\n};\r\nif("org.xidea.jsi.boot:$log"){\r\n    /**\r\n     * \u5168\u5c40\u65e5\u5fd7\r\n     * <p>JSI \u53ef\u9009\u529f\u80fd,\u4f60\u4e5f\u53ef\u4ee5\u4f7f\u7528JSA\u5c06\u4ee3\u7801\u4e2d\u7684\u65e5\u5fd7\u5904\u7406\u4fe1\u606f\u6e05\u9664\u3002<p>\r\n     * <p>\u81eaJSI2.1\u4e4b\u540e\uff0c\u53ea\u6709\u5168\u5c40\u65e5\u5fd7\uff0c\u6ca1\u6709\u88c5\u5728\u5355\u5143\u65e5\u5fd7\u4e86\u3002<p>\r\n     * @typeof object\r\n     * @public\r\n     */\r\n    var $log;//\u5c06\u5728$import \u95ed\u5305\u4e2d\u521d\u59cb\u5316\r\n}\r\n\r\n\r\n\r\n\r\n/**\r\n * \u5bfc\u5165\u6307\u5b9a\u5143\u7d20\uff08\u811a\u672c\u3001\u51fd\u6570\u3001\u7c7b\u3001\u53d8\u91cf\uff09\u81f3\u6307\u5b9a\u76ee\u6807,\u9ed8\u8ba4\u65b9\u5f0f\u4e3a\u540c\u6b65\u5bfc\u5165\uff0c\u9ed8\u8ba4\u76ee\u6807\u4e3a\u5168\u5c40\u5bf9\u8c61\uff08Global == window(html)\uff09\u3002\r\n * <pre class="code"><code>  //Example:\r\n *   $import("com.yourcompany.ClassA")//\u5373\u65f6\u88c5\u8f7d--\u901a\u8fc7\u6307\u5b9a\u5bf9\u8c61\r\n *   $import("com/yourcompany/class-a.js")//\u5373\u65f6\u88c5\u8f7d--\u901a\u8fc7\u6307\u5b9a\u6587\u4ef6\r\n *   $import("example.ClassA",MyNamespace)//\u6307\u5b9a\u88c5\u8f7d\u76ee\u6807\r\n *   $import("example.ClassA",function(ClassA){alert("callback:"+ClassA)})//\u5f02\u6b65\u88c5\u8f7d\r\n *   $import("example/class-a.js",true)//\u5ef6\u8fdf\u88c5\u8f7d(\u53ef\u83b7\u5f97\u826f\u597d\u7279\u6027,\u9700\u8981\u7f16\u8bd1\u652f\u6301\u6216\u8005\u670d\u52a1\u7aef\u652f\u6301)\r\n * </code></pre>\r\n * <h3>\u5b9e\u73b0\u6b65\u9aa4\uff1a</h3>\r\n * <ul>\r\n *   <li>\u82e5\u5143\u7d20\u672a\u88c5\u8f7d\u6216\u4f9d\u8d56\u672a\u88c5\u8f7d\uff0c\u4e14\u4e3a\u5f02\u6b65\u88c5\u8f7d\u6a21\u5f0f\uff0c\u5148\u7f13\u5b58\u9700\u8981\u7684\u811a\u672c\u8d44\u6e90</li>\r\n *   <li>\u82e5\u5143\u7d20\u672a\u88c5\u8f7d\u6216\u4f9d\u8d56\u672a\u88c5\u8f7d\uff0c\u4e14\u4e3a\u540c\u6b65\u975e\u963b\u585e\u88c5\u8f7d\u6a21\u5f0f\uff0c\u6253\u5370\u9884\u88c5\u8f7d\u811a\u672c\uff08\u5f53\u524dscript\u6807\u7b7e\u7684\u5176\u4ed6\u811a\u672c<b>\u53ef\u80fd</b>\u7ee7\u7eed\u8fd0\u884c\uff0c\u6d4f\u89c8\u5668\u4e0d\u540c\u8868\u73b0\u7565\u6709\u4e0d\u540c\uff09;\r\n *    \u5e76\u4e14\u7b49\u5f85\u9884\u88c5\u8f7d\u811a\u672c\u6267\u884c\u4e4b\u540e\u7ee7\u7eed\u4ee5\u4e0b\u6b65\u9aa4</li>\r\n *   <li>\u82e5\u5143\u7d20\u672a\u88c5\u8f7d\u6216\u4f9d\u8d56\u672a\u88c5\u8f7d\uff0c\u88c5\u8f7d\u4e4b</li>\r\n *   <li>\u5c06\u8be5\u5143\u7d20\u58f0\u660e\u4e3a\u6307\u5b9a\u76ee\u6807\u7684\u5c5e\u6027(\u9ed8\u8ba4\u76ee\u6807\u4e3a\u5168\u5c40\u5bf9\u8c61\uff0c\u8fd9\u65f6\u76f8\u5f53\u4e8e\u58f0\u660e\u4e86\u5168\u5c40\u53d8\u91cf)</li>\r\n * </ul>\r\n * <h3>\u5168\u5c40\u5bf9\u8c61\u7684\u7279\u6b8a\u6027\u8bf4\u660e:</h3>\r\n * <ul>\r\n *   <p>\u5168\u5c40\u5bf9\u8c61\u7684\u5c5e\u6027\u540c\u65f6\u4e5f\u662f\u5168\u5c40\u53d8\u91cf\uff0c\u53ef\u4ee5\u5728\u4efb\u4f55\u5730\u65b9\u76f4\u63a5\u4f7f\u7528\uff0c<br/>\r\n *    \u4e5f\u5c31\u662f\u8bf4\uff1a<br/>\r\n *    $import\u51fd\u6570\u8c03\u7528\u65f6\uff0c\u9ed8\u8ba4\uff08\u672a\u6307\u5b9atarget\uff09\u5bfc\u5165\u6210\u5168\u5c40\u5bf9\u8c61\u5c5e\u6027\uff0c\u7b49\u4ef7\u4e8e\u58f0\u660e\u4e86\u4e00\u4e2a\u5168\u5c40\u53d8\u91cf\u3002</p>\r\n * </ul>\r\n * <p>\r\n *   <i><b>\u8be5\u65b9\u6cd5\u4e3a\u6700\u7ec8\u7528\u6237\u8bbe\u8ba1\uff08\u9875\u9762\u4e0a\u7684\u811a\u672c\uff09,\u4e0d\u63a8\u8350\u7c7b\u5e93\u5f00\u53d1\u8005\uff08\u6258\u7ba1\u811a\u672c\uff09\u4f7f\u7528\u8be5\u51fd\u6570,\u9664\u975e\u786e\u5b9e\u9700\u8981\uff08\u5982\u9700\u8981\u52a8\u6001\u5bfc\u5165\u65f6\uff09\u3002\u7c7b\u5e93\u5f00\u53d1\u8005\u53ef\u5728\u5305\u4e2d\u5b9a\u4e49\u811a\u672c\u4f9d\u8d56\u5b8c\u6210\u7c7b\u4f3c\u529f\u80fd\u3002</b></i>\r\n * </p>\r\n * @public\r\n * @param <string> path (package:Object|package.Object|package:*|package.*| scriptPath)\r\n * @param <Object|boolean|Function>targetocol  \u53ef\u9009\u53c2\u6570\uff0c\u6307\u5b9a\u5bfc\u5165\u5bb9\u5668\u3002\r\n *                    \u5f53\u8be5\u53c2\u6570\u672a\u6307\u5b9a\u65f6\uff0ctarget\u4e3a\u5168\u5c40\u53d8\u91cf\u5bb9\u5668,\u8fd9\u79cd\u60c5\u51b5\u7b49\u4ef7\u4e8e\u76f4\u63a5\u58f0\u660e\u7684\u5168\u5c40\u53d8\u91cf\u3002\r\n *                    \u5f53\u672a\u6307\u5b9a\u7b2c\u4e09\u4e2a\u53c2\u6570\u65f6\uff0c\u4e14target\u4e3a\u51fd\u6570\u6216\u8005boolean\u503c\u65f6,target\u4f5c\u4e3acol\u53c2\u6570\u5904\u7406\uff0c\u800ctarget\u672c\u8eab\u7b49\u4ef7\u4e3a\u672a\u6307\u5b9a\u3002\r\n *                    \u5f53\u8be5\u53c2\u6570\u4e3a\u6709\u6548\u5bf9\u8c61\u65f6(instanceof Object && not instanceof Function)\uff0c\u5bfc\u5165\u7684\u5143\u7d20\u5c06\u8d4b\u503c\u6210\u5176\u5c5e\u6027\uff1b\r\n * @param <Function|boolean> col callbackOrLazyLoad \u53ef\u9009\u53c2\u6570,\u9ed8\u8ba4\u4e3anull\u3002\r\n *                    \u5982\u679c\u5176\u503c\u4e3a\u51fd\u6570\uff0c\u8868\u793a\u5f02\u6b65\u5bfc\u5165\u6a21\u5f0f\uff1b\r\n *                    \u5982\u679c\u5176\u503c\u4e3a\u771f\uff0c\u8868\u793a\u5ef6\u8fdf\u540c\u6b65\u5bfc\u5165\u6a21\u5f0f\uff0c\u5426\u5219\u4e3a\u5373\u65f6\u540c\u6b65\u5bfc\u5165\uff08\u9ed8\u8ba4\u5982\u6b64\uff09\u3002\r\n * @return <Package|object|void> \u7528\u4e8e\u5373\u65f6\u5bfc\u5165\u65f6\u8fd4\u56de\u5bfc\u5165\u7684\u5bf9\u8c61\r\n *                    <ul>\r\n *                      <li>\u5bfc\u5165\u5355\u4e2a\u5bf9\u8c61\u65f6:\u8fd4\u56de\u5bfc\u5165\u5bf9\u8c61;</li>\r\n *                      <li>\u5bfc\u5165\u6587\u4ef6\u6216\u8005\u591a\u4e2a\u5bf9\u8c61(*)\u65f6:\u8fd4\u56de\u5bfc\u5165\u76ee\u6807;</li>\r\n *                      <li>\u5bfc\u5165\u5305\u65f6:\u8fd4\u56de\u5305\u5bf9\u8c61;</li>\r\n *                    </ul>\r\n *                    <p>\u4e00\u822c\u53ef\u5ffd\u7565\u8fd4\u56de\u503c.\u56e0\u4e3a\u9ed8\u8ba4\u60c5\u51b5\u4e0b,\u5bfc\u5165\u4e3a\u5168\u5c40\u53d8\u91cf;\u65e0\u9700\u518d\u663e\u793a\u7533\u660e\u4e86.</p>\r\n */\r\nvar $import = function(freeEval,cachedScripts){\r\n    /*\r\n     * \u52a0\u8f7d\u6307\u5b9a\u6587\u672c\uff0c\u627e\u4e0d\u5230\u6587\u4ef6(404)\u8fd4\u56denull,\u8c03\u8bd5\u65f6\u91c7\u7528\r\n     * @friend\r\n     * @param url \u6587\u4ef6url\r\n     * @return <string> \u7ed3\u679c\u6587\u672c\r\n     */\r\n    function loadTextByURL(url){\r\n        if("org.xidea.jsi.boot:avoidBlock"){\r\n            var req = new XMLHttpRequest();\r\n            req.open("GET",url,false);\r\n            //for ie file 404 will throw exception \r\n            //document.title = url;\r\n            req.send(\'\');\r\n            if(req.status >= 200 && req.status < 300 || req.status == 304 || !req.status){\r\n                //return  req.responseText;\r\n                return req.responseText;\r\n            }else{\r\n                //debug("load faild:",url,"status:",req.status);\r\n            }\r\n        }else{\r\n            //debug(url);\r\n            //trace(url);\r\n            //return \'\'; //throw new Error("uncached url:"+url)\r\n        }\r\n    }\r\n    if(this.document){\r\n        if(":debug"){\r\n    \t    /**\r\n    \t\t * \u65b9\u4fbf\u8c03\u8bd5\u7684\u652f\u6301\r\n    \t\t */\r\n            //compute scriptBase\r\n            var rootMatcher = /(^\\w+:((\\/\\/\\/\\w\\:)|(\\/\\/[^\\/]*))?)/;\r\n            //var rootMatcher = /^\\w+:(?:(?:\\/\\/\\/\\w\\:)|(?:\\/\\/[^\\/]*))?/;\r\n            var homeFormater = /(^\\w+:\\/\\/[^\\/#\\?]*$)/;\r\n            //var homeFormater = /^\\w+:\\/\\/[^\\/#\\?]*$/;\r\n            var urlTrimer = /[#\\?].*$/;\r\n            var dirTrimer = /[^\\/\\\\]*([#\\?].*)?$/;\r\n            var forwardTrimer = /[^\\/]+\\/\\.\\.\\//;\r\n            var base = document.location.href.\r\n                    replace(homeFormater,"$1/").\r\n                    replace(dirTrimer,"");\r\n            var baseTags = document.getElementsByTagName("base");\r\n            var scripts = document.getElementsByTagName("script");\r\n            /*\r\n             * \u8ba1\u7b97\u7edd\u5bf9\u5730\u5740\r\n             * @public\r\n             * @param <string>url \u539furl\r\n             * @return <string> \u7edd\u5bf9URL\r\n             * @static\r\n             */\r\n            function computeURL(url){\r\n                var purl = url.replace(urlTrimer,\'\').replace(/\\\\/g,\'/\');\r\n                var surl = url.substr(purl.length);\r\n                //prompt(rootMatcher.test(purl),[purl , surl])\r\n                if(rootMatcher.test(purl)){\r\n                    return purl + surl;\r\n                }else if(purl.charAt(0) == \'/\'){\r\n                    return rootMatcher.exec(base)[0]+purl + surl;\r\n                }\r\n                purl = base + purl;\r\n                while(purl.length >(purl = purl.replace(forwardTrimer,\'\')).length){\r\n                    //alert(purl)\r\n                }\r\n                return purl + surl;\r\n            }\r\n            //\u5904\u7406HTML BASE \u6807\u8bb0\r\n            if(baseTags){\r\n                for(var i=baseTags.length-1;i>=0;i--){\r\n                    var href = baseTags[i].href;\r\n                    if(href){\r\n                        base = computeURL(href.replace(homeFormater,"$1/").replace(dirTrimer,""));\r\n                        break;\r\n                    }\r\n                }\r\n            }\r\n    \r\n            //IE7 XHR \u5f3a\u5236ActiveX\u652f\u6301\r\n            if(this.ActiveXObject && this.XMLHttpRequest && location.protocol=="file:"){\r\n                this.XMLHttpRequest = null;\r\n            }\r\n            var script = scripts[scripts.length-1];\r\n    \t    if(script){\r\n    \t        //mozilla bug\r\n    \t        while(script.nextSibling && script.nextSibling.nodeName.toUpperCase() == \'SCRIPT\'){\r\n    \t            script = script.nextSibling;\r\n    \t        }\r\n    \t        scriptBase = (script.getAttribute(\'src\')||"/scripts/boot.js").replace(/[^\\/\\\\]+$/,\'\');\r\n    \t        $JSI.scriptBase = computeURL(scriptBase);\r\n            }\r\n    \r\n        }\r\n    }else{\r\n    \tif("org.xidea.jsi.boot:server"){\r\n    \t    $JSI.scriptBase= "classpath:///";\r\n    \t    loadTextByURL=function(url){\r\n    \t        /*\r\n    \t\t     \turl = url.replace(/^\\w+:(\\/)+(?:\\?.*=)/,\'$1\');\r\n    \t\t\t\tvar buf = new java.io.StringWriter();\r\n    \t\t\t\tvar ins = buf.getClass().getResourceAsStream(url);\r\n    \t\t\t\tvar ins = new java.io.InputStreamReader(ins,"utf-8");\r\n    \t\t\t\tvar c;\r\n    \t\t\t\twhile((c=ins.read())>=0){\r\n    \t\t\t\t\tbuf.append(c);\r\n    \t\t\t\t}\r\n    \t\t     */\r\n    \t\t     url = url.replace(/^\\w+:(\\/)+(?:\\?.*=)?/,\'\');\r\n        \t\t return Packages.org.xidea.jsi.impl.ClasspathRoot.loadText(url)+\'\';\r\n    \t    }\r\n    \t}\r\n    }\r\n    \r\n    if("org.xidea.jsi.boot:$log"){\r\n        $log = function (){\r\n            var i = 0;\r\n            var temp = [];\r\n            if(this == $log){\r\n                var bindLevel = arguments[i++];\r\n                temp.push(arguments[i++],":\\n\\n");\r\n            }\r\n            while(i<arguments.length){\r\n                var msg = arguments[i++]\r\n                if(msg instanceof Object){\r\n                    temp.push(msg,"{");\r\n                    for(var n in msg){\r\n                        temp.push(n,":",msg[n],";");\r\n                    }\r\n                    temp.push("}\\n");\r\n                }else{\r\n                    temp.push(msg,"\\n");\r\n                }\r\n            }\r\n            if(bindLevel >= 0){\r\n                temp.push("\\n\\n\u7ee7\u7eed\u5f39\u51fa ",temp[0]," \u65e5\u5fd7?");\r\n                if(!confirm(temp.join(\'\'))){\r\n                    consoleLevel = bindLevel+1;\r\n                }\r\n            }else{\r\n                alert(temp.join(\'\'));\r\n            }\r\n        }\r\n        /**\r\n         * \u8bbe\u7f6e\u65e5\u5fd7\u7ea7\u522b\r\n         * \u9ed8\u8ba4\u7ea7\u522b\u4e3adebug\r\n         * @protected\r\n         */\r\n        $log.setLevel = function(level){\r\n            if(logLevelNameMap[level]){\r\n                consoleLevel = level;\r\n            }else{\r\n                var i = logLevelNameMap.length;\r\n                level = level.toLowerCase();\r\n                while(i--){\r\n                    if(logLevelNameMap[i] == level){\r\n                        consoleLevel = i;\r\n                        return;\r\n                    }\r\n                }\r\n                $log("unknow logLevel:"+level);\r\n            }\r\n        };\r\n        /*\r\n         * @param bindLevel \u7ed1\u5b9a\u51fd\u6570\u7684\u8f93\u51fa\u7ea7\u522b\uff0c\u53ea\u6709\u8be5\u7ea7\u522b\u5927\u4e8e\u7b49\u4e8e\u8f93\u51fa\u7ea7\u522b\u65f6\uff0c\u624d\u53ef\u8f93\u51fa\u65e5\u5fd7\r\n         */\r\n        function buildLevelLog(bindLevel,bindName){\r\n        \tvar window = this;\r\n            return function(){\r\n                if(bindLevel>=consoleLevel){\r\n                    var msg = [bindLevel,bindName];\r\n                    msg.push.apply(msg,arguments);\r\n                    $log.apply($log,msg);\r\n                }\r\n                if(":debug"){\r\n                    if((typeof window && window.console == \'object\') && (typeof console.log == \'function\')){\r\n                        var msg = [bindLevel,bindName];\r\n                        msg.push.apply(msg,arguments);\r\n                        console.log(msg.join(\';\'))\r\n                        \r\n                    }\r\n                }\r\n            }\r\n        }\r\n        var logLevelNameMap = "trace,debug,info,warn,error,fatal".split(\',\');\r\n        var consoleLevel = 1;\r\n        /* \r\n         * \u5141\u8bb8\u8f93\u51fa\u7684\u7ea7\u522b\u6700\u5c0f \r\n         * @hack \u5148\u5f53\u4f5c\u4e00\u4e2a\u96f6\u65f6\u53d8\u91cf\u7528\u4e86\r\n         */\r\n        var logLevelIndex = logLevelNameMap.length;\r\n        //\u65e5\u5fd7\u521d\u59cb\u5316 \u63a8\u8fdf\u5230\u540e\u9762\uff0c\u65b9\u4fbfvar \u538b\u7f29\r\n    }\r\n    var packageMap = {};\r\n    var scriptBase = $JSI.scriptBase;\r\n    if("org.xidea.jsi.boot:col"){\r\n        var lazyTaskList = [];\r\n        var lazyScript ="<script src=\'data:text/javascript,$import()\'></script>";\r\n        //\r\n        /*\r\n         * \u7f13\u5b58\u6e05\u5355\u8ba1\u7b97\r\n         * data[0] = true \u5168\u90e8\u9700\u8981\u88c5\u8f7d\u4e86\r\n         * data[object] = true \u5bf9\u8c61\u9700\u8981\u88c5\u8f7d\u4e86\r\n         * \r\n         * data[1] = true \u6807\u8bc6\u5355\u5143\u5c1a\u672a\u88c5\u8f7d\u5e76\u4e14\u6ca1\u6709\u7f13\u5b58\uff08\u7edf\u8ba1\u7f13\u5b58\u6e05\u5355\u7684\u6570\u636e\u6e90\uff09\r\n         */\r\n        function appendCacheFiles(cacheFileMap,packageObject,file,object){\r\n            packageObject.initialize && packageObject.initialize();\r\n            var path = packageObject.name.replace(/\\.|$/g,\'/\') + file;\r\n            //data[0] \u88c5\u8f7d\u72b6\u6001\r\n            //data[1] \u811a\u672c\u662f\u5426\u65e0\u9700\u518d\u7f13\u5b58\r\n            var data = cacheFileMap[path];\r\n            var loader = packageObject.loaderMap[file];\r\n            \r\n            //\u5f00\u59cb\u8bbe\u7f6e\u72b6\u6001\r\n            if(data){//\u65e0\u9700\u518d\u4e0e\u88c5\u8f7d\u7cfb\u7edf\u540c\u6b65\uff0c\u6b64\u65f6data[1]\u4e00\u5b9a\u5df2\u7ecf\u8bbe\u7f6e\u4e86\u6b63\u786e\u7684\u503c\r\n                if(data[0]){//\u5df2\u7ecf\u88c5\u8f7d\u4e86\uff0c\u4e5f\u5c31\u662f\u5df2\u7ecf\u7edf\u8ba1\u4e86\uff0c\u4e0d\u5fc5\u91cd\u590d\r\n                    return;\r\n                }else{\r\n                    if(object){\r\n                        if(data[object]){//\u5df2\u7ecf\u88c5\u8f7d\u4e86\uff0c\u4e5f\u5c31\u662f\u5df2\u7ecf\u7edf\u8ba1\u4e86\uff0c\u4e0d\u5fc5\u91cd\u590d\r\n                            return;\r\n                        }else{\r\n                            data[object] = 1;//\u8fd9\u6b21\u4f1a\u88c5\u8f7d\u4e86\uff0c\u4e0b\u6b21\u5c31\u4e0d\u5fc5\u518d\u91cd\u590d\u4e86\r\n                        }\r\n                    }else{\r\n                        //\u5b8c\u5168\u88c5\u8f7d\u4e86\r\n                        data[0] = 1;\r\n                    }\r\n                }\r\n            }else{//\u672a\u88c5\u8f7d\uff0c\u5148\u7528\u5b9e\u9645\u88c5\u8f7d\u7684\u4fe1\u606f\u586b\u5145\u4e4b\r\n                cacheFileMap[path] = data = {}\r\n                //\u66f4\u65b0\u8be5\u88c5\u8f7d\u8282\u70b9\u72b6\u6001\r\n                data[object||0] = 1;\r\n                //\u8868\u793a\u7f13\u5b58\u6570\u636e\u662f\u5426\u7a7a\u7f3a\r\n                 data[1] = !loader && getCachedScript(packageObject.name,file) == null ;\r\n            }\r\n            \r\n            \r\n            //\u4ee5\u4e0b\u662f\u7edf\u8ba1\u4f9d\u8d56\r\n            if(loader){//\u4e8b\u5b9e\u4e0a\u5355\u5143\u5df2\u7ecf\u88c5\u8f7d\r\n                //dependenceMap \u518d\u4e0b\u4e00\u4e2a\u5206\u652f\u4e2d\u58f0\u660e\u4e86\uff0c\u602a\u5f02\u7684js\uff1a\uff08\r\n                if(deps = loader.dependenceMap){\r\n                    //deps[0]\u662f\u7edd\u5bf9\u4e0d\u53ef\u80fd\u5b58\u5728\u7684\uff01\uff01\r\n                    if(object){\r\n                        var deps = deps[object];\r\n                        var i = deps && deps.length;\r\n                        while(i--){\r\n                            var dep = deps[i];\r\n                            appendCacheFiles(cacheFileMap,dep[0],dep[1],dep[2])\r\n                        }\r\n                    }\r\n                    for(object in deps){\r\n                        var deps2 = deps[object];\r\n                        var i = deps2.length;\r\n                        while(i--){\r\n                            var dep = deps2[i];\r\n                            appendCacheFiles(cacheFileMap,dep[0],dep[1],dep[2])\r\n                        }\r\n                    }\r\n                }else{\r\n                    //\u6ca1\u6709\u4f9d\u8d56\uff0c\u6807\u8bc6\u4e3a\u5168\u90e8\u88c5\u8f7d\u5b8c\u6210\r\n                    data[0] = 1;\r\n                    //\u540c\u65f6\u5b8c\u6210\u8be5\u8282\u70b9\r\n                    //return;\r\n                }\r\n            }else{\r\n                var deps = packageObject.dependenceMap[file];\r\n                var i = deps && deps.length;\r\n                while(i--){\r\n                    var dep = deps[i];\r\n                    var key = dep[3];\r\n                    if(!object || !key || object == key){\r\n                        appendCacheFiles(cacheFileMap,dep[0],dep[1],dep[2]);\r\n                    }\r\n                }\r\n            }\r\n        }\r\n    }\r\n    //\u8fd9\u6bb5\u4ee3\u7801\u653e\u5728\u540e\u9762\uff0c\u4ec5\u4ec5\u662f\u4e3a\u4e86\u533a\u533a4\u4e2a\u5b57\u8282\u7684\u538b\u7f29\u3002\r\n    if("org.xidea.jsi.boot:$log"){\r\n        while(logLevelIndex--){\r\n            var logName = logLevelNameMap[logLevelIndex];\r\n            $log[logName] = buildLevelLog(logLevelIndex,logName);\r\n        };\r\n\r\n    }\r\n    /*\r\n     * \u83b7\u53d6\u811a\u672c\u7f13\u5b58\u3002\r\n     * @private\r\n     * @param <string>packageName \u5305\u540d\r\n     * @param <string>fileName \u6587\u4ef6\u540d\r\n     */\r\n    function getCachedScript(pkg,fileName){\r\n        return (pkg = cachedScripts[pkg]) && pkg[fileName];\r\n    };\r\n    /**\r\n     * \u7f13\u5b58\u811a\u672c\u3002\r\n     * @public\r\n     * @param <string>packageName \u5305\u540d\r\n     * @param <string>key \u6587\u4ef6\u76f8\u5bf9\u8def\u5f84\r\n     * @param <string|Function>value \u7f13\u5b58\u51fd\u6570\u6216\u6587\u672c\r\n     */\r\n    $JSI.preload = function(pkg,file2dataMap,value){\r\n        if(cachedScripts[pkg]){ //\u6bd4\u8f83\u5c11\u89c1\r\n            pkg = cachedScripts[pkg];\r\n            if(value == null){//null\u907f\u514d\u7a7a\u4e32\u5f71\u54cd\r\n                for(var n in file2dataMap){\r\n                    pkg[n] = file2dataMap[n];\r\n                }\r\n            }else{\r\n                pkg[file2dataMap] = value;\r\n            }\r\n        }else {\r\n            if(value == null){//null\u907f\u514d\u7a7a\u4e32\u5f71\u54cd\r\n                cachedScripts[pkg] = file2dataMap;\r\n            }else{\r\n              (cachedScripts[pkg] = {})[file2dataMap] = value;\r\n            }\r\n        }\r\n    };\r\n    //\u6a21\u62dfXMLHttpRequest\u5bf9\u8c61\r\n    if(this.ActiveXObject ){\r\n        if("org.xidea.jsi.boot:col"){\r\n            if(":debug"){\r\n                lazyScript =lazyScript.replace(/\'.*\'/,scriptBase+"?path=lazy-trigger.js");\r\n            }else{\r\n                lazyScript =lazyScript.replace(/\'.*\'/,scriptBase+"lazy-trigger.js");\r\n            }\r\n        }\r\n        if(!this.XMLHttpRequest ){\r\n            var xmlHttpRequstActiveIds = [\r\n                //"Msxml2.XMLHTTP.6.0,"  //\u90fdIE7\u4e86\uff0c\u7f62\u4e86\u7f62\u4e86\r\n                //"Msxml2.XMLHTTP.5.0,"  //office \u7684\r\n                //"Msxml2.XMLHTTP.4.0,"\r\n                //"MSXML2.XMLHTTP.3.0,"  //\u5e94\u8be5\u7b49\u4ef7\u4e8eMSXML2.XMLHTTP\r\n                "MSXML2.XMLHTTP",\r\n                "Microsoft.XMLHTTP"//IE5\u7684\uff0c\u6700\u65e9\u7684XHR\u5b9e\u73b0\r\n                ];\r\n            /**\r\n             * \u7edf\u4e00\u7684 XMLHttpRequest \u6784\u9020\u5668\uff08\u5bf9\u4e8eie\uff0c\u505a\u4e00\u4e2a\u6709\u8fd4\u56de\u503c\u7684\u6784\u9020\u5668\uff08\u8fd9\u65f6new\u64cd\u4f5c\u8fd4\u56de\u8be5\u8fd4\u56de\u503c\uff09\uff0c\u8fd4\u56de\u4ed6\u652f\u6301\u7684AxtiveX\u63a7\u4ef6\uff09\r\n             * \u5173\u4e8e XMLHttpRequest\u5bf9\u8c61\u7684\u8be6\u7ec6\u4fe1\u606f\u8bf7\u53c2\u8003\r\n             * <ul>\r\n             *   <li><a href="http://www.w3.org/TR/XMLHttpRequest/">W3C XMLHttpRequest</a></li>\r\n             *   <li><a href="http://www.ikown.com/manual/xmlhttp/index.htm">\u4e2d\u6587\u53c2\u8003</a></li>\r\n             *   <li><a href="http://msdn2.microsoft.com/en-us/library/ms762757(VS.85).aspx">MSXML</a></li>\r\n             * </ul>\r\n             * @id XMLHttpRequest \r\n             * @constructor\r\n             */\r\n            this.XMLHttpRequest = function(){\r\n                while(true){\r\n                    try{\r\n                         return new ActiveXObject(xmlHttpRequstActiveIds[0]);\r\n                    }catch (e){\r\n                        if(!xmlHttpRequstActiveIds.shift()){\r\n                            throw e;//not suport\r\n                        }\r\n                    }\r\n                }\r\n            };\r\n        }\r\n    }\r\n    /**\r\n     * \u5305\u4fe1\u606f\u6570\u636e\u7ed3\u6784\u7c7b<b> &#160;(JSI \u5185\u90e8\u5bf9\u8c61\uff0c\u666e\u901a\u7528\u6237\u4e0d\u53ef\u89c1)</b>.\r\n     * <p>\u5728\u5305\u76ee\u5f55\u4e0b\uff0c\u6709\u4e2a\u5305\u5b9a\u4e49\u811a\u672c\uff08__package__.js\uff09\uff1b\r\n     * \u5728\u5305\u7684\u6784\u9020\u4e2d\u6267\u884c\u8fd9\u6bb5\u811a\u672c\uff0c\u6267\u884c\u4e2d\uff0cthis\u6307\u5411\u5f53\u524d\u5305\u5bf9\u8c61</p>\r\n     * <p>\u5176\u4e2d,\u4e24\u4e2a\u5e38\u7528\u65b9\u6cd5,<a href="#Package.prototype.addScript">addScript</a>,<a href="#Package.prototype.addDependence">addDependence</a></p>\r\n     * <p>\u8be5\u5bf9\u8c61\u4e0d\u5e94\u8be5\u5728\u4efb\u4f55\u7684\u65b9\u4fee\u6539.</p>\r\n     * @public\r\n     * @constructor\r\n     * @implicit\r\n     * @param <string>name \u5305\u540d\uff08\u5fc5\u987b\u4e3a\u771f\u5b9e\u5b58\u5728\u7684\u5305\uff09\r\n     * @param <string>pscript \u5b9a\u4e49\u811a\u672c\r\n     */\r\n    function Package(name,pscript){\r\n        /*\r\n         * \u6ce8\u518c\u5305\r\n         */\r\n        /**\r\n         * \u5305\u540d \r\n         * @private\r\n         * @readonly\r\n         * @typeof string\r\n         * @id Package.this.name\r\n         */\r\n        packageMap[this.name = name] = this;\r\n\r\n        /**\r\n         * \u5305\u811a\u672c\u8def\u5f84\u76ee\u5f55 2\r\n         * @private\r\n         * @readonly\r\n         * @typeof string\r\n         */\r\n        this.scriptBase = scriptBase+(name.replace(/\\./g,\'/\'))+ \'/\';\r\n        /**\r\n         * \u5305\u811a\u672c\u4f9d\u8d56  \r\n         * \u8d77\u521d\u4f5c\u4e3a\u4e00\u4e2a\u6570\u7ec4\u5bf9\u8c61\u4e34\u65f6\u5b58\u50a8 \u4f9d\u8d56\u4fe1\u606f\u3002\r\n         * <code>\r\n         * {[thisPath1,targetPath1,afterLoad],...}</code>\r\n         * initialize\u6210\u5458\u65b9\u6cd5\u8c03\u7528\u540e\u3002\r\n         * \u5c06\u53d8\u6210\u4e00\u4e2a\u4f9d\u8d56\u8868\u3001\u4e14\u8ba1\u7b97\u5b8c\u5168\u90e8\u5305\u5185\u5339\u914d\r\n         * <code>\r\n         * [targetPackage, targetFileName, targetObjectName,thisObjectName, afterLoad, names]\r\n         * </code>\r\n         * \u8be5\u503c\u521d\u59cb\u5316\u540e\u4e3aObject\u5b9e\u4f8b,\u4e14\u4e00\u5b9a\u4e0d\u4e3a\u7a7a.\r\n         * @private\r\n         * @readonly\r\n         * @typeof object\r\n         */\r\n        this.dependenceMap = [];\r\n        /**\r\n         * \u811a\u672c\u88c5\u8f7d\u5668\u8868{scriptPath:ScriptLoader}\r\n         * @private\r\n         * @readonly\r\n         * @typeof object\r\n         */\r\n        this.loaderMap = {};\r\n        /**\r\n         * \u811a\u672c->\u5bf9\u8c61\u8868{scriptPath:objectName}\r\n         * object\u540d\u4e3a\u7c7b\u540d\u6216\u5305\u540d \u5982<code>YAHOO</code>\r\n         * @private\r\n         * @typeof object\r\n         * @readonly\r\n         */\r\n        this.scriptObjectMap = {};\r\n        /**\r\n         * \u5bf9\u8c61->\u811a\u672c\u8868{objectName:scriptPath}\r\n         * object\u540d\u4e3a\u5168\u540d \u5982<code>YAHOO.ui.Color</code>\r\n         * @private\r\n         * @readonly\r\n         * @typeof object\r\n         */\r\n        this.objectScriptMap = {};\r\n        /**\r\n         * \u5b58\u50a8\u9876\u7ea7\u5bf9\u8c61\u7684\u8868.\r\n         * \u6bd4\u5982yahoo ui \u7684objectMap = {YAHOO:?}\r\n         * prototype \u7684objectMap = {$:?,$A:? ....}\r\n         * @private\r\n         * @readonly\r\n         * @typeof object\r\n         * @owner Package.this\r\n         */\r\n        this.objectMap = {};\r\n        \r\n        try{\r\n            if(pscript instanceof Function){\r\n                pscript.call(this);\r\n            }else{\r\n                freeEval.call(this,pscript);\r\n            }\r\n        }catch(e){\r\n            if(":debug"){\r\n                //packageMap[name] = null;\r\n                if("org.xidea.jsi.boot:$log"){\r\n                    $log.error("Package Syntax Error:["+name+"]\\n\\nException:"+e);\r\n                }\r\n            }\r\n            throw e;\r\n        }\r\n\r\n    }\r\n\r\n\r\n    Package.prototype = {\r\n\r\n        /**\r\n         * \u521d\u59cb\u5316 \u5305\u4f9d\u8d56\u4fe1\u606f.\r\n         * @private\r\n         * @typeof function\r\n         * @param\r\n         */\r\n        initialize : function(){\r\n            //hack for null\r\n            this.initialize = 0;\r\n            //cache attributes\r\n            var thisObjectScriptMap = this.objectScriptMap;\r\n            var thisScriptObjectMap = this.scriptObjectMap;\r\n            var list = this.dependenceMap;\r\n            var map = {};\r\n            var i = list.length;\r\n            while(i--){\r\n                var dep = list[i];\r\n                var thisPath = dep[0];\r\n                var targetPath = dep[1];\r\n                var afterLoad = dep[2];\r\n                if(":debug"){\r\n                    if(!targetPath){\r\n                        if("org.xidea.jsi.boot:$log"){\r\n                            $log.error("\u4f9d\u8d56\u5f02\u5e38",dep.join(\'\\n\'),list.join(\'\\n\'));\r\n                        }\r\n                    }\r\n                }\r\n    \r\n                //\u5faa\u73af\u5185\u65e0\u8d4b\u503c\u53d8\u91cf\u58f0\u660e\u5e94\u7279\u522b\u5c0f\u5fc3\u3002\u51fd\u6570\u53d8\u91cf\r\n                var targetPackage = this;\r\n                //hack for null\r\n                var thisObjectName = 0;\r\n                //hack for null\r\n                var targetObjectName = 0;\r\n                //hack for distinctPackage = false\r\n                var distinctPackage = 0;\r\n                var allSource = "*" == thisPath;\r\n                var allTarget = targetPath.indexOf("*")+1;\r\n                \r\n                if (allSource || allTarget) {\r\n                    var targetFileMap;\r\n                    if (allSource) {\r\n                        var thisFileMap = thisScriptObjectMap;\r\n                    } else {\r\n                        var thisFileName = thisObjectScriptMap[thisPath];\r\n                        if (thisFileName) {\r\n                            thisObjectName = thisPath;\r\n                        } else {\r\n                            thisFileName = thisPath;\r\n                        }\r\n                        (thisFileMap = {})[ thisFileName ]= 0;\r\n                    }\r\n                    if (allTarget) {\r\n                        if (allTarget>1) {\r\n                            targetPackage = realPackage(findPackageByPath(targetPath));\r\n                            distinctPackage = 1;\r\n                        }\r\n                        targetFileMap = targetPackage.scriptObjectMap;\r\n                    } else {\r\n                        var targetFileName = thisObjectScriptMap[targetPath];\r\n                        if(targetFileName){\r\n                            targetObjectName = targetPath;\r\n                        }else if(thisScriptObjectMap[targetPath]){\r\n                            targetFileName = targetPath;\r\n                            //targetObjectName = null;\r\n                        }else{\r\n                            distinctPackage = 1;\r\n                            if(":debug"){\r\n                                if(!targetPath){\r\n                                    throw new Error("targetPath \u4e0d\u80fd\u4e3a\u7a7a")\r\n                                }\r\n                            }\r\n                            targetPackage = findPackageByPath(targetPath);\r\n                            if(":debug"){\r\n                                if(!targetPackage){\r\n                                    $log.error("targetPath:"+targetPath+" \u4e0d\u662f\u6709\u6548\u5bf9\u8c61\u8def\u5f84",this.name);\r\n                                }\r\n                            }\r\n                            targetPath = targetPath.substring(targetPackage.name.length + 1);\r\n                            targetPackage = realPackage(targetPackage);\r\n                            //targetObjectName = null;\r\n                            var targetFileName = targetPackage.objectScriptMap[targetPath];\r\n                            if (targetFileName) {\r\n                                targetObjectName = targetPath;\r\n                            } else {\r\n                                targetFileName = targetPath;\r\n                            }\r\n                        }\r\n                        (targetFileMap = {})[ targetFileName ]= 0;\r\n                    }\r\n                    for (var targetFileName in targetFileMap) {\r\n                        var dep = [targetPackage, targetFileName, targetObjectName,thisObjectName,afterLoad,\r\n                                      targetObjectName ? [targetObjectName.replace(/\\..*$/,\'\')]\r\n                                                       :targetPackage.scriptObjectMap[targetFileName]]\r\n                        for (var thisFileName in thisFileMap) {\r\n                            if (distinctPackage || thisFileName != targetFileName) {\r\n                                (map[thisFileName] || (map[thisFileName] = [])).push(dep);\r\n                            }\r\n                        }\r\n                    }\r\n                } else {\r\n                    var thisFileName = thisObjectScriptMap[thisPath];\r\n                    var targetFileName = thisObjectScriptMap[targetPath];\r\n                    if (thisFileName) {//is object\r\n                        thisObjectName = thisPath;\r\n                    } else {\r\n                        thisFileName = thisPath;\r\n                    }\r\n                    if(targetFileName){\r\n                        targetObjectName = targetPath;\r\n                    }else if(thisScriptObjectMap[targetPath]){\r\n                        targetFileName = targetPath;\r\n                    }else{\r\n                        if(":debug"){\r\n                            if(!targetPath){\r\n                                throw new Error("targetPath \u4e0d\u80fd\u4e3a\u7a7a")\r\n                            }\r\n                        }\r\n                        targetPackage = findPackageByPath(targetPath);\r\n                        if(":debug"){\r\n                            if(!targetPackage){\r\n                                $log.error("targetPath:"+targetPath+" \u4e0d\u662f\u6709\u6548\u5bf9\u8c61\u8def\u5f84",this.name);\r\n                            }\r\n                        }\r\n                        targetPath = targetPath.substr(targetPackage.name.length + 1);\r\n                        targetPackage = realPackage(targetPackage);\r\n                        var targetFileName = targetPackage.objectScriptMap[targetPath];\r\n                        if (targetFileName) {\r\n                            targetObjectName = targetPath;\r\n                        } else {\r\n                            targetFileName = targetPath;\r\n                        }\r\n                    }\r\n                    (map[thisFileName] || (map[thisFileName] = [])).push(\r\n                        [targetPackage, targetFileName, targetObjectName,thisObjectName,afterLoad,\r\n                                  targetObjectName ? [targetObjectName.replace(/\\..*$/,\'\')]\r\n                                                   :targetPackage.scriptObjectMap[targetFileName]]\r\n                    );\r\n                }\r\n    \r\n            }\r\n            this.dependenceMap = map;\r\n        },\r\n\r\n        /**\r\n         * \u6dfb\u52a0\u811a\u672c\u53ca\u5176\u58f0\u660e\u7684\u5bf9\u8c61\uff08\u51fd\u6570\u3001\u65b9\u6cd5\u540d\uff09\u3002\r\n         * \u9700\u8981\u6307\u5b9a\u811a\u672c\u4f4d\u7f6e\uff08\u5fc5\u987b\u5728\u5f53\u524d\u5305\u76ee\u5f55\u4e2d\uff09\uff0c\u5143\u7d20\u540d(\u53ef\u7528\u6570\u7ec4\uff0c\u540c\u65f6\u6307\u5b9a\u591a\u4e2a)\u3002\r\n         * <i>\u8be5\u6210\u5458\u51fd\u6570\u53ea\u5728\u5305\u5b9a\u4e49\u6587\u4ef6\uff08__package__.js\uff09\u4e2d\u8c03\u7528 </i>\r\n         * @public\r\n         * @typeof function\r\n         * @param <string>scriptPath \u6307\u5b9a\u811a\u672c\u8def\u5f84\r\n         * @param <string|Array>objectNames [opt] \u5b57\u7b26\u4e32\u6216\u5176\u6570\u7ec4\r\n         * @param <string|Array>beforeLoadDependences [opt] \u88c5\u5728\u524d\u4f9d\u8d56\r\n         * @param <string|Array>afterLoadDependences [opt] \u88c5\u5728\u540e\u4f9d\u8d56\r\n         */\r\n        addScript :  function(scriptPath, objectNames, beforeLoadDependences, afterLoadDependences){\r\n            var objects = this.scriptObjectMap[scriptPath];\r\n            if(objects){\r\n                var previousObject = objects[objects.length-1];\r\n            }else{\r\n                objects = (this.scriptObjectMap[scriptPath] = []);\r\n            }\r\n            if(":debug"){\r\n                if(objectNames == \'*\'){\r\n                    $log.trace("\u90e8\u7f72\u540e\u4e0d\u5e94\u51fa\u73b0\u7684\u914d\u7f6e\uff0c\u9700\u8981\u538b\u7f29\u5904\u7406\u6389\u76f8\u5173\u95ee\u9898\uff01\uff01\uff01");\r\n                    objectNames = doObjectImport(\r\n                        realPackage(\r\n                        \tfindPackage("org.xidea.jsidoc.util",true)\r\n                        ),"findGlobals")(getCachedScript(this.name,scriptPath)||loadTextByURL(scriptBase+"?path="+this.name.replace(/\\.|$/g,\'/\')+scriptPath));\r\n                    \r\n                }\r\n            }\r\n            if(objectNames){\r\n                if(objectNames instanceof Array){\r\n                    for(var i = 0,len = objectNames.length;i<len;i++){\r\n                        var object = objectNames[i];\r\n                        this.objectScriptMap[object] = scriptPath;\r\n                        object = object.replace(/\\..*$/,\'\');\r\n                        if(previousObject != object){\r\n                            objects.push(previousObject = object);\r\n                        }\r\n                    }\r\n                }else{\r\n                    this.objectScriptMap[objectNames] = scriptPath;\r\n                    objectNames = objectNames.replace(/\\..*$/,\'\');\r\n                    if(previousObject != objectNames){\r\n                        objects.push(objectNames);\r\n                    }\r\n                }\r\n            }\r\n            beforeLoadDependences && this.addDependence(scriptPath, beforeLoadDependences);\r\n            afterLoadDependences && this.addDependence(scriptPath, afterLoadDependences,1);\r\n        },\r\n        /**\r\n         * \u6dfb\u52a0\u811a\u672c\u4f9d\u8d56\u3002\r\n         * \u9700\u8981\u6307\u5b9a\u5f53\u524d\u811a\u672c\u6587\u4ef6\u6216\u8005\u811a\u672c\u5143\u7d20\u4f4d\u7f6e\uff08\u5fc5\u987b\u5728\u5f53\u524d\u5305\u76ee\u5f55\u4e2d\uff09\u3001\r\n         * \u88ab\u4f9d\u8d56\u7684\u811a\u672c\u6587\u4ef6\u6216\u8005\u811a\u672c\u5143\u7d20\u4f4d\u7f6e(\u5f53\u524d\u5305\u4e2d\u7684\u811a\u672c\uff0c\u6216\u8005\u901a\u8fc7\u62bd\u8c61\u8def\u5f84\u6307\u5b9a\u5176\u4ed6\u5305\u4e2d\u7684\u811a\u672c)\u3001\r\n         * \u662f\u5426\u9700\u8981\u6267\u884c\u524d\u5bfc\u5165(\u88c5\u8f7d\u671f\u4f9d\u8d56)\u3002\r\n         * <i>\u8be5\u6210\u5458\u51fd\u6570\u53ea\u5728\u5305\u5b9a\u4e49\u6587\u4ef6\uff08__package__.js\uff09\u4e2d\u8c03\u7528 </i>\r\n         * @public\r\n         * @typeof function\r\n         * @param thisPath \u672c\u5305\u4e2d\u5f53\u524d\u811a\u672c\u6587\u4ef6\u6216\u8005\u811a\u672c\u5143\u7d20\uff0c\u4f7f\u7528*\u53ef\u8868\u793a\u5f53\u524d\u8be5\u5305\u4e2d\u5df2\u6dfb\u52a0\u5168\u90e8\u811a\u672c\u6587\u4ef6\uff08\u5c06\u9010\u4e00\u6dfb\u52a0\u540c\u6837\u7684\u4f9d\u8d56\uff09\u3002\r\n         * @param targetPath \u4f9d\u8d56\u7684\u811a\u672c\u6587\u4ef6\u62bd\u8c61\u8def\u5f84\uff08\u53ef\u4e0d\u5305\u62ec\u6700\u540e\u7684\u7248\u672c\u5305\uff09\u6216\u8005\u811a\u672c\u5143\u7d20\u62bd\u8c61\u8def\u5f84\r\n         * @param afterLoad \u53ef\u9009\u53c2\u6570(\u9ed8\u8ba4\u4e3afalse) \u662f\u5426\u53ef\u4ee5\u6267\u884c\u540e\u5bfc\u5165(\u8fd0\u884c\u671f\u4f9d\u8d56)\r\n         */\r\n        addDependence : function(thisPath,targetPath,afterLoad){\r\n            if(targetPath instanceof Array){\r\n                var i = targetPath.length;\r\n                while(i--){\r\n                    this.addDependence(thisPath,targetPath[i],afterLoad);\r\n                }\r\n            }else{\r\n                //TODO:\u53ef\u7f16\u8bd1\u4f18\u5316,\u8fdb\u4f18\u5316\u7684\u811a\u672c\u53ef\u4ee5\u76f4\u63a5\u5220\u9664\u6b64\u8fd0\u884c\u65f6\u4f18\u5316\r\n                if("org.xidea.jsi.boot:dependenceOptimize"){\r\n                    if(!afterLoad ){\r\n                        thisPath = this.objectScriptMap[thisPath] || thisPath;\r\n                    }\r\n                    /* \u8fd8\u662f\u6ca1\u6709\u60f3\u597d\u600e\u4e48\u641e\u76f8\u5bf9\u8def\u5f84\r\n                    if(targetPath.charAt(0) == \'.\'){\r\n                        if(/\\w\\//.test(targetPath)){\r\n                            \r\n                        }\r\n                        targetPath = this.name + targetPath;\r\n                        while(targetPath!=(targetPath = targetPath.replace(/\\w+\\.\\.\\//,\'\')));\r\n                    }\r\n                    */\r\n                }\r\n                this.dependenceMap.push([thisPath,targetPath,afterLoad]);\r\n            }\r\n            \r\n        },\r\n    \r\n        /**\r\n         * \u8bbe\u7f6e\u5177\u4f53\u5b9e\u73b0\u5305\u540d,\u7528\u4e8e\u7248\u672c\u7ba1\u7406,\u4e0d\u5e38\u7528\u3002\r\n         * \u6bd4\u5982\uff0c\u6211\u4eec\u53ef\u4ee5\u7ed9prototype\u5e93\u4e00\u4e2a\u7edf\u4e00\u7684\u5305\uff0c\r\n         * \u4f46\u662f\u6211\u4eec\u7684\u5185\u5bb9\u90fd\u653e\u5728\u5177\u4f53\u7684\u5b9e\u73b0\u7248\u672c\u91cc\uff0c\r\n         * \u6211\u4eec\u53ef\u4ee5\u901a\u8fc7\u8be5\u8bbe\u7f6e\uff08setImplementation(".v1_5");\uff09\u6765\u6307\u5b9a\u9ed8\u8ba4\u7684\u5177\u4f53\u5b9e\u73b0\u7248\u672c\u3002\r\n         * <i>\u8be5\u6210\u5458\u51fd\u6570\u53ea\u5728\u5305\u5b9a\u4e49\u6587\u4ef6\uff08__package__.js\uff09\u4e2d\u8c03\u7528 </i>\r\n         * @public\r\n         * @typeof function\r\n         * @param <String> packagePath \u6307\u5b9a\u5b9e\u73b0\u5305\u540d\uff0c\u5168\u8def\u5f84(ID(.ID)*)\u6216\u76f8\u5bf9\u8def\u5f84\uff08"." \u5f00\u59cb\u7684\u4e3a\u672c\u5305\u4e0b\u7684\u76f8\u5bf9\u8def\u5f84\uff09\r\n         */\r\n        setImplementation : function(packagePath){\r\n            if(packagePath.charAt(0) == \'.\'){\r\n                packagePath = this.name + packagePath;\r\n                while(packagePath != (packagePath = packagePath.replace(/\\w+\\.\\.\\//,\'\')));\r\n            }\r\n            this.implementation = packagePath;\r\n        }\r\n        //,constructor : Package\r\n    };\r\n//\u5947\u602a\u7684\u95ee\u9898\r\n//    if("org.xidea.jsi.boot:exportPackage"){\r\n//        Package.prototype.constructor = Package; \r\n//    }\r\n\r\n\r\n//    if("org.xidea.jsi.boot:exportPackage"){\r\n//        $JSI.Package = Package; \r\n//    }\r\n\r\n\r\n    \r\n    /*\r\n     * \u521b\u5efa\u4e00\u4e2a\u65b0\u7684\u7c7b\u52a0\u8f7d\u5668\uff0c\u52a0\u8f7d\u6307\u5b9a\u811a\u672c\r\n     * @private\r\n     * @typeof function\r\n     * @param packageObject \u6307\u5b9a\u7684\u811a\u672c\u6587\u4ef6\u540d\r\n     * @param scriptPath \u6307\u5b9a\u7684\u811a\u672c\u6587\u4ef6\u540d\r\n     * @param object \u9700\u8981\u88c5\u8f7d\u7684\u5bf9\u8c61 * \u4ee3\u8868\u5168\u90e8\u5143\u7d20\r\n     */\r\n     function loadScript(packageObject,fileName,object){\r\n        var loader = packageObject.loaderMap[fileName];\r\n        if(!loader){\r\n            //trace("load script path:",packageObject.scriptBase ,fileName);\r\n            if(packageObject.scriptObjectMap[fileName]){\r\n                //\u4e0d\u6562\u786e\u8ba4\u662f\u5426\u9700\u8981\u5ef6\u8fdf\u5230\u8fd9\u91cc\u518d\u884c\u521d\u59cb\u5316\u64cd\u4f5c\r\n                if(packageObject.initialize){\r\n                    packageObject.initialize();\r\n                }\r\n                loader = new ScriptLoader(packageObject,fileName);\r\n            }else{\r\n                //TODO: try parent\r\n                if(":debug"){\r\n                    throw new Error(\'Script:[\'+fileName+\'] Not Found\')\r\n                }\r\n            }\r\n        }\r\n        if(loader.initialize){\r\n            //trace("object loader initialize:",packageObject.scriptBase ,fileName);\r\n            loader.initialize(object);\r\n        }\r\n    }\r\n    /*\r\n     * Dependence \u7684\u7b2c\u4e8c\u79cd\u8bbe\u8ba1\r\n     * Dependence = [0            , 1             , 2               , 3            ,4         ,5    ]\r\n     * Dependence = [targetPackage, targetFileName, targetObjectName,thisObjectName, afterLoad,names]\r\n     * afterLoad,thisObject \u6709\u70b9\u5197\u4f59\r\n     */\r\n    function loadDependence(data,vars){\r\n        loadScript(data[0],data[1],data[2]);\r\n        var objectMap = data[0].objectMap;\r\n        var names = data[5];\r\n        var i = names.length;\r\n        while(i--){\r\n            var name = names[i];\r\n            vars.push(name);//\u5bf9\u4e8e\u8f6c\u8f7d\u540e\u4f9d\u8d56\uff0c\u6211\u4eec\u4f7f\u7528\u91cd\u590d\u8bbe\u7f6e\u4e86\u4e00\u6b21\r\n            vars[name] = objectMap[name];\r\n        }\r\n    }\r\n    /*\r\n     * \u83b7\u53d6\u6307\u5b9a\u5b9e\u73b0\u5305(\u4e0d\u5b58\u5728\u5219\u52a0\u8f7d\u4e4b)\r\n     * @intenal\r\n     * @param <string>name \u5305\u540d\r\n     */\r\n    function realPackage(packageObject){\r\n        if(":debug"){\r\n            if(!packageObject){\r\n                alert(\'\u5305\u5bf9\u8c61\u4e0d\u80fd\u4e3a\u7a7a:\'+arguments.callee)\r\n            }\r\n        }\r\n        while(packageObject && packageObject.implementation){\r\n            packageObject = findPackage(packageObject.implementation,true);\r\n        }\r\n        return packageObject;\r\n    }\r\n    \r\n    /*\r\n     * \u83b7\u53d6\u6307\u5b9a\u5305,\u62bd\u8c61\u5305\u4e5f\u884c(\u4e0d\u5b58\u5728\u5219\u52a0\u8f7d\u4e4b)\r\n     * TODO:\u53ef\u7f16\u8bd1\u4f18\u5316 cacheAllPackage,\u4e0d\u5fc5\u63a2\u6d4b\u7a7a\u5305\r\n     * @intenal\r\n     * @param <string>name \u5305\u540d\r\n     * @param <boolean>exact \u51c6\u786e\u540d\uff0c\u4e0d\u9700\u53ef\u4e0a\u6eaf\u63a2\u6d4b\u7236\u5305\r\n     */\r\n    function findPackage(name,exact){\r\n        do{\r\n            if(packageMap[name]){\r\n                return packageMap[name];\r\n            }\r\n            \r\n            if(packageMap[name] === undefined){\r\n                if(":debug"){\r\n                    var pscript = getCachedScript(name,\'\') ||\r\n                        loadTextByURL(scriptBase+"?path="+name.replace(/\\.|$/g,\'/\')+ \'__package__.js\');\r\n                }else{\r\n                    var pscript = getCachedScript(name,\'\') ||\r\n                        cachedScripts[name] === undefined && loadTextByURL(scriptBase+name.replace(/\\.|$/g,\'/\')+ \'__package__.js\');\r\n                }\r\n                if(pscript){\r\n                    return packageMap[name] || new Package(name,pscript);\r\n                }\r\n                //\u6ce8\u518c\u7a7a\u5305\uff0c\u907f\u514d\u91cd\u590d\u63a2\u6d4b\r\n                //hack for null\r\n                packageMap[name] = 0;\r\n            }\r\n            if(exact){\r\n                break;\r\n            }\r\n        }while(name = name.replace(/\\.?[^\\.]+$/,\'\'));\r\n    }\r\n    /*\r\n     * \u83b7\u53d6\u6307\u5b9a\u5bf9\u8c61\u8def\u5f84\u7684\u5bf9\u5e94\u5305\r\n     */\r\n    function findPackageByPath(path){\r\n        var p = path.lastIndexOf(\'/\');\r\n        if(p>0){\r\n            return findPackage(path.substr(0,p).replace(/\\//g,\'.\'),true);\r\n        }else if((p = path.indexOf(\':\'))>0){\r\n            return findPackage(path.substr(0,p),true);\r\n        }else{\r\n            return findPackage(path.replace(/\\.?[^\\.]+$/,\'\'));\r\n        }\r\n    }\r\n\r\n\r\n    /**\r\n     * \u811a\u672c\u88c5\u8f7d\u5668<b> &#160;(JSI \u5185\u90e8\u5bf9\u8c61\uff0c\u666e\u901a\u7528\u6237\u4e0d\u53ef\u89c1)</b>.\r\n     * \u8be5\u5bf9\u8c61\u7684\u5c5e\u6027\u53ef\u4ee5\u5728JSI\u6258\u7ba1\u811a\u672c\u5185\u8c03\u7528,\u4f46\u662f,\u5982\u679c\u4f60\u4f7f\u7528\u4e86\u8fd9\u4e9b\u5c5e\u6027,\u4f60\u7684\u811a\u672c\u5c31\u65e0\u6cd5\u8131\u79bbJSI\u73af\u5883(\u5bfc\u51fa).\r\n     * <pre><code>eg:\r\n     *   var scriptBase = this.scriptBase;//\u83b7\u53d6\u5f53\u524d\u811a\u672c\u6240\u5728\u7684\u76ee\u5f55\r\n     * </code></pre>\r\n     * @constructor\r\n     * @protected\r\n     * @implicit\r\n     * @param <Package> packageObject \u5305\u5bf9\u8c61\r\n     * @param <string> fileName \u811a\u672c\u540d \r\n     */\r\n    function ScriptLoader(packageObject,fileName){\r\n        /**\r\n         * \u811a\u672c\u540d\uff0c\u53ef\u5728\u6258\u7ba1\u811a\u672c\u9876\u5c42\u4e0a\u4e0b\u6587\uff08\u975e\u51fd\u6570\u5185\uff09\u8bbf\u95ee\uff0c<code>this&#46;name</code>\r\n         * @friend\r\n         * @typeof string \r\n         */\r\n        this.name = fileName;\r\n\r\n        //DEBUG:ScriptLoader[this.name] = (ScriptLoader[this.name]||0)+1;\r\n        /**\r\n         * \u811a\u672c\u76ee\u5f55\uff0c\u53ef\u5728\u6258\u7ba1\u811a\u672c\u9876\u5c42\u4e0a\u4e0b\u6587\uff08\u975e\u51fd\u6570\u5185\uff09\u8bbf\u95ee\uff0c<code>this&#46;scriptBase</code>\r\n         * @friend\r\n         * @typeof string \r\n         */\r\n        this.scriptBase = packageObject.scriptBase;\r\n        /**\r\n         * \u811a\u672c\u7684\u88c5\u5728\u540e\u4f9d\u8d56\u96c6\u5408\r\n         * \u811a\u672c\u4f9d\u8d56\u952e\u4e3a0\r\n         * \u5bf9\u8c61\u4f9d\u8d56\u7684\u952e\u4e3a\u5bf9\u8c61\u540d\u79f0\r\n         * \u5176\u4e0einitialize\u5171\u5b58\u4ea1\r\n         * @private\r\n         * @id ScriptLoader.this.dependenceMap\r\n         * @typeof object \r\n         */\r\n        //this.dependenceMap = null;\r\n        \r\n        var loader = prepareScriptLoad(packageObject,this)\r\n        if(loader){\r\n            return loader;\r\n        }\r\n        doScriptLoad(packageObject,this);\r\n    };\r\n    /*\r\n     * \u524d\u671f\u51c6\u5907\uff0c\u521d\u59cb\u5316\u88c5\u8f7d\u5355\u5143\u7684\u4f9d\u8d56\u8868\uff0c\u5305\u62ec\u4f9d\u8d56\u53d8\u91cf\u7533\u660e\uff0c\u88c5\u8f7d\u524d\u4f9d\u8d56\u7684\u88c5\u8f7d\u6ce8\u5165\r\n     * @private\r\n     */\r\n    function prepareScriptLoad(packageObject,loader){\r\n        var name = loader.name;\r\n        var deps = packageObject.dependenceMap[name];\r\n        var varText = \'this.hook=function(n){return eval(n)}\';\r\n        var vars = [];\r\n        var i = deps && deps.length;\r\n        while(i--){\r\n            var dep = deps[i];\r\n            var key =  dep[3] || 0;\r\n            if(dep[4]){//\u8bb0\u5f55\u4f9d\u8d56\uff0c\u4ee5\u5f85\u88c5\u8f7d\r\n                vars.push.apply(vars,dep[5]);\r\n                if(map){\r\n                    if(map[key]){\r\n                        map[key].push(dep);\r\n                    }else{\r\n                        map[key] = [dep]\r\n                    }\r\n                }else{\r\n                    //\u51fd\u6570\u5185\u53ea\u6709\u4e00\u6b21\u8d4b\u503c\uff08\u7533\u660e\u540e\u7f6e\uff0c\u4e5f\u5c31\u4f60JavaScript\u591f\u72e0\uff01\uff01 \uff09\r\n                    var map = loader.dependenceMap = {};\r\n                    loader.initialize = ScriptLoader_initialize;\r\n                    map[key] = [dep]\r\n                }\r\n            }else{//\u76f4\u63a5\u88c5\u8f7d\uff08\u53ea\u662f\u88c5\u8f7d\u5230\u7f13\u5b58\u5bf9\u8c61\uff0c\u6ca1\u6709\u8fdb\u5165\u88c5\u8f7d\u5355\u5143\uff09\uff0c\u65e0\u9700\u8bb0\u5f55\r\n                //\u8fd9\u91cc\u8c8c\u4f3c\u6709\u6b7b\u5faa\u73af\u7684\u5371\u9669\r\n                loadDependence(dep,vars);\r\n                if(dep = packageObject.loaderMap[name]){\r\n                    return dep;\r\n                }\r\n            }\r\n        }\r\n        if(vars.length){\r\n            loader.varMap = vars;\r\n            varText += \';var \'+vars.join(\',\').replace(/([^,]+)/g,\'$1 = this.varMap.$1\');\r\n        }\r\n        loader.varText = varText;\r\n    }\r\n    \r\n\r\n    /*\r\n     * \u88c5\u8f7d\u811a\u672c\r\n     * \u8fd9\u91cc\u6ca1\u6709\u4f9d\u8d56\u88c5\u8f7d\uff0c\u88c5\u8f7d\u524d\u4f9d\u8d56\u88c5\u8f7d\u5728prepareScriptLoad\u4e2d\u5b8c\u6210\uff0c\u88c5\u8f7d\u540e\u4f9d\u8d56\u5728ScriptLoader.initialize\u4e2d\u5b8c\u6210\u3002\r\n     * @private \r\n     */\r\n    function doScriptLoad(packageObject,loader){\r\n        var loaderName = loader.name;\r\n        var packageName = packageObject.name;\r\n        var cachedScript = getCachedScript(packageName,loaderName);\r\n        packageObject.loaderMap[loaderName] = loader;\r\n        try{\r\n            //ScriptLoader[loaderName] += 0x2000\r\n            \r\n            if(cachedScript instanceof Function){\r\n                //$JSI.preload(pkgName,loaderName,\'\')\r\n                cachedScripts[packageName][loaderName]=\'\';//clear cache\r\n                return cachedScript.call(loader);\r\n            }else{\r\n                if(":debug"){\r\n                    \r\n//            \t    if(loaderName == \'show-detail.js\'){\r\n//            \t        $log.error(loaderName,loader)\r\n//                  }\r\n                    //\u4e0d\u8981\u6e05\u9664\u6587\u672c\u7f13\u5b58\r\n                    return freeEval.call(loader,\'eval(this.varText);\'+(cachedScript || loadTextByURL(scriptBase+"?path="+packageObject.name.replace(/\\.|$/g,\'/\')+loaderName)));\r\n//            \t    if(loaderName == \'show-detail.js\'){\r\n//            \t        $log.error(loaderName,loader)\r\n//                  }\r\n                }else{\r\n                     //\u4e0d\u8981\u6e05\u9664\u6587\u672c\u7f13\u5b58\r\n                    return freeEval.call(loader,\'eval(this.varText);\'+(cachedScript || loadTextByURL(packageObject.scriptBase+loaderName)));\r\n                }\r\n            }\r\n            //ScriptLoader[loaderName] += 0x10000\r\n            \r\n        }catch(e){\r\n            if(":debug"){\r\n                if("org.xidea.jsi.boot:$log"){\r\n                    $log.error("Load Error:\\n"+loader.scriptBase + loaderName+"\\n\\nException:"+e);\r\n                }\r\n            }\r\n            throw e;\r\n        }finally{\r\n            delete loader.varMap ;\r\n            delete loader.varText ;\r\n            var names = packageObject.scriptObjectMap[loaderName];\r\n            var index = names.length;\r\n            var objectMap = packageObject.objectMap;\r\n            //\u6b64\u5904\u4f18\u5316\u4e0d\u77e5\u6709\u65e0\u4f5c\u7528\r\n            if(index == 1){\r\n                objectMap[names = names[0]] = loader.hook(names);\r\n            }else{\r\n                var values = loader.hook(\'[\'+names.join(\',\')+\']\');\r\n                while(index--){\r\n                    objectMap[names[index]] = values[index];\r\n                }\r\n            }\r\n        }\r\n    }\r\n    /*\r\n     * \u521d\u59cb\u5316\u5236\u5b9a\u5bf9\u8c61\uff0c\u672a\u6307\u5b9a\u4ee3\u8868\u5168\u90e8\u5bf9\u8c61\uff0c\u5373\u5f53\u524d\u8f6c\u8f7d\u5355\u5143\u7684\u5168\u90e8\u5bf9\u8c61\r\n     * @private\r\n     */\r\n    function ScriptLoader_initialize(object){\r\n        //\u4e5f\u4e00\u5b9a\u4e0d\u5b58\u5728\u3002D\u5b58I\u5b58\uff0cD\u4ea1I\u4ea1\r\n        var dependenceMap = this.dependenceMap;\r\n        var vars = [];\r\n        var loaderName = this.name;\r\n        var dependenceList = dependenceMap[0];\r\n        if(dependenceList){\r\n            //\u4e00\u5b9a\u8981\u7528delete\uff0c\u5f7b\u5e95\u6e05\u9664\r\n            delete dependenceMap[0];\r\n            var i = dependenceList.length;\r\n            while(i--){\r\n                //alert("ScriptLoader#initialize:"+loaderName+"/"+dep.getNames())\r\n                loadDependence(dependenceList[i],vars);\r\n            }\r\n        }\r\n        //\u8fd9\u91cc\u8fdb\u884c\u4e86\u5c55\u5f00\u4f18\u5316\uff0c\u6709\u70b9\u5197\u4f59\r\n        if(object){//\u88c5\u8f7d\u5bf9\u8c61\r\n            if(dependenceList = dependenceMap[object]){\r\n                //\u4e00\u5b9a\u8981\u7528delete\uff0c\u5f7b\u5e95\u6e05\u9664\r\n                delete dependenceMap[object];\r\n                var i = dependenceList.length;\r\n                while(i--){\r\n                    loadDependence(dependenceList[i],vars);\r\n                }\r\n            }\r\n            //\u8c28\u614e\uff0c\u8fd9\u91cc\u7684i\u4e0a\u9762\u5df2\u7ecf\u58f0\u660e\uff0c\u4e0d\u8fc7\uff0c\u4ed6\u4eec\u53ea\u6709\u4e24\u79cd\u53ef\u80fd\uff0cundefined\u548c0 \r\n            for(var i in dependenceMap){\r\n                  break;\r\n            }\r\n            if(!i){\r\n                //initialize \u4e0d\u80fddelete\r\n                this.dependenceMap = this.initialize = 0;\r\n            }\r\n        }else{//\u88c5\u8f7d\u811a\u672c\r\n            for(var object in dependenceMap){\r\n                var dependenceList = dependenceMap[object];\r\n                delete dependenceMap[object];\r\n                var i = dependenceList.length;\r\n                while(i--){\r\n                    loadDependence(dependenceList[i],vars);\r\n                }\r\n            }\r\n            //initialize \u4e0d\u80fddelete\r\n            this.dependenceMap = this.initialize = 0;\r\n        }\r\n        if(vars.length){\r\n            this.varMap = vars;\r\n            vars = vars.join(\',\');\r\n            try{\r\n            \tthis.hook(vars.replace(/([^,]+)/g,\'$1 = this.varMap.$1\'));\r\n            }catch(e){\r\n            \t$log.debug("\u5947\u602a\u7684\u72b6\u6001",\r\n            \t    this.varMap,this,\r\n            \t    this.constructor,\r\n            \t    this.hook == null,\r\n            \t   "status"+ScriptLoader[loaderName].toString(16)\r\n            \t)\r\n            \tthrow e;\r\n            }\r\n            delete this.varMap;\r\n        }\r\n    }\r\n    function doObjectImport(packageObject,objectName,target){\r\n        //do load\r\n        loadScript(packageObject,packageObject.objectScriptMap[objectName],objectName,true);\r\n        var pos2obj = objectName.indexOf(\'.\');\r\n        if(pos2obj>0){\r\n            objectName = objectName.substr(0,pos2obj)\r\n        }\r\n        //p \u4e3a\u5bf9\u8c61,\u8282\u7701\u4e2a\u53d8\u91cf\r\n        pos2obj = packageObject.objectMap[objectName];\r\n        //null\u4e0d\u53efhack\r\n        return target!=null?target[objectName]=pos2obj:pos2obj;\r\n    }\r\n    function doScriptImport(packageObject,fileName,target){\r\n        loadScript(packageObject,fileName);\r\n        var objectNames = packageObject.scriptObjectMap[fileName];\r\n        //null\u4e0d\u53efhack\r\n        if(target != null){\r\n            for(var i = 0; i<objectNames.length;i++){\r\n                target[objectNames[i]]=packageObject.objectMap[objectNames[i]];\r\n            }\r\n        }\r\n    }\r\n    if("org.xidea.jsi.boot:col"){\r\n    \tvar lazyScriptParentNode;//defined later\r\n        var lazyCacheFileMap = {};\r\n        function appendCacheScript(path,callback){\r\n            //callback = wrapCallback(callback,pkg,file);\r\n            var script = document.createElement("script");\r\n            lazyScriptParentNode.appendChild(script);\r\n            function onload(){//complete\r\n                if(callback && (this.readyState==null || /complete|loaded/.test(this.readyState))){\r\n                    callback();\r\n                    callback = null;\r\n                }\r\n            }\r\n            script.onload = onload;\r\n            script.onreadystatechange = onload;\r\n            if(":debug"){\r\n                script.src=scriptBase +"?path="+ path.replace(/\\.js$/,\'__preload__.js\');\r\n            }else{\r\n                script.src=scriptBase + path.replace(/\\.js$/,\'__preload__.js\');\r\n            }\r\n            script = null;\r\n        }\r\n       \r\n        function doAsynLoad(path,target,col,requiredCache){\r\n            (function asynLoad(){\r\n                if(requiredCache.length){\r\n                    while(getCachedScript.apply(0,requiredCache[0])!=null){\r\n                        if(requiredCache.length > 1){\r\n                            requiredCache[0] = requiredCache.pop()\r\n                        }else{\r\n                            col($import(path,target));\r\n                            return;\r\n                        }\r\n                    }\r\n                    setTimeout(asynLoad,15);\r\n                }else{\r\n                    col($import(path,target));\r\n                }\r\n            })()\r\n        }\r\n        function lazyImport(path,target,col){\r\n        \tlazyScriptParentNode = lazyScriptParentNode || document.body||document.documentElement;\r\n            var pkg = findPackageByPath(path);\r\n            var fileName = path.substr(pkg.name.length+1)\r\n            var list = [];\r\n            var cacheFileMap = [];\r\n            pkg = realPackage(pkg);\r\n            \r\n            if(":debug"){\r\n                var t1 = new Date();\r\n            }\r\n            if(fileName == \'*\'){\r\n                for(var fileName in pkg.scriptObjectMap){\r\n                    appendCacheFiles(cacheFileMap,pkg,fileName);\r\n                }\r\n            }else {\r\n                if(path.indexOf(\'/\')+1){\r\n                    appendCacheFiles(cacheFileMap,pkg,fileName);;\r\n                }else{\r\n                    appendCacheFiles(cacheFileMap,pkg,pkg.objectScriptMap[fileName],fileName);;\r\n                }\r\n            }\r\n            if(":debug"){\r\n                var t2 = new Date();\r\n            }\r\n            if(col instanceof Function){\r\n                for(var filePath in cacheFileMap){//path --> filePath\r\n                    if(cacheFileMap[filePath][1]){\r\n                        list.push(filePath);\r\n                    }\r\n                }\r\n                cacheFileMap = [];\r\n                function next(){\r\n                    if(filePath = list.pop()){\r\n                        var pkg = filePath.replace(/\\/[^\\/]+$/,\'\').replace(/\\//g,\'.\');\r\n                        var file = filePath.substr(pkg.length+1);\r\n                        if(getCachedScript(pkg,file)==null){//\u8c28\u9632 \'\'\r\n                            appendCacheScript(filePath,next);\r\n                            cacheFileMap.push([pkg,file]);\r\n                        }else{\r\n                            next();\r\n                        }\r\n                    }else{//complete..\r\n                        if(":debug"){\r\n                            var t3 = new Date();\r\n                        }\r\n                        doAsynLoad(path,target,col,cacheFileMap)\r\n                        if(":debug"){\r\n                            $log.trace("\u5f02\u6b65\u88c5\u8f7d("+path+")\uff1a\u524d\u671f\u4f9d\u8d56\u8ba1\u7b97\u65f6\u95f4\u3001\u7f13\u5b58\u65f6\u95f4\u3001\u88c5\u8f7d\u65f6\u95f4 \u5206\u522b\u4e3a\uff1a"\r\n                                    ,t2-t1,t3-t2,new Date()-t3);\r\n                        }\r\n                    }\r\n                }\r\n                next();\r\n            }else{\r\n            \tif(lazyScriptParentNode.tagName < \'a\'){\r\n\t                for(var filePath in cacheFileMap){//path --> filePath\r\n\t                    if(cacheFileMap[filePath][1] && !lazyCacheFileMap[filePath]){\r\n\t                        lazyCacheFileMap[filePath] = true;//\u5df2\u7ecf\u518d\u88c5\u8f7d\u961f\u5217\u4e2d\u4e86\r\n\t                        list.push(filePath);\r\n\t                    }\r\n\t                }\r\n\t                if(":debug"){\r\n\t                    if(location.protocol == \'file:\'){\r\n\t                        //alert(scriptBase+list[0].replace(/.js$/gm,"__preload__.js"))\r\n\t                        try{\r\n\t                        \t//WHY???\r\n\t                            //loadTextByURL(scriptBase+list[0].replace(/.js$/gm,"__preload__.js"))\r\n\t                            document.write(list.join("\\n").\r\n\t                                replace(/.js$/gm,"__preload__.js").\r\n\t                                replace(/.+/g,"<script src=\'"+scriptBase+"?path=$&\' onerror=\'return alert\'></script>"));\r\n\t                        }catch(e){\r\n\t                        }\r\n\t                    }else{\r\n\t                        document.write(list.join("\\n").\r\n\t                                replace(/\\.js$/gm,\'__preload__.js\').\r\n\t                                replace(/.+/g,"<script src=\'"+scriptBase+"?path=$&\'></script>"));\r\n\t                    }\r\n\t                }else{\r\n\t                    document.write(list.join("\\n").\r\n\t                                replace(/.js$/gm,"__preload__.js").\r\n\t                                replace(/.+/g,"<script src=\'"+scriptBase+"$&\'></script>"))\r\n\t                }\r\n\t                lazyTaskList.push(function(){\r\n\t                        while(filePath = list.pop()){\r\n\t                            delete lazyCacheFileMap[filePath];//\u65e0\u9700\u518d\u8bb0\u5f55\u4e86\r\n\t                        }\r\n\t                        if(":debug"){\r\n\t                            var t3 = new Date();\r\n\t                        }\r\n\t                        $import(path,target)\r\n\t                        if(":debug"){\r\n\t                            $log.trace("\u5ef6\u8fdf\u88c5\u8f7d("+path+")\uff1a\u524d\u671f\u4f9d\u8d56\u8ba1\u7b97\u65f6\u95f4\u3001\u7f13\u5b58\u65f6\u95f4\u3001\u88c5\u8f7d\u65f6\u95f4 \u5206\u522b\u4e3a\uff1a"\r\n\t                                    ,t2-t1,t3-t2,new Date()-t3);\r\n\t                        }\r\n\t                    });\r\n\t                document.write(lazyScript);\r\n\t            }else{\r\n\t            \t$import(path,target);\r\n\t            }\r\n            }\r\n        }\r\n    }\r\n    /*\r\n     * \u5373JSI \u7684$import\u51fd\u6570\r\n     */\r\n    return function(path,target,col){\r\n        if(/\\:$/.test(path)){\r\n            return realPackage(findPackageByPath(path));\r\n        }\r\n        switch(arguments.length){\r\n        case 0:\r\n            col = lazyTaskList.shift();\r\n            if(":debug"){\r\n                if(!(col instanceof Function)){\r\n                    if("org.xidea.jsi.boot:$log"){\r\n                        $log.error("\u5ef6\u8fdf\u5bfc\u5165\u9519\u8bef\uff0c\u975e\u6cd5\u5185\u90e8\u72b6\u6001\uff01\uff01 ");\r\n                    }\r\n                }\r\n            }\r\n            //hack return void;\r\n            return col && col();\r\n        case 1:\r\n            target = this;\r\n            break;\r\n        case 2:\r\n            switch(typeof target){\r\n            case \'boolean\':\r\n            case \'function\':\r\n                col = target;\r\n                target = this;\r\n            }\r\n        }\r\n        if("org.xidea.jsi.boot:col"){\r\n            if(col){\r\n                return lazyImport(path,target,col); \r\n            }\r\n        }\r\n        var pkg2obj = findPackageByPath(path);\r\n        var objectName = path.substr(pkg2obj.name.length+1);\r\n        if(path.indexOf(\'/\')+1){//path.indexOf(\'/\') == -1\r\n            doScriptImport(realPackage(pkg2obj),objectName,pkg2obj = target);\r\n        }else{\r\n            pkg2obj = realPackage(pkg2obj);\r\n            if(objectName){\r\n                if(objectName == \'*\'){\r\n                    for(var fileName in pkg2obj.scriptObjectMap){\r\n                        doScriptImport(pkg2obj,fileName,target);\r\n                    }\r\n                    //reuse pkg2obj variable\r\n                    pkg2obj =  target;\r\n                }else{\r\n                    //reuse pkg2obj variable\r\n                    pkg2obj =  doObjectImport(pkg2obj,objectName,target);\r\n                }\r\n            }\r\n        }\r\n        return pkg2obj;\r\n    }\r\n}(function(){return eval(arguments[0]);},{});','lazy-trigger.js':'/**\r\n * IE \u4e13\u7528\u7684\u5ef6\u8fdf\u4efb\u52a1\u89e6\u53d1\u811a\u672c\u3002\r\n * \u65e0\u963b\u585e\u5bfc\u5165\uff08Non Blocking Import\uff09\u65f6\u91c7\u7528\uff0c\r\n * \u5b9e\u73b0\u4e0d\u963b\u585e\u7a97\u4f53\u4e8b\u4ef6\u7ebf\u7a0b\u7684\u6761\u4ef6\u4e0b\uff0c\u540c\u6b65\u5bfc\u5165\u9884\u5b9a\u7c7b\u3002\r\n */\r\n$import()'});

$JSI.preload(
'example',{
'hello-world.js':'/**\r\n * \r\n */\r\nvar message = "Hello World";\r\n\r\n/**\r\n * \u6d4b\u8bd5Hello World\r\n */\r\nfunction sayHello(){\r\n  alert(message);\r\n}','':'/**\r\n * \u8fd9\u91cc\u662f\u6f14\u793a\u4e00\u4e2a\u7b80\u5355\u7684\u6258\u7ba1\u811a\u672c\uff0c\u76f4\u63a5\u4f7f\u7528*\u6a21\u5f0f\uff0c\r\n * \u81ea\u52a8\u6ce8\u518c\u6307\u5b9a\u811a\u672c\u7684\u5168\u90e8\u53d8\u91cf\uff08\u4ee5\u540e\u6700\u597d\u8fd8\u662f\u4e25\u8c28\u4e00\u70b9\uff0c\u624b\u52a8\u6ce8\u518c\u5427\uff09\r\n */\r\nthis.addScript(\'hello-world.js\',\'*\');//\u6d4b\u8bd5\u8c03\u8bd5\u6a21\u5f0f\u4e0b\u7684\u81ea\u52a8\u53d8\u91cf\u67e5\u627e\r\n//this.addScript(\'hello-world.js\',[\'sayHello\',\'message\']);'});

$JSI.preload(
'example.alias',{
'':'/**\r\n * \u8fd9\u91cc\u662f\u5305\u522b\u540d\u7684\u6f14\u793a\uff0c\r\n */\r\nthis.setImplementation("example");'});

$JSI.preload(
'example.dependence',{
'show-detail.js':'/**\r\n * \u5229\u7528jsidoc\u4e2d\u5b9a\u4e49\u7684JSON\u5e93\uff08org.xidea.jsidoc.util.JSON\uff09\u5b9e\u73b0\u7684\u4e00\u4e2a\u7528\u4e8e\u663e\u793a\u5bf9\u8c61\u7ec6\u8282\u7684\u51fd\u6570\u3002\r\n * <pre>\r\n * $import("example.dependence.*");\r\n * var person= {}\r\n * person.name=\'\u5f20\u4e09\';\r\n * person.location=\'\u5317\u4eac\';\r\n * person.project=\'http://www.xidea.org/project/jsi/\';\r\n * showDetail(person)\r\n * </pre>\r\n * @param <Object>object \u60f3\u67e5\u770b\u7684\u5bf9\u8c61\r\n */\r\nfunction showDetail(object){\r\n\tvar buf = ["\u5bf9\u8c61\u4fe1\u606f\u5982\u4e0b\uff1a\\n\\n"];\r\n\tbuf.push(JSON.encode(object));\r\n\tconfirm(buf.join("\\n"));\r\n}\r\n','':'/*\r\n * \u8fd9\u4e2a\u5305\u4e2d\uff0c\u6211\u4eec\u6f14\u793aJSI\u811a\u672c\u4f9d\u8d56\u7684\u5b9a\u4e49\u3002\r\n * \r\n * \u811a\u672c\u4f9d\u8d56\u5728\u5f88\u591a\u7f16\u7a0b\u8bed\u8a00\u4e2d\u8868\u73b0\u4e3aimport\u6216\u8005use\u6307\u4ee4\u3002\r\n * \u4f46\u662fjs\u4e0d\u63d0\u4f9b\u7c7b\u4f3c\u8bed\u6cd5\u652f\u6301\uff0c\u800c\u4e14\u7531\u4e8ejs\u7684\u4e0b\u8f7d\u963b\u585e\u548c\u89e3\u91ca\u578b\u7279\u5f81\u3002\u4f9d\u8d56\u63cf\u8ff0\u6bd4\u7f16\u8bd1\u578b\u8bed\u8a00\u66f4\u52a0\u56f0\u96be\r\n * \u5728JSI\u4e2d\uff0c\u5bf9\u4e8e\u7c7b\u5e93\u7684\u4f9d\u8d56\u5b9a\u4e49\uff0c\u6211\u4eec\u91c7\u7528\u4e00\u79cd\u65e0\u4fb5\u5165\u4f9d\u8d56\u63cf\u8ff0\u65b9\u5f0f\uff0c\u4ee3\u66ff\u4f20\u7edf\u7684import\u6307\u4ee4\u3002\r\n * \u800c\u9875\u9762\u7684\u5bfc\u5165\uff0c\u4f9d\u7136\u91c7\u7528\u4f20\u7edf\u7684$import\u51fd\u6570\r\n */\r\nthis.addScript(\'show-detail.js\',\'*\'\r\n               ,0//\u88c5\u8f7d\u524d\u9700\u8981\u5148\u88c5\u8f7dJSON\u7c7b\u5e93\uff08\u4e8b\u5b9e\u4e0a\u6b64\u5904\u53ef\u4ee5\u5b9a\u4e49\u4e3a\u88c5\u8f7d\u540e\uff0c\u5148\u4e0d\u7406\u4f1a\u90a3\u4e9b\u590d\u6742\u7684\u4f18\u5316\u624b\u6cd5\u5427^_^\uff09\r\n               ,"org.xidea.jsidoc.util:JSON"\r\n               );'});

$JSI.preload(
'example.internal',{
'guest.js':'/*\r\n * \u6d4b\u8bd5\u8c03\u8bd5\u6a21\u5f0f\u4e0b\u7684\u81ea\u52a8\u53d8\u91cf\u67e5\u627e\r\n * \u8fd9\u91cc\u6240\u6709\u7684\u6587\u4ef6\u53d8\u91cf\u90fd\u5c06\u516c\u5f00\r\n */\r\n\r\n\r\n\r\n/**\r\n * \u8fd9\u662f\u4e00\u4e2a\u516c\u5f00\u5bf9\u8c61\uff0c\u5728JSI\u4e2d\u5b58\u5728\u6ce8\u518c\uff0c\u53ef\u4ee5\u901a\u8fc7$import\u51fd\u6570\u5bfc\u5165\r\n * @public\r\n */\r\nvar Guest = {\r\n    /**\r\n     * \u8fd9\u662f\u4e00\u4e2a\u516c\u5f00\u65b9\u6cd5\uff0c\u96b6\u5c5e\u4e8eGuest\u5bf9\u8c61\u3002\r\n     * @public\r\n     */\r\n    sayHello:function(){\r\n        alert(buildMessage("Guest"))\r\n    }\r\n}\r\n/**\r\n * \u6784\u5efa\u95ee\u5019\u8bed\r\n * @public\r\n * @param <String> name \u6e38\u5ba2\u540d\u5b57\r\n * @return <String> \u95ee\u5019\u6d88\u606f\r\n */\r\nfunction buildMessage(name){\r\n    return "\u5927\u5bb6\u597d\uff0c\u6211\u662f [%1]".replace(\'%1\',name);\r\n}','jindw.js':'/**\r\n * \u8fd9\u662f\u4e00\u4e2a\u516c\u5f00\u5bf9\u8c61\uff0c\u5728JSI\u4e2d\u5b58\u5728\u6ce8\u518c\uff0c\u53ef\u4ee5\u901a\u8fc7$import\u51fd\u6570\u5bfc\u5165\r\n * @public\r\n */\r\nvar Jindw = {\r\n    /**\r\n     * \u8fd9\u662f\u4e00\u4e2a\u516c\u5f00\u65b9\u6cd5\uff0c\u96b6\u5c5e\u4e8eGuest\u5bf9\u8c61\u3002\r\n     * @public\r\n     */\r\n    sayHello:function(){\r\n        alert(buildMessage())\r\n    }\r\n}\r\n/**\r\n * \u8fd9\u662f\u4e00\u4e2a\u5185\u90e8\u53d8\u91cf\uff08\u6587\u4ef6\u5185\u79c1\u6709\uff09\r\n * @internal\r\n */\r\nvar message = "\u5927\u5bb6\u597d\uff0c\u6211\u662f [%1]";\r\n/**\r\n * \u8fd9\u662f\u4e00\u4e2a\u5185\u90e8\u51fd\u6570\uff08\u6587\u4ef6\u5185\u79c1\u6709\uff09\r\n * @internal\r\n */\r\nfunction buildMessage(){\r\n    var name = \'Jindw\'\r\n    return message.replace(\'%1\',name);\r\n}','':'/*\r\n * \u8fd9\u4e2a\u5305\u4e2d\uff0c\u6211\u4eec\u91cd\u70b9\u6f14\u793aJSI\u9694\u79bb\u51b2\u7a81\u7684\u4e00\u79cd\u65b9\u5f0f--\u5185\u90e8\u5143\u7d20(\u811a\u672c\u5185\u79c1\u6709\u5bf9\u8c61)\u3002\r\n * \u5728JSI\u4e2d\uff0c\u6211\u4eec\u9694\u79bb\u51b2\u7a81\u4e3b\u8981\u6709\u4e24\u79cd\u65b9\u5f0f\uff1a\r\n * \u4e00\u79cd\u5c31\u662f\u811a\u672c\u9694\u79bb\uff0d\uff0d\u5373\u8be5\u5b9e\u4f8b\u4e2d\u7684\u5185\u90e8\u5143\u7d20\uff1b\r\n * \u53e6\u5916\u4e00\u79cd\u662f\u5305\u4e4b\u95f4\u7684\u9694\u79bb\uff0d\uff0d\u76f8\u5bf9\u66f4\u5bb9\u6613\u7406\u89e3\uff0c\u4f46\u662f\u4e0d\u597d\u793a\u4f8b\uff0c\u7559\u7ed9\u8bfb\u8005\u81ea\u5df1\u53bb\u4f53\u4f1a\u5427...\u3002\r\n */\r\nthis.addScript(\'jindw.js\',\'Jindw\');//\u8fd8\u6709\u4e24\u4e2a\u5185\u90e8\u53d8\u91cf\u672a\u516c\u5f00\uff1abuildMessage\uff0cmessage\r\nthis.addScript(\'guest.js\',\'*\');'});

