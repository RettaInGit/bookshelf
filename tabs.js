// Function to generate a unique ID
function generateUUID() {
    var d = new Date().getTime();
    var d2 = (performance && performance.now && (performance.now() * 1000)) || 0; // Time in microseconds since page-load or 0 if unsupported

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16; // random number between 0 and 16

        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }

        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Event listener for the DOM loaded
document.addEventListener('DOMContentLoaded', async () => {
    const homeLink = document.getElementById('homeLink');
    const searchInput = document.getElementById('searchInput');
    const settingsButton = document.getElementById('settingsButton');
    const tabsContent = document.getElementById('tabsContent');
    const settingsContent = document.getElementById('settingsContent');
    let savedTabGroups = [];

    // Load saved tab groups when the page loads and display it
    await getSavedTabGroupsFromStorage();
    displayTabGroups();

    // Event listener for messages from background.js
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.action === 'tabs_saved') {
            // Reload saved tab groups and refresh the display
            await getSavedTabGroupsFromStorage();
            displayTabGroups();
        }
    });

    // Event listener for the 'Home' link (extension name)
    homeLink.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior

        // Show the search input
        searchInput.style.display = 'block';

        // Show tabs content and hide settings content
        tabsContent.style.display = 'block';
        settingsContent.style.display = 'none';
    });

    // Event listener for the search bar
    searchInput.addEventListener('input', () => {
        displayTabGroups();
    });

    // Event listener for the 'Settings' button
    settingsButton.addEventListener('click', () => {

        // Hide the search input
        searchInput.style.display = 'none';

        // Hide tabs content and show settings content
        tabsContent.style.display = 'none';
        settingsContent.style.display = 'block';
    });

    // Function to get saved tabs from storage
    async function getSavedTabGroupsFromStorage() {
        const data = await chrome.storage.local.get('savedTabGroups');
        savedTabGroups = data.savedTabGroups || [];
    }

    // Function to set saved tabs to storage
    async function setSavedTabGroupsToStorage() {
        await chrome.storage.local.set({ 'savedTabGroups': savedTabGroups });
    }

    // Function to display tab groups on the page
    function displayTabGroups() {
        const fragment = document.createDocumentFragment();  // Create fragment to minimizes the number of reflows and repaints
        const currentSearchQuery = searchInput.value.trim().toLowerCase();  // Get current filtering query

        savedTabGroups.forEach((group) => {
            let anyTabVisible = false;
            const groupId = group.id;

            // Create a container for each group
            const groupContainer = document.createElement('div');
            groupContainer.className = 'tabGroup';
            groupContainer.dataset.groupId = groupId;

            // Create a header container for the group
            const groupHeaderContainer = document.createElement('div');
            groupHeaderContainer.className = 'groupHeaderContainer';

            // Add an event listener to toggle collapse/expand
            groupHeaderContainer.addEventListener('click', (event) => {
                // Check if the clicked element is the header container or the group title
                if ((event.target === groupHeaderContainer) || ((event.target === groupTitle) && (editGroupButton.dataset.mode === 'edit'))) {
                    toggleGroupCollapse(groupId);
                }
            });

            // Create the master checkbox
            const masterCheckbox = document.createElement('input');
            masterCheckbox.type = 'checkbox';
            masterCheckbox.className = 'masterCheckbox';
            masterCheckbox.title = 'Select/Deselect All Tabs in this Group';

            // Add an event listener to the master checkbox
            masterCheckbox.addEventListener('change', (event) => {
                toggleGroupCheckboxes(groupId, event.target.checked);
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
            editGroupButton.dataset.mode = 'edit';
            editGroupButton.addEventListener('click', () => {
                toggleEditGroupTitle(groupId);
            });

            // Create a restore button for the group
            const restoreGroupButton = document.createElement('button');
            restoreGroupButton.textContent = 'Restore';
            restoreGroupButton.title = 'Restore this group';
            restoreGroupButton.className = 'restoreGroupButton';
            restoreGroupButton.addEventListener('click', () => {
                restoreTabGroup(groupId);
            });

            // Create a remove button for the group
            const removeGroupButton = document.createElement('button');
            removeGroupButton.textContent = 'Remove';
            removeGroupButton.title = 'Remove this group';
            removeGroupButton.className = 'removeGroupButton';
            removeGroupButton.addEventListener('click', () => {
                removeTabGroup(groupId);
            });

            // Append elements to the header container in the desired order
            groupHeaderContainer.appendChild(masterCheckbox);
            groupHeaderContainer.appendChild(groupTitle);
            groupHeaderContainer.appendChild(editGroupButton);
            groupHeaderContainer.appendChild(restoreGroupButton);
            groupHeaderContainer.appendChild(removeGroupButton);

            // Create a list for the tabs in the group
            const tabList = document.createElement('ul');
            tabList.className = 'tabList';
            tabList.style.display = group.collapsed ? 'none' : 'block';

            group.tabs.forEach((tab) => {
                const tabId = tab.id;

                // Create a list item for each tab
                const listItem = document.createElement('li');
                listItem.dataset.tabId = tabId;

                // Create a checkbox for selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'tabCheckbox';

                // Add event listener to update master checkbox when individual checkbox changes
                checkbox.addEventListener('change', () => {
                    updateMasterCheckboxState(groupId);
                });

                // Create a link to store tab informations
                const link = document.createElement('a');
                link.href = tab.url;
                link.textContent = tab.title;
                link.target = '_blank';

                // Create a remove button for the tab
                const removeTabButton = document.createElement('button');
                removeTabButton.textContent = 'X';
                removeTabButton.title = 'Remove this tab';
                removeTabButton.className = 'removeTabButton';
                removeTabButton.addEventListener('click', () => {
                    removeTabFromGroup(groupId, tabId);
                });

                // Append elements to the list item in the desired order
                listItem.appendChild(checkbox);
                listItem.appendChild(link);
                listItem.appendChild(removeTabButton);

                // Append element to the tab list
                tabList.appendChild(listItem);

                // Show or hide the tab based on whether the query is included in the title
                if (tab.title.toLowerCase().includes(currentSearchQuery)) {
                    listItem.style.display = 'flex';
                    anyTabVisible = true;
                } else {
                    listItem.style.display = 'none';
                }
            });

            // Create a footer container for the group
            const groupFooterContainer = document.createElement('div');
            groupFooterContainer.className = 'groupFooterContainer';
            groupFooterContainer.style.display = group.collapsed ? 'none' : 'flex';

            // Add a button to remove selected tabs
            const removeSelectedButton = document.createElement('button');
            removeSelectedButton.textContent = 'Remove Selected Tabs';
            removeSelectedButton.className = 'removeSelectedButton';
            removeSelectedButton.addEventListener('click', () => {
                removeSelectedTabs(groupId);
            });

            // Append the removeSelectedButton to the footer container
            groupFooterContainer.appendChild(removeSelectedButton);

            // Append elements to the group container
            groupContainer.appendChild(groupHeaderContainer);
            groupContainer.appendChild(tabList);
            groupContainer.appendChild(groupFooterContainer);

            // Show or hide the group based on whether any tabs are visible
            if (anyTabVisible) {
                groupContainer.style.display = 'block';
            } else {
                groupContainer.style.display = 'none';
            }

            // Append the group container to the main container
            fragment.appendChild(groupContainer);
        });

        // Clear existing content and append the fragment
        const tabGroupsContainer = document.getElementById('tabGroups');
        tabGroupsContainer.innerHTML = '';
        tabGroupsContainer.appendChild(fragment);

        // Display a message if no tabs match
        displayResultMessage();
    }

    // Function to toggle group collapse/expand state
    function toggleGroupCollapse(groupId) {
        // Find the group index
        const groupIndex = savedTabGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        // Get HTML elements
        const groupContainer = document.querySelector(`.tabGroup[data-group-id="${groupId}"]`);
        const tabList = groupContainer.querySelector('.tabList');
        const groupFooterContainer = groupContainer.querySelector('.groupFooterContainer');

        // Toggle the display style
        if (savedTabGroups[groupIndex].collapsed) {
            tabList.style.display = 'block';
            groupFooterContainer.style.display = 'flex';
        } else {
            tabList.style.display = 'none';
            groupFooterContainer.style.display = 'none';
        }
        savedTabGroups[groupIndex].collapsed ^= true;  // toggle value

        // Save the updated savedTabGroups
        setSavedTabGroupsToStorage();
    }

    // Function to toggle all checkboxes in a group
    function toggleGroupCheckboxes(groupId, isChecked) {
        const groupContainer = document.querySelector(`.tabGroup[data-group-id="${groupId}"]`);
        const checkboxes = groupContainer.querySelectorAll('.tabCheckbox');

        checkboxes.forEach((checkbox) => {
            checkbox.checked = isChecked;
        });
    }

    // Function to update the master checkbox state based on individual checkboxes
    function updateMasterCheckboxState(groupId) {
        const groupContainer = document.querySelector(`.tabGroup[data-group-id="${groupId}"]`);
        const masterCheckbox = groupContainer.querySelector('.masterCheckbox');
        const checkboxes = groupContainer.querySelectorAll('.tabCheckbox');

        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

        masterCheckbox.checked = allChecked;
        masterCheckbox.indeterminate = !allChecked && anyChecked;
    }

    // Function to toggle between edit and save modes for the group title
    function toggleEditGroupTitle(groupId) {
        // Find the group index
        const groupIndex = savedTabGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        // Get HTML elements
        const groupHeaderContainer = document.querySelector(`.tabGroup[data-group-id="${groupId}"] .groupHeaderContainer`);
        const groupTitle = groupHeaderContainer.querySelector('.groupTitle');
        const editGroupButton = groupHeaderContainer.querySelector('.editGroupButton');

        if (editGroupButton.dataset.mode === 'edit') {
            // Switch to edit mode
            groupTitle.contentEditable = true;
            groupTitle.focus();

            // Move cursor to the end of the text using Range and Selection APIs
            if ((typeof window.getSelection != "undefined") && (typeof document.createRange != "undefined")) {
                const range = document.createRange();
                range.selectNodeContents(groupTitle);
                range.collapse(false); // Collapse the range to the end

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }

            // Change button to 'Save'
            editGroupButton.textContent = 'Save';
            editGroupButton.title = 'Save group title';
            editGroupButton.dataset.mode = 'save';

            // Handle Enter key to save
            groupTitle.onkeypress = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent newline
                    toggleEditGroupTitle(groupId); // Save on Enter key
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

            // Check if a group with the new title already exists
            if (savedTabGroups.some(g => (g.category === newTitle) && (g.id !== groupId))) {
                alert('A group with this title already exists. Please choose a different title.');
                groupTitle.focus();
                return;
            }

            // Update the group title
            savedTabGroups[groupIndex].category = newTitle;

            // Save the updated tab groups to storage
            setSavedTabGroupsToStorage();

            // Disable contentEditable
            groupTitle.contentEditable = false;

            // Reset the edit button
            editGroupButton.textContent = 'Edit';
            editGroupButton.title = 'Edit group title';
            editGroupButton.dataset.mode = 'edit';

            // Remove keypress handler
            groupTitle.onkeypress = null;
        }
    }

    // Function to remove selected tabs from a group
    function removeSelectedTabs(groupId) {
        // Find the group index
        const groupIndex = savedTabGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        // Get HTML elements
        const groupContainer = document.querySelector(`.tabGroup[data-group-id="${groupId}"]`);
        const tabList = groupContainer.querySelector('.tabList');
        const checkboxes = groupContainer.querySelectorAll('.tabCheckbox');

        // Collect the indices of tabs to remove
        const indicesToRemove = [];
        checkboxes.forEach((checkbox, checkboxIndex) => {
            if (checkbox.checked) {
                indicesToRemove.push(checkboxIndex);
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
            tabList.removeChild(tabList.children[tabIndex]);
            savedTabGroups[groupIndex].tabs.splice(tabIndex, 1);
        });

        // Remove the group if no tabs are left
        if (savedTabGroups[groupIndex].tabs.length === 0) {
            groupContainer.parentElement.removeChild(groupContainer);
            savedTabGroups.splice(groupIndex, 1);
        }

        // Save the updated savedTabGroups
        setSavedTabGroupsToStorage();
    }

    // Function to remove an entire tab group
    function removeTabGroup(groupId) {
        // Find the group index
        const groupIndex = savedTabGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        // Get HTML element
        const groupContainer = document.querySelector(`.tabGroup[data-group-id="${groupId}"]`);

        // Remove the group
        groupContainer.parentElement.removeChild(groupContainer);
        savedTabGroups.splice(groupIndex, 1);

        // Display a message if there are no tabs
        displayResultMessage();

        // Save the updated savedTabGroups
        setSavedTabGroupsToStorage();
    }

    // Function to remove a tab from a group
    function removeTabFromGroup(groupId, tabId) {
        // Find the group index
        const groupIndex = savedTabGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        // Find the tab index
        const tabIndex = savedTabGroups[groupIndex].tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;

        // Get HTML element
        const tabList = document.querySelector(`.tabGroup[data-group-id="${groupId}"] .tabList`);

        // Remove tab
        tabList.removeChild(tabList.children[tabIndex]);
        savedTabGroups[groupIndex].tabs.splice(tabIndex, 1);

        // Remove the group if no tabs are left
        if (savedTabGroups[groupIndex].tabs.length === 0) {
            removeTabGroup(groupId);
            return;
        }

        // Save the updated savedTabGroups
        setSavedTabGroupsToStorage();
    }

    // Function to restore tabs from a single group
    function restoreTabGroup(groupId) {
        // Find the group by ID
        const group = savedTabGroups.find(g => g.id === groupId);
        if (!group) return;

        // Restore tabs
        group.tabs.forEach(tab => {
            chrome.tabs.create({ url: tab.url });
        });
    }

    // Display a message if there are no tabs visible in the page
    function displayResultMessage() {
        // Get HTML elements
        const resultMessage = document.querySelector('#resultMessage');
        const groupContainer = document.querySelectorAll('.tabGroup');

        // Check if any group is visible
        let anyGroupsVisible = Object.values(groupContainer).some(group => group.style.display === 'block');

        // Display message
        if(savedTabGroups.length === 0) {
            resultMessage.style.display = 'block';
            resultMessage.textContent = 'No tabs saved. Try adding some.';
        }
        else if(!anyGroupsVisible) {
            resultMessage.style.display = 'block';
            resultMessage.textContent = 'No tabs match your search.';
        }
        else {
            resultMessage.style.display = 'none';
            resultMessage.textContent = '';
        }
    }
});