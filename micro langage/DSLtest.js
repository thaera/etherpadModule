require('./journalisticDSL.js');
var fs = require('fs');


var file = process.argv[2];
try {  
	var file = fs.readFileSync(file, 'utf8');   
} catch(e) {
	console.log('Error:', e.stack);
}
var DSL = new JournalisticDSL();
var json = DSL.analyse(file);
console.log(json);