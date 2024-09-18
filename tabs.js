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
            // Filter tabs to only include those with URLs starting with 'http'
            const filteredTabs = tabs.filter(tab => tab.url.startsWith('http'));

            // Check if there are any tabs to save
            if (filteredTabs.length === 0) {
                alert('No tabs with URLs starting with "http" found.');
                return;
            }

            // Map the filtered tabs to get their title and URL
            const tabsData = filteredTabs.map(tab => ({
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

            // Create a header container for the group
            const groupHeaderContainer = document.createElement('div');
            groupHeaderContainer.className = 'groupHeaderContainer';

            // Create the master checkbox
            const masterCheckbox = document.createElement('input');
            masterCheckbox.type = 'checkbox';
            masterCheckbox.className = 'masterCheckbox';
            masterCheckbox.title = 'Select/Deselect All Tabs in this Group';

            // Add an event listener to the master checkbox
            masterCheckbox.addEventListener('change', (event) => {
                toggleGroupCheckboxes(groupIndex, event.target.checked);
            });

            // Create a title for the group
            const groupTitle = document.createElement('h2');
            groupTitle.textContent = group.category;
            groupTitle.className = 'groupTitle';
            groupTitle.contentEditable = false;

            // Create an edit button for the group title
            const editGroupButton = document.createElement('button');
            editGroupButton.textContent = 'Edit';
            editGroupButton.title = 'Edit group title';
            editGroupButton.className = 'editGroupButton';
            editGroupButton.dataset.mode = 'edit'; // Add a data attribute to track mode
            editGroupButton.addEventListener('click', () => {
                toggleEditGroupTitle(groupIndex);
            });

            // Add a remove button for the group
            const removeGroupButton = document.createElement('button');
            removeGroupButton.textContent = 'X';
            removeGroupButton.title = 'Remove this group';
            removeGroupButton.className = 'removeGroupButton';
            removeGroupButton.addEventListener('click', () => {
                removeTabGroup(groupIndex);
            });

            // Append elements to the header container
            groupHeaderContainer.appendChild(masterCheckbox);
            groupHeaderContainer.appendChild(groupTitle);
            groupHeaderContainer.appendChild(editGroupButton);
            groupHeaderContainer.appendChild(removeGroupButton);

            // Create a list for the tabs in the group
            const tabList = document.createElement('ul');
            tabList.className = 'tabList';

            group.tabs.forEach((tab, tabIndex) => {
                const listItem = document.createElement('li');

                // Create a checkbox for selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'tabCheckbox';
                checkbox.dataset.tabIndex = tabIndex;
                checkbox.dataset.groupIndex = groupIndex;

                // Add event listener to update master checkbox when individual checkbox changes
                checkbox.addEventListener('change', () => {
                    updateMasterCheckboxState(groupIndex);
                });

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

                listItem.appendChild(checkbox);
                listItem.appendChild(link);
                listItem.appendChild(removeTabButton);
                tabList.appendChild(listItem);
            });

            // Add a button to remove selected tabs
            const removeSelectedButton = document.createElement('button');
            removeSelectedButton.textContent = 'Remove Selected Tabs';
            removeSelectedButton.className = 'removeSelectedButton';
            removeSelectedButton.addEventListener('click', () => {
                removeSelectedTabs(groupIndex);
            });

            // Add a restore button for the group
            const restoreGroupButton = document.createElement('button');
            restoreGroupButton.textContent = 'Restore Group Tabs';
            restoreGroupButton.className = 'restoreGroupButton';
            restoreGroupButton.addEventListener('click', () => {
                restoreTabGroup(group);
            });

            // Append elements to the group container
            groupContainer.appendChild(groupHeaderContainer);
            groupContainer.appendChild(tabList);
            groupContainer.appendChild(removeSelectedButton);
            groupContainer.appendChild(restoreGroupButton);

            tabGroupsContainer.appendChild(groupContainer);

            // Initialize the master checkbox state
            updateMasterCheckboxState(groupIndex);
        });
    }

    // Function to toggle all checkboxes in a group
    function toggleGroupCheckboxes(groupIndex, isChecked) {
        const groupContainer = tabGroupsContainer.children[groupIndex];
        const checkboxes = groupContainer.querySelectorAll('.tabCheckbox');

        checkboxes.forEach((checkbox) => {
            checkbox.checked = isChecked;
        });
    }

    // Function to update the master checkbox state based on individual checkboxes
    function updateMasterCheckboxState(groupIndex) {
        const groupContainer = tabGroupsContainer.children[groupIndex];
        const masterCheckbox = groupContainer.querySelector('.masterCheckbox');
        const checkboxes = groupContainer.querySelectorAll('.tabCheckbox');

        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

        masterCheckbox.checked = allChecked;
        masterCheckbox.indeterminate = !allChecked && anyChecked;
    }

    // Function to toggle between edit and save modes for the group title
    function toggleEditGroupTitle(groupIndex) {
        const groupContainer = tabGroupsContainer.children[groupIndex];
        const groupHeaderContainer = groupContainer.querySelector('.groupHeaderContainer');
        const groupTitle = groupHeaderContainer.querySelector('.groupTitle');
        const editGroupButton = groupHeaderContainer.querySelector('.editGroupButton');

        if (editGroupButton.dataset.mode === 'edit') {
            // Switch to edit mode
            groupTitle.contentEditable = true;
            groupTitle.focus();

            // Change button to 'Save'
            editGroupButton.textContent = 'Save';
            editGroupButton.title = 'Save group title';
            editGroupButton.dataset.mode = 'save';

            // Handle Enter key to save
            groupTitle.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent newline
                    toggleEditGroupTitle(groupIndex); // Save on Enter key
                }
            };
        } else {
            // Switch to view mode (save changes)
            const newTitle = groupTitle.textContent.trim();

            if (newTitle === '') {
                alert('Group title cannot be empty.');
                groupTitle.focus();
                return;
            }

            // Retrieve the saved groups
            chrome.storage.local.get('savedTabGroups', (data) => {
                const savedTabGroups = data.savedTabGroups || [];
                const group = savedTabGroups[groupIndex];

                // Check if a group with the new title already exists
                const existingGroupIndex = savedTabGroups.findIndex(g => g.category === newTitle);
                if (existingGroupIndex !== -1 && existingGroupIndex !== groupIndex) {
                    alert('A group with this title already exists. Please choose a different title.');
                    groupTitle.focus();
                    return;
                }

                // Update the group title
                group.category = newTitle;

                // Save the updated tab groups to storage
                chrome.storage.local.set({ 'savedTabGroups': savedTabGroups }, () => {
                    // Disable contentEditable
                    groupTitle.contentEditable = false;

                    // Reset the edit button
                    editGroupButton.textContent = 'Edit';
                    editGroupButton.title = 'Edit group title';
                    editGroupButton.dataset.mode = 'edit';

                    // Remove keypress handler
                    groupTitle.onkeypress = null;

                    // Update the display in case titles are sorted or need re-rendering
                    // Optionally, you can call: displayTabGroups(savedTabGroups);
                });
            });
        }
    }

    // Function to remove selected tabs from a group
    function removeSelectedTabs(groupIndex) {
        chrome.storage.local.get('savedTabGroups', (data) => {
            const tabGroups = data.savedTabGroups || [];
            const group = tabGroups[groupIndex];

            // Get all checkboxes in this group's tab list
            const groupContainer = tabGroupsContainer.children[groupIndex];
            const checkboxes = groupContainer.querySelectorAll('.tabCheckbox');

            // Collect the indices of tabs to remove
            const indicesToRemove = [];
            checkboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    indicesToRemove.push(parseInt(checkbox.dataset.tabIndex));
                }
            });

            if (indicesToRemove.length === 0) {
                alert('Please select at least one tab to remove.');
                return;
            }

            // Confirm to remove the tabs
            if (!confirm('Are you sure you want to remove the selected tabs?')) {
                return;
            }

            // Remove tabs starting from the highest index to avoid index shifting
            indicesToRemove.sort((a, b) => b - a).forEach((tabIndex) => {
                group.tabs.splice(tabIndex, 1);
            });

            // Remove the group if no tabs are left
            if (group.tabs.length === 0) {
                tabGroups.splice(groupIndex, 1);
            }

            // Save the updated tab groups to storage
            chrome.storage.local.set({ 'savedTabGroups': tabGroups }, () => {
                displayTabGroups(tabGroups);
            });
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