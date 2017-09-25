var popup, currentTab;

chrome.browserAction.onClicked.addListener(function (tab) {
	if(!popup) {
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			currentTab = tabs[0];

			chrome.windows.create({
				url: "launcher/main.html",
				type: "popup",
				state: "maximized"
			});
		});
	}
});

chrome.commands.onCommand.addListener(function (command) {

	if(popup) {
		try {
			switch (command) {
				case 'screenshot':
					popup.takeScreenshot();
					break;

				case 'cursor':
					popup.toggleCursor();
					break;

				case 'wait':
					popup.toggleGetWaitFor();
					break;
					;
			}

		}
		catch (e) {}
	}
});