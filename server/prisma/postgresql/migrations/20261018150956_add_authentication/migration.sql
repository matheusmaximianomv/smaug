-- CreateTable
CREATE TABLE "t_password_credentials" (
    "user_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "pepper_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_password_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "t_auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "t_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_refresh_tokens" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "parent_token_id" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "rotated_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "t_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "i_auth_sessions_user_status" ON "t_auth_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "u_refresh_tokens_token_hash" ON "t_refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "u_refresh_tokens_parent" ON "t_refresh_tokens"("parent_token_id");

-- CreateIndex
CREATE INDEX "i_refresh_tokens_session_status" ON "t_refresh_tokens"("session_id", "status");

-- AddForeignKey
ALTER TABLE "t_password_credentials" ADD CONSTRAINT "t_password_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_auth_sessions" ADD CONSTRAINT "t_auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_refresh_tokens" ADD CONSTRAINT "t_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "t_auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
