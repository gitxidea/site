﻿<?php
    $path = $_GET['path'];
    if(!$path){
        $externalScript = $_GET['externalScript'];
        //if()exist
        if($externalScript != null){
            echo("<html><frameset rows='100%'><frame src='org/xidea/jsidoc/index.html?externalScript=$externalScript'></frame></html>");
        }else{
            echo("<html><frameset rows='100%'><frame src='org/xidea/jsidoc/index.html'></frame></html>");
        }
    }else{

        $pos = strrpos($path, '/');
        $fileName = substr($path, $pos + 1);
        $packageName = preg_replace("/\//", "." ,substr($path, 0, $pos));

        echo("\$JSI.preload('$packageName','$fileName',function(){eval(this.varText);");
        //readfile($path)
        //require($path)
        echo("\n})//wwwwwww");

    }

?>
<?php
//
// PHP 版本的JSI 代理程序
//
?>

