-- CreateTable
CREATE TABLE "t_expense_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_lower" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_expense_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_one_time_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "competence_year" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_one_time_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "t_one_time_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "t_expense_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_installment_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "total_amount" REAL NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "start_month" INTEGER NOT NULL,
    "start_year" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_installment_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "t_installment_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "t_expense_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_installments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "installment_expense_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "competence_year" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "t_installments_installment_expense_id_fkey" FOREIGN KEY ("installment_expense_id") REFERENCES "t_installment_expenses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_recurring_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "start_month" INTEGER NOT NULL,
    "start_year" INTEGER NOT NULL,
    "end_month" INTEGER,
    "end_year" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_recurring_expense_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurring_expense_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "effective_month" INTEGER NOT NULL,
    "effective_year" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "t_recurring_expense_versions_recurring_expense_id_fkey" FOREIGN KEY ("recurring_expense_id") REFERENCES "t_recurring_expenses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "t_recurring_expense_versions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "t_expense_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "i_expense_categories_user" ON "t_expense_categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "u_expense_categories_user_name_lower" ON "t_expense_categories"("user_id", "name_lower");

-- CreateIndex
CREATE INDEX "i_one_time_expenses_user_competence" ON "t_one_time_expenses"("user_id", "competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "i_installment_expenses_user" ON "t_installment_expenses"("user_id");

-- CreateIndex
CREATE INDEX "i_installments_expense" ON "t_installments"("installment_expense_id");

-- CreateIndex
CREATE INDEX "i_installments_competence" ON "t_installments"("competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "i_recurring_expenses_user_start" ON "t_recurring_expenses"("user_id", "start_year", "start_month");

-- CreateIndex
CREATE INDEX "i_recurring_expense_versions_expense_effective" ON "t_recurring_expense_versions"("recurring_expense_id", "effective_year", "effective_month");
