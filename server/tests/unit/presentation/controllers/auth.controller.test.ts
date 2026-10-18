import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextFunction } from "express";
import { AuthController } from "@src/presentation/controllers/auth.controller";
import type { AuthService } from "@src/application/services/auth.service";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenConflictError,
} from "@src/domain/errors/domain-error";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
  type ServiceMock,
} from "../../../helpers/controller-contract";
import {
  createRequestMock,
  createResponseMock,
  type ResponseMock,
} from "../../../helpers/http-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const REFRESH_EXPIRES_AT = new Date("2026-10-25T12:00:00.000Z");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = { name: "smaug_refresh", secure: true, path: "/api/auth" };
const ATTRIBUTES = { httpOnly: true, secure: true, sameSite: "strict", path: "/api/auth" };

const response = {
  accessToken: "access-token",
  tokenType: "Bearer",
  expiresIn: 600,
  user: { id: "user-1", name: "Ana", email: "ana@exemplo.com", createdAt: "2026-01-01" },
};
const result = { response, refreshToken: "refresh-1", refreshTokenExpiresAt: REFRESH_EXPIRES_AT };
const registerBody = { name: "Ana", email: "ana@exemplo.com", password: "correct horse battery" };
const loginBody = { email: "ana@exemplo.com", password: "correct horse battery" };

const decorateResponse = (res: ResponseMock): void => {
  Object.assign(res, { cookie: vi.fn(() => res), clearCookie: vi.fn(() => res) });
};

const buildController = (service: ServiceMock, cookie = COOKIE): ControllerMock =>
  new AuthController(service as unknown as AuthService, cookie) as unknown as ControllerMock;

describeControllerContract(
  "AuthController",
  () => {
    const service = createServiceMock([
      "register",
      "loginWithPassword",
      "refresh",
      "logout",
      "logoutAll",
    ]);
    return { service, controller: buildController(service), decorateResponse };
  },
  [
    {
      method: "register",
      delegatesTo: "register",
      request: { body: registerBody },
      expectedArgs: [registerBody],
      successStatus: 201,
      successResult: result,
      successBody: response,
      mappedErrors: [{ error: new EmailAlreadyExistsError("ana@exemplo.com"), status: 409 }],
    },
    {
      method: "login",
      delegatesTo: "loginWithPassword",
      request: { body: loginBody },
      expectedArgs: [loginBody],
      successStatus: 200,
      successResult: result,
      successBody: response,
      mappedErrors: [{ error: new InvalidCredentialsError(), status: 401 }],
    },
    {
      method: "refresh",
      delegatesTo: "refresh",
      request: { cookies: { smaug_refresh: "refresh-0" } },
      expectedArgs: ["refresh-0"],
      successStatus: 200,
      successResult: result,
      successBody: response,
      mappedErrors: [
        { error: new InvalidRefreshTokenError(), status: 401 },
        { error: new RefreshTokenConflictError(), status: 409 },
      ],
    },
    {
      method: "logout",
      delegatesTo: "logout",
      request: { cookies: { smaug_refresh: "refresh-0" }, sessionId: "session-1" },
      expectedArgs: [{ refreshToken: "refresh-0", sessionId: "session-1" }],
      successStatus: 204,
    },
    {
      method: "logoutAll",
      delegatesTo: "logoutAll",
      expectedArgs: ["user-1"],
      successStatus: 204,
    },
  ],
);

describe("AuthController refresh cookie", () => {
  let service: ServiceMock;
  let controller: ControllerMock;
  let res: ResponseMock & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
  let next: NextFunction;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    service = createServiceMock([
      "register",
      "loginWithPassword",
      "refresh",
      "logout",
      "logoutAll",
    ]);
    controller = buildController(service);
    res = createResponseMock() as typeof res;
    decorateResponse(res);
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set the HttpOnly, SameSite=Strict cookie with Max-Age up to the token expiry on register", async () => {
    service.register.mockResolvedValue(result);

    await controller.register(createRequestMock({ body: registerBody }), res, next);

    expect(res.cookie).toHaveBeenCalledWith("smaug_refresh", "refresh-1", {
      ...ATTRIBUTES,
      maxAge: SEVEN_DAYS_MS,
    });
  });

  it("should set the rotated cookie on login and refresh", async () => {
    service.loginWithPassword.mockResolvedValue(result);
    service.refresh.mockResolvedValue({ ...result, refreshToken: "refresh-2" });

    await controller.login(createRequestMock({ body: loginBody }), res, next);
    await controller.refresh(
      createRequestMock({ cookies: { smaug_refresh: "refresh-1" } }),
      res,
      next,
    );

    expect(res.cookie).toHaveBeenNthCalledWith(1, "smaug_refresh", "refresh-1", expect.any(Object));
    expect(res.cookie).toHaveBeenNthCalledWith(2, "smaug_refresh", "refresh-2", expect.any(Object));
  });

  it("should follow the injected Secure flag and path", async () => {
    const local = buildController(service, { name: "smaug_refresh", secure: false, path: "/auth" });
    service.register.mockResolvedValue(result);

    await local.register(createRequestMock({ body: registerBody }), res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      "smaug_refresh",
      "refresh-1",
      expect.objectContaining({ secure: false, path: "/auth" }),
    );
  });

  it("should never send a negative Max-Age when the token is already expired", async () => {
    service.register.mockResolvedValue({ ...result, refreshTokenExpiresAt: new Date(0) });

    await controller.register(createRequestMock({ body: registerBody }), res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      "smaug_refresh",
      "refresh-1",
      expect.objectContaining({ maxAge: 0 }),
    );
  });

  it("should pass undefined to the service when the cookie is missing or empty", async () => {
    service.refresh.mockResolvedValue(result);

    await controller.refresh(createRequestMock({ cookies: undefined }), res, next);
    await controller.refresh(createRequestMock({ cookies: { smaug_refresh: "" } }), res, next);

    expect(service.refresh).toHaveBeenNthCalledWith(1, undefined);
    expect(service.refresh).toHaveBeenNthCalledWith(2, undefined);
  });

  it("should clear the cookie with the same attributes when the refresh token is invalid", async () => {
    service.refresh.mockRejectedValue(new InvalidRefreshTokenError());

    await controller.refresh(createRequestMock({ cookies: { smaug_refresh: "stale" } }), res, next);

    expect(res.clearCookie).toHaveBeenCalledWith("smaug_refresh", ATTRIBUTES);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("should keep the cookie on a refresh conflict", async () => {
    service.refresh.mockRejectedValue(new RefreshTokenConflictError());

    await controller.refresh(createRequestMock({ cookies: { smaug_refresh: "raced" } }), res, next);

    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("should not set a cookie when register or login fail", async () => {
    service.register.mockRejectedValue(new EmailAlreadyExistsError("ana@exemplo.com"));
    service.loginWithPassword.mockRejectedValue(new InvalidCredentialsError());

    await controller.register(createRequestMock({ body: registerBody }), res, next);
    await controller.login(createRequestMock({ body: loginBody }), res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it("should clear the cookie on logout and logout-all", async () => {
    service.logout.mockResolvedValue(undefined);
    service.logoutAll.mockResolvedValue(undefined);

    await controller.logout(createRequestMock({ cookies: {}, sessionId: undefined }), res, next);
    await controller.logoutAll(createRequestMock(), res, next);

    expect(service.logout).toHaveBeenCalledWith({ refreshToken: undefined, sessionId: undefined });
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(res.clearCookie).toHaveBeenCalledWith("smaug_refresh", ATTRIBUTES);
  });
});
