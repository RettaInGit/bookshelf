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
        const data = await chrome.storage.local.get('bookShelfData');
        bookShelfData = data.bookShelfData || [];
    }

    // Function to set bookshelf data to storage
    async function saveBookShelfDataToStorage() {
        await chrome.storage.local.set({ 'bookShelfData': bookShelfData }, () => {
            // Check for errors
            if (chrome.runtime.lastError) {
                console.error('Error setting storage:', chrome.runtime.lastError);

                // TODO: Handle the error accordingly
            }
        });
    }

    // Function to display bookshelf data on the main page
    function displayBookShelf() {
        const fragment = document.createDocumentFragment();  // Create fragment to minimizes the number of reflows and repaints
        const currentSearchQuery = searchBar.value.trim().toLowerCase();  // Get current filtering query
        const areThereAnyPagesToMove = (pagesToMove.length !== 0) && (bookShelfData.findIndex(book => book.id === bookIdOfMovingPages) !== -1);

        bookShelfData.forEach((book) => {
            let anyPageVisible = false;
            const bookId = book.id;

            // Create a container for each book
            const bookContainer = document.createElement('div');
            bookContainer.className = 'bookContainer';
            bookContainer.dataset.bookId = bookId;

            // Create a header container for the book
            const bookHeaderContainer = document.createElement('div');
            bookHeaderContainer.className = 'bookHeaderContainer';
            bookHeaderContainer.addEventListener('click', (event) => {
                // Check if the clicked element is the header container or the book title
                if ((event.target === bookHeaderContainer) || ((event.target === bookTitle) && (editBookTitleButton.dataset.mode === 'edit'))) {
                    toggleBookCollapse(bookId);
                }
            });

            // Create the master checkbox
            const masterCheckbox = document.createElement('input');
            masterCheckbox.type = 'checkbox';
            masterCheckbox.className = 'masterCheckbox';
            masterCheckbox.title = 'Select/Deselect All Pages in this Book';
            masterCheckbox.addEventListener('change', (event) => {
                toggleBookCheckboxes(bookId, event.target.checked);
            });

            // Create a title for the book
            const bookTitle = document.createElement('h2');
            bookTitle.textContent = book.title;
            bookTitle.className = 'bookTitle';
            bookTitle.contentEditable = false;

            // Create an edit button for the book title
            const editBookTitleButton = document.createElement('button');
            editBookTitleButton.textContent = 'Edit title';
            editBookTitleButton.title = 'Edit book title';
            editBookTitleButton.className = 'editBookTitleButton';
            editBookTitleButton.dataset.mode = 'edit';
            editBookTitleButton.addEventListener('click', () => {
                toggleEditBookTitle(bookId);
            });

            // Create a restore button for the book
            const restoreBookButton = document.createElement('button');
            restoreBookButton.textContent = 'Restore';
            restoreBookButton.title = 'Restore this book';
            restoreBookButton.className = 'restoreBookButton';
            restoreBookButton.addEventListener('click', () => {
                restoreBook(bookId);
            });

            // Create a remove button for the book
            const removeBookButton = document.createElement('button');
            removeBookButton.textContent = 'Remove';
            removeBookButton.title = 'Remove this book';
            removeBookButton.className = 'removeBookButton';
            removeBookButton.addEventListener('click', () => {
                removeBook(bookId);
            });

            // Append elements to the header container in the desired order
            bookHeaderContainer.appendChild(masterCheckbox);
            bookHeaderContainer.appendChild(bookTitle);
            bookHeaderContainer.appendChild(editBookTitleButton);
            bookHeaderContainer.appendChild(restoreBookButton);
            bookHeaderContainer.appendChild(removeBookButton);

            // Create a list for the pages in the book
            const pagesList = document.createElement('ul');
            pagesList.className = 'pagesList';
            pagesList.style.display = book.collapsed ? 'none' : 'grid';

            book.pages.forEach((page) => {
                const pageId = page.id;

                // Create a list item for each page
                const listItem = document.createElement('li');

                // Create "Move here" button
                const moveHereButton = document.createElement('button');
                moveHereButton.textContent = 'Move here';
                moveHereButton.className = 'moveHereButton';
                moveHereButton.style.display =  areThereAnyPagesToMove ? 'block' : 'none';
                moveHereButton.addEventListener('click', () => {
                    movePagesHere(bookId, pageId);
                });

                // Create a container for the page info and controls
                const pageContainer = document.createElement('div');
                pageContainer.className = 'pageContainer';
                pageContainer.dataset.pageId = pageId;

                // Create a checkbox for selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'pageCheckbox';
                checkbox.addEventListener('change', () => {
                    updateMasterCheckboxState(bookId);
                });

                // Create a link to store page informations
                const link = document.createElement('a');
                link.href = page.url;
                link.textContent = page.title;
                link.target = '_blank';

                // Create a remove button for the page
                const removePageButton = document.createElement('button');
                removePageButton.textContent = 'X';
                removePageButton.title = 'Remove this page';
                removePageButton.className = 'removePageButton';
                removePageButton.addEventListener('click', () => {
                    removePageFromBook(bookId, pageId);
                });

                // Append elements to the page container in the desired order
                pageContainer.appendChild(checkbox);
                pageContainer.appendChild(link);
                pageContainer.appendChild(removePageButton);

                // Append elements to the list item in the desired order
                listItem.appendChild(moveHereButton);
                listItem.appendChild(pageContainer);

                // Append element to the page list
                pagesList.appendChild(listItem);

                // Show or hide the page based on whether the query is included in the title
                if (page.title.toLowerCase().includes(currentSearchQuery)) {
                    listItem.style.display = 'grid';
                    anyPageVisible = true;
                } else {
                    listItem.style.display = 'none';
                }
            });

            // Create "Move here" button
            const moveHereButton = document.createElement('button');
            moveHereButton.textContent = 'Move here';
            moveHereButton.className = 'moveHereButton';
            moveHereButton.style.display =  areThereAnyPagesToMove ? 'block' : 'none';
            moveHereButton.addEventListener('click', () => {
                movePagesHere(bookId, '');
            });

            // Create a footer container for the book
            const bookFooterContainer = document.createElement('div');
            bookFooterContainer.className = 'bookFooterContainer';
            bookFooterContainer.style.display = book.collapsed ? 'none' : 'flex';

            // Add a button to move selected pages
            const moveSelectedButton = document.createElement('button');
            moveSelectedButton.textContent = 'Move Selected Pages';
            moveSelectedButton.className = 'moveSelectedButton';
            moveSelectedButton.disabled = areThereAnyPagesToMove && (bookIdOfMovingPages != bookId);
            moveSelectedButton.style.textDecoration = moveSelectedButton.disabled ? 'line-through' : 'none';
            moveSelectedButton.addEventListener('click', () => {
                moveSelectedPages(bookId);
            });

            // Add a button to restore selected pages
            const restoreSelectedButton = document.createElement('button');
            restoreSelectedButton.textContent = 'Restore Selected Pages';
            restoreSelectedButton.className = 'restoreSelectedButton';
            restoreSelectedButton.addEventListener('click', () => {
                restoreSelectedPages(bookId);
            });

            // Add a button to remove selected pages
            const removeSelectedButton = document.createElement('button');
            removeSelectedButton.textContent = 'Remove Selected Pages';
            removeSelectedButton.className = 'removeSelectedButton';
            removeSelectedButton.addEventListener('click', () => {
                removeSelectedPages(bookId);
            });

            // Create a span to display the number of pages
            const pagesCount = document.createElement('h2');
            pagesCount.textContent = `${book.pages.length} Page${book.pages.length !== 1 ? 's' : ''}`;
            pagesCount.className = 'pagesCount';

            // Append the removeSelectedButton to the footer container
            bookFooterContainer.appendChild(moveSelectedButton);
            bookFooterContainer.appendChild(restoreSelectedButton);
            bookFooterContainer.appendChild(removeSelectedButton);
            bookFooterContainer.appendChild(pagesCount);

            // Append elements to the book container
            bookContainer.appendChild(bookHeaderContainer);
            bookContainer.appendChild(pagesList);
            bookContainer.appendChild(moveHereButton);
            bookContainer.appendChild(bookFooterContainer);

            // Show or hide the book based on whether any pages are visible
            if (anyPageVisible) {
                bookContainer.style.display = 'grid';
            } else {
                bookContainer.style.display = 'none';
            }

            // Append the book container to the main container
            fragment.appendChild(bookContainer);
        });

        // Clear existing content and append the fragment
        const bookShelf = document.getElementById('bookShelf');
        bookShelf.innerHTML = '';
        bookShelf.appendChild(fragment);

        // Display a message if no pages match
        displayResultMessage();
    }

    // Function to toggle book collapse/expand state
    function toggleBookCollapse(bookId) {
        // Find the book index
        const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Get HTML elements
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        const pagesList = bookContainer.querySelector('.pagesList');
        const bookFooterContainer = bookContainer.querySelector('.bookFooterContainer');

        // Toggle the display style
        if (bookShelfData[bookIndex].collapsed) {
            pagesList.style.display = 'grid';
            bookFooterContainer.style.display = 'flex';
        } else {
            pagesList.style.display = 'none';
            bookFooterContainer.style.display = 'none';
        }
        bookShelfData[bookIndex].collapsed ^= true;  // toggle value

        // Save the updated bookShelfData
        saveBookShelfDataToStorage();
    }

    // Function to toggle all checkboxes in a book
    function toggleBookCheckboxes(bookId, isChecked) {
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        const checkboxes = bookContainer.querySelectorAll('.pageCheckbox');

        checkboxes.forEach((checkbox) => {
            checkbox.checked = isChecked;
        });
    }

    // Function to update the master checkbox state based on individual checkboxes
    function updateMasterCheckboxState(bookId) {
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        const masterCheckbox = bookContainer.querySelector('.masterCheckbox');
        const checkboxes = bookContainer.querySelectorAll('.pageCheckbox');

        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

        masterCheckbox.checked = allChecked;
        masterCheckbox.indeterminate = !allChecked && anyChecked;
    }

    // Function to toggle between edit and save modes for the book title
    function toggleEditBookTitle(bookId) {
        // Find the book index
        const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Get HTML elements
        const bookHeaderContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"] .bookHeaderContainer`);
        const bookTitle = bookHeaderContainer.querySelector('.bookTitle');
        const editBookTitleButton = bookHeaderContainer.querySelector('.editBookTitleButton');

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
                    toggleEditBookTitle(bookId); // Save on Enter key
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
    }

    // Function to move selected pages
    function moveSelectedPages(bookId) {
        // Enable to move pages
        if (pagesToMove.length === 0) {
            // Find the book by ID
            const book = bookShelfData.find(book => book.id === bookId);
            if (!book) return;

            // Get HTML elements
            const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
            const checkboxes = bookContainer.querySelectorAll('.pageCheckbox');

            console.assert(checkboxes.length === book.pages.length, 'Assert error in "moveSelectedPages" function');  // Assert data compatibility

            // Collect the pages to move
            pagesToMove = [];
            checkboxes.forEach((checkbox, checkboxIndex) => {
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
            document.querySelectorAll('.moveSelectedButton').forEach(moveSelectedButton => {
                const bookFooterContainer = moveSelectedButton.parentElement;
                const bookContainer = bookFooterContainer.parentElement;

                if (bookContainer.dataset.bookId != bookId) {
                    moveSelectedButton.disabled = true;
                    moveSelectedButton.style.textDecoration = 'line-through';
                }
            });

            // Remove bottom border from all the pages
            document.querySelectorAll('.pagesList li').forEach(listItem => {
                listItem.style.borderBottomWidth = '0px';
            });

            // Show all "Move here" buttons
            document.querySelectorAll('.moveHereButton').forEach(moveHereButton => {
                moveHereButton.style.display = 'block';
            });
        }
        // Disable to move pages
        else {
            // Clear the array and the book ID
            pagesToMove = [];
            bookIdOfMovingPages = '';

            // Enable all the others buttons
            document.querySelectorAll('.moveSelectedButton').forEach(moveSelectedButton => {
                if (moveSelectedButton.parentElement.parentElement.dataset.bookId != bookId) {
                    moveSelectedButton.disabled = false;
                    moveSelectedButton.style.textDecoration = 'none';
                }
            });

            // Add bottom border in all the pages
            document.querySelectorAll('.pagesList li').forEach(listItem => {
                listItem.style.borderBottomWidth = '1px';
            });

            // Hide all "Move here" buttons
            document.querySelectorAll('.moveHereButton').forEach(moveHereButton => {
                moveHereButton.style.display = 'none';
            });
        }
    }

    // Function to restore selected pages from a book
    function restoreSelectedPages(bookId) {
        // Find the book by ID
        const book = bookShelfData.find(book => book.id === bookId);
        if (!book) return;

        // Get HTML elements
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        const checkboxes = bookContainer.querySelectorAll('.pageCheckbox');

        console.assert(checkboxes.length === book.pages.length, 'Assert error in "restoreSelectedPages" function');  // Assert data compatibility

        // Collect the pages to restore
        const pagesToRestore = [];
        checkboxes.forEach((checkbox, checkboxIndex) => {
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
    }

    // Function to remove selected pages from a book
    function removeSelectedPages(bookId) {
        // Find the book index
        const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Get HTML elements
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        const pagesList = bookContainer.querySelector('.pagesList');
        const checkboxes = pagesList.querySelectorAll('.pageCheckbox');

        console.assert(checkboxes.length === bookShelfData[bookIndex].pages.length, 'Assert error in "removeSelectedPages" function');  // Assert data compatibility

        // Collect the indices of pages to remove
        const indicesToRemove = [];
        checkboxes.forEach((checkbox, checkboxIndex) => {
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
    }

    // Function to update pages count
    function updatePageCount(bookId) {
        // Get book
        const book = bookShelfData.find(book => book.id === bookId);
        if (!book) return;

        // Get HTML elements
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        const pagesCount = bookContainer.querySelector('.pagesCount');

        // Change text
        pagesCount.textContent = `${book.pages.length} Page${book.pages.length !== 1 ? 's' : ''}`;
    }

    // Function to remove an entire page book
    function removeBook(bookId) {
        // Find the book index
        const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Get HTML element
        const bookContainer = document.querySelector(`.bookContainer[data-book-id="${bookId}"]`);
        if (!bookContainer) return;

        // Remove the book
        bookContainer.parentElement.removeChild(bookContainer);
        bookShelfData.splice(bookIndex, 1);

        // Display a message if there are no pages
        displayResultMessage();

        // Save the updated bookShelfData
        saveBookShelfDataToStorage();
    }

    // Function to remove a page from a book
    function removePageFromBook(bookId, pageId) {
        // Find the book index
        const bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Find the page index
        const pageIndex = bookShelfData[bookIndex].pages.findIndex(page => page.id === pageId);
        if (pageIndex === -1) return;

        // Get HTML element
        const pagesList = document.querySelector(`.bookContainer[data-book-id="${bookId}"] .pagesList`);

        console.assert(pagesList.querySelectorAll('li').length === bookShelfData[bookIndex].pages.length, 'Assert error in "removePageFromBook" function');  // Assert data compatibility

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
    }

    // Function to move pages inside a book
    function movePagesHere(bookId, pageId) {
        if ((pagesToMove.length === 0) || (bookShelfData.findIndex(book => book.id === bookIdOfMovingPages) === -1)) return;

        // Find the book index
        let bookIndex = bookShelfData.findIndex(book => book.id === bookId);
        if (bookIndex === -1) return;

        // Find the page index
        let pageIndex = bookShelfData[bookIndex].pages.findIndex(page => page.id === pageId);
        if (pageIndex < 0) pageIndex = bookShelfData[bookIndex].pages.length;

        // Check if the pages we are moving have the same ID as those in the book
        let bookIds = new Set();
        let pageToAdd = JSON.parse(JSON.stringify(pagesToMove));  // Make a deep copy
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

        // Repaint the DOM (TODO: remove this and make it repaint dynamically when adding and removing moved pages)
        displayBookShelf();
    }

    // Function to restore pages from a single book
    function restoreBook(bookId) {
        // Find the book by ID
        const book = bookShelfData.find(book => book.id === bookId);
        if (!book) return;

        // Restore pages
        book.pages.forEach(page => {
            chrome.tabs.create({ url: page.url });
        });
    }

    // Display a message if there are no pages visible in the page
    function displayResultMessage() {
        // Get HTML elements
        const resultMessage = document.querySelector('#resultMessage');
        const bookContainer = document.querySelectorAll('.bookContainer');

        // Check if any book is visible
        const anyBooksVisible = Object.values(bookContainer).some(book => book.style.display === 'grid');

        // Display message
        if (bookShelfData.length === 0) {
            resultMessage.style.display = 'block';
            resultMessage.textContent = 'No pages saved. Try adding some.';
        }
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