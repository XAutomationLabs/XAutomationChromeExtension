var HtmlElements;
(function (HtmlElements) {
    
	var Factory = (function() {
		function Factory(element) {
			if(element) {
				var elementInfo = new HtmlElements.ElementInfo(element);
				
				
			}
		}
	});
	
	var SelectElement = (function() {
		function SelectElement(element) {
			if (element) {
				this.elementInfo = new HtmlElements.ElementInfo(element);
				
			}
		}
	})();
	
	HtmlElements.SelectElement = SelectElement;
	
	var ElementInfo = (function () {
        function ElementInfo(element) {
            if (element) {
                this.tagName = element.tagName;
                this.innerText = element.innerText;
                this.computedStyle = {};
                var style = window.getComputedStyle(element), value;
    
				for (var i = 0; i < style.length; i++) {
                    var key = style[i];
                
					if (key.indexOf('-') !== 0) {
                        value = style.getPropertyValue(key);
                        this.computedStyle[key] = value;
                    }
                }
            }
        }
        return ElementInfo;
    })();
    
	HtmlElements.ElementInfo = ElementInfo;
    	
    var UserAction = (function () {
        function UserAction(e) {
			var source = e.srcElement;
			var attribs = e.target.attributes;
			var namedNodeMap = [];
			
			this.generatedId;
			
			for(var i = 0; i < attribs.length; i++) {
				namedNodeMap.push(attribs[i]);
			}
			
            this.type = e.type;
            this.frameIndex = getFrameIndex();
			this.baseUri = source.baseURI;
			this.className = source.className;
			
			console.log(source.tagName);
			console.log(source.value);
			//alert(source.tagName + " " + source.value);
			this.defaultValue = source.defaultValue;
			this.id = source.id;
			this.nodeName = source.nodeName;
			this.name = source.name;
			this.tagName = source.tagName;
			this.textContent = source.textContent;
			this.selector = this.getSelector(e.target);
			
			if(source.tagName.toLowerCase() === 'select' || source.tagName.toLowerCase() === 'option') {
				handleDropdown(source);
			}
			
			this.friendlyElementName = this.resolveTag(source.tagName);
			this.xpathSelector = this.getXPathSelector(e.target);
			this.cssSelector = this.getCssSelectorFromNode(e.target);
			this.idSelector = this.id;
			this.nameSelector = this.name;
			this.generatedXml = this.generateCompatibleXml(namedNodeMap, this.tagName, this.type, this.textContent);
			
            switch (this.type) {
                case 'click':
                    this.x = e.x;
                    this.y = e.y;
                    break;
                
				case 'scroll':
                    this.scrollX = window.scrollX;
                    this.scrollY = window.scrollY;
                    break;
                
				case 'input':
                    var rect = e.target.getBoundingClientRect();
                    this.x = Math.ceil(rect.left);
                    this.y = Math.ceil(rect.top);
                    this.value = e.target.value;
					
					this.maxLength = e.target.maxLength;
					this.minLength = e.target.minLength;
                    break;
            }
            //this.element = this.getSelector(<HTMLElement>e.target);
        }
		
		UserAction.prototype.handleDropdown = function(source) {
			
		};
		
		UserAction.prototype.generateCompatibleXml = function(map, tagName, type, textContent) {
			var generatedXml;
			var generatedValue = this.generateValueIfPossible(map, textContent);
			
			if(generatedValue == 'undefined') {
				generatedValue = this.generatedId;
			}
			
			switch(type.toLowerCase()) {
				case 'input':
					
					generatedXml = "<SetElementText value=\"" + generatedValue + "\"/>";
					break;
				
				case 'click':
					generatedXml = "<Click value=\"" + generatedValue + "\"/>";
					break;
			}
			
			return generatedXml;
		}
		
		UserAction.prototype.generateValueIfPossible = function(map, textContent) {
			if(this.generatedId) {
				return this.generatedId;
			}
			
			for(var i = 0; i < map.length; i++) {
				if(map[i].name === 'id' && map[i].value !== '') {
					return map[i].value;
				}
				
				if(map[i].name === 'name' && map[i].value !== '') {
					return map[i].value.replace(/\s+/g, '');
				}
			}
		}
		
		UserAction.prototype.getXPathSelector = function(node) {
			var result = "";
			var stop = false;
			var absolute = false;

			var parent = node.ownerDocument;
			while (node && node != parent && !stop) {
				var str = "";
				var position = getNodePosition(node);

				switch (node.nodeType) {
					case Node.DOCUMENT_NODE:
					break;
					case Node.ATTRIBUTE_NODE:
						str = "@" + node.name;
					break;
					case Node.COMMENT_NODE:
						str = "comment()";
					break;
					case Node.TEXT_NODE:
						str = "text()";
					break;
					case Node.ELEMENT_NODE:

						var name = getTagName(node);

						if(!absolute && node.id && node.id != "") {
							this.generatedId = node.id;
							
							str = ".//*[@id='" + node.id + "']";
							position = null;
							stop = true;
						} else {
							str = name;
						}
						
					break;
				}
				
				result = str + (position ? "[" + position + "]" : "") + (result? "/": "") + result;
				
				if(node instanceof Attr) node = node.ownerElement;
				else node = node.parentNode;
			}

			return result;
		}
		
		const multipleSpace = /\s+/g;
		
		UserAction.prototype.getCssSelectorFromNode = function (node) {
			var result = '',
				node,
				parent = node.ownerDocument,
				stop = false,
				str;
			
			while (node && node != parent && !stop) {
				if(node.nodeType === Node.ELEMENT_NODE) {
					if(node.id) {
						str = '#' + node.id;
						stop = true;
					} else if(node.className) {
						str = '.' + node.className.replace(multipleSpace, ' ').split(' ').join('.');
						stop = true;
					} else {
						str = node.localName.toLowerCase();
					}
					
					result = str + (result? '>' + result: ''); 
				}
				
				if(node instanceof Attr) {
					node = node.ownerElement;
				} else {
					node = node.parentNode;
				}
			}
			
			return result;
		}

        UserAction.prototype.getSelector = function (context) {
            var index, pathSelector, that = context;
            if (that == 'null')
                throw 'not an  dom reference';
        
			index = this.getIndex(that);
            while (that.tagName) {
                pathSelector = that.localName + (pathSelector ? '>' + pathSelector : '');
                that = that.parentNode;
            }
            pathSelector = pathSelector + ':nth-of-type(' + index + ')';
            return pathSelector;
        };
    
		UserAction.prototype.getIndex = function (node) {
            var i = 1;
            var tagName = node.tagName;
        
			while (node.previousSibling) {
                node = node.previousSibling;
                if (node.nodeType === 1 && (tagName.toLowerCase() == node.tagName.toLowerCase())) {
                    i++;
                }
            }
            return i;
        };
		
        return UserAction;
    })();	

	getTagName = function(node) {
		var ns = node.namespaceURI;
		var prefix = node.lookupPrefix(ns);
		
		//if an element has a namespace it needs a prefix
		if(ns != null && !prefix) {
			prefix = getPrefixFromNS(ns);
		}
		
		var name = node.localName;
		if (isHtmlDocument(node.ownerDocument)) {
			//lower case only for HTML document
			return name.toLowerCase();
		} else {
			return (prefix? prefix + ':': '') + name;
		}
	}
	
})(HtmlElements || (HtmlElements = {}));