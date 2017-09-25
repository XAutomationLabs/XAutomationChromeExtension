
angular.module('AutomationModule', ['chromeStorage']).controller('RecordController', ['$scope', '$http', function ($scope, $http) {

//	Setting up the scope variable and define all the model values inside $Scope object
    var record = null;
	var collection = null;
	var currentTab = null;
	var background = null;
	var editingActionIndex = null;

    window.onbeforeunload = function () {
        if (background) {
            background.popup = null;
        }
    };

    $scope.editingAction = {
        json: null
    };

	$scope.editingCollection = {
		json: null
	};
	
    $scope.windowTypes = ['normal', 'popup', 'panel'];
    $scope.isReady = false;
    $scope.isTabReady = false;
    $scope.isLinked = false;
    $scope.isRunning = false;
    $scope.isCursorShown = false;
    $scope.isGetElementShown = false;
    $scope.isResponseDataReady = false;
    $scope.showResponseError = true;
	$scope.collectionSelected = false;
	$scope.errorMessage;
	
	function resetUiRecorderStatus() {
		$scope.isTabReady = false;
		$scope.isLinked = false;
		$scope.isRunning = false;
		$scope.isCursorShown = false;
		$scope.isGetElementShown = false;
	}
	
	function downloadJson(filename, text) {
		download(new Blob([text]), filename, "text/plain");
	}
	
	$scope.roundTimeDiff = function(timeDiff) {
		return Math.round(timeDiff / 100) / 10;
	};
	
	$scope.openImage = function(imageUrl) {
		window.open(imageUrl);
	};
	
	$scope.getMatchPercentage = function(mismatchPercentage) {
		return (100 - mismatchPercentage).toFixed(2);
	};
	
	$scope.getMemoIcon = function(action) {
		switch(action.actionType) {
			case 'screenshot':
				return 'glyphicon-camera';
			case 'wait':
				return 'glyphicon-time';
			default:
				return 'glyphicon-flash';
		}
	};
	
	$scope.downloadJson = function() {
		var json = angular.toJson(record.getJson());
		
		downloadJson('test.json', json);
	};
	
	$scope.openUrl = function() {
		AutomationRecorder.createWindow(record.given.url, record.given.windowType, record.given.innerWidth, 
			record.given.innerHeight, function(win){
				currentTab = win.tabs[0];
				
				$scope.$apply(function() {
					$scope.isRunning = false;
					$scope.isTabReady = true;
					$scope.isLinked = false;
					$scope.isCursorShown = false;
					$scope.isGetElementShown = false;
				});
			});
	};
	
	$scope.link = function() {
		record.start(currentTab.id);
		
		$scope.isLinked = true;
		$scope.isRunning = true;
		$scope.isCollectionReady = false;
	};
	
	function testRunCallback(action) {
		if(!action) {
			record.testRunningStatus = AutomationRecorder.TestRunningStatus.DONE;
		}
		
		$scope.$apply(function() {
			$scope.record = record;
		});
	}
	
	$scope.isTestRunning = function() {
		return record.testRunningStatus === AutomationRecorder.TestRunningStatus.RUNNING;
	};
	
	$scope.isTestDone = function() {
		return record.testRunningStatus === AutomationRecorder.TestRunningStatus.DONE;
	};
	
	$scope.runTest = function() {
		if(record.testRunningStatus !== AutomationRecorder.RUNNING) {
			record.testRunningStatus = AutomationRecorder.TestRunningStatus.RUNNING;
			AutomationRecorder.runRecord(record, testRunCallback);
		}
	};
	
	$scope.stopTest = function() {
		record.testRunningStatus = AutomationRecorder.TestRunningStatus.DONE;
		clearTimeout(record.testRunningTimeout);
	};
	
	$scope.clearTestResults = function() {
		record.clearTestResults();
	};
	
	$scope.clear = function() {
		record.clear();
	};
	
	$scope.remove = function(index, action) {
		if(currentTab) {
			action.unsetFlag(currentTab.id);
		}
		
		record.removeAction(index);
	};
	
	$scope.initTestWorkbench = function() {
		$scope.collectionSelected = true;
	};
	
	$scope.isCollectionReady = function() {
		return $scope.collectionSelected;
	};
	
	$scope.play = function(action) {
		if(action.hasFlag) {
			action.unsetFlag(currentTab.id);
		}
		
		action.play(currentTab.id);
	};
	
	$scope.playFrom = function(index) {
		AutomationRecorder.runActionsFrom(currentTab, record, index, true, testRunCallback);
	};
	
	$scope.toggleFlag = function(action) {
		if(action.hasFlag) {
			action.unsetFlag(currentTab.id);
		}
		else {
			action.setFlag(currentTab.id);
		}
	};
	
	$scope.showActionJson = function(index) {
		editingActionIndex = index;
		
		$scope.editingAction.json = angular.toJson(record.actions[index].getJson(), true);
		$('#events-json').modal();
	};
	
	$scope.saveJson = function() {
		record.actions[editingActionIndex] = AutomationRecorder.createActionHistory(
				angular.fromJson($scope.editingAction.json));
		
		$('#events-json').modal('hide');
	};
	
	$scope.saveCollectionJson = function() {
		var index;
		var searchValue = $scope.current.collection.testCaseName;
		
		_.each($scope.collection.testCases, function(data, idx) { 
			if (_.isEqual(data.testCaseName, searchValue)) {
				index = idx;
				return;
			}
		});
		
		if(index >= 0) {
			$scope.errorMessage = "Test case '" + $scope.current.collection.testCaseName + "' already existing, you cannot create a duplicate test case";
		} else {
			collection.pushCollection($scope.current.collection);
			
			$('#events-collection').modal('hide');			
		}
	};
	
	$scope.setAsBaseline = function(action) {
		action.setAsBaseline();
	};
	
	$scope.current = {
		action: null,
		collection: null
	};
	
	$scope.edit = function(action) {
		$scope.current.action = action;
		$('#edit-event').modal();
	};
	
	$scope.createTestCase = function() {
		$scope.current.collection = null;
		$scope.errorMessage = "";
		$('#events-collection').modal();
	};
	
	$scope.takeScreenshot = function() {
		record.takeScreenshot(record.given.innerWidth, record.given.innerHeight, currentTab.id, currentTab.windowId, function(){
			$scope.$apply(function() {
				$scope.record = record;
			});
		});
	};
	
	$scope.toggleCursor = function() {
		if($scope.isLinked && $scope.isRunning) {
			if($scope.isCursorShown) {
				chrome.tabs.sendMessage(currentTab.id, 
				{
					type: 'front-hideCursor'
				});
			}
			else {
				chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement'});
				$scope.isGetElementShown = false;
				chrome.tabs.sendMessage(currentTab.id, { type: 'front-showCursor'});
			}
			$scope.isCursorShown = !$scope.isCursorShown;
		}
	};
	
	$scope.toggleGetWaitFor = function() {
		if($scope.isLinked && $scope.isRunning) {
			if($scope.isGetElementShown) {
				chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement'});
			}
			else {
				chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor'});
				$chrome.isCursorShown = false;
				chrome.tabs.sendMessage(currentTab.id, { type: 'front-showElement'});
			}
			
			$scope.isGetElementShown = !$scope.isGetElementShown;
		}
	};
	
	$scope.stop = function() {
		record.stop();
		
		chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideCursor'});
		$scope.isCursorShown = false;
		
		chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement'});
		$scope.isGetElementShown = false;
		
		$scope.isRunning = false;
	};
	
	$scope.resume = function() {
		record.start(currentTab.id);
		$scope.isRunning = true;
	};
	
	chrome.runtime.onMessage.addListener(function(message, sender) {
        switch (message.type) {
            case 'ready':
                if (sender.tab && record) {
                    if (record.status == AutomationRecorder.RecordStatus.LINKED || record.status == AutomationRecorder.RecordStatus.STOPPED) {
                        record.relink(currentTab.id);
                    }
                }
                break;
            
			case 'action':
                record.pushAction(message.msg);
                $scope.$apply(function () {
                    $scope.record = record;
                });
                break;
            
			case 'waitFor':
                record.pushWaitFor(message.msg);
                chrome.tabs.sendMessage(currentTab.id, { type: 'front-hideElement' });
                $scope.$apply(function () {
                    $scope.isGetElementShown = false;
                    $scope.record = record;
                });
                break;
            
			default:
                chrome.tabs.sendMessage(currentTab.id, message);
                break;
        }

	});
	
//	Set the initial context for the controller by capturing the background page and capture the Record object containing 
//	data for different atrributes of the window.
    chrome.runtime.getBackgroundPage(function (backgroundWindow) {
        background = backgroundWindow;
        
		backgroundWindow.popup = {
            takeScreenshot: function () {
                $scope.takeScreenshot();
            },
            toggleCursor: function () {
                $scope.$apply(function () {
                    $scope.toggleCursor();
                });
            },
            toggleGetWaitFor: function () {
                $scope.$apply(function () {
                    $scope.toggleGetWaitFor();
                });
            }
        };
        
		var tab = backgroundWindow.currentTab;
        record = new AutomationRecorder.Record();
		collection = new AutomationRecorder.Collection();
		
		$scope.collection = collection;
		
        chrome.tabs.sendMessage(tab.id, { type: 'front-size' }, function (response) {
            chrome.windows.get(tab.windowId, function (window) {
                $scope.$apply(function () {
                    record.given.url = tab.url;
                    record.given.windowType = window.type;
                    
					if (response) {
                        record.given.innerWidth = response.w;
                        record.given.innerHeight = response.h;
                    }
        
					$scope.record = record;
                    $scope.isReady = true;
                });
            });
        });
    });
}]);