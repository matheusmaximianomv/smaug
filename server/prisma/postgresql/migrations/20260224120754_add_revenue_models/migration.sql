-- CreateTable
CREATE TABLE "t_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_one_time_revenues" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "competence_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_one_time_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_fixed_revenues" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "start_month" INTEGER NOT NULL,
    "start_year" INTEGER NOT NULL,
    "end_month" INTEGER,
    "end_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_fixed_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_fixed_revenue_versions" (
    "id" TEXT NOT NULL,
    "fixed_revenue_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "effective_month" INTEGER NOT NULL,
    "effective_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_fixed_revenue_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_users_email_key" ON "t_users"("email");

-- CreateIndex
CREATE INDEX "i_one_time_revenues_user_competence" ON "t_one_time_revenues"("user_id", "competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "i_fixed_revenues_user_start" ON "t_fixed_revenues"("user_id", "start_year", "start_month");

-- CreateIndex
CREATE INDEX "i_fixed_revenue_versions_revenue_effective" ON "t_fixed_revenue_versions"("fixed_revenue_id", "effective_year", "effective_month");

-- AddForeignKey
ALTER TABLE "t_one_time_revenues" ADD CONSTRAINT "t_one_time_revenues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_fixed_revenues" ADD CONSTRAINT "t_fixed_revenues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_fixed_revenue_versions" ADD CONSTRAINT "t_fixed_revenue_versions_fixed_revenue_id_fkey" FOREIGN KEY ("fixed_revenue_id") REFERENCES "t_fixed_revenues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

