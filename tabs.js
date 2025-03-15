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
    const importExportButton = document.getElementById('importExportButton');
    const settingsPageButton = document.getElementById('settingsPageButton');
    const dropAreaCheckbox = document.getElementById('dropAreaCheckbox');
    const dropAreaRemoveSelectedPagesButton = document.getElementById('dropAreaRemoveSelectedPagesButton');
    const dropAreaList = document.getElementById('dropAreaList');
    const dropAreaButton = document.getElementById('dropAreaButton');
    const viewOverlay = document.getElementById('viewOverlay');
    const importExportPopup = document.getElementById('importExportPopup');
    const importButton = document.getElementById('importButton');
    const exportButton = document.getElementById('exportButton');
    const importExportTextArea = document.getElementById('importExportTextArea');
    const settingsPage = document.getElementById('settingsPage');
    const bookList = document.getElementById('bookList');
    let selectedShelfId = "";
    let bookshelfData = [];
    let pagesToMove = [];
    let bookshelfDataUpdated = false;
    let loadingBookshelfData = false;

    // Get bookshelf saved data and display it
    await LoadBookshelfDataFromStorage();

    // Change the shelf title with the selected one
    changeSelectedShelfTitle(bookshelfData.find(shelf => shelf.id === selectedShelfId).title);

    // Paint the DOM
    displayBookshelf();

    // Function to get bookshelf saved data from storage
    async function LoadBookshelfDataFromStorage() {
        loadingBookshelfData = true;

        const data = await chrome.storage.local.get(['selectedShelfId', 'bookshelfData']);
        if (!data.bookshelfData) {
            bookshelfData = [{
                id: generateUUID(),
                title: 'Shelf 1',
                books: []
            }];
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
    function getBookListItem(bookId) {
        return bookList.querySelector(`.bookListItem[data-book-id="${bookId}"]`);
    }

    // Get shelf element from ID
    function getShelfListItem(shelfId) {
        return shelfList.querySelector(`.shelfListItem[data-shelf-id="${shelfId}"]`);
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

    // Get saved theme
    chrome.storage.local.get('themeSelected', (data) => {
        const currentTheme = data.themeSelected || 'light';

        if (currentTheme === 'dark') {
            document.body.classList.add('darkTheme');
            document.getElementById('sunIcon').style.visibility = "hidden";
            document.getElementById('moonIcon').style.visibility = "visible";
        }
        else {
            document.body.classList.remove('darkTheme');
            document.getElementById('sunIcon').style.visibility = "visible";
            document.getElementById('moonIcon').style.visibility = "hidden";
        }
    });

    // Create a timer that check if there are bookshelf data to save
    let intervalId = setInterval(() => {
        if (bookshelfDataUpdated && !loadingBookshelfData) {
            // Save bookshelf data
            chrome.storage.local.set({
                'selectedShelfId': selectedShelfId,
                'bookshelfData': bookshelfData
            }, () => {
                // Check for errors
                if (chrome.runtime.lastError) {
                    console.error('Error setting storage:', chrome.runtime.lastError);

                    // TODO: Handle the error accordingly
                }
            });

            bookshelfDataUpdated = false;
        }
    }, 1000);

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
        } while (bookshelfData.some(shelf => shelf.id === newShelfId));

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
            // Repaint the DOM
            displayBookshelf();
        }, 250);
    });

    // Event listener for the theme toggle button
    themeToggleButton.addEventListener('click', () => {
        chrome.storage.local.get('themeSelected', (data) => {
            const currentTheme = data.themeSelected || 'light';

            if (currentTheme === 'light') {  // Switch to dark
                document.body.classList.add('darkTheme');
                chrome.storage.local.set({
                    'themeSelected': 'dark'
                });
                document.getElementById('sunIcon').style.visibility = "hidden";
                document.getElementById('moonIcon').style.visibility = "visible";
            }
            else {  // Switch to light
                document.body.classList.remove('darkTheme');
                chrome.storage.local.set({
                    'themeSelected': 'light'
                });
                document.getElementById('sunIcon').style.visibility = "visible";
                document.getElementById('moonIcon').style.visibility = "hidden";
            }
        });
    });

    // Event listener for the import/export button
    importExportButton.addEventListener('click', () => {
        if (importExportPopup.classList.contains('open')) {
            // Close the import/export popup
            importExportPopup.classList.remove('open');
            viewOverlay.classList.remove('open');
        }
        else {
            // Open the import/export popup
            importExportPopup.classList.add('open');
            viewOverlay.classList.add('open');
        }
    });

    // Event listener for the import/export textarea
    importExportTextArea.addEventListener('input', () => {
        const textSpan = document.createElement('span');
        textSpan.style.visibility = 'hidden';
        textSpan.style.fontFamily = importExportTextArea.style.fontFamily;
        textSpan.style.fontSize = importExportTextArea.style.fontSize;
        textSpan.textContent = importExportTextArea.value;
        document.body.appendChild(textSpan);
        importExportTextArea.style.width = `${textSpan.offsetWidth}px`;
        document.body.removeChild(textSpan);
    });

    // Event listener for the import button
    importButton.addEventListener('click', () => {
        const compatibleOneTab = document.getElementById('compatibleOneTab');
        const importCurrentShelf = document.getElementById('importCurrentShelf');

        let shelf;
        if (importCurrentShelf.checked) {
            // Get the current shelf
            shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);
        }
        else {
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

            // Add the new shelf
            bookshelfData.push(newShelf);

            // Select the new shelf
            shelf = newShelf;
        }

        try {
            if (compatibleOneTab.checked) {
                let newBookIndex = 0;
                let newPages = [];

                const rows = importExportTextArea.value.split('\n');
                rows.forEach((row) => {
                    const splitSimbolIndex = row.indexOf('|');
                    if (splitSimbolIndex > 0) {
                        // Get page url and title
                        const urlAndTitle = [row.slice(0, splitSimbolIndex), row.slice(splitSimbolIndex+1)];
                        const newPage = {};
                        newPage.url = urlAndTitle[0].trim();
                        newPage.title = urlAndTitle[1].trim();

                        // Generate new ID
                        let newPageId;
                        do {
                            newPageId = generateUUID();
                        } while (newPages.some(page => page.id === newPageId));
                        newPage.id = newPageId;

                        // Add page to the list
                        newPages.push(newPage);
                    }
                    else if (newPages.length > 0) {
                        // Create new book ID
                        let newBookId;
                        do {
                            newBookId = generateUUID();
                        } while (shelf.books.some(book => book.id === newBookId));

                        // Create the new book
                        const newBook = {
                            id: newBookId,
                            title: `Book ${shelf.books.length + 1}`,
                            pages: structuredClone(newPages),
                            collapsed: false,
                            locked: false
                        };

                        // Add the new book to the list
                        shelf.books.splice(newBookIndex++, 0, newBook);

                        // Reset the new pages list
                        newPages = [];
                    }
                });
            }
            else {
                let importData = JSON.parse(importExportTextArea.value);

                if (!(importData instanceof Array)) importData = [importData];

                importData.forEach((data) => {
                    if (data.url !== undefined) {  // Importing a page
                        // Add new page ID
                        data.id = generateUUID();

                        // Create new book ID
                        let newBookId;
                        do {
                            newBookId = generateUUID();
                        } while (shelf.books.some(book => book.id === newBookId));

                        // Create new book
                        const newBook = {
                            id: newBookId,
                            title: `Book ${shelf.books.length + 1}`,
                            pages: [data],
                            collapsed: false,
                            locked: false
                        };

                        // Add the new book to the list
                        shelf.books.unshift(newBook);
                    }
                    else if (data.pages !== undefined) {  // Importing a book
                        // Add new book ID (and other infornmations)
                        let newBookId;
                        do {
                            newBookId = generateUUID();
                        } while (shelf.books.some(book => book.id === newBookId));
                        data.id = newBookId;
                        data.collapsed = false;
                        data.locked = false;

                        data.pages.forEach((page) => {
                            // Add new page ID
                            let newPageId;
                            do {
                                newPageId = generateUUID();
                            } while (data.pages.some(page => page.id === newPageId));
                            page.id = newPageId;
                        });

                        // Add the new book to the list
                        shelf.books.unshift(data);
                    }
                    else if (data.books !== undefined) {  // Importing a shelf
                        // Add new ID
                        let newShelfId;
                        do {
                            newShelfId = generateUUID();
                        } while (bookshelfData.some(shelf => shelf.id === newShelfId));
                        data.id = newShelfId;

                        data.books.forEach((book) => {
                            // Add new ID (and other informations)
                            let newBookId;
                            do {
                                newBookId = generateUUID();
                            } while (data.books.some(book => book.id === newBookId));
                            book.id = newBookId;
                            book.collapsed = false;
                            book.locked = false;

                            book.pages.forEach((page) => {
                                // Add new ID
                                let newPageId;
                                do {
                                    newPageId = generateUUID();
                                } while (book.pages.some(page => page.id === newPageId));
                                page.id = newPageId;
                            });
                        });

                        bookshelfData.push(data);
                    }
                });
            }
        }
        catch (error) {
            console.error('Error during import:', error);
        }

        // Remove empty shelf
        if ((shelf.books.length === 0) && (shelf.id !== selectedShelfId)) bookshelfData.splice(bookshelfData.indexOf(shelf), 1);

        // Save the bookshelf data
        saveBookshelfDataToStorage();

        // Repaint the DOM
        displayBookshelf();

        alert("Import complete!");
    });

    // Event listener for the export button
    exportButton.addEventListener('click', () => {
        const compatibleOneTab = document.getElementById('compatibleOneTab');
        const exportCurrentShelf = document.getElementById('exportCurrentShelf');
        const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

        if (compatibleOneTab.checked) {
            importExportTextArea.value = '';

            if (exportCurrentShelf.checked) {
                shelf.books.forEach((book) => {
                    book.pages.forEach((page) => {
                        importExportTextArea.value += `${page.url} | ${page.title}\n`;
                    });
                    importExportTextArea.value += '\n';
                });
            }
            else {
                bookshelfData.forEach((shelf) => {
                    shelf.books.forEach((book) => {
                        book.pages.forEach((page) => {
                            importExportTextArea.value += `${page.url} | ${page.title}\n`;
                        });
                        importExportTextArea.value += '\n';
                    });
                });
            }
        }
        else {
            if (exportCurrentShelf.checked) {
                // Create a clone of the current shelf
                let shelfClone = structuredClone(shelf);

                // Maintain only useful information
                delete shelfClone.id;
                shelfClone.books.forEach((book) => {
                    delete book.id;
                    delete book.collapsed;
                    delete book.locked;

                    book.pages.forEach((page) => {
                        delete page.id;
                    });
                });

                // Export the clone
                importExportTextArea.value = JSON.stringify(shelfClone, null, 2);
            }
            else {
                // Create a clone of the bookshelf
                let bookshelfDataClone = structuredClone(bookshelfData);

                // Maintain only useful information
                bookshelfDataClone.forEach((shelf) => {
                    delete shelf.id;

                    shelf.books.forEach((book) => {
                        delete book.id;
                        delete book.collapsed;
                        delete book.locked;

                        book.pages.forEach((page) => {
                            delete page.id;
                        });
                    });
                });

                // Export the clone
                importExportTextArea.value = JSON.stringify(bookshelfDataClone, null, 2);
            }
        }

        importExportTextArea.dispatchEvent(new Event('input', {}));  // Trigger auto-resize
    });

    // Event listener for the settings page button
    settingsPageButton.addEventListener('click', () => {
        if (settingsPage.classList.contains('open')) {
            // Close the settings page
            settingsPage.classList.remove('open');
            viewOverlay.classList.remove('open');
        }
        else {
            // Open the settings page
            settingsPage.classList.add('open');
            viewOverlay.classList.add('open');
        }
    });

    // Event listener for the drop area checkbox
    dropAreaCheckbox.addEventListener('change', () => {
        dropAreaList.querySelectorAll('.pageCheckbox').forEach((checkbox) => {
            checkbox.checked = dropAreaCheckbox.checked;
        });
    });

    // Event listener for the drop area remove selected page button
    dropAreaRemoveSelectedPagesButton.addEventListener('click', () => {
        // Get all checkboxes
        const dropAreaCheckboxes = dropAreaList.querySelectorAll('.pageCheckbox');

        // Collect the indices of pages to remove
        const indicesToRemove = [];
        dropAreaCheckboxes.forEach((checkbox, checkboxIndex) => {
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
        indicesToRemove.sort((a, b) => b - a).forEach((index) => {
            // Remove 'pageMoved' class
            if (pagesToMove[index].shelfId === selectedShelfId) {
                getBookListItem(pagesToMove[index].bookId).querySelector(`.pageListItem[data-page-id="${pagesToMove[index].id}"]`).classList.remove('pageMoved');
            };

            // Remove element
            dropAreaList.removeChild(dropAreaList.children[index]);
            pagesToMove.splice(index, 1);
        });

        // Uncheck the drop area checkbox
        dropAreaCheckbox.checked = false;
        dropAreaCheckbox.indeterminate = false;
    });

    // Event listener for the floating button
    dropAreaButton.addEventListener('click', () => {
        const mainPage = document.getElementById('mainPage');
        const dropArea = document.getElementById('dropArea');
        const dropAreaSpace = document.getElementById('dropAreaSpace');

        if (dropArea.classList.contains('active')) {
            // Close the drop area
            dropArea.classList.remove('active');
            mainPage.style.width = '100%';
            dropAreaSpace.style.width = '0%';
            setTimeout(() => {
                dropArea.classList.add('hidden');
            }, 300); // Wait for the transition to finish
        }
        else {
            // Open the drop area
            dropArea.classList.remove('hidden');
            setTimeout(() => {
                dropArea.classList.add('active');
                mainPage.style.width = '50%';
                dropAreaSpace.style.width = '50%';
            }, 10); // Small delay to ensure the removal of 'hidden' is processed
        }
    });

    // Event listener for the overlay to close the settings page when clicked
    viewOverlay.addEventListener('click', () => {
        importExportPopup.classList.remove('open');
        settingsPage.classList.remove('open');
        viewOverlay.classList.remove('open');
    });

    // Close the settings page when the Escape key is pressed
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            importExportPopup.classList.remove('open');
            settingsPage.classList.remove('open');
            viewOverlay.classList.remove('open');
        }
    });

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

                // Get HTML element
                const shelfTitle = getShelfListItem(shelfId).querySelector('.shelfTitle');

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
                }
                else {
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
            moveShelfHandler.className = 'moveShelfHandler';

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
                let shelfRemoved = false;

                    if (shelfId === selectedShelfId) {
                    if (confirm('Are you sure you want to reset this shelf?')) {
                        // Get the index of the selected shelf
                        const shelfIndex = bookshelfData.findIndex(shelf => shelf.id === shelfId);

                        // Remove all books from this shelf
                        bookshelfData[shelfIndex].books = [];

                        // Clear existing content
                        bookList.innerHTML = '';

                        // Signal that the shelf has been removed
                        shelfRemoved = true;

                        // Display the message that there are no page saved
                        displayResultMessage();

                        // Save updated shelf
                        saveBookshelfDataToStorage();
                    }
                    }
                    else if (confirm('Are you sure you want to remove this shelf?')) {
                        // Remove shelf from data and save it
                        bookshelfData = bookshelfData.filter(shelf => shelf.id !== shelfId);
                        saveBookshelfDataToStorage();

                        // Remove shelf element
                        shelfList.removeChild(getShelfListItem(shelfId));

                    // Signal that the shelf has been removed
                    shelfRemoved = true;
                }

                // Remove pages from the drop area list (starting from the highest index to avoid index shifting)
                if (shelfRemoved) {
                    let indexesToRemove = [];
                    pagesToMove.forEach((page, pageIndex) => {
                        if (page.shelfId === shelfId) {
                            indexesToRemove.push(pageIndex);
                        }
                    });
                    indexesToRemove.sort((a, b) => b - a).forEach(index => {
                        pagesToMove.splice(index, 1);
                        dropAreaList.removeChild(dropAreaList.children[index]);
                    });
                }
            });

            return removeShelfButton;
        }

        // Function to create the shelf list item
        function createShelfListItem(shelf) {
            const shelfListItem = document.createElement('li');
            shelfListItem.className = 'shelfListItem';
            shelfListItem.dataset.shelfId = shelf.id;

            // Append elements to the shelf list item in the desired order
            shelfListItem.appendChild(createEditShelfTitleButton(shelf.id));
            shelfListItem.appendChild(createShelfTitle(shelf.id, shelf.title));
            shelfListItem.appendChild(createMoveShelfHandler());
            shelfListItem.appendChild(createRemoveShelfButton(shelf.id));

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
            editBookTitleButton.addEventListener('click', (event) => {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);

                // Get HTML element
                const bookTitle = getBookListItem(bookId).querySelector('.bookTitle');

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
                }
                else {
                    // Switch to view mode (save changes)
                    const newTitle = bookTitle.textContent.trim();

                    if (newTitle === '') {
                        alert('Book title cannot be empty.');
                        bookTitle.focus();
                    }
                    else {
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
                }

                // Do not reach other elements
                event.stopPropagation();
            });

            return editBookTitleButton;
        }

        // Function to create the book title
        function createBookTitle(bookTitle) {
            const bookTitleElem = document.createElement('h2');
            bookTitleElem.textContent = bookTitle;
            bookTitleElem.className = 'bookTitle';
            bookTitleElem.contentEditable = false;

            // Do not reach other elements
            bookTitleElem.addEventListener('click', (event) => {
                if (bookTitleElem.contentEditable === 'true') {
                    event.stopPropagation();
                }
            });

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

            // Append elements to the top header in the desired order
            bookHeaderTop.appendChild(createEditBookTitleButton(book.id));
            bookHeaderTop.appendChild(createBookTitle(book.title));
            bookHeaderTop.appendChild(createPagesCount(book.pages.length));

            return bookHeaderTop;
        }

        // Function to create the book checkbox
        function createBookCheckbox(bookId) {
            const bookCheckbox = document.createElement('input');
            bookCheckbox.type = 'checkbox';
            bookCheckbox.className = 'bookCheckbox';
            bookCheckbox.name = 'bookCheckbox';
            bookCheckbox.title = 'Select/Deselect all pages in this book';

            // Toggle all checkboxes in a book
            bookCheckbox.addEventListener('click', (event) => {
                getBookListItem(bookId).querySelectorAll('.pageCheckbox').forEach((checkbox) => {
                    checkbox.checked = bookCheckbox.checked;
                });

                // Do not reach other elements
                event.stopPropagation();
            });

            return bookCheckbox;
        }

        // Function to create a restore selected pages button
        function createRestoreSelectedPagesButton(bookId) {
            const restoreSelectedPagesButton = document.createElement('button');
            restoreSelectedPagesButton.textContent = 'Restore Selected Pages';
            restoreSelectedPagesButton.className = 'restoreSelectedPagesButton';

            // Restore selected pages from a book
            restoreSelectedPagesButton.addEventListener('click', (event) => {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);

                // Get HTML elements
                const bookListItem = getBookListItem(bookId);
                const pageCheckboxes = bookListItem.querySelectorAll('.pageCheckbox');

                // Get the indexes of the pages selected
                const pagesIndexes = [];
                pageCheckboxes.forEach((checkbox, checkboxIndex) => {
                    if (checkbox.checked) {
                        pagesIndexes.push(checkboxIndex);
                    }
                });

                // Collect the pages to restore
                const pagesToRestore = Array.from(pagesIndexes, index => book.pages[index]);

                if (pagesToRestore.length === 0) {
                    alert('Please select at least one page to restore.');
                    event.stopPropagation();  // Do not reach other elements
                    return;
                }

                // Confirm restoration
                if (!confirm(`Are you sure you want to restore the selected page${pagesToRestore.length !== 1 ? 's' : ''}?`)) {
                    event.stopPropagation();  // Do not reach other elements
                    return;
                }

                // Restore the selected pages by creating new pages in the browser
                pagesToRestore.forEach(page => {
                    chrome.tabs.create({
                        url: page.url
                    });
                });

                // Remove the pages from the book
                if (!(book.locked)) {
                    if (pagesToRestore.length === book.pages.length) {
                        // Remove the book
                        removeBook(book.id);
                    }
                    else {
                        // Get the page list element
                        const pageListElem = bookListItem.querySelector(".pageList");

                        // Remove the pages
                        pagesIndexes.sort((a, b) => b - a).forEach((index) => {
                            book.pages.splice(index, 1);
                            pageListElem.removeChild(pageListElem.children[index]);
                        });

                        // Uncheck the drop area checkbox
                        const bookCheckboxElem = bookListItem.querySelector('.bookCheckbox');
                        bookCheckboxElem.checked = false;
                        bookCheckboxElem.indeterminate = false;

                        // Update pages count
                        updatePageCount(book.id);

                        // Save the updated bookshelfData
                        saveBookshelfDataToStorage();
                    }
                }

                // Do not reach other elements
                event.stopPropagation();
            });

            return restoreSelectedPagesButton;
        }

        // Function to create a remove selected pages button
        function createRemoveSelectedPagesButton(bookId) {
            const removeSelectedPagesButton = document.createElement('button');
            removeSelectedPagesButton.textContent = 'Remove Selected Pages';
            removeSelectedPagesButton.className = 'removeSelectedPagesButton';

            // Remove selected pages from a book
            removeSelectedPagesButton.addEventListener('click', (event) => {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);

                // Get HTML elements
                const bookListItem = getBookListItem(bookId);
                const pageList = bookListItem.querySelector('.pageList');
                const pageCheckboxes = bookListItem.querySelectorAll('.pageCheckbox');

                // Collect the indices of pages to remove
                const indicesToRemove = [];
                pageCheckboxes.forEach((checkbox, checkboxIndex) => {
                    if (checkbox.checked) {
                        indicesToRemove.push(checkboxIndex);
                    }
                });

                if (indicesToRemove.length === 0) {
                    alert('Please select at least one page to remove.');
                    event.stopPropagation();  // Do not reach other elements
                    return;
                }

                // Confirm to remove the pages
                if (!confirm(`Are you sure you want to remove the selected page${indicesToRemove.length !== 1 ? 's' : ''}?`)) {
                    event.stopPropagation();  // Do not reach other elements
                    return;
                }

                // Remove pages starting from the highest index to avoid index shifting
                indicesToRemove.sort((a, b) => b - a).forEach((index) => {
                    // Remove the page from the moved ones too
                    const pageIndex = pagesToMove.findIndex(item => item.shelfId === selectedShelfId && item.bookId === bookId && item.id === book.pages[index].id);
                    if (pageIndex !== -1) {
                        dropAreaList.removeChild(dropAreaList.children[pageIndex]);
                        pagesToMove.splice(pageIndex, 1);
                    }

                    // Remove page
                    pageList.removeChild(pageList.children[index]);
                    book.pages.splice(index, 1);
                });

                // Remove the book if no pages are left
                if (book.pages.length === 0) {
                    removeBook(bookId);
                }
                else {
                    // Uncheck the drop area checkbox
                    const bookCheckboxElem = bookListItem.querySelector('.bookCheckbox');
                    bookCheckboxElem.checked = false;
                    bookCheckboxElem.indeterminate = false;

                    // Update pages count
                    updatePageCount(bookId);

                    // Save the updated bookshelfData
                    saveBookshelfDataToStorage();
                }

                // Do not reach other elements
                event.stopPropagation();
            });

            return removeSelectedPagesButton;
        }

        // Function to create a divider between the elements in the book bottom header
        function createBookHeaderBottomDivider() {
            const bookHeaderBottomDivider = document.createElement('div');
            bookHeaderBottomDivider.className = 'bookHeaderBottomDivider';

            return bookHeaderBottomDivider;
        }

        // Function to create the book lock
        function createBookLock(bookId, bookLocked) {
            const bookLock = document.createElement('button');
            bookLock.title = 'Lock the book';
            bookLock.className = 'bookLock';

            // Create SVG element
            const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.setAttribute('width', '22px');
            svgElem.setAttribute('height', '28px');
            const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElem.setAttribute('style', 'paint-order:fill;fill-rule:evenodd');
            if (bookLocked) {
                svgElem.setAttribute('viewBox', '393.836 323.775 22 27.999');
                pathElem.setAttribute('d', 'M411.836 335.774v-4.706c0-3.833-2.953-7.175-6.785-7.29a7 7 0 0 0-7.215 6.996v5h-1a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-10a3 3 0 0 0-3-3zm-3 0h-8v-5c0-3.079 3.334-5.004 6-3.464 1.238.714 2 2.035 2 3.464zm-2 6c.001-1.54-1.665-2.503-2.998-1.734a2 2 0 0 0-.132 3.383l-.631 3.155a1 1 0 0 0 .981 1.196h1.56a1 1 0 0 0 .981-1.196l-.631-3.155c.525-.361.87-.964.87-1.649');
            }
            else {
                svgElem.setAttribute('viewBox', '362.143 323.843 22 27.999');
                pathElem.setAttribute('d', 'M380.143 335.842v-4.706c0-3.833-2.953-7.175-6.785-7.29a7 7 0 0 0-7.215 6.996v5h-1a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-10a3 3 0 0 0-3-3zm-3 0h-8v-5c0-3.079 3.334-5.004 6-3.464 1.238.714 2 2.035 2 3.464zm4 15h-16a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2m-6-9c.001-1.54-1.665-2.503-2.998-1.734a2 2 0 0 0-.132 3.383l-.631 3.155a1 1 0 0 0 .981 1.196h1.56a1 1 0 0 0 .981-1.196l-.631-3.155c.525-.361.87-.964.87-1.649');
            }

            // Append elements in the correct order
            svgElem.appendChild(pathElem);
            bookLock.appendChild(svgElem);

            // Lock or unlock the book
            bookLock.addEventListener('click', (event) => {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);

                // Change the locking value
                book.locked = !(book.locked)

                // Change lock icon
                if (book.locked) {
                    svgElem.setAttribute('viewBox', '393.836 323.775 22 27.999');
                    pathElem.setAttribute('d', 'M411.836 335.774v-4.706c0-3.833-2.953-7.175-6.785-7.29a7 7 0 0 0-7.215 6.996v5h-1a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-10a3 3 0 0 0-3-3zm-3 0h-8v-5c0-3.079 3.334-5.004 6-3.464 1.238.714 2 2.035 2 3.464zm-2 6c.001-1.54-1.665-2.503-2.998-1.734a2 2 0 0 0-.132 3.383l-.631 3.155a1 1 0 0 0 .981 1.196h1.56a1 1 0 0 0 .981-1.196l-.631-3.155c.525-.361.87-.964.87-1.649');
                }
                else {
                    svgElem.setAttribute('viewBox', '362.143 323.843 22 27.999');
                    pathElem.setAttribute('d', 'M380.143 335.842v-4.706c0-3.833-2.953-7.175-6.785-7.29a7 7 0 0 0-7.215 6.996v5h-1a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-10a3 3 0 0 0-3-3zm-3 0h-8v-5c0-3.079 3.334-5.004 6-3.464 1.238.714 2 2.035 2 3.464zm4 15h-16a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2m-6-9c.001-1.54-1.665-2.503-2.998-1.734a2 2 0 0 0-.132 3.383l-.631 3.155a1 1 0 0 0 .981 1.196h1.56a1 1 0 0 0 .981-1.196l-.631-3.155c.525-.361.87-.964.87-1.649');
                }

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();

                // Do not reach other elements
                event.stopPropagation();
            });

            return bookLock;
        }

        // Function to create the bottom part of a book header
        function createBookHeaderBottom(bookId, bookCollapsed, bookLocked) {
            const bookHeaderBottom = document.createElement('div');
            bookHeaderBottom.className = 'bookHeaderBottom';
            bookHeaderBottom.style.display = bookCollapsed ? 'none' : 'flex';

            // Append elements to the bottom header in the desired order
            bookHeaderBottom.appendChild(createBookCheckbox(bookId));
            bookHeaderBottom.appendChild(createRestoreSelectedPagesButton(bookId));
            bookHeaderBottom.appendChild(createRemoveSelectedPagesButton(bookId));
            bookHeaderBottom.appendChild(createBookHeaderBottomDivider());
            bookHeaderBottom.appendChild(createBookLock(bookId, bookLocked));

            return bookHeaderBottom;
        }

        // Function to create a book header
        function createBookHeader(book) {
            const bookHeader = document.createElement('div');
            bookHeader.className = 'bookHeader';
            const bookId = book.id;

            // Append elements to the header in the desired order
            bookHeader.appendChild(createBookHeaderTop(book));
            bookHeader.appendChild(createBookHeaderBottom(bookId, book.collapsed, book.locked));

            // Add event listener
            bookHeader.addEventListener('click', (event) => {
                // Get HTML elements
                const bookListItem = getBookListItem(bookId);
                const bookHeaderTop = bookListItem.querySelector('.bookHeaderTop');
                const bookHeaderBottom = bookListItem.querySelector('.bookHeaderBottom');
                const pageList = bookListItem.querySelector('.pageList');

                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Find the book
                const book = shelf.books.find(book => book.id === bookId);

                // Toggle the display style
                if (book.collapsed) {
                    pageList.style.display = 'grid';
                    bookHeaderBottom.style.display = 'flex';
                    bookHeaderTop.style.marginBottom = '5px';
                }
                else {
                    pageList.style.display = 'none';
                    bookHeaderBottom.style.display = 'none';
                    bookHeaderTop.style.marginBottom = '0';
                }
                book.collapsed ^= true;  // toggle value

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();
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
                const bookListItem = getBookListItem(bookId);
                const bookCheckbox = bookListItem.querySelector('.bookCheckbox');
                const pageCheckboxes = Array.from(bookListItem.querySelectorAll('.pageCheckbox'));

                const allChecked = pageCheckboxes.every(checkbox => checkbox.checked);
                const anyChecked = pageCheckboxes.some(checkbox => checkbox.checked);

                bookCheckbox.checked = allChecked;
                bookCheckbox.indeterminate = !allChecked && anyChecked;
            });

            return pageCheckbox;
        }

        // Function to create the page icon
        function createPageIcon(url) {
            const pageIcon = document.createElement('img');
            pageIcon.style.marginRight = '10px';
            pageIcon.src = "https://s2.googleusercontent.com/s2/favicons?domain";
            if (url.startsWith('http')) pageIcon.src += "_url";
            pageIcon.src += `=${url}`;

            return pageIcon;
        }

        // Function to create the page link
        function createPageLink(page) {
            const pageLink = document.createElement('a');
            pageLink.className = 'pageLink';
            pageLink.href = page.url;
            pageLink.textContent = page.title;
            pageLink.target = '_blank';
            pageLink.title = page.url;

            const pageId = page.id;
            pageLink.addEventListener('click', () => {
                // Get the book element
                const bookElem = pageLink.closest('.bookListItem');

                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Find the book
                const book = shelf.books.find(book => book.id === bookElem.dataset.bookId);

                // Remove the page from the book
                if (!(book.locked)) {
                    if (book.pages.length === 1) {  // It means that only this page is in the book
                        // Remove the book
                        removeBook(book.id);
                    }
                    else {
                        // Get the index of the page
                        const pageIndex = book.pages.findIndex(page => page.id === pageId);

                        // Get the page list element
                        const pageListElem = pageLink.closest('.pageList');

                        // Remove the page
                        book.pages.splice(pageIndex, 1);
                        pageListElem.removeChild(pageListElem.children[pageIndex]);

                        // Update pages count
                        updatePageCount(book.id);

                        // Save the updated bookshelfData
                        saveBookshelfDataToStorage();
                    }
                }
            });

            return pageLink;
        }

        // Function to create the move shelf handler
        function createMovePageHandler() {
            const movePageHandler = document.createElement('button');
            movePageHandler.title = 'Move this page, click to multi-select';
            movePageHandler.className = 'movePageHandler';

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

            // Add class to visualize that the page is moved
            if (pagesToMove.some(item => item.shelfId === selectedShelfId && item.bookId === bookId && item.id === page.id)) pageListItem.classList.add('pageMoved');

            // Append elements to the item in the desired order
            pageListItem.appendChild(createPageCheckbox(bookId));
            pageListItem.appendChild(createPageIcon(page.url));
            pageListItem.appendChild(createPageLink(page));
            pageListItem.appendChild(createMovePageHandler());

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

            // Set sorting parameters for the pages
            const startBookId = book.id;
            Sortable.create(pageList, {
                group: {
                    name: 'movePages',
                },
                multiDrag: true,
                selectedClass: 'pageSelected',
                handle: '.movePageHandler',
                animation: 150,

                onEnd: function(evt) {
                    // Find the shelf
                    const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                    // Find the book
                    const startBook = shelf.books.find(book => book.id === startBookId);

                    // Get all the items that were dragged
                    const itemsDragged = evt.items.length > 0 ? evt.items : [evt.item];
                    const itemIndexes = evt.oldIndicies.length > 0 ? evt.oldIndicies.map(item => item.index) : [evt.oldIndex];

                    // Find dragged pages in the start book
                    let pagesDragged = Array.from(itemIndexes, index => startBook.pages[index]);

                    // Get new index
                    let newIndex = evt.newIndicies.length > 0 ? evt.newIndicies[0].index : evt.newIndex;

                    // Move pages according to the destination
                    if (evt.from === evt.to) {
                        // Remove pages from old indexes
                        startBook.pages = startBook.pages.filter(page => !pagesDragged.includes(page));

                        // Add pages to new indexes
                        startBook.pages.splice(newIndex, 0, ...pagesDragged);
                    }
                    else if (evt.to === bookList) {
                        // Create new book ID
                        let newBookId;
                        do {
                            newBookId = generateUUID();
                        } while (shelf.books.some(book => book.id === newBookId));

                        // Create the new book
                        const newBook = {
                            id: newBookId,
                            title: `Book ${shelf.books.length + 1}`,
                            pages: structuredClone(pagesDragged),
                            collapsed: false,
                            locked: false
                        };

                        // Update moved pages
                        pagesDragged.forEach(page => {
                            const itemMoved = pagesToMove.find(item => item.shelfId === selectedShelfId && item.bookId === startBookId && item.id === page.id);
                            if (itemMoved !== undefined) {
                                itemMoved.bookId = newBookId;
                            }
                        });

                        // Add book
                        shelf.books.splice(newIndex, 0, newBook);

                        // Remove wrongly displaced pages
                        itemsDragged.forEach(item => bookList.removeChild(item));

                        // Draw new book
                        if (newIndex === shelf.books.length - 1) {
                            bookList.appendChild(createBookListItem(newBook));
                        }
                        else {
                            bookList.insertBefore(createBookListItem(newBook), bookList.children[newIndex]);
                        }

                        // Remove pages from start book
                        startBook.pages = startBook.pages.filter(page => !pagesDragged.includes(page));
                        if (startBook.pages.length === 0) {
                            removeBook(startBookId);  // Remove the book because no pages are left
                        }
                        else {
                            updatePageCount(startBookId);  // Update pages count
                        }
                    }
                    else if (evt.to === dropAreaList) {
                        // Filter out the pages that are already in 'pagesToMove'
                        const filteringIndices = [];
                        pagesDragged = structuredClone(pagesDragged);
                        pagesDragged.forEach((page, pageIndex) => {
                            if (pagesToMove.some(item => item.shelfId === selectedShelfId && item.bookId === startBookId && item.id === page.id)) {
                                filteringIndices.push(pageIndex);
                            }
                            else {
                                page.shelfId = selectedShelfId;
                                page.bookId = startBookId;
                            }
                        });
                        pagesDragged = pagesDragged.filter((_, pageIndex) => !filteringIndices.includes(pageIndex));

                        // Save pages dragged
                        pagesToMove.splice(newIndex, 0, ...pagesDragged);

                        itemsDragged.forEach((item, itemIndex) => {
                            // Remove the 'pageSelected' class
                            item.classList.remove('pageSelected');

                            if (pagesDragged.length !== 0 && !filteringIndices.includes(itemIndex)) {
                                // Create a clone of the dragged item
                                const clone = item.cloneNode(true);
                                const cloneCheckbox = clone.children[0];  // TODO: change this hack

                                // Add functionality to the clone
                                cloneCheckbox.addEventListener('change', () => {
                                    const dropAreaCheckboxes = Array.from(dropAreaList.querySelectorAll('.pageCheckbox'));

                                    const allChecked = dropAreaCheckboxes.every(checkbox => checkbox.checked);
                                    const anyChecked = dropAreaCheckboxes.some(checkbox => checkbox.checked);

                                    dropAreaCheckbox.checked = allChecked;
                                    dropAreaCheckbox.indeterminate = !allChecked && anyChecked;
                                });

                                // Add the clone to the drop area list
                                if (newIndex >= evt.to.children.length) {
                                    evt.to.appendChild(clone);
                                }
                                else {
                                    evt.to.insertBefore(clone, evt.to.children[newIndex]);
                                }
                                newIndex++;

                                // Add class to visualize which items are moved
                                item.classList.add('pageMoved');
                            }

                            // Put the original item back in the main list
                            evt.from.insertBefore(item, evt.from.children[itemIndexes[itemIndex]]);
                        });
                    }
                    else {
                        // Get ID of the book where the pages are moved
                        const endBookId = evt.to.closest('.bookListItem').dataset.bookId;

                        // Get the book where the pages are moved
                        const endBook = shelf.books.find(book => book.id === endBookId);

                        // Check if the pages we are moving have the same ID as those in the book
                        const pagesIds = endBook.pages.map(page => page.id);
                        pagesDragged.forEach(page => {
                            const itemMoved = pagesToMove.find(item => item.shelfId === selectedShelfId && item.bookId === startBookId && item.id === page.id);

                            while (pagesIds.includes(page.id)) {
                                page.id = generateUUID();  // generate new ID
                            };

                            if (itemMoved !== undefined) {
                                itemMoved.bookId = endBookId;
                                itemMoved.id = page.id;
                            }
                        });

                        // Add pages
                        endBook.pages.splice(newIndex, 0, ...pagesDragged);

                        // Remove pages from start book
                        startBook.pages = startBook.pages.filter(page => !pagesDragged.includes(page));
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

                    // Click to deselect all items
                    if ((evt.from !== evt.to) || (newIndex !== itemIndexes[0])) bookList.click();
                },
            });

            return pageList;
        }

        // Function to create a container for the book info and controls
        function createBookListItem(book) {
            const bookListItem = document.createElement('div');
            bookListItem.className = 'bookListItem';
            bookListItem.dataset.bookId = book.id;

            // Append elements to the container in the desired order
            bookListItem.appendChild(createBookHeader(book));
            bookListItem.appendChild(createPageList(book));

            // Show or hide the book based on whether any pages are visible
            bookListItem.style.display = bookListItem.querySelector('.pageListItem[style*="display: flex"]') ? 'grid' : 'none';

            return bookListItem;
        }

        // Create a function to append new shelves to the shelf list
        shelfList.appendShelfListItem = function(shelf) {
            shelfList.appendChild(createShelfListItem(shelf));
        }

        // Create the elements based on the data
        shelfList.innerHTML = '';
        bookshelfData.forEach((shelf) => {
            shelfList.appendShelfListItem(shelf);

            if (shelf.id === selectedShelfId) {
                shelf.books.forEach((book) => {
                    fragment.appendChild(createBookListItem(book));
                });
            }
        });

        // Set sorting parameters for the shelves
        Sortable.create(shelfList, {
            group: {
                name: 'moveShelf',
            },
            handle: '.moveShelfHandler',
            animation: 150,

            onEnd: function(evt) {
                if ((evt.oldIndex >= bookshelfData.length) || (evt.newIndex >= bookshelfData.length)) return;

                // Move shelf in the new position
                if (evt.newIndex !== evt.oldIndex) bookshelfData.splice(evt.newIndex, 0, bookshelfData.splice(evt.oldIndex, 1)[0]);

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();

                // Click to deselect all items
                if ((evt.from !== evt.to) || (evt.newIndex !== evt.oldIndex)) bookList.click();
            },
        });

        // Clear existing content and append the fragment to display the data
        bookList.innerHTML = '';
        bookList.appendChild(fragment);

        // Set sorting parameters for the books
        Sortable.create(bookList, {
            group: {
                name: 'movePages',
            },
            swapThreshold: .9,
            animation: 150,

            onEnd: function(evt) {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Get the item dragged (only one allowed)
                const itemDragged = evt.item;
                const itemIndex = evt.oldIndex;

                // Find dragged book
                const bookDragged = shelf.books[itemIndex];

                // Get dragged pages
                let pagesDragged = structuredClone(bookDragged.pages);

                // Get new index
                let newIndex = evt.newIndicies.length > 0 ? evt.newIndicies[0].index : evt.newIndex;

                // Move pages according to the destination
                if (evt.from === evt.to) {
                    // Move book in the new position
                    if (newIndex !== itemIndex) shelf.books.splice(newIndex, 0, shelf.books.splice(itemIndex, 1)[0]);
                }
                else if (evt.to === dropAreaList) {
                    // Filter out the pages that are already in 'pagesToMove'
                    const filteringIndices = [];
                    pagesDragged.forEach((page, pageIndex) => {
                        if (pagesToMove.some(item => item.shelfId === selectedShelfId && item.bookId === bookDragged.id && item.id === page.id)) {
                            filteringIndices.push(pageIndex);
                        }
                        else {
                            page.shelfId = selectedShelfId;
                            page.bookId = bookDragged.id;
                        }
                    });
                    pagesDragged = pagesDragged.filter((_, pageIndex) => !filteringIndices.includes(pageIndex));

                    // Save pages dragged
                    pagesToMove.splice(newIndex, 0, ...pagesDragged);

                    // Put the original book back in the correct position
                    if (itemIndex >= bookList.children.length) {
                        bookList.appendChild(itemDragged);
                    }
                    else {
                        bookList.insertBefore(itemDragged, bookList.children[itemIndex]);
                    }

                    // Add all the book pages in the drop area list
                    if (pagesDragged.length !== 0) {
                        itemDragged.querySelectorAll('.pageListItem').forEach((page, pageIndex) => {
                            if (!filteringIndices.includes(pageIndex)) {
                                // Create a clone of the page
                                const clone = page.cloneNode(true);
                                const cloneCheckbox = clone.children[0];  // TODO: change this hack

                                // Add functionality to the clone
                                cloneCheckbox.addEventListener('change', () => {
                                    const dropAreaCheckboxes = Array.from(dropAreaList.querySelectorAll('.pageCheckbox'));

                                    const allChecked = dropAreaCheckboxes.every(checkbox => checkbox.checked);
                                    const anyChecked = dropAreaCheckboxes.some(checkbox => checkbox.checked);

                                    dropAreaCheckbox.checked = allChecked;
                                    dropAreaCheckbox.indeterminate = !allChecked && anyChecked;
                                });

                                // Add the clone to the drop area list
                                if (newIndex >= dropAreaList.children.length) {
                                    dropAreaList.appendChild(clone);
                                }
                                else {
                                    dropAreaList.insertBefore(clone, dropAreaList.children[newIndex]);
                                }
                                newIndex++;

                                // Add class to visualize which items are moved
                                page.classList.add('pageMoved');
                            }
                        });
                    }
                }
                else {
                    // Get ID of the book where the pages are moved
                    const endBookId = evt.to.closest('.bookListItem').dataset.bookId;

                    // Get the book where the pages are moved
                    const endBook = shelf.books.find(book => book.id === endBookId);

                    // Check if the pages we are moving have the same ID as those in the book
                    const pagesIds = endBook.pages.map(page => page.id);
                    pagesDragged.forEach(page => {
                        const itemMoved = pagesToMove.find(item => item.shelfId === selectedShelfId && item.bookId === bookDragged.id && item.id === page.id);

                        while (pagesIds.includes(page.id)) {
                            page.id = generateUUID();  // generate new ID
                        };

                        if (itemMoved !== undefined) {
                            itemMoved.bookId = endBookId;
                            itemMoved.id = page.id;
                        }
                    });

                    // Add pages
                    endBook.pages.splice(newIndex, 0, ...pagesDragged);

                    // Remove the original book
                    shelf.books.splice(itemIndex, 1);

                    // Redraw the end book
                    evt.to.innerHTML = '';
                    endBook.pages.forEach((page) => {
                        evt.to.appendChild(createPageListItem(page, endBookId));
                    });
                    updatePageCount(endBookId);  // Update pages count
                }

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();

                // Click to deselect all items
                if ((evt.from !== evt.to) || (newIndex !== itemIndex)) bookList.click();
            },
        });

        // Initialize Sortable for the drop list
        Sortable.create(dropAreaList, {
            group: {
                name: 'movePages',
            },
            multiDrag: true,
            selectedClass: 'pageSelected',
            handle: '.movePageHandler',
            animation: 150,

            onEnd: function(evt) {
                // Find the shelf
                const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

                // Get all the items that were dragged
                const itemsDragged = evt.items.length > 0 ? evt.items : [evt.item];
                const itemIndexes = evt.oldIndicies.length > 0 ? evt.oldIndicies.map(item => item.index) : [evt.oldIndex];

                // Find dragged pages
                let pagesDragged = Array.from(itemIndexes, index => pagesToMove[index]);

                // Remove pages from old indexes
                pagesToMove = pagesToMove.filter(page => !pagesDragged.includes(page));

                // Get new index
                let newIndex = evt.newIndicies.length > 0 ? evt.newIndicies[0].index : evt.newIndex;

                // Move pages according to the destination
                if (evt.from === evt.to) {
                    // Add pages to new indexes
                    pagesToMove.splice(newIndex, 0, ...pagesDragged);
                }
                else if (evt.to === bookList) {
                    // Create new book ID
                    let newBookId;
                    do {
                        newBookId = generateUUID();
                    } while (shelf.books.some(book => book.id === newBookId));

                    // Create the new book
                    const newBook = {
                        id: newBookId,
                        title: `Book ${shelf.books.length + 1}`,
                        pages: structuredClone(pagesDragged.map((page) => {
                            const { bookId, shelfId, ...newPage } = page;
                            return newPage;
                        })),
                        collapsed: false,
                        locked: false
                    };

                    // Add book
                    shelf.books.splice(newIndex, 0, newBook);

                    // Remove wrongly displaced pages
                    itemsDragged.forEach(item => bookList.removeChild(item));

                    // Draw new book
                    if (newIndex === shelf.books.length - 1) {
                        bookList.appendChild(createBookListItem(newBook));
                    }
                    else {
                        bookList.insertBefore(createBookListItem(newBook), bookList.children[newIndex]);
                    }

                    // Remove pages from other books
                    pagesDragged.forEach((page) => {
                        // Remove data
                        const startShelf = bookshelfData.find(shelf => shelf.id === page.shelfId);
                        const startBook = startShelf.books.find(book => book.id === page.bookId);
                        startBook.pages = startBook.pages.filter(item => item.id !== page.id);

                        // Remove element
                        if (page.shelfId === selectedShelfId) {
                            if (startBook.pages.length === 0) {
                                removeBook(page.bookId);  // Remove the book because no pages are left
                            }
                            else {
                                const pageElem = getBookListItem(page.bookId).querySelector(`.pageListItem[data-page-id="${page.id}"]`);
                                pageElem.parentElement.removeChild(pageElem);

                                updatePageCount(page.bookId);  // Update pages count
                            }
                        }
                        else if (startBook.pages.length === 0) {
                            startShelf.books = startShelf.books.filter(book => book.id !== startBook.id);
                        }
                    });

                    // Hide the message (when the new book is dropped in an empty shelf)
                    displayResultMessage();
                }
                else {
                    // Get ID of the book where the pages are moved
                    const endBookId = evt.to.closest('.bookListItem').dataset.bookId;

                    // Get the book where the pages are moved
                    const endBook = shelf.books.find(book => book.id === endBookId);

                    // Check if the pages we are moving have the same ID as those in the book
                    const pagesIds = endBook.pages.map(page => page.id);
                    pagesDragged.forEach(page => {
                        // Remove data from the original book
                        const startShelf = bookshelfData.find(shelf => shelf.id === page.shelfId);
                        const startBook = startShelf.books.find(book => book.id === page.bookId);
                        const pageIndex = startBook.pages.findIndex(item => item.id === page.id);
                        startBook.pages.splice(pageIndex, 1);

                        if (page.bookId === endBookId) {  // It means that the startBook and endBook are the same
                            if (newIndex > pageIndex) newIndex--;
                        }
                        else {
                            // Remove element from the original book
                            if (page.shelfId === selectedShelfId) {
                                if (startBook.pages.length === 0) {
                                    removeBook(page.bookId);  // Remove the book because no pages are left
                                }
                                else {
                                    const pageElem = getBookListItem(page.bookId).querySelector(`.pageListItem[data-page-id="${page.id}"]`);
                                    pageElem.parentElement.removeChild(pageElem);

                                    updatePageCount(page.bookId);  // Update pages count
                                }
                            }
                            else if (startBook.pages.length === 0) {
                                startShelf.books = startShelf.books.filter(book => book.id !== startBook.id);
                            }

                            // generate new ID
                            while (pagesIds.includes(page.id)) {
                                page.id = generateUUID();
                            };
                        }
                    });

                    // Remove unwanted attributes from the dragged pages
                    pagesDragged = structuredClone(pagesDragged.map((page) => {
                        const { bookId, shelfId, ...newPage } = page;
                        return newPage;
                    }));

                    // Add pages
                    endBook.pages.splice(newIndex, 0, ...pagesDragged);

                    // Redraw only the end book
                    evt.to.innerHTML = '';
                    endBook.pages.forEach((page) => {
                        evt.to.appendChild(createPageListItem(page, endBookId));
                    });
                    updatePageCount(endBookId);  // Update pages count
                }

                // Save the updated bookshelfData
                saveBookshelfDataToStorage();

                // Click to deselect all items
                if ((evt.from !== evt.to) || (newIndex !== itemIndexes[0])) bookList.click();
            }
        });

        // Display a message if no pages match
        displayResultMessage();

        // Function to update pages count
        function updatePageCount(bookId) {
            // Find the shelf
            const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

            // Find the book
            const book = shelf.books.find(book => book.id === bookId);

            // Change text
            getBookListItem(bookId).querySelector('.pagesCount').textContent = `${book.pages.length} Page${book.pages.length !== 1 ? 's' : ''}`;
        }

        // Function to remove an entire page book
        function removeBook(bookId) {
            // Find the shelf
            const shelf = bookshelfData.find(shelf => shelf.id === selectedShelfId);

            // Find the book index
            const bookIndex = shelf.books.findIndex(book => book.id === bookId);

            // Get HTML element
            const bookListItem = getBookListItem(bookId);

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
    }
});