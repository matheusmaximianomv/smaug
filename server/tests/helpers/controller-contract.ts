import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { createRequestMock, createResponseMock, type ResponseMock } from "./http-mocks";

export type ServiceMock = Record<string, ReturnType<typeof vi.fn>>;

export type ControllerMock = Record<
  string,
  (req: Request, res: Response, next: NextFunction) => Promise<void>
>;

export function createServiceMock(methods: string[]): ServiceMock {
  return Object.fromEntries(methods.map((method) => [method, vi.fn()]));
}

export interface MethodContract {
  /** Método do controller exercitado. */
  method: string;
  /** Método do service ao qual o controller delega. */
  delegatesTo: string;
  /** Campos do request usados na chamada. */
  request?: Partial<Request>;
  /** Argumentos esperados na chamada ao service. */
  expectedArgs?: unknown[];
  /** Status HTTP do caminho feliz. */
  successStatus: number;
  /** Retorno do service; `undefined` significa resposta sem corpo (`res.send()`). */
  successResult?: unknown;
  /** Erros de domínio tratados pelo controller e o status que produzem. */
  mappedErrors?: Array<{ error: Error & { code?: string }; status: number }>;
}

/**
 * Gera a bateria padrão de testes de um controller: caminho feliz, cada erro de
 * domínio mapeado para seu status, e o encaminhamento de erros inesperados ao `next`.
 */
export function describeControllerContract(
  title: string,
  setup: () => { controller: ControllerMock; service: ServiceMock },
  contracts: MethodContract[],
): void {
  describe(title, () => {
    let controller: ControllerMock;
    let service: ServiceMock;
    let res: ResponseMock;
    let next: NextFunction;

    beforeEach(() => {
      ({ controller, service } = setup());
      res = createResponseMock();
      next = vi.fn();
    });

    for (const contract of contracts) {
      describe(contract.method, () => {
        const buildRequest = () => createRequestMock(contract.request);

        it(`should respond with ${contract.successStatus}`, async () => {
          service[contract.delegatesTo].mockResolvedValue(contract.successResult);

          await controller[contract.method](buildRequest(), res, next);

          if (contract.expectedArgs) {
            expect(service[contract.delegatesTo]).toHaveBeenCalledWith(...contract.expectedArgs);
          }
          expect(res.status).toHaveBeenCalledWith(contract.successStatus);
          if (contract.successResult === undefined) {
            expect(res.send).toHaveBeenCalled();
          } else {
            expect(res.json).toHaveBeenCalledWith(contract.successResult);
          }
          expect(next).not.toHaveBeenCalled();
        });

        for (const { error, status } of contract.mappedErrors ?? []) {
          it(`should respond with ${status} for ${error.name}`, async () => {
            service[contract.delegatesTo].mockRejectedValue(error);

            await controller[contract.method](buildRequest(), res, next);

            expect(res.status).toHaveBeenCalledWith(status);
            expect(res.json).toHaveBeenCalledWith({ error: error.code, message: error.message });
            expect(next).not.toHaveBeenCalled();
          });
        }

        it("should forward unexpected errors to next", async () => {
          const unexpected = new Error("database is down");
          service[contract.delegatesTo].mockRejectedValue(unexpected);

          await controller[contract.method](buildRequest(), res, next);

          expect(next).toHaveBeenCalledWith(unexpected);
          expect(res.status).not.toHaveBeenCalled();
        });
      });
    }
  });
}
