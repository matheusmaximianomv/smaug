import { describe, it, expect, vi } from "vitest";
import { UserService } from "@src/application/services/user.service";
import { User } from "@src/domain/entities/user.entity";
import type { GetUserUseCase } from "@src/domain/use-cases/user/get-user.use-case";

const CREATED_AT = new Date("2026-10-18T12:00:00.000Z");

describe("UserService", () => {
  it("should return the response DTO of the requested user", async () => {
    const user = User.create({ name: "Ana", email: "ana@exemplo.com", createdAt: CREATED_AT });
    const getUserUseCase = { execute: vi.fn().mockResolvedValue(user) };
    const service = new UserService(getUserUseCase as unknown as GetUserUseCase);

    const result = await service.getProfile(user.id);

    expect(getUserUseCase.execute).toHaveBeenCalledWith(user.id);
    expect(result).toEqual({
      id: user.id,
      name: "Ana",
      email: "ana@exemplo.com",
      createdAt: CREATED_AT.toISOString(),
    });
  });
});
