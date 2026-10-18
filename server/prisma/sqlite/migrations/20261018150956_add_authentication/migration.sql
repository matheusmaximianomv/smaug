-- CreateTable
CREATE TABLE "t_password_credentials" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "password_hash" TEXT NOT NULL,
    "pepper_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "t_password_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_auth_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "last_used_at" DATETIME NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "revoked_reason" TEXT,
    CONSTRAINT "t_auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "t_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "t_refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "parent_token_id" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "rotated_at" DATETIME,
    "revoked_at" DATETIME,
    CONSTRAINT "t_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "t_auth_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "i_auth_sessions_user_status" ON "t_auth_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "u_refresh_tokens_token_hash" ON "t_refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "u_refresh_tokens_parent" ON "t_refresh_tokens"("parent_token_id");

-- CreateIndex
CREATE INDEX "i_refresh_tokens_session_status" ON "t_refresh_tokens"("session_id", "status");
