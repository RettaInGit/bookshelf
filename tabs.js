document.addEventListener('DOMContentLoaded', () => {
    const saveTabsButton = document.getElementById('saveTabs');
    const restoreAllTabsButton = document.getElementById('restoreAllTabs');
    const categoryInput = document.getElementById('categoryInput');
    const tabGroupsContainer = document.getElementById('tabGroups');

    // Load saved tab groups when the page loads
    loadSavedTabGroups();

    // Event listener for the 'Save Current Tabs' button
    saveTabsButton.addEventListener('click', () => {
        const category = categoryInput.value.trim();
        if (category === '') {
            alert('Please enter a category name.');
            return;
        }

        // Query all open tabs in the current window
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
            const tabsData = tabs.map(tab => ({
                title: tab.title,
                url: tab.url
            }));

            // Save tabs under the specified category
            chrome.storage.local.get('savedTabGroups', (data) => {
                const savedTabGroups = data.savedTabGroups || [];

                // Check if the category already exists
                const existingGroupIndex = savedTabGroups.findIndex(group => group.category === category);
                if (existingGroupIndex !== -1) {
                    // Append the new tabs to the existing group
                    savedTabGroups[existingGroupIndex].tabs = savedTabGroups[existingGroupIndex].tabs.concat(tabsData);
                } else {
                    // Add a new group
                    savedTabGroups.push({
                        category: category,
                        tabs: tabsData
                    });
                }

                // Save the updated tab groups to storage
                chrome.storage.local.set({ 'savedTabGroups': savedTabGroups }, () => {
                    // Clear the category input
                    categoryInput.value = '';
                    // Update the tab groups display
                    displayTabGroups(savedTabGroups);
                });
            });
        });
    });

    // Event listener for the 'Restore All Tabs' button
    restoreAllTabsButton.addEventListener('click', () => {
        chrome.storage.local.get('savedTabGroups', (data) => {
            const tabGroups = data.savedTabGroups || [];
            tabGroups.forEach(group => {
                group.tabs.forEach(tab => {
                    chrome.tabs.create({ url: tab.url });
                });
            });
        });
    });

    // Function to load saved tab groups from storage
    function loadSavedTabGroups() {
        chrome.storage.local.get('savedTabGroups', (data) => {
            const tabGroups = data.savedTabGroups || [];
            displayTabGroups(tabGroups);
        });
    }

    // Function to display tab groups on the page
    function displayTabGroups(tabGroups) {
        tabGroupsContainer.innerHTML = ''; // Clear existing content

        tabGroups.forEach((group, groupIndex) => {
            // Create a container for each group
            const groupContainer = document.createElement('div');
            groupContainer.className = 'tabGroup';

            // Create a header for the group
            const groupHeader = document.createElement('h2');
            groupHeader.textContent = group.category;

            // Add a remove button for the group
            const removeGroupButton = document.createElement('button');
            removeGroupButton.textContent = '✕';
            removeGroupButton.title = 'Remove this group';
            removeGroupButton.className = 'removeGroupButton';
            removeGroupButton.addEventListener('click', () => {
                removeTabGroup(groupIndex);
            });

            // Create a list for the tabs in the group
            const tabList = document.createElement('ul');
            tabList.className = 'tabList';

            group.tabs.forEach((tab, tabIndex) => {
                const listItem = document.createElement('li');

                const link = document.createElement('a');
                link.href = tab.url;
                link.textContent = tab.title;
                link.target = '_blank';

                const removeTabButton = document.createElement('button');
                removeTabButton.textContent = 'X';
                removeTabButton.title = 'Remove this tab';
                removeTabButton.className = 'removeTabButton';
                removeTabButton.addEventListener('click', () => {
                    removeTabFromGroup(groupIndex, tabIndex);
                });

                listItem.appendChild(removeTabButton);
                listItem.appendChild(link);
                tabList.appendChild(listItem);
            });

            groupContainer.appendChild(removeGroupButton);
            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(tabList);

            // Add a restore button for the group
            const restoreGroupButton = document.createElement('button');
            restoreGroupButton.textContent = 'Restore Group Tabs';
            restoreGroupButton.className = 'restoreGroupButton';
            restoreGroupButton.addEventListener('click', () => {
                restoreTabGroup(group);
            });

            groupContainer.appendChild(restoreGroupButton);

            tabGroupsContainer.appendChild(groupContainer);
        });
    }

    // Function to remove an entire tab group
    function removeTabGroup(groupIndex) {
        chrome.storage.local.get('savedTabGroups', (data) => {
            const tabGroups = data.savedTabGroups || [];
            tabGroups.splice(groupIndex, 1);
            chrome.storage.local.set({ 'savedTabGroups': tabGroups }, () => {
                displayTabGroups(tabGroups);
            });
        });
    }

    // Function to remove a tab from a group
    function removeTabFromGroup(groupIndex, tabIndex) {
        chrome.storage.local.get('savedTabGroups', (data) => {
            const tabGroups = data.savedTabGroups || [];
            tabGroups[groupIndex].tabs.splice(tabIndex, 1);
            // Remove the group if no tabs are left
            if (tabGroups[groupIndex].tabs.length === 0) {
                tabGroups.splice(groupIndex, 1);
            }
            chrome.storage.local.set({ 'savedTabGroups': tabGroups }, () => {
                displayTabGroups(tabGroups);
            });
        });
    }

    // Function to restore tabs from a single group
    function restoreTabGroup(group) {
        group.tabs.forEach(tab => {
            chrome.tabs.create({ url: tab.url });
        });
    }
});