module.exports.findObjectByKey = function (array,key,value){
    for (let index = 0; index < array.length; index++) {
        if(array[index][key]===key){
            return array[index];
        }
        return null;

    }
};
module.exports.makeId = function () {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 6; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text.toLowerCase();
};

module.exports.numericId = ()=>{
    return Math.floor(100000 + Math.random() * 900000);
}