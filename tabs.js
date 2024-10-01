// Function to generate a unique ID
function generateUUID() {
    return crypto.randomUUID();
}

// Event listener for the DOM loaded
document.addEventListener('DOMContentLoaded', async () => {
    const homePageLink = document.getElementById('homePageLink');
    const searchBar = document.getElementById('searchBar');
    const themeSelector = document.getElementById('themeSelector');
    const settingsPageButton = document.getElementById('settingsPageButton');
    const mainPage = document.getElementById('mainPage');
    const settingsPage = document.getElementById('settingsPage');
    let bookShelfData = [];
    let bookShelfDataUpdated = false;
    let loadingBookShelfData = false;
    let pagesToMove = [];
    let bookIdOfMovingPages = '';

    // Get saved theme
    chrome.storage.local.get('themeSelected', (data) => {
        if (!data.themeSelected) data.themeSelected = '';

        document.body.className = data.themeSelected;

        themeSelector.value = data.themeSelected;  // Change select based on saved theme
    });

    // Get bookshelf saved data and display it
    await LoadBookShelfDataFromStorage();
    displayBookShelf();

    // Create a timer that check if there are bookshelf data to save
    let intervalId = setInterval(() => {
        if (bookShelfDataUpdated && !loadingBookShelfData) {
            chrome.storage.local.set({ 'bookShelfData': bookShelfData }, () => {
                // Check for errors
                if (chrome.runtime.lastError) {
                    console.error('Error setting storage:', chrome.runtime.lastError);

                    // TODO: Handle the error accordingly
                }
            });

            bookShelfDataUpdated = false;
        }
    }, 2000);

    // Event listener for messages from background.js
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.action === 'bookShelfUpdated') {
            // Get new bookshelf data and repaint the DOM
            await LoadBookShelfDataFromStorage();
            displayBookShelf();
        }
    });

    // Event listener for the homepage link
    homePageLink.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior

        // Show the search bar
        searchBar.style.display = 'block';

        // Show main page and hide settings page
        mainPage.style.display = 'block';
        settingsPage.style.display = 'none';
    });

    // Event listener for the search bar
    searchBar.addEventListener('input', () => {
        // TODO: disable or enable (by settings) to move pages when filtering
        //    if(!settings.canMoveWhileFiltering) {
        //        pagesToMove = [];
        //        bookIdOfMovingPages = '';
        //    }

        // Repaint the DOM
        displayBookShelf();
    });

    // Event listener for the theme selector button
    themeSelector.addEventListener('change', function() {
        document.body.className = this.value;

        chrome.storage.local.set({ 'themeSelected': this.value });  // Save theme
    });

    // Event listener for the settings page button
    settingsPageButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior

        // Hide the search bar
        searchBar.style.display = 'none';

        // Hide main page and show settings page
        mainPage.style.display = 'none';
        settingsPage.style.display = 'block';
    });

    // Function to get bookshelf saved data from storage
    async function LoadBookShelfDataFromStorage() {
        loadingBookShelfData = true;
        const data = await chrome.storage.local.get('bookShelfData');
        bookShelfData = data.bookShelfData || [];
        loadingBookShelfData = false;
    }

    // Function to set bookshelf data to storage
    async function saveBookShelfDataToStorage() {
        bookShelfDataUpdated = true;  // bookshelf data has changed
    }

    // Get book element from ID
    function getBookElementById(bookId) {
        return document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
    }

    // Function to display bookshelf data on the main page
    function displayBookShelf() {
        const fragment = document.createDocumentFragment();  // Create fragment to minimizes the number of reflows and repaints
        const currentSearchQuery = searchBar.value.trim().toLowerCase();  // Get current filtering query
        const areThereAnyPagesToMove = (pagesToMove.length !== 0) && (bookShelfData.findIndex(book => book.id === bookIdOfMovingPages) !== -1);

        // Function to create the book checkbox
        function createBookCheckbox(bookId) {
            const bookCheckbox = document.createElement('input');
            bookCheckbox.type = 'checkbox';
            bookCheckbox.className = 'bookCheckbox';
            bookCheckbox.title = 'Select/Deselect All Pages in this Book';

            // Toggle all checkboxes in a book
            bookCheckbox.addEventListener('change', () => {
                const pageCheckboxes = getBookElementById(bookId).getAllPageCheckbox();

                pageCheckboxes.forEach((checkbox) => {
                    checkbox.checked = bookCheckbox.checked;
                });
            });

            return bookCheckbox;
        }

        // Function to create the book title
        function createBookTitle(bookTitle) {
            const bookTitleElem = document.createElement('h2');
            bookTitleElem.textContent = bookTitle;
            bookTitleElem.className = 'bookTitle';
            bookTitleElem.contentEditable = false;

            return bookTitleElem;
        }

        // Function to create the edit book title button
        function createEditBookTitleButton(bookId) {
            const editBookTitleButton = document.createElement('button');
            editBookTitleButton.textContent = 'Edit title';
            editBookTitleButton.title = 'Edit book title';
            editBookTitleButton.className = 'editBookTitleButton';
            editBookTitleButton.dataset.mode = 'edit';

            // Toggle between edit and save modes for the book title
            editBookTitleButton.addEventListener('click', () => {
                // Find the book index
                const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
                if (bookIndex === -1) return;

                // Get HTML element
                const bookTitle = getBookElementById(bookId).getBookTitle();

                if (editBookTitleButton.dataset.mode === 'edit') {
                    // Switch to edit mode
                    bookTitle.contentEditable = true;
                    bookTitle.focus();

                    // Move cursor to the end of the text using Range and Selection APIs
                    if ((typeof window.getSelection != "undefined") && (typeof document.createRange != "undefined")) {
                        const range = document.createRange();
                        range.selectNodeContents(bookTitle);
                        range.collapse(false); // Collapse the range to the end

                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }

                    // Change button to 'Save'
                    editBookTitleButton.textContent = 'Save title';
                    editBookTitleButton.title = 'Save book title';
                    editBookTitleButton.dataset.mode = 'save';

                    // Handle Enter key to save
                    bookTitle.onkeypress = function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault(); // Prevent newline
                            editBookTitleButton.click(); // Save on Enter key
                        }
                    };
                } else {
                    // Switch to view mode (save changes)
                    const newTitle = bookTitle.textContent.trim();

                    if (newTitle === '') {
                        alert('Book title cannot be empty.');
                        bookTitle.focus();
                        return;
                    }

                    // Update the book title
                    bookShelfData[bookIndex].title = newTitle;

                    // Save the updated page books to storage
                    saveBookShelfDataToStorage();

                    // Disable contentEditable
                    bookTitle.contentEditable = false;

                    // Reset the edit button
                    editBookTitleButton.textContent = 'Edit title';
                    editBookTitleButton.title = 'Edit book title';
                    editBookTitleButton.dataset.mode = 'edit';

                    // Remove keypress handler
                    bookTitle.onkeypress = null;
                }
            });

            return editBookTitleButton;
        }

        // Function to create the restore book button
        function createRestoreBookButton(bookId) {
            const restoreBookButton = document.createElement('button');
            restoreBookButton.textContent = 'Restore';
            restoreBookButton.title = 'Restore this book';
            restoreBookButton.className = 'restoreBookButton';

            // Restore book pages
            restoreBookButton.addEventListener('click', () => {
                // Find the book by ID
                const book = bookShelfData.find(book => book.id === bookId);
                if (!book) return;

                // Restore pages
                book.pages.forEach(page => {
                    chrome.tabs.create({ url: page.url });
                });
            });

            return restoreBookButton;
        }

        // Function to create the remove book button
        function createRemoveBookButton(bookId) {
            const removeBookButton = document.createElement('button');
            removeBookButton.textContent = 'Remove';
            removeBookButton.title = 'Remove this book';
            removeBookButton.className = 'removeBookButton';

            removeBookButton.addEventListener('click', () => {
                removeBook(bookId);
            });

            return removeBookButton;
        }

        // Function to create a book header
        function createBookHeader(book) {
            const bookHeader = document.createElement('div');
            bookHeader.className = 'bookHeader';

            // Create children elements
            const bookCheckbox = createBookCheckbox(book.id);
            const bookTitle = createBookTitle(book.title);
            const editBookTitleButton = createEditBookTitleButton(book.id);
            const restoreBookButton = createRestoreBookButton(book.id);
            const removeBookButton = createRemoveBookButton(book.id);

            // Append elements to the header container in the desired order
            bookHeader.appendChild(bookCheckbox);
            bookHeader.appendChild(bookTitle);
            bookHeader.appendChild(editBookTitleButton);
            bookHeader.appendChild(restoreBookButton);
            bookHeader.appendChild(removeBookButton);

            // Create functions to retrieve nested elements
            bookHeader.getBookCheckbox = function() {return bookCheckbox;}
            bookHeader.getBookTitle = function() {return bookTitle;}

            // Add event listener
            bookHeader.addEventListener('click', (event) => {
                // Toggle book collapse/expand state
                if ((event.target === bookHeader) || ((event.target === bookTitle) && (editBookTitleButton.dataset.mode === 'edit'))) {
                    const bookId = book.id;

                    // Find the book index
                    const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
                    if (bookIndex === -1) return;

                    // Get HTML elements
                    const bookContainer = getBookElementById(bookId);
                    const pagesList = bookContainer.getPagesList();
                    const bookFooter = bookContainer.getBookFooter();

                    // Toggle the display style
                    if (bookShelfData[bookIndex].collapsed) {
                        pagesList.style.display = 'grid';
                        bookFooter.style.display = 'flex';
                    } else {
                        pagesList.style.display = 'none';
                        bookFooter.style.display = 'none';
                    }
                    bookShelfData[bookIndex].collapsed ^= true;  // toggle value

                    // Save the updated bookShelfData
                    saveBookShelfDataToStorage();
                }
            });

            return bookHeader;
        }

        // Function to create the page checkbox
        function createPageCheckbox(bookId) {
            const pageCheckbox = document.createElement('input');
            pageCheckbox.type = 'checkbox';
            pageCheckbox.className = 'pageCheckbox';

            // Update the book checkbox state based on individual checkboxes
            pageCheckbox.addEventListener('change', () => {
                const bookContainer = getBookElementById(bookId);
                const bookCheckbox = bookContainer.getBookCheckbox();
                const pageCheckboxes = bookContainer.getAllPageCheckbox();

                const allChecked = Array.from(pageCheckboxes).every(checkbox => checkbox.checked);
                const anyChecked = Array.from(pageCheckboxes).some(checkbox => checkbox.checked);

                bookCheckbox.checked = allChecked;
                bookCheckbox.indeterminate = !allChecked && anyChecked;
            });

            return pageCheckbox;
        }

        // Function to create the page link
        function createPageLink(page) {
            const pageLink = document.createElement('a');
            pageLink.className = 'pageLink';
            pageLink.href = page.url;
            pageLink.textContent = page.title;
            pageLink.target = '_blank';

            return pageLink;
        }

        // Function to create the remove page button
        function createRemovePageButton(bookId, pageId) {
            const removePageButton = document.createElement('button');
            removePageButton.textContent = 'X';
            removePageButton.title = 'Remove this page';
            removePageButton.className = 'removePageButton';

            removePageButton.addEventListener('click', () => {
                // Find the book index
                const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
                if (bookIndex === -1) return;

                // Find the page index
                const pageIndex = bookShelfData[bookIndex].pages.findIndex(page => page.id === pageId);
                if (pageIndex === -1) return;

                // Get HTML element
                const pagesList = getBookElementById(bookId).getPagesList();

                // Assert data compatibility
                if (!(pagesList.getAllPagesListItem().length === bookShelfData[bookIndex].pages.length)) {
                    console.assert(false, `Assert error when removing ${pageId} page in ${bookId} book`);
                    return;
                }

                // Remove page
                pagesList.removeChild(pagesList.children[pageIndex]);
                bookShelfData[bookIndex].pages.splice(pageIndex, 1);

                // Remove the book if no pages are left
                if (bookShelfData[bookIndex].pages.length === 0) {
                    removeBook(bookId);
                    return;
                }

                // Update pages count
                updatePageCount(bookId);

                // Save the updated bookShelfData
                saveBookShelfDataToStorage();
            });

            return removePageButton;
        }

        // Function to create a container for the page info and controls
        function createPageContainer(page, bookId, pageId) {
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pageContainer';
            pageContainer.dataset.pageId = pageId;

            // Create children elements
            const pageCheckbox = createPageCheckbox(bookId);
            const pageLink = createPageLink(page);
            const removePageButton = createRemovePageButton(bookId, pageId);

            // Append elements to the container in the desired order
            pageContainer.appendChild(pageCheckbox);
            pageContainer.appendChild(pageLink);
            pageContainer.appendChild(removePageButton);

            // Create functions to retrieve nested elements
            pageContainer.getPageCheckbox = function() {return pageCheckbox;}

            return pageContainer;
        }

        // Function to create the "Move here" button
        function createMoveHereButton(bookId, pageId) {
            const moveHereButton = document.createElement('button');
            moveHereButton.textContent = 'Move here';
            moveHereButton.className = 'moveHereButton';
            moveHereButton.style.display = areThereAnyPagesToMove ? 'block' : 'none';

            // Move buffered pages inside a book
            moveHereButton.addEventListener('click', () => {
                if ((pagesToMove.length === 0) || (bookShelfData.findIndex(book => book.id === bookIdOfMovingPages) === -1)) return;

                // Find the book index
                let bookIndex = bookShelfData.findIndex(book => book.id === bookId);
                if (bookIndex === -1) return;

                // Find the page index
                let pageIndex = bookShelfData[bookIndex].pages.findIndex(page => page.id === pageId);
                if (pageIndex < 0) pageIndex = bookShelfData[bookIndex].pages.length;

                // Check if the pages we are moving have the same ID as those in the book
                let bookIds = new Set();
                let pageToAdd = JSON.parse(JSON.stringify(pagesToMove));  // Make a deep copy (NOTE: can be slow)
                do {
                    // Get book pages IDs
                    bookIds = new Set(bookShelfData[bookIndex].pages.map(page => page.id));

                    // Check for duplicated IDs
                    pageToAdd.forEach(page => {
                        if (bookIds.has(page.id)) {
                            page.id = generateUUID();  // generate new ID
                        }
                    });
                } while(pageToAdd.some(page => bookIds.has(page.id)));

                // Add pages
                bookShelfData[bookIndex].pages.splice(pageIndex, 0, ...pageToAdd);

                // Remove pages from previous book
                bookIndex = bookShelfData.findIndex(book => book.id === bookIdOfMovingPages);
                bookIds = new Set(pagesToMove.map(page => page.id));
                bookShelfData[bookIndex].pages = bookShelfData[bookIndex].pages.filter(page => !bookIds.has(page.id));

                // Remove the book if no pages are left
                if (bookShelfData[bookIndex].pages.length === 0) {
                    removeBook(bookIdOfMovingPages);
                }
                else {
                    // Update pages count
                    updatePageCount(bookIdOfMovingPages);
                }

                // Update pages count
                updatePageCount(bookId);

                // Clear the array and the book ID
                pagesToMove = [];
                bookIdOfMovingPages = '';

                // Save the updated bookShelfData
                saveBookShelfDataToStorage();

                // Repaint the DOM
                displayBookShelf();
            });

            return moveHereButton;
        }

        // Function to create a page list item
        function createPagesListItem(page, bookId, pageId) {
            const pagesListItem = document.createElement('li');
            pagesListItem.className = 'pagesListItem';
            pagesListItem.style.display = page.title.toLowerCase().includes(currentSearchQuery) ? 'grid' : 'none';

            // Create children elements
            const moveHereButton = createMoveHereButton(bookId, pageId);
            const pageContainer = createPageContainer(page, bookId, pageId);

            // Append elements to the item in the desired order
            pagesListItem.appendChild(moveHereButton);
            pagesListItem.appendChild(pageContainer);

            // Create functions to retrieve nested elements
            pagesListItem.getPageCheckbox = function() {return pageContainer.getPageCheckbox();}

            return pagesListItem;
        }

        // Function to create a pages list
        function createPagesList(book) {
            const pagesList = document.createElement('ul');
            pagesList.className = 'pagesList';
            pagesList.style.display = book.collapsed ? 'none' : 'grid';

            // Append elements to the pages list in the desired order
            book.pages.forEach((page) => {
                pagesList.appendChild(createPagesListItem(page, book.id, page.id));
            });

            // Create functions to retrieve nested elements
            pagesList.getAllPagesListItem = function() {return [...pagesList.children];}
            pagesList.getAllPageCheckbox = function() {
               const allPageCheckbox = [];
               pagesList.getAllPagesListItem().forEach(item => {
                   allPageCheckbox.push(item.getPageCheckbox());
               });

               return allPageCheckbox;
            };

            return pagesList;
        }

        // Function to create a move selected pages button
        function createMoveSelectedPagesButton(bookId) {
            const moveSelectedPagesButton = document.createElement('button');
            moveSelectedPagesButton.textContent = 'Move Selected Pages';
            moveSelectedPagesButton.className = 'moveSelectedPagesButton';
            moveSelectedPagesButton.disabled = areThereAnyPagesToMove && (bookIdOfMovingPages != bookId);
            moveSelectedPagesButton.style.textDecoration = moveSelectedPagesButton.disabled ? 'line-through' : 'none';

            // Add selected pages to a buffer
            moveSelectedPagesButton.addEventListener('click', () => {
                // Enable to move pages
                if (pagesToMove.length === 0) {
                    // Find the book by ID
                    const book = bookShelfData.find(book => book.id === bookId);
                    if (!book) return;

                    // Get HTML element
                    const pageCheckboxes = getBookElementById(bookId).getAllPageCheckbox();

                    // Assert data compatibility
                    if (!(pageCheckboxes.length === book.pages.length)) {
                        console.assert(false, `Assert error when moving selected pages in ${bookId} book`);
                        return;
                    }

                    // Collect the pages to move
                    pagesToMove = [];
                    pageCheckboxes.forEach((checkbox, checkboxIndex) => {
                        if (checkbox.checked) {
                            pagesToMove.push(book.pages[checkboxIndex]);
                        }
                    });

                    if (pagesToMove.length === 0) {
                        alert('Please select at least one page to move.');
                        return;
                    }

                    // Saves the book ID of the book where the pages to be moved were taken
                    bookIdOfMovingPages = bookId;

                    // Disable all the others moving buttons
                    var buttons = document.getElementsByClassName('moveSelectedPagesButton');
                    for (var i = 0; i < buttons.length; i++) {
                        if (buttons[i] !== moveSelectedPagesButton) {
                            buttons[i].disabled = true;
                            buttons[i].style.textDecoration = 'line-through';
                        }
                    }

                    // Remove bottom border from all the pages
                    var items = document.getElementsByClassName('pagesListItem');
                    for (var i = 0; i < items.length; i++) {
                        items[i].style.borderBottomWidth = '0px';
                    }

                    // Show all "Move here" buttons
                    var buttons = document.getElementsByClassName('moveHereButton');
                    for (var i = 0; i < buttons.length; i++) {
                        buttons[i].style.display = 'block';
                    }
                }
                // Disable to move pages
                else {
                    // Clear the array and the book ID
                    pagesToMove = [];
                    bookIdOfMovingPages = '';

                    // Enable all the others buttons
                    var buttons = document.getElementsByClassName('moveSelectedPagesButton');
                    for (var i = 0; i < buttons.length; i++) {
                        if (buttons[i] !== moveSelectedPagesButton) {
                            buttons[i].disabled = false;
                            buttons[i].style.textDecoration = 'none';
                        }
                    }

                    // Add bottom border in all the pages
                    var items = document.getElementsByClassName('pagesListItem');
                    for (var i = 0; i < items.length; i++) {
                        items[i].style.borderBottomWidth = '1px';
                    }

                    // Hide all "Move here" buttons
                    var buttons = document.getElementsByClassName('moveHereButton');
                    for (var i = 0; i < buttons.length; i++) {
                        buttons[i].style.display = 'none';
                    }
                }
            });

            return moveSelectedPagesButton;
        }

        // Function to create a restore selected pages button
        function createRestoreSelectedPagesButton(bookId) {
            const restoreSelectedPagesButton = document.createElement('button');
            restoreSelectedPagesButton.textContent = 'Restore Selected Pages';
            restoreSelectedPagesButton.className = 'restoreSelectedPagesButton';

            // Restore selected pages from a book
            restoreSelectedPagesButton.addEventListener('click', () => {
                // Find the book by ID
                const book = bookShelfData.find(book => book.id === bookId);
                if (!book) return;

                // Get HTML elements
                const pageCheckboxes = getBookElementById(bookId).getAllPageCheckbox();

                // Assert data compatibility
                if (!(pageCheckboxes.length === book.pages.length)) {
                    console.assert(false, `Assert error when restoring selected pages in ${bookId} book`);
                    return;
                }

                // Collect the pages to restore
                const pagesToRestore = [];
                pageCheckboxes.forEach((checkbox, checkboxIndex) => {
                    if (checkbox.checked) {
                        pagesToRestore.push(book.pages[checkboxIndex]);
                    }
                });

                if (pagesToRestore.length === 0) {
                    alert('Please select at least one page to restore.');
                    return;
                }

                // Confirm restoration
                if (!confirm(`Are you sure you want to restore ${pagesToRestore.length} selected page(s)?`)) {
                    return;
                }

                // Restore the selected pages by creating new pages in the browser
                pagesToRestore.forEach(page => {
                    chrome.tabs.create({ url: page.url });
                });
            });

            return restoreSelectedPagesButton;
        }

        // Function to create a remove selected pages button
        function createRemoveSelectedPagesButton(bookId) {
            const removeSelectedPagesButton = document.createElement('button');
            removeSelectedPagesButton.textContent = 'Remove Selected Pages';
            removeSelectedPagesButton.className = 'removeSelectedPagesButton';

            // Remove selected pages from a book
            removeSelectedPagesButton.addEventListener('click', () => {
                // Find the book index
                const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
                if (bookIndex === -1) return;

                // Get HTML elements
                const bookContainer = getBookElementById(bookId);
                const pagesList = bookContainer.getPagesList();
                const pageCheckboxes = pagesList.getAllPageCheckbox();

                // Assert data compatibility
                if (!(pageCheckboxes.length === bookShelfData[bookIndex].pages.length)) {
                    console.assert(false, `Assert error when removing selected pages in ${bookId} book`);
                    return;
                }

                // Collect the indices of pages to remove
                const indicesToRemove = [];
                pageCheckboxes.forEach((checkbox, checkboxIndex) => {
                    if (checkbox.checked) {
                        indicesToRemove.push(checkboxIndex);
                    }
                });

                if (indicesToRemove.length === 0) {
                    alert('Please select at least one page to remove.');
                    return;
                }

                // Confirm to remove the pages
                if (!confirm('Are you sure you want to remove the selected pages?')) {
                    return;
                }

                // Remove pages starting from the highest index to avoid index shifting
                indicesToRemove.sort((a, b) => b - a).forEach((pageIndex) => {
                    pagesList.removeChild(pagesList.children[pageIndex]);
                    bookShelfData[bookIndex].pages.splice(pageIndex, 1);
                });

                // Remove the book if no pages are left
                if (bookShelfData[bookIndex].pages.length === 0) {
                    removeBook(bookId);
                    return;
                }

                // Update pages count
                updatePageCount(bookId);

                // Save the updated bookShelfData
                saveBookShelfDataToStorage();
            });

            return removeSelectedPagesButton;
        }

        // Function to create a pages count
        function createPagesCount(bookPagesLength) {
            const pagesCount = document.createElement('h2');
            pagesCount.textContent = `${bookPagesLength} Page${bookPagesLength !== 1 ? 's' : ''}`;
            pagesCount.className = 'pagesCount';

            return pagesCount;
        }

        // Function to create a book footer
        function createBookFooter(book) {
            // Function to create a book footer
            const bookFooter = document.createElement('div');
            bookFooter.className = 'bookFooter';
            bookFooter.style.display = book.collapsed ? 'none' : 'flex';

            // Create children elements
            const moveSelectedPagesButton = createMoveSelectedPagesButton(book.id);
            const restoreSelectedPagesButton = createRestoreSelectedPagesButton(book.id);
            const removeSelectedPagesButton = createRemoveSelectedPagesButton(book.id);
            const pagesCount = createPagesCount(book.pages.length);

            // Append elements to the footer in the desired order
            bookFooter.appendChild(moveSelectedPagesButton);
            bookFooter.appendChild(restoreSelectedPagesButton);
            bookFooter.appendChild(removeSelectedPagesButton);
            bookFooter.appendChild(pagesCount);

            // Create functions to retrieve nested elements
            bookFooter.getPagesCount = function() {return pagesCount;}

            return bookFooter;
        }

        // Function to create a container for the book info and controls
        function createBookContainer(book) {
            const bookContainer = document.createElement('div');
            bookContainer.className = 'bookContainer';
            bookContainer.dataset.bookId = book.id;

            // Create children elements
            const bookHeader = createBookHeader(book);
            const pagesList = createPagesList(book);
            const moveHereButton = createMoveHereButton(book.id, '');
            const bookFooter = createBookFooter(book);

            // Append elements to the container in the desired order
            bookContainer.appendChild(bookHeader);
            bookContainer.appendChild(pagesList);
            bookContainer.appendChild(moveHereButton);
            bookContainer.appendChild(bookFooter);

            // Create functions to retrieve nested elements
            bookContainer.getBookCheckbox = function() {return bookHeader.getBookCheckbox();}
            bookContainer.getBookTitle = function() {return bookHeader.getBookTitle();}
            bookContainer.getPagesList = function() {return pagesList;}
            bookContainer.getAllPageCheckbox = function() {return pagesList.getAllPageCheckbox();}
            bookContainer.getAllPagesListItem = function() {return pagesList.getAllPagesListItem();}
            bookContainer.getBookFooter = function() {return bookFooter;}
            bookContainer.getPagesCount = function() {return bookFooter.getPagesCount();}

            // Show or hide the book based on whether any pages are visible
            bookContainer.style.display = Object.values(bookContainer.getAllPagesListItem()).some(item => item.style.display === 'grid') ? 'grid': 'none';

            return bookContainer;
        }

        // Create the elements based on the data
        bookShelfData.forEach((book) => {
            fragment.appendChild(createBookContainer(book));
        });

        // Clear existing content and append the fragment to display the data
        const bookShelf = document.getElementById('bookShelf');
        bookShelf.innerHTML = '';
        bookShelf.appendChild(fragment);

        // Display a message if no pages match
        displayResultMessage();
    }

    // Function to update pages count
    function updatePageCount(bookId) {
        // Get book
        const book = bookShelfData.find(book => book.id === bookId);
        if (!book) return;

        // Get HTML elements
        const pagesCount = getBookElementById(bookId).getPagesCount();

        // Change text
        pagesCount.textContent = `${book.pages.length} Page${book.pages.length !== 1 ? 's' : ''}`;
    }

    // Function to remove an entire page book
    function removeBook(bookId) {
        // Find the book index
        const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Get HTML element
        const bookContainer = getBookElementById(bookId);
        if (!bookContainer) return;

        // Remove the book
        bookContainer.parentElement.removeChild(bookContainer);
        bookShelfData.splice(bookIndex, 1);

        // Display a message if there are no pages
        displayResultMessage();

        // Save the updated bookShelfData
        saveBookShelfDataToStorage();
    }

    // Display a message if there are no pages visible in the page
    function displayResultMessage() {
        // Get HTML elements
        const resultMessage = document.getElementById('resultMessage');
        const bookContainers = document.getElementsByClassName('bookContainer');

        // Check if any book is visible
        const anyBooksVisible = Object.values(bookContainers).some(book => book.style.display === 'grid');

        // Check if there are books to visualize
        if (bookShelfData.length === 0) {
            resultMessage.style.display = 'block';
            resultMessage.textContent = 'No pages saved. Try adding some.';
        }
        // Check if any book is visible
        else if (!anyBooksVisible) {
            resultMessage.style.display = 'block';
            resultMessage.textContent = 'No pages match your search.';
        }
        else {
            resultMessage.style.display = 'none';
            resultMessage.textContent = '';
        }
    }
});