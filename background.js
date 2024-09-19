// Open extension page when its icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'tabs.html' });
});

// Create context menu items when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Menu items
  chrome.contextMenus.create({
    id: 'saveTabsOnLeft',
    title: 'Save tabs on the left',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'saveTabsOnRight',
    title: 'Save tabs on the right',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'saveAllTabs',
    title: 'Save all tabs',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'saveAllTabsExceptThis',
    title: 'Save all tabs except this',
    contexts: ['action']
  });
});

// Listen for clicks on context menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveTabsOnLeft') {
    saveTabsOnLeft(tab);
  } else if (info.menuItemId === 'saveTabsOnRight') {
    saveTabsOnRight(tab);
  } else if (info.menuItemId === 'saveAllTabs') {
    saveAllTabs(tab);
  } else if (info.menuItemId === 'saveAllTabsExceptThis') {
    saveAllTabsExceptThis(tab);
  }
});

// Function to save tabs on the left
function saveTabsOnLeft(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    saveTabs(tabs.filter(tab => (tab.index < currentTab.index) && tab.url.startsWith('http')));
  });
}

// Function to save tabs on the right
function saveTabsOnRight(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    saveTabs(tabs.filter(tab => (tab.index > currentTab.index) && tab.url.startsWith('http')));
  });
}

// Function to save all tabs
function saveAllTabs(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    saveTabs(tabs.filter(tab => tab.url.startsWith('http')));
  });
}

// Function to save all tabs except current
function saveAllTabsExceptThis(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    saveTabs(tabs.filter(tab => (tab.id !== currentTab.id) && tab.url.startsWith('http')));
  });
}

// Generic function to save tabs
function saveTabs(tabs) {
  if (tabs.length === 0) {
    console.log('No tabs to save');
    return;
  }

  const tabsData = tabs.map(tab => ({
    title: tab.title,
    url: tab.url
  }));

  chrome.storage.local.get('savedTabGroups', (data) => {
    let savedTabGroups = data.savedTabGroups || [];

    // Generate default category name as 'Book X'
    let groupNumber = savedTabGroups.length + 1;
    let defaultCategoryName = 'Book ' + groupNumber;

    // Ensure the category name is unique
    while (savedTabGroups.some(group => group.category === defaultCategoryName)) {
      groupNumber++;
      defaultCategoryName = 'Book ' + groupNumber;
    }
    let category = defaultCategoryName;

    // Add the new group to the start of the array with collapsed set to false
    savedTabGroups.unshift({
      category: category,
      tabs: tabsData,
      collapsed: false
    });

    // Save the updated tab groups to storage
    chrome.storage.local.set({ 'savedTabGroups': savedTabGroups }, () => {
      // Notify the user
      console.log(`${tabs.length} tab(s) saved under "${category}"`);

      // Close the saved tabs
      const tabIdsToClose = tabs.map(tab => tab.id);
      chrome.tabs.remove(tabIdsToClose);
    });
  });
}