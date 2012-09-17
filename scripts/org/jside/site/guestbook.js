function Guestbook(div){
    this.id = E(div).uid();
}
Guestbook.prototype = {
    initialize : function(){
        E(this.id).innerHTML = template.render();
    }
}
var template = new Template(this.scriptBase+"guestbook.xml#//*/body");