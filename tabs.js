document.addEventListener('DOMContentLoaded', () => {
    const saveTabsButton = document.getElementById('saveTabs');
    const restoreTabsButton = document.getElementById('restoreTabs');
    const tabList = document.getElementById('tabList');

    // Load saved tabs when the page loads
    loadSavedTabs();

    // Event listener for the 'Save Current Tabs' button
    saveTabsButton.addEventListener('click', () => {
        // Query all open tabs in the current window
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const tabsData = tabs.map(tab => ({
                title: tab.title,
                url: tab.url
            }));
            // Save tabs to local storage
            chrome.storage.local.set({ 'savedTabs': tabsData }, () => {
                // Update the tab list display
                displayTabs(tabsData);
            });
        });
    });

    // Event listener for the 'Restore All Tabs' button
    restoreTabsButton.addEventListener('click', () => {
        chrome.storage.local.get('savedTabs', (data) => {
            const tabs = data.savedTabs || [];
            tabs.forEach(tab => {
                chrome.tabs.create({ url: tab.url });
            });
        });
    });

    // Function to load saved tabs from storage
    function loadSavedTabs() {
        chrome.storage.local.get('savedTabs', (data) => {
            if (data.savedTabs && data.savedTabs.length > 0) {
                displayTabs(data.savedTabs);
            }
        });
    }

    // Function to display tabs in the list
    function displayTabs(tabs) {
        tabList.innerHTML = ''; // Clear existing list
        tabs.forEach((tab, index) => {
            const listItem = document.createElement('li');

            const link = document.createElement('a');
            link.href = tab.url;
            link.textContent = tab.title;
            link.target = '_blank';

            const removeButton = document.createElement('button');
            removeButton.textContent = 'X';
            removeButton.title = 'Remove this tab from the list';
            removeButton.className = 'removeButton';
            removeButton.addEventListener('click', () => {
                removeTab(index);
            });

            listItem.appendChild(removeButton);
            listItem.appendChild(link);
            tabList.appendChild(listItem);
        });
    }

    // Function to remove a tab from the saved list
    function removeTab(index) {
        chrome.storage.local.get('savedTabs', (data) => {
            const tabs = data.savedTabs;
            tabs.splice(index, 1);
            chrome.storage.local.set({ 'savedTabs': tabs }, () => {
                displayTabs(tabs);
            });
        });
    }
});