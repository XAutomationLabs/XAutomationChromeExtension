var AutomationFront;
(function (AutomationFront) {
    var isLinked = false, showCursor = false, cursorLabel, showElementSelector = false, stopSendingActions = false, selectedElement, selectedRect, elementSelector;
	
    var Message = (function () {
        function Message(type, msg) {
            this.type = type;
            this.msg = msg;
        }
        return Message;
    })();
	
    AutomationFront.Message = Message;
    
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
    
	AutomationFront.ElementInfo = ElementInfo;
    
	function adjustPosition(x, y) {
        var doc = document.documentElement, body = document.body;
        x += (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
        y += (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
        return { x: x, y: y };
    }
	
    function createLabel(id, text, x, y, background) {
        var div = document.createElement('div');
        
		div.id = id;
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.zIndex = '10000000000';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.fontSize = '12px';
        div.style.fontFamily = '"Helvetica Neue",Helvetica,Arial,sans-serif';
        div.style.fontWeight = '700';
        div.style.color = '#fff';
        div.style.background = background;
        div.style.padding = '.2em .6em .3em';
        div.style.borderRadius = '.25em';
        document.body.appendChild(div);
        
		return div;
    }
    function createBox(id, text, x, y, width, height) {
        var div = document.createElement('div');
        
		div.id = id;
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.zIndex = '10000000000';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.width = width + 'px';
        div.style.height = height + 'px';
        div.style.fontSize = '12px';
        div.style.fontFamily = '"Helvetica Neue",Helvetica,Arial,sans-serif';
        div.style.fontWeight = '700';
        div.style.color = '#d9534f';
        div.style.border = '2px solid #d9534f';
        div.style.borderRadius = '.25em';
        div.style.background = 'rgba(160,160,160,0.5)';
        document.body.appendChild(div);
        
		return div;
    }
    
	function createElementSeletorBorder() {
        var div = document.createElement('div');
    
		div.style.display = 'none';
        div.style.position = 'absolute';
        div.style.zIndex = '10000000000';
        div.style.boxShadow = '0px 0px 2px 1px #888, 0 0 2px 1px #888 inset';
        div.style.border = '2px solid #333';
        
		div.addEventListener('mousedown', function (e) {
            clearTimeout(setSelectorTimeout);
            chrome.runtime.sendMessage(new Message('waitFor', {
                x: Math.ceil(e.x),
                y: Math.ceil(e.y),
                frameIndex: getFrameIndex(),
                element: new ElementInfo(selectedElement)
            }));
        });
        document.body.appendChild(div);
        
		return div;
    }
    
	function setRect(div, x, y, width, heigth) {
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.width = width + 'px';
        div.style.height = heigth + 'px';
    }
	
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
		
		UserAction.prototype.resolveTag = function (tag) {
			switch(tag) {
				case 'INPUT':
					return 'TextBox';
					
				case 'BUTTON':
					return 'Button';
					
				case 'SUBMIT':
					return 'Button';
					
				case 'SELECT':
					return 'Drop Down';
					
				case 'OPTION':
					return 'Drop Down Option';
				
				default:
					return 'Html Element';
			}
		};
        return UserAction;
    })();
	
    function addEventListener(name) {
        document.addEventListener(name, function (e) {
            if (!stopSendingActions || e.type !== 'click') {
                chrome.runtime.sendMessage(new Message('action', new UserAction(e)));
            }
        });
    }
    
	isHtmlDocument = function(doc) {
		return doc.contentType === 'text/html';
	}

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

	getPrefixFromNS = function(ns) {
		return ns.replace(/.*[^\w](\w+)[^\w]*$/, "$1");
	}

	function getNodePosition(node) {
		if (!node.parentNode)
			return null;
		
		var siblings = node.parentNode.childNodes;
		var count = 0;
		var position;
		
		for (var i = 0; i < siblings.length; i++) {
			var object = siblings[i];
			if(object.nodeType == node.nodeType && object.nodeName == node.nodeName) {
				count++;
				if(object == node) position = count;
			}
		}

		if (count > 1)
			return position;
		else
			return null;
	}

	function getFrameIndexArray(win, found) {
        var parent = win.parent;
    
		if (parent && parent !== win) {
            found = getFrameIndexArray(parent, found);
            var pf = parent.document.getElementsByTagName('iframe');
        
			for (var i = 0; i < pf.length; i++) {
                try {
                    if (pf[i].contentWindow === win) {
                        found.push(i);
                        break;
                    }
                }
                catch (e) {
                }
            }
        }
        return found;
    }
    
	function getFrameIndex() {
        return getFrameIndexArray(window, []).join('/');
    }
	
    var setSelectorTimeout;
    function init() {
        if (!isLinked) {
            addEventListener("click");
            addEventListener("scroll");
            addEventListener("input");
    
			cursorLabel = createLabel('ar-cursor-position', '', 0, 0, '#333');
            cursorLabel.style.display = 'none';
            elementSelector = createElementSeletorBorder();
            
			document.addEventListener('mousemove', function (e) {
                var position;
            
				if (showCursor) {
                    chrome.runtime.sendMessage(new Message('front-cursor-iframe', getFrameIndex()));
                    position = adjustPosition(e.x, e.y);
                    cursorLabel.style.display = 'block';
                    cursorLabel.style.left = position.x + 'px';
                    cursorLabel.style.top = position.y + 'px';
                    cursorLabel.innerText = e.x + ', ' + e.y;
                }
                
				if (showElementSelector) {
                    chrome.runtime.sendMessage(new Message('front-element-iframe', getFrameIndex()));
                    elementSelector.style.display = 'none';
                    clearTimeout(setSelectorTimeout);
                    selectedElement = document.elementFromPoint(e.x, e.y);
                
					if (selectedElement) {
                        selectedRect = selectedElement.getBoundingClientRect();
                        position = adjustPosition(selectedRect.left, selectedRect.top);
                    
						setSelectorTimeout = setTimeout(function () {
                            elementSelector.style.display = 'block';
                            setRect(elementSelector, position.x, position.y, selectedRect.width, selectedRect.height);
                        }, 100);
                    }
                }
            });
        }
        isLinked = true;
    }
    AutomationFront.init = init;
	
    var simulate;
    (function (simulate) {

	function getIframeDocument(document, path) {
            if (path.length > 0) {
                var p = path.shift();
                return getIframeDocument(document.querySelectorAll('iframe')[p].contentDocument, path);
            }
            else {
                return document;
            }
        }

        function mouseEvent(event, x, y, key) {
            var ev = document.createEvent("MouseEvent"), el = document.elementFromPoint(x, y);

            ev.initMouseEvent(event, true, true, window, null, x, y, x, y, false, false, false, false, key, null);
            el.dispatchEvent(ev);
        }

        function click(x, y) {
            mouseEvent("click", x, y, 0);
        }

        function mouseup(x, y, key) {
            mouseEvent("mouseup", x, y, key);
        }

        function scrollTo(scrollX, scrollY) {
            window.scrollTo(scrollX, scrollY);
        }

        function input(x, y, value) {
            var el = document.elementFromPoint(x, y);
            el.value = value;
        }

        function run(action) {
            switch (action.type) {
                case 'click':
                    click(action.x, action.y);
                    break;
                case 'mouseup':
                    mouseup(action.x, action.y, action.key);
                    break;
                case 'input':
                    input(action.x, action.y, action.value);
                    break;
                case 'scroll':
                    scrollTo(action.scrollX, action.scrollY);
                    break;
            }
        }
        simulate.run = run;
    })(simulate = AutomationFront.simulate || (AutomationFront.simulate = {}));

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        var msg, element;

        switch (message.type) {
            case 'front-init':
                init();
                break;

			case 'front-simulate':
                var action = message.msg;

                if (action.frameIndex === getFrameIndex()) {
                    simulate.run(action);
                }
                break;

			case 'front-size':
                if (getFrameIndex() === "") {
                    sendResponse({
                        w: window.innerWidth,
                        h: window.innerHeight,
                        devicePixelRatio: devicePixelRatio
                    });
                }
                break;

			case 'front-addFlag':
                msg = message.msg;

                if (msg.frameIndex === getFrameIndex()) {
                    var position = adjustPosition(msg.x, msg.y);
                    createLabel('ar-flag-' + msg.id, msg.text, position.x, position.y, '#d9534f');
                }
                break;
            
			case 'front-addElementBox':
                msg = message.msg;
            
			if (msg.frameIndex === getFrameIndex()) {
                    element = document.elementFromPoint(msg.x, msg.y);

                    if (element && element.tagName) {
                        var rect = element.getBoundingClientRect();
                        position = adjustPosition(rect.left, rect.top);
                        createBox('ar-flag-' + msg.id, msg.text, position.x, position.y, rect.width, rect.height);
                    }
                }
                break;
            
			case 'front-removeFlag':
                msg = message.msg;

                if (msg.frameIndex === getFrameIndex()) {
                    element = document.getElementById('ar-flag-' + msg.id);

                    if (element) {
                        document.body.removeChild(element);
                    }
                }
                break;
            
			case 'front-showCursor':
                showCursor = true;
                cursorLabel.style.display = 'block';
                break;
            
			case 'front-hideCursor':
                showCursor = false;
                cursorLabel.style.display = 'none';
                break;
            
			case 'front-showElement':
                showElementSelector = true;
                stopSendingActions = true;
                elementSelector.style.display = 'block';
                break;
    
			case 'front-hideElement':
                showElementSelector = false;
                elementSelector.style.display = 'none';
                clearTimeout(setSelectorTimeout);
                setTimeout(function () {
                    stopSendingActions = false;
                }, 500);
                break;
				
            case 'front-getElement':
                msg = message.msg;
                if (msg.frameIndex === getFrameIndex()) {
                    sendResponse(new ElementInfo(document.elementFromPoint(msg.x, msg.y)));
                }
                break;
				
            case 'front-cursor-iframe':
                if (message.msg !== getFrameIndex()) {
                    cursorLabel.style.display = 'none';
                }
                break;
				
            case 'front-element-iframe':
                if (message.msg !== getFrameIndex()) {
                    elementSelector.style.display = 'none';
                }
                break;
        }
    });
	
    chrome.runtime.sendMessage(new Message('ready'));
})(AutomationFront || (AutomationFront = {}));