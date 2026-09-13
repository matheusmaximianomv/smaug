import { vi, type Mock } from "vitest";
import type { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import type { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";

/** Cada método do port vira um `vi.fn()` que continua satisfazendo a assinatura original. */
export type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K];
};

export function createFixedRevenueRepositoryMock(): Mocked<FixedRevenueRepository> {
  return {
    findById: vi.fn(),
    findByIdWithVersions: vi.fn(),
    findAllByUser: vi.fn(),
    findActiveForCompetence: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addVersion: vi.fn(),
    findVersionsForRevenue: vi.fn(),
    findVersionForMonth: vi.fn(),
  } as unknown as Mocked<FixedRevenueRepository>;
}

export function createOneTimeRevenueRepositoryMock(): Mocked<OneTimeRevenueRepository> {
  return {
    findById: vi.fn(),
    findAllByUser: vi.fn(),
    findByUserAndCompetence: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as Mocked<OneTimeRevenueRepository>;
}
