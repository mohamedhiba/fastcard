// Firebase imports
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Initialize Firebase services
const auth = getAuth();
const db = getFirestore();

// State management
let decks = [];
let currentDeckIndex = 0;
let currentCardIndex = 0;
let isReviewMode = false;
let wrongCards = [];
let correctCount = 0;
let wrongCount = 0;
let totalReviewRounds = 0;

// DOM Elements
const elements = {
    flashcard: document.querySelector('.flashcard'),
    questionText: document.getElementById('questionText'),
    answerText: document.getElementById('answerText'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.querySelector('.progress-text'),
    correctCounter: document.querySelector('.stat.correct span'),
    wrongCounter: document.querySelector('.stat.wrong span'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    correctBtn: document.getElementById('correctBtn'),
    wrongBtn: document.getElementById('wrongBtn'),
    shuffleBtn: document.getElementById('shuffleBtn')
};

// Create message overlay
const messageOverlay = document.createElement('div');
messageOverlay.className = 'message-overlay';
messageOverlay.innerHTML = `
    <div class="message-content">
        <h2>Great Progress! 🎉</h2>
        <p></p>
        <button class="btn btn-primary continue-btn">Continue</button>
    </div>
`;
document.body.appendChild(messageOverlay);

// Initialize
function init() {
    updateDeckList();
    updateDeckTitle();
    displayCard();
    setupEventListeners();
}

// Display current card
function displayCard() {
    const currentDeck = decks[currentDeckIndex];
    if (!currentDeck || !currentDeck.cards || currentDeck.cards.length === 0) {
        elements.questionText.innerHTML = '<p class="empty-state">No cards in this deck yet.</p>';
        elements.answerText.innerHTML = '';
        return;
    }

    const currentCard = isReviewMode ? wrongCards[currentCardIndex] : currentDeck.cards[currentCardIndex];
    
    // Display question and answer
    elements.questionText.innerHTML = currentCard.question;
    elements.answerText.innerHTML = currentCard.answer;
    
    // Re-render KaTeX for the new content
    requestAnimationFrame(() => {
        renderMathInElement(elements.questionText);
        renderMathInElement(elements.answerText);
    });
    
    elements.flashcard.classList.remove('is-flipped');
    updateProgress();
}

// Show completion message
function showCompletionMessage() {
    const messageContent = messageOverlay.querySelector('p');
    const continueBtn = messageOverlay.querySelector('.continue-btn');
    
    if (wrongCards.length === 0) {
        messageContent.innerHTML = `
            Congratulations! 🎉<br>
            You've mastered all ${decks[currentDeckIndex].cards.length} cards!<br>
            Total Review Rounds: ${totalReviewRounds}<br>
            Final Score: ${correctCount} correct, ${wrongCount} wrong
        `;
        continueBtn.textContent = 'Start New Session';
        continueBtn.onclick = resetSession;
    } else {
        messageContent.innerHTML = `
            Round ${totalReviewRounds + 1} completed!<br>
            You got ${wrongCards.length} cards wrong.<br>
            Let's review them to improve your mastery.
        `;
        continueBtn.textContent = 'Start Review';
        continueBtn.onclick = startReviewRound;
    }
    
    messageOverlay.classList.add('active');
}

// Start review round
function startReviewRound() {
    messageOverlay.classList.remove('active');
    isReviewMode = true;
    totalReviewRounds++;
    currentCardIndex = 0;
    shuffleCards();
    displayCard();
}

// Reset session
function resetSession() {
    messageOverlay.classList.remove('active');
    isReviewMode = false;
    wrongCards = [];
    correctCount = 0;
    wrongCount = 0;
    totalReviewRounds = 0;
    currentCardIndex = 0;
    shuffleCards();
    displayCard();
}

// Update progress
function updateProgress() {
    const cards = isReviewMode ? wrongCards : decks[currentDeckIndex].cards;
    const progress = cards.length ? ((currentCardIndex + 1) / cards.length) * 100 : 0;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = cards.length ? 
        `Card ${currentCardIndex + 1} of ${cards.length}` :
        'No cards';
    
    // Update counters
    elements.correctCounter.textContent = correctCount;
    elements.wrongCounter.textContent = wrongCount;
}

// Event Handlers
function flipCard() {
    elements.flashcard.classList.toggle('is-flipped');
}

function nextCard() {
    const cards = isReviewMode ? wrongCards : decks[currentDeckIndex].cards;
    if (cards.length === 0) return;
    
    currentCardIndex++;
    if (currentCardIndex >= cards.length) {
        currentCardIndex = cards.length - 1; // Keep the last card visible
        showCompletionMessage();
        return;
    }
    displayCard();
}

function prevCard() {
    const cards = isReviewMode ? wrongCards : decks[currentDeckIndex].cards;
    if (cards.length === 0) return;
    currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
    displayCard();
}

function markCorrect() {
    const cards = isReviewMode ? wrongCards : decks[currentDeckIndex].cards;
    if (cards.length === 0) return;
    
    correctCount++;
    if (isReviewMode) {
        wrongCards.splice(currentCardIndex, 1);
        if (wrongCards.length === 0) {
            showCompletionMessage();
            return;
        }
        // Adjust currentCardIndex if we're at the end
        if (currentCardIndex >= wrongCards.length) {
            currentCardIndex = wrongCards.length - 1;
        }
    }
    nextCard();
}

function markWrong() {
    const cards = isReviewMode ? wrongCards : decks[currentDeckIndex].cards;
    if (cards.length === 0) return;
    
    wrongCount++;
    const currentCard = isReviewMode ? 
        wrongCards[currentCardIndex] : 
        decks[currentDeckIndex].cards[currentCardIndex];
    
    if (!isReviewMode && !wrongCards.some(card => card.question === currentCard.question)) {
        wrongCards.push(currentCard);
    }
    nextCard();
}

function shuffleCards() {
    const cards = isReviewMode ? wrongCards : decks[currentDeckIndex].cards;
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    currentCardIndex = 0;
    displayCard();
}

// Setup Event Listeners
function setupEventListeners() {
    // Flashcard flip
    elements.flashcard.addEventListener('click', flipCard);

    // Navigation buttons
    elements.prevBtn.addEventListener('click', prevCard);
    elements.nextBtn.addEventListener('click', nextCard);
    elements.correctBtn.addEventListener('click', markCorrect);
    elements.wrongBtn.addEventListener('click', markWrong);
    elements.shuffleBtn.addEventListener('click', shuffleCards);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                flipCard();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                prevCard();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextCard();
                break;
            case 'KeyS':
                e.preventDefault();
                shuffleCards();
                break;
        }
    });

    // Add card controls
    updateCardControls();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    auth.onAuthStateChanged(user => {
        if (user) {
            loadDecks();
            setupEventListeners();
            initializeEditors();
        }
    });

    // Initialize KaTeX auto-render
    renderMathInElement(document.body, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false,
        output: 'html',
        strict: false
    });
});

// Optimize animations with simpler transforms
const style = document.createElement('style');
style.textContent = `
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
    }

    .modal.active {
        display: flex;
    }

    .modal-content {
        opacity: 0;
        transform: translateY(-20px);
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .modal.active .modal-content {
        opacity: 1;
        transform: translateY(0);
    }

    .message-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
    }

    .message-overlay.active {
        display: flex;
    }

    .message-content {
        opacity: 0;
        transform: translateY(-20px);
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .message-overlay.active .message-content {
        opacity: 1;
        transform: translateY(0);
    }

    .delete-btn {
        opacity: 0;
        transition: opacity 0.2s ease;
        background: none;
        border: none;
        color: var(--danger-color);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: var(--radius-sm);
    }

    .deck-item:hover .delete-btn {
        opacity: 1;
    }

    .deck-item-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }
`;
document.head.appendChild(style);

// Simplified modal functions
window.showNewDeckModal = function() {
    const modal = document.getElementById('newDeckModal');
    if (modal) {
        modal.classList.add('active');
        const nameInput = document.getElementById('newDeckName');
        if (nameInput) {
            nameInput.focus();
        }
        
        // Set up icon selection
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.addEventListener('click', function() {
                iconOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
};

window.closeNewDeckModal = function() {
    const modal = document.getElementById('newDeckModal');
    if (modal) {
        modal.classList.remove('active');
        // Clear form
        document.getElementById('newDeckName').value = '';
        document.getElementById('newDeckDescription').value = '';
        // Reset icon selection
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(opt => opt.classList.remove('active'));
        iconOptions[0].classList.add('active');
    }
};

window.showAddCardModal = function() {
    const modal = document.getElementById('addCardModal');
    if (modal) {
        modal.classList.add('active');
        const questionInput = document.getElementById('newQuestion');
        if (questionInput) {
            questionInput.focus();
        }
    }
};

window.closeAddCardModal = function() {
    const modal = document.getElementById('addCardModal');
    if (modal) {
        modal.classList.remove('active');
        // Reset TinyMCE editors
        tinymce.get('newQuestion').setContent('');
        tinymce.get('newAnswer').setContent('');
        document.getElementById('newCardCategory').value = 'General';
    }
};

// Load user's decks from Firebase
async function loadDecks() {
    try {
        const userId = auth.currentUser.uid;
        const decksRef = collection(db, `users/${userId}/decks`);
        const querySnapshot = await getDocs(query(decksRef, orderBy('createdAt', 'desc')));
        
        decks = [];
        for (const deckDoc of querySnapshot.docs) {
            const deck = {
                id: deckDoc.id,
                ...deckDoc.data(),
                cards: []
            };
            
            // Load cards for this deck
            const cardsRef = collection(db, `users/${userId}/decks/${deck.id}/cards`);
            const cardsSnapshot = await getDocs(query(cardsRef, orderBy('createdAt', 'desc')));
            
            deck.cards = cardsSnapshot.docs.map(cardDoc => ({
                id: cardDoc.id,
                ...cardDoc.data()
            }));
            
            decks.push(deck);
        }
        
        // Update UI
        updateDeckList();
        updateDeckTitle();
        displayCard();
        updateProgress();
    } catch (error) {
        console.error('Error loading decks:', error);
        showError('Failed to load decks. Please try again.');
    }
}

// Create new deck in Firebase
window.createNewDeck = async function() {
    console.log('Creating New Deck');
    const name = document.getElementById('newDeckName').value.trim();
    const description = document.getElementById('newDeckDescription').value.trim();
    const selectedIcon = document.querySelector('.icon-option.active');
    const icon = selectedIcon ? selectedIcon.dataset.icon : 'book';

    if (!name) {
        alert('Please enter a deck name.');
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        const deckData = {
            name,
            description,
            icon,
            createdAt: new Date(),
            cards: []
        };

        // Add deck to Firebase
        const deckRef = collection(db, `users/${userId}/decks`);
        const docRef = await addDoc(deckRef, deckData);
        
        // Add to local state
        const newDeck = {
            id: docRef.id,
            ...deckData
        };
        decks.unshift(newDeck);
        
        // Switch to new deck
        currentDeckIndex = 0;
        currentCardIndex = 0;
        
        // Update UI
        updateDeckList();
        updateDeckTitle();
        displayCard();
        
        // Close modal
        window.closeNewDeckModal();

        // Show success message
        showSuccessMessage('Deck created successfully!');
    } catch (error) {
        console.error('Error creating deck:', error);
        showError('Failed to create deck. Please try again.');
    }
};

// Switch deck function
window.switchDeck = function(deckId) {
    const deckIndex = decks.findIndex(deck => deck.id === deckId);
    if (deckIndex !== -1) {
        currentDeckIndex = deckIndex;
        currentCardIndex = 0;
        isReviewMode = false;
        wrongCards = [];
        correctCount = 0;
        wrongCount = 0;
        totalReviewRounds = 0;
        updateDeckList();
        updateDeckTitle();
        displayCard();
        updateProgress();
    }
};

// Update deck list in sidebar with icons
function updateDeckList() {
    const deckList = document.querySelector('.deck-list');
    if (!deckList) return;

    deckList.innerHTML = decks.map((deck, index) => `
        <div class="deck-item ${index === currentDeckIndex ? 'active' : ''}" 
             onclick="switchDeck('${deck.id}')">
            <div class="deck-item-content">
                <i class="fas fa-${deck.icon || 'book'}"></i>
                <span>${deck.name}</span>
            </div>
            <button class="delete-btn" onclick="deleteDeck('${deck.id}', event)" title="Delete deck">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Update deck title in header
function updateDeckTitle() {
    const titleElement = document.querySelector('.deck-title');
    if (titleElement && decks[currentDeckIndex]) {
        titleElement.textContent = decks[currentDeckIndex].name;
    }
}

// Initialize TinyMCE editors
function initializeEditors() {
    tinymce.init({
        selector: '.rich-editor',
        height: 200,
        menubar: false,
        statusbar: false,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'table', 'help', 'wordcount', 'autoresize'
        ],
        toolbar: [
            'styles | bold italic underline | alignleft aligncenter alignright | bullist numlist | forecolor backcolor',
            'latex-inline latex-block | undo redo | removeformat'
        ],
        toolbar_mode: 'wrap',
        content_style: `
            body { 
                font-family: Inter, system-ui, -apple-system, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                padding: 1rem;
            }
            p { margin: 0 0 1em 0; }
            .latex-block {
                display: block;
                margin: 1em 0;
                padding: 0.5em;
                background: #f8fafc;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
            }
            .latex-inline {
                padding: 0.2em 0.4em;
                background: #f1f5f9;
                border-radius: 4px;
            }
        `,
        style_formats: [
            { title: 'Paragraph', format: 'p' },
            { title: 'Heading 1', format: 'h1' },
            { title: 'Heading 2', format: 'h2' },
            { title: 'Heading 3', format: 'h3' }
        ],
        setup: function(editor) {
            // Add keyboard shortcuts
            editor.on('keydown', function(e) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    addNewCard();
                }
            });

            // Add custom buttons for LaTeX
            editor.ui.registry.addButton('latex-inline', {
                icon: '∫',
                text: 'Inline Math',
                tooltip: 'Insert inline LaTeX equation (Ctrl+L)',
                onAction: function() {
                    const selectedText = editor.selection.getContent() || 'x^2';
                    editor.insertContent(`$${selectedText}$`);
                }
            });

            editor.ui.registry.addButton('latex-block', {
                icon: '∫',
                text: 'Block Math',
                tooltip: 'Insert block LaTeX equation (Ctrl+Shift+L)',
                onAction: function() {
                    const selectedText = editor.selection.getContent() || 'f(x) = x^2';
                    editor.insertContent(`\n$$${selectedText}$$\n`);
                }
            });

            // Add keyboard shortcuts for LaTeX
            editor.addShortcut('ctrl+l', 'Insert inline LaTeX', function() {
                const selectedText = editor.selection.getContent() || 'x^2';
                editor.insertContent(`$${selectedText}$`);
            });
            
            editor.addShortcut('ctrl+shift+l', 'Insert block LaTeX', function() {
                const selectedText = editor.selection.getContent() || 'f(x) = x^2';
                editor.insertContent(`\n$$${selectedText}$$\n`);
            });
        },
        formats: {
            alignleft: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-left' },
            aligncenter: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-center' },
            alignright: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-right' },
        },
        browser_spellcheck: true,
        contextmenu: false,
        autoresize_bottom_margin: 20,
        placeholder: 'Start typing...',
        skin: 'oxide',
        content_css: 'default',
        entity_encoding: 'raw',
        verify_html: false
    });
}

// Add new card to Firebase with rich text support
window.addNewCard = async function() {
    const questionEditor = tinymce.get('newQuestion');
    const answerEditor = tinymce.get('newAnswer');
    
    if (!questionEditor || !answerEditor) {
        showError('Editor not initialized properly');
        return;
    }
    
    const question = questionEditor.getContent().trim();
    const answer = answerEditor.getContent().trim();
    const category = document.getElementById('newCardCategory').value;

    if (!question || !answer) {
        alert('Please fill in both question and answer fields.');
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        const currentDeck = decks[currentDeckIndex];
        
        const cardData = {
            question,
            answer,
            category,
            createdAt: new Date()
        };

        // Add card to Firebase
        const cardRef = collection(db, `users/${userId}/decks/${currentDeck.id}/cards`);
        const docRef = await addDoc(cardRef, cardData);
        
        // Add to local state
        const newCard = {
            id: docRef.id,
            ...cardData
        };
        currentDeck.cards.unshift(newCard);
        currentCardIndex = 0;
        
        // Update UI
        displayCard();
        updateProgress();

        // Close modal and reset editors
        closeAddCardModal();

        // Show success message
        showSuccessMessage('Card added successfully!');
    } catch (error) {
        console.error('Error adding card:', error);
        showError('Failed to add card. Please try again.');
    }
};

// Helper function to show success message
function showSuccessMessage(message) {
    const messageContent = messageOverlay.querySelector('p');
    const continueBtn = messageOverlay.querySelector('.continue-btn');
    
    messageContent.innerHTML = message;
    continueBtn.textContent = 'Continue';
    continueBtn.onclick = () => messageOverlay.classList.remove('active');
    
    messageOverlay.classList.add('active');
    setTimeout(() => messageOverlay.classList.remove('active'), 1500);
}

// Helper function to show error message
function showError(message) {
    alert(message); // You can replace this with a more sophisticated error UI
}

// Delete deck function
window.deleteDeck = async function(deckId, event) {
    // Prevent the click event from bubbling up to the deck item
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        await deleteDoc(doc(db, `users/${userId}/decks/${deckId}`));
        
        // Remove from local state
        const deckIndex = decks.findIndex(deck => deck.id === deckId);
        if (deckIndex !== -1) {
            decks.splice(deckIndex, 1);
            // If we deleted the current deck, switch to the first available deck
            if (currentDeckIndex === deckIndex) {
                currentDeckIndex = 0;
                currentCardIndex = 0;
            }
        }
        
        // Update UI
        updateDeckList();
        updateDeckTitle();
        displayCard();
        showSuccessMessage('Deck deleted successfully');
    } catch (error) {
        console.error('Error deleting deck:', error);
        showError('Failed to delete deck. Please try again.');
    }
};

// Delete card function
window.deleteCard = async function() {
    if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        const currentDeck = decks[currentDeckIndex];
        const currentCard = currentDeck.cards[currentCardIndex];

        await deleteDoc(doc(db, `users/${userId}/decks/${currentDeck.id}/cards/${currentCard.id}`));
        
        // Remove from local state
        currentDeck.cards.splice(currentCardIndex, 1);
        
        // Adjust current card index if necessary
        if (currentCardIndex >= currentDeck.cards.length) {
            currentCardIndex = Math.max(0, currentDeck.cards.length - 1);
        }
        
        // Update UI
        displayCard();
        updateProgress();
        showSuccessMessage('Card deleted successfully');
    } catch (error) {
        console.error('Error deleting card:', error);
        showError('Failed to delete card. Please try again.');
    }
};

// Add delete button to flashcard
function updateCardControls() {
    const controls = document.querySelector('.secondary-controls');
    if (!controls) return;

    // Add delete button if it doesn't exist
    if (!controls.querySelector('.delete-card-btn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger delete-card-btn';
        deleteBtn.onclick = deleteCard;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i><span>Delete Card</span>';
        controls.appendChild(deleteBtn);
    }
}