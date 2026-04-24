import { randomUUID } from "crypto";

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 100;

export interface ExpenseCategoryProps {
  id?: string;
  userId: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExpenseCategoryPersistenceProps extends Required<Omit<ExpenseCategoryProps, "name">> {
  name: string;
  nameLower: string;
}

export class ExpenseCategory {
  public readonly id: string;
  public readonly userId: string;
  public readonly name: string;
  public readonly nameLower: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: ExpenseCategoryPersistenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.nameLower = props.nameLower;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: ExpenseCategoryProps): ExpenseCategory {
    const normalizedName = ExpenseCategory.normalizeName(props.name);
    ExpenseCategory.validateName(normalizedName);

    const now = new Date();
    return new ExpenseCategory({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      name: normalizedName,
      nameLower: normalizedName.toLowerCase(),
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public updateName(name: string): ExpenseCategory {
    const normalizedName = ExpenseCategory.normalizeName(name);
    ExpenseCategory.validateName(normalizedName);

    return new ExpenseCategory({
      id: this.id,
      userId: this.userId,
      name: normalizedName,
      nameLower: normalizedName.toLowerCase(),
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  private static normalizeName(name: string): string {
    return name.trim();
  }

  private static validateName(name: string): void {
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
      throw new Error(`Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`);
    }
  }
}
