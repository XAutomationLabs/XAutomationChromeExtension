var AutomationRecorder;

(function (AutomationRecorder) {
    //Automation Recorder data structure captures the recording status of the automation
	//test cases.
	AutomationRecorder.RecordStatus = {
        NEW: 0,
        LINKED: 1,
        STOPPED: 2
    };
    
	//TestRunningStatus data structure captures the running status of an automation test case
	AutomationRecorder.TestRunningStatus = {
        READY: 0,
        RUNNING: 1,
        DONE: 3
    };
    
	//Generates a guid for a valid automation test case
	function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }
	
    var Given = (function () {
        function Given() {
        }
        return Given;
    })();
	
	//Export the Given symbol.
    AutomationRecorder.Given = Given;

	var CollectionHistory = (function() {
		function CollectionHistory(collection) {
			this.testCaseName = collection.testCaseName;
			this.metadataName = collection.metadata.name;
			this.metadataDescription = collection.metadata.description;
			this.metadataAuthor = collection.metadata.author;
			this.metadataCategory = collection.metadata.category;
			
			this.collection = collection;
		}
		
		CollectionHistory.prototype.getJson = function() {
			var json = _.omit(this, 'collection');
			
			return json;
		};
		
		CollectionHistory.prototype.hasName = function() {
			return this.testCaseName.length > 0;
		};
		
		CollectionHistory.prototype.attachRecord = function(record) {
			this.record = record;
		};
		
		return CollectionHistory;
	})();
	
	AutomationRecorder.CollectionHistory = CollectionHistory;
	
	var ActionHistory = (function() {
		function ActionHistory(timeDiff, actionType, action, data) {
			this.delay = 0;
			this.wait = 0;
			this.hasFlag = false;
			this.id = guid();
			this.actionType = actionType;
			this.action = action;
			this.data = data;
			this.delay = timeDiff;
			this.memo = actionType;
			this.testResult = { isDone: false, isTimeout: false, imageComparison: null };
		}
		
		ActionHistory.prototype.play = function(tabId) {
			chrome.tabs.sendMessage(tabId, {
				'type': 'front-simulate',
				msg: this.action
			});
		};
		
		ActionHistory.prototype.getJson = function() {
			var json = _.omit(this, 'testResult', 'hasFlag', 'id');
			
			if(this.testResult.isDone) {
				json.testResult = {
					imageComparison: this.testResult.imageComparison
				};
			}
			
			return json;
		};
		
		ActionHistory.prototype.setFlag = function(tabId) {
			var _this = this;
			
			if(this.hasPosition()) {
				this.hasFlag = true;
				
				if(this.actionType === 'wait') {
					AutomationRecorder.compareElement(this.data.element, tabId, this.action.x, this.action.y, this.action.frameIndex, function(isSame) {
						if(isSame) {
							chrome.tabs.sendMessage(tabId, {
								'type': 'front-addElementBox',
								msg: {
									frameIndex: _this.action.frameIndex,
									id: _this.id,
									text: _this.memo + ' (' + _this.data.element.tagName + ')',
									x: _this.action.x,
									y: _this.action.y
								}
							});
						}
					});
				}
				else {
					chrome.tabs.sendMessage(tabId, {
						'type': 'front-addFlag',
						msg: {
							frameIndex: this.action.frameIndex,
							id: this.id,
							text: this.memo,
							x: this.action.x,
							y: this.action.y
						}
					});
				}
			}
		};
		
		ActionHistory.prototype.unsetFlag = function(tabId) {
			if(this.hasPosition) {
				this.hasFlag = false;
				
				chrome.tabs.sendMessage(tabId, {
					'type': 'front-removeFlag',
					msg: {
						frameIndex: this.action.frameIndex,
						id: this.id
					}
				});
			}
		};
		
		ActionHistory.prototype.setAsBaseline = function() {
			if(this.testResult && this.testResult.isDone) {
				this.data = this.testResult.imageComparison.actualImage;
			}
		};
		
		ActionHistory.prototype.hasValue = function() {
			return this.action && this.action.type === 'input';
		};
		
		ActionHistory.prototype.hasPosition = function() {
			return this.action && (this.action.type === 'click' || this.action.type === 'mouseup' || this.action.type === 'input' || this.action.type === 'wait');
		};
		
		ActionHistory.prototype.isEvent = function() {
			return this.action && this.action.type !== 'wait' && this.action.type !== 'screenshot';
		};
		
		return ActionHistory;
	})();
	
	AutomationRecorder.ActionHistory = ActionHistory;
	
	var Collection = (function() {
		function Collection(testCases) {
			this.testCases = [];
			
			if(testCases) {
				this.restoreState(testCases);
			}
		}
		
		Collection.prototype.restoreState = function(testCases, pointer) {
			for(var i = 0; i < testCases.length; i++){
				var historyObject = testCases[i];
				var localHistory = new AutomationRecorder.CollectionHistory(historyObject.collection);
				
				localHistory.attachRecord(this.restoreRecord(historyObject.record));
				this.testCases.push(localHistory);
			}
			//this.pushCollection(collection.Collection);
		};
		
		Collection.prototype.pushCollection = function(collection) {
			this.testCases.push(new CollectionHistory(collection));
		};
		
		Collection.prototype.updateCollection = function(collection, index) {
			this.testCases[index] = collection;
		};
		
		Collection.prototype.getCollection = function(index) {
			if(this.testCases) {
				if(this.testCases.length < index) return null;
				
				return this.testCases[index].getJson();
			}
			
			return null;
		}
		
		Collection.prototype.restoreRecord = function(record) {
			var localRecord = new AutomationRecorder.Record();
		
			return localRecord.restoreState(record);
		};

		return Collection;
	})();
	
	AutomationRecorder.Collection = Collection;
	
	//Define record class and create prototype methods so that it can be accessed through RecordController
	//accessed to hold the critical data pertaining to the user interactions and the recording.
	//The same can be utilized to play it later on the local browser without utilizing the automation
	//framework or with automation framework.
	var Record = (function(){
		function Record() {
			this.extendCtor();
		}
		
		Record.prototype.extendCtor = function() {
			this.status = AutomationRecorder.RecordStatus.NEW;
			this.actions = [];
			this.testRunningStatus = AutomationRecorder.TestRunningStatus.READY;
			this.given = new Given();			
		};
		
		Record.prototype.restoreState = function(record) {
			this.extendCtor();
			
			for(var i = 0; i < record.actions.length; i++) {
				var localHistory = new AutomationRecorder.ActionHistory(record.actions[i].delay, record.actions[i].memo, 
								record.actions[i], record.actions[i].data);
				
				this.restoreGivenState(record.given);
				this.actions.push(localHistory);
			}
		};
		
		Record.prototype.restoreGivenState = function(given) {
			this.given.url = given.url;
			this.given.windowType = window.type;
			this.given.innerWidth = given.innerWidth;
			this.given.innerHeight = given.innerHeight;
		};
		
		//Initialize the test case execution by sending message to chrome window to init
		//that is being handled by front.js content script.
		Record.prototype.relink = function(tabId) {
			chrome.tabs.sendMessage(tabId, { type : 'front-init' });
		};
		
		//Start the recording process by sending a message to chrome window running the 
		//content script i.e. front.js, this will start capturing the events on the window
		//where content script is running.
		Record.prototype.start = function(tabId) {
			switch(this.status) {
				case AutomationRecorder.RecordStatus.NEW:
					chrome.tabs.sendMessage(tabId, { type : 'front-init' });
					
					this.status = AutomationRecorder.RecordStatus.LINKED;
					this.last = Date.now();
					break;
					
				case AutomationRecorder.RecordStatus.STOPPED:
					this.status = AutomationRecorder.RecordStatus.LINKED;
					this.last = Date.now();
				default:
			}
		};
		
		//Stop the recording by toggling the record status and all the actions further 
		//will be stopped from being captured.
		Record.prototype.stop = function(tabId) {
			if(this.status === AutomationRecorder.RecordStatus.LINKED) {
				this.status = AutomationRecorder.RecordStatus.STOPPED;
			}
		};
		
		//
		Record.prototype.getLastAction = function(type) {
			var lastAction;
			
			if(this.actions.length > 0) {
				lastAction = this.actions[this.actions.length - 1];
				
				if(lastAction.action && lastAction.action.type === type) {
					return lastAction;
				}
			}
			return null;
		};
		
		Record.prototype.pushAction = function(action) {
			if(this.status == AutomationRecorder.RecordStatus.LINKED) {
				var now = Date.now();
				var lastAction;
				
				switch(action.type) {
					case 'scroll':
						lastAction = this.getLastAction('scroll');
						
						if(lastAction) {
							lastAction.action.scrollX = action.scrollX;
							lastAction.action.scrollY = action.scrollY;
						}
						else {
							this.actions.push(new ActionHistory(now - this.last, "event", action));
						}
						
						break;
						
					case 'input':
						lastAction = this.getLastAction('input');
						
						if(lastAction) {
							lastAction.action.value = action.value;
						}
						else {
							this.actions.push(new ActionHistory(now - this.last, "event", action));
						}
						
						break;
						
					default:
						this.actions.push(new ActionHistory(now - this.last, "event", action));
						break;
				}
				
				this.last = now;
			}
		};
		
		Record.prototype.takeScreenshot = function(width, height, tabId, windowId, next) {
			var _this = this;
			
			if(this.status == AutomationRecorder.RecordStatus.LINKED) {
				chrome.tabs.captureVisibleTab(windowId, function(screenshotUrl) {
					AutomationRecorder.resizeImage(screenshotUrl, width, height, function(img) {
						var now = Date.now();
						
						_this.actions.push(new ActionHistory(now - _this.last, 'screenshot', null, img));
						_this.last = now;
						
						if(next) {
							next(_this);
						}
					});
				});
			}
			else {
				if(next) {
					next(this);
				}
			}
		};
		
		Record.prototype.pushWaitFor = function(waitFor) {
			var now = Date.now();
			
			this.actions.push(new ActionHistory(0, 'wait', {
				x: waitFor.x,
				y: waitFor.y,
				frameIndex: waitFor.frameIndex,
				type: 'wait'
			}, {
				timeOut: now - this.last,
				element: waitFor.element
			}));
			
			this.last = now;
		};
		
		Record.prototype.clearTestResults = function() {
			this.actions.forEach(function(action) {
				action.testResult.isDone = false;
				action.testResult.isTimeout = false;
				action.testResult.imageComparison = null;
			});
			this.testRunningStatus = AutomationRecorder.TestRunningStatus.READY;
		};
		
		Record.prototype.getJson = function() {
			return {
				given: this.given,
				actions: _.map(this.actions, function(action) {
					return action.getJson();
				})
			};
		};
		
		return Record;
	})();
	
	//Export the Record symbol.
	AutomationRecorder.Record = Record;
	
	function resizeImage(imageUrl, width, height, next) {
		var img = new Image;
		var canvasElement;
		var canvasContext;
		
		img.onload = function() {
			if(img.width === width && img.height === height) {
				next(imageUrl);
			}
			else {
				canvasElement = document.createElement('canvas');
				canvasContext = canvasElement.getContext('2d');
				canvasElement.width = width;
				canvasElement.height = height;
				
				canvasContext.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
				
				next(canvasElement.toDataURL("image/png"));
			}
		};
		
		img.src = imageUrl;
	}
	
	AutomationRecorder.resizeImage = resizeImage;
	
	var getWindowSizeTimeout;
	function getWindowSize(tabId, next) {
		chrome.tabs.sendMessage(tabId, { type: 'front-size' }, function(response) {
			clearTimeout(getWindowSizeTimeout);
			
			if(response) {
				next(response);
			}
			else {
				getWindowSize(tabId, next);
			}
		});
		
		getWindowSizeTimeout = setTimeout(function() {
			getWindowSize(tabId, next);
		}, 300);
	}
	
	function resizeWindow(tabId, win, innerWidth, innerHeight, next) {
		var devicePixelRatio, width, height;
		
		getWindowSize(tabId, function(response) {
			devicePixelRatio = response.devicePixelRatio && !isNaN(response.devicePixelRatio) && response.devicePixelRatio > 0.0 ? response.devicePixelRatio : 1;
			width = Math.floor(innerWidth * devicePixelRatio + win.width - response.w * devicePixelRatio);
			height = Math.floor(innerHeight * devicePixelRatio + win.height - response.h * devicePixelRatio);
			chrome.windows.update(win.id, {
				width: width, 
				height: height
			}, function(){
				next(win);
			});
		});
	}
	
	
	function createWindow(url, windowType, innerWidth, innerHeight, next) {
		chrome.windows.create({
			url: url, 
			type: windowType
		}, function(win) {
			resizeWindow(win.tabs[0].id, win, innerWidth, innerHeight, next);
		});
	}
	
	AutomationRecorder.createWindow = createWindow;
	
	function getDelay(delay) {
		return delay && delay > 0 ? delay : 0;
	}
	
	function getElement(tabId, x, y, frameIndex, next) {
		chrome.tabs.sendMessage(tabId, {
			'type': 'front-getElement',
		msg: {x: x, y: y, frameIndex: frameIndex}
		}, function(response){
			next(response);
		});
	}
	
	var compareElementTimeout;
	function compareElement(oldElement, tabId, x, y, frameIndex, next) {
		getElement(tabId, x, y, frameIndex, function(element) {
			clearTimeout(compareElementTimeout);
			
			next(element.tagName && oldElement.tagName === element.tagName && oldElement.innerText === element.innerText &&
			_.isEqual(oldElement.computedStyle, element.computedStyle));
		});
		
		compareElementTimeout = setTimeout(function() {
			next(false);
		}, 200);
	}
	
	AutomationRecorder.compareElement = compareElement;
	
	function waitForElement(history, record, tabId, x, y, frameIndex, time, timeout, oldElement, next) {
		if(record.testRunningStatus !== AutomationRecorder.TestRunningStatus.RUNNING)
			return next(false);
		
		if(time < timeout) {
			compareElement(oldElement, tabId, x, y, frameIndex, function(isSame) {
				if(isSame) {
					history.testResult.isDone = true;
					next(true);
				}
				else {
					setTimeout(function() {
						waitForElement(history, record, tabId, x, y, frameIndex, time + 100, timeout, oldElement, next);
					}, 100);
				}
			});
		}
		else {
			history.testResult.isTimeout = true;
			next(false);
		}
	}
	
	function createActionHistory(action) {
		var newAction = new ActionHistory(action.delay, action.actionType, action.action, action.data);
		
		newAction.memo = action.memo;
		newAction.wait = action.wait;
		
		if(action.testResult) {
			newAction.testResult.isDone = true;
			newAction.testResult.imageComparison = action.testResult.imageComparison;
		}
		
		return newAction;
	}
	
	AutomationRecorder.createActionHistory = createActionHistory;
	
	function createRecord(recordInterface) {
		var record = new Record();
		
		record.given = recordInterface.given;
		
		if(recordInterface.actions) {
			recordInterface.actions.forEach(function(action) {
				var newAction = createActionHistory(action);
				
				if(newAction.testResult) {
					record.testRunningStatus = AutomationRecorder.TestRunningStatus.DONE;
				}
				record.actions.push(newAction);
			});
		}
		
		return record;
	}
	
	AutomationRecorder.createRecord = createRecord;
	
})(AutomationRecorder || (AutomationRecorder = {}));