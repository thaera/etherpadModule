var eejs = require('ep_etherpad-lite/node/eejs');
var settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_editbarMenuRight = function(hook_name,args,cb){
  //console.log(args.content, "args");
  args.content = args.content + "<button>foo</button>";
  return cb();
}
