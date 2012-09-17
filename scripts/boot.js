document.write(function(s){
s = s[s.length-1].src.replace(/[^\\\/]*$/,'?path=$&');
return "<script src='"+s+"'></script>"
}(document.getElementsByTagName("script")));