import 'cypress-file-upload';
const random = Math.round(Math.random() * 100000);
const expenseDescription = `New expense ${random}`;

const uploadReceipt = (dropzoneElement = '.InputTypeDropzone input') => {
  cy.fixture('./images/receipt.jpg').then(picture => {
    cy.get(dropzoneElement).upload({ fileContent: picture, fileName: 'receipt.jpg', mimeType: 'image/jpeg' });
  });
  cy.wait(900);
};

describe('new expense when logged out', () => {
  it('requires to login to submit an expense', () => {
    cy.visit('/testcollective/expenses');
    cy.containsInDataCy('submit-expense-btn', 'Submit Expense').click({ force: true });
    cy.get('.CreateExpenseForm').contains('Sign up or login to submit an expense');
    cy.get('#email').type('testuser+admin@opencollective.com');
    cy.get('[data-cy="signin-btn"]').click();
    cy.wait(2000);
    cy.get('.inputField.description', { timeout: 5000 });
  });
});

describe('new expense when logged in', () => {
  beforeEach(() => {
    cy.login({ redirect: '/testcollective/expenses/new' });
  });

  it('submits new expense paypal', () => {
    cy.get('.descriptionField input').type(expenseDescription);
    cy.get('.error').should('have.text', 'Amount must be greater than 0');
    cy.get('.amountField input').type(12);
    cy.get('.categoryField select').select('Team');
    cy.get('.error').should('have.text', 'Missing attachment');
    uploadReceipt();
    cy.get('.error').should('have.text', 'Please pick the type of this expense');
    cy.get('.expenseField select').select('RECEIPT');
    cy.get('.inputField.paypalEmail input').type('{selectall}{del}');
    cy.get('.error').should('have.text', 'Please provide your PayPal email address (or change the payout method)');
    cy.get('.inputField.paypalEmail input').type('paypal@test.com');
    cy.get('.inputField.privateMessage textarea').type('Some private note for the host');
    cy.get('button[type=submit]').click();
    cy.screenshot('expenseCreatedPaypalLoggedOut');
    cy.get('[data-cy="expenseCreated"]').contains('success');
    cy.get('[data-cy="viewAllExpenses"]').click();
    cy.wait(300);
    cy.get('.itemsList .expense', { timeout: 10000 });
    cy.get('.Expenses .expense:first .description').contains(expenseDescription);
    cy.get('.Expenses .expense:first .status').contains('pending');
    cy.get('.Expenses .expense:first .meta').contains('Team');
  });

  it('submits a new expense other, edit it and approve it', () => {
    cy.get('.descriptionField input').type(expenseDescription);
    cy.wait(300);
    cy.get('.amountField input', { timeout: 5000 }).type(12);
    cy.get('.payoutMethod.inputField select').select('other');
    uploadReceipt();
    cy.get('.expenseField select').select('RECEIPT');
    cy.wait(300);
    cy.get('.LoginTopBarProfileButton').contains('testuseradmin', {
      timeout: 15000,
    });
    cy.get('.inputField.privateMessage textarea').type('Some private note for the host');
    cy.get('button[type=submit]').click();
    cy.screenshot('expenseCreatedLoggedIn');
    cy.get('[data-cy="expenseCreated"]').contains('success');
    cy.get('[data-cy="viewAllExpenses"]').click();
    cy.wait(300);
    cy.get('.itemsList .expense', { timeout: 10000 });
    cy.get('.Expenses .expense:first .description').contains(expenseDescription);
    cy.get('.Expenses .expense:first .status').contains('pending');
    cy.get('.Expenses .expense:first .privateMessage').contains('Some private note for the host');
    cy.get('.Expenses .expense:first .ApproveExpenseBtn button').click();
    cy.get('.Expenses .expense:first .status').contains('approved');
    cy.screenshot('expenseApproved');
    cy.get('.Expenses .expense:first .toggleEditExpense').click();
    cy.get('.Expenses .expense:first .inputField.description input').type(' edited');
    cy.get('.Expenses .expense:first .inputField.amount input').type('{selectall}13');
    cy.get('.Expenses .expense:first .inputField.category select').select('Team');
    cy.get('.Expenses .expense:first .inputField.privateMessage textarea').type(
      '{selectall}Another private note (edited)',
    );
    cy.get('.Expenses .expense:first .inputField.description input').focus();
    cy.wait(300);
    cy.screenshot('editExpense');
    cy.get('.Expenses .expense:first button.save').click();
    cy.get('.Expenses .expense:first .status').contains('pending'); // editing an expense should switch status back to pending
    cy.get('.Expenses .expense:first .description').contains('edited');
    cy.get('.Expenses .expense:first .privateMessage').contains('edited');
    cy.get('.Expenses .expense:first .amount').contains('$13.00');
    cy.screenshot('expenseSaved');
    cy.get('.Expenses .expense:first .ApproveExpenseBtn button').click();
    cy.wait(300);
    cy.get('.Expenses .expense:first .status', { timeout: 5000 }).contains('approved');
  });
});

describe('Expense Comments', () => {
  let collective;
  let user;
  let expenseUrl;

  before(() => {
    cy.signup().then(response => (user = response));
  });

  before(() => {
    cy.createHostedCollective({ userEmail: user.email }).then(c => (collective = c));
  });

  beforeEach(() => {
    cy.createExpense({
      userEmail: user.email,
      user: { paypalEmail: 'paypal@test.com', id: user.id },
      collective: { id: collective.id },
    }).then(expense => (expenseUrl = `/${collective.slug}/expenses/${expense.id}`));
  });

  function SubmitComment(description) {
    cy.getByDataCy('CommentForm').within(() => {
      cy.get('.ql-editor')
        .type(description)
        .blur();
      cy.getByDataCy('SaveCommentButton').click();
    });
  }

  it('submits and edits a comment', () => {
    cy.visit(expenseUrl);
    // Submit comment
    SubmitComment('This is a first comment');

    const checkCommentWasSaved = description => {
      cy.get('.Comments .itemsList .comment').should('have.length', 1);
      cy.get('.Comments .itemsList .comment:first .description').contains(description);
    };

    // Make sure comment was saved on the frontend cache and the backend.
    checkCommentWasSaved('This is a first comment');
    cy.reload();
    checkCommentWasSaved('This is a first comment');

    // Edit the comment
    cy.get('.Comments .itemsList .comment:first').within(() => {
      cy.getByDataCy('ToggleEditComment').click();
      cy.get('.ql-editor')
        .clear()
        .type('Modifying my first comment');
      cy.getByDataCy('SaveEditionCommentButton').click();
    });

    // Make sure comment was saved on the frontend cache and the backend.
    checkCommentWasSaved('Modifying my first comment');
    cy.reload();
    checkCommentWasSaved('Modifying my first comment');
  });

  it('loads more comments', () => {
    cy.login({ email: user.email, redirect: expenseUrl });
    const TOTAL_COMMENTS = 25;
    const COMMENTS_PER_PAGE = 10;

    // Submit a bunch of comments
    for (let i = 0; i < TOTAL_COMMENTS; i++) {
      SubmitComment(i);
    }
    cy.reload();

    const checkCommentCount = count => cy.get('.Comments .itemsList .comment').should('have.length', count);

    // Check there is the amount of comments per page.
    checkCommentCount(COMMENTS_PER_PAGE);

    // Load more comments
    cy.getByDataCy('LoadMoreButton').click();

    // Check there is the double of the amount of comments per page.
    checkCommentCount(COMMENTS_PER_PAGE * 2);

    // Load more comments
    cy.getByDataCy('LoadMoreButton').click();

    // Check there is the total amount of comments.
    checkCommentCount(TOTAL_COMMENTS);
  });
});
