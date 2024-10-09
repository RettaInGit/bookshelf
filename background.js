// Function to generate a unique ID
function generateUUID() {
  return crypto.randomUUID();
}

// Open extension page when its icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'tabs.html' });
});

// Create context menu items when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Menu items
  chrome.contextMenus.create({
    id: 'savePagesOnLeft',
    title: 'Save pages on the left',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'savePagesOnRight',
    title: 'Save pages on the right',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'saveOnlyThisPage',
    title: 'Save only this page',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'saveAllPages',
    title: 'Save all pages',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'saveAllPagesExceptThis',
    title: 'Save all pages except this',
    contexts: ['action']
  });
});

// Listen for clicks on context menu items
chrome.contextMenus.onClicked.addListener((info, currentTab) => {
  if (info.menuItemId === 'savePagesOnLeft') {
    savePagesOnLeft(currentTab);
  } else if (info.menuItemId === 'savePagesOnRight') {
    savePagesOnRight(currentTab);
  } else if (info.menuItemId === 'saveOnlyThisPage') {
    saveOnlyThisPage(currentTab);
  } else if (info.menuItemId === 'saveAllPages') {
    saveAllPages(currentTab);
  } else if (info.menuItemId === 'saveAllPagesExceptThis') {
    saveAllPagesExceptThis(currentTab);
  }
});

// Function to save pages on the left
function savePagesOnLeft(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    savePages(tabs.filter(tab => (tab.index < currentTab.index) && (!tab.pinned) && tab.url.startsWith('http')));
  });
}

// Function to save pages on the right
function savePagesOnRight(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    savePages(tabs.filter(tab => (tab.index > currentTab.index) && (!tab.pinned) && tab.url.startsWith('http')));
  });
}

// Function to save only the current page
function saveOnlyThisPage(currentTab) {
  if ((!currentTab.pinned) && currentTab.url.startsWith('http')) {
    savePages([currentTab]);
  }
}

// Function to save all pages
function saveAllPages(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    savePages(tabs.filter(tab => (!tab.pinned) && tab.url.startsWith('http')));
  });
}

// Function to save all pages except current
function saveAllPagesExceptThis(currentTab) {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    savePages(tabs.filter(tab => (tab.id !== currentTab.id) && (!tab.pinned) && tab.url.startsWith('http')));
  });
}

// Generic function to save pages
async function savePages(tabs) {
  // Check if there are any pages to save
  if (tabs.length === 0) {
    console.log('No pages to save');
    return;
  }

  // Map the filtered tabs to get their title and URL for the pages
  const newPages = tabs.map(tab => ({
    id: generateUUID(),
    title: tab.title,
    url: tab.url
  }));

  // Retrieve bookshelf saved data to determine the default book title and save it
  let bookShelfData;
  let selectedShelfId;
  const data = await chrome.storage.local.get(['selectedShelfId', 'bookShelfData']);
  if (!data.bookShelfData) {
    bookShelfData = [{ id: generateUUID(), title: 'Shelf 1', books: [] }];
    selectedShelfId = bookShelfData[0].id;
  }
  else {
    bookShelfData = data.bookShelfData;
    selectedShelfId = data.selectedShelfId || bookShelfData[0].id;
  }

  // Find the shelf
  let shelf = bookShelfData.find(shelf => shelf.id === selectedShelfId);
  if (!shelf) {
    if (!confirm("Cannot save data in current shelf. Create new shelf?")) {
      return
    }

    const newShelf = {
      id: generateUUID(),
      title: `Shelf ${bookShelfData.length + 1}`,
      books: []
    }
    selectedShelfId = newShelf.id;
    bookShelfData.push(newShelf);  // Add the new shelf at the end of the array

    shelf = newShelf;
  };

  // Generate default book title as 'Book X'
  let booksTot = shelf.books.length + 1;
  let defaultBookTitle = 'Book ' + booksTot;

  // Ensure the book title is unique (deprecated)
  /*
  while (shelf.books.some(book => book.title === defaultBookTitle)) {
    booksTot++;
    defaultBookTitle = 'Book ' + booksTot;
  }
  */

  // Add the new book at the beginning of the array
  const newBook = {
    id: generateUUID(),
    title: defaultBookTitle,
    pages: newPages,
    collapsed: false
  };
  shelf.books.unshift(newBook);

  // Save the updated bookshelf data to storage
  chrome.storage.local.set({ 'selectedShelfId': selectedShelfId, 'bookShelfData': bookShelfData }, () => {
    console.log(`${newPages.length} page(s) saved under "${defaultBookTitle}"`);

    // Close the saved tabs
    chrome.tabs.remove(tabs.map(tab => tab.id));

    // Send a message to tabs.html to refresh the bookshelf
    chrome.runtime.sendMessage({ action: 'bookShelfUpdated' });
  });
}