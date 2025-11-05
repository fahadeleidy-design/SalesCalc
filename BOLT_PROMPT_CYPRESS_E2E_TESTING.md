```markdown
# Prompt: Implement Cypress E2E Testing for Quotation Workflow

## 1. Goal

To establish a robust End-to-End (E2E) testing suite using Cypress for the SalesCalc application. The initial focus is to cover the critical path of the main quotation workflow, ensuring its stability and preventing regressions.

## 2. Core Tasks

1.  **Install and Configure Cypress:** Set up the Cypress testing framework within the project.
2.  **Integrate with Supabase:** Create custom Cypress commands to handle Supabase authentication and data management (seeding/cleanup) for tests.
3.  **Write the First E2E Test:** Develop a test file that covers the entire quotation workflow from login to submission.
4.  **Update UI for Testability:** Add `data-cy` attributes to key UI elements to create reliable test selectors.

## 3. Detailed Implementation Steps

### Step 3.1: Cypress Setup

1.  **Install Cypress:**
    ```bash
    npm install cypress --save-dev
    ```

2.  **Add Package Scripts:** In `package.json`, add the following scripts:
    ```json
    "scripts": {
      // ... other scripts
      "cypress:open": "cypress open",
      "cypress:run": "cypress run"
    }
    ```

3.  **Configure Cypress:** Create a `cypress.config.ts` file in the project root and configure it:
    ```typescript
    import { defineConfig } from 'cypress';

    export default defineConfig({
      e2e: {
        baseUrl: 'http://localhost:5173', // Assuming Vite runs on this port
        setupNodeEvents(on, config) {
          // implement node event listeners here
        },
      },
    });
    ```

### Step 3.2: Supabase Integration & Custom Commands

This is the most critical part. We need to interact with Supabase for authentication and data management without relying on the UI.

1.  **Create Supabase Test Helper:** Create a file `cypress/support/supabase.ts` to contain helper functions for interacting with the Supabase client.

2.  **Add Custom Commands:** In `cypress/support/commands.ts`, create the following custom commands:

    -   **`cy.login(email, password)`:** This command will programmatically log in a user using the Supabase client, avoiding the need to interact with the UI login form. It should set the session cookie so the application is authenticated for subsequent test steps.

    -   **`cy.seedDatabase(fixture)`:** This command will call a Supabase Edge Function to seed the database with necessary test data (e.g., a test customer, a test product). It will take a fixture name as an argument.

    -   **`cy.cleanupDatabase()`:** This command will call a Supabase Edge Function to clean up any data created during the test run, ensuring tests are isolated.

    **Example `commands.ts`:**
    ```typescript
    // In cypress/support/commands.ts
    import { supabase } from './supabase'; // Your test Supabase client

    Cypress.Commands.add('login', (email, password) => {
      return supabase.auth.signInWithPassword({ email, password });
    });

    Cypress.Commands.add('seedDatabase', (fixture) => {
      // Logic to call a 'seed' Edge Function
    });

    Cypress.Commands.add('cleanupDatabase', () => {
      // Logic to call a 'cleanup' Edge Function
    });
    ```

3.  **Create Supabase Edge Functions for Testing:**
    -   Create a Supabase Edge Function named `seed-test-data` that accepts a payload to insert test customers, products, etc.
    -   Create a Supabase Edge Function named `cleanup-test-data` that truncates the relevant tables after a test run.

### Step 3.3: Add `data-cy` Attributes for Testability

To make tests less brittle, update the frontend components to include `data-cy` attributes for key interactive elements.

**Example in `Login.tsx`:**
```jsx
<input data-cy="login-email" type="email" />
<input data-cy="login-password" type="password" />
<button data-cy="login-submit">Sign In</button>
```

**Elements to Tag:**
-   Login form inputs and button.
-   Navigation links (e.g., `data-cy="nav-quotations"`).
-   "New Quotation" button (`data-cy="new-quotation-button"`).
-   Quotation form fields (customer combobox, title, product search, etc.).
-   "Save Quotation" and "Submit for Approval" buttons.

### Step 3.4: Write the Quotation Workflow E2E Test

Create the main test file at `cypress/e2e/quotation_workflow.cy.ts`.

```typescript
// cypress/e2e/quotation_workflow.cy.ts

describe('Main Quotation Workflow', () => {
  beforeEach(() => {
    // Seed the database with a test customer and product
    cy.seedDatabase('initial-data');
    // Log in as a test sales representative
    cy.login(Cypress.env('TEST_USER_EMAIL'), Cypress.env('TEST_USER_PASSWORD'));
    cy.visit('/');
  });

  afterEach(() => {
    // Clean up all test data
    cy.cleanupDatabase();
  });

  it('should allow a sales rep to create a new quotation, add an item, and submit it for approval', () => {
    // 1. Navigate to the quotations page
    cy.get('[data-cy=nav-quotations]').click();
    cy.url().should('include', '/quotations');

    // 2. Start a new quotation
    cy.get('[data-cy=new-quotation-button]').click();

    // 3. Fill out the form
    // Select a customer from the combobox
    cy.get('[data-cy=customer-combobox]').click();
    cy.get('[data-cy=customer-option-TestCustomer]').click();

    // Enter a title
    cy.get('[data-cy=quotation-title]').type('E2E Test Quotation');

    // 4. Add a product item
    cy.get('[data-cy=add-item-button]').click();
    cy.get('[data-cy=product-search-input]').type('Test Product');
    cy.get('[data-cy=product-option-TestProduct]').click();
    cy.get('[data-cy=item-quantity-input]').clear().type('5');

    // 5. Save the draft
    cy.get('[data-cy=save-quotation-button]').click();
    cy.contains('Quotation saved successfully').should('be.visible');

    // 6. Verify it appears in the list
    cy.contains('E2E Test Quotation').should('be.visible');
    cy.contains('Draft').should('be.visible');

    // 7. Submit for approval
    cy.get('[data-cy=submit-approval-button-E2E-Test-Quotation]').click();
    cy.contains('Quotation submitted for Manager approval').should('be.visible');

    // 8. Verify status change
    cy.get('[data-cy=status-badge-E2E-Test-Quotation]').should('contain.text', 'Pending Manager');
  });
});
```

## 4. Environment Variables

Create a `cypress.env.json` file in the project root to store non-sensitive test variables. **Do not commit this file to git.**

```json
{
  "TEST_USER_EMAIL": "sales@test.com",
  "TEST_USER_PASSWORD": "password123"
}
```

## 5. Final Deliverables

-   A working Cypress setup.
-   Custom commands for Supabase login and data management.
-   Supabase Edge Functions for seeding and cleaning test data.
-   A passing E2E test for the main quotation workflow.
-   `data-cy` attributes added to the relevant UI components.

By following these steps, you will have a foundational E2E testing suite that dramatically improves the quality and reliability of the SalesCalc application.
```
