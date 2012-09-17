function native2unicode(value,ascii){
    return value.replace(ascii?/[\s\S]/g:/[\u0080-\uFFFF]/g,function(c){
        return '\\u'+(c.charCodeAt(0)|0x10000).toString(16).substr(1);
    });
}
function native2entry(value,ascii){
    return value.replace(ascii?/[\s\S]/g:/[\u0080-\uFFFF]/g,function(c){
        return '&#x'+c.charCodeAt(0).toString(16)+';';
    });
}

function unicode2native(value){
    return value.replace(/\\u[\da-fA-F]{4}/g,function(c){
        return String.fromCharCode(parseInt(c.substr(2),16));
    });
}

function entry2native(value){
    return value.replace(/&\#(x)?([\da-fA-F]{1,8});/g,function(match,flag,data){
        return String.fromCharCode(parseInt(data,flag?16:10));
    });
}

var asciiTableHTML = new Template(this.scriptBase + "ascii.xml#//*[@id='ascii']/*").render({})