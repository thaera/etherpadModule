/**************************************************************************************
                                        MODULES
***************************************************************************************/

var fs = require('fs');									// Module pour lire les fichiers
var sax = require('./xmlsax.js');						// Parseur SAX
var mysql = require('sync-mysql');						// Base de données (requêtes non assynchrones)


/**************************************************************************************
                                   VARIABLES GLOBALES
***************************************************************************************/

// Pour le handler
var xmlTextArray;
var xmlCDataArray;
var xmlAttrArray;
var xmlTreeArray;
// Informations principales de l'article
var Article ;
// Liste de toutes les infos trouvées par le parseur
var infos = new Map();
// Tableau contenant tous les warnings possibles
var warnings;
// Parseur SAX
var saxParser;
// Gestionnaire d'événement SAX
var eventHandler;
// Connection à la base de données
var con;


/**************************************************************************************
                                          API
***************************************************************************************/
JournalisticDSL = function () {}

// Analyse d'un article
JournalisticDSL.prototype.analyse = function(article){
	// Initialisation
	var doc = "<?xml version = \"1.0\" encoding=\"UTF-8\" standalone=\"yes\" ?>" + '\n';
	doc = doc + loadFile("journalisticDSL.dtd") + '\n';
	doc = doc + article;
	warnings = loadWarnings();
	
	con = new mysql({
	  host: 'localhost',
	  user: 'guest',
	  password: 'password',
	  database: "journalisticDSL" 
	});

	// Parsing
	parseXML(doc);
	
	// Gestion des erreurs
	var err = eventHandler.getError();
	if (err) {
		console.log(err);
		return;
	}
	
	// Création des objets info
	if(createInfos() === 1) return;
	
	// On renvoie le résultat
	return new ParseResult(Article, infos, note(), getWarnings());
}

// ajout d'une balise dans le texte
JournalisticDSL.prototype.addTag = function(tagname, atts, text, begin, end) {
	// Formation de la balise
	var newtag = '<' + tagname;
	for (var i=0; i<atts.lentgh; i++) {
		newtag += ' ' + atts[i];
	}
	newtag += '>';
	var endtag = '</' + tagname + '>';
	
	// Ajout de la balise
	if(begin > 0 && end > 0 && begin < text.length && end <= text.length && begin < end) {
		text1 = text.slice(0,begin-1);
		text2 = text.slice(begin, end);
		text3 = text.slice(end+1, text.length-1);
		text = text1 + newtag  + text2 + endtag + text3;
	}else{
		console.log("Opération invalide");
	}
}


/**************************************************************************************
                                   SAX EVENT HANDLER
	Code en partie repris de xmljs.sourceforge.net 		Auteur : xwisdom@yahoo.com
***************************************************************************************/

// Constructeur
xmlHandler = function() {
    this.m_strError=''
    this.m_treePath=[]
    this.m_xPath=['']
    this.m_text=['']
    this.m_cdata=['']
    this.m_attr=['']
    this.m_pi=['']
    this.cdata=false
}

// Événement lancé à la rencontre d'un élément CDATA
xmlHandler.prototype.characters = function(data, start, length) {

    // Capture de l'élément CDATA
    var text=data.substr(start, length);
    if (text=='\n' ) return null // on retire les lignes blanches
    if (this.m_treePath.length>0){
        if(this.cdata==false){
            if (!this.m_text[this.m_xPath.join('/')]) {
                this.m_text[this.m_xPath.join('/')]='';
            }
            this.m_text[this.m_xPath.join('/')]+=text;
        }else {
            if (!this.m_cdata[this.m_xPath.join('/')]) {
                this.m_cdata[this.m_xPath.join('/')]='';
            }
            this.m_cdata[this.m_xPath.join('/')]+=text;
        }
    }

}

// Fin d'une entité CDATA
xmlHandler.prototype.endCDATA = function() {
	
    this.cdata=false

}

// Fin du document
xmlHandler.prototype.endDocument = function() {}

// Rencontre d'un commentaire (pas de commentaires dans notre langage)
xmlHandler.prototype.comment = function(data, start, length) {
    //var comment=data.substr(start, length)
}

// Rencontre de la fin d'un élément XML
xmlHandler.prototype.endElement = function(name) {
	
    this.m_xPath=this.m_xPath.slice(0,-1)

}

// Rencontre d'une erreur
xmlHandler.prototype.error = function(exception) {

    this.m_strError+='Error:'+exception.getMessage()+'\n'

}

// Erreur fatale
xmlHandler.prototype.fatalError = function(exception) {

    this.m_strError+='fatal error:'+exception.getMessage()+'\n'

}

// Accesseur du champ m_attr
xmlHandler.prototype.getAttr_Array= function() {

    return this.m_attr;

}

// Accesseur du champ m_cdata
xmlHandler.prototype.getCDATA_Array= function() {

    return this.m_cdata;

}

// Accesseur du champ m_strError
xmlHandler.prototype.getError = function() {

    return this.m_strError;

}

// Accesseur du champ m_treePath
xmlHandler.prototype.getPath_Array = function() {

	return this.m_treePath;
}

// Accesseur du champ m_text
xmlHandler.prototype.getText_Array = function() {

    return this.m_text;

}

// Événement de rencontre d'une PIDATA
xmlHandler.prototype.processingInstruction = function(target, data) {}

// On donne une instance de SAXDriver au parseur
xmlHandler.prototype.setDocumentLocator = function(locator) {

    this.m_locator = locator;

} 

// Événement de début d'une CDATA
xmlHandler.prototype.startCDATA = function() {

    this.cdata=true

}

// Début du document (premier événement du parseur)
xmlHandler.prototype.startDocument = function() {}

// Premier événement déclenché à la rencontre d'un élément XML, on passe l'elt et ses attributs
xmlHandler.prototype.startElement = function(name, atts) {

    // Note: the following code is used to store info about the node
    // into arrays for use the xpath layout

    var cpath,att_count=atts.getLength()
    this.m_xPath[this.m_xPath.length]=name
    cpath=this.m_xPath.join('/')
    this.m_treePath[this.m_treePath.length]=cpath

    if (att_count) {
        var attr=[]
        for (i=0;i<att_count;i++){
            attr[atts.getName(i)]=atts.getValue(i)
        }
        this.m_attr[this.m_xPath.join('/')]=attr;
    }

}

// Warning concernant la synthaxe du document XML
xmlHandler.prototype.warning = function(exception) {

    this.m_strError+='Warning:'+exception.getMessage()+'\n'

}


/**************************************************************************************
                                     OBJET INFO
***************************************************************************************/

// Constructeur
info = function(id) {
	this.id=id;
	this.heading = '';
	this.what='';
	this.who='';
	this.when='';
	this.where='';
	this.why='';
	this.how='';
	this.sources=[];
	this.subinfos=[];
}

// Accesseurs
info.prototype.getID = function () { return this.id; }
info.prototype.getHeading = function () { return this.heading; }
info.prototype.getWhat = function () { return this.what; }
info.prototype.getWho = function () { return this.who; }
info.prototype.getWhere = function () { return this.where; }
info.prototype.getWhen = function () { return this.when; }
info.prototype.getWhy = function () { return this.why; }
info.prototype.getHow = function () { return this.how; }
info.prototype.getSources = function () { return this.sources; }
info.prototype.getSubs = function () { return this.subinfos; }

// Mutateurs
info.prototype.setHeading = function(h) { this.heading = h; }
info.prototype.setWhat = function(w) { this.what = w; }
info.prototype.setWhere = function(w) { this.where = w; }
info.prototype.setWhen = function(w) { this.when = w; }
info.prototype.setWho = function(w) { this.who = w; }
info.prototype.setWhy = function(w) { this.why = w; }
info.prototype.setHow = function(h) { this.how = h; }
info.prototype.addSource = function(source) { this.sources.push(source); }
info.prototype.addSub = function(id) { this.subinfos.push(id); }


/**************************************************************************************
                                     OBJET ARTICLE
***************************************************************************************/

// Constructeur
Article = function() {
	this.title = '';
	this.topics = [];
	this.author = '';
	this.date = '';
	this.updates = [];
}

// Accesseurs
Article.prototype.getTitle = function() { return this.title; }
Article.prototype.getTopics = function() { return this.topics; }
Article.prototype.getAuthor = function() { return this.author; }
Article.prototype.getDate = function() { return this.date; }
Article.prototype.getUpdates = function() { return this.updates; }

// Mutateurs
Article.prototype.setTitle = function(t) { this.title = t; }
Article.prototype.setTopics = function(t) { this.topics = t; }
Article.prototype.setAuthor = function(a) { this.author = a; }
Article.prototype.setDate = function(d) { this.date = d; }
Article.prototype.setUpdates = function(u) { this.updates = u; }


/**************************************************************************************
                                  OBJET PARSERESULT
***************************************************************************************/

// Constructeur
ParseResult = function(a, i, n, w) {
	this.article = a;
	this.infos = i;
	this.note = n;
	this.warnings = w;
}


/**************************************************************************************
                                       PARSING
***************************************************************************************/

// Parsing du XML
function parseXML(xml) {
	// Initialisation du handler et du parseur
	saxParser = new SAXDriver();
	eventHandler = new xmlHandler();
	
	// On passe le handler au parseur SAX
	saxParser.setDocumentHandler(eventHandler);
	saxParser.setLexicalHandler(eventHandler);
	saxParser.setErrorHandler(eventHandler);
	
	saxParser.parse(xml);
	

    xmlTextArray = eventHandler.getText_Array();
    xmlCDataArray = eventHandler.getCDATA_Array();
    xmlAttrArray = eventHandler.getAttr_Array();
	xmlTreeArray = eventHandler.getPath_Array();
}


/**************************************************************************************
                                        METHODES
***************************************************************************************/

// Affichage du XML dans la console
function displayXML() {
	console.log(doc);
}

// Chargement du contenu d'un fichier
function loadFile(filename){
	try {  
		var file = fs.readFileSync(filename, 'utf8');   
	} catch(e) {
		console.log('Error:', e.stack);
	}
	return file;
}

// Requête à la base de données
function requestDB(request) {
	try {
		var res = con.query(request);
		return res;
	}catch (err){
		console.log(err);
		return 0;
	}
}

// Chargement des warnings (fichier séparé)
function loadWarnings() {
	var file = loadFile("warnings.txt");
	file = file.split('\n');
	var i=0;
	for(i=0; i<file.length; i++){
		file[i] = "/!\\ " + file[i];
	}
	return file;
}

// Réccupération d'un id depuis le tableau des attributs
function extractID(path) {
	var id;
	var atts = xmlAttrArray[path];
	for (j in atts) { id = '' + atts[j];}
	return id;
}

// Création des infos
function createInfos(){
	// Gestion des infos et sous infos
	var hierarchy = new Map();
	
	// Parcours des noeuds de l'arbre XML
	for (i=0; i<xmlTreeArray.length; i++){
		var nodePath = xmlTreeArray[i];
		var nodes = nodePath.split('/');
		var depth = nodes.length;
		var nodename = nodes[nodes.length-1];
				
		
		// Cas d'une nouvelle info
		if (nodename === 'info') {
			var newinf = new info(extractID(nodePath));
			infos.set(newinf.id, newinf);
			hierarchy.set(depth, newinf);
			if (depth > 3) {
				hierarchy.get(depth-1).addSub(newinf.id);	// Info principale = profondeur 3 (sous article)
			}
		}
		
		// Cas d'un 5W
		try{
			if (nodename === 'what') infos.get(extractID(nodePath)).setWhat(xmlTextArray[nodePath].trim());
			if (nodename === 'where') infos.get(extractID(nodePath)).setWhere(xmlTextArray[nodePath].trim());
			if (nodename === 'when') infos.get(extractID(nodePath)).setWhen(xmlTextArray[nodePath].trim());
			if (nodename === 'why') infos.get(extractID(nodePath)).setWhy(xmlTextArray[nodePath].trim());
			if (nodename === 'who') infos.get(extractID(nodePath)).setWho(xmlTextArray[nodePath].trim());
			if (nodename === 'how') infos.get(extractID(nodePath)).setHow(xmlTextArray[nodePath].trim());
		}catch(err){
			console.log("Impossible d'associer un élément 5W à une info inexistante");
			return 1;
		}
		
		// Autres éléments d'une info
		try {
			if (nodename === 'heading') infos.get(extractID(nodePath)).setHeading(xmlTextArray[nodePath].trim());
			if (nodename === 'source') infos.get(extractID(nodePath)).addSource(xmlTextArray[nodePath].trim());
		}catch (err){
			console.log("Impossible d'associer un tire ou une source à une info inexistante");
			return 1;
		}
		
		// Cas d'une ref à un 5W
		try{
			if (nodename === 'whatref') infos.get(xmlAttrArray[nodePath][0]).what += ", " + xmlTextArray[nodePath].trim();
			if (nodename === 'whereref') infos.get(xmlAttrArray[nodePath][0]).where += ", " + xmlTextArray[nodePath].trim();
			if (nodename === 'whenref') infos.get(xmlAttrArray[nodePath][0]).when += ", " + xmlTextArray[nodePath].trim();
			if (nodename === 'whyref') infos.get(xmlAttrArray[nodePath][0]).why += ", " + xmlTextArray[nodePath].trim();
			if (nodename === 'whoref') infos.get(xmlAttrArray[nodePath][0]).who += ", " + xmlTextArray[nodePath].trim();
			if (nodename === 'howref') infos.get(xmlAttrArray[nodePath][0]).how += ", " + xmlTextArray[nodePath].trim();
		}catch(err){
			console.log("Impossible d'établir une référence vers un élément 5W inexistant");
			return 1;
		}
		
		// Cas de la première balise (article)
		if (nodename === 'article') {
			Article = new Article();
			atts = xmlAttrArray[nodePath];
			var a = "";
			var n=0;
			for (j in atts) {
				a += atts[j] + ',';
				n++;
			}
			if (n !==2) {
				console.log(i);
				console.log("Un article doit avoir deux attributs (auteur + date)");
			}else{
				Article.setAuthor(a.split(',')[0]);
				Article.setDate(a.split(',')[1]);
			}
		}
		
		// Mise à jour de l'article
		if (nodename === 'updade') {
			atts = xmlAttrArray[nodePath];
			var a = "";
			for (j in atts) { a += atts[j] + ',';}
			var update = [a.split(',')[0], a.split(',')[1]];
			Article.updates.push(update);
		}
		
		// Autres balises
		if (nodename === 'topic') article.topics.push(xmlTextArray[nodePath].trim());
	}
	
	if (Article.author === '') {
		console.log("Le nom de l'auteur est obligatoire");
		return 1;
	}else{
		return 0;
	}
}

// Calcul de la note
function note(){
	var note = 0;
	infos.forEach((inf) => {
		var n = 0;	// Note "locale" propre à une info
		if (inf.getWhat() !== '') n+=20;
		if (inf.getWho() !== '') n+=20;
		if (inf.getWhere() !== '') n+=20;
		if (inf.getWhen() !== '') n+=20;
		if (inf.getWhy() !== '') n+=20;
		if (inf.getHow() !== '') n+=10;	// "Bonus"
		if (n>100) n=100;
		n *= sourceTrust(inf.getSources());	// Pondération par la fiabilité des sources
		note += n;
	});
	if (infos.size!==0) note = note/infos.size;	// Moyenne de la note de toutes les infos
	
	// Ajout de la note du journaliste à la BDD
	// var request = "SELECT * FROM sources WHERE name='" + Article.getAuthor() + "';"
	// var res = requestDB(request);
	// console.log(res);
	// if (res === 'undefinded') {
		// request = "INSERT INTO journalist VALUES(" + Article.getAuthor() + ", 1, " + note + ");";
		// requestDB(request);
	// }else{
		// av = res.averageMark;
		// nbrev = res.nbReviews;
		// av = (av*nbrev) + note;
		// nbrev++;
		// av /= nbrev;
		// request = "UPDATE journalist SET averageMark=" + av + ", nbReviews = " + nbrev + " WHERE name='" + Article.getAuthor() + "';";
		// requestDB(request);
	// }
	
	return note;
}

// Calcul de la fiabilité des sources
function sourceTrust(sources) {
	var moy = 0;
	for (i in sources) {
		var request = "SELECT reliability FROM sources WHERE name='" + sources[i].toUpperCase() + "';";
		var res = requestDB(request)[0];
		if (res === 'undefinded') moy += res.reliability; else moy += 2.5;
	}
	if (sources.length > 0) moy = moy/sources.length;
	return moy;
}

// Génération des warnings
function getWarnings() {
	var warnings = [];
	
	// Warnings généraux par rapport à l'article
	if (Article.getTitle() === '') warnings.push("L'article n'a pas de titre");
	if (Article.getTopics().length === 0) warnings.push("L'article n'a pas de topic");
	if (Article.getDate() === '') warnings.push("L'article n'est pas daté correctement");
	
	// Warnings par rapport aux infos
	infos.forEach((inf) => {
		console.log(inf);
		if (inf.getWhat()==='') warnings.push("L'info" + inf.id + " n'a pas d'élément what");
		if (inf.getWhere()==='') warnings.push("L'info" + inf.id + " n'a pas d'élément where");
		if (inf.getWho()==='') warnings.push("L'info" + inf.id + " n'a pas d'élément who");
		if (inf.getWhen()==='') warnings.push("L'info" + inf.id + " n'a pas d'élément when");
		if (inf.getWhy()==='') warnings.push("L'info" + inf.id + " n'a pas d'élément why");
		if (inf.getSources().length === 0) warnings.push("L'info" + inf.id + " n'a pas de source");
	});
	
	return warnings;
}