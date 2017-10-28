var Generator;

(function (Generator) {
	var Xml = (function() {
		function Xml(collection) {
			this.collection = collection;
		}
		
		Xml.prototype.getXml = function() {
			var builder = new Generator.StringBuilder(this.collection);
			
			return builder.generateExpression();
		};
		
		return Xml;
	})();
	
	Generator.Xml = Xml;
	
	var Locator = (function() {
		function Locator(){
			
		}
		
		Locator.prototype.getLocators = function() {
			return "";
		};
		
	}) ();
	
	Generator.Locator = Locator;
	
	var StringBuilder = (function() {
		function StringBuilder(collection) {
			this.xml = [];
			this.collection = collection;
		}
		
		StringBuilder.prototype.generateExpression = function() {
			this.writeRuleList();
			this.writeRule();
			
			this.writeMetadata();
			this.writeUrl();
			this.writeSubdomain();
			
			this.writeActions();
			this.writeClosure();
			
			return this.toString();
		};
		
		StringBuilder.prototype.writeActions = function() {
			for(var i = 0; i < this.collection.record.actions.length; i++) {
				var action = this.collection.record.actions[i];
				
				this.xml.push(indent(action.action.generatedXml, 2));
			}
		};
		
		StringBuilder.prototype.writeRuleList = function() {
			this.xml.push("<RuleList Suite=\"1\" Module=\"1\">");
		};
		
		StringBuilder.prototype.writeRule = function() {
			this.xml.push(indent("<Rule TestCase=\"12\">", 1));
		};
		
		StringBuilder.prototype.writeMetadata = function() {
			var builder = new Generator.StringBuilder();
			
			builder.appendIndented("<Metadata>", 2);
			builder.appendIndented("<Name value=\"" + this.collection.metadataName + "\"/>", 3);
			builder.appendIndented("<Description value=\"" + this.collection.metadataDescription + "\"/>", 3);
			builder.appendIndented("<Author value=\"" + this.collection.metadataAuthor + "\"/>", 3);
			builder.appendIndented("<Category value=\"" + this.collection.metadataCategory + "\"/>", 3);
			builder.appendIndented("</Metadata>", 2);
			
			this.xml.push(builder.toString());
		};
		
		StringBuilder.prototype.toString = function() {
			var returnValue = "";
			
			for(var i = 0; i < this.xml.length; i++) {
				returnValue = returnValue + this.xml[i] + "\n";
			}
			
			return returnValue;
		};
		
		StringBuilder.prototype.append = function(data) {
			this.xml.push(data);
		};
		
		StringBuilder.prototype.appendIndented = function(data, level) {
			this.xml.push(indent(data, level));
		};
		
		StringBuilder.prototype.writeUrl = function() {
			this.xml.push(indent("<Url value=\"{Url}\" />", 2));
		};
		
		StringBuilder.prototype.writeSubdomain = function() {
			this.xml.push(indent("<SubDomain value=\"" + this.collection.metadataName + "\" />", 2));
		};
		
		StringBuilder.prototype.writeClosure = function() {
			this.xml.push(indent("</Rule>", 1));
			this.xml.push("</RuleList>");
		};
		
		return StringBuilder;
	})();
	
	Generator.StringBuilder = StringBuilder;
	
	function indent(str, numOfIndents, spacesPerIndent) {
		str = str.replace(/^(?=.)/gm, new Array(numOfIndents + 1).join('\t'));
		numOfIndents = new Array(spacesPerIndent + 1 || 0).join(' ');
		
		return spacesPerIndent 
			? str.replace(/^\t+/g, function(tabs) {
				return tabs.replace(/./g, numOfIndents);
			})
			: str;
}
})(Generator || (Generator = {}));