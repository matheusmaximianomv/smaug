# Feature Specification: Implementação da Interface Web

**Feature Branch**: `005-implementacao-web`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "Implementação da Interface Web - Next.js App Router para Smaug"

## Clarifications

### Session 2026-04-28

- Q: Como a URL base da API deve ser configurada para diferentes ambientes (desenvolvimento, produção)? → A: Usar variáveis de ambiente (.env.local, .env.production) para configurar URL base da API por ambiente
- Q: Como deve funcionar a persistência de sessão do usuário? → A: Sessão sem expiração automática - persiste indefinidamente até logout manual do usuário
- Q: Qual o comportamento visual durante o carregamento inicial de dados? → A: Skeleton screens (placeholders animados) que mantêm a estrutura da página durante carregamento
- Q: Como tratar erros quando múltiplas requisições falham simultaneamente? → A: Toast/notificação não-bloqueante com botão de retry, desaparece automaticamente após alguns segundos
- Q: Como exibir rótulos dos meses no gráfico semestral quando há transição de ano? → A: Formato "Mês/Ano" (ex: "Out/25", "Nov/25", "Dez/25", "Jan/26", "Fev/26", "Mar/26") sempre
- Q: Quando exatamente mostrar erros de validação em formulários? → A: Validar onChange com debounce de 500ms - espera usuário parar de digitar antes de validar
- Q: Qual estratégia de cache do React Query usar (stale time e cache time)? → A: Stale time de 30 segundos e cache time de 5 minutos - equilibra performance e atualização
- Q: Qual conteúdo e ações incluir nos estados vazios (empty states)? → A: Ilustração + mensagem descritiva + botão de ação primária (ex: "Adicionar primeira receita")
- Q: Qual formato usar para exibir valores monetários? → A: R$ 1.234,56 (padrão brasileiro com símbolo, separador de milhar e 2 casas decimais)
- Q: Qual nível de acessibilidade implementar para navegação por teclado e leitores de tela? → A: Acessibilidade básica - navegação por Tab, Enter/Escape em modais, labels semânticos HTML

## User Scenarios & Testing _(mandatory)_

### User Story 1 - User Authentication and Onboarding (Priority: P1)

A new user needs to register in the system and an existing user needs to access their financial dashboard using their user ID.

**Why this priority**: Without authentication, no other functionality is accessible. This is the entry point for all users and must be implemented first to enable testing of all other features.

**Independent Test**: Can be fully tested by creating a new user account, receiving a user ID, and logging in with that ID to access the dashboard. Delivers immediate value by allowing users to access the system.

**Acceptance Scenarios**:

1. **Given** I am a new user, **When** I access the registration page and provide my name and email, **Then** the system creates my account and displays my unique user ID for me to copy
2. **Given** I have a user ID, **When** I enter it on the login page, **Then** the system authenticates me and redirects me to the dashboard
3. **Given** I am logged in, **When** I close the browser and return later, **Then** my session persists and I remain logged in
4. **Given** I enter an invalid user ID, **When** I attempt to login, **Then** the system displays an error message

---

### User Story 2 - Financial Dashboard Overview (Priority: P1)

A user needs to view their monthly financial summary including revenues, expenses, and balance for the current month and navigate between different months.

**Why this priority**: The dashboard is the primary interface where users get an overview of their financial situation. It's the most frequently accessed screen and provides the foundation for understanding all other data.

**Independent Test**: Can be fully tested by logging in and viewing the dashboard with KPIs, charts, and summary tables. Delivers immediate value by showing the user's current financial status.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I view the dashboard, **Then** I see KPI cards showing total revenues, total expenses, and balance for the current month
2. **Given** I am viewing the dashboard, **When** I click the month navigator arrows, **Then** the dashboard updates to show data for the selected month
3. **Given** I am viewing a future month, **When** the dashboard loads, **Then** I see a "Projeção" badge indicating projected data
4. **Given** I am viewing the dashboard, **When** I look at the semester chart, **Then** I see bars for 3 past months, current month, and 2 future months with future months displayed with a hatched pattern
5. **Given** I am viewing the dashboard, **When** I see the expense breakdown, **Then** expenses are grouped by category with progress bars showing proportions

---

### User Story 3 - One-Time Revenue Management (Priority: P2)

A user needs to create, view, edit, and delete one-time revenues for current and future months.

**Why this priority**: Revenue management is a core feature. One-time revenues are simpler than fixed revenues and should be implemented first to establish the CRUD pattern.

**Independent Test**: Can be fully tested by creating a one-time revenue for the current month, editing it, viewing it in the list, and deleting it. Delivers value by allowing users to track irregular income.

**Acceptance Scenarios**:

1. **Given** I am on the revenues page, **When** I click "Add One-Time Revenue" and fill in description, amount, and competence month, **Then** the revenue is created and appears in the list
2. **Given** I have a one-time revenue for a future month, **When** I click edit and change the amount, **Then** the revenue is updated
3. **Given** I have a one-time revenue for a past month, **When** I attempt to edit or delete it, **Then** the system blocks the action and shows an error message
4. **Given** I am viewing one-time revenues, **When** I filter by a specific month, **Then** only revenues for that month are displayed

---

### User Story 4 - Fixed Revenue Management with Versioning (Priority: P2)

A user needs to create fixed revenues (recurring monthly income) with support for alterable and unalterable modalities, version history, and early termination.

**Why this priority**: Fixed revenues represent stable income sources like salaries. The versioning system is complex and foundational for understanding how recurring financial items work.

**Independent Test**: Can be fully tested by creating a fixed revenue, adding a new version (if alterable), viewing version history, and terminating it early. Delivers value by tracking regular income with historical changes.

**Acceptance Scenarios**:

1. **Given** I am on the revenues page, **When** I create a fixed revenue with modality "alterable", start date, and optional end date, **Then** the revenue is created with an initial version
2. **Given** I have an alterable fixed revenue, **When** I add a new version with a future effective date, **Then** the new version is created and will apply from that date forward
3. **Given** I have an unalterable fixed revenue, **When** I attempt to add a new version, **Then** the system blocks the action
4. **Given** I have a fixed revenue, **When** I click "View History", **Then** I see all versions in a timeline modal
5. **Given** I have an active fixed revenue, **When** I terminate it with an end date, **Then** the revenue stops applying after that month

---

### User Story 5 - One-Time Expense Management (Priority: P2)

A user needs to create, view, edit, and delete one-time expenses for current and future months, with category assignment.

**Why this priority**: Expense tracking is as important as revenue tracking. One-time expenses establish the basic expense management pattern before more complex types.

**Independent Test**: Can be fully tested by creating a one-time expense with a category, editing it, and deleting it. Delivers value by allowing users to track irregular expenses.

**Acceptance Scenarios**:

1. **Given** I am on the expenses page, **When** I create a one-time expense with description, amount, category, and competence month, **Then** the expense is created
2. **Given** I have a one-time expense for a future month, **When** I edit it to change the category, **Then** the expense is updated
3. **Given** I have a one-time expense for a past month, **When** I attempt to edit or delete it, **Then** the system blocks the action
4. **Given** I am viewing expenses, **When** I filter by month, **Then** only expenses for that month are displayed

---

### User Story 6 - Installment Expense Management (Priority: P3)

A user needs to create installment expenses that automatically generate monthly installments, view installment progress, and terminate installments early.

**Why this priority**: Installment expenses are common for purchases. While important, they can be implemented after basic expense management is working.

**Independent Test**: Can be fully tested by creating an installment expense, viewing the generated installments in a modal, and terminating future installments. Delivers value by tracking purchases paid over time.

**Acceptance Scenarios**:

1. **Given** I am on the expenses page, **When** I create an installment expense with total amount, number of installments, start month, and category, **Then** the system generates all installments automatically
2. **Given** I have an installment expense, **When** I view its details, **Then** I see a progress bar showing paid vs. remaining installments
3. **Given** I have an installment expense, **When** I click "View Installments", **Then** I see a modal listing all installments with their months and amounts
4. **Given** I have an installment expense with future installments, **When** I terminate it early, **Then** future installments are removed
5. **Given** I have an installment expense with past installments, **When** I attempt to delete it, **Then** the system blocks the action

---

### User Story 7 - Recurring Expense Management with Versioning (Priority: P3)

A user needs to create recurring expenses (monthly bills) with category assignment, version history, and early termination.

**Why this priority**: Recurring expenses work like fixed revenues but with categories. They complete the expense management feature set.

**Independent Test**: Can be fully tested by creating a recurring expense, adding new versions, viewing history, and terminating it. Delivers value by tracking regular bills with historical changes.

**Acceptance Scenarios**:

1. **Given** I am on the expenses page, **When** I create a recurring expense with description, amount, category, start date, and optional end date, **Then** the expense is created with an initial version
2. **Given** I have a recurring expense, **When** I add a new version with different amount or category, **Then** the new version applies from the effective date
3. **Given** I have a recurring expense, **When** I view its history, **Then** I see all versions in a timeline
4. **Given** I have an active recurring expense, **When** I terminate it with an end date, **Then** it stops applying after that month

---

### User Story 8 - Expense Category Management (Priority: P2)

A user needs to create, edit, and delete expense categories, with protection against deleting categories that have linked expenses.

**Why this priority**: Categories are required for expense management. They should be implemented early but can be done in parallel with basic expense features.

**Independent Test**: Can be fully tested by creating categories, attempting to delete a category with linked expenses, and successfully deleting an unused category. Delivers value by organizing expenses.

**Acceptance Scenarios**:

1. **Given** I am on the categories page, **When** I create a new category with a name, **Then** the category is created
2. **Given** I have a category, **When** I edit its name, **Then** the category is updated
3. **Given** I have a category with linked expenses, **When** I attempt to delete it, **Then** the system shows a modal warning and blocks deletion
4. **Given** I have a category without linked expenses, **When** I delete it, **Then** the category is removed
5. **Given** I am viewing categories, **When** I see each category card, **Then** I see a counter showing how many expenses are linked to it

---

### User Story 9 - Version History Timeline (Priority: P3)

A user needs to view a comprehensive history of all versions of fixed revenues and recurring expenses, grouped by month, with filtering options.

**Why this priority**: The history view provides audit trail and transparency. It's valuable but not critical for day-to-day operations.

**Independent Test**: Can be fully tested by creating versioned items and viewing them in the history timeline with filters. Delivers value by providing historical insight into financial changes.

**Acceptance Scenarios**:

1. **Given** I am on the history page, **When** I view the timeline, **Then** I see all versions of fixed revenues and recurring expenses grouped by effective month
2. **Given** I am viewing history, **When** I apply the "Fixed Revenues Only" filter, **Then** only fixed revenue versions are displayed
3. **Given** I am viewing history, **When** I apply the "Recurring Expenses Only" filter, **Then** only recurring expense versions are displayed
4. **Given** I am viewing history, **When** I select "All", **Then** both fixed revenues and recurring expenses are displayed

---

### User Story 10 - Responsive Mobile Experience (Priority: P2)

A user needs to access all functionality on mobile devices with an optimized interface including bottom navigation and horizontal scrolling tables.

**Why this priority**: Mobile access is increasingly important for financial management. The responsive design should be built in from the start rather than retrofitted.

**Independent Test**: Can be fully tested by accessing the application on a mobile device and verifying all features work with the mobile navigation. Delivers value by enabling on-the-go financial management.

**Acceptance Scenarios**:

1. **Given** I am on a mobile device (≤768px), **When** I access the application, **Then** the sidebar is hidden and a bottom navigation bar with 5 icons is displayed
2. **Given** I am on mobile, **When** I tap the hamburger menu, **Then** the sidebar slides in from the left
3. **Given** I am viewing a table on mobile, **When** the table is wider than the screen, **Then** I can scroll horizontally to see all columns
4. **Given** I am on desktop (>768px), **When** I access the application, **Then** the sidebar is fixed at 236px width and always visible

---

### Edge Cases

- What happens when a user navigates to a month far in the future (e.g., 5 years ahead)? The system should calculate projections based on active fixed revenues and recurring expenses.
- What happens when a user has no data for a selected month? The system should display empty states with illustration, descriptive message, and primary action button (e.g., "Adicionar primeira receita").
- What happens when the API is unavailable? The system should display toast notifications (non-blocking) with retry button that disappear automatically.
- What happens when a fixed revenue or recurring expense has multiple versions effective in the same month? The system should use the version with the latest effective date that is still ≤ the target month.
- What happens when installment calculations result in rounding differences? The first installment should absorb any cent differences to ensure the total matches exactly, formatted as R$ 1.234,56.
- What happens when a user tries to create a revenue or expense for a past month? The system should block the action and display a clear error message via toast notification.
- What happens when a user deletes a category that was previously used but no longer has active expenses? The system should allow deletion since there are no current links.
- What happens when network requests fail during form submission? The system should preserve form data and allow the user to retry without re-entering information.
- What happens when a user's session expires? Sessions do not expire automatically - they persist indefinitely until manual logout.
- What happens when viewing the semester chart and the current month is January? The system should handle the year boundary correctly using "Mês/Ano" format (e.g., "Out/25", "Nov/25", "Dez/25", "Jan/26", "Fev/26", "Mar/26").
- What happens during initial page load? The system should display skeleton screens (animated placeholders) that maintain the page structure until data loads.
- What happens when a user types in a form field? The system should validate onChange with 500ms debounce to avoid showing errors while the user is still typing.

## Requirements _(mandatory)_

### Functional Requirements

#### Authentication & User Management

- **FR-001**: System MUST provide a registration page where users can create an account by entering their name and email
- **FR-002**: System MUST generate and display a unique user ID upon successful registration that users can copy
- **FR-003**: System MUST provide a login page where users authenticate using their user ID
- **FR-004**: System MUST persist user authentication state in browser local storage without automatic expiration
- **FR-005**: System MUST validate user ID format and existence before allowing access to protected pages
- **FR-006**: System MUST redirect unauthenticated users to the login page when attempting to access protected routes
- **FR-077**: System MUST configure API base URL using environment variables (.env.local for development, .env.production for production)

#### Dashboard & Navigation

- **FR-007**: System MUST display a dashboard with KPI cards showing total revenues, total expenses, and balance for the selected month
- **FR-008**: System MUST provide a month navigator with left/right arrows to navigate between months
- **FR-009**: System MUST display a badge indicating whether the selected month is past, current, or future (projection)
- **FR-010**: System MUST display a semester bar chart showing revenues and expenses for 3 past months, current month, and 2 future months
- **FR-011**: System MUST visually distinguish future months in the chart using a hatched pattern
- **FR-012**: System MUST display an expense breakdown by category with progress bars showing proportions
- **FR-013**: System MUST display summary tables of revenues and expenses for the selected month on the dashboard
- **FR-014**: System MUST provide navigation between Dashboard, Receitas, Despesas, Categorias, and Histórico pages
- **FR-078**: System MUST display month labels in the semester chart using "Mês/Ano" format (e.g., "Jan/26", "Fev/26") to handle year transitions clearly
- **FR-079**: System MUST display skeleton screens (animated placeholders) during initial data loading to maintain page structure
- **FR-080**: System MUST display empty states with illustration, descriptive message, and primary action button when no data exists

#### One-Time Revenues

- **FR-015**: System MUST allow users to create one-time revenues with description, amount, and competence month/year
- **FR-016**: System MUST allow users to edit one-time revenues for current or future months only
- **FR-017**: System MUST allow users to delete one-time revenues for current or future months only
- **FR-018**: System MUST block creation, editing, and deletion of one-time revenues for past months
- **FR-019**: System MUST display one-time revenues in a filterable list

#### Fixed Revenues

- **FR-020**: System MUST allow users to create fixed revenues with description, amount, modality (alterable/unalterable), start month/year, and optional end month/year
- **FR-021**: System MUST create an initial version automatically when a fixed revenue is created
- **FR-022**: System MUST allow users to add new versions to alterable fixed revenues with new description, amount, and effective month/year
- **FR-023**: System MUST block adding new versions to unalterable fixed revenues
- **FR-024**: System MUST allow users to view version history for fixed revenues in a timeline modal
- **FR-025**: System MUST allow users to terminate fixed revenues early by setting an end month/year
- **FR-026**: System MUST allow users to delete fixed revenues
- **FR-027**: System MUST calculate which version of a fixed revenue applies to a given month based on effective dates

#### One-Time Expenses

- **FR-028**: System MUST allow users to create one-time expenses with description, amount, category, and competence month/year
- **FR-029**: System MUST allow users to edit one-time expenses for current or future months only
- **FR-030**: System MUST allow users to delete one-time expenses for current or future months only
- **FR-031**: System MUST block creation, editing, and deletion of one-time expenses for past months
- **FR-032**: System MUST display one-time expenses in a filterable list with category information

#### Installment Expenses

- **FR-033**: System MUST allow users to create installment expenses with description, total amount, number of installments (1-72), start month/year, and category
- **FR-034**: System MUST automatically generate individual installments distributed across consecutive months
- **FR-035**: System MUST calculate installment amounts as Math.floor(total \* 100 / n) / 100 with cent differences added to the first installment
- **FR-036**: System MUST display a progress bar showing paid vs. remaining installments
- **FR-037**: System MUST allow users to view all installments in a modal with month and amount details
- **FR-038**: System MUST allow users to update description and category for installment expenses (propagates to all installments)
- **FR-039**: System MUST block modification of financial attributes (total amount, installment count) for installment expenses
- **FR-040**: System MUST allow users to terminate installment expenses early, removing future installments
- **FR-041**: System MUST allow users to delete installment expenses only if no installments are in past months
- **FR-042**: System MUST block creation of installment expenses starting in past months

#### Recurring Expenses

- **FR-043**: System MUST allow users to create recurring expenses with description, amount, category, start month/year, and optional end month/year
- **FR-044**: System MUST create an initial version automatically when a recurring expense is created
- **FR-045**: System MUST allow users to add new versions to recurring expenses with new description, amount, category, and effective month/year
- **FR-046**: System MUST allow users to view version history for recurring expenses in a timeline modal
- **FR-047**: System MUST allow users to terminate recurring expenses early by setting an end month/year
- **FR-048**: System MUST allow users to delete recurring expenses
- **FR-049**: System MUST calculate which version of a recurring expense applies to a given month based on effective dates

#### Expense Categories

- **FR-050**: System MUST allow users to create expense categories with a unique name
- **FR-051**: System MUST allow users to edit category names
- **FR-052**: System MUST block deletion of categories that have linked expenses
- **FR-053**: System MUST allow deletion of categories without linked expenses
- **FR-054**: System MUST display a counter on each category card showing the number of linked expenses
- **FR-055**: System MUST show a warning modal when attempting to delete a category with linked expenses

#### Version History

- **FR-056**: System MUST display a timeline of all versions of fixed revenues and recurring expenses
- **FR-057**: System MUST group version history entries by effective month/year
- **FR-058**: System MUST provide filters to show all items, fixed revenues only, or recurring expenses only
- **FR-059**: System MUST display version details including description, amount, category (for expenses), and effective date

#### Data Synchronization

- **FR-060**: System MUST use React Query for caching and synchronizing data with the REST API
- **FR-061**: System MUST automatically refetch data when navigating between months
- **FR-062**: System MUST optimistically update the UI when creating, editing, or deleting items
- **FR-063**: System MUST handle API errors gracefully and display user-friendly error messages
- **FR-064**: System MUST retry failed requests with exponential backoff
- **FR-081**: System MUST configure React Query with stale time of 30 seconds and cache time of 5 minutes
- **FR-082**: System MUST display toast notifications (non-blocking) with retry button when API errors occur

#### Forms & Validation

- **FR-065**: System MUST use React Hook Form for all form management
- **FR-066**: System MUST use Zod schemas for form validation matching API contracts
- **FR-067**: System MUST display inline validation errors as users type
- **FR-068**: System MUST prevent form submission when validation errors exist
- **FR-069**: System MUST preserve form data when API requests fail to allow retry
- **FR-083**: System MUST validate form fields onChange with 500ms debounce to avoid intrusive validation during typing

#### Design & Responsiveness

- **FR-070**: System MUST replicate the exact visual design from the HTML prototype including colors, typography, spacing, and layout
- **FR-071**: System MUST use the specified design tokens (colors, fonts, dimensions)
- **FR-072**: System MUST display a fixed sidebar of 236px width on desktop (>768px)
- **FR-073**: System MUST hide the sidebar and show a bottom navigation bar with 5 icons on mobile (≤768px)
- **FR-074**: System MUST provide a hamburger menu on mobile to toggle the sidebar
- **FR-075**: System MUST enable horizontal scrolling for tables on mobile devices
- **FR-076**: System MUST use Shadcn/ui components as a base, customized to match the design
- **FR-084**: System MUST format all monetary values as R$ 1.234,56 (Brazilian standard with currency symbol, thousand separator, and 2 decimal places)
- **FR-085**: System MUST implement basic accessibility including Tab navigation, Enter/Escape for modals, and semantic HTML labels

### Key Entities

- **User**: Represents a system user with name, email, and unique ID. Created during registration and used for authentication.

- **One-Time Revenue**: A single revenue entry for a specific month with description and amount. Can be edited or deleted only for current/future months.

- **Fixed Revenue**: A recurring monthly revenue with modality (alterable/unalterable), validity period, and version history. Alterable revenues can have multiple versions with different effective dates.

- **Fixed Revenue Version**: A specific version of a fixed revenue with description, amount, and effective month/year. The active version for a month is determined by the latest effective date ≤ that month.

- **One-Time Expense**: A single expense entry for a specific month with description, amount, and category. Can be edited or deleted only for current/future months.

- **Installment Expense**: An expense paid over multiple months with total amount, installment count, start month, and category. Generates individual installments automatically.

- **Installment**: An individual payment within an installment expense, with installment number, amount, and competence month.

- **Recurring Expense**: A recurring monthly expense with category, validity period, and version history. Can have multiple versions with different effective dates.

- **Recurring Expense Version**: A specific version of a recurring expense with description, amount, category, and effective month/year.

- **Expense Category**: A user-defined category for organizing expenses. Cannot be deleted if expenses are linked to it.

- **Month Competence**: A specific month/year combination used to filter and organize financial data. Determines whether data is past (historical), current (actual), or future (projected).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can complete registration and login in under 1 minute
- **SC-002**: Users can view their current month financial summary (dashboard) within 2 seconds of login
- **SC-003**: Users can create a new one-time revenue or expense in under 30 seconds
- **SC-004**: Users can navigate between months and see updated data within 1 second
- **SC-005**: The visual design matches the HTML prototype with 100% fidelity (colors, spacing, typography, layout)
- **SC-006**: All forms validate input in real-time with errors displayed within 100ms of user input
- **SC-007**: The application is fully functional on mobile devices (≤768px) with all features accessible
- **SC-008**: Users can view version history for fixed revenues and recurring expenses and understand changes over time
- **SC-009**: The application handles API errors gracefully without crashing, displaying actionable error messages
- **SC-010**: Users can successfully complete all CRUD operations for all entity types without confusion
- **SC-011**: The semester chart correctly displays past, current, and future months with appropriate visual distinction
- **SC-012**: Category deletion is blocked when expenses are linked, with a clear explanation provided to users
- **SC-013**: Installment calculations are accurate with no rounding errors in total amounts
- **SC-014**: Users can access the application on desktop and mobile with a consistent experience adapted to each form factor
