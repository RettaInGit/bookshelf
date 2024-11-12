// Function to generate a unique ID
function generateUUID() {
    return crypto.randomUUID();
}

// Event listener for the DOM loaded
document.addEventListener('DOMContentLoaded', async () => {
    const selectedShelfTitle = document.getElementById('selectedShelfTitle');
    const shelfList = document.getElementById('shelfList');
    const addNewShelfButton = document.getElementById('addNewShelfButton');
    const searchBar = document.getElementById('searchBar');
    const themeToggleButton = document.getElementById('themeToggleButton');
    const settingsPageButton = document.getElementById('settingsPageButton');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsPage = document.getElementById('settingsPage');
    const bookList = document.getElementById('bookList');
    let selectedShelfId = "";
    let bookshelfData = [];
    let bookshelfDataUpdated = false;
    let loadingBookshelfData = false;
    let pagesToMove = [];  // TODO
    let bookIdOfMovingPages = '';  // TODO
    let isSettingsPageOpen = false;

    // Get bookshelf saved data and display it
    await LoadBookshelfDataFromStorage();

    // Change the shelf title with the selected one
    const selectedShelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
    if (selectedShelf) {
        changeSelectedShelfTitle(selectedShelf.title);
    }

    // Paint the DOM
    displayBookshelf();

    // Get saved theme
    chrome.storage.local.get('themeSelected', (data) => {
        const currentTheme = data.themeSelected || 'light';

        if (currentTheme === 'dark') {
            document.body.classList.add('darkTheme');
            document.getElementById('sunIcon').style.visibility = "hidden";
            document.getElementById('moonIcon').style.visibility = "visible";
        } else {
            document.body.classList.remove('darkTheme');
            document.getElementById('sunIcon').style.visibility = "visible";
            document.getElementById('moonIcon').style.visibility = "hidden";
        }
    });

    // Create a timer that check if there are bookshelf data to save
    let intervalId = setInterval(() => {
        if (bookshelfDataUpdated && !loadingBookshelfData) {
            // Save bookshelf data
            chrome.storage.local.set({ 'selectedShelfId': selectedShelfId, 'bookshelfData': bookshelfData }, () => {
                // Check for errors
                if (chrome.runtime.lastError) {
                    console.error('Error setting storage:', chrome.runtime.lastError);

                    // TODO: Handle the error accordingly
                }
            });

            bookshelfDataUpdated = false;
        }
    }, 2000);

    // Event listener for messages from background.js
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.action === 'bookshelfUpdated') {
            // Get new bookshelf data and repaint the DOM
            await LoadBookshelfDataFromStorage();
            displayBookshelf();
        }
    });

    // Event listener for the extension name to show/hide the shelf dropdown
    selectedShelfTitle.addEventListener('click', () => {
        const arrowIcon = document.getElementById('arrowIcon');
        const bookShelves = document.getElementById('bookShelves');

        bookShelves.classList.toggle('close');
        arrowIcon.style.transform = bookShelves.classList.contains('close') ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    // Event listener for the add new shelf button
    addNewShelfButton.addEventListener('click', () => {
        // Create new shelf ID
        let newShelfId;
        do {
            newShelfId = generateUUID();
        } while(bookshelfData.some(shelf => shelf.id === newShelfId));

        // Create new shelf
        const newShelf = {
            id: newShelfId,
            title: `Shelf ${bookshelfData.length + 1}`,
            books: []
        }
        bookshelfData.push(newShelf);  // Add the new shelf at the end of the array

        // Save the new shelf to storage
        saveBookshelfDataToStorage();

        // Insert shelf in the list
        shelfList.appendShelfListItem(newShelf);
    });

    // Event listener for the search bar
    searchBar.addEventListener('input', () => {
        let timeoutId;

        // Clear the previous timer
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Set a new timer
        timeoutId = setTimeout(() => {
            // TODO: disable or enable (by settings) to move pages when filtering
            //    if (!settings.canMoveWhileFiltering) {
            //        pagesToMove = [];
            //        bookIdOfMovingPages = '';
            //    }

            // Repaint the DOM
            displayBookshelf();
        }, 250);
    });

    // Event listener for the theme toggle button
    themeToggleButton.addEventListener('click', () => {
        chrome.storage.local.get('themeSelected', (data) => {
            let currentTheme = data.themeSelected || 'light';

            if (currentTheme === 'light') {  // Switch to dark
                document.body.classList.add('darkTheme');
                chrome.storage.local.set({ 'themeSelected': 'dark' });
                document.getElementById('sunIcon').style.visibility = "hidden";
                document.getElementById('moonIcon').style.visibility = "visible";
            } else {  // Switch to light
                document.body.classList.remove('darkTheme');
                chrome.storage.local.set({ 'themeSelected': 'light' });
                document.getElementById('sunIcon').style.visibility = "visible";
                document.getElementById('moonIcon').style.visibility = "hidden";
            }
        });
    });

    // Event listener for the settings page button
    settingsPageButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior

        isSettingsPageOpen = !isSettingsPageOpen;

        if (isSettingsPageOpen) {
            // Open the settings page
            settingsPage.classList.add('open');
            settingsOverlay.classList.add('open');
        } else {
            // Close the settings page
            settingsPage.classList.remove('open');
            settingsOverlay.classList.remove('open');
        }
    });

    // Event listener for the overlay to close the settings page when clicked
    settingsOverlay.addEventListener('click', () => {
        isSettingsPageOpen = false;
        settingsPage.classList.remove('open');
        settingsOverlay.classList.remove('open');
    });

    // Close the settings page when the Escape key is pressed
    document.addEventListener('keydown', (event) => {
        if ((event.key === 'Escape') && isSettingsPageOpen) {
            isSettingsPageOpen = false;
            settingsPage.classList.remove('open');
            settingsOverlay.classList.remove('open');
        }
    });

    // Function to get bookshelf saved data from storage
    async function LoadBookshelfDataFromStorage() {
        loadingBookshelfData = true;

        const data = await chrome.storage.local.get(['selectedShelfId', 'bookshelfData']);
        if (!data.bookshelfData) {
            bookshelfData = [{ id: generateUUID(), title: 'Shelf 1', books: [] }];
            selectedShelfId = bookshelfData[0].id;
        }
        else {
            bookshelfData = data.bookshelfData;
            selectedShelfId = data.selectedShelfId || bookshelfData[0].id;

            if (!bookshelfData.find(shelf => shelf.id === selectedShelfId)) {
                selectedShelfId = bookshelfData[0].id;

                saveBookshelfDataToStorage();
            }
        }

        loadingBookshelfData = false;
    }

    // Function to set bookshelf data to storage
    async function saveBookshelfDataToStorage() {
        bookshelfDataUpdated = true;  // bookshelf data has changed
    }

    // Get book element from ID
    function getBookElementById(bookId) {
        return document.querySelector(`.bookListItem[data-book-id="${bookId}"]`);
    }

    // Get shelf element from ID
    function getShelfElementById(shelfId) {
        return document.querySelector(`.shelfListItem[data-shelf-id="${shelfId}"]`);
    }

    // Function to change selected shelf title
    function changeSelectedShelfTitle(newTitle) {
        // Clone the arrow icon
        const arrowIconClone = document.getElementById('arrowIcon').cloneNode(true);

        // Change selected shelf title
        selectedShelfTitle.innerHTML = '';
        selectedShelfTitle.appendChild(arrowIconClone);
        selectedShelfTitle.innerHTML += newTitle;
    };

    // Function to display bookshelf data on the main page
    function displayBookshelf() {
        const fragment = document.createDocumentFragment();  // Create fragment to minimizes the number of reflows and repaints
        const currentSearchQuery = searchBar.value.trim().toLowerCase();  // Get current filtering query

        // Function to create the edit shelf title button
        function createEditShelfTitleButton(shelfId) {
            const editShelfTitleButton = document.createElement('button');
            editShelfTitleButton.title = 'Edit shelf title';
            editShelfTitleButton.className = 'editShelfTitleButton';
            editShelfTitleButton.dataset.mode = 'edit';

            // Create SVG element
            const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.setAttribute('viewBox', '0 0 48 48');
            svgElem.setAttribute('width', '20px');
            svgElem.setAttribute('height', '20px');
            const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElem.setAttribute('d', 'M38.657 18.536l2.44-2.44c2.534-2.534 2.534-6.658 0-9.193-1.227-1.226-2.858-1.9-4.597-1.9s-3.371.675-4.597 1.901l-2.439 2.439L38.657 18.536zM27.343 11.464L9.274 29.533c-.385.385-.678.86-.848 1.375L5.076 41.029c-.179.538-.038 1.131.363 1.532C5.726 42.847 6.108 43 6.5 43c.158 0 .317-.025.472-.076l10.118-3.351c.517-.17.993-.463 1.378-.849l18.068-18.068L27.343 11.464z');

            // Append elements in the correct order
            svgElem.appendChild(pathElem);
            editShelfTitleButton.appendChild(svgElem);

            // Toggle between edit and save modes for the shelf title
            editShelfTitleButton.addEventListener('click', () => {
                // Find the shelf index
                const shelf = bookshelfData.find(shelf => shelf.id === shelfId);
                if (!shelf) return;

                // Get HTML element
                const shelfTitle = getShelfElementById(shelfId).getShelfTitle();

                if (editShelfTitleButton.dataset.mode === 'edit') {
                    // Switch to edit mode
                    shelfTitle.contentEditable = true;
                    shelfTitle.focus();

                    // Move cursor to the end of the text using Range and Selection APIs
                    if ((typeof window.getSelection != "undefined") && (typeof document.createRange != "undefined")) {
                        const range = document.createRange();
                        range.selectNodeContents(shelfTitle);
                        range.collapse(false); // Collapse the range to the end

                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }

                    // Change button to 'Save'
                    editShelfTitleButton.title = 'Save shelf title';
                    editShelfTitleButton.dataset.mode = 'save';

                    // Handle Enter key to save
                    shelfTitle.onkeypress = function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault(); // Prevent newline
                            editShelfTitleButton.click(); // Save on Enter key
                        }
                    };
                } else {
                    // Switch to view mode (save changes)
                    const newTitle = shelfTitle.textContent.trim();

                    if (newTitle === '') {
                        alert('Book title cannot be empty.');
                        shelfTitle.focus();
                        return;
                    }

                    // Update the shelf title
                    shelf.title = newTitle;

                    // Update the selected shelf title
                    if (shelf.id === selectedShelfId) {
                        changeSelectedShelfTitle(shelf.title);
                    }

                    // Save the updated shelf to storage
                    saveBookshelfDataToStorage();

                    // Disable contentEditable
                    shelfTitle.contentEditable = false;

                    // Reset the edit button
                    editShelfTitleButton.title = 'Edit book title';
                    editShelfTitleButton.dataset.mode = 'edit';

                    // Remove keypress handler
                    shelfTitle.onkeypress = null;
                }
            });

            return editShelfTitleButton;
        }

        // Function to create the shelf title
        function createShelfTitle(shelfId, shelfTitle) {
            const shelfTitleElem = document.createElement('h2');
            shelfTitleElem.textContent = shelfTitle;
            shelfTitleElem.className = 'shelfTitle';
            shelfTitleElem.contentEditable = false;

            // Switch to this shelf
            shelfTitleElem.addEventListener('click', () => {
                if ((shelfTitleElem.contentEditable === 'false') && (shelfId !== selectedShelfId)) {
                    // Find the shelf
                    const shelf = bookshelfData.find(shelf => shelf.id === shelfId);
                    if (!shelf) return;

                    // Change the selected shelf title
                    changeSelectedShelfTitle(shelf.title);

                    // Change and save the selected shelf
                    selectedShelfId = shelfId;
                    saveBookshelfDataToStorage();

                    // Repaint the DOM
                    displayBookshelf();
                }
            });

            return shelfTitleElem;
        }

        // Function to create the move shelf handler
        function createMoveShelfHandler() {
            const moveShelfHandler = document.createElement('button');
            moveShelfHandler.title = 'Move this shelf';
            moveShelfHandler.className ='moveShelfHandler';

            // Create SVG element
            const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.setAttribute('viewBox', '0 -0.125 0.8 0.8');
            svgElem.setAttribute('width', '20px');
            svgElem.setAttribute('height', '20px');
            const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElem.setAttribute('d', 'M.75.45a.05.05 0 0 1 0 .1h-.7a.05.05 0 0 1 0-.1zm0-.225a.05.05 0 0 1 0 .1h-.7a.05.05 0 0 1 0-.1zM.75 0a.05.05 0 0 1 0 .1h-.7a.05.05 0 0 1 0-.1z');

            // Append elements in the correct order
            svgElem.appendChild(pathElem);
            moveShelfHandler.appendChild(svgElem);

            return moveShelfHandler;
        }

        // Function to create the remove shelf button
        function createRemoveShelfButton(shelfId) {
            const removeShelfButton = document.createElement('button');
            removeShelfButton.title = 'Remove this shelf';
            removeShelfButton.className = 'removeShelfButton';

            // Create SVG element
            const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.setAttribute('viewBox', '0 0 30 30');
            svgElem.setAttribute('width', '20px');
            svgElem.setAttribute('height', '20px');
            const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElem.setAttribute('d', 'M 7 4 C 6.744125 4 6.4879687 4.0974687 6.2929688 4.2929688 L 4.2929688 6.2929688 C 3.9019687 6.6839688 3.9019687 7.3170313 4.2929688 7.7070312 L 11.585938 15 L 4.2929688 22.292969 C 3.9019687 22.683969 3.9019687 23.317031 4.2929688 23.707031 L 6.2929688 25.707031 C 6.6839688 26.098031 7.3170313 26.098031 7.7070312 25.707031 L 15 18.414062 L 22.292969 25.707031 C 22.682969 26.098031 23.317031 26.098031 23.707031 25.707031 L 25.707031 23.707031 C 26.098031 23.316031 26.098031 22.682969 25.707031 22.292969 L 18.414062 15 L 25.707031 7.7070312 C 26.098031 7.3170312 26.098031 6.6829688 25.707031 6.2929688 L 23.707031 4.2929688 C 23.316031 3.9019687 22.682969 3.9019687 22.292969 4.2929688 L 15 11.585938 L 7.7070312 4.2929688 C 7.5115312 4.0974687 7.255875 4 7 4 z');

            // Append elements in the correct order
            svgElem.appendChild(pathElem);
            removeShelfButton.appendChild(svgElem);

            // Remove shelf
            removeShelfButton.addEventListener('click', () => {
                if (bookshelfData.length > 1) {
                    if (shelfId === selectedShelfId) {
                        alert('Please choose another shelf before removing this.');
                    }
                    else if (confirm('Are you sure you want to remove this shelf?')) {
                        // Remove shelf from data and save it
                        bookshelfData = bookshelfData.filter(shelf => shelf.id !== shelfId);
                        saveBookshelfDataToStorage();

                        // Remove shelf element
                        const shelfElem = getShelfElementById(shelfId);
                        if (shelfElem) {
                            shelfList.removeChild(shelfElem);
                        }
                    }
                }
                else if (confirm('Are you sure you want to reset this shelf?')) {
                    // Remove all books from this shelf
                    bookshelfData[0].books = [];

                    // Change shelf name
                    bookshelfData[0].title = "Shelf 1";

                    // Update the selected shelf title
                    changeSelectedShelfTitle(bookshelfData[0].title);

                    // Save updated shelf
                    saveBookshelfDataToStorage();

                    // Clear existing content
                    bookList.innerHTML = '';

                    // Display the message that there are no page saved
                    displayResultMessage();
                }
            });

            return removeShelfButton;
        }

        // Function to create the shelf list item
        function createShelfListItem(shelf) {
            const shelfListItem = document.createElement('li');
            shelfListItem.className = 'shelfListItem';
            shelfListItem.dataset.shelfId = shelf.id;

            // Create children elements
            const editShelfTitleButton = createEditShelfTitleButton(shelf.id);
            const shelfTitle = createShelfTitle(shelf.id, shelf.title);
            const moveShelfHandler = createMoveShelfHandler();
            const removeShelfButton = createRemoveShelfButton(shelf.id);

            // Append elements to the shelf list item in the desired order
            shelfListItem.appendChild(editShelfTitleButton);
            shelfListItem.appendChild(shelfTitle);
            shelfListItem.appendChild(moveShelfHandler);
            shelfListItem.appendChild(removeShelfButton);

            // Create functions to retrieve nested elements
            shelfListItem.getShelfTitle = function() {return shelfTitle;}

            return shelfListItem;
        }

        // Function to create the edit book title button
        function createEditBookTitleButton(bookId) {
            const editBookTitleButton = document.createElement('button');
            editBookTitleButton.title = 'Edit book title';
            editBookTitleButton.className = 'editBookTitleButton';
            editBookTitleButton.dataset.mode = 'edit';

            // Create SVG element
            const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.setAttribute('viewBox', '0 0 48 48');
            svgElem.setAttribute('width', '23px');
            svgElem.setAttribute('height', '23px');
            const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElem.setAttribute('d', 'M38.657 18.536l2.44-2.44c2.534-2.534 2.534-6.658 0-9.193-1.227-1.226-2.858-1.9-4.597-1.9s-3.371.675-4.597 1.901l-2.439 2.439L38.657 18.536zM27.343 11.464L9.274 29.533c-.385.385-.678.86-.848 1.375L5.076 41.029c-.179.538-.038 1.131.363 1.532C5.726 42.847 6.108 43 6.5 43c.158 0 .317-.025.472-.076l10.118-3.351c.517-.17.993-.463 1.378-.849l18.068-18.068L27.343 11.464z');

            // Append elements in the correct order
            svgElem.appendChild(pathElem);
            editBookTitleButton.appendChild(svgElem);

            // Toggle between edit and save modes for the book title
            editBookTitleButton.addEventListener('click', () => {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
                if (!shelf) return;

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);
                if (!book) return;

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
                    book.title = newTitle;

                    // Save the updated book to storage
                    saveBookshelfDataToStorage();

                    // Disable contentEditable
                    bookTitle.contentEditable = false;

                    // Reset the edit button
                    editBookTitleButton.title = 'Edit book title';
                    editBookTitleButton.dataset.mode = 'edit';

                    // Remove keypress handler
                    bookTitle.onkeypress = null;
                }
            });

            return editBookTitleButton;
        }

        // Function to create the book title
        function createBookTitle(bookTitle) {
            const bookTitleElem = document.createElement('h2');
            bookTitleElem.textContent = bookTitle;
            bookTitleElem.className = 'bookTitle';
            bookTitleElem.contentEditable = false;

            return bookTitleElem;
        }

        // Function to create a pages count
        function createPagesCount(bookPagesLength) {
            const pagesCount = document.createElement('h2');
            pagesCount.textContent = `${bookPagesLength} Page${bookPagesLength !== 1 ? 's' : ''}`;
            pagesCount.className = 'pagesCount';

            return pagesCount;
        }

        // Function to create the top part of a book header
        function createBookHeaderTop(book) {
            const bookHeaderTop = document.createElement('div');
            bookHeaderTop.className = 'bookHeaderTop';
            bookHeaderTop.style.marginBottom = book.collapsed ? '0' : '5px';

            // Create children elements
            const editBookTitleButton = createEditBookTitleButton(book.id);
            const bookTitle = createBookTitle(book.title);
            const pagesCount = createPagesCount(book.pages.length);

            // Append elements to the top header in the desired order
            bookHeaderTop.appendChild(editBookTitleButton);
            bookHeaderTop.appendChild(bookTitle);
            bookHeaderTop.appendChild(pagesCount);

            // Create functions to retrieve nested elements
            bookHeaderTop.getEditBookTitleButton = function() {return editBookTitleButton;}
            bookHeaderTop.getBookTitle = function() {return bookTitle;}
            bookHeaderTop.getPagesCount = function() {return pagesCount;}

            return bookHeaderTop;
        }

        // Function to create the book checkbox
        function createBookCheckbox(bookId) {
            const bookCheckbox = document.createElement('input');
            bookCheckbox.type = 'checkbox';
            bookCheckbox.className = 'bookCheckbox';
            bookCheckbox.name = 'bookCheckbox';
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

        // Function to create a restore selected pages button
        function createRestoreSelectedPagesButton(bookId) {
            const restoreSelectedPagesButton = document.createElement('button');
            restoreSelectedPagesButton.textContent = 'Restore Selected Pages';
            restoreSelectedPagesButton.className = 'restoreSelectedPagesButton';

            // Restore selected pages from a book
            restoreSelectedPagesButton.addEventListener('click', () => {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
                if (!shelf) return;

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);
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
                if (!confirm(`Are you sure you want to restore the selected page${pagesToRestore.length !== 1 ? 's' : ''}?`)) {
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
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
                if (!shelf) return;

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);
                if (!book) return;

                // Get HTML elements
                const bookListItem = getBookElementById(bookId);
                const pageList = bookListItem.getPageList();
                const pageCheckboxes = pageList.getAllPageCheckbox();

                // Assert data compatibility
                if (!(pageCheckboxes.length === book.pages.length)) {
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
                if (!confirm(`Are you sure you want to remove the selected page${indicesToRemove.length !== 1 ? 's' : ''}?`)) {
                    return;
                }

                // Remove pages starting from the highest index to avoid index shifting
                indicesToRemove.sort((a, b) => b - a).forEach((pageIndex) => {
                    pageList.removeChild(pageList.children[pageIndex]);
                    book.pages.splice(pageIndex, 1);
                });

                // Remove the book if no pages are left
                if (book.pages.length === 0) {
                    removeBook(bookId);
                    return;
                }

                // Update pages count
                updatePageCount(bookId);

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();
            });

            return removeSelectedPagesButton;
        }

        // Function to create the bottom part of a book header
        function createBookHeaderBottom(bookCollapsed, bookId) {
            const bookHeaderBottom = document.createElement('div');
            bookHeaderBottom.className = 'bookHeaderBottom';
            bookHeaderBottom.style.display = bookCollapsed ? 'none' : 'flex';

            // Create children elements
            const bookCheckbox = createBookCheckbox(bookId);
            const restoreSelectedPagesButton = createRestoreSelectedPagesButton(bookId);
            const removeSelectedPagesButton = createRemoveSelectedPagesButton(bookId);

            // Append elements to the bottom header in the desired order
            bookHeaderBottom.appendChild(bookCheckbox);
            bookHeaderBottom.appendChild(restoreSelectedPagesButton);
            bookHeaderBottom.appendChild(removeSelectedPagesButton);

            // Create functions to retrieve nested elements
            bookHeaderBottom.getBookCheckbox = function() {return bookCheckbox;}

            return bookHeaderBottom;
        }

        // Function to create a book header
        function createBookHeader(book) {
            const bookId = book.id;

            const bookHeader = document.createElement('div');
            bookHeader.className = 'bookHeader';

            // Create children elements
            const bookHeaderTop = createBookHeaderTop(book);
            const bookHeaderBottom = createBookHeaderBottom(book.collapsed, bookId);

            // Append elements to the header in the desired order
            bookHeader.appendChild(bookHeaderTop);
            bookHeader.appendChild(bookHeaderBottom);

            // Create functions to retrieve nested elements
            bookHeader.getBookTitle = function() {return bookHeaderTop.getBookTitle();}
            bookHeader.getPagesCount = function() {return bookHeaderTop.getPagesCount();}
            bookHeader.getBookCheckbox = function() {return bookHeaderBottom.getBookCheckbox();}

            // Add event listener
            bookHeader.addEventListener('click', (event) => {
                // Toggle book collapse/expand state
                if ((event.target === bookHeader) || (event.target === bookHeaderTop) || (event.target === bookHeaderBottom) || (event.target === bookHeaderTop.getPagesCount())
                    || ((event.target === bookHeaderTop.getBookTitle()) && (bookHeaderTop.getEditBookTitleButton().dataset.mode === 'edit'))) {
                    // Find the shelf
                    const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
                    if (!shelf) return;

                    // Find the book
                    const book = shelf.books.find(book => book.id === bookId);
                    if (!book) return;

                    // Get HTML elements
                    const pageList = getBookElementById(bookId).getPageList();

                    // Toggle the display style
                    if (book.collapsed) {
                        pageList.style.display = 'grid';
                        bookHeaderBottom.style.display = 'flex';
                        bookHeaderTop.style.marginBottom = '5px';
                    } else {
                        pageList.style.display = 'none';
                        bookHeaderBottom.style.display = 'none';
                        bookHeaderTop.style.marginBottom = '0';
                    }
                    book.collapsed ^= true;  // toggle value

                    // Save the updated bookshelfData
                    saveBookshelfDataToStorage();
                }
            });

            return bookHeader;
        }

        // Function to create the page checkbox
        function createPageCheckbox(bookId) {
            const pageCheckbox = document.createElement('input');
            pageCheckbox.type = 'checkbox';
            pageCheckbox.className = 'pageCheckbox';
            pageCheckbox.name = 'pageCheckbox';

            // Update the book checkbox state based on individual checkboxes
            pageCheckbox.addEventListener('change', () => {
                const bookListItem = getBookElementById(bookId);
                const bookCheckbox = bookListItem.getBookCheckbox();
                const pageCheckboxes = bookListItem.getAllPageCheckbox();

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
            pageLink.title = page.url;

            return pageLink;
        }

        // Function to create the move shelf handler
        function createMovePageHandler() {
            const movePageHandler = document.createElement('button');
            movePageHandler.title = 'Move this shelf, click to multi-select';
            movePageHandler.className ='movePageHandler';

            // Create SVG element
            const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.setAttribute('viewBox', '0 -0.125 0.8 0.8');
            svgElem.setAttribute('width', '20px');
            svgElem.setAttribute('height', '20px');
            const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElem.setAttribute('d', 'M.75.45a.05.05 0 0 1 0 .1h-.7a.05.05 0 0 1 0-.1zm0-.225a.05.05 0 0 1 0 .1h-.7a.05.05 0 0 1 0-.1zM.75 0a.05.05 0 0 1 0 .1h-.7a.05.05 0 0 1 0-.1z');

            // Append elements in the correct order
            svgElem.appendChild(pathElem);
            movePageHandler.appendChild(svgElem);

            return movePageHandler;
        }

        // Function to create a page list item
        function createPageListItem(page, bookId) {
            const pageListItem = document.createElement('li');
            pageListItem.className = 'pageListItem';
            pageListItem.dataset.pageId = page.id;
            pageListItem.style.display = page.title.toLowerCase().includes(currentSearchQuery) ? 'flex' : 'none';

            // Create children elements
            const pageCheckbox = createPageCheckbox(bookId);
            const pageLink = createPageLink(page);
            const movePageHandler = createMovePageHandler();

            // Append elements to the item in the desired order
            pageListItem.appendChild(pageCheckbox);
            pageListItem.appendChild(pageLink);
            pageListItem.appendChild(movePageHandler);

            // Create functions to retrieve nested elements
            pageListItem.getPageId = function() {return pageListItem.dataset.pageId;}
            pageListItem.getPageCheckbox = function() {return pageCheckbox;}

            return pageListItem;
        }

        // Function to create a pages list
        function createPageList(book) {
            const pageList = document.createElement('ul');
            pageList.className = 'pageList';
            pageList.style.display = book.collapsed ? 'none' : 'grid';

            // Append elements to the pages list in the desired order
            book.pages.forEach((page) => {
                pageList.appendChild(createPageListItem(page, book.id));
            });

            // Create functions to retrieve nested elements
            pageList.getAllPageListItem = function() {return [...pageList.children];}
            pageList.getAllPageCheckbox = function() {
                const allPageCheckbox = [];
                pageList.getAllPageListItem().forEach(item => {
                    allPageCheckbox.push(item.getPageCheckbox());
                });

               return allPageCheckbox;
            };

            // Set sorting parameters for the pages
            var startBookId = book.id;
            Sortable.create(pageList, {
                group: {
                    name: 'movePages',
                    //pull: 'clone',
                },
                multiDrag: true,
                selectedClass: 'pageSelected',
                handle: '.movePageHandler',
                animation: 150,

                onEnd: function(evt) {
                    // Find the shelf
                    const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
                    if (!shelf) return;

                    // Find the book
                    const startBook = shelf.books.find(book => book.id === startBookId);
                    if (!startBook) return;

                    // Get the ID of the pages that were dragged
                    let idOfPagesDragged = [];
                    if (evt.items.length > 0) {
                        evt.items.forEach(item => {
                            idOfPagesDragged.push(item.getPageId());
                        });
                    }
                    else {
                        idOfPagesDragged = [evt.item.dataset.pageId];
                    }

                    // Find dragged pages in the start book
                    let pagesDragged = startBook.pages.filter(page => idOfPagesDragged.includes(page.id));
                    if (pagesDragged.length === 0) return;

                    if (evt.to === bookList) {
                        // Create new book ID
                        let newBookId;
                        do {
                            newBookId = generateUUID();
                        } while(shelf.books.some(book => book.id === newBookId));

                        // Create default book title as 'Book X'
                        let defaultBookTitle = `Book ${shelf.books.length + 1}`;

                        // Get new book index
                        let newBookIndex = evt.newIndex - (evt.items.length === 0 ? 0 : evt.items.findIndex(item => item === evt.item));

                        // Create the new book
                        const newBook = {
                            id: newBookId,
                            title: defaultBookTitle,
                            pages: structuredClone(pagesDragged),
                            collapsed: false
                        };

                        // Add book
                        shelf.books.splice(newBookIndex, 0, newBook);

                        // Remove wrongly displaced pages
                        if (evt.items.length > 0) {
                            evt.items.forEach(item => bookList.removeChild(item));
                        }
                        else {
                            bookList.removeChild(evt.item);
                        }

                        // Draw new book
                        if (newBookIndex === shelf.books.length - 1) {
                            bookList.appendChild(createBookListItem(newBook));
                        }
                        else {
                            bookList.insertBefore(createBookListItem(newBook), bookList.children[newBookIndex]);
                        }

                        // Remove pages from start book
                        startBook.pages = startBook.pages.filter(page => !idOfPagesDragged.includes(page.id));
                        if (startBook.pages.length === 0) {
                            removeBook(startBookId);  // Remove the book because no pages are left
                        }
                        else {
                            updatePageCount(startBookId);  // Update pages count
                        }
                    }
                    else if (evt.from === evt.to) {
                        // Get new page index
                        let newPageIndex = evt.newIndex - (evt.items.length === 0 ? 0 : evt.items.findIndex(item => item === evt.item));

                        // Remove pages from old indexes
                        startBook.pages = startBook.pages.filter(page => !idOfPagesDragged.includes(page.id));

                        // Add pages to new indexes
                        startBook.pages.splice(newPageIndex, 0, ...pagesDragged);
                    }
                    else {
                        // Get ID of the book where the pages are moved
                        let endBookId = Array.from(bookList.children).filter(child => child.getPageList() === evt.to)[0].dataset.bookId;

                        // Get the book where the pages are moved
                        const endBook = shelf.books.find(book => book.id === endBookId);
                        if (!endBook) return;

                        // Check if the pages we are moving have the same ID as those in the book
                        let pagesIds;
                        do {
                            // Get pages IDs
                            pagesIds = endBook.pages.map(page => page.id);

                            // Check for duplicated IDs
                            pagesDragged.forEach(page => {
                                if (pagesIds.includes(page.id)) {
                                    page.id = generateUUID();  // generate new ID
                                }
                            });
                        } while(pagesDragged.some(page => pagesIds.includes(page.id)));

                        // Get new page index
                        let newPageIndex = evt.newIndex - (evt.items.length === 0 ? 0 : evt.items.findIndex(item => item === evt.item));

                        // Add pages
                        endBook.pages.splice(newPageIndex, 0, ...pagesDragged);

                        // Remove pages from start book
                        startBook.pages = startBook.pages.filter(page => !idOfPagesDragged.includes(page.id));
                        if (startBook.pages.length === 0) {
                            removeBook(startBookId);  // Remove the book because no pages are left
                        }
                        else {
                            updatePageCount(startBookId);  // Update pages count
                        }

                        // Redraw only the end book
                        evt.to.innerHTML = '';
                        endBook.pages.forEach((page) => {
                            evt.to.appendChild(createPageListItem(page, endBookId));
                        });
                        updatePageCount(endBookId);  // Update pages count
                    }

                    // Save the updated bookshelfData
                    saveBookshelfDataToStorage();
                },
            });

            return pageList;
        }

        // Function to create a container for the book info and controls
        function createBookListItem(book) {
            const bookListItem = document.createElement('div');
            bookListItem.className = 'bookListItem';
            bookListItem.dataset.bookId = book.id;

            // Create children elements
            const bookHeader = createBookHeader(book);
            const pageList = createPageList(book);

            // Append elements to the container in the desired order
            bookListItem.appendChild(bookHeader);
            bookListItem.appendChild(pageList);

            // Create functions to retrieve nested elements
            bookListItem.getBookTitle = function() {return bookHeader.getBookTitle();}
            bookListItem.getPagesCount = function() {return bookHeader.getPagesCount();}
            bookListItem.getBookCheckbox = function() {return bookHeader.getBookCheckbox();}
            bookListItem.getPageList = function() {return pageList;}
            bookListItem.getAllPageCheckbox = function() {return pageList.getAllPageCheckbox();}
            bookListItem.getAllPageListItem = function() {return pageList.getAllPageListItem();}

            // Show or hide the book based on whether any pages are visible
            bookListItem.style.display = Object.values(bookListItem.getAllPageListItem()).some(item => item.style.display === 'flex') ? 'grid': 'none';

            return bookListItem;
        }

        // Create a function to append new shelves to the shelf list
        shelfList.appendShelfListItem = function(shelf) {shelfList.appendChild(createShelfListItem(shelf));}

        // Create the elements based on the data
        shelfList.innerHTML = '';
        bookshelfData.forEach((shelf) => {
            shelfList.appendChild(createShelfListItem(shelf));

            if (shelf.id === selectedShelfId) {
                shelf.books.forEach((book) => {
                    fragment.appendChild(createBookListItem(book));
                });
            }
        });

        // Set sorting parameters for the shelves
        Sortable.create(shelfList, {
            handle: '.moveShelfHandler',
            animation: 150,

            onEnd: function(data) {
                if( (data.oldIndex >= bookshelfData.length) || (data.newIndex >= bookshelfData.length) ) return;

                // Move shelf in the new position
                bookshelfData.splice(data.newIndex, 0, bookshelfData.splice(data.oldIndex, 1)[0]);

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();
            },
        });

        // Clear existing content and append the fragment to display the data
        bookList.innerHTML = '';
        bookList.appendChild(fragment);

        // Set sorting parameters for the books
        Sortable.create(bookList, {
            group: {
                name: 'movePages',
                pull: false,  // disable pulling from the list
            },
            sort: false,  // disable sorting
            swapThreshold: .9,
        });

        // Display a message if no pages match
        displayResultMessage();
    }

    // Function to update pages count
    function updatePageCount(bookId) {
        // Find the shelf
        const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
        if (!shelf) return;

        // Find the book
        const book = shelf.books.find(book => book.id === bookId);
        if (!book) return;

        // Get HTML elements
        const pagesCount = getBookElementById(bookId).getPagesCount();

        // Change text
        pagesCount.textContent = `${book.pages.length} Page${book.pages.length !== 1 ? 's' : ''}`;
    }

    // Function to remove an entire page book
    function removeBook(bookId) {
        // Find the shelf
        const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
        if (!shelf) return;

        // Find the book index
        const bookIndex = shelf.books.findIndex(book => book.id === bookId);
        if (bookIndex < 0) return;

        // Get HTML element
        const bookListItem = getBookElementById(bookId);
        if (!bookListItem) return;

        // Remove the book
        bookListItem.parentElement.removeChild(bookListItem);
        shelf.books.splice(bookIndex, 1);

        // Display a message if there are no pages
        displayResultMessage();

        // Save the updated bookshelfData
        saveBookshelfDataToStorage();
    }

    // Display a message if there are no pages visible in the page
    function displayResultMessage() {
        // Find the shelf
        const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

        // Get HTML elements
        const resultMessage = document.getElementById('resultMessage');
        const bookListItems = document.getElementsByClassName('bookListItem');

        // Check if any book is visible
        const anyBooksVisible = Object.values(bookListItems).some(book => book.style.display === 'grid');

        // Check if the data is correct
        if (!shelf) {
            resultMessage.style.display = 'block';
            resultMessage.textContent = 'Error when loading the shelf. Try to reload the extension.';
        }
        // Check if there are books to visualize
        else if (shelf.books.length === 0) {
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